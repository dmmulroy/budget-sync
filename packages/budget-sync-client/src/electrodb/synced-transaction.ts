import { Schema, type Types } from "effect";
import {
	type CreateEntityItem,
	CustomAttributeType,
	Entity as ElectrodbEntity,
	type EntityItem,
} from "electrodb";
import * as Currency from "../currency";
import { formatDateIsoFullDate } from "../prelude";

export namespace SyncedTransactionEntity {
	export interface Entity extends Types.Simplify<EntityItem<typeof Entity>> {}

	export const Entity = new ElectrodbEntity({
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
				type: CustomAttributeType<Currency.Milliunits>("number"),
				required: true,
			},

			type: {
				type: CustomAttributeType<"credit" | "debit">("string"),
				required: true,
			},

			isPayment: {
				type: "boolean",
				default: false,
			},

			splitwiseExpenseId: {
				type: "number",
				required: true,
			},

			ynabTransactionId: {
				type: "string",
				required: true,
			},

			relatedSyncRecordIds: {
				type: "list",
				items: {
					type: "string",
				},
				required: true,
			},

			createdAt: {
				type: CustomAttributeType<Date>("any"),
				required: true,
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

			deletedAt: {
				type: CustomAttributeType<Date | undefined>("any"),
				set: (_: unknown, { deletedAt }: { deletedAt: Date }) => {
					if (deletedAt === undefined) {
						return undefined;
					}
					return deletedAt.toISOString();
				},
				get: (_: unknown, { deletedAt }: { deletedAt: string }) => {
					if (deletedAt === undefined) {
						return undefined;
					}
					return new Date(deletedAt);
				},
			},
		},

		indexes: {
			byBudgetSyncAccountId: {
				collection: "budgetSyncAccount",
				type: "clustered",
				pk: {
					field: "pk",
					composite: ["budgetSyncAccountId"],
				},
				sk: {
					field: "sk",
					composite: ["createdAtIsoFullDate", "splitwiseExpenseId"],
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
					composite: ["createdAtIsoFullDate"],
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
					composite: ["createdAtIsoFullDate"],
				},
			},
		},
	});

	export const schema = Schema.Struct({
		budgetSyncAccountId: Schema.String,
		amount: Currency.MilliunitsSchema,
		type: Schema.Literal("credit", "debit"),
		isPayment: Schema.optional(Schema.Union(Schema.Boolean, Schema.Undefined)),
		splitwiseExpenseId: Schema.Number,
		ynabTransactionId: Schema.String,
		relatedSyncRecordIds: Schema.Array(Schema.String),
		createdAt: Schema.Date,
		updatedAt: Schema.Date,
		deletedAt: Schema.optional(Schema.Union(Schema.Date, Schema.Undefined)),
	});

	export interface New
		extends Types.Simplify<CreateEntityItem<typeof Entity>> {}
}
