import { Option, ParseResult, type Record, Schema } from "effect";
import * as Currency from "../currency";

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
})
	.pipe(
		Schema.rename({
			first_name: "firstName",
			last_name: "lastName",
			registration_status: "registrationStatus",
			custom_picture: "customPicture",
		}),
	)
	.annotations({ identifier: "User" });

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
).annotations({ identifier: "CurrentUser" });

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
})
	.pipe(
		Schema.rename({
			first_name: "firstName",
			last_name: "lastName",
		}),
	)
	.annotations({ identifier: "CommentUser" });

export type CommentUser = typeof CommentUserApiSchema.Type;

export class CommentUserSchema extends CommentUserApiSchema {
	static decodeToType = Schema.decodeUnknown(CommentUserApiSchema);
	static schema = CommentUserApiSchema;
	static typeSchema = Schema.typeSchema(CommentUserApiSchema);
}

const ShareApiSchema = Schema.Struct({
	user: Schema.NullOr(CommentUserApiSchema),
	user_id: Schema.Number,
	paid_share: Currency.DollarsFromStringSchema,
	owed_share: Currency.DollarsFromStringSchema,
	net_balance: Currency.DollarsFromStringSchema,
})
	.pipe(
		Schema.rename({
			user_id: "userId",
			paid_share: "paidShare",
			owed_share: "owedShare",
			net_balance: "netBalance",
		}),
	)
	.annotations({ identifier: "Share" });

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
}).annotations({ identifier: "Repayment" });

export type Repayment = typeof RepaymentApiSchema.Type;

export class RepaymentSchema extends RepaymentApiSchema {
	static decodeToType = Schema.decodeUnknown(RepaymentApiSchema);
	static schema = RepaymentApiSchema;
	static typeSchema = Schema.typeSchema(RepaymentApiSchema);
}

const ReceiptApiSchema = Schema.Struct({
	large: Schema.NullOr(Schema.String),
	original: Schema.NullOr(Schema.String),
}).annotations({ identifier: "Receipt" });

export type Receipt = typeof ReceiptApiSchema.Type;

export class ReceiptSchema extends ReceiptApiSchema {
	static decodeToType = Schema.decodeUnknown(ReceiptApiSchema);
	static schema = ReceiptApiSchema;
	static typeSchema = Schema.typeSchema(ReceiptApiSchema);
}

const CategoryApiSchema = Schema.Struct({
	id: Schema.Number,
	name: Schema.String,
}).annotations({ identifier: "Category" });

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
})
	.pipe(
		Schema.rename({
			comment_type: "commentType",
			relation_type: "relationType",
			relation_id: "relationId",
			created_at: "createdAt",
			deleted_at: "deletedAt",
		}),
	)
	.annotations({ identifier: "Comment" });

export type Comment = typeof CommentApiSchema.Type;

export class CommentSchema extends CommentApiSchema {
	static decodeToType = Schema.decodeUnknown(CommentApiSchema);
	static schema = CommentApiSchema;
	static typeSchema = Schema.typeSchema(CommentApiSchema);
}

