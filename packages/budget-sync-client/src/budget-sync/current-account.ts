import { Context } from "effect";
import type { BudgetSyncAccountEntity } from "../electrodb/budget-sync-account";

export class CurrentBudgetSyncAccount extends Context.Tag(
	"CurrentBudgetSyncAccount",
)<CurrentBudgetSyncAccount, BudgetSyncAccountEntity>() {}
