import {
	Array,
	Cause,
	Config,
	Context,
	Data,
	Effect,
	Exit,
	Layer,
	pipe,
	Redacted,
} from "effect";
import { SplitwiseClient } from "./client";
import {
	Retry,
	withInstrumentation,
	type PromiseServiceFromEffectService,
} from "../prelude";
import {
	CurrentUserSchema,
	ExpenseSchema,
	GroupSchema,
	NotificationSchema,
	UserSchema,
	type CurrentUser,
	type Expense,
	type Group,
	type Notification,
	type User,
} from "./schemas";
import type { ParseError } from "effect/ParseResult";

export declare namespace Splitwise {
	export type Config = Readonly<{
		apiKey: Redacted.Redacted<string>;
	}>;

	export type Service = Readonly<{
		getCurrentUser(): Effect.Effect<
			CurrentUser,
			SplitwiseClientError | ParseError
		>;

		getExpenseById(
			expenseId: number,
		): Effect.Effect<Expense, SplitwiseClientError | ParseError>;

		getExpenses(): Effect.Effect<
			ReadonlyArray<Expense>,
			SplitwiseClientError | ParseError
		>;

		getGroupById(
			groupId: number,
		): Effect.Effect<Group, SplitwiseClientError | ParseError>;

		getNotifications(): Effect.Effect<
			ReadonlyArray<Notification>,
			SplitwiseClientError | ParseError
		>;

		getUserById(
			userId: number,
		): Effect.Effect<User, SplitwiseClientError | ParseError>;
	}>;

	export type PromiseService = PromiseServiceFromEffectService<Service>;
}

export class SplitwiseClientError extends Data.TaggedError(
	"SplitwiseClientError",
)<{ cause: unknown }> {}

type IWrappedSplitwiseClient = Readonly<{
	client: SplitwiseClient;
	use: <A>(
		fn: (client: SplitwiseClient) => Promise<A>,
	) => Effect.Effect<A, SplitwiseClientError>;
}>;

class WrappedSplitwiseClient extends Context.Tag("WrappedSplitwiseClient")<
	WrappedSplitwiseClient,
	IWrappedSplitwiseClient
>() {
	static defaultConfig = {
		apiKey: Config.redacted("SPLITWISE_API_KEY"),
	};

	static make = (config: Splitwise.Config) =>
		Effect.gen(function* () {
			const client = new SplitwiseClient(config);

			const use = <A>(fn: (client: SplitwiseClient) => Promise<A>) => {
				return Effect.tryPromise({
					try() {
						return fn(client);
					},
					catch(cause) {
						return new SplitwiseClientError({ cause });
					},
				}).pipe(
					withInstrumentation("wrapped_splitwise_client.use", {
						retryPolicy: Retry.exponentialBackoffPolicy,
					}),
				);
			};

			return { client, use };
		});

	static layer = (config: Config.Config.Wrap<Splitwise.Config>) => {
		return pipe(
			Config.unwrap(config),
			Effect.andThen(this.make),
			Layer.effect(this),
		);
	};

	static Default = this.layer(this.defaultConfig);

	static loadDefaultConifg = async (): Promise<
		PromiseSettledResult<{
			apiKey: Redacted.Redacted<string>;
		}>
	> => {
		const config = Config.unwrap(this.defaultConfig);

		return Effect.runPromiseExit(config).then((exit) => {
			if (Exit.isSuccess(exit)) {
				return { status: "fulfilled", value: exit.value } as const;
			}

			return { status: "rejected", reason: Cause.squash(exit.cause) } as const;
		});
	};
}

export class Splitwise extends Context.Tag("Splitwise")<
	Splitwise,
	Splitwise.Service
>() {
	static make = () =>
		Effect.gen(this, function* () {
			const splitwise = yield* WrappedSplitwiseClient;

			const getCurrentUser = () =>
				Effect.gen(function* () {
					const user = yield* splitwise
						.use((client) =>
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
						)
						.pipe(Effect.andThen(CurrentUserSchema.decodeToType));

					return user;
				}).pipe(
					withInstrumentation("splitwise.get_current_user", {
						retryPolicy: Retry.exponentialBackoffPolicy,
					}),
				);

			const getExpenseById = (expenseId: number) =>
				Effect.gen(function* () {
					const expense = yield* splitwise
						.use((client) =>
							client
								.getExpenseById(expenseId)
								.then((res) =>
									res.error !== undefined
										? Promise.reject(res.error)
										: Promise.resolve(res.data),
								)
								.then(({ expense }) =>
									expense === undefined
										? Promise.reject("expense was undefined")
										: Promise.resolve(expense),
								),
						)
						.pipe(Effect.andThen(ExpenseSchema.decodeToType));

					return expense;
				}).pipe(
					withInstrumentation("splitwise.get_expense_by_id", {
						attributes: { "expense.id": expenseId },
						retryPolicy: Retry.exponentialBackoffPolicy,
					}),
				);

			const getExpenses = () =>
				Effect.gen(function* () {
					const expenses = yield* splitwise
						.use((client) =>
							client
								.getExpenses()
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
						)
						.pipe(Effect.andThen(ExpenseSchema.decodeToTypeArray));

					return expenses;
				}).pipe(
					withInstrumentation("splitwise.get_expenses", {
						retryPolicy: Retry.exponentialBackoffPolicy,
					}),
				);

			const getGroupById = (groupId: number) =>
				Effect.gen(function* () {
					const group = yield* splitwise
						.use((client) =>
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
						)
						.pipe(Effect.andThen(GroupSchema.decodeToType));

					return group;
				}).pipe(
					withInstrumentation("splitwise.get_group_by_id", {
						attributes: { "group.id": groupId },
						retryPolicy: Retry.exponentialBackoffPolicy,
					}),
				);

			const getNotifications = () =>
				Effect.gen(function* () {
					const notifications = yield* splitwise
						.use((client) =>
							client
								.getNotifications()
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
						)
						.pipe(Effect.andThen(NotificationSchema.decodeToTypeArray));

					return notifications;
				}).pipe(
					withInstrumentation("splitwise.get_notifications", {
						retryPolicy: Retry.exponentialBackoffPolicy,
					}),
				);

			const getUserById = (userId: number) =>
				Effect.gen(function* () {
					const user = yield* splitwise
						.use((client) =>
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
						)
						.pipe(Effect.andThen(UserSchema.decodeToType));

					return user;
				}).pipe(
					withInstrumentation("splitwise.get_user_by_id", {
						attributes: { "user.id": userId },
						retryPolicy: Retry.exponentialBackoffPolicy,
					}),
				);

			return {
				getCurrentUser,
				getExpenseById,
				getExpenses,
				getGroupById,
				getNotifications,
				getUserById,
			};
		});

	static layer = () => Layer.effect(this, this.make());

	static Default = this.layer().pipe(
		Layer.provideMerge(WrappedSplitwiseClient.Default),
	);
}

const program = Effect.gen(function* () {
	const splitwise = yield* Splitwise;

	const notifications = yield* splitwise
		.getNotifications()
		.pipe(
			Effect.map(
				Array.filter(
					(notification) => notification.type === 1 || notification.type === 2,
				),
			),
		);

	const expenses = yield* Effect.forEach(notifications, (notification) =>
		splitwise.getExpenseById(notification.source?.id ?? 0),
	);

	yield* Effect.log({ expenses });
}).pipe(Effect.provide(Splitwise.Default));

Effect.runPromise(program).then(console.log, console.error);
