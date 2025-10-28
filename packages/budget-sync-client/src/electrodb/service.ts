import { Context, Effect, Layer, Option, Struct } from "effect";
import { formatDateIsoFullDate } from "../prelude";
import { Retry } from "../retry";
import type { BudgetSyncAccountEntity } from "./budget-sync-account";
import * as ElectroDb from "./electrodb";
import type { ElectroDbError } from "./electrodb";
import {
	DuplicateSyncRecordError,
	DuplicateSyncedTransactionError,
	SyncRecordInvariant,
	SyncRecordNotFound,
	SyncedTransactionNotFound,
} from "./errors";
import type { SyncRecordEntity } from "./sync-record";
import type { SyncedTransactionEntity } from "./synced-transaction";

export type IBudgetSyncElectroDb = Readonly<{
	createAccount: (
		email: string,
		options: CreateAccountOptions,
	) => Effect.Effect<BudgetSyncAccountEntity.Entity, ElectroDbError>;

	createSyncedTransaction: (
		syncedTransaction: SyncedTransactionEntity.New,
	) => Effect.Effect<SyncedTransactionEntity.Entity, ElectroDbError>;

	deleteSyncedTransaction: (
		options: DeleteSyncedTransactionOptions,
	) => Effect.Effect<void, ElectroDbError>;

	softDeleteSyncedTransaction: (
		syncedTransaction: SyncedTransactionEntity.Entity,
	) => Effect.Effect<SyncedTransactionEntity.Entity, ElectroDbError>;

	getSyncedTransactionBySplitwiseExpenseId: (
		splitwiseExpenseId: number,
		options: GetSyncedTransactionBySplitwiseExpenseIdOptions,
	) => Effect.Effect<
		Option.Option<SyncedTransactionEntity.Entity>,
		ElectroDbError | DuplicateSyncedTransactionError
	>;

	getBudgetSyncAccountById: (
		budgetSyncAccountId: string,
	) => Effect.Effect<
		Option.Option<BudgetSyncAccountEntity.Entity>,
		ElectroDbError
	>;

	getAllBudgetSyncAccounts: () => Effect.Effect<
		BudgetSyncAccountEntity.Entity[],
		ElectroDbError
	>;

	getSyncedTransactionsByAccountId: (
		budgetSyncAccountId: string,
	) => Effect.Effect<readonly SyncedTransactionEntity.Entity[], ElectroDbError>;

	updateSyncedTransactionBySplitwiseExpenseId: (
		splitwiseExpenseId: number,
		options: UpdateSyncedTransactionOptions,
	) => Effect.Effect<
		SyncedTransactionEntity.Entity,
		DuplicateSyncedTransactionError | ElectroDbError | SyncedTransactionNotFound
	>;

	sync: {
		createRecord(
			budgetSyncAccountId: string,
		): Effect.Effect<SyncRecordEntity.Entity, ElectroDbError>;

		getInProgressSyncRecordsByAccountId(
			budgetSyncAccountId: string,
		): Effect.Effect<
			SyncRecordEntity.Entity[],
			ElectroDbError | SyncRecordInvariant
		>;

		getMostRecentCompletedSyncRecordByAccountId(
			budgetSyncAccountId: string,
		): Effect.Effect<
			Option.Option<SyncRecordEntity.Completed>,
			ElectroDbError | SyncRecordInvariant
		>;

		getRecordById(
			syncRecordId: string,
			options: GetSyncRecordByIdOptions,
		): Effect.Effect<
			Option.Option<SyncRecordEntity.Entity>,
			ElectroDbError | DuplicateSyncRecordError
		>;

		updateRecordStatusById(
			syncRecordId: string,
			options: UpdateSyncRecordStatusByIdOptions,
		): Effect.Effect<
			SyncRecordEntity.Entity,
			ElectroDbError | SyncRecordNotFound | DuplicateSyncRecordError
		>;
	};
}>;

export class BudgetSyncElectroDb extends Context.Tag("BudgetSyncElectroDb")<
	BudgetSyncElectroDb,
	IBudgetSyncElectroDb
>() {}

