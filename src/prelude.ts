import { Cause, Effect, Exit, Schedule } from "effect";
import type { Duration, DurationInput } from "effect/Duration";
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

export type InstrumentationOptions = Readonly<{
	attributes?: Record<PropertyKey, unknown>;
	retryPolicy?: Schedule.Schedule<unknown>;
	rootSpan?: boolean;
}>;

export const withInstrumentation =
	(spanName: string, options?: InstrumentationOptions) =>
	<Success, Failure, Requirements>(
		effect: Effect.Effect<Success, Failure, Requirements>,
	) => {
		const retryPolicy = options?.retryPolicy ?? Retry.noRetryPolicy;

		return effect.pipe(
			Effect.tapError((error: Failure) =>
				Effect.zipRight(
					Effect.logError(error),
					Effect.annotateCurrentSpan(flatten({ error })),
				),
			),
			Effect.retry(retryPolicy),
			Effect.withSpan(
				spanName,
				options?.attributes
					? {
							root: options?.rootSpan ?? false,
							attributes: flatten(options.attributes),
						}
					: undefined,
			),
		);
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
	 * Default no retry policy
	 */
	noRetryPolicy: Schedule.once,
};
