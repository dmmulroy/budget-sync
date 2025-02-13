import { Array as Arr, Config, Effect, Either, Layer, Option } from "effect";
import { Ynab } from "./ynab/client";
import { Splitwise, SplitwiseClientError } from "./splitwise/effect-client";
import { ElectroDb } from "./electrodb/service";
import {
	NotificationTypeFromNumber,
	type Expense,
	type ExpenseNotificationType,
	type Notification,
} from "./splitwise/schemas";
import type { UnifyIntersection } from "./prelude";
import type { ParseError } from "effect/ParseResult";

const MainLayer = Layer.empty.pipe(
	Layer.provideMerge(Ynab.Default),
	Layer.provideMerge(Splitwise.Default),
	Layer.provideMerge(ElectroDb.Default),
);

const program = Effect.gen(function* () {
	const groupId = yield* Config.number("SPLITWISE_GROUP_ID");
	yield* getSplitwiseExpensesByGroupId(groupId);
});

Effect.runPromise(program.pipe(Effect.provide(MainLayer)));

const getSplitwiseExpensesByGroupId = (groupId: number) =>
	Effect.gen(function* () {
		const splitwise = yield* Splitwise;

		const expenseDescriptors = yield* splitwise.getNotifications().pipe(
			Effect.andThen(
				Effect.forEach(makeTryToExpenseDescriptor(groupId), {
					concurrency: "unbounded",
				}),
			),
			Effect.andThen(Arr.getSomes),
		);

		const expenses = yield* Effect.forEach(
			expenseDescriptors,
			getSplitwiseExpenseByDescriptor,
			{
				concurrency: "unbounded",
			},
		).pipe(Effect.andThen(Arr.getSomes));

		const results = yield* Effect.forEach(expenses, syncExpense, {
			concurrency: "unbounded",
		});

		yield* Effect.log(`Results: \n ${JSON.stringify(results, null, 2)}`);
	});

function getSplitwiseExpenseByDescriptor(
	descriptor: SplitwiseExpenseDescriptor,
): Effect.Effect<
	Option.Option<SplitwiseExpenseWithNotificationType>,
	SplitwiseClientError | ParseError,
	Splitwise
> {
	return Effect.gen(function* () {
		const splitwise = yield* Splitwise;

		const expense = yield* splitwise.getExpenseById(descriptor.expenseId);

		return filterOnGroupId(descriptor.groupId, expense).pipe(
			Option.map((expense) =>
				Object.assign(expense, { notificationType: descriptor.type }),
			),
		);
	});
}

type SyncInput = Readonly<{
	splitwiseGroupId: number;
	splitwiseUserId: number;
	ynabBudgetId: string;
	ynabAccountId: string;
}>;

// For Created Expense
// 1. Create DDB entities for Splitwise Notification, Splitwise Expense, SyncedTransaction, Ynab Transaction
// 2. Post a YNAB Transaction
// 3. Commit DDB entities

function syncExpense(expense: SplitwiseExpenseWithNotificationType) {
	return Effect.gen(function* () {
		const ynab = yield* Ynab;
		const budgetId = yield* Config.string("YNAB_BUDGET_ID");

		if (expense.users.length > 2) {
			// todo make a better error
			return yield* Effect.die(new Error("more than two splits in splitwse"));
		}

		const [[payee], [user]] = Arr.partition(
			expense.users,
			(user) => user.userId === 1696849,
		);

		const payeeFirstName = payee.user?.firstName ?? "unknown";
		const payeeLastName = payee.user?.lastName ?? "";
		const payeeName = `${payeeFirstName} ${payeeLastName}`.trim();

		return yield* ynab.transactions.createTransactions(budgetId, {
			transaction: {
				account_id: "4bdb304a-55c9-4742-8c1b-f9c39994e46b",
				amount: dollarsToMilliunits(Number(user.netBalance)),
				date: expense.updatedAt,
				memo: `${expense.description} | SWID:${expense.id}`,
				payee_name: payeeName,
			},
		});
	});
}

function dollarsToMilliunits(amount: number) {
	return centsToMilliunits(amount * 100);
}

function centsToMilliunits(amount: number): number {
	return round(amount * 10);
}

function round(number: number): number {
	return Math.round((number + Number.EPSILON) * 100) / 100;
}

function filterOnGroupId(groupId: number, expense: Expense) {
	return Option.liftPredicate(
		(expense: Expense) => expense?.groupId === groupId,
	)(expense);
}

type SplitwiseExpenseDescriptor = Readonly<{
	expenseId: number;
	groupId: number;
	type: ExpenseNotificationType;
}>;

type SplitwiseExpenseWithNotificationType = UnifyIntersection<
	Expense & { notificationType: ExpenseNotificationType }
>;

function makeTryToExpenseDescriptor(groupId: number) {
	return function tryToExpenseDescriptor({
		type,
		source,
	}: Notification): Effect.Effect<Option.Option<SplitwiseExpenseDescriptor>> {
		return NotificationTypeFromNumber.decode(type).pipe(
			Effect.map((notificationType) => {
				if (
					notificationType === "expense_added" ||
					notificationType === "expense_updated" ||
					notificationType === "expense_deleted" ||
					notificationType === "expense_undeleted"
				) {
					return Option.fromNullable(source?.id).pipe(
						Option.map((expenseId) => ({
							expenseId,
							groupId,
							type: notificationType,
						})),
					);
				}
				return Option.none();
			}),
			Effect.catchTag("ParseError", () => Effect.succeed(Option.none())),
		);
	};
}
