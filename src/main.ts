import { Redacted } from "effect";
import { SplitwiseClient } from "./splitwise/client";

const groupId = Number(process.env["SPLITWISE_GROUP_ID"]);
const client = new SplitwiseClient({
	apiKey: Redacted.make(process.env["SPLITWISE_API_KEY"] ?? ""),
});

const results = await client
	.getNotifications()
	.then((res) => {
		if (res.data && res.data?.notifications) {
			return res.data.notifications;
		}

		return Promise.reject("no notifications");
	})
	.then((notifications) => {
		return Promise.all(
			notifications.flatMap((notification) => {
				if (notification.type === 0 || notification.type === 1) {
					return [client.getExpenseById(notification.source?.id ?? 0)];
				}
				return [];
			}),
		);
	})
	.then((res) => {
		return res.flatMap((result) =>
			result.data &&
			result.data.expense &&
			result.data.expense?.group_id === groupId
				? [result.data.expense]
				: [],
		);
	});

console.log("Result: \n", JSON.stringify(results, null, 2));
