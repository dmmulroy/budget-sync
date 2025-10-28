import {
	Cause,
	Context,
	Effect,
	Layer,
	Option,
	Schema,
	Struct,
	flow,
} from "effect";
import * as Currency from "../currency";
import type { BudgetSyncAccountEntity } from "../electrodb/budget-sync-account";
import type { ElectroDbError } from "../electrodb/electrodb";
import type {
	DuplicateSyncRecordError,
	DuplicateSyncedTransactionError,
	SyncRecordInvariant,
	SyncRecordNotFound,
} from "../electrodb/errors";
import * as BudgetSyncElectroDb from "../electrodb/service";
import { SyncedTransactionEntity } from "../electrodb/synced-transaction";
import {
	formatDateIsoFullDate,
	getTransactionType,
	getUserFullNameFromShare,
	isPayment,
} from "../prelude";
import * as Splitwise from "../splitwise/effect-client";
import type { Expense } from "../splitwise/schemas";
import * as Ynab from "../ynab/client";
import * as CurrentBudgetSyncAccount from "./current-account";
import * as CurrentSyncRecord from "./current-sync-record";
import {
	BudgetSyncAccountNotFound,
	CounterPartysShareNotFoundForExpense,
	CreateSyncRecordError,
	CreateSyncedTransactionError,
	CreatedExpenseTypeForExistingSyncedTransactionError,
	DeleteYnabTransactionError,
	GetInProgressSyncRecordsError,
	GetMostRecentSyncDateError,
	GetSyncedTransactionBySplitwiseExpenseId,
	InvalidSharesCount,
	SoftDeleteSyncedTransactionEntityError,
	SplitwiseGetExpensesByGroupIdError,
	SyncInProgressError,
	UpdateSyncRecordStatusError,
	UpdateSyncedTransactionEntityError,
	UsersShareNotFoundForExpense,
} from "./errors";

export namespace BudgetSync {
	export type BudgetSyncOptions = Readonly<{
		updatedAfter?: Date;
		limit?: number;
	}>;

	export type SyncError =
		| BudgetSyncAccountNotFound
		| CounterPartysShareNotFoundForExpense
		| CreatedExpenseTypeForExistingSyncedTransactionError
		| CreateSyncedTransactionError
		| CreateSyncRecordError
		| InvalidSharesCount
		| GetSyncedTransactionBySplitwiseExpenseId
		| DeleteYnabTransactionError
		| DuplicateSyncRecordError
		| DuplicateSyncedTransactionError
		| GetMostRecentSyncDateError
		| GetInProgressSyncRecordsError
		| SoftDeleteSyncedTransactionEntityError
		| UpdateSyncedTransactionEntityError
		| SplitwiseGetExpensesByGroupIdError
		| SyncInProgressError
		| SyncRecordInvariant
		| SyncRecordNotFound
		| UpdateSyncRecordStatusError
		| UsersShareNotFoundForExpense
		| Ynab.CreateYnabTransactionError;

	const Created = Schema.TaggedStruct("Created", {
		budgetSyncAccountId: Schema.String,
		date: Schema.Date,
		syncedTransaction: SyncedTransactionEntity.schema,
		syncRecordId: Schema.String,
	});

	const Updated = Schema.TaggedStruct("Updated", {
		budgetSyncAccountId: Schema.String,
		date: Schema.Date,
		syncedTransaction: SyncedTransactionEntity.schema,
		syncRecordId: Schema.String,
	});

	const Deleted = Schema.TaggedStruct("Updated", {
		budgetSyncAccountId: Schema.String,
		date: Schema.Date,
		syncedTransaction: SyncedTransactionEntity.schema,
		syncRecordId: Schema.String,
	});

	const SkipDeleted = Schema.TaggedStruct("SkipDeleted", {
		budgetSyncAccountId: Schema.String,
		date: Schema.Date,
		expenseId: Schema.Number,
		syncRecordId: Schema.String,
	});

	export const SyncResult = Schema.Union(
		Created,
		Updated,
		Deleted,
		SkipDeleted,
	);

	export type SyncResult = Schema.Schema.Type<typeof SyncResult>;

