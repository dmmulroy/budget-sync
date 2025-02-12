import { Option, ParseResult, Record, Schema } from "effect";
import { encode } from "effect/ParseResult";

const UserApiSchema = Schema.Struct({
	id: Schema.Number,
	first_name: Schema.String,
	last_name: Schema.NullOr(Schema.String),
	email: Schema.String,
	registration_status: Schema.Literal("confirmed", "dummy", "invited"),
	picture: Schema.Struct({
		small: Schema.String,
		medium: Schema.String,
		large: Schema.String,
	}),
	custom_picture: Schema.Boolean,
}).pipe(
	Schema.rename({
		first_name: "firstName",
		last_name: "lastName",
		registration_status: "registrationStatus",
		custom_picture: "customPicture",
	}),
);

export type User = typeof UserSchema.Type;
export class UserSchema extends UserApiSchema {
	static decodeToType = Schema.decodeUnknown(UserApiSchema);
	static schema = UserApiSchema;
	static typeSchema = Schema.typeSchema(UserApiSchema);
}

const CurrentUserApiSchema = Schema.extend(
	UserApiSchema,
	Schema.Struct({
		notifications_read: Schema.DateFromString,
		notifications_count: Schema.Number,
		notifications: Schema.Record({
			key: Schema.String,
			value: Schema.Boolean,
		}),
		default_currency: Schema.String,
		locale: Schema.String,
	}).pipe(
		Schema.rename({
			notifications_read: "notificationsRead",
			notifications_count: "notificationsCount",
			default_currency: "defaultCurrency",
		}),
	),
);

export type CurrentUser = typeof CurrentUserSchema.Type;
export class CurrentUserSchema extends CurrentUserApiSchema {
	static decodeToType = Schema.decodeUnknown(CurrentUserApiSchema);
	static schema = CurrentUserApiSchema;
	static typeSchema = CurrentUserApiSchema;
}

const CommentUserApiSchema = Schema.Struct({
	id: Schema.Number,
	first_name: Schema.String,
	last_name: Schema.NullOr(Schema.String),
	picture: Schema.Struct({
		small: Schema.optional(Schema.NullOr(Schema.String)),
		medium: Schema.optional(Schema.NullOr(Schema.String)),
		large: Schema.optional(Schema.NullOr(Schema.String)),
	}),
	custom_picture: Schema.optional(Schema.Boolean),
}).pipe(
	Schema.rename({
		first_name: "firstName",
		last_name: "lastName",
	}),
);

export type CommentUser = typeof CommentUserApiSchema.Type;

export class CommentUserSchema extends CommentUserApiSchema {
	static decodeToType = Schema.decodeUnknown(CommentUserApiSchema);
	static schema = CommentUserApiSchema;
	static typeSchema = Schema.typeSchema(CommentUserApiSchema);
}

const ShareApiSchema = Schema.Struct({
	user: Schema.NullOr(CommentUserApiSchema),
	user_id: Schema.Number,
	paid_share: Schema.String,
	owed_share: Schema.String,
	net_balance: Schema.String,
}).pipe(
	Schema.rename({
		user_id: "userId",
		paid_share: "paidShare",
		owed_share: "owedShare",
		net_balance: "netBalance",
	}),
);

export type Share = typeof ShareApiSchema.Type;

export class ShareSchema extends ShareApiSchema {
	static decodeToType = Schema.decodeUnknown(ShareApiSchema);
	static schema = ShareApiSchema;
	static typeSchema = Schema.typeSchema(ShareApiSchema);
}

const RepaymentApiSchema = Schema.Struct({
	from: Schema.Number,
	to: Schema.Number,
	amount: Schema.String,
}).pipe(
	Schema.rename({
		from: "from",
		to: "to",
		amount: "amount",
	}),
);

export type Repayment = typeof RepaymentApiSchema.Type;

export class RepaymentSchema extends RepaymentApiSchema {
	static decodeToType = Schema.decodeUnknown(RepaymentApiSchema);
	static schema = RepaymentApiSchema;
	static typeSchema = Schema.typeSchema(RepaymentApiSchema);
}

const ReceiptApiSchema = Schema.Struct({
	large: Schema.NullOr(Schema.String),
	original: Schema.NullOr(Schema.String),
}).pipe(
	Schema.rename({
		large: "large",
		original: "original",
	}),
);

export type Receipt = typeof ReceiptApiSchema.Type;

