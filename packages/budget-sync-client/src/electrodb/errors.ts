import { Schema } from "effect";

export class SyncRecordInvariant extends Schema.TaggedError<SyncRecordInvariant>()(
	"SyncRecordInvariant",
	{
		budgetSyncAccountId: Schema.String,
		message: Schema.String,
	},
) {}

export class SyncRecordNotFound extends Schema.TaggedError<SyncRecordNotFound>()(
	"SyncRecordNotFound",
	{
		budgetSyncAccountId: Schema.String,
		recordId: Schema.String,
	},
) {}

export class SyncedTransactionNotFound extends Schema.TaggedError<SyncedTransactionNotFound>()(
	"SyncedTransactionNotFound",
	{
		budgetSyncAccountId: Schema.String,
		ynabTransactionId: Schema.String,
		splitwiseExpenseId: Schema.Number,
	},
) {}

export class DuplicateSyncedTransactionError extends Schema.TaggedError<DuplicateSyncedTransactionError>()(
	"DuplicateSyncedTransactionError",
	{
		budgetSyncAccountId: Schema.String,
		splitwiseExpenseId: Schema.optional(Schema.Number),
		ynabTransactionId: Schema.optional(Schema.String),
	},
) {}

export class DuplicateSyncRecordError extends Schema.TaggedError<DuplicateSyncRecordError>()(
	"DuplicateSyncRecordError",
	{
		budgetSyncAccountId: Schema.String,
		recordId: Schema.String,
	},
) {}
