import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Config, Context, Data, Effect, Layer } from "effect";
import { Service } from "electrodb";
import type { WrappedService } from "../prelude";
import { BudgetSyncAccountEntity } from "./budget-sync-account";
import { SyncRecordEntity } from "./sync-record";
import { SyncedTransactionEntity } from "./synced-transaction";

const table = "budget-sync";

export type IElectroDbService = Service<{
	budgetSyncAccount: typeof BudgetSyncAccountEntity;
	syncedTransaction: typeof SyncedTransactionEntity.Entity;
	syncRecord: typeof SyncRecordEntity.Entity;
}>;

export class ElectroDbError extends Data.TaggedError("ElectroDbError")<{
	cause: unknown;
}> {}

type WrappedElectroDbService = WrappedService<
	IElectroDbService,
	ElectroDbError
>;

export class ElectroDb extends Context.Tag("ElectroDb")<
	ElectroDb,
	WrappedElectroDbService
>() {}

export const createService = () =>
	Effect.gen(function* () {
		const config = yield* Config.all({
			region: Config.string("AWS_REGION"),
			accessKeyId: Config.redacted("AWS_ACCESS_KEY_ID"),
			secretAccessKey: Config.redacted("AWS_SECRET_ACCESS_KEY"),
		});

		const dynamoClient = new DynamoDBClient(config);
		const documentClient = DynamoDBDocumentClient.from(dynamoClient);

		const service = new Service(
			{
				budgetSyncAccount: BudgetSyncAccountEntity,
				syncedTransaction: SyncedTransactionEntity.Entity,
				syncRecord: SyncRecordEntity.Entity,
			},
			{ client: documentClient, table },
		);

		const useElectroDb: WrappedElectroDbService["use"] = (fn) => {
			return Effect.tryPromise({
				try() {
					return fn(service);
				},
				catch(cause) {
					return new ElectroDbError({ cause });
				},
			}).pipe(Effect.withSpan("use_electro_db"));
		};

		return { use: useElectroDb, client: service };
	});

export const layer = Layer.effect(ElectroDb, createService());