export class ReceiptSchema extends ReceiptApiSchema {
	static decodeToType = Schema.decodeUnknown(ReceiptApiSchema);
	static schema = ReceiptApiSchema;
	static typeSchema = Schema.typeSchema(ReceiptApiSchema);
}

const CategoryApiSchema = Schema.Struct({
	id: Schema.Number,
	name: Schema.String,
}).pipe(
	Schema.rename({
		id: "id",
		name: "name",
	}),
);

export type Category = typeof CategoryApiSchema.Type;

export class CategorySchema extends CategoryApiSchema {
	static decodeToType = Schema.decodeUnknown(CategoryApiSchema);
	static schema = CategoryApiSchema;
	static typeSchema = Schema.typeSchema(CategoryApiSchema);
}

const CommentApiSchema = Schema.Struct({
	id: Schema.Number,
	content: Schema.String,
	comment_type: Schema.Literal("System", "User"),
	relation_type: Schema.Literal("ExpenseComment"),
	relation_id: Schema.Number,
	created_at: Schema.String, // ISO date-time string
	deleted_at: Schema.NullOr(Schema.String), // ISO date-time string or null
	user: Schema.NullOr(CommentUserApiSchema),
}).pipe(
	Schema.rename({
		comment_type: "commentType",
		relation_type: "relationType",
		relation_id: "relationId",
		created_at: "createdAt",
		deleted_at: "deletedAt",
	}),
);

export type Comment = typeof CommentApiSchema.Type;

export class CommentSchema extends CommentApiSchema {
	static decodeToType = Schema.decodeUnknown(CommentApiSchema);
	static schema = CommentApiSchema;
	static typeSchema = Schema.typeSchema(CommentApiSchema);
}

const ExpenseApiSchema = Schema.Struct({
	cost: Schema.String, // Decimal as string, 2 decimal places
	description: Schema.String,
	details: Schema.NullOr(Schema.String),
	date: Schema.String, // ISO date-time string
	repeat_interval: Schema.NullOr(
		Schema.Literal("never", "weekly", "fortnightly", "monthly", "yearly"),
	),
	currency_code: Schema.String,
	// TODO: Email Splitwise support that there types are wrong
	category_id: Schema.optional(Schema.Number),
	id: Schema.Number,
	group_id: Schema.NullOr(Schema.Number),
	friendship_id: Schema.optional(Schema.NullOr(Schema.Number)),
	expense_bundle_id: Schema.NullOr(Schema.Number),
	repeats: Schema.Boolean,
	email_reminder: Schema.Boolean,
	email_reminder_in_advance: Schema.NullOr(
		Schema.Literal(-1, 0, 1, 2, 3, 4, 5, 6, 7, 14),
	),
	next_repeat: Schema.NullOr(Schema.String), // ISO date-time string or null
	comments_count: Schema.Number,
	payment: Schema.Boolean,
	transaction_confirmed: Schema.Boolean,
	repayments: Schema.Array(RepaymentApiSchema),
	created_at: Schema.String, // ISO date-time string
	created_by: Schema.NullOr(CommentUserApiSchema),
	updated_at: Schema.String, // ISO date-time string
	updated_by: Schema.NullOr(CommentUserApiSchema),
	deleted_at: Schema.NullOr(Schema.String), // ISO date-time string or null
	deleted_by: Schema.NullOr(CommentUserApiSchema),
	category: Schema.NullOr(CategoryApiSchema),
	receipt: Schema.NullOr(ReceiptApiSchema),
	users: Schema.Array(ShareApiSchema),
	comments: Schema.Array(CommentApiSchema),
}).pipe(
	Schema.rename({
		cost: "cost",
		description: "description",
		details: "details",
		date: "date",
		repeat_interval: "repeatInterval",
		currency_code: "currencyCode",
		category_id: "categoryId",
		id: "id",
		group_id: "groupId",
		friendship_id: "friendshipId",
		expense_bundle_id: "expenseBundleId",
		repeats: "repeats",
		email_reminder: "emailReminder",
		email_reminder_in_advance: "emailReminderInAdvance",
		next_repeat: "nextRepeat",
		comments_count: "commentsCount",
		payment: "payment",
		transaction_confirmed: "transactionConfirmed",
		repayments: "repayments",
		created_at: "createdAt",
		created_by: "createdBy",
		updated_at: "updatedAt",
		updated_by: "updatedBy",
		deleted_at: "deletedAt",
		deleted_by: "deletedBy",
		category: "category",
		receipt: "receipt",
		users: "users",
		comments: "comments",
	}),
);