const ExpenseApiSchema = Schema.Struct({
	cost: Currency.DollarsFromStringSchema,
	description: Schema.String,
	details: Schema.NullOr(Schema.String),
	date: Schema.Date,
	repeat_interval: Schema.NullOr(
		Schema.Literal("never", "weekly", "fortnightly", "monthly", "yearly"),
	),
	currency_code: Schema.String,
	// TODO: Strongly type w/ Schema.Literal
	creation_method: Schema.NullOr(Schema.String),
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
	next_repeat: Schema.NullOr(Schema.String),
	comments_count: Schema.Number,
	payment: Schema.Boolean,
	transaction_confirmed: Schema.Boolean,
	repayments: Schema.Array(RepaymentApiSchema),
	created_at: Schema.Date,
	created_by: Schema.NullOr(CommentUserApiSchema),
	updated_at: Schema.Date,
	updated_by: Schema.NullOr(CommentUserApiSchema),
	deleted_at: Schema.NullOr(Schema.Date),
	deleted_by: Schema.NullOr(CommentUserApiSchema),
	category: Schema.NullOr(CategoryApiSchema),
	receipt: Schema.NullOr(ReceiptApiSchema),
	users: Schema.Array(ShareApiSchema),
	comments: Schema.optional(Schema.Array(CommentApiSchema)),
})
	.pipe(
		Schema.rename({
			creation_method: "creationMethod",
			repeat_interval: "repeatInterval",
			currency_code: "currencyCode",
			category_id: "categoryId",
			group_id: "groupId",
			friendship_id: "friendshipId",
			expense_bundle_id: "expenseBundleId",
			email_reminder: "emailReminder",
			email_reminder_in_advance: "emailReminderInAdvance",
			next_repeat: "nextRepeat",
			comments_count: "commentsCount",
			transaction_confirmed: "transactionConfirmed",
			created_at: "createdAt",
			created_by: "createdBy",
			updated_at: "updatedAt",
			updated_by: "updatedBy",
			deleted_at: "deletedAt",
			deleted_by: "deletedBy",
		}),
	)
	.annotations({
		identifier: "Expense",
	});

export type Expense = typeof ExpenseSchema.Type;

export class ExpenseSchema extends ExpenseApiSchema {
	private static json = Schema.parseJson(ExpenseApiSchema);

	static fromJson = Schema.decode(ExpenseSchema.json);
	static toJson = Schema.encode(ExpenseSchema.json);

	static decodeToType = Schema.decodeUnknown(ExpenseApiSchema);
	static decodeToTypeArray = Schema.decodeUnknown(
		Schema.Array(ExpenseApiSchema),
	);
	static schema = ExpenseApiSchema;
	static typeSchema = Schema.typeSchema(ExpenseApiSchema);
}

const SourceApiSchema = Schema.Struct({
	type: Schema.String,
	id: Schema.Number,
	url: Schema.optional(Schema.NullOr(Schema.String)),
}).annotations({ identifier: "Source" });

export type Source = typeof SourceApiSchema.Type;

export class SourceSchema extends SourceApiSchema {
	static decodeToType = Schema.decodeUnknown(SourceApiSchema);
	static schema = SourceApiSchema;
	static typeSchema = Schema.typeSchema(SourceApiSchema);
}

const NotificationContentSchema = Schema.transformOrFail(
	Schema.String,
	Schema.String,
	{
		strict: true,
		encode(decoded, _, ast) {
			return ParseResult.fail(
				new ParseResult.Forbidden(
					ast,
					decoded,
					"Encoding Notification Content is forbidden",
				),
			);
		},
		decode(encoded) {
			return ParseResult.succeed(decodeAndStripHtml(encoded));
		},
	},
).annotations({ identifier: "NotificationContent" });

export const ExpenseNotificationTypeSchema = Schema.Literal(
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
).annotations({ identifier: "NotificationType" });

type NotificationType = typeof NotificationTypeSchema.Type;
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
).annotations({ identifier: "NotificationTypeFromNumber" });

export const NotificationTypeFromNumber = {
	schema: NotificationTypeFromNumberSchema,
	decode: Schema.decode(NotificationTypeFromNumberSchema),
	encode: Schema.encode(NotificationTypeFromNumberSchema),
} as const;

const BaseNotificationApiSchema = Schema.Struct({
	id: Schema.Number,
	type: NotificationTypeFromNumberSchema,
	created_at: Schema.DateFromString,
	created_by: Schema.Number,
	source: Schema.NullOr(SourceApiSchema), // Object or null
	image_url: Schema.String,
	image_shape: Schema.Literal("square", "circle"),
	content: NotificationContentSchema,
});

