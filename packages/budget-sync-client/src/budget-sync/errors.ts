import { Schema } from "effect";
import * as Currency from "../currency";
import { SyncRecordEntity } from "../electrodb/sync-record";

export class BudgetSyncAccountNotFound extends Schema.TaggedError<BudgetSyncAccountNotFound>()(
	"BudgetSyncAccountNotFound",
	{
		budgetSyncAccountId: Schema.String,
		cause: Schema.Unknown,
	},
) {}

export class InvalidExpectedNetBalanceError extends Schema.TaggedError<InvalidExpectedNetBalanceError>()(
	"InvalidExpectedNetBalanceError",
	{
		budgetSyncAccountId: Schema.String,
		actual: Currency.MilliunitsSchema,
		expected: Currency.MilliunitsSchema,
	},
) {}

export class InvalidSharesCount extends Schema.TaggedError<InvalidSharesCount>()(
	"InvalidSharesCount",
	{
		budgetSyncAccountId: Schema.String,
		expenseId: Schema.Number,
		splitwiseUserId: Schema.Number,
		count: Schema.Number,
	},
) {}

export class UsersShareNotFoundForExpense extends Schema.TaggedError<UsersShareNotFoundForExpense>()(
	"UsersShareNotFoundForExpense",
	{
		budgetSyncAccountId: Schema.String,
		expenseId: Schema.Number,
		splitwiseUserId: Schema.Number,
	},
) {}

export class CounterPartysShareNotFoundForExpense extends Schema.TaggedError<CounterPartysShareNotFoundForExpense>()(
	"CounterPartysShareNotFoundForExpense",
	{
		budgetSyncAccountId: Schema.String,
		expenseId: Schema.Number,
	},
) {}

export class UpdateSyncedTransactionEntityError extends Schema.TaggedError<UpdateSyncedTransactionEntityError>()(
	"UpdateSyncedTransactionEntityError",
	{
		budgetSyncAccountId: Schema.String,
		cause: Schema.optional(Schema.Unknown),
		splitwiseExpenseId: Schema.Number,
		ynabTransactionId: Schema.String,
	},
) {}

export class SoftDeleteSyncedTransactionEntityError extends Schema.TaggedError<SoftDeleteSyncedTransactionEntityError>()(
	"SoftDeleteSyncedTransactionEntityError",
	{
		budgetSyncAccountId: Schema.String,
		cause: Schema.optional(Schema.Unknown),
		ynabTransactionId: Schema.String,
		splitwiseExpenseId: Schema.Number,
	},
) {}

export class DeleteYnabTransactionError extends Schema.TaggedError<DeleteYnabTransactionError>()(
	"DeleteYnabTransactionError",
	{
		budgetSyncAccountId: Schema.String,
		cause: Schema.optional(Schema.Unknown),
		ynabTransactionId: Schema.String,
	},
) {}

export class Todo extends Schema.TaggedError<Todo>()("Todo", {}) {}

export class CreatedExpenseTypeForExistingSyncedTransactionError extends Schema.TaggedError<CreatedExpenseTypeForExistingSyncedTransactionError>()(
	"CreatedExpenseTypeForExistingSyncedTransactionError",
	{
		budgetSyncAccountId: Schema.String,
		splitwiseExpenseId: Schema.Number,
		syncedRecordId: Schema.String,
	},
) {}

export class SplitwiseGetExpensesByGroupIdError extends Schema.TaggedError<SplitwiseGetExpensesByGroupIdError>()(
	"SplitwiseGetExpensesByGroupIdError",
	{
		budgetSyncAccountId: Schema.String,
		cause: Schema.Unknown,
		splitwiseGroupId: Schema.Number,
		splitwiseUserId: Schema.Number,
		syncRecordId: Schema.String,
	},
) {}

export class CreateSyncRecordError extends Schema.TaggedError<CreateSyncRecordError>()(
	"CreateSyncRecordError",
	{
		budgetSyncAccountId: Schema.String,
		cause: Schema.Unknown,
	},
) {}

export class GetMostRecentSyncDateError extends Schema.TaggedError<GetMostRecentSyncDateError>()(
	"GetMostRecentSyncDateError",
	{
		budgetSyncAccountId: Schema.String,
		cause: Schema.Unknown,
	},
) {}

export class UpdateSyncRecordStatusError extends Schema.TaggedError<UpdateSyncRecordStatusError>()(
	"UpdateSyncRecordStatusError",
	{
		budgetSyncAccountId: Schema.String,
		cause: Schema.Unknown,
		syncRecordId: Schema.String,
		from: Schema.optional(SyncRecordEntity.schema.fields.status),
		to: SyncRecordEntity.schema.fields.status,
	},
) {}

export class GetSyncedTransactionBySplitwiseExpenseId extends Schema.TaggedError<GetSyncedTransactionBySplitwiseExpenseId>()(
	"GetSyncedTransactionBySplitwiseExpenseId",
	{
		budgetSyncAccountId: Schema.String,
		cause: Schema.Unknown,
		splitwiseExpenseId: Schema.Number,
		splitwiseGroupId: Schema.Number,
		splitwiseUserId: Schema.Number,
		syncRecordId: Schema.String,
	},
) {}

export class CreateSyncedTransactionError extends Schema.TaggedError<CreateSyncedTransactionError>()(
	"CreateSyncedTransactionError",
	{
		budgetSyncAccountId: Schema.String,
		cause: Schema.Unknown,
		splitwiseExpenseId: Schema.Number,
		splitwiseGroupId: Schema.Number,
		splitwiseUserId: Schema.Number,
		syncRecordId: Schema.String,
		ynabTransactionId: Schema.String,
	},
) {}

export class SyncInProgressError extends Schema.TaggedError<SyncInProgressError>()(
	"SyncInProgressError",
	{
		budgetSyncAccountId: Schema.String,
		inProgressRecordIds: Schema.Array(Schema.String),
	},
) {}

export class GetInProgressSyncRecordsError extends Schema.TaggedError<GetInProgressSyncRecordsError>()(
	"GetInProgressSyncRecordsError",
	{
		budgetSyncAccountId: Schema.String,
		cause: Schema.Unknown,
	},
) {}