export type Expense = typeof ExpenseSchema.Type;

export class ExpenseSchema extends ExpenseApiSchema {
	static decodeToType = Schema.decodeUnknown(ExpenseApiSchema);
	static decodeToTypeArray = Schema.decodeUnknown(
		Schema.Array(ExpenseApiSchema),
	);
	static schema = ExpenseApiSchema;
	static typeSchema = Schema.typeSchema(ExpenseApiSchema);
}

const SourceApiSchema = Schema.NullOr(
	Schema.Struct({
		type: Schema.String,
		id: Schema.Number,
		url: Schema.optional(Schema.NullOr(Schema.String)),
	}),
);

export type Source = typeof SourceApiSchema.Type;

export class SourceSchema extends SourceApiSchema {
	static decodeToType = Schema.decodeUnknown(SourceApiSchema);
	static schema = SourceApiSchema;
	static typeSchema = Schema.typeSchema(SourceApiSchema);
}

const NotificationApiSchema = Schema.Struct({
	id: Schema.Number,
	type: Schema.Number,
	created_at: Schema.String, // ISO date-time string
	created_by: Schema.Number,
	source: SourceApiSchema, // Object or null
	image_url: Schema.String,
	image_shape: Schema.Literal("square", "circle"),
	content: Schema.String,
}).pipe(
	Schema.rename({
		created_at: "createdAt",
		created_by: "createdBy",
		image_url: "imageUrl",
		image_shape: "imageShape",
	}),
);

export type Notification = typeof NotificationApiSchema.Type;

export class NotificationSchema extends NotificationApiSchema {
	static decodeToType = Schema.decodeUnknown(NotificationApiSchema);
	static decodeToTypeArray = Schema.decodeUnknown(
		Schema.Array(NotificationApiSchema),
	);
	static schema = NotificationApiSchema;
	static typeSchema = Schema.typeSchema(NotificationApiSchema);
}

const CoverPhotoApiSchema = Schema.Struct({
	small: Schema.String,
	medium: Schema.String,
	large: Schema.String,
}).pipe(
	Schema.rename({
		small: "small",
		medium: "medium",
		large: "large",
	}),
);

export type CoverPhoto = typeof CoverPhotoApiSchema.Type;

export class CoverPhotoSchema extends CoverPhotoApiSchema {
	static decodeToType = Schema.decodeUnknown(CoverPhotoApiSchema);
	static schema = CoverPhotoApiSchema;
	static typeSchema = Schema.typeSchema(CoverPhotoApiSchema);
}

const DebtApiSchema = Schema.Struct({
	id: Schema.Number,
	from_user_id: Schema.Number,
	to_user_id: Schema.Number,
	amount: Schema.String, // Decimal as string, 2 decimal places
	status: Schema.String,
	created_at: Schema.String, // ISO date-time string
}).pipe(
	Schema.rename({
		from_user_id: "fromUserId",
		to_user_id: "toUserId",
		created_at: "createdAt",
	}),
);

export type Debt = typeof DebtApiSchema.Type;

export class DebtSchema extends DebtApiSchema {
	static decodeToType = Schema.decodeUnknown(DebtApiSchema);
	static schema = DebtApiSchema;
	static typeSchema = Schema.typeSchema(DebtApiSchema);
}
const AvatarApiSchema = Schema.Struct({
	small: Schema.String,
	medium: Schema.String,
	large: Schema.String,
}).pipe(
	Schema.rename({
		small: "small",
		medium: "medium",
		large: "large",
	}),
);

export type Avatar = typeof AvatarApiSchema.Type;

export class AvatarSchema extends AvatarApiSchema {
	static decodeToType = Schema.decodeUnknown(AvatarApiSchema);
	static schema = AvatarApiSchema;
	static typeSchema = Schema.typeSchema(AvatarApiSchema);
}
const MemberApiSchema = Schema.Struct({
	id: Schema.Number,
	user_id: Schema.Number,
	role: Schema.String,
	joined_at: Schema.String, // ISO date-time string
}).pipe(
	Schema.rename({
		user_id: "userId",
		joined_at: "joinedAt",
	}),
);

export type Member = typeof MemberApiSchema.Type;

export class MemberSchema extends MemberApiSchema {
	static decodeToType = Schema.decodeUnknown(MemberApiSchema);
	static schema = MemberApiSchema;
	static typeSchema = Schema.typeSchema(MemberApiSchema);
}

