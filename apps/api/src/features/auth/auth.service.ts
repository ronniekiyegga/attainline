import { randomUUID } from "node:crypto";
import type * as authRepository from "./auth.repository.js";
import type { Actor, NewSession } from "./auth.repository.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createSessionToken, hashSessionToken } from "./session-token.js";

export const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
export const MAX_FAILED_SIGN_INS = 5;
export const FAILED_SIGN_IN_WINDOW_MS = 15 * 60 * 1000;
export const SIGN_IN_LOCKOUT_MS = 30 * 60 * 1000;

export type IssuedSession = {
  token: string;
  expiresAt: Date;
};

export type SignInResult =
  | { status: "signed-in"; session: IssuedSession }
  | { status: "locked"; retryAfterSeconds: number }
  | { status: "invalid-credentials" }
  | { status: "no-membership" };

export type OrganisationSwitchResult =
  | { status: "switched"; session: IssuedSession }
  | { status: "not-a-member" }
  | { status: "session-ended" };

type AuthServiceDependencies = {
  repository: typeof authRepository;
  now: () => Date;
};

export type AuthService = ReturnType<typeof createAuthService>;

export function createAuthService({ repository, now }: AuthServiceDependencies) {
  const unknownUserHash = hashPassword(randomUUID());

  function issueSession(userId: string, membershipId: string, createdAt: Date) {
    const token = createSessionToken();
    const record: NewSession = {
      tokenHash: hashSessionToken(token),
      userId,
      membershipId,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + SESSION_LIFETIME_MS),
    };

    return { issued: { token, expiresAt: record.expiresAt }, record };
  }

  async function signIn(email: string, password: string): Promise<SignInResult> {
    const attemptedAt = now();
    const lockedUntil = await repository.findLockedUntil(email);

    if (lockedUntil && lockedUntil > attemptedAt) {
      return {
        status: "locked",
        retryAfterSeconds: Math.ceil((lockedUntil.getTime() - attemptedAt.getTime()) / 1000),
      };
    }

    const user = await repository.findCredentials(email);
    const passwordMatches = await verifyPassword(
      password,
      user?.passwordHash ?? await unknownUserHash,
    );

    if (!user || !passwordMatches) {
      await repository.recordFailedSignIn(email, {
        now: attemptedAt,
        windowStartedAfter: new Date(attemptedAt.getTime() - FAILED_SIGN_IN_WINDOW_MS),
        lockedUntil: new Date(attemptedAt.getTime() + SIGN_IN_LOCKOUT_MS),
        maxFailures: MAX_FAILED_SIGN_INS,
      });
      return { status: "invalid-credentials" };
    }

    await repository.clearFailedSignIns(email);
    const membership = await repository.findDefaultMembership(user.id);

    if (!membership) {
      return { status: "no-membership" };
    }

    const { issued, record } = issueSession(user.id, membership.id, attemptedAt);
    await repository.createSession(record);
    return { status: "signed-in", session: issued };
  }

  async function authenticate(token: string): Promise<Actor | null> {
    const session = await repository.findActiveSession(hashSessionToken(token), now());

    if (!session) {
      return null;
    }

    const { membership } = session;

    return {
      sessionId: session.id,
      userId: session.userId,
      membershipId: membership.id,
      organisationId: membership.organisationId,
      role: membership.role,
      yearGroups: membership.role === "HEADTEACHER"
        ? null
        : membership.yearGroups.map(({ yearGroup }) => yearGroup),
    };
  }

  async function describeSession(actor: Actor) {
    const account = await repository.findAccount(actor.userId);
    const organisations = account.memberships.map(({ organisation }) => organisation);
    const organisation = organisations.find(({ id }) => id === actor.organisationId);

    if (!organisation) {
      throw new Error("Session organisation is not an active membership");
    }

    return {
      user: { email: account.email, displayName: account.displayName },
      organisation,
      role: actor.role,
      yearGroups: actor.yearGroups,
      organisations,
    };
  }

  async function switchOrganisation(
    actor: Actor,
    organisationId: string,
  ): Promise<OrganisationSwitchResult> {
    const membership = await repository.findMembership(actor.userId, organisationId);

    if (!membership) {
      return { status: "not-a-member" };
    }

    const { issued, record } = issueSession(actor.userId, membership.id, now());
    const replaced = await repository.replaceSession(actor.sessionId, record);

    return replaced ? { status: "switched", session: issued } : { status: "session-ended" };
  }

  async function signOut(actor: Actor): Promise<void> {
    await repository.revokeSession(actor.sessionId, now());
  }

  return { signIn, authenticate, describeSession, switchOrganisation, signOut };
}
