import { Effect, Redacted } from "effect";
import { SplitwiseClient } from "./splitwise/client";
import { CurrentUserSchema } from "./splitwise/schemas";

const groupId = Number(process.env["SPLITWISE_GROUP_ID"]);
const client = new SplitwiseClient({
	apiKey: Redacted.make(process.env["SPLITWISE_API_KEY"] ?? ""),
});

const user = await client
	.getCurrentUser()
	.then((res) => res.data?.user)
	.then((user) =>
		user === undefined ? Promise.reject() : Promise.resolve(user),
	);

console.log({ user });

const parsed = await Effect.runPromise(CurrentUserSchema.decodeToType(user));

console.log({ parsed });

//const results = await client
//	.getNotifications()
//	.then((res) => {
//		if (res.data && res.data?.notifications) {
//			return res.data.notifications;
//		}
//
//		return Promise.reject("no notifications");
//	})
//	.then((notifications) => {
//		return Promise.all(
//			notifications.flatMap((notification) => {
//				if (notification.type === 0 || notification.type === 1) {
//					return [client.getExpenseById(notification.source?.id ?? 0)];
//				}
//				return [];
//			}),
//		);
//	})
//	.then((res) => {
//		return res.flatMap((result) =>
//			result.data &&
//			result.data.expense &&
//			result.data.expense?.group_id === groupId
//				? [result.data.expense]
//				: [],
//		);
//	});

//console.log("Result: \n", JSON.stringify(results, null, 2));
