import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const port = Number(process.env.STUDENT_API_PORT);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("STUDENT_API_PORT is required");
}

type StandInOrganisation = { id: string; name: string; token: string };

const auth: {
  email: string;
  password: string;
  lockedEmail: string;
  academy: StandInOrganisation;
  college: StandInOrganisation;
} = JSON.parse(process.env.STAND_IN_AUTH ?? "null");

if (!auth) {
  throw new Error("STAND_IN_AUTH is required");
}

const scenarios = [
  "populated",
  "empty",
  "no-enrolments",
  "unavailable",
  "list-unavailable",
  "session-expired",
  "assessments-unavailable",
  "analytics-unavailable",
  "teacher-dashboard",
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
  authorization: string | null;
}[] = [];

let authRequests: {
  method: string;
  path: string;
  authorization: string | null;
  origin: string | null;
}[] = [];
let issuedTokens = 0;
const revokedTokens = new Set<string>();

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

const assessments: Record<string, unknown> = {
  "0a3f5c1e-1111-4111-8111-000000000001": {
    academicYearStart: 2026,
    status: { value: "AT_RISK", averageStandardAgeScore: 97.5, basedOn: ["CAT4_MEAN", "NGRT_READING"] },
    priority: { value: "HIGH", standardAgeScore: 88, basedOn: "CAT4_QUANTITATIVE" },
    results: [
      {
        measure: "CAT4_QUANTITATIVE",
        satOn: "2026-10-05",
        rawScore: null,
        rawScoreMaximum: null,
        standardAgeScore: 88,
        stanine: 3,
        nationalPercentileRank: 21,
        previous: null,
      },
      {
        measure: "CAT4_MEAN",
        satOn: "2026-10-05",
        rawScore: null,
        rawScoreMaximum: null,
        standardAgeScore: 103,
        stanine: 5,
        nationalPercentileRank: 58,
        previous: { satOn: "2025-10-06", standardAgeScore: 96, stanine: 4 },
      },
      {
        measure: "NGRT_READING",
        satOn: "2026-10-07",
        rawScore: null,
        rawScoreMaximum: null,
        standardAgeScore: 92,
        stanine: 4,
        nationalPercentileRank: 30,
        previous: null,
      },
    ],
  },
};

const overview = {
  academicYearStart: 2026,
  cohortSize: 3,
  assessedStudents: 2,
  coveragePercentage: 66.7,
  onTrackPercentage: 33.3,
  averageStandardAgeScore: 100.3,
  statusCounts: { ON_TRACK: 1, AT_RISK: 1, PENDING: 1, OFF_TRACK: 0 },
  priorityCounts: { LOW: 1, MEDIUM: 1, HIGH: 1 },
  yearGroups: [{ yearGroup: 7, students: 2 }, { yearGroup: 8, students: 1 }],
  measures: [
    { measure: "CAT4_MEAN", students: 3, averageStandardAgeScore: 104, averageStanine: 5.3 },
    { measure: "CAT4_QUANTITATIVE", students: 2, averageStandardAgeScore: 96, averageStanine: 4.5 },
    { measure: "NGRT_READING", students: 2, averageStandardAgeScore: 98, averageStanine: 4.5 },
  ],
  topRankings: [
    { ...students[2], rank: 1, standardAgeScore: 111, stanine: 6, nationalPercentileRank: 77, status: "ON_TRACK", priority: "LOW" },
    { ...students[0], rank: 2, standardAgeScore: 103, stanine: 5, nationalPercentileRank: 58, status: "AT_RISK", priority: "HIGH" },
    { ...students[1], rank: 3, standardAgeScore: 98, stanine: 4, nationalPercentileRank: 42, status: "PENDING", priority: "MEDIUM" },
  ],
};

