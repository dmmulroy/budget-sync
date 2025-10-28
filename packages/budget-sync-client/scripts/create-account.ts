import { Effect } from "effect";
import { ElectroDb, layer } from "../src/electrodb/electrodb";

const email = "";
const splitwiseGroupId = 0;
const splitwiseUserId = 0;
const ynabAccountId = "";
const ynabUncategorizedCategoryId = "";
const ynabBudgetId = "";

Effect.gen(function* () {
	const db = yield* ElectroDb;
	const result = yield* db.use((client) =>
		client.entities.budgetSyncAccount
			.upsert({
				email,
				splitwiseGroupId,
				splitwiseUserId,
				ynabAccountId,
				ynabBudgetId,
			})
			.set({ ynabUncategorizedCategoryId })
			.go(),
	);
	// const budgetSync = yield* BudgetSync.BudgetSync;

	// const account = yield* budgetSync.createAccount(email, {
	// 	splitwiseGroupId,
	// 	splitwiseUserId,
	// 	ynabAccountId,
	// 	ynabBudgetId,
	// });

	yield* Effect.log(JSON.stringify({ result }, null, 2));
}).pipe(Effect.provide(layer), Effect.runPromise);
