import {
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
import { Retry, withInstrumentation } from "../prelude";
import type {
	GetGetCurrentUserResponse,
	GetGetExpenseByIdResponse,
	GetGetExpensesResponse,
	GetGetGroupByIdResponse,
	GetGetNotificationsResponse,
	GetGetUserByIdResponse,
} from "./types.gen";

type EffectService = {
	[key: string]:
		| Effect.Effect<any, any, any>
		| ((...args: any[]) => Effect.Effect<any, any, any>);
};

// Corrected PromiseApiFromEffectApi type with proper Success type inference
export type PromiseServiceFromEffectService<T extends EffectService> = {
	[K in keyof T]: T[K] extends (
		...args: infer A
	) => Effect.Effect<infer S, any, any>
		? (...args: A) => Promise<PromiseSettledResult<S>>
		: T[K] extends Effect.Effect<infer S, any, any>
			? Promise<PromiseSettledResult<S>>
			: never;
};

//export type DualService<T extends EffectApi> = {
//	EffectApi: T;
//	PromiseApi: PromiseApiFromEffectApi<T>;
//};

export declare namespace Splitwise {
	export type Config = Readonly<{
		apiKey: Redacted.Redacted<string>;
	}>;

	export type Service = Readonly<{
		getCurrentUser(): Effect.Effect<
			GetGetCurrentUserResponse,
			SplitwiseClientError,
			IWrappedSplitwiseClient
		>;

		getExpenseById(
			expenseId: number,
		): Effect.Effect<
			GetGetExpenseByIdResponse,
			SplitwiseClientError,
			IWrappedSplitwiseClient
		>;

		getExpenses(): Effect.Effect<
			GetGetExpensesResponse,
			SplitwiseClientError,
			IWrappedSplitwiseClient
		>;

		getGroupById(
			groupId: number,
		): Effect.Effect<
			GetGetGroupByIdResponse,
			SplitwiseClientError,
			IWrappedSplitwiseClient
		>;

		getNotifications(): Effect.Effect<
			GetGetNotificationsResponse,
			SplitwiseClientError,
			IWrappedSplitwiseClient
		>;

		getUserById(
			userId: number,
		): Effect.Effect<
			GetGetUserByIdResponse,
			SplitwiseClientError,
			IWrappedSplitwiseClient
		>;
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

class Splitwise extends Context.Tag("Splitwise")<
	Splitwise,
	Splitwise.Service
>() {
	static make = () =>
		Effect.gen(this, function* () {
			const _client = yield* WrappedSplitwiseClient;
			return {} as Splitwise.Service;
		});

	static layer = () => Layer.effect(this, this.make());

	static Default = this.layer().pipe(
		Layer.provideMerge(WrappedSplitwiseClient.Default),
	);
}

const program = Effect.gen(function* () {
	const splitwise = yield* Splitwise;

	const notifications = yield* splitwise.getNotifications();

	const expenses = yield* Effect.forEach(
		notifications.notifications ?? [],
		(notification) =>
			Effect.gen(function* () {
				return yield* splitwise.getExpenseById(notification.source?.id ?? 0);
			}),
		{ concurrency: "unbounded" },
	);

	return expenses;
});
