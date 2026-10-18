import { tidyNotes } from "@/server/api/ai";
import { route } from "@/server/route";

export const POST = route(tidyNotes);