export const createService = () =>
	Effect.gen(function* () {
		const db = yield* ElectroDb.ElectroDb;

		const createAccount = (email: string, options: CreateAccountOptions) =>
			Effect.gen(function* () {
				const { data } = yield* db.use(async (client) => {
					return client.entities.budgetSyncAccount
						.create({
							email,
							splitwiseGroupId: options.splitwiseGroupId,
							splitwiseUserId: options.splitwiseUserId,
							ynabBudgetId: options.ynabBudgetId,
							ynabAccountId: options.ynabAccountId,
							ynabUncategorizedCategoryId: options.ynabUncategorizedCategoryId,
						})
						.go();
				});

				yield* Effect.annotateCurrentSpan({
					"budget_sync_account.id": data.id,
				});

				return data;
			}).pipe(
				Effect.withSpan("budget_sync_electrodb.create_account", {
					attributes: {
						"budget_sync_account.email": email,
						"budget_sync_account.splitwise_group_id": options.splitwiseGroupId,
						"budget_sync_account.splitwise_user_id": options.splitwiseUserId,
						"budget_sync_account.ynab_budget_id": options.ynabBudgetId,
						"budget_sync_account.ynab_account_id": options.ynabAccountId,
					},
				}),
			);

		const getBudgetSyncAccountById = (budgetSyncAccountId: string) =>
			Effect.gen(function* () {
				const { data } = yield* db.use(async (client) => {
					return client.entities.budgetSyncAccount
						.get({ budgetSyncAccountId })
						.go();
				});

				return Option.fromNullable(data);
			}).pipe(
				Effect.withSpan("budget_sync_electrodb.get_budget_sync_account_by_id", {
					attributes: {
						"budget_sync_account.id": budgetSyncAccountId,
					},
				}),
			);

		const getAllBudgetSyncAccounts = () =>
			Effect.gen(function* () {
				const { data } = yield* db.use(async (client) => {
					return client.entities.budgetSyncAccount.scan.go({ pages: "all" });
				});

				return data;
			}).pipe(
				Effect.withSpan(
					"budget_sync_electrodb.get_all_budget_sync_accounts",
					{},
				),
			);

		const createSyncedTransaction = (
			transaction: SyncedTransactionEntity.New,
		): Effect.Effect<SyncedTransactionEntity.Entity, ElectroDbError> =>
			Effect.gen(function* () {
				const { data } = yield* db.use((client) => {
					return client.entities.syncedTransaction.create(transaction).go();
				});

				return data;
			}).pipe(
				Effect.retry(Retry.exponentialBackoffPolicy),
				Effect.withSpan("budget_sync_electrodb.create_synced_transaction", {
					attributes: {
						transaction: transaction,
						"budget_sync.account.id": transaction.budgetSyncAccountId,
						"splitwise.expense.id": transaction.splitwiseExpenseId,
						"ynab.transaction.id": transaction.ynabTransactionId,
					},
				}),
			);

		const getSyncedTransactionBySplitwiseExpenseId = (
			splitwiseExpenseId: number,
			options: GetSyncedTransactionBySplitwiseExpenseIdOptions,
		) =>
			Effect.gen(function* () {
				const { data } = yield* db.use(async (client) => {
					return client.entities.syncedTransaction.query
						.bySplitwiseExpenseId({
							splitwiseExpenseId,
						})
						.where(
							({ budgetSyncAccountId }, { eq }) =>
								`${eq(budgetSyncAccountId, options.budgetSyncAccountId)}`,
						)
						.go();
				});

				if (data.length > 1) {
					return yield* new DuplicateSyncedTransactionError({
						budgetSyncAccountId: options.budgetSyncAccountId,
						splitwiseExpenseId,
					});
				}

				const maybeSyncedTransaction = Option.fromNullable(data.at(0));

				return maybeSyncedTransaction;
			}).pipe(
				Effect.retry(Retry.exponentialBackoffPolicy),
				Effect.withSpan(
					"budget_sync_electrodb.get_synced_transaction_by_splitwise_expense_id",
					{
						attributes: {
							"splitwise.expense.id": splitwiseExpenseId,
							"budget_sync.account.id": options.budgetSyncAccountId,
						},
					},
				),
			);

		const deleteSyncedTransaction = (options: DeleteSyncedTransactionOptions) =>
			db
				.use(async (client) => {
					return client.entities.syncedTransaction
						.delete({
							budgetSyncAccountId: options.budgetSyncAccountId,
							createdAtIsoFullDate: formatDateIsoFullDate(options.createdAt),
							splitwiseExpenseId: options.splitwiseExpenseId,
						})
						.go({ response: "none" });
				})
				.pipe(
					Effect.retry(Retry.exponentialBackoffPolicy),
					Effect.withSpan("budget_sync_electrodb.delete_synced_transaction", {
						attributes: {
							"budget_sync.account.id": options.budgetSyncAccountId,
							"synced_transaction.budget_sync_account_id":
								options.budgetSyncAccountId,
							"synced_transaction.create_at_sk": formatDateIsoFullDate(
								options.createdAt,
							),
						},
					}),
				);

		const softDeleteSyncedTransaction = (
			syncedTransaction: SyncedTransactionEntity.Entity,
		) =>
			db
				.use(async (client) => {
					const { data } = await client.entities.syncedTransaction
						.patch({
							budgetSyncAccountId: syncedTransaction.budgetSyncAccountId,
							createdAtIsoFullDate: formatDateIsoFullDate(
								syncedTransaction.createdAt,
							),
							splitwiseExpenseId: syncedTransaction.splitwiseExpenseId,
						})
						.set({ deletedAt: new Date() })
						.go({ response: "all_new" });

					return data;
				})
				.pipe(
					Effect.retry(Retry.exponentialBackoffPolicy),
					Effect.withSpan(
						"budget_sync_electrodb.soft_delete_synced_transaction",
						{
							attributes: {
								"budget_sync.account.id": syncedTransaction.budgetSyncAccountId,
								"synced_transaction.splitwise_expense_id":
									syncedTransaction.splitwiseExpenseId,
								"synced_transaction.budget_sync_account_id":
									syncedTransaction.budgetSyncAccountId,
								"synced_transaction.type": syncedTransaction.type,
								"synced_transaction.create_at_sk": formatDateIsoFullDate(
									syncedTransaction.createdAt,
								),
							},
						},
					),
				);
		const updateSyncedTransactionBySplitwiseExpenseId = (
			splitwiseExpenseId: number,
			options: UpdateSyncedTransactionOptions,
		) =>
			Effect.gen(function* () {
				const currentSyncedTransaction =
					yield* getSyncedTransactionBySplitwiseExpenseId(
						splitwiseExpenseId,
						options,
					).pipe(
						Effect.flatten,
						Effect.catchTag(
							"NoSuchElementException",
							() =>
								new SyncedTransactionNotFound({
									splitwiseExpenseId,
									ynabTransactionId: options.ynabTransactionId,
									budgetSyncAccountId: options.budgetSyncAccountId,
								}),
						),
					);

				// If 'type' changes we need to create a new expense and delete the old
				// one b/c 'type' is part of the ExpenseEntity sk
				if (options.type !== currentSyncedTransaction.type) {
					const updatedExpenseEntity = yield* createSyncedTransaction({
						...Struct.omit(currentSyncedTransaction, "updatedAt"),
						...options,
					}).pipe(Effect.retry(Retry.exponentialBackoffPolicy));

					yield* deleteSyncedTransaction({
						budgetSyncAccountId: options.budgetSyncAccountId,
						splitwiseExpenseId: currentSyncedTransaction.splitwiseExpenseId,
						createdAt: currentSyncedTransaction.createdAt,
					}).pipe(
						Effect.retry(Retry.exponentialBackoffPolicy),
						Effect.tapError((cause) => {
							return Effect.gen(function* () {
								yield* Effect.logError(
									// biome-ignore lint/style/useTemplate: linebreak
									`Failed to update synced transaction with splitwise expense id '${splitwiseExpenseId}' while ` +
										"deleting the previous record. Attempting to rollback.",
									{ cause },
								);

								yield* deleteSyncedTransaction({
									budgetSyncAccountId: options.budgetSyncAccountId,
									splitwiseExpenseId:
										currentSyncedTransaction.splitwiseExpenseId,
									createdAt: updatedExpenseEntity.createdAt,
								}).pipe(Effect.retry(Retry.exponentialBackoffPolicy));

								return yield* Effect.fail(cause);
							}).pipe(
								Effect.withSpan(
									"budget_sync_electrodb.update_synced_transaction_by_splitwise_expense_id.rollback",
									{
										attributes: {
											"budget_sync.account.id": options.budgetSyncAccountId,
											"splitwise.expense.id": splitwiseExpenseId,
											"ynab.transaction.id": options.ynabTransactionId,
										},
									},
								),
							);
						}),
					);

					return updatedExpenseEntity;
				}

				const { data } = yield* db.use(async (client) => {
					return client.entities.syncedTransaction
						.patch({
							budgetSyncAccountId: options.budgetSyncAccountId,
							createdAtIsoFullDate: formatDateIsoFullDate(
								currentSyncedTransaction.createdAt,
							),
							splitwiseExpenseId: currentSyncedTransaction.splitwiseExpenseId,
						})
						.set(Struct.omit(options, "budgetSyncAccountId", "type"))
						.go({ response: "all_new" });
				});

				return data;
			}).pipe(
				Effect.retry(Retry.exponentialBackoffPolicy),
				Effect.withSpan(
					"budget_sync_electrodb.update_synced_transaction_by_splitwise_expense_id",
					{
						attributes: {
							"budget_sync.account.id": options.budgetSyncAccountId,
							"splitwise.expense.id": splitwiseExpenseId,
							"ynab.transaction.id": options.ynabTransactionId,
						},
					},
				),
			);

		const getSyncedTransactionsByAccountId = (budgetSyncAccountId: string) =>
			Effect.gen(function* () {
				const { data } = yield* db.use(async (client) => {
					return client.entities.syncedTransaction.query
						.byBudgetSyncAccountId({ budgetSyncAccountId })
						.go();
				});
				return data;
			}).pipe(
				Effect.retry(Retry.exponentialBackoffPolicy),
				Effect.withSpan(
					"budget_sync_electrodb.get_synced_transaction_by_account_id",
					{
						attributes: {
							"budget_sync.account.id": budgetSyncAccountId,
						},
					},
				),
			);

		const createSyncRecord = (
			budgetSyncAccountId: string,
		): Effect.Effect<SyncRecordEntity.Entity, ElectroDbError> =>
			Effect.gen(function* () {
				const { data } = yield* db.use((client) => {
					return client.entities.syncRecord
						.create({ budgetSyncAccountId })
						.go();
				});

				return data;
			}).pipe(
				Effect.retry(Retry.exponentialBackoffPolicy),
				Effect.withSpan("budget_sync_electrodb.sync.create_record", {
					attributes: {
						"budget_sync.account.id": budgetSyncAccountId,
					},
				}),
			);

		const getInProgressSyncRecordsByAccountId = (
			budgetSyncAccountId: string,
		): Effect.Effect<
			SyncRecordEntity.Entity[],
			ElectroDbError | SyncRecordInvariant
		> =>
			Effect.gen(function* () {
				const { data } = yield* db.use((client) => {
					return client.entities.syncRecord.query
						.byStatus({ budgetSyncAccountId, status: "in-progress" })
						.go({ order: "desc" });
				});

				return data;
			}).pipe(
				Effect.retry(Retry.exponentialBackoffPolicy),
				Effect.withSpan("budget_sync_electrodb.sync.create_record", {
					attributes: {
						"budget_sync.account.id": budgetSyncAccountId,
					},
				}),
			);

		const getMostRecentCompletedSyncRecordByAccountId = (
			budgetSyncAccountId: string,
		): Effect.Effect<
			Option.Option<SyncRecordEntity.Completed>,
			ElectroDbError | SyncRecordInvariant
		> =>
			Effect.gen(function* () {
				const { data } = yield* db.use((client) => {
					return client.entities.syncRecord.query
						.byStatus({ budgetSyncAccountId, status: "completed" })
						.go({ order: "desc" });
				});

				const maybeSyncRecord = Option.fromNullable(data.at(0));

				if (Option.isNone(maybeSyncRecord)) {
					return Option.none();
				}

				if (maybeSyncRecord.value.completedAt === undefined) {
					return yield* new SyncRecordInvariant({
						budgetSyncAccountId,
						message: `Sync Record's status was 'completed' but 'completedAt' was 'undefined'`,
					});
				}

				if (maybeSyncRecord.value.status !== ("completed" as const)) {
					return yield* new SyncRecordInvariant({
						budgetSyncAccountId,
						message: `Sync Record's status was '${maybeSyncRecord.value.status}' but expected 'completed'`,
					});
				}

				const record: SyncRecordEntity.Completed = {
					id: maybeSyncRecord.value.id,
					status: maybeSyncRecord.value.status,
					completedAt: maybeSyncRecord.value.completedAt,
					budgetSyncAccountId,
					createdAt: maybeSyncRecord.value.createdAt,
					updatedAt: maybeSyncRecord.value.updatedAt,
				} as const;

				return Option.some(record);
			}).pipe(
				Effect.retry(Retry.exponentialBackoffPolicy),
				Effect.withSpan("budget_sync_electrodb.sync.create_record", {
					attributes: {
						"budget_sync.account.id": budgetSyncAccountId,
					},
				}),
			);

		const getSyncRecordById = (
			syncRecordId: string,
			options: { budgetSyncAccountId: string },
		) => {
			return Effect.gen(function* () {
				const { data } = yield* db.use((client) => {
					return client.entities.syncRecord.query
						.byId({
							budgetSyncAccountId: options.budgetSyncAccountId,
							id: syncRecordId,
						})
						.go();
				});

				if (data.length > 1) {
					return yield* new DuplicateSyncRecordError({
						budgetSyncAccountId: options.budgetSyncAccountId,
						recordId: syncRecordId,
					});
				}

				return Option.fromNullable(data.at(0));
			}).pipe(
				Effect.retry(Retry.exponentialBackoffPolicy),
				Effect.withSpan("budget_sync_electrodb.sync.get_record_by_id", {
					attributes: {
						"budget_sync.account.id": options.budgetSyncAccountId,
						"sync.record.id": syncRecordId,
					},
				}),
			);
		};

		const updateSyncRecordStatusById = (
			syncRecordId: string,
			options: {
				budgetSyncAccountId: string;
				status: SyncRecordEntity.Entity["status"];
			},
		) =>
			Effect.gen(function* () {
				const syncRecord = yield* getSyncRecordById(syncRecordId, options).pipe(
					Effect.flatten,
					Effect.catchTag("NoSuchElementException", () =>
						Effect.fail(
							new SyncRecordNotFound({
								budgetSyncAccountId: options.budgetSyncAccountId,
								recordId: syncRecordId,
							}),
						),
					),
				);

				const { data } = yield* db.use((client) => {
					return client.entities.syncRecord
						.patch({
							id: syncRecordId,
							budgetSyncAccountId: syncRecord.budgetSyncAccountId,
							createdAtIsoFullDate: formatDateIsoFullDate(syncRecord.createdAt),
						})
						.set({
							status: options.status,
							completedAt:
								options.status === "completed" ? new Date() : undefined,
						})
						.composite({
							createdAtIsoString: syncRecord.createdAt.toISOString(),
							status: syncRecord.status,
						})
						.go({ response: "all_new" });
				});

				return data;
			}).pipe(
				Effect.retry(Retry.exponentialBackoffPolicy),
				Effect.withSpan("budget_sync_electrodb.sync.update_record", {
					attributes: {
						"budget_sync.account.id": options.budgetSyncAccountId,
						"sync_record.id": syncRecordId,
						"sync_record.status": options.status,
					},
				}),
			);

		return {
			createAccount,
			createSyncedTransaction,
			deleteSyncedTransaction,
			softDeleteSyncedTransaction,
			getBudgetSyncAccountById,
			getAllBudgetSyncAccounts,
			getSyncedTransactionsByAccountId,
			getSyncedTransactionBySplitwiseExpenseId,
			updateSyncedTransactionBySplitwiseExpenseId,
			sync: {
				createRecord: createSyncRecord,
				getRecordById: getSyncRecordById,
				updateRecordStatusById: updateSyncRecordStatusById,
				getMostRecentCompletedSyncRecordByAccountId,
				getInProgressSyncRecordsByAccountId,
			},
		} as const satisfies IBudgetSyncElectroDb;
	});

export const layerWithoutDependencies = Layer.effect(
	BudgetSyncElectroDb,
	createService(),
);

export const layer = layerWithoutDependencies.pipe(
	Layer.provide(ElectroDb.layer),
);

type DeleteSyncedTransactionOptions = Readonly<{
	budgetSyncAccountId: string;
	splitwiseExpenseId: number;
	createdAt: Date;
}>;

type GetSyncedTransactionBySplitwiseExpenseIdOptions = Readonly<{
	budgetSyncAccountId: string;
}>;

type UpdateSyncedTransactionOptions = Readonly<
	{
		budgetSyncAccountId: string;
		ynabTransactionId: string;
	} & Pick<SyncedTransactionEntity.Entity, "amount" | "type" | "deletedAt">
>;

export type CreateAccountOptions = Readonly<{
	splitwiseGroupId: number;
	splitwiseUserId: number;
	ynabAccountId: string;
	ynabBudgetId: string;
	ynabUncategorizedCategoryId: string;
}>;

type GetSyncRecordByIdOptions = Readonly<{
	budgetSyncAccountId: string;
}>;

type UpdateSyncRecordStatusByIdOptions = Readonly<{
	budgetSyncAccountId: string;
	status: SyncRecordEntity.Entity["status"];
}>;