	export type IBudgetSync = Readonly<{
		// TODO: refactor ElectroDbErrors
		createAccount: (
			email: string,
			options: BudgetSyncElectroDb.CreateAccountOptions,
		) => Effect.Effect<BudgetSyncAccountEntity.Entity, ElectroDbError>;

		getAllAccounts: () => Effect.Effect<
			BudgetSyncAccountEntity[],
			ElectroDbError
		>;

		sync: (
			budgetSyncAccountId: string,
			options?: BudgetSyncOptions,
		) => Effect.Effect<SyncResult[], SyncError>;
	}>;

	export class BudgetSync extends Context.Tag("BudgetSync")<
		BudgetSync,
		IBudgetSync
	>() {}

	export const createService = () =>
		Effect.gen(function* () {
			const db = yield* BudgetSyncElectroDb.BudgetSyncElectroDb;
			const splitwise = yield* Splitwise.Splitwise;
			const ynab = yield* Ynab.Ynab;

			return {
				createAccount: db.createAccount,
				getAllAccounts: db.getAllBudgetSyncAccounts,
				sync: flow(
					sync,
					Effect.provideService(BudgetSyncElectroDb.BudgetSyncElectroDb, db),
					Effect.provideService(Splitwise.Splitwise, splitwise),
					Effect.provideService(Ynab.Ynab, ynab),
				),
			};
		});

	export const layerWithoutDependencies = Layer.effect(
		BudgetSync,
		createService(),
	);

	export const layer = Layer.effect(BudgetSync, createService()).pipe(
		Layer.provide([BudgetSyncElectroDb.layer, Splitwise.layer, Ynab.layer]),
		Layer.orDie,
	);

	export function sync(
		budgetSyncAccountId: string,
		options?: BudgetSyncOptions,
	): Effect.Effect<
		SyncResult[],
		SyncError,
		BudgetSyncElectroDb.BudgetSyncElectroDb | Splitwise.Splitwise | Ynab.Ynab
	> {
		return Effect.gen(function* () {
			const db = yield* BudgetSyncElectroDb.BudgetSyncElectroDb;
			const splitwise = yield* Splitwise.Splitwise;

			const budgetSyncAccount = yield* db
				.getBudgetSyncAccountById(budgetSyncAccountId)
				.pipe(
					Effect.flatten,
					Effect.mapError(
						(cause) =>
							new BudgetSyncAccountNotFound({ cause, budgetSyncAccountId }),
					),
				);

			const inProgressRecords = yield* db.sync
				.getInProgressSyncRecordsByAccountId(budgetSyncAccountId)
				.pipe(
					Effect.mapError(
						(cause) =>
							new GetInProgressSyncRecordsError({ budgetSyncAccountId, cause }),
					),
				);

			if (inProgressRecords.length > 0) {
				return yield* new SyncInProgressError({
					budgetSyncAccountId,
					inProgressRecordIds: inProgressRecords.map(({ id }) => id),
				});
			}

			const syncRecord = yield* db.sync
				.createRecord(budgetSyncAccountId)
				.pipe(
					Effect.mapError(
						(cause) =>
							new CreateSyncRecordError({ budgetSyncAccountId, cause }),
					),
				);

			return yield* Effect.gen(function* () {
				const updatedAfter =
					options?.updatedAfter === undefined
						? yield* getMostRecentSyncDate(budgetSyncAccountId).pipe(
								Effect.map(Option.getOrUndefined),
							)
						: options.updatedAfter;

				yield* Effect.annotateCurrentSpan({
					"sync.updated_after": String(updatedAfter),
					"sync.limit": options?.limit ?? 0,
				});

				const splitwiseExpenses = yield* splitwise
					.getExpensesByGroupId(budgetSyncAccount.splitwiseGroupId, {
						updated_after: updatedAfter?.toISOString(),
						limit: options?.limit ?? 0,
					})
					.pipe(
						Effect.mapError(
							(cause) =>
								new SplitwiseGetExpensesByGroupIdError({
									budgetSyncAccountId,
									cause,
									splitwiseGroupId: budgetSyncAccount.splitwiseGroupId,
									splitwiseUserId: budgetSyncAccount.splitwiseUserId,
									syncRecordId: syncRecord.id,
								}),
						),
					);

				const updatedSyncRecord = yield* db.sync
					.updateRecordStatusById(syncRecord.id, {
						budgetSyncAccountId,
						status: "in-progress",
					})
					.pipe(
						Effect.catchTag(
							"ElectroDbError",
							(cause) =>
								new UpdateSyncRecordStatusError({
									budgetSyncAccountId,
									cause,
									syncRecordId: syncRecord.id,
									from: syncRecord.status,
									to: "in-progress",
								}),
						),
					);

				const results = yield* Effect.forEach(
					splitwiseExpenses,
					handleExpense,
					{
						batching: true,
						concurrency: "unbounded",
					},
				);

				yield* db.sync
					.updateRecordStatusById(updatedSyncRecord.id, {
						budgetSyncAccountId,
						status: "completed",
					})
					.pipe(
						Effect.catchTag(
							"ElectroDbError",
							(cause) =>
								new UpdateSyncRecordStatusError({
									budgetSyncAccountId,
									cause,
									syncRecordId: updatedSyncRecord.id,
									from: updatedSyncRecord.status,
									to: "completed",
								}),
						),
					);

				return results;
			}).pipe(
				Effect.provideService(
					CurrentBudgetSyncAccount.CurrentBudgetSyncAccount,
					budgetSyncAccount,
				),
				Effect.provideService(CurrentSyncRecord.CurrentSyncRecord, syncRecord),
				Effect.onError((error) =>
					db.sync
						.updateRecordStatusById(syncRecord.id, {
							budgetSyncAccountId,
							status: "error",
						})
						.pipe(
							Effect.orDie,
							Effect.withSpan("budget_sync.synce.on_error", {
								attributes: {
									"error.message": Cause.pretty(error),
									"budget_sync.account.id": budgetSyncAccountId,
									"sync_record.id": syncRecord.id,
								},
							}),
						),
				),
				Effect.withSpan("budget_sync.sync"),
				Effect.annotateSpans({
					"budget_sync.account.id": budgetSyncAccountId,
					"sync_record.id": syncRecord.id,
				}),
			);
		});
	}

