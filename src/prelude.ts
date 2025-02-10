import { Cause, Effect, Exit, Schedule } from "effect";
import type { Duration, DurationInput } from "effect/Duration";
import { isError } from "effect/Predicate";
import type { AnySpan, SpanKind, SpanLink } from "effect/Tracer";
import { flatten } from "flat";

export type UnifyIntersection<T> = {
	[K in keyof T]: T[K];
} & unknown;

export const effectToPromiseSettledResult = async <Success, Failure>(
	effect: Effect.Effect<Success, Failure>,
): Promise<PromiseSettledResult<Success>> => {
	return Effect.runPromiseExit(effect).then((exit) => {
		if (Exit.isSuccess(exit)) {
			return { status: "fulfilled", value: exit.value } as const;
		}

		return { status: "rejected", reason: Cause.squash(exit.cause) } as const;
	});
};

/**
 * Configuration options for exponential backoff retry strategy
 *
 * Defines the parameters for configuring a retry mechanism with exponential backoff
 *
 * @param {DurationInput} delay - Initial delay between retry attempts in milliseconds
 * @param {number} [growthFactor] - Factor by which the delay increases exponentially
 * @param {boolean} [jitter] - Whether to add randomness to the retry delay to prevent thundering herd problem
 * @param {number} [maxRetries] - Maximum number of retry attempts
 */
export type ExponentialBackoffOptions = Readonly<{
	/**
	 * Initial delay between retry attempts
	 * @default 100
	 */
	delay: DurationInput;

	/**
	 * Factor by which the delay increases exponentially
	 * @default 2.0
	 */
	growthFactor?: number;

	/**
	 * Whether to add randomness to the retry delay to prevent thundering herd problem
	 * @default true
	 */
	jitter?: boolean;

	/**
	 * Maximum number of retry attempts
	 * @default 3
	 */
	maxRetries?: number;
}>;

/**
 * Default configuration for exponential backoff retry strategy
 *
 * Provides out-of-the-box configuration for retry mechanism
 */
const defaultExponentialBackoffOptions = {
	delay: 100,
	growthFactor: 2.0,
	jitter: true,
	maxRetries: 3,
} as const satisfies ExponentialBackoffOptions;

/**
 * Creates an exponential backoff retry policy with configurable options
 *
 * @param {ExponentialBackoffOptions} [options] - Optional configuration to override defaults
 * @returns {Schedule.Schedule} A retry schedule with exponential backoff and optional jitter
 *
 * @example
 * // Create a custom retry policy with longer delays and more retries
 * const customPolicy = makeExponentialBackoffPolicy({
 *   delay: 500,
 *   maxRetries: 5,
 *   jitter: false
 * });
 */
const makeExponentialBackoffPolicy = (
	options?: ExponentialBackoffOptions,
): Schedule.Schedule<[Duration, number]> => {
	const opts = { ...defaultExponentialBackoffOptions, ...options };

	const retryPolicy = Schedule.intersect(
		Schedule.exponential(opts.delay, opts.growthFactor),
		Schedule.recurs(opts.maxRetries),
	).pipe((policy) => (opts.jitter ? Schedule.jittered(policy) : policy));

	return retryPolicy;
};

/**
 * Default exponential backoff retry policy
 *
 * Provides a pre-configured retry policy with standard exponential backoff settings
 */
const defaultExponentialBackoffPolicy = makeExponentialBackoffPolicy(
	defaultExponentialBackoffOptions,
);

/**
 * Retry utility with exponential backoff policy generation
 *
 * Provides methods for creating and managing retry policies
 */
export const Retry = {
	/**
	 * Creates a custom exponential backoff retry policy
	 *
	 * @param {ExponentialBackoffOptions} [options] - Configuration for the retry policy
	 * @returns {Schedule.Schedule} A customized retry schedule
	 */
	makeExponentialBackoffPolicy,

	/**
	 * Default exponential backoff retry policy
	 *
	 * Ready-to-use retry policy with standard configuration
	 */
	exponentialBackoffPolicy: defaultExponentialBackoffPolicy,

	/**
	 * Default  retry once policy
	 */
	oncePolicy: Schedule.once,

	/**
	 * Default no retry policy
	 */
	noRetryPolicy: Schedule.stop,
};

type SpanType = "web" | "db" | "cache" | "function" | "custom";

export type InstrumentationOptions = Readonly<{
	annotateSpansWith?: Record<PropertyKey, unknown>;
	attributes?: Record<PropertyKey, unknown>;
	captureStackTrace?: boolean;
	isRootSpan?: boolean;
	annotateLogsWith?: Record<PropertyKey, unknown>;
	retryPolicy?: Schedule.Schedule<unknown>;
	spanKind?: SpanKind;
	spanLinks?: ReadonlyArray<SpanLink>;
	spanParent?: AnySpan;
	spanType?: SpanType;
}>;

const defaultInstrumentationOptions = {
	captureStackTrace: false,
	isRootSpan: false,
	retryPolicy: Retry.noRetryPolicy,
	spanKind: "server",
	spanType: "function",
} as const satisfies InstrumentationOptions;

export const withInstrumentation =
	(
		spanName: string,
		options: InstrumentationOptions = defaultInstrumentationOptions,
	) =>
	<Success, Failure, Requirements>(
		effect: Effect.Effect<Success, Failure, Requirements>,
	) => {
		const opts = { ...defaultInstrumentationOptions, ...options };

		const logAnnotations = Object.assign(
			{},
			opts.annotateLogsWith,
			opts.annotateSpansWith,
		);

		return effect.pipe(
			Effect.tapError((error) =>
				Effect.annotateCurrentSpan(
					isError(error)
						? {
								"error.name": error.name,
								"error.stack": error.stack,
								"error.message": error.message,
								"error.cause": error.cause,
							}
						: flatten(error),
				),
			),
			Effect.retry(opts.retryPolicy),
			Effect.annotateLogs(logAnnotations),
			Effect.withSpan(spanName, {
				attributes: opts.attributes,
				captureStackTrace: opts.captureStackTrace,
				kind: opts.spanKind,
				links: opts.spanLinks,
				parent: opts.spanParent,
				root: opts.isRootSpan,
			}),
			Effect.annotateSpans(opts.annotateSpansWith ?? {}),
		);
	};

export type EffectService = {
	[key: string]:
		| Effect.Effect<any, any, any>
		| ((...args: any[]) => Effect.Effect<any, any, any>);
};

export type PromiseServiceFromEffectService<T extends EffectService> = {
	[K in keyof T]: T[K] extends (
		...args: infer A
	) => Effect.Effect<infer S, any, any>
		? (...args: A) => Promise<PromiseSettledResult<S>>
		: T[K] extends Effect.Effect<infer S, any, any>
			? Promise<PromiseSettledResult<S>>
			: never;
};

export type WrappedService<Service, Failure> = Readonly<{
	client: Service;
	use: <Success>(
		fn: (client: Service) => Promise<Success>,
	) => Effect.Effect<Success, Failure>;
}>;
