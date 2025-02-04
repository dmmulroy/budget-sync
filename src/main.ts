import * as splitwise from "./splitwise";

const result = await splitwise.getGetNotifications({
	headers: {
		Authorization: `Bearer ${process.env["SPLITWISE_API_KEY"]}`,
	},
});

console.log("Result: \n", JSON.stringify(result, null, 2));