	function getMostRecentSyncDate(budgetSyncAccountId: string) {
		return Effect.gen(function* () {
			const db = yield* BudgetSyncElectroDb.BudgetSyncElectroDb;

			return yield* db.sync.getMostRecentCompletedSyncRecordByAccountId(
				budgetSyncAccountId,
			);
		}).pipe(
			Effect.map(Option.andThen(Struct.get("createdAt"))),
			Effect.catchTag(
				"ElectroDbError",
				(cause) =>
					new GetMostRecentSyncDateError({
						budgetSyncAccountId,
						cause,
					}),
			),
			Effect.withSpan("budget_sync.get_most_recent_sync_date", {
				attributes: {
					"budget_sync.account.id": budgetSyncAccountId,
				},
			}),
		);
	}

	type HandleExpenseError =
		| CounterPartysShareNotFoundForExpense
		| CreatedExpenseTypeForExistingSyncedTransactionError
		| CreateSyncedTransactionError
		| DeleteYnabTransactionError
		| DuplicateSyncedTransactionError
		| GetSyncedTransactionBySplitwiseExpenseId
		| InvalidSharesCount
		| SoftDeleteSyncedTransactionEntityError
		| UpdateSyncedTransactionEntityError
		| UsersShareNotFoundForExpense
		| Ynab.CreateYnabTransactionError;

	function handleExpense(
		expense: Expense,
	): Effect.Effect<
		SyncResult,
		HandleExpenseError,
		| BudgetSyncElectroDb.BudgetSyncElectroDb
		| CurrentBudgetSyncAccount.CurrentBudgetSyncAccount
		| CurrentSyncRecord.CurrentSyncRecord
		| Ynab.Ynab
	> {
		return Effect.gen(function* () {
			const budgetSyncAccount =
				yield* CurrentBudgetSyncAccount.CurrentBudgetSyncAccount;
			const syncRecord = yield* CurrentSyncRecord.CurrentSyncRecord;
			const db = yield* BudgetSyncElectroDb.BudgetSyncElectroDb;

			const budgetSyncAccountId = budgetSyncAccount.id;

			const maybeSyncedTransaction = yield* db
				.getSyncedTransactionBySplitwiseExpenseId(expense.id, {
					budgetSyncAccountId,
				})
				.pipe(
					Effect.catchTag(
						"ElectroDbError",
						(cause) =>
							new GetSyncedTransactionBySplitwiseExpenseId({
								budgetSyncAccountId,
								cause,
								splitwiseExpenseId: expense.id,
								splitwiseGroupId: budgetSyncAccount.splitwiseGroupId,
								splitwiseUserId: budgetSyncAccount.splitwiseUserId,
								syncRecordId: syncRecord.id,
							}),
					),
				);

			if (Option.isSome(maybeSyncedTransaction)) {
				return yield* handleExistingSyncedTransaction({
					budgetSyncAccount,
					expense,
					syncedTransaction: maybeSyncedTransaction.value,
					syncRecordId: syncRecord.id,
				});
			}

			return yield* handleNewSyncedTransaction({
				budgetSyncAccount,
				expense,
				syncRecordId: syncRecord.id,
			});
		}).pipe(
			Effect.withSpan("budget_sync.handle_expense", {
				attributes: {
					"splitwise.expense.id": expense.id,
				},
			}),
		);
	}

