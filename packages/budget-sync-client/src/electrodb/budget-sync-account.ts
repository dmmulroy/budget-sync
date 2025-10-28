import { Hash, type Types } from "effect";
import {
	type CreateEntityItem,
	CustomAttributeType,
	Entity,
	type EntityItem,
} from "electrodb";
import { formatDateIsoFullDate } from "../prelude";

export type BudgetSyncAccountEntity = Types.Simplify<
	EntityItem<typeof BudgetSyncAccountEntity>
>;
export const BudgetSyncAccountEntity = new Entity({
	model: {
		entity: "budget_sync_account",
		version: "1",
		service: "budget_sync",
	},
	attributes: {
		id: {
			type: "string",
			default: () => "should-never-happen",
			set: (
				_,
				{
					email,
					splitwiseGroupId,
					splitwiseUserId,
				}: { email: string; splitwiseGroupId: number; splitwiseUserId: number },
			) =>
				Math.abs(
					Hash.number(
						Hash.string(email) +
							Hash.number(splitwiseGroupId) +
							Hash.number(splitwiseUserId),
					),
				).toString(16),
			readOnly: true,
			required: true,
		},

		budgetSyncAccountId: {
			type: "string",
			watch: ["id"],
			hidden: true,
			default: () => "should-never-happen",
			get: (id) => id,
			set: (_, { id }) => id,
			required: true,
			readOnly: true,
		},

		email: {
			type: "string",
			required: true,
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

		ynabUncategorizedCategoryId: {
			type: "string",
			required: true,
		},

		createdAt: {
			type: CustomAttributeType<Date>("any"),
			readOnly: true,
			default: () => new Date(),
			set: (_: unknown, { createdAt }: { createdAt: Date }) => {
				return createdAt.toISOString();
			},
			get: (_: unknown, { createdAt }: { createdAt: string }) =>
				new Date(createdAt),
		},

		createdAtIsoFullDate: {
			type: "string",
			watch: ["createdAt"],
			hidden: true,
			required: false,
			set: (_, { createdAt }: { createdAt: string }) => {
				return formatDateIsoFullDate(new Date(createdAt));
			},
			default: () => new Date().toISOString(),
		},

		updatedAt: {
			type: CustomAttributeType<Date>("any"),
			watch: "*",
			required: true,
			readOnly: true,
			default: () => new Date(),
			set: (_: unknown, { updatedAt }: { updatedAt: Date }) => {
				if (updatedAt === undefined) {
					return new Date().toISOString();
				}
				return updatedAt.toISOString();
			},
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

		byEmail: {
			index: "gs1",
			pk: {
				field: "gsi1pk",
				composite: ["email"],
			},
			sk: {
				field: "gsi1sk",
				composite: ["splitwiseGroupId"],
			},
		},
	},
});

export declare namespace BudgetSyncAccountEntity {
	export interface Entity
		extends Types.Simplify<EntityItem<typeof BudgetSyncAccountEntity>> {}

	export interface New
		extends Types.Simplify<CreateEntityItem<typeof BudgetSyncAccountEntity>> {}
}
