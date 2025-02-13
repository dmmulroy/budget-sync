import ynab, {
	type SaveTransactionsResponseData,
	type TransactionResponseData,
	type TransactionsImportResponseData,
	type TransactionsResponseData,
} from "ynab";
import { Retry, withInstrumentation, type WrappedService } from "../prelude";
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

type YnabClient = ynab.api;

export class YnabClientError extends Data.TaggedError("YnabClientError")<{
	cause: unknown;
}> {}

export declare namespace Ynab {
	export type Config = Readonly<{
		apiKey: Redacted.Redacted<string>;
	}>;

	type CreateTransactionsParams = Parameters<
		YnabClient["transactions"]["createTransactions"]
	>;

	type DeleteTransactionParams = Parameters<
		YnabClient["transactions"]["deleteTransaction"]
	>;

	type GetTransactionsParams = Parameters<
		YnabClient["transactions"]["getTransactions"]
	>;

	type ImportTransactionsParams = Parameters<
		YnabClient["transactions"]["importTransactions"]
	>;

	type UpdateTransactionsParams = Parameters<
		YnabClient["transactions"]["updateTransactions"]
	>;

	export type Service = Readonly<{
		transactions: Readonly<{
			createTransactions: (
				...params: CreateTransactionsParams
			) => Effect.Effect<SaveTransactionsResponseData, YnabClientError>;

			deleteTransaction: (
				...params: DeleteTransactionParams
			) => Effect.Effect<TransactionResponseData, YnabClientError>;

			getTransactions: (
				...params: GetTransactionsParams
			) => Effect.Effect<TransactionsResponseData, YnabClientError>;

			importTransactions: (
				...params: ImportTransactionsParams
			) => Effect.Effect<TransactionsImportResponseData, YnabClientError>;

			updateTransactions: (
				...params: UpdateTransactionsParams
			) => Effect.Effect<SaveTransactionsResponseData, YnabClientError>;
		}>;
	}>;
}

type IWrappedYnabClient = WrappedService<YnabClient, YnabClientError>;

class WrappedYnabClient extends Context.Tag("WrappedYnabClient")<
	WrappedYnabClient,
	IWrappedYnabClient
>() {
	static defaultConfig = {
		apiKey: Config.redacted("YNAB_API_KEY"),
	};

	static make = (config: Ynab.Config) =>
		Effect.gen(function* () {
			const client = new ynab.api(Redacted.value(config.apiKey));

			const use: IWrappedYnabClient["use"] = (fn) => {
				return Effect.tryPromise({
					try() {
						return fn(client);
					},
					catch(cause) {
						return new YnabClientError({ cause });
					},
				}).pipe(
					withInstrumentation("wrapped_splitwise_client.use", {
						retryPolicy: Retry.exponentialBackoffPolicy,
					}),
				);
			};

			return { client, use } as const satisfies IWrappedYnabClient;
		});

	static layer = (config: Config.Config.Wrap<Ynab.Config>) => {
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

export class Ynab extends Context.Tag("YnabService")<Ynab, Ynab.Service>() {
	static defaultConfig = {
		apiKey: Config.redacted("YNAB_API_KEY"),
	};

	static make = () =>
		Effect.gen(function* () {
			const ynab = yield* WrappedYnabClient;

			const createTransactions = (...params: Ynab.CreateTransactionsParams) =>
				Effect.gen(function* () {
					return yield* ynab.use((client) =>
						client.transactions
							.createTransactions(...params)
							.then((res) => res.data),
					);
				});

			const deleteTransaction = (...params: Ynab.DeleteTransactionParams) =>
				Effect.gen(function* () {
					return yield* ynab.use((client) =>
						client.transactions
							.deleteTransaction(...params)
							.then((res) => res.data),
					);
				});

			const getTransactions = (...params: Ynab.GetTransactionsParams) =>
				Effect.gen(function* () {
					return yield* ynab.use((client) =>
						client.transactions
							.getTransactions(...params)
							.then((res) => res.data),
					);
				});

			const importTransactions = (...params: Ynab.ImportTransactionsParams) =>
				Effect.gen(function* () {
					return yield* ynab.use((client) =>
						client.transactions
							.importTransactions(...params)
							.then((res) => res.data),
					);
				});

			const updateTransactions = (...params: Ynab.UpdateTransactionsParams) =>
				Effect.gen(function* () {
					return yield* ynab.use((client) =>
						client.transactions
							.updateTransactions(...params)
							.then((res) => res.data),
					);
				});

			return {
				transactions: {
					createTransactions,
					deleteTransaction,
					getTransactions,
					importTransactions,
					updateTransactions,
				},
			};
		});

	static layer = (config: Config.Config.Wrap<Ynab.Config>) => {
		return pipe(
			Config.unwrap(config),
			Effect.andThen(this.make),
			Layer.effect(this),
		);
	};

	static Default = this.layer(this.defaultConfig).pipe(
		Layer.provide(WrappedYnabClient.Default),
	);
}
