# Authentication and sessions

Status: accepted for the synthetic demo.

## Requirement

Staff sign in, act within one school at a time and see only the students
their role allows. A user can belong to several schools. The student
directory API must enforce this itself, including for requests that do
not come through the web app.

EduFeedbackPro kept identity in NextAuth JWTs carrying tenant claims, with
a per-user version number to invalidate them, and checked memberships in
the Next.js server. Its membership model (users separate from
memberships, a role per membership, year-group scopes for heads of year,
8-hour sessions and a per-email sign-in lockout) is kept. Its stateless
tokens, OAuth providers, self-service sign-up and capability catalogue are
not.

## Decision

Express is the only authentication authority. It stores users,
memberships, year-group assignments and sessions in PostgreSQL.

A session is a random 32-byte token. Only its SHA-256 digest is stored, so
a copy of the sessions table cannot be replayed. Each record names one
membership, which fixes the school, role and year groups for that token.
Every protected request reloads the record and its membership, so
sign-out, expiry and suspension take effect on the next request.

A composite foreign key ties each session to a membership of the same
user. Switching school revokes the current session and issues a new one
in a single transaction; a session revoked between authentication and the
switch is not replaced.

Passwords use scrypt (N=2^15, r=8, p=1) from Node's standard library. An
unknown email is checked against a throwaway hash, so both failure paths
do the same work and return the same response. Failed attempts are
counted per normalised email in one `INSERT … ON CONFLICT` statement, so
concurrent attempts cannot undercount.

Next.js holds the token in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie
and forwards it as `Authorization: Bearer`. It never decides access: a
forwarded token that Express rejects sends the user to sign-in.

The session's membership becomes a student access scope that every
student query applies in its `WHERE` clause: the school, plus the year
groups for heads of year and teachers. A student outside that scope looks
the same as a student that does not exist.

The session is read inside Suspense boundaries, in the account panel and
in the directory's data calls, rather than at the top of the dashboard
layout. That keeps the static shell prerendered and avoids putting the
session lookup in front of the directory's own API requests.

## Sign-in page

The page reproduces EduFeedbackPro's sign-in markup and measurements. It
was compared with the original rendered at 1440×900 and 390×844, element by
element. The header, role cards and form fields match pixel for pixel
apart from the deliberate changes below.

- The role cards select a demo account and fill its email address. In
  EduFeedbackPro they chose the landing page and, in development only,
  filled demo credentials.
- The Google and Microsoft buttons, the "OR" divider and the sign-up link
  are not shown, because OAuth and self-service sign-up are not
  implemented. The form column is therefore shorter and centred lower.
- The left panel shows the original's static gradient. Its background
  image, testimonial quotes and avatar photographs are not published until
  their source and licence are confirmed.
- The subtitle and card descriptions use zinc-500 instead of zinc-400,
  which had 2.6:1 contrast; zinc-500 has 4.8:1.
- Errors appear inline with `role="alert"` instead of in a toast.
- Card transitions use CSS with the original's 200 ms easing instead of
  framer-motion, so the page needs no animation library.

## CSRF

Sign-in, sign-out and school switching are Next.js Server Actions. They
accept only POST, and Next.js rejects them when `Origin` does not match
the host. The session cookie is `SameSite=Lax`. Express adds a third layer:
it rejects any state-changing request that carries `Origin` or
`Sec-Fetch-Site`, because only the Next.js server, which sends neither,
should call it.

## Alternatives considered

- Auth.js in Next.js: would make the web server the authority, and Express
  would have to trust identity claims from it.
- Signed stateless tokens (JWT): sign-out and suspension would need a
  revocation list or version check anyway, which brings back the database
  lookup without its simplicity.
- A cookie set directly by Express: the browser would need to reach the
  API, adding a second public origin and its CORS and CSRF surface.
- bcrypt or argon2 packages: would add a native dependency for no
  difference that matters at this scale.

## Limits

- Throttling is per email only. Per-address or per-network limits need a
  trusted client IP from the hosting proxy, which is not configured.
- A known email can be locked out by someone else for 30 minutes.
- Expired and revoked sessions are not cleaned up; rows accumulate until
  a retention job exists.
- If the API is unreachable during sign-out, the cookie is cleared but the
  server-side session stays valid until it expires.
- There is no password reset, account management, MFA or audit log.
  Accounts come only from the demo seed.
- Roles are fixed to headteacher, head of year and teacher, one per
  membership. Year groups follow each academic year's placement, so a head
  of year's students change when a cohort moves up.