	type HandleExistingSyncedTransactionInput = Readonly<{
		budgetSyncAccount: BudgetSyncAccountEntity.Entity;
		syncedTransaction: SyncedTransactionEntity.Entity;
		expense: Expense;
		syncRecordId: string;
	}>;

	function handleExistingSyncedTransaction(
		input: HandleExistingSyncedTransactionInput,
	) {
		return Effect.gen(function* () {
			const expenseType = getExpenseType(input.expense);

			if (expenseType === "created") {
				return yield* new CreatedExpenseTypeForExistingSyncedTransactionError({
					budgetSyncAccountId: input.budgetSyncAccount.id,
					splitwiseExpenseId: input.expense.id,
					syncedRecordId: input.syncRecordId,
				});
			}

			if (expenseType === "deleted") {
				return yield* handleDeleteSyncedTransaction(input);
			}

			return yield* handleUpdateSyncedTransaction(input);
		}).pipe(
			Effect.withSpan("budget_sync.handle_updated_synced_transaction", {
				attributes: {
					"budget_sync.account.id": input.budgetSyncAccount,
					"splitwise.expense.id": input.expense.id,
					"sync_record.id": input.syncRecordId,
				},
			}),
		);
	}

	type HandleNewSyncedTransactionInput = Readonly<{
		budgetSyncAccount: BudgetSyncAccountEntity.Entity;
		expense: Expense;
		syncRecordId: string;
	}>;

	function handleNewSyncedTransaction(input: HandleNewSyncedTransactionInput) {
		return Effect.gen(function* () {
			const db = yield* BudgetSyncElectroDb.BudgetSyncElectroDb;
			const ynab = yield* Ynab.Ynab;

			const expenseType = getExpenseType(input.expense);

			if (expenseType === "deleted") {
				return SkipDeleted.make({
					budgetSyncAccountId: input.budgetSyncAccount.id,
					syncRecordId: input.syncRecordId,
					expenseId: input.expense.id,
					date: new Date(),
				});
			}

			const shares = yield* getSharesFromExpense(input);

			const expenseIsPayment = isPayment(input.expense);

			const ynabTrasaction = yield* ynab.transactions.createTransaction(
				input.budgetSyncAccount.ynabBudgetId,
				{
					account_id: input.budgetSyncAccount.ynabAccountId,
					category_id: input.budgetSyncAccount.ynabUncategorizedCategoryId,
					amount: Currency.dollarsToMilliunits(shares.user.netBalance),
					payee_name: getUserFullNameFromShare(shares.counterParty),
					date: formatDateIsoFullDate(input.expense.createdAt),
					memo: `swdescription:${input.expense.description.replaceAll(" ", "_")}:srid:${input.syncRecordId}:swid:${input.expense.id}:swcategory:${input.expense.category?.name.replaceAll(" ", "_") ?? "<unknown>"}:createdat:${formatDateIsoFullDate(input.expense.createdAt)}`,
				},
			);

			const syncedTransaction = yield* db
				.createSyncedTransaction({
					ynabTransactionId: ynabTrasaction.id,
					type: getTransactionType(ynabTrasaction.amount),
					budgetSyncAccountId: input.budgetSyncAccount.id,
					amount: ynabTrasaction.amount,
					isPayment: expenseIsPayment,
					splitwiseExpenseId: input.expense.id,
					relatedSyncRecordIds: [input.syncRecordId],
				})
				.pipe(
					Effect.mapError(
						(cause) =>
							new CreateSyncedTransactionError({
								budgetSyncAccountId: input.budgetSyncAccount.id,
								cause,
								splitwiseExpenseId: input.expense.id,
								splitwiseGroupId: input.budgetSyncAccount.splitwiseGroupId,
								splitwiseUserId: input.budgetSyncAccount.splitwiseUserId,
								syncRecordId: input.syncRecordId,
								ynabTransactionId: ynabTrasaction.id,
							}),
					),
				);

			return Created.make({
				budgetSyncAccountId: input.budgetSyncAccount.id,
				syncRecordId: input.syncRecordId,
				syncedTransaction,
				date: new Date(),
			});
		}).pipe(
			Effect.withSpan("budget_sync.handle_new_synced_transaction", {
				attributes: {
					"budget_sync.account.id": input.budgetSyncAccount,
					"splitwise.expense.id": input.expense.id,
					"sync_record.id": input.syncRecordId,
				},
			}),
		);
	}

