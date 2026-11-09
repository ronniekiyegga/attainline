import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, test, type TestContext } from "node:test";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/features/auth/password.js";
import { createSessionToken, hashSessionToken } from "../src/features/auth/session-token.js";
import { createStudentCursorCodec } from "../src/features/students/student.cursor.js";
import { listen, recordingLogger } from "./support/http.js";
import { studentRouter } from "./support/student-router.js";
import { requireLocalTestDatabase } from "./support/test-database.js";

requireLocalTestDatabase();

const { database } = await import("../src/database.js");
const authRepository = await import("../src/features/auth/auth.repository.js");
const { createAuthController } = await import("../src/features/auth/auth.controller.js");
const { createAuthRouter } = await import("../src/features/auth/auth.routes.js");
const {
  createAuthService,
  FAILED_SIGN_IN_WINDOW_MS,
  MAX_FAILED_SIGN_INS,
} = await import("../src/features/auth/auth.service.js");
const { createSessionGuard } = await import("../src/features/auth/require-session.js");
const studentRepository = await import("../src/features/students/student.repository.js");

const PASSWORD = "synthetic-test-password";
const YEAR = 2026;

after(() => database.$disconnect());

type Role = "HEADTEACHER" | "HEAD_OF_YEAR" | "TEACHER";

type World = {
  academyId: string;
  collegeId: string;
  outsiderOrganisationId: string;
  email: (name: string) => string;
  students: Record<string, string>;
};

function authService() {
  return createAuthService({ repository: authRepository, now: () => new Date() });
}

async function startApi(context: TestContext) {
  const { logger } = recordingLogger();
  const service = authService();
  const requireSession = createSessionGuard({ authenticate: service.authenticate, logger });

  const app = createApp({
    checkDatabase: async () => {},
    logger,
    requireSession,
    authRouter: createAuthRouter({
      controller: createAuthController({ service, logger }),
      requireSession,
    }),
    studentRouter: studentRouter({
      queryStudents: studentRepository.listStudents,
      queryStudent: studentRepository.findStudent,
      queryAcademicYearStarts: studentRepository.listAcademicYearStarts,
      cursorCodec: createStudentCursorCodec(randomBytes(32)),
      logger,
    }),
  });

  return listen(context, app);
}

async function createWorld(): Promise<World & { cleanup: () => Promise<void> }> {
  const run = randomUUID().slice(0, 8);
  const academyId = randomUUID();
  const collegeId = randomUUID();
  const outsiderOrganisationId = randomUUID();
  const organisationIds = [academyId, collegeId, outsiderOrganisationId];
  const email = (name: string) => `${name}.${run}@example.test`;
  const passwordHash = await hashPassword(PASSWORD);

  await database.organisation.createMany({
    data: [
      { id: academyId, name: `Synthetic Auth Academy ${run}` },
      { id: collegeId, name: `Synthetic Auth College ${run}` },
      { id: outsiderOrganisationId, name: `Synthetic Outsider School ${run}` },
    ],
  });

  async function staff(
    name: string,
    memberships: { organisationId: string; role: Role; yearGroups?: number[]; status?: "ACTIVE" | "SUSPENDED" }[],
  ) {
    const user = await database.user.create({
      data: { email: email(name), displayName: `Synthetic ${name}`, passwordHash },
      select: { id: true },
    });

    for (const { organisationId, role, yearGroups = [], status = "ACTIVE" } of memberships) {
      await database.organisationMembership.create({
        data: {
          userId: user.id,
          organisationId,
          role,
          status,
          yearGroups: { create: yearGroups.map((yearGroup) => ({ yearGroup })) },
        },
      });
    }
  }

  await staff("head", [
    { organisationId: academyId, role: "HEADTEACHER" },
    { organisationId: collegeId, role: "HEADTEACHER" },
    { organisationId: outsiderOrganisationId, role: "HEADTEACHER", status: "SUSPENDED" },
  ]);
  await staff("hoy", [{ organisationId: academyId, role: "HEAD_OF_YEAR", yearGroups: [9] }]);
  await staff("unassigned", [{ organisationId: academyId, role: "TEACHER" }]);
  await staff("suspended", [{ organisationId: academyId, role: "TEACHER", status: "SUSPENDED" }]);

  const students: Record<string, string> = {};

  for (const [key, organisationId, yearGroup, surname] of [
    ["academyYear8", academyId, 8, "Ashcombe"],
    ["academyYear9", academyId, 9, "Brimley"],
    ["collegeYear9", collegeId, 9, "Caldew"],
  ] as const) {
    const student = await database.student.create({
      data: { organisationId, institutionStudentRef: `AUTH-${key}`, surname },
      select: { id: true },
    });
    await database.studentEnrolment.create({
      data: { organisationId, studentId: student.id, academicYearStart: YEAR, yearGroup },
    });
    students[key] = student.id;
  }

  await database.studentEnrolment.create({
    data: {
      organisationId: academyId,
      studentId: students.academyYear8,
      academicYearStart: YEAR - 1,
      yearGroup: 7,
    },
  });

  async function cleanup() {
    const users = { email: { endsWith: `.${run}@example.test` } };
    await database.organisationMembership.deleteMany({ where: { user: users } });
    await database.user.deleteMany({ where: users });
    await database.loginThrottle.deleteMany({ where: users });
    await database.studentEnrolment.deleteMany({ where: { organisationId: { in: organisationIds } } });
    await database.student.deleteMany({ where: { organisationId: { in: organisationIds } } });
    await database.organisation.deleteMany({ where: { id: { in: organisationIds } } });
  }

  return { academyId, collegeId, outsiderOrganisationId, email, students, cleanup };
}