function analyticsResponse(response: ServerResponse, url: URL, organisation: StandInOrganisation) {
  const academicYearStart = Number(url.searchParams.get("academicYearStart") ?? 2026);
  if (scenario === "analytics-unavailable") {
    sendJson(response, 503, { error: "Analytics unavailable" });
    return;
  }

  if (organisation === auth.college) {
    sendJson(response, 200, url.pathname.endsWith("/overview") ? {
      ...overview,
      academicYearStart,
      cohortSize: 0,
      assessedStudents: 0,
      coveragePercentage: 0,
      onTrackPercentage: 0,
      averageStandardAgeScore: null,
      statusCounts: { ON_TRACK: 0, AT_RISK: 0, PENDING: 0, OFF_TRACK: 0 },
      priorityCounts: { LOW: 0, MEDIUM: 0, HIGH: 0 },
      yearGroups: [],
      measures: [],
      topRankings: [],
    } : {
      academicYearStart,
      measure: "CAT4_MEAN",
      yearGroup: null,
      cohortSize: 0,
      availableYearGroups: [],
      items: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
    return;
  }

  if (url.pathname.endsWith("/overview")) {
    sendJson(response, 200, { ...overview, academicYearStart });
    return;
  }

  const measure = url.searchParams.get("measure") ?? "CAT4_MEAN";
  const yearGroup = url.searchParams.get("yearGroup");
  const page = Number(url.searchParams.get("page") ?? 1);
  const limit = Number(url.searchParams.get("limit") ?? 10);
  const filtered = overview.topRankings.filter((student) => !yearGroup || student.yearGroup === Number(yearGroup));
  const offset = (page - 1) * limit;
  sendJson(response, 200, {
    academicYearStart,
    measure,
    yearGroup: yearGroup ? Number(yearGroup) : null,
    cohortSize: overview.cohortSize,
    availableYearGroups: overview.yearGroups.map(({ yearGroup: value }) => value),
    items: filtered.slice(offset, offset + limit),
    page,
    limit,
    total: filtered.length,
    totalPages: Math.ceil(filtered.length / limit),
  });
}

function enrolledStudent(url: URL, studentId: string) {
  return studentsByYear[url.searchParams.get("academicYearStart") ?? ""]
    ?.find(({ id }) => id === studentId);
}

function studentResponse(response: ServerResponse, url: URL, studentId: string, section?: string) {
  const student = enrolledStudent(url, studentId);

  if (!student) {
    sendJson(response, 404, { error: "Student not found" });
  } else if (!section) {
    sendJson(response, 200, student);
  } else if (section !== "assessments") {
    sendJson(response, 404, { error: "Not found" });
  } else if (scenario === "assessments-unavailable") {
    sendJson(response, 503, { error: "Assessments unavailable" });
  } else {
    sendJson(response, 200, assessments[studentId] ?? {
      academicYearStart: Number(url.searchParams.get("academicYearStart")),
      status: { value: "PENDING", averageStandardAgeScore: null, basedOn: [] },
      priority: { value: "MEDIUM", standardAgeScore: null, basedOn: null },
      results: [],
    });
  }
}

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve(undefined);
      }
    });
  });
}

function sessionOrganisation(request: IncomingMessage): StandInOrganisation | undefined {
  const token = request.headers.authorization?.replace(/^Bearer /, "");

  if (!token || revokedTokens.has(token) || scenario === "session-expired") {
    return undefined;
  }

  if (token === auth.college.token) {
    return auth.college;
  }

  return token === auth.academy.token || token.startsWith("issued") ? auth.academy : undefined;
}

function issueToken(organisation: StandInOrganisation) {
  if (organisation === auth.college) {
    return organisation.token;
  }

  issuedTokens += 1;
  return `issued${String(issuedTokens).padStart(37, "0")}`;
}

