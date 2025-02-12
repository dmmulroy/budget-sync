import { Array as Arr, Config, Effect, Function, Layer, Option } from "effect";
import { Ynab } from "./ynab/client";
import { Splitwise } from "./splitwise/effect-client";
import { ElectroDb } from "./electrodb/service";
import {
	NotificationTypeFromNumber,
	type Expense,
	type Notification,
} from "./splitwise/schemas";

const MainLayer = Layer.empty.pipe(
	Layer.provideMerge(Ynab.Default),
	Layer.provideMerge(Splitwise.Default),
	Layer.provideMerge(ElectroDb.Default),
);

const program = Effect.gen(function* () {
	const groupId = yield* Config.number("SPLITWISE_GROUP_ID");
	//const budgetId = yield* Config.string("YNAB_BUDGET_ID");
	//const splitwise = yield* Splitwise;
	//const ynab = yield* Ynab;
	yield* getSplitwiseExpensesByGroupId(groupId);
});

Effect.runPromise(program.pipe(Effect.provide(MainLayer)));

const getSplitwiseExpensesByGroupId = (groupId: number) =>
	Effect.gen(function* () {
		const splitwise = yield* Splitwise;

		const expenseIds = yield* splitwise
			.getNotifications()
			.pipe(
				Effect.andThen(Effect.forEach(tryMapNotificationToExpenseId)),
				Effect.andThen(Arr.getSomes),
			);

		const expenses = yield* Effect.forEach(
			expenseIds,
			splitwise.getExpenseById,
			{
				concurrency: "unbounded",
			},
		).pipe(Effect.andThen(Arr.filterMap(filterExpenseByGroupId(groupId))));

		yield* Effect.log(`Expenses: \n ${JSON.stringify(expenses, null, 2)}`);
	});

const filterExpenseByGroupId = (groupId: number) => (expense: Expense) =>
	expense.groupId === groupId ? Option.some(expense) : Option.none();

const tryMapNotificationToExpenseId = ({
	type,
	source,
}: Notification): Effect.Effect<Option.Option<number>> => {
	return NotificationTypeFromNumber.decode(type).pipe(
		Effect.map((notificationType) => {
			if (
				notificationType === "expense_added" ||
				notificationType === "expense_updated" ||
				notificationType === "expense_deleted" ||
				notificationType === "expense_undeleted"
			) {
				return Option.fromNullable(source?.id);
			}
			return Option.none();
		}),
		Effect.catchTag("ParseError", () => Effect.succeed(Option.none())),
	);
};