const GroupApiSchema = Schema.Struct({
	id: Schema.Number,
	name: Schema.String,
	group_type: Schema.Literal(
		"home",
		"trip",
		"couple",
		"other",
		"apartment",
		"house",
	),
	updated_at: Schema.String, // ISO date-time string
	simplify_by_default: Schema.Boolean,
	members: Schema.Array(MemberApiSchema),
	original_debts: Schema.Array(DebtApiSchema),
	simplified_debts: Schema.Array(DebtApiSchema),
	avatar: AvatarApiSchema,
	custom_avatar: Schema.Boolean,
	cover_photo: CoverPhotoApiSchema,
	invite_link: Schema.String, // A link the user can send to a friend to join the group directly
}).pipe(
	Schema.rename({
		group_type: "groupType",
		updated_at: "updatedAt",
		simplify_by_default: "simplifyByDefault",
		original_debts: "originalDebts",
		simplified_debts: "simplifiedDebts",
		custom_avatar: "customAvatar",
		cover_photo: "coverPhoto",
		invite_link: "inviteLink",
	}),
);

export type Group = typeof GroupApiSchema.Type;

export class GroupSchema extends GroupApiSchema {
	static decodeToType = Schema.decodeUnknown(GroupApiSchema);
	static schema = GroupApiSchema;
	static typeSchema = Schema.typeSchema(GroupApiSchema);
}

//Type	Meaning
//0	Expense added
//1	Expense updated
//2	Expense deleted
//3	Comment added
//4	Added to group
//5	Removed from group
//6	Group deleted
//7	Group settings changed
//8	Added as friend
//9	Removed as friend
//10	News (a URL should be included)
//11	Debt simplification
//12	Group undeleted
//13	Expense undeleted
//14	Group currency conversion
//15	Friend currency conversion

const ExpenseNotificationTypeSchema = Schema.Literal(
	"expense_added",
	"expense_deleted",
	"expense_undeleted",
	"expense_updated",
);

export type ExpenseNotificationType = typeof ExpenseNotificationTypeSchema.Type;

const NotificationTypeSchema = Schema.Literal(
	...ExpenseNotificationTypeSchema.literals,
	"added_as_friend",
	"added_to_group",
	"comment_added",
	"debt_simplification",
	"friend_currency_conversion",
	"group_currency_conversion",
	"group_deleted",
	"group_settings_changed",
	"group_undeleted",
	"news",
	"removed_as_friend",
	"removed_from_group",
);

type NotificationType = typeof NotificationTypeSchema.Type;

const notificationTypeMap: Record<number, NotificationType> = {
	0: "expense_added",
	1: "expense_updated",
	2: "expense_deleted",
	3: "comment_added",
	4: "added_to_group",
	5: "removed_from_group",
	6: "group_deleted",
	7: "group_settings_changed",
	8: "added_as_friend",
	9: "removed_as_friend",
	10: "news",
	11: "debt_simplification",
	12: "group_undeleted",
	13: "expense_undeleted",
	14: "group_currency_conversion",
	15: "friend_currency_conversion",
};

const notificationCodeMap: Record<NotificationType, number> = {
	expense_added: 0,
	expense_updated: 1,
	expense_deleted: 2,
	comment_added: 3,
	added_to_group: 4,
	removed_from_group: 5,
	group_deleted: 6,
	group_settings_changed: 7,
	added_as_friend: 8,
	removed_as_friend: 9,
	news: 10,
	debt_simplification: 11,
	group_undeleted: 12,
	expense_undeleted: 13,
	group_currency_conversion: 14,
	friend_currency_conversion: 15,
};

const NotificationTypeFromNumberSchema = Schema.transformOrFail(
	Schema.Number,
	NotificationTypeSchema,
	{
		strict: true,
		decode(num: number, _, ast) {
			const maybeNotificationType = Option.fromNullable(
				notificationTypeMap[num],
			);

			if (Option.isNone(maybeNotificationType)) {
				return ParseResult.fail(
					new ParseResult.Type(
						ast,
						num,
						`'${num}' is not a valid notification type`,
					),
				);
			}

			return ParseResult.succeed(maybeNotificationType.value);
		},
		encode(notificationType) {
			return ParseResult.succeed(notificationCodeMap[notificationType]);
		},
	},
);

export const NotificationTypeFromNumber = {
	schema: NotificationTypeFromNumberSchema,
	decode: Schema.decode(NotificationTypeFromNumberSchema),
	encode: Schema.encode(NotificationTypeFromNumberSchema),
} as const;