async function authResponse(request: IncomingMessage, response: ServerResponse, path: string) {
  authRequests.push({
    method: request.method ?? "",
    path,
    authorization: request.headers.authorization ?? null,
    origin: request.headers.origin ?? null,
  });

  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

  if (request.method === "POST" && path === "/auth/sessions") {
    const body = await readBody(request) as { email?: string; password?: string } | undefined;

    if (body?.email === auth.lockedEmail) {
      sendJson(response, 429, { error: "Too many failed sign-in attempts" });
    } else if (body?.email === auth.email && body.password === auth.password) {
      sendJson(response, 201, { token: issueToken(auth.academy), expiresAt });
    } else {
      sendJson(response, 401, { error: "Invalid email or password" });
    }
    return;
  }

  const organisation = sessionOrganisation(request);

  if (!organisation) {
    sendJson(response, 401, { error: "Authentication required" });
    return;
  }

  if (request.method === "GET" && path === "/auth/session") {
    sendJson(response, 200, {
      user: { email: auth.email, displayName: "Morgan Vale" },
      organisation: { id: organisation.id, name: organisation.name },
      role: scenario === "teacher-dashboard" ? "TEACHER" : "HEADTEACHER",
      yearGroups: scenario === "teacher-dashboard" ? [7, 8] : null,
      organisations: [auth.academy, auth.college].map(({ id, name }) => ({ id, name })),
    });
  } else if (request.method === "DELETE" && path === "/auth/session") {
    revokedTokens.add(request.headers.authorization?.replace(/^Bearer /, "") ?? "");
    response.writeHead(204).end();
  } else if (request.method === "PUT" && path === "/auth/session/organisation") {
    const body = await readBody(request) as { organisationId?: string } | undefined;
    const target = [auth.academy, auth.college].find(({ id }) => id === body?.organisationId);

    if (target) {
      sendJson(response, 200, { token: issueToken(target), expiresAt });
    } else {
      sendJson(response, 403, { error: "Not a member of this organisation" });
    }
  } else {
    sendJson(response, 404, { error: "Not found" });
  }
}

createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const [, first, second, third] = url.pathname.split("/");

  if (request.method === "GET" && first === "__health") {
    sendJson(response, 200, { status: "ok" });
  } else if (request.method === "PUT" && first === "__scenario" && isScenario(second)) {
    scenario = second;
    listDelay = Number(url.searchParams.get("listDelay") ?? 0);
    holdYearsForList = url.searchParams.has("holdYearsForList");
    received = [];
    authRequests = [];
    revokedTokens.clear();
    response.writeHead(204).end();
  } else if (request.method === "GET" && first === "__requests") {
    sendJson(response, 200, received);
  } else if (request.method === "GET" && first === "__auth-requests") {
    sendJson(response, 200, authRequests);
  } else if (first === "auth") {
    void authResponse(request, response, url.pathname);
  } else if (request.method === "GET" && first === "analytics" && !sessionOrganisation(request)) {
    sendJson(response, 401, { error: "Authentication required" });
  } else if (request.method === "GET" && first === "analytics") {
    analyticsResponse(response, url, sessionOrganisation(request)!);
  } else if (request.method === "GET" && first === "students" && !sessionOrganisation(request)) {
    sendJson(response, 401, { error: "Authentication required" });
  } else if (request.method === "GET" && first === "students") {
    received.push({
      path: url.pathname,
      academicYearStart: url.searchParams.get("academicYearStart"),
      sort: url.searchParams.get("sort"),
      limit: url.searchParams.get("limit"),
      q: url.searchParams.get("q"),
      cursor: url.searchParams.get("cursor"),
      requestId: request.headers["x-request-id"]?.toString() ?? null,
      authorization: request.headers.authorization ?? null,
    });
    if (second === "academic-years") {
      academicYearsResponse(response);
    } else if (!second) {
      releaseYears?.();
      studentsResponse(response, url);
    } else {
      studentResponse(response, url, second, third);
    }
  } else {
    sendJson(response, 404, { error: "Not found" });
  }
}).listen(port, "127.0.0.1");