function signIn(url: string, email: string, password = PASSWORD, headers: Record<string, string> = {}) {
  return fetch(`${url}/auth/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ email, password }),
  });
}

async function tokenFor(url: string, email: string): Promise<string> {
  const response = await signIn(url, email);
  assert.equal(response.status, 201);
  return (await response.json()).token;
}

function get(url: string, path: string, token?: string) {
  return fetch(`${url}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function visibleSurnames(url: string, token: string): Promise<string[]> {
  const response = await get(url, `/students?academicYearStart=${YEAR}`, token);
  assert.equal(response.status, 200);
  return (await response.json()).items.map((item: { surname: string }) => item.surname);
}

async function withWorld(context: TestContext, run: (url: string, world: World) => Promise<void>) {
  const url = await startApi(context);
  const world = await createWorld();

  try {
    await run(url, world);
  } finally {
    await world.cleanup();
  }
}

test("signs in, describes the session and keeps only a digest of the token", (context) =>
  withWorld(context, async (url, world) => {
    const before = Date.now();
    const response = await signIn(url, `  ${world.email("head").toUpperCase()} `);

    assert.equal(response.status, 201);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const { token, expiresAt } = await response.json();
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    const lifetime = Date.parse(expiresAt) - before;
    assert.ok(lifetime > 8 * 60 * 60 * 1000 - 60_000 && lifetime <= 8 * 60 * 60 * 1000 + 60_000);

    const stored = await database.session.findMany({
      where: { membership: { organisationId: world.academyId } },
      select: { tokenHash: true },
    });
    assert.deepEqual(
      stored.map(({ tokenHash }) => Buffer.from(tokenHash).toString("hex")),
      [Buffer.from(hashSessionToken(token)).toString("hex")],
    );

    const session = await get(url, "/auth/session", token);
    assert.equal(session.status, 200);
    const body = await session.json();
    assert.deepEqual(body.user, { email: world.email("head"), displayName: "Synthetic head" });
    assert.equal(body.organisation.id, world.academyId);
    assert.equal(body.role, "HEADTEACHER");
    assert.equal(body.yearGroups, null);
    assert.deepEqual(
      body.organisations.map(({ id }: { id: string }) => id),
      [world.academyId, world.collegeId],
    );
  }));

test("gives the same answer for a wrong password and an unknown account", (context) =>
  withWorld(context, async (url, world) => {
    const wrongPassword = await signIn(url, world.email("head"), "not-the-password");
    const unknownAccount = await signIn(url, world.email("nobody"));

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownAccount.status, 401);
    assert.deepEqual(await wrongPassword.json(), await unknownAccount.json());
  }));

test("rejects sign-in bodies that try to choose the role or organisation", (context) =>
  withWorld(context, async (url, world) => {
    for (const body of [
      JSON.stringify({ email: world.email("hoy"), password: PASSWORD, role: "HEADTEACHER" }),
      JSON.stringify({ email: world.email("hoy"), password: PASSWORD, organisationId: world.collegeId }),
      "{not json",
      JSON.stringify({ email: world.email("hoy") }),
    ]) {
      const response = await fetch(`${url}/auth/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      assert.equal(response.status, 400, body);
    }

    assert.equal(
      await database.session.count({ where: { membership: { user: { email: world.email("hoy") } } } }),
      0,
    );
  }));

test("locks an account after repeated failures, including concurrent ones", (context) =>
  withWorld(context, async (url, world) => {
    const email = world.email("head");

    const failures = await Promise.all(
      Array.from({ length: MAX_FAILED_SIGN_INS }, () => signIn(url, email, "wrong")),
    );
    assert.deepEqual(failures.map(({ status }) => status), Array(5).fill(401));

    const locked = await signIn(url, email);
    assert.equal(locked.status, 429);
    const retryAfter = Number(locked.headers.get("retry-after"));
    assert.ok(retryAfter > 29 * 60 && retryAfter <= 30 * 60);

    await database.loginThrottle.update({
      where: { email },
      data: { lockedUntil: new Date(Date.now() - 1000), windowStartedAt: new Date(0) },
    });

    assert.equal((await signIn(url, email)).status, 201);
    assert.equal(await database.loginThrottle.count({ where: { email } }), 0);
  }));

test("starts a new failure window once the previous one has passed", (context) =>
  withWorld(context, async (url, world) => {
    const email = world.email("hoy");

    for (let attempt = 0; attempt < 4; attempt++) {
      assert.equal((await signIn(url, email, "wrong")).status, 401);
    }

    await database.loginThrottle.update({
      where: { email },
      data: { windowStartedAt: new Date(Date.now() - FAILED_SIGN_IN_WINDOW_MS - 1000) },
    });

    assert.equal((await signIn(url, email, "wrong")).status, 401);
    const throttle = await database.loginThrottle.findUniqueOrThrow({ where: { email } });
    assert.equal(throttle.failures, 1);
    assert.equal(throttle.lockedUntil, null);
  }));

test("refuses accounts without an active membership", (context) =>
  withWorld(context, async (url, world) => {
    const response = await signIn(url, world.email("suspended"));

    assert.equal(response.status, 403);
    assert.equal(
      await database.session.count({ where: { membership: { user: { email: world.email("suspended") } } } }),
      0,
    );
  }));

test("rejects requests without a valid session before reaching student data", (context) =>
  withWorld(context, async (url) => {
    for (const authorization of [
      undefined,
      "Bearer",
      `Bearer ${createSessionToken()}`,
      `Basic ${Buffer.from("head:password").toString("base64")}`,
    ]) {
      const response = await fetch(`${url}/students/academic-years`, {
        headers: authorization ? { Authorization: authorization } : {},
      });
      assert.equal(response.status, 401, String(authorization));
      assert.deepEqual(await response.json(), { error: "Authentication required" });
    }

    const cookieOnly = await fetch(`${url}/students/academic-years`, {
      headers: { Cookie: `attainline_session=${createSessionToken()}` },
    });
    assert.equal(cookieOnly.status, 401);
  }));

test("sign-out, expiry and suspension each end a session", (context) =>
  withWorld(context, async (url, world) => {
    const signedOut = await tokenFor(url, world.email("head"));
    const signOut = await fetch(`${url}/auth/session`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${signedOut}` },
    });
    assert.equal(signOut.status, 204);
    assert.equal((await get(url, "/auth/session", signedOut)).status, 401);
    assert.equal((await get(url, `/students?academicYearStart=${YEAR}`, signedOut)).status, 401);

    const expired = await tokenFor(url, world.email("head"));
    await database.session.updateMany({
      where: { tokenHash: hashSessionToken(expired) },
      data: { expiresAt: new Date(Date.now() - 1000), createdAt: new Date(Date.now() - 2000) },
    });
    assert.equal((await get(url, "/students/academic-years", expired)).status, 401);

    const suspended = await tokenFor(url, world.email("hoy"));
    assert.equal((await get(url, "/students/academic-years", suspended)).status, 200);
    await database.organisationMembership.updateMany({
      where: { user: { email: world.email("hoy") } },
      data: { status: "SUSPENDED" },
    });
    assert.equal((await get(url, "/students/academic-years", suspended)).status, 401);
  }));

