import { CustomAttributeType, Entity } from "electrodb";
import { formatDateSk } from "../prelude";

export const SyncedTransactionEntity = new Entity({
	model: {
		entity: "synced_transaction",
		version: "1",
		service: "budget_sync",
	},
	attributes: {
		budgetSyncAccountId: {
			type: "string",
			required: true,
		},

		amount: {
			type: "number",
			required: true,
		},

		description: {
			type: "string",
			required: true,
		},

		type: {
			type: CustomAttributeType<"credit" | "debit">("string"),
			required: true,
		},

		splitwiseExpenseId: {
			type: "number",
			required: true,
		},

		ynabTransactionId: {
			type: "string",
			required: true,
		},

		createdAt: {
			type: "string",
			readOnly: true,
			required: true,
			default: () => new Date().toISOString(),
			set: () => new Date().toISOString(),
		},

		createdAtSk: {
			type: "string",
			hidden: true,
			watch: ["createdAt"],
			required: true,
			readOnly: true,
			set: (_, { createdAt }) => {
				return formatDateSk(createdAt);
			},
		},

		updatedAt: {
			type: "string",
			watch: "*",
			required: true,
			default: () => new Date().toISOString(),
			set: () => new Date().toISOString(),
		},
	},

	indexes: {
		syncedTransaction: {
			collection: "transactions",
			type: "clustered",
			pk: {
				field: "pk",
				composite: ["budgetSyncAccountId"],
			},
			sk: {
				field: "sk",
				composite: ["type", "createdAtSk"],
			},
		},

		bySplitwiseExpenseId: {
			index: "gsi1",
			pk: {
				field: "gsi1pk",
				composite: ["splitwiseExpenseId"],
			},
			sk: {
				field: "gsi1sk",
				composite: ["type", "createdAtSk"],
			},
		},

		byYnabTransactionId: {
			index: "gsi2",
			pk: {
				field: "gsi2pk",
				composite: ["ynabTransactionId"],
			},
			sk: {
				field: "gsi2sk",
				composite: ["type", "createdAtSk"],
			},
		},
	},
});
