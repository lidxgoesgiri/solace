import { changePassphrase } from "@/server/api/auth";
import { route } from "@/server/route";

export const POST = route(changePassphrase);