const NotificationApiSchema = BaseNotificationApiSchema.pipe(
	Schema.rename({
		created_at: "createdAt",
		created_by: "createdBy",
		image_url: "imageUrl",
		image_shape: "imageShape",
	}),
).annotations({ identifier: "Notification" });

export type Notification = typeof NotificationApiSchema.Type;

export class NotificationSchema extends NotificationApiSchema {
	static decodeToType = Schema.decodeUnknown(NotificationApiSchema);
	static decodeToTypeArray = Schema.decodeUnknown(
		Schema.Array(NotificationApiSchema),
	);
	static schema = NotificationApiSchema;
	static typeSchema = Schema.typeSchema(NotificationApiSchema);
}
const ExpenseNotificationApiSchema = Schema.Struct({
	...BaseNotificationApiSchema.fields,
	type: ExpenseNotificationTypeSchema,
	source: SourceApiSchema,
}).pipe(
	Schema.rename({
		created_at: "createdAt",
		created_by: "createdBy",
		image_url: "imageUrl",
		image_shape: "imageShape",
	}),
	Schema.typeSchema,
	Schema.annotations({
		identifier: "ExpenseNotification",
	}),
);

export interface ExpenseNotification
	extends Schema.Schema.Encoded<typeof ExpenseNotificationSchema> {}

export class ExpenseNotificationSchema extends ExpenseNotificationApiSchema {
	static decode = Schema.decode(ExpenseNotificationApiSchema);
	static decodeUnknown = Schema.decodeUnknown(ExpenseNotificationApiSchema);
	static decodeArray = Schema.decodeUnknown(
		Schema.Array(ExpenseNotificationApiSchema),
	);
	static schema = ExpenseNotificationApiSchema;
}

const CoverPhotoApiSchema = Schema.Struct({
	small: Schema.String,
	medium: Schema.String,
	large: Schema.String,
}).annotations({ identifier: "CoverPhoto" });

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
})
	.pipe(
		Schema.rename({
			from_user_id: "fromUserId",
			to_user_id: "toUserId",
			created_at: "createdAt",
		}),
	)
	.annotations({ identifier: "Debt" });

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
}).annotations({ identifier: "Avatar" });

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
})
	.pipe(
		Schema.rename({
			user_id: "userId",
			joined_at: "joinedAt",
		}),
	)
	.annotations({ identifier: "Member" });

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
})
	.pipe(
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
	)
	.annotations({ identifier: "Group" });

export type Group = typeof GroupApiSchema.Type;

export class GroupSchema extends GroupApiSchema {
	static decodeToType = Schema.decodeUnknown(GroupApiSchema);
	static schema = GroupApiSchema;
	static typeSchema = Schema.typeSchema(GroupApiSchema);
}

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

function decodeAndStripHtml(input: string): string {
	/**
	 * Regex explanation:
	 * \\u     : Matches the literal string "\u"
	 * [\dA-F] : Matches any digit (0-9) or letter A-F (case insensitive)
	 * {4}     : Exactly 4 occurrences of the previous character set
	 * /gi     : Global flag (g) to replace all occurrences, case-insensitive flag (i)
	 * Remove the "\u" prefix and parse the hexadecimal value
	 */
	const decodedString = input.replace(/\\u[\dA-F]{4}/gi, (match) => {
		/**
		 * Regex explanation:
		 * \\u    : Matches the literal string "\u"
		 * /g     : Global flag to replace all occurrences
		 */
		return String.fromCharCode(Number.parseInt(match.replace(/\\u/g, ""), 16));
	});

	/**
	 * Regex explanation:
	 * <    : Matches the opening angle bracket of an HTML tag
	 * [^>] : Matches any character that is not a closing angle bracket
	 * +    : One or more occurrences of the previous character set
	 * >    : Matches the closing angle bracket of an HTML tag
	 * /g   : Global flag to replace all occurrences
	 */
	const strippedString = decodedString.replace(/<[^>]+>/g, "");

	return strippedString;
}
