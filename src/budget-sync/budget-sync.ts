import {
	Config,
	Context,
	Duration,
	Effect,
	Layer,
	pipe,
	Redacted,
} from "effect";
import { BudgetSyncElectroDb, ElectroDb } from "../electrodb/service";

export declare namespace BudgetSync {
	export type Config = Readonly<{
		apiKey: Redacted.Redacted<string>;
	}>;

	// TODO: Brand ids
	export type SyncOutput = Readonly<{
		budgetSyncAccountId: string;
		budgetSyncTransactionIds: string[];
		failedSplitwiseNotificationIds: string[];
	}>;

	export type SyncError = Error;

	export type Service = Readonly<{
		sync: (budgetSyncAccountId: string) => Effect.Effect<SyncOutput, SyncError>;
	}>;
}
export class BudgetSync extends Context.Tag("BudgetSync")<
	BudgetSync,
	BudgetSync.Service
>() {
	//static defaultConfig = {
	//	apiKey: Config.redacted("Foo"),
	//};

	static make = () =>
		Effect.gen(function* () {
			yield* Effect.void;
			//return {
			//     todo: "todo"
			//	},
			//};
		});

	//static layer = (config: Config.Config.Wrap<Ynab.Config>) => {
	//	return pipe(
	//		Config.unwrap(config),
	//		Effect.andThen(this.make),
	//		Layer.effect(this),
	//	);
	//};

	//static Default = this.layer(this.defaultConfig).pipe(
	//	Layer.provide(WrappedYnabClient.Default),
	//);
}

function sync(budgetSyncAccountId: string) {
	return Effect.gen(function* () {
		const db = yield* BudgetSyncElectroDb;

		const budgetSyncAccount = yield* db
			.getBudgetSyncAccountById(budgetSyncAccountId)
			.pipe(Effect.flatten);
	});
}
