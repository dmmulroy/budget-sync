import { type Effect, Layer, Logger, ManagedRuntime } from "effect";
import { Otel } from "./otel";
import { BudgetSync } from "@budget-sync/client";

type Result<A, E> = Readonly<
	{ _tag: "ok"; value: A } | { _tag: "err"; error: E | defect }
>;

type defect = { _tag: "defect"; cause: string };

export namespace BudgetSyncRuntime {
	const runtime = ManagedRuntime.make(
		Layer.empty.pipe(
			Layer.provideMerge(BudgetSync.layer),
			Layer.provide([Logger.structured]),
			Layer.provide([Otel.layer, Logger.structured]),
		),
	);

	export const runPromise = runtime.runPromise;

	export const runPromiseResult = async <A, E>(
		effect: Effect.Effect<A, E>,
	): Promise<Result<A, E>> => {
		const exit = await runtime.runPromiseExit(effect);

		if (exit._tag === "Failure") {
			if (exit.cause._tag === "Fail") {
				return { _tag: "err", error: exit.cause.error } as const;
			}
			return {
				_tag: "err",
				error: { _tag: "defect", cause: exit.cause._tag },
			} as const;
		}

		return { _tag: "ok", value: exit.value };
	};
}
