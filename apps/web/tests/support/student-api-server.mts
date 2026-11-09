import { createServer, type ServerResponse } from "node:http";

const port = Number(process.env.STUDENT_API_PORT);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("STUDENT_API_PORT is required");
}

const scenarios = [
  "populated",
  "empty",
  "no-enrolments",
  "unavailable",
  "list-unavailable",
] as const;
type Scenario = (typeof scenarios)[number];

let scenario: Scenario = "populated";
let listDelay = 0;
let holdYearsForList = false;
let releaseYears: (() => void) | undefined;
let received: {
  path: string;
  academicYearStart: string | null;
  sort: string | null;
  limit: string | null;
  q: string | null;
  cursor: string | null;
  requestId: string | null;
}[] = [];

const academicYearStarts = [2026, 2025];

const students = [
  { id: "0a3f5c1e-1111-4111-8111-000000000001", institutionStudentRef: "DEMO-SYN-001", firstName: "Avery", surname: "Ashgrove", yearGroup: 7, classGroup: "7A" },
  { id: "0a3f5c1e-1111-4111-8111-000000000002", institutionStudentRef: "DEMO-SYN-002", firstName: null, surname: "Brackenridge", yearGroup: 7, classGroup: null },
  { id: "0a3f5c1e-1111-4111-8111-000000000003", institutionStudentRef: "DEMO-SYN-003", firstName: "Calla", surname: "Cindermoor", yearGroup: 8, classGroup: "8B" },
  { id: "0a3f5c1e-1111-4111-8111-000000000004", institutionStudentRef: "DEMO-SYN-004", firstName: "Dorian", surname: "Elmscott", yearGroup: 6, classGroup: "6C" },
];

const studentsByYear: Record<string, typeof students> = {
  "2026": students.slice(0, 3),
  "2025": students.slice(3),
};

const PAGE_SIZE = 2;

function sendJson(response: ServerResponse, status: number, body: unknown, delay = 0) {
  setTimeout(() => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  }, delay);
}

function isScenario(value: string): value is Scenario {
  return (scenarios as readonly string[]).includes(value);
}

function academicYearsResponse(response: ServerResponse) {
  if (scenario === "unavailable") {
    sendJson(response, 503, { error: "Student directory unavailable" });
    return;
  }

  const respond = () => sendJson(response, 200, {
    academicYearStarts: scenario === "no-enrolments" ? [] : academicYearStarts,
  });

  if (!holdYearsForList) {
    respond();
    return;
  }

  const giveUp = setTimeout(() => {
    releaseYears = undefined;
    sendJson(response, 503, { error: "Student directory unavailable" });
  }, 3000);

  releaseYears = () => {
    clearTimeout(giveUp);
    releaseYears = undefined;
    respond();
  };
}

function studentsResponse(response: ServerResponse, url: URL) {
  if (scenario === "unavailable" || scenario === "list-unavailable") {
    sendJson(response, 503, { error: "Student directory unavailable" }, listDelay);
    return;
  }

  const enrolled = studentsByYear[url.searchParams.get("academicYearStart") ?? ""];
  const sort = url.searchParams.get("sort") ?? "surname-asc";
  const cursor = url.searchParams.get("cursor");
  const nextPageCursor = sort === "surname-desc" ? "desc-page-2" : "page-2";

  if (!enrolled || !["surname-asc", "surname-desc"].includes(sort)) {
    sendJson(response, 400, { error: "Invalid pagination" });
    return;
  }

  if (scenario === "empty") {
    sendJson(response, 200, { items: [], nextCursor: null, limit: 25 }, listDelay);
    return;
  }

  if (cursor !== null && cursor !== nextPageCursor) {
    sendJson(response, 400, { error: "Invalid pagination" });
    return;
  }

  const ordered = sort === "surname-desc" ? enrolled.toReversed() : enrolled;
  const offset = cursor ? PAGE_SIZE : 0;
  const items = ordered.slice(offset, offset + PAGE_SIZE);
  const hasMore = offset + PAGE_SIZE < ordered.length;

  sendJson(
    response,
    200,
    { items, nextCursor: hasMore ? nextPageCursor : null, limit: 25 },
    listDelay,
  );
}

createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const [, first, second] = url.pathname.split("/");

  if (request.method === "GET" && first === "__health") {
    sendJson(response, 200, { status: "ok" });
  } else if (request.method === "PUT" && first === "__scenario" && isScenario(second)) {
    scenario = second;
    listDelay = Number(url.searchParams.get("listDelay") ?? 0);
    holdYearsForList = url.searchParams.has("holdYearsForList");
    received = [];
    response.writeHead(204).end();
  } else if (request.method === "GET" && first === "__requests") {
    sendJson(response, 200, received);
  } else if (request.method === "GET" && first === "students") {
    received.push({
      path: url.pathname,
      academicYearStart: url.searchParams.get("academicYearStart"),
      sort: url.searchParams.get("sort"),
      limit: url.searchParams.get("limit"),
      q: url.searchParams.get("q"),
      cursor: url.searchParams.get("cursor"),
      requestId: request.headers["x-request-id"]?.toString() ?? null,
    });
    if (second === "academic-years") {
      academicYearsResponse(response);
    } else if (!second) {
      releaseYears?.();
      studentsResponse(response, url);
    } else {
      sendJson(response, 404, { error: "Not found" });
    }
  } else {
    sendJson(response, 404, { error: "Not found" });
  }
}).listen(port, "127.0.0.1");
