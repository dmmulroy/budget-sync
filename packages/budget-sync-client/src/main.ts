import { Layer, Effect } from "effect";
import { BudgetSync } from "./budget-sync/budget-sync";
import * as BudgetSyncElectroDb from "./electrodb/service";

const dependencies = Layer.empty.pipe(
	Layer.provideMerge(BudgetSync.layer),
	Layer.provideMerge(BudgetSyncElectroDb.layer),
);

const program = Effect.gen(function* () {
	// const db = yield* BudgetSyncElectroDb.BudgetSyncElectroDb;
	//
	// const result =
	// 	yield* db.sync.getMostRecentCompletedSyncRecordByAccountId("11f9c81c");
	//
	// yield* Effect.log({ result });
	const budgetSync = yield* BudgetSync.BudgetSync;

	yield* budgetSync.sync("11f9c81c", { limit: 6 });
	yield* budgetSync.sync("4b16f96", { limit: 6 });
});

Effect.runPromise(program.pipe(Effect.provide(dependencies)));
