import { Context } from "effect";
import type { SyncRecordEntity } from "../electrodb/sync-record";

export class CurrentSyncRecord extends Context.Tag("CurrentSyncRecord")<
	CurrentSyncRecord,
	SyncRecordEntity.Entity
>() {}