	function getExpenseType(expense: Expense): "created" | "updated" | "deleted" {
		if (expense.deletedAt !== null) {
			return "deleted";
		}

		if (expense.createdAt === expense.updatedAt) {
			return "created";
		}

		return "updated";
	}

	type GetSharesFromExpenseInput = Readonly<{
		budgetSyncAccount: BudgetSyncAccountEntity.Entity;
		expense: Expense;
	}>;

	function getSharesFromExpense(input: GetSharesFromExpenseInput) {
		return Effect.gen(function* () {
			if (input.expense.users.length !== 2) {
				return yield* new InvalidSharesCount({
					expenseId: input.expense.id,
					splitwiseUserId: input.budgetSyncAccount.splitwiseUserId,
					budgetSyncAccountId: input.budgetSyncAccount.id,
					count: input.expense.users.length,
				});
			}

			const currentUsersShare = yield* Option.fromNullable(
				input.expense.users.find(
					(user) => user.userId === input.budgetSyncAccount.splitwiseUserId,
				),
			).pipe(
				Effect.mapError(
					() =>
						new UsersShareNotFoundForExpense({
							budgetSyncAccountId: input.budgetSyncAccount.id,
							expenseId: input.expense.id,
							splitwiseUserId: input.budgetSyncAccount.splitwiseUserId,
						}),
				),
			);

			const counterPartysShare = yield* Option.fromNullable(
				input.expense.users.find(
					(user) => user.userId !== input.budgetSyncAccount.splitwiseUserId,
				),
			).pipe(
				Effect.mapError(
					() =>
						new CounterPartysShareNotFoundForExpense({
							budgetSyncAccountId: input.budgetSyncAccount.id,
							expenseId: input.expense.id,
						}),
				),
			);

			return {
				user: currentUsersShare,
				counterParty: counterPartysShare,
			};
		}).pipe(
			Effect.withSpan("budget_sync.get_shares_from_expense", {
				attributes: {
					"budget_sync.account.id": input.budgetSyncAccount.id,
					"splitwise.expense.id": input.expense.id,
				},
			}),
		);
	}

	type HandleDeleteSyncedTransaction = Readonly<{
		budgetSyncAccount: BudgetSyncAccountEntity.Entity;
		syncedTransaction: SyncedTransactionEntity.Entity;
		syncRecordId: string;
	}>;

