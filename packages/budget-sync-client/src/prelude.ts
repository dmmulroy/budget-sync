import type { Effect } from "effect";
import type { Expense, Share } from "./splitwise/schemas";

export type UnifyIntersection<T> = {
	[K in keyof T]: T[K];
} & unknown;

export type WrappedService<Service, Failure> = Readonly<{
	client: Service;
	use: <Success>(
		fn: (client: Service) => Promise<Success>,
	) => Effect.Effect<Success, Failure>;
}>;

export const formatDateIsoFullDate = (date: Date) => {
	const formatter = new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});

	const parts = formatter.formatToParts(date);
	const partValues = parts.reduce<Record<string, string>>((acc, part) => {
		acc[part.type] = part.value;
		return acc;
	}, {});

	return `${partValues.year}-${partValues.month}-${partValues.day}`;
};

export function getUserFullNameFromShare(share: Share) {
	return `${share.user?.firstName}${share?.user?.lastName ? ` ${share.user?.lastName}` : ""}`;
}

export function getTransactionType(netBalance: number): "credit" | "debit" {
	return netBalance > 0 ? "credit" : "debit";
}

export function isPayment(expense: Expense) {
	return expense.payment;
}
