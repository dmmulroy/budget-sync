import { Entity } from "electrodb";
import { formatDateSk } from "../prelude";

export const BudgetSyncAccountEntity = new Entity({
	model: {
		entity: "budget_sync_account",
		version: "1",
		service: "budget_sync",
	},
	attributes: {
		// TODO Brand
		id: {
			type: "string",
			required: true,
		},

		budgetSyncAccountId: {
			type: "string",
			watch: ["id"],
			hidden: true,
			get: (_, { id }) => id,
			set: () => undefined,
		},

		splitwiseGroupId: {
			type: "number",
			required: true,
		},

		splitwiseUserId: {
			type: "number",
			required: true,
		},

		ynabBudgetId: {
			type: "string",
			required: true,
		},

		ynabAccountId: {
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
		budgetSyncAccount: {
			pk: {
				field: "pk",
				composite: ["id"],
			},
			sk: {
				field: "sk",
				composite: [],
			},
		},

		byBudgetSyncAccountId: {
			index: "gsi1",
			collection: "budgetSyncAccount",
			type: "clustered",
			pk: {
				field: "pk",
				composite: ["budgetSyncAccountId"],
			},
			sk: {
				field: "sk",
				composite: [],
			},
		},
	},
});
