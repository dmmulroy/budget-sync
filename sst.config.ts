/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
	app(input) {
		return {
			name: "budget-sync",
			removal: input?.stage === "production" ? "retain" : "remove",
			protect: ["production"].includes(input?.stage),
			home: "aws",
			providers: {
				aws: {
					region: "us-east-1",
					profile: "budgetsync-dev",
				},
			},
		};
	},

	async run() {
		const dynamo = new sst.aws.Dynamo("budget-sync", {
			fields: {
				pk: "string",
				sk: "string",
				gsi1pk: "string",
				gsi1sk: "string",
				gsi2pk: "string",
				gsi2sk: "string",
			},
			primaryIndex: {
				hashKey: "pk",
				rangeKey: "sk",
			},
			globalIndexes: {
				gsi1: {
					hashKey: "gsi1pk",
					rangeKey: "gsi1sk",
				},
				gsi2: {
					hashKey: "gsi2pk",
					rangeKey: "gsi2sk",
				},
			},
		});

		return { dynamo };
	},
});
