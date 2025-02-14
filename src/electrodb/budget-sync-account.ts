import {
	CustomAttributeType,
	Entity,
	type CreateEntityItem,
	type EntityRecord,
} from "electrodb";
import { formatDateSk } from "../prelude";
import { ulid } from "ulid";

export const BudgetSyncAccountEntity = new Entity({
	model: {
		entity: "budget_sync_account",
		version: "1",
		service: "budget_sync",
	},
	attributes: {
		budgetSyncAccountId: {
			type: "string",
			hidden: true,
			default: () => ulid(),
			required: true,
			readOnly: true,
		},

		id: {
			type: "string",
			watch: ["budgetSyncAccountId"],
			required: false,
			default: () => "",
			get: (_, { budgetSyncAccountId }) => budgetSyncAccountId,
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
			type: CustomAttributeType<Date>("any"),
			readOnly: true,
			default: () => new Date(),
			set: (_: unknown, { createdAt }: { createdAt: Date }) =>
				createdAt.toISOString(),
			get: (_: unknown, { createdAt }: { createdAt: string }) =>
				new Date(createdAt),
		},

		createdAtSk: {
			type: "string",
			watch: ["createdAt"],
			hidden: true,
			required: false,
			set: (_, { createdAt }: { createdAt: string }) => {
				return formatDateSk.format(new Date(createdAt));
			},
			default: () => new Date().toISOString(),
		},

		updatedAt: {
			type: CustomAttributeType<Date>("any"),
			watch: "*",
			default: () => new Date(),
			set: (_: unknown, { createdAt }: { createdAt: Date }) =>
				createdAt.toISOString(),
			get: (_: unknown, { createdAt }: { createdAt: string }) =>
				new Date(createdAt),
		},
	},

	indexes: {
		budgetSyncAccount: {
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

type BudgetSyncAccount = EntityRecord<typeof BudgetSyncAccountEntity>;
type CreateBudgetSyncAccount = CreateEntityItem<typeof BudgetSyncAccountEntity>;
declare const foo: CreateBudgetSyncAccount;
