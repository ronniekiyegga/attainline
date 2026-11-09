import { expect, type APIRequestContext } from "@playwright/test";

export const studentApiPort = 4199;
export const studentApiUrl = `http://127.0.0.1:${studentApiPort}`;

type Scenario =
  | "populated"
  | "empty"
  | "no-enrolments"
  | "unavailable"
  | "list-unavailable"
  | "details-unavailable"
  | "details-extra-fields";

type ScenarioOptions = {
  listDelay?: number;
  slowStudents?: string[];
};

type ReceivedRequest = {
  path: string;
  academicYearStart: string | null;
  sort: string | null;
  limit: string | null;
  q: string | null;
  cursor: string | null;
  requestId: string | null;
};

export async function useScenario(
  request: APIRequestContext,
  scenario: Scenario,
  { listDelay = 0, slowStudents = [] }: ScenarioOptions = {},
) {
  const options = new URLSearchParams({ listDelay: String(listDelay) });
  for (const id of slowStudents) {
    options.append("slowStudent", id);
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
