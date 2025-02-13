import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Config, Context, Data, Effect, Layer, Option } from "effect";

import { SyncedTransactionEntity } from "./synced-transaction";
import { SplitwiseExpenseEntity } from "./splitwise-expense";
import { YnabTransactionEntity } from "./ynab-transaction";
import { Retry, withInstrumentation, type WrappedService } from "../prelude";
import { Service, type EntityItem, type QueryResponse } from "electrodb";
import { SplitwiseNotificationEntity } from "./splitwise-notification";
import { BudgetSyncAccountEntity } from "./budget-sync-account";
import { BudgetSync } from "../budget-sync/budget-sync";

const table = "budget-sync";

export type IElectroDbService = Service<{
	budgetSyncAccount: typeof BudgetSyncAccountEntity;
	splitwiseExpense: typeof SplitwiseExpenseEntity;
	splitwiseNotification: typeof SplitwiseNotificationEntity;
	syncedTransaction: typeof SyncedTransactionEntity;
	ynabTransaction: typeof YnabTransactionEntity;
}>;

export class ElectroDbClientError extends Data.TaggedError(
	"ElectroDbClientError",
)<{
	cause: unknown;
}> {}

type WrappedElectroDbService = WrappedService<
	IElectroDbService,
	ElectroDbClientError
>;

export class ElectroDb extends Context.Tag("ElectroDb")<
	ElectroDb,
	WrappedElectroDbService
>() {
	static make = Effect.gen(function* () {
		const region = yield* Config.string("AWS_REGION");

		const dynamoClient = new DynamoDBClient({ region });
		const documentClient = DynamoDBDocumentClient.from(dynamoClient);

		const service = new Service(
			{
				budgetSyncAccount: BudgetSyncAccountEntity,
				splitwiseExpense: SplitwiseExpenseEntity,
				splitwiseNotification: SplitwiseNotificationEntity,
				syncedTransaction: SyncedTransactionEntity,
				ynabTransaction: YnabTransactionEntity,
			},
			{ client: documentClient, table },
		);

		const use: WrappedElectroDbService["use"] = (fn) => {
			return Effect.tryPromise({
				try() {
					return fn(service);
				},
				catch(cause) {
					return new ElectroDbClientError({ cause });
				},
			}).pipe(
				withInstrumentation("wrapped_splitwise_client.use", {
					retryPolicy: Retry.exponentialBackoffPolicy,
				}),
			);
		};

		return { use, client: service };
	});

	static Default = Layer.effect(this, this.make);
}

// Todo locate w/ entity def
type BudgetSyncAccountEntity = Readonly<{
	id: string;
	splitwiseGroupId: number;
	splitwiseUserId: number;
	ynabBudgetId: string;
	ynabAccountId: string;
	createdAt: string;
	updatedAt: string;
}>;

export class BudgetSyncElectroDb extends Context.Tag("BudgetSyncElectroDb")<
	BudgetSyncElectroDb,
	{
		getBudgetSyncAccountById: (
			budgetSyncAccountId: string,
		) => Effect.Effect<
			Option.Option<BudgetSyncAccountEntity>,
			ElectroDbClientError
		>;
	}
>() {
	static make = Effect.gen(function* () {
		const db = yield* ElectroDb;

		const getBudgetSyncAccountById = (budgetSyncAccountId: string) =>
			Effect.gen(function* () {
				const { data } = yield* db.use(async (client) => {
					return client.entities.budgetSyncAccount
						.get({ id: budgetSyncAccountId })
						.go();
				});

				return Option.fromNullable(data);
			}).pipe(
				withInstrumentation(
					"budget_sync_electrodb.get_budget_sync_account_by_id",
					{
						annotateSpansWith: {
							"budget_sync_account.id": budgetSyncAccountId,
						},
					},
				),
				Effect.provideService(ElectroDb, db),
			);

		return { getBudgetSyncAccountById };
	});

	static Default = Layer.effect(this, this.make);
}
