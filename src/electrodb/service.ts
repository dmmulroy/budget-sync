import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { SyncedTransactionEntity } from "./synced-transaction";
import { SplitwiseExpenseEntity } from "./splitwise-expense";
import { YnabTransactionEntity } from "./ynab-transaction";
import { Config, Context, Data, Effect, Layer } from "effect";
import { Retry, withInstrumentation, type WrappedService } from "../prelude";
import { Service } from "electrodb";

const table = "budget-sync";

export type IElectroDbService = Service<{
	splitwiseExpense: typeof SplitwiseExpenseEntity;
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
				ynabTransaction: YnabTransactionEntity,
				splitwiseExpense: SplitwiseExpenseEntity,
				syncedTransaction: SyncedTransactionEntity,
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
