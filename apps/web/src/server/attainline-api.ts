import "server-only";
import { randomUUID } from "node:crypto";
import { connection } from "next/server";
import { z } from "zod";

const REQUEST_TIMEOUT_MS = 25_000;

export type ApiResult<T> =
  | { status: "success"; data: T }
  | { status: "rejected"; httpStatus: number }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

type ApiRequest<T> = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, string | undefined>;
  body?: unknown;
  sessionToken?: string;
  schema: z.ZodType<T>;
  expectedStatuses?: number[];
};

type FailureReason =
  | "not-configured"
  | "timeout"
  | "network"
  | "http-status"
  | "invalid-response";

const fetchErrorSchema = z.object({
  name: z.string(),
  cause: z.object({ code: z.string() }).optional(),
});

function logFailure(fields: {
  requestId: string;
  reason: FailureReason;
  status?: number;
  errorCode?: string;
}) {
  console.error(JSON.stringify({
    level: "error",
    event: "attainline_api.request_failed",
    ...fields,
  }));
}

function describeFetchError(error: unknown) {
  const parsed = fetchErrorSchema.safeParse(error);

  return {
    reason: parsed.data?.name === "TimeoutError" ? "timeout" : "network",
    errorCode: parsed.data?.cause?.code,
  } as const;
}

function apiUrl(path: string, query: Record<string, string | undefined>): URL | null {
  const configured = process.env.ATTAINLINE_API_URL;

  if (!configured || !URL.canParse(configured)) {
    return null;
  }

  const baseUrl = new URL(configured);

  if (!baseUrl.pathname.endsWith("/")) {
    baseUrl.pathname += "/";
  }

  baseUrl.search = "";
  baseUrl.hash = "";

  const url = new URL(path, baseUrl);

  for (const [name, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(name, value);
    }
  }

  return url;
}

export async function requestApi<T>({
  method = "GET",
  path,
  query = {},
  body,
  sessionToken,
  schema,
  expectedStatuses = [],
}: ApiRequest<T>): Promise<ApiResult<T>> {
  await connection();

  const requestId = randomUUID();
  const url = apiUrl(path, query);

  if (!url) {
    logFailure({ requestId, reason: "not-configured" });
    return { status: "unavailable" };
  }

  const headers: Record<string, string> = { "X-Request-Id": requestId };

  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      cache: "no-store",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    logFailure({ requestId, ...describeFetchError(error) });
    return { status: "unavailable" };
  }

  if (response.status === 401) {
    return { status: "unauthenticated" };
  }

  if (expectedStatuses.includes(response.status)) {
    return { status: "rejected", httpStatus: response.status };
  }

  if (!response.ok) {
    logFailure({ requestId, reason: "http-status", status: response.status });
    return { status: "unavailable" };
  }

  const payload = response.status === 204
    ? undefined
    : await response.json().catch(() => undefined);
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    logFailure({ requestId, reason: "invalid-response" });
    return { status: "unavailable" };
  }

  return { status: "success", data: parsed.data };
}
