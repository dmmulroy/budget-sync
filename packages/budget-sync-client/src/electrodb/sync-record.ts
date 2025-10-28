import { Hash, Schema, type Types } from "effect";
import {
	type CreateEntityItem,
	CustomAttributeType,
	Entity as ElectrodbEntity,
	type EntityItem,
} from "electrodb";
import { formatDateIsoFullDate } from "../prelude";

export namespace SyncRecordEntity {
	export interface Entity extends EntityItem<typeof Entity> {}

	export interface Completed
		extends Schema.Schema.Type<typeof completedSchema> {}

	export interface New
		extends Types.Simplify<CreateEntityItem<typeof Entity>> {}

	export const Entity = new ElectrodbEntity({
		model: {
			entity: "sync_record",
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
						budgetSyncAccountId,
						createdAt,
					}: {
						budgetSyncAccountId: string;
						createdAt: Date;
					},
				) =>
					Math.abs(
						Hash.number(
							Hash.string(budgetSyncAccountId) + Hash.hash(createdAt),
						),
					).toString(16),
				readOnly: true,
				required: true,
			},

			budgetSyncAccountId: {
				type: "string",
				required: true,
			},

			status: {
				type: CustomAttributeType<
					"ready" | "in-progress" | "error" | "completed"
				>("string"),
				default: "ready" as const,
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
				get: (_: unknown, { createdAt }: { createdAt: string }) => {
					return new Date(createdAt);
				},
			},

			createdAtIsoFullDate: {
				type: "string",
				watch: ["createdAt"],
				hidden: true,
				readOnly: true,
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

			completedAt: {
				type: CustomAttributeType<Date | undefined>("any"),
				required: false,
				set: (
					_: unknown,
					{
						status,
						completedAt,
					}: {
						status: "ready" | "in-progress" | "error" | "completed";
						completedAt: Date;
					},
				) => {
					if (completedAt === undefined && status !== "completed") {
						return "n/a";
					}

					if (completedAt === undefined && status === "completed") {
						return new Date();
					}

					return completedAt.toISOString();
				},
				get: (_: unknown, { completedAt }: { completedAt: string }) => {
					if (completedAt === undefined) {
						return undefined;
					}
					return new Date(completedAt);
				},
			},

			createdAtIsoString: {
				type: "string",
				watch: ["createdAt"],
				hidden: true,
				readOnly: true,
				required: false,
				set: (_, attrs) => {
					return attrs.createdAt;
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
					composite: ["createdAtIsoFullDate", "id"],
				},
			},

			byStatus: {
				index: "gsi1",
				pk: {
					field: "gsi1pk",
					composite: ["budgetSyncAccountId"],
				},
				sk: {
					field: "gsi1sk",
					composite: ["status", "createdAtIsoString"],
				},
			},

			byId: {
				index: "gsi2",
				pk: {
					field: "gsi2pk",
					composite: ["budgetSyncAccountId"],
				},
				sk: {
					field: "gsi2sk",
					composite: ["id"],
				},
			},
		},
	});

	export const schema = Schema.Struct({
		id: Schema.String,
		budgetSyncAccountId: Schema.String,
		status: Schema.Literal("ready", "in-progress", "error", "completed"),
		createdAt: Schema.Date,
		updatedAt: Schema.Date,
		completedAt: Schema.optional(Schema.Date),
	});

	export const decodeUnknownSync = Schema.decodeUnknownSync(schema);

	export const completedSchema = Schema.Struct({
		...schema.fields,
		status: Schema.Literal("completed"),
		completedAt: Schema.DateFromSelf,
	});

	export const decodeCompleted = Schema.decode(completedSchema);
}