	function handleDeleteSyncedTransaction(input: HandleDeleteSyncedTransaction) {
		return Effect.gen(function* () {
			const db = yield* BudgetSyncElectroDb.BudgetSyncElectroDb;
			const ynab = yield* Ynab.Ynab;

			yield* ynab.transactions
				.deleteTransaction(
					input.budgetSyncAccount.ynabBudgetId,
					input.syncedTransaction.ynabTransactionId,
				)
				.pipe(
					Effect.mapError(
						(cause) =>
							new DeleteYnabTransactionError({
								budgetSyncAccountId: input.budgetSyncAccount.id,
								cause,
								ynabTransactionId: input.syncedTransaction.ynabTransactionId,
							}),
					),
				);

			const deletedSyncedTransaction = yield* db
				.softDeleteSyncedTransaction(input.syncedTransaction)
				.pipe(
					Effect.mapError(
						(cause) =>
							new SoftDeleteSyncedTransactionEntityError({
								budgetSyncAccountId: input.budgetSyncAccount.id,
								cause,
								ynabTransactionId: input.syncedTransaction.ynabTransactionId,
								splitwiseExpenseId: input.syncedTransaction.splitwiseExpenseId,
							}),
					),
				);

			return Deleted.make({
				budgetSyncAccountId: input.budgetSyncAccount.id,
				syncRecordId: input.syncRecordId,
				syncedTransaction: deletedSyncedTransaction,
				date: new Date(),
			});
		}).pipe(
			Effect.withSpan("budget_sync.handle_delete_synced_transaction", {
				attributes: {
					"budget_sync.account.id": input.budgetSyncAccount,
					"splitwise.expense.id": input.syncedTransaction.splitwiseExpenseId,
					"ynab.transaction.id": input.syncedTransaction.ynabTransactionId,
					"sync_record.id": input.syncRecordId,
				},
			}),
		);
	}

	type HandleUpdateSyncedTransaction = Readonly<{
		budgetSyncAccount: BudgetSyncAccountEntity.Entity;
		expense: Expense;
		syncedTransaction: SyncedTransactionEntity.Entity;
		syncRecordId: string;
	}>;

	function handleUpdateSyncedTransaction(input: HandleUpdateSyncedTransaction) {
		return Effect.gen(function* () {
			const db = yield* BudgetSyncElectroDb.BudgetSyncElectroDb;
			const ynab = yield* Ynab.Ynab;

			const shares = yield* getSharesFromExpense(input);

			const updatedYnabTransaction = yield* ynab.transactions
				.updateTransactions(input.budgetSyncAccount.ynabBudgetId, {
					transactions: [
						{
							id: input.syncedTransaction.ynabTransactionId,
							amount: Currency.dollarsToMilliunits(shares.user.netBalance),
							payee_name: getUserFullNameFromShare(shares.counterParty),
							date: formatDateIsoFullDate(input.expense.createdAt),
							memo: `swdescription:${input.expense.description.replaceAll(" ", "_")}:srid:${input.syncRecordId}:swid:${input.expense.id}:swcategory:${input.expense.category?.name.replaceAll(" ", "_") ?? "<unknown>"}:updatedat:${formatDateIsoFullDate(input.expense.createdAt)}`,
						},
					],
				})
				.pipe(
					Effect.andThen((data) => Option.fromNullable(data.at(0))),
					Effect.mapError(
						(cause) =>
							new DeleteYnabTransactionError({
								budgetSyncAccountId: input.budgetSyncAccount.id,
								cause,
								ynabTransactionId: input.syncedTransaction.ynabTransactionId,
							}),
					),
				);

			const updatedSyncedTransaction = yield* db
				.updateSyncedTransactionBySplitwiseExpenseId(
					input.syncedTransaction.splitwiseExpenseId,
					{
						amount: updatedYnabTransaction.amount,
						budgetSyncAccountId: input.budgetSyncAccount.id,
						type: getTransactionType(updatedYnabTransaction.amount),
						ynabTransactionId: updatedYnabTransaction.id,
					},
				)
				.pipe(
					Effect.mapError(
						(cause) =>
							new UpdateSyncedTransactionEntityError({
								budgetSyncAccountId: input.budgetSyncAccount.id,
								cause,
								ynabTransactionId: input.syncedTransaction.ynabTransactionId,
								splitwiseExpenseId: input.syncedTransaction.splitwiseExpenseId,
							}),
					),
				);

			return Updated.make({
				budgetSyncAccountId: input.budgetSyncAccount.id,
				syncRecordId: input.syncRecordId,
				syncedTransaction: updatedSyncedTransaction,
				date: new Date(),
			});
		}).pipe(
			Effect.withSpan("budget_sync.handle_update_synced_transaction", {
				attributes: {
					"budget_sync.account.id": input.budgetSyncAccount,
					"splitwise.expense.id": input.syncedTransaction.splitwiseExpenseId,
					"ynab.transaction.id": input.syncedTransaction.ynabTransactionId,
					"sync_record.id": input.syncRecordId,
				},
			}),
		);
	}
}
