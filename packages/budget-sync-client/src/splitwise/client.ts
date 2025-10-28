import { Redacted, Types } from "effect";
import type { GetGetExpensesData } from "./codegen";
import {
	getGetCurrentUser,
	getGetExpenseById,
	getGetExpenses,
	getGetGroupById,
	getGetNotifications,
	getGetUserById,
} from "./codegen/sdk.gen";

export type SplitwiseClientOptions = Readonly<{
	apiKey: Redacted.Redacted<string>;
}>;

export type GetExpensesByGroupIdOptions = Types.Simplify<
	Omit<NonNullable<GetGetExpensesData["query"]>, "group_id">
>;

export class SplitwiseClient {
	private readonly options: SplitwiseClientOptions;

	constructor(options: SplitwiseClientOptions) {
		this.options = options;
	}

	private getHeaders() {
		return {
			Authorization: `Bearer ${Redacted.value(this.options.apiKey)}`,
			"Content-Type": "application/json",
		};
	}

	getCurrentUser() {
		return getGetCurrentUser({
			headers: this.getHeaders(),
		});
	}

	getExpenseById(expenseId: number) {
		return getGetExpenseById({
			headers: this.getHeaders(),
			path: { id: expenseId },
		});
	}

	getExpensesByGroupId(groupId: number, options?: GetExpensesByGroupIdOptions) {
		return getGetExpenses({
			headers: this.getHeaders(),
			query: {
				group_id: groupId,
				...options,
			},
		});
	}

	getGroupById(groupId: number) {
		return getGetGroupById({
			headers: this.getHeaders(),
			path: { id: groupId },
		});
	}

	getNotifications(options?: { updatedAfter?: Date; limit?: number }) {
		return getGetNotifications({
			query: {
				updated_after: options?.updatedAfter?.toISOString(),
				limit: options?.limit ?? 0,
			},
			headers: this.getHeaders(),
		});
	}

	getUserById(userId: number) {
		return getGetUserById({
			headers: this.getHeaders(),
			path: { id: userId },
		});
	}
}