test("keeps every session inside its own organisation", (context) =>
  withWorld(context, async (url, world) => {
    const token = await tokenFor(url, world.email("head"));

    assert.deepEqual(await visibleSurnames(url, token), ["Ashcombe", "Brimley"]);

    const foreignStudent = await get(
      url,
      `/students/${world.students.collegeYear9}?academicYearStart=${YEAR}`,
      token,
    );
    assert.equal(foreignStudent.status, 404);

    for (const path of [
      `/students?academicYearStart=${YEAR}&organisationId=${world.collegeId}`,
      `/students/academic-years?organisationId=${world.collegeId}`,
    ]) {
      assert.equal((await get(url, path, token)).status, 400, path);
    }

    const forgedHeader = await fetch(`${url}/students?academicYearStart=${YEAR}`, {
      headers: { Authorization: `Bearer ${token}`, "X-Organisation-Id": world.collegeId },
    });
    assert.deepEqual(
      (await forgedHeader.json()).items.map(({ surname }: { surname: string }) => surname),
      ["Ashcombe", "Brimley"],
    );
  }));

test("limits heads of year and teachers to their assigned year groups", (context) =>
  withWorld(context, async (url, world) => {
    const headOfYear = await tokenFor(url, world.email("hoy"));

    assert.deepEqual(await visibleSurnames(url, headOfYear), ["Brimley"]);
    assert.deepEqual(
      await (await get(url, "/students/academic-years", headOfYear)).json(),
      { academicYearStarts: [YEAR] },
    );
    assert.equal(
      (await get(url, `/students/${world.students.academyYear8}?academicYearStart=${YEAR}`, headOfYear)).status,
      404,
    );
    assert.equal(
      (await get(url, `/students/${world.students.academyYear9}?academicYearStart=${YEAR}`, headOfYear)).status,
      200,
    );
    const description = await (await get(url, "/auth/session", headOfYear)).json();
    assert.equal(description.role, "HEAD_OF_YEAR");
    assert.deepEqual(description.yearGroups, [9]);

    const unassigned = await tokenFor(url, world.email("unassigned"));
    assert.deepEqual(await visibleSurnames(url, unassigned), []);
    assert.deepEqual(
      await (await get(url, "/students/academic-years", unassigned)).json(),
      { academicYearStarts: [] },
    );
  }));

