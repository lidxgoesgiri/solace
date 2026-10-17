import { session } from "@/server/api/auth";
import { route } from "@/server/route";

export const GET = route(session);
