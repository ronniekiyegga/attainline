import { database } from "../../database.js";
import type { MembershipRole } from "../../generated/prisma/client.js";

export type Actor = {
  sessionId: string;
  userId: string;
  membershipId: string;
  organisationId: string;
  role: MembershipRole;
  yearGroups: number[] | null;
};

export type TokenHash = Uint8Array<ArrayBuffer>;

export type NewSession = {
  tokenHash: TokenHash;
  userId: string;
  membershipId: string;
  createdAt: Date;
  expiresAt: Date;
};

export type FailedSignInPolicy = {
  now: Date;
  windowStartedAfter: Date;
  lockedUntil: Date;
  maxFailures: number;
};

const activeMembership = { status: "ACTIVE" } as const;

export async function findCredentials(email: string) {
  return database.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
}

export async function findLockedUntil(email: string): Promise<Date | null> {
  const throttle = await database.loginThrottle.findUnique({
    where: { email },
    select: { lockedUntil: true },
  });

  return throttle?.lockedUntil ?? null;
}

export async function recordFailedSignIn(
  email: string,
  { now, windowStartedAfter, lockedUntil, maxFailures }: FailedSignInPolicy,
): Promise<void> {
  await database.$executeRaw`
    INSERT INTO login_throttles AS throttle (email, failures, window_started_at)
    VALUES (${email}, 1, ${now})
    ON CONFLICT (email) DO UPDATE SET
      failures = CASE
        WHEN throttle.window_started_at <= ${windowStartedAfter} THEN 1
        ELSE throttle.failures + 1
      END,
      window_started_at = CASE
        WHEN throttle.window_started_at <= ${windowStartedAfter} THEN ${now}
        ELSE throttle.window_started_at
      END,
      locked_until = CASE
        WHEN throttle.window_started_at > ${windowStartedAfter}
          AND throttle.failures + 1 >= ${maxFailures}
          THEN ${lockedUntil}
        ELSE throttle.locked_until
      END`;
}

export async function clearFailedSignIns(email: string): Promise<void> {
  await database.loginThrottle.deleteMany({ where: { email } });
}

export async function findDefaultMembership(userId: string) {
  return database.organisationMembership.findFirst({
    where: { userId, ...activeMembership },
    orderBy: [{ organisation: { name: "asc" } }, { id: "asc" }],
    select: { id: true },
  });
}

export async function findMembership(userId: string, organisationId: string) {
  return database.organisationMembership.findFirst({
    where: { userId, organisationId, ...activeMembership },
    select: { id: true },
  });
}

export async function createSession(session: NewSession): Promise<void> {
  await database.session.create({ data: session, select: { id: true } });
}

export async function replaceSession(
  currentSessionId: string,
  replacement: NewSession,
): Promise<boolean> {
  return database.$transaction(async (transaction) => {
    const revoked = await transaction.session.updateMany({
      where: { id: currentSessionId, revokedAt: null },
      data: { revokedAt: replacement.createdAt },
    });

    if (revoked.count === 0) {
      return false;
    }

    await transaction.session.create({ data: replacement, select: { id: true } });
    return true;
  });
}

export async function revokeSession(sessionId: string, now: Date): Promise<void> {
  await database.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: now },
  });
}

export async function findActiveSession(tokenHash: TokenHash, now: Date) {
  return database.session.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: now },
      membership: activeMembership,
    },
    select: {
      id: true,
      userId: true,
      membership: {
        select: {
          id: true,
          organisationId: true,
          role: true,
          yearGroups: { select: { yearGroup: true }, orderBy: { yearGroup: "asc" } },
        },
      },
    },
  });
}

export async function findAccount(userId: string) {
  return database.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      email: true,
      displayName: true,
      memberships: {
        where: activeMembership,
        orderBy: [{ organisation: { name: "asc" } }, { id: "asc" }],
        select: { organisation: { select: { id: true, name: true } } },
      },
    },
  });
}
