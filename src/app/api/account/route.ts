import { deleteAccount } from "@/server/api/records";
import { route } from "@/server/route";

export const DELETE = route(deleteAccount);
