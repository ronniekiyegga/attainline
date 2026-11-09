import "server-only";

import { z } from "zod";
import { requestApi } from "@/server/attainline-api";

const readinessSchema = z.object({ status: z.literal("ready") });

export async function checkApplicationReadiness(): Promise<boolean> {
  const result = await requestApi({
    path: "ready",
    schema: readinessSchema,
    timeoutMs: 4_000,
  });

  return result.status === "success";
}
