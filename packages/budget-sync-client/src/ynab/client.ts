import {
	Config,
	Context,
	Data,
	Effect,
	Hash,
	Layer,
	Option,
	type Record,
	Redacted,
	Request,
	RequestResolver,
	Schema,
	type Types,
} from "effect";
import type { NoSuchElementException } from "effect/Cause";
import * as ynab from "ynab";
import { Retry } from "../retry";
import { TransactionDetail } from "./schemas";

type YnabClient = ynab.api;

export class YnabClientError extends Data.TaggedError("YnabClientError")<{
	cause: unknown;
}> {}

type DeleteTransactionParams = Parameters<
	YnabClient["transactions"]["deleteTransaction"]
>;

type GetTransactionsParams = Parameters<
	YnabClient["transactions"]["getTransactions"]
>;

// type ImportTransactionsParams = Parameters<
// 	YnabClient["transactions"]["importTransactions"]
// >;

type UpdateTransactionsParams = Parameters<
	YnabClient["transactions"]["updateTransactions"]
>;

export type YnabConfig = Readonly<{
	apiKey: Redacted.Redacted<string>;
}>;

export class NoTransactionFoundForBatchedRequest extends Schema.TaggedError<NoTransactionFoundForBatchedRequest>()(
	"NoTransactionFoundForBatchedRequest",
	{
		requestId: Schema.String,
		transactionMemo: Schema.String,
		transactionAmount: Schema.Number,
		transactionDate: Schema.String,
	},
) {}

export const CreateTransactionRequest =
	Request.tagged<CreateTransactionRequest>("CreateTransactionRequest");

export type IYnab = Readonly<{
	transactions: Readonly<{
		createTransaction: (
			budgetId: string,
			transaction: CreateTransactionRequest["transaction"],
		) => Effect.Effect<TransactionDetail, CreateYnabTransactionError>;

		createTransactions: (
			budgetId: string,
			transactions: ynab.NewTransaction[],
		) => Effect.Effect<
			readonly TransactionDetail[],
			YnabClientError | NoSuchElementException
		>;

		deleteTransaction: (
			...params: DeleteTransactionParams
		) => Effect.Effect<TransactionDetail, YnabClientError>;

		getTransactions: (
			...params: GetTransactionsParams
		) => Effect.Effect<readonly TransactionDetail[], YnabClientError>;

		// importTransactions: (
		// 	...params: ImportTransactionsParams
		// ) => Effect.Effect<TransactionsImportResponseData, YnabClientError>;

		updateTransactions: (
			...params: UpdateTransactionsParams
		) => Effect.Effect<readonly TransactionDetail[], YnabClientError>;
	}>;
}>;

export const defaultConfig = {
	apiKey: Config.redacted("YNAB_API_KEY"),
};

export class Ynab extends Context.Tag("YnabService")<Ynab, IYnab>() {}

export const createService = Effect.fn(function* (
	config: Config.Config.Wrap<YnabConfig>,
) {
	const cfg = yield* Config.unwrap(config);
	const client = new ynab.api(Redacted.value(cfg.apiKey));

	const useYnab = <A>(
		fn: (client: YnabClient, signal: AbortSignal) => Promise<A>,
	) => {
		return Effect.tryPromise({
			try(signal) {
				return fn(client, signal);
			},
			catch(cause) {
				return new YnabClientError({ cause });
			},
		}).pipe(
			Effect.retry(Retry.exponentialBackoffPolicy),
			Effect.withSpan("use_ynab"),
		);
	};

	const createTransaction = (
		budgetId: string,
		transaction: CreateTransactionRequest["transaction"],
	) => {
		return Effect.gen(function* () {
			const request = CreateTransactionRequest({
				budgetId,
				transaction,
			});

			return yield* Effect.request(request, CreateTransactionResolver);
		}).pipe(
			Effect.provideService(AsyncYnabClient, client),
			Effect.provideService(CurrentBudgetId, budgetId),
			Effect.withSpan("ynab.create_transaction", {
				attributes: {
					"ynab.budget.id": budgetId,
					"ynab.account.id": transaction.account_id,
					"ynab.transaction.amount": transaction.amount,
					"ynab.transaction.memo": transaction.memo,
				},
			}),
		);
	};

	const createTransactions = (
		budgetId: string,
		transactions: ynab.NewTransaction[],
	) => {
		return useYnab((client) =>
			client.transactions
				.createTransactions(budgetId, { transactions })
				.then((res) => {
					return TransactionDetail.decodeArrayUnknownSync(
						res.data?.transactions,
					);
				}),
		).pipe(
			Effect.withSpan("ynab.create_transaction", {
				attributes: {
					"ynab.budget.id": budgetId,
				},
			}),
		);
	};

	const deleteTransaction = (...params: DeleteTransactionParams) =>
		useYnab((client) =>
			client.transactions
				.deleteTransaction(...params)
				.then((res) => TransactionDetail.decodeSync(res.data.transaction)),
		).pipe(
			Effect.withSpan("ynab.delete_transaction", {
				attributes: {
					"ynab.budget.id": params[0],
				},
			}),
		);

	const getTransactions = (...params: GetTransactionsParams) =>
		useYnab((client) =>
			client.transactions
				.getTransactions(...params)
				.then(
					(res) =>
						res.data.transactions.map((transaction) =>
							TransactionDetail.decodeSync(transaction),
						) ?? [],
				),
		).pipe(
			Effect.withSpan("ynab.get_transactions", {
				attributes: {
					"ynab.budget.id": params[0],
				},
			}),
		);

	// const importTransactions = (...params: ImportTransactionsParams) =>
	// 	useYnab((client) =>
	// 		client.transactions.importTransactions(...params).then((res) => res.data),
	// 	);

	const updateTransactions = (...params: UpdateTransactionsParams) =>
		useYnab((client) =>
			client.transactions
				.updateTransactions(...params)
				.then(
					(res) =>
						res.data?.transactions?.map((transaction) =>
							TransactionDetail.decodeSync(transaction),
						) ?? [],
				),
		).pipe(
			Effect.withSpan("ynab.update_transactions", {
				attributes: {
					"ynab.budget.id": params[0],
				},
			}),
		);

	return {
		transactions: {
			createTransaction,
			createTransactions,
			deleteTransaction,
			getTransactions,
			// importTransactions,
			updateTransactions,
		},
	};
});