test("switches organisation only to an active membership and rotates the token", (context) =>
  withWorld(context, async (url, world) => {
    const original = await tokenFor(url, world.email("head"));

    async function switchTo(token: string, organisationId: string) {
      return fetch(`${url}/auth/session/organisation`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ organisationId }),
      });
    }

    assert.equal((await switchTo(original, world.outsiderOrganisationId)).status, 403);
    assert.equal((await switchTo(original, randomUUID())).status, 403);

    const headOfYear = await tokenFor(url, world.email("hoy"));
    assert.equal((await switchTo(headOfYear, world.collegeId)).status, 403);
    assert.deepEqual(await visibleSurnames(url, headOfYear), ["Brimley"]);

    const switched = await switchTo(original, world.collegeId);
    assert.equal(switched.status, 200);
    const { token: rotated } = await switched.json();
    assert.notEqual(rotated, original);

    assert.equal((await get(url, "/auth/session", original)).status, 401);
    assert.deepEqual(await visibleSurnames(url, rotated), ["Caldew"]);
    assert.equal((await switchTo(original, world.academyId)).status, 401);
  }));

test("does not replace a session revoked after it was authenticated", (context) =>
  withWorld(context, async (url, world) => {
    const service = authService();
    const token = await tokenFor(url, world.email("head"));
    const actor = await service.authenticate(token);
    assert.ok(actor);

    await service.signOut(actor);

    assert.deepEqual(await service.switchOrganisation(actor, world.collegeId), {
      status: "session-ended",
    });
    assert.equal(
      await database.session.count({ where: { userId: actor.userId, revokedAt: null } }),
      0,
    );
  }));

test("refuses state changes sent by a browser", (context) =>
  withWorld(context, async (url, world) => {
    const fromBrowser = await signIn(url, world.email("head"), PASSWORD, {
      Origin: "https://attacker.example",
    });
    assert.equal(fromBrowser.status, 403);

    const token = await tokenFor(url, world.email("head"));
    const crossSiteSignOut = await fetch(`${url}/auth/session`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "Sec-Fetch-Site": "cross-site" },
    });
    assert.equal(crossSiteSignOut.status, 403);
    assert.equal((await get(url, "/auth/session", token)).status, 200);
  }));
