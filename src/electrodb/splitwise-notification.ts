import { CustomAttributeType, Entity } from "electrodb";
import { formatDateSk } from "../prelude";
import type { ExpenseNotificationType } from "../splitwise/schemas";

export const SplitwiseNotificationEntity = new Entity({
	model: {
		entity: "splitwise_notification",
		version: "1",
		service: "budget_sync",
	},
	attributes: {
		budgetSyncAccountId: {
			type: "string",
			required: true,
		},

		type: {
			type: CustomAttributeType<ExpenseNotificationType>("string"),
			required: true,
		},

		status: {
			type: CustomAttributeType<"new" | "locked" | "completed" | "error">(
				"string",
			),
			required: true,
		},

		expenseId: {
			type: "number",
			required: true,
		},

		createdByUserId: {
			type: "number",
			required: true,
		},

		content: {
			type: "string",
		},

		groupId: {
			type: "number",
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
		splitwiseExpense: {
			collection: "budgetSyncAccount",
			type: "clustered",
			pk: {
				field: "pk",
				composite: ["budgetSyncAccountId"],
			},
			sk: {
				field: "sk",
				composite: ["groupId", "createdAtSk"],
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
				composite: ["createdAtSk"],
			},
		},
	},
});
