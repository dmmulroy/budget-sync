import { CustomAttributeType, Entity } from "electrodb";
import { formatDateSk } from "../prelude";

export const YnabTransactionEntity = new Entity({
	model: {
		entity: "ynab_transaction",
		version: "1",
		service: "budget_sync",
	},
	attributes: {
		budgetSyncAccountId: {
			type: "string",
			required: true,
		},

		type: {
			type: CustomAttributeType<"credit" | "debit">("string"),
			required: true,
		},

		amount: {
			type: "number",
			required: true,
		},

		accountId: {
			type: "string",
			required: true,
		},

		accountName: {
			type: "string",
			required: true,
		},

		transactionId: {
			type: "string",
			required: true,
		},

		budgetId: {
			type: "string",
			required: true,
		},

		categoryId: {
			type: "string",
			required: true,
		},

		categoryName: {
			type: "string",
			required: true,
		},

		payeeId: {
			type: "string",
			required: true,
		},

		payeeName: {
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
		ynabTransaction: {
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

		byPayeeId: {
			index: "gsi1",
			pk: {
				field: "gsi1pk",
				composite: ["payeeId"],
			},
			sk: {
				field: "gsi1sk",
				composite: ["createdAtSk"],
			},
		},

		byCategoryId: {
			index: "gsi2",
			pk: {
				field: "gsi2pk",
				composite: ["categoryId"],
			},
			sk: {
				field: "gsi2sk",
				composite: ["createdAtSk"],
			},
		},
	},
});
