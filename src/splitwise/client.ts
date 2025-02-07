import { Redacted } from "effect";
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

export class SplitwiseClient {
	private readonly options: SplitwiseClientOptions;

	constructor(options: SplitwiseClientOptions) {
		this.options = options;
	}

	private getHeaders() {
		return {
			Authorization: `Bearer ${Redacted.value(this.options.apiKey)}`,
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

	getExpenses() {
		return getGetExpenses({
			headers: this.getHeaders(),
		});
	}

	getGroupById(groupId: number) {
		return getGetGroupById({
			headers: this.getHeaders(),
			path: { id: groupId },
		});
	}

	getNotifications() {
		return getGetNotifications({
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
