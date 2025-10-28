import { type NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { BudgetSyncRuntime } from "@budget-sync/managed-runtime";
import { Config, Effect, Option, Redacted, Schema } from "effect";
import { BudgetSync } from "@budget-sync/client";

export async function GET(request: NextRequest) {
	const authResult = await BudgetSyncRuntime.runPromiseResult(auth(request));

	if (authResult._tag === "err") {
		console.error(JSON.stringify(authResult, null, 2));
		return new NextResponse("Unauthorized", { status: 401 });
	}

	after(
		BudgetSyncRuntime.runPromise(sync()).then((res) => {
			console.log(JSON.stringify(res, null, 2));
		}, console.error),
	);

	return new NextResponse("Accepted", { status: 202 });
}

class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", {
	message: Schema.String,
}) {}

const auth = Effect.fn("api.sync.auth")(function* (request: NextRequest) {
	const maybeAuthHeader = Option.fromNullable(
		request.headers.get("authorization"),
	);

	if (Option.isNone(maybeAuthHeader)) {
		return yield* new Unauthorized({ message: "No authorization header" });
	}

	const cronSecret = yield* Config.redacted("CRON_SECRET").pipe(
		Effect.mapError(
			() =>
				new Unauthorized({ message: "CRON_SECRET env variable was missing" }),
		),
	);

	if (maybeAuthHeader.value !== `Bearer ${Redacted.value(cronSecret)}`) {
		return yield* new Unauthorized({
			message: "authorization header did not match cron secret",
		});
	}
});

const sync = Effect.fn("api.sync.sync")(function* () {
	const budgetSync = yield* BudgetSync.BudgetSync;

	const accounts = yield* budgetSync.getAllAccounts();

	yield* Effect.logInfo({ accounts });

	const [errors, results] = yield* Effect.partition(
		accounts,
		(account) => budgetSync.sync(account.id, { limit: 100 }),
		{ concurrency: "unbounded" },
	);

	return { errors, results };
});
