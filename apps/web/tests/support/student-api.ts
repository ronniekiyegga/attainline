import { expect, type APIRequestContext } from "@playwright/test";

export const studentApiPort = 4199;
export const studentApiUrl = `http://127.0.0.1:${studentApiPort}`;

export const standInAuth = {
  email: "morgan.vale@example.test",
  password: "AttainlineDemo!2026",
  lockedEmail: "locked.account@example.test",
  academy: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Fictional Demo Academy",
    token: "A".repeat(43),
  },
  college: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Fictional Demo College",
    token: "C".repeat(43),
  },
};

export const sessionCookie = {
  name: "attainline_session",
  value: standInAuth.academy.token,
  domain: "127.0.0.1",
  path: "/",
  expires: -1,
  httpOnly: true,
  secure: true,
  sameSite: "Lax" as const,
};

type Scenario =
  | "populated"
  | "empty"
  | "no-enrolments"
  | "unavailable"
  | "list-unavailable"
  | "session-expired"
  | "assessments-unavailable"
  | "analytics-unavailable"
  | "teacher-dashboard";

type ScenarioOptions = {
  listDelay?: number;
  holdYearsForList?: boolean;
};

type ReceivedRequest = {
  path: string;
  academicYearStart: string | null;
  sort: string | null;
  limit: string | null;
  q: string | null;
  cursor: string | null;
  requestId: string | null;
  authorization: string | null;
};

type AuthRequest = {
  method: string;
  path: string;
  authorization: string | null;
  origin: string | null;
};

export async function useScenario(
  request: APIRequestContext,
  scenario: Scenario,
  { listDelay = 0, holdYearsForList = false }: ScenarioOptions = {},
) {
  const options = new URLSearchParams({ listDelay: String(listDelay) });
  if (holdYearsForList) {
    options.set("holdYearsForList", "");
  }

  const response = await request.put(
    `${studentApiUrl}/__scenario/${scenario}?${options}`,
  );
  expect(response.status()).toBe(204);
}

export async function receivedRequests(
  request: APIRequestContext,
): Promise<ReceivedRequest[]> {
  const response = await request.get(`${studentApiUrl}/__requests`);
  return response.json();
}

export async function studentListRequests(
  request: APIRequestContext,
): Promise<ReceivedRequest[]> {
  return (await receivedRequests(request))
    .filter((received) => received.path === "/students");
}

export async function authRequests(request: APIRequestContext): Promise<AuthRequest[]> {
  const response = await request.get(`${studentApiUrl}/__auth-requests`);
  return response.json();
}
