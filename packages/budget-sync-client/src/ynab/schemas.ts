import { Schema } from "effect";
import {
	TransactionClearedStatus,
	TransactionDetailDebtTransactionTypeEnum,
	TransactionFlagColor,
} from "ynab";
import * as Currency from "../currency";

const SubTransactionSchema = Schema.Struct({
	/**
	 *
	 * @type {string}
	 * @memberof SubTransaction
	 */
	id: Schema.String,
	/**
	 *
	 * @type {string}
	 * @memberof SubTransaction
	 */
	transaction_id: Schema.String,
	/**
	 * The subtransaction amount in milliunits format
	 * @type {number}
	 * @memberof SubTransaction
	 */
	amount: Currency.MilliunitsSchema,
	/**
	 *
	 * @type {string}
	 * @memberof SubTransaction
	 */
	memo: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	/**
	 *
	 * @type {string}
	 * @memberof SubTransaction
	 */
	payee_id: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	/**
	 *
	 * @type {string}
	 * @memberof SubTransaction
	 */
	payee_name: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	/**
	 *
	 * @type {string}
	 * @memberof SubTransaction
	 */
	category_id: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	/**
	 *
	 * @type {string}
	 * @memberof SubTransaction
	 */
	category_name: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
	/**
	 * If a transfer, the account_id which the subtransaction transfers to
	 * @type {string}
	 * @memberof SubTransaction
	 */
	transfer_account_id: Schema.optional(
		Schema.Union(Schema.String, Schema.Null),
	),
	/**
	 * If a transfer, the id of transaction on the other side of the transfer
	 * @type {string}
	 * @memberof SubTransaction
	 */
	transfer_transaction_id: Schema.optional(
		Schema.Union(Schema.String, Schema.Null),
	),
	/**
	 * Whether or not the subtransaction has been deleted.  Deleted subtransactions will only be included in delta requests.
	 * @type {boolean}
	 * @memberof SubTransaction
	 */
	deleted: Schema.Boolean,
});

export type TransactionDetail = typeof TransactionDetail.schema.Type;
export namespace TransactionDetail {
	export const schema = Schema.Struct({
		/**
		 *
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		id: Schema.String,
		/**
		 * The transaction date in ISO format (e.g. 2016-12-01)
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		date: Schema.String,
		/**
		 * The transaction amount in milliunits format
		 * @type {number}
		 * @memberof TransactionDetail
		 */
		amount: Currency.MilliunitsSchema,
		/**
		 *
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		memo: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
		/**
		 *
		 * @type {TransactionClearedStatus}
		 * @memberof TransactionDetail
		 */
		cleared: Schema.Enums(TransactionClearedStatus),
		/**
		 * Whether or not the transaction is approved
		 * @type {boolean}
		 * @memberof TransactionDetail
		 */
		approved: Schema.Boolean,
		/**
		 *
		 * @type {TransactionFlagColor}
		 * @memberof TransactionDetail
		 */
		flag_color: Schema.optional(
			Schema.Union(Schema.Enums(TransactionFlagColor), Schema.Null),
		),
		/**
		 * The customized name of a transaction flag
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		flag_name: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
		/**
		 *
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		account_id: Schema.String,
		/**
		 *
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		payee_id: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
		/**
		 *
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		category_id: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
		/**
		 * If a transfer transaction, the account to which it transfers
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		transfer_account_id: Schema.optional(
			Schema.Union(Schema.String, Schema.Null),
		),
		/**
		 * If a transfer transaction, the id of transaction on the other side of the transfer
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		transfer_transaction_id: Schema.optional(
			Schema.Union(Schema.String, Schema.Null),
		),
		/**
		 * If transaction is matched, the id of the matched transaction
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		matched_transaction_id: Schema.optional(
			Schema.Union(Schema.String, Schema.Null),
		),
		/**
		 * If the transaction was imported, this field is a unique (by account) import identifier.  If this transaction was imported through File Based Import or Direct Import and not through the API, the import_id will have the format: 'YNAB:[milliunit_amount]:[iso_date]:[occurrence]'.  For example, a transaction dated 2015-12-30 in the amount of -$294.23 USD would have an import_id of 'YNAB:-294230:2015-12-30:1'.  If a second transaction on the same account was imported and had the same date and same amount, its import_id would be 'YNAB:-294230:2015-12-30:2'.
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		import_id: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
		/**
		 * If the transaction was imported, the payee name that was used when importing and before applying any payee rename rules
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		import_payee_name: Schema.optional(
			Schema.Union(Schema.String, Schema.Null),
		),
		/**
		 * If the transaction was imported, the original payee name as it appeared on the statement
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		import_payee_name_original: Schema.optional(
			Schema.Union(Schema.String, Schema.Null),
		),
		/**
		 * If the transaction is a debt/loan account transaction, the type of transaction
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		debt_transaction_type: Schema.optional(
			Schema.Union(
				Schema.Enums(TransactionDetailDebtTransactionTypeEnum),
				Schema.Null,
			),
		),
		/**
		 * Whether or not the transaction has been deleted.  Deleted transactions will only be included in delta requests.
		 * @type {boolean}
		 * @memberof TransactionDetail
		 */
		deleted: Schema.Boolean,
		/**
		 *
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		account_name: Schema.String,
		/**
		 *
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		payee_name: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
		/**
		 * The name of the category.  If a split transaction, this will be 'Split'.
		 * @type {string}
		 * @memberof TransactionDetail
		 */
		category_name: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
		/**
		 * If a split transaction, the subtransactions.
		 * @type {Array<SubTransaction>}
		 * @memberof TransactionDetail
		 */
		subtransactions: Schema.Array(SubTransactionSchema),
	});

	export const decodeArrayUnknownSync = Schema.decodeUnknownSync(
		Schema.Array(schema),
	);
	export const decodeUnknownSync = Schema.decodeUnknownSync(schema);
	export const decodeSync = Schema.decodeSync(schema);
}
