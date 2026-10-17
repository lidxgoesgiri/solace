import { createRecord, listRecords } from "@/server/api/records";
import { route } from "@/server/route";

export const GET = route(listRecords);
export const POST = route(createRecord);
