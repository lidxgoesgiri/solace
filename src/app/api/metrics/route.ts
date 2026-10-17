import { readMetrics, recordMetric } from "@/server/api/metrics";
import { route } from "@/server/route";

export const GET = route(readMetrics);
export const POST = route(recordMetric);