export const layerFromConfig = (config: Config.Config.Wrap<YnabConfig>) =>
	createService(config);

export const layerWithoutDependencies = Layer.effect(
	Ynab,
	createService(defaultConfig),
);

export const layer = layerWithoutDependencies;

export class CreateYnabTransactionError extends Schema.TaggedError<CreateYnabTransactionError>()(
	"CreateYnabTransactionError",
	{
		budgetId: Schema.String,
		cause: Schema.Unknown,
	},
) {}

export interface CreateTransactionRequest
	extends Request.Request<TransactionDetail, CreateYnabTransactionError> {
	readonly _tag: "CreateTransactionRequest";
	readonly budgetId: string;
	readonly transaction: Types.Simplify<
		ynab.NewTransaction & {
			memo: string;
			date: string;
			amount: number;
		}
	>;
}

function requestIdFromTransaction(transaction: {
	budgetId: string;
	memo: string;
	date: string;
	amount: number;
}): string {
	return Hash.number(
		Hash.string(transaction.budgetId) +
			Hash.string(transaction.memo) +
			Hash.string(transaction.date) +
			Hash.number(transaction.amount),
	).toString(16);
}

class CurrentBudgetId extends Context.Tag("CurrentBudgetId")<
	CurrentBudgetId,
	string
>() {}

class AsyncYnabClient extends Context.Tag("AsyncYnabClient")<
	AsyncYnabClient,
	ynab.api
>() {}

const CreateTransactionResolver = RequestResolver.makeBatched<
	CreateTransactionRequest,
	AsyncYnabClient | CurrentBudgetId
>((requests: readonly CreateTransactionRequest[]) =>
	Effect.gen(function* () {
		const client = yield* AsyncYnabClient;
		const budgetId = yield* CurrentBudgetId;

		const transactions = requests.map(({ transaction }) => transaction);

		const createdTransactionsByRequestIdEffect = Effect.tryPromise({
			async try() {
				return client.transactions
					.createTransactions(budgetId, { transactions })
					.then(({ data }) =>
						TransactionDetail.decodeArrayUnknownSync(data?.transactions ?? []),
					);
			},
			catch(cause) {
				return new CreateYnabTransactionError({ budgetId, cause });
			},
		}).pipe(
			Effect.mapError(
				(cause) => new CreateYnabTransactionError({ budgetId, cause }),
			),
			Effect.map((createdTransactions) =>
				createdTransactions.reduce<Record<string, TransactionDetail>>(
					(acc, transaction) => {
						const requestId = requestIdFromTransaction({
							budgetId,
							memo: transaction.memo ?? "",
							amount: transaction.amount,
							date: transaction.date,
						});

						acc[requestId] = transaction;

						return acc;
					},
					{},
				),
			),
		);

		return yield* Effect.matchEffect(createdTransactionsByRequestIdEffect, {
			onFailure(cause) {
				return Effect.forEach(requests, (request) =>
					Request.completeEffect(request, Effect.fail(cause)),
				);
			},
			onSuccess(createdTransactionsByRequestId) {
				return Effect.forEach(requests, (request) =>
					Effect.gen(function* () {
						const requestId = requestIdFromTransaction({
							budgetId: request.budgetId,
							...request.transaction,
						});

						const maybeTransaction = Option.fromNullable(
							createdTransactionsByRequestId[requestId],
						);

						if (Option.isNone(maybeTransaction)) {
							return yield* Request.completeEffect(
								request,
								Effect.fail(
									new CreateYnabTransactionError({
										budgetId,
										cause: NoTransactionFoundForBatchedRequest,
									}),
								),
							);
						}

						return yield* Request.completeEffect(
							request,
							Effect.succeed(maybeTransaction.value),
						);
					}),
				);
			},
		});
	}),
).pipe(RequestResolver.contextFromServices(AsyncYnabClient, CurrentBudgetId));
