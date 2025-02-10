import { Config, Effect, Layer } from "effect";
import { Splitwise } from "./splitwise/effect-client";
import { Ynab } from "./ynab/client";

const program = Effect.gen(function* () {
	const budgetId = yield* Config.string("YNAB_BUDGET_ID");
	//const splitwise = yield* Splitwise;
	const ynab = yield* Ynab;

	const transactions = yield* ynab.transactions.getTransactions(budgetId);

	yield* Effect.logInfo(JSON.stringify({ transactions }, null, 2));
});

const MainLayer = Layer.empty.pipe(Layer.provideMerge(Ynab.Default));

Effect.runPromise(program.pipe(Effect.provide(MainLayer)));
