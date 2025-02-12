import { CustomAttributeType, Entity } from "electrodb";
import { formatDateSk } from "../prelude";

export const SplitwiseExpenseEntity = new Entity({
	model: {
		entity: "splitwise_expense",
		version: "1",
		service: "budget_sync",
	},
	attributes: {
		budgetSyncAccountId: {
			type: "string",
			required: true,
		},

		expenseId: {
			type: "number",
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

		description: {
			type: "string",
			required: true,
		},

		groupId: {
			type: "number",
			required: true,
		},

		paidByUserId: {
			type: "number",
			required: true,
		},

		paidShare: {
			type: "number",
			required: true,
		},

		owedByUserId: {
			type: "number",
			required: true,
		},

		owedShare: {
			type: "number",
			required: true,
		},

		netBalance: {
			type: "number",
			required: true,
		},

		category: {
			type: "string",
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
		splitwiseExpense: {
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

		byExpenseId: {
			index: "gs1",
			pk: {
				field: "gsi1pk",
				composite: ["expenseId"],
			},
			sk: {
				field: "gsi1sk",
				composite: ["budgetSyncAccountId"],
			},
		},

		byGroupId: {
			index: "gs2",
			pk: {
				field: "gsi2pk",
				composite: ["groupId"],
			},
			sk: {
				field: "gsi2sk",
				composite: ["createdAtSk"],
			},
		},
	},
});
