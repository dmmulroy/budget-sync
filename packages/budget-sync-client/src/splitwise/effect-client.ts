import {
	Array as Arr,
	Config,
	Context,
	Data,
	Effect,
	Layer,
	Option,
	type Redacted,
} from "effect";
import type { ParseError } from "effect/ParseResult";
import { flatten } from "flat";
import { Retry } from "../retry";
import { type GetExpensesByGroupIdOptions, SplitwiseClient } from "./client";
import {
	type CurrentUser,
	CurrentUserSchema,
	type Expense,
	type ExpenseNotificationType,
	ExpenseSchema,
	type Group,
	GroupSchema,
	type Notification,
	NotificationSchema,
	type User,
	UserSchema,
} from "./schemas";

export type SplitwiseConfig = Readonly<{
	apiKey: Redacted.Redacted<string>;
}>;

export type ISplitwise = Readonly<{
	getCurrentUser(): Effect.Effect<
		CurrentUser,
		SplitwiseClientError | ParseError
	>;

	getExpenseById(
		expenseId: number,
	): Effect.Effect<Option.Option<Expense>, SplitwiseClientError | ParseError>;

	getExpensesByGroupId(
		groupId: number,
		options?: GetExpensesByGroupIdOptions,
	): Effect.Effect<ReadonlyArray<Expense>, SplitwiseClientError | ParseError>;

	getGroupById(
		groupId: number,
	): Effect.Effect<Group, SplitwiseClientError | ParseError>;

	getNotifications(options?: {
		updatedAfter?: Date;
		type?: ExpenseNotificationType | readonly ExpenseNotificationType[];
	}): Effect.Effect<
		ReadonlyArray<Notification>,
		SplitwiseClientError | ParseError
	>;

	getUserById(
		userId: number,
	): Effect.Effect<User, SplitwiseClientError | ParseError>;
}>;

export class SplitwiseClientError extends Data.TaggedError(
	"SplitwiseClientError",
)<{ cause: unknown }> {}

export class Splitwise extends Context.Tag("Splitwise")<
	Splitwise,
	ISplitwise
>() {}

export const defaultConfig = {
	apiKey: Config.redacted("SPLITWISE_API_KEY"),
} as const;

export const createService = (config: Config.Config.Wrap<SplitwiseConfig>) =>
	Effect.gen(this, function* () {
		const cfg = yield* Config.unwrap(config);
		const client = new SplitwiseClient(cfg);

		const useSplitwise = <A>(
			fn: (client: SplitwiseClient, signal: AbortSignal) => Promise<A>,
		) => {
			return Effect.tryPromise({
				try(signal) {
					return fn(client, signal);
				},
				catch(cause) {
					return new SplitwiseClientError({ cause });
				},
			}).pipe(
				Effect.retry(Retry.exponentialBackoffPolicy),
				Effect.withSpan("use_splitwise"),
			);
		};

		const getCurrentUser = () =>
			Effect.gen(function* () {
				const user = yield* useSplitwise((client) =>
					client
						.getCurrentUser()
						.then((res) =>
							res.error !== undefined
								? Promise.reject(res.error)
								: Promise.resolve(res.data),
						)
						.then(({ user }) =>
							user === undefined
								? Promise.reject("user was undefined")
								: Promise.resolve(user),
						),
				).pipe(Effect.andThen(CurrentUserSchema.decodeToType));

				return user;
			}).pipe(Effect.withSpan("splitwise.get_current_user"));

		const getExpenseById = (expenseId: number) =>
			Effect.gen(function* () {
				const expense = yield* useSplitwise((client) =>
					client
						.getExpenseById(expenseId)
						.then((res) =>
							res.error !== undefined
								? Promise.reject(res.error)
								: Promise.resolve(Option.fromNullable(res.data.expense)),
						),
				).pipe(
					Effect.andThen((maybeExpense) => {
						if (Option.isSome(maybeExpense)) {
							return ExpenseSchema.decodeToType(maybeExpense.value).pipe(
								Effect.option,
							);
						}
						return Effect.succeed(Option.none());
					}),
				);

				return expense;
			}).pipe(
				Effect.withSpan("splitwise.get_expense_by_id", {
					attributes: { "expense.id": expenseId },
				}),
			);

		const getExpensesByGroupId = (
			groupId: number,
			options?: GetExpensesByGroupIdOptions,
		) =>
			Effect.gen(function* () {
				const expenses = yield* useSplitwise((client) =>
					client
						.getExpensesByGroupId(groupId, options)
						.then((res) =>
							res.error !== undefined
								? Promise.reject(res.error)
								: Promise.resolve(res.data),
						)
						.then(({ expenses }) =>
							expenses === undefined
								? Promise.reject("expenses was undefined")
								: Promise.resolve(expenses),
						),
				).pipe(Effect.andThen(ExpenseSchema.decodeToTypeArray));

				return expenses;
			}).pipe(
				Effect.withSpan("splitwise.get_expenses_by_group_id", {
					attributes: { "group.id": groupId, ...flatten({ options }) },
				}),
			);

		const getGroupById = (groupId: number) =>
			Effect.gen(function* () {
				const group = yield* useSplitwise((client) =>
					client
						.getGroupById(groupId)
						.then((res) =>
							res.error !== undefined
								? Promise.reject(res.error)
								: Promise.resolve(res.data),
						)
						.then(({ group }) =>
							group === undefined
								? Promise.reject("group was undefined")
								: Promise.resolve(group),
						),
				).pipe(Effect.andThen(GroupSchema.decodeToType));

				return group;
			}).pipe(
				Effect.withSpan("splitwise.get_group_by_id", {
					attributes: { "group.id": groupId },
				}),
			);

		const getNotifications = (options?: {
			updatedAfter?: Date;
			type: ExpenseNotificationType | readonly ExpenseNotificationType[];
		}) =>
			Effect.gen(function* () {
				const notifications = yield* useSplitwise((client) =>
					client
						.getNotifications(options)
						.then((res) =>
							res.error !== undefined
								? Promise.reject(res.error)
								: Promise.resolve(res.data),
						)
						.then(({ notifications }) =>
							notifications === undefined
								? Promise.reject("notifications was undefined")
								: Promise.resolve(notifications),
						),
				).pipe(Effect.andThen(NotificationSchema.decodeToTypeArray));

				if (options?.type !== undefined) {
					const typeFilter: string[] = Arr.ensure(options.type);

					return notifications.filter((notification) =>
						typeFilter.includes(notification.type),
					);
				}

				return notifications;
			}).pipe(Effect.withSpan("splitwise.get_notifications"));

		const getUserById = (userId: number) =>
			Effect.gen(function* () {
				const user = yield* useSplitwise((client) =>
					client
						.getUserById(userId)
						.then((res) =>
							res.error !== undefined
								? Promise.reject(res.error)
								: Promise.resolve(res.data),
						)
						.then(({ user }) =>
							user === undefined
								? Promise.reject("user was undefined")
								: Promise.resolve(user),
						),
				).pipe(Effect.andThen(UserSchema.decodeToType));

				return user;
			}).pipe(
				Effect.withSpan("splitwise.get_user_by_id", {
					attributes: { "user.id": userId },
				}),
			);

		return {
			getCurrentUser,
			getExpenseById,
			getExpensesByGroupId,
			getGroupById,
			getNotifications,
			getUserById,
		};
	});

export const layerFromConfig = (config: Config.Config.Wrap<SplitwiseConfig>) =>
	createService(config);

export const layerWithoutDependencies = Layer.effect(
	Splitwise,
	createService(defaultConfig),
);

export const layer = layerWithoutDependencies;
