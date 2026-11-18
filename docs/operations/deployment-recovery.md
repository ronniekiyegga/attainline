# Release recovery

This procedure applies only to the synthetic Attainline demonstration.

## Release check

1. Confirm GitHub CI passed for the exact commit being released.
2. Apply `prisma migrate deploy` through the target's controlled release process.
3. Confirm the target `/health` endpoint returns `200 {"status":"ready"}`.
4. Run the portable smoke journey from the repository root:

   ```bash
   DEMO_BASE_URL="https://<target-host>" pnpm --filter @attainline/web test:smoke
   ```

The smoke test accepts only a `.example.test` account, signs in, opens the
dashboard, analytics, rankings, directory and a student profile, then signs
out. Its traces must not be published because they can contain a short-lived
synthetic session cookie.

## Failed application release

Keep the last verified version available until a candidate passes startup,
`/health` and the smoke journey. Inspect a failure using request IDs and
structured event names. If a newly active version fails, restore the previous
immutable build or revision, then rerun `/health` and the smoke test.

An application rollback reuses an earlier build artifact. It does not reverse
database changes.

## Failed migration

Run `prisma migrate deploy` before starting the new API revision. A failed
command must block the release, but statements that PostgreSQL committed before
the failure may remain. Do not blindly run a down migration or edit migration
history.

1. Stop the release and inspect the Prisma and PostgreSQL errors.
2. Determine whether the migration is fully unapplied, fully applied, or
   partially applied.
3. Prefer a forward corrective migration that remains compatible with the
   currently running application.
4. Apply and validate the correction in an isolated database before another
   release attempt.

Destructive schema changes require a separate expand-and-contract release and
a tested backup. The current migrations are additive; no automatic database
rollback is configured.

## Database unavailable or corrupted

If `/health` returns `503`, first distinguish connectivity or capacity failure
from data loss using the API's `readiness.check_failed` event and the database
service status. Do not invoke the local synthetic seed as a general recovery
action.

For data loss, restore an approved point-in-time recovery or logical backup into
a new isolated database, validate migrations and expected synthetic record
counts, then point the API at that recovered instance. After switching, rerun
the readiness and smoke checks before retiring the old database.

## Monitoring boundary

The application emits JSON error events containing a request ID, error class or
safe database classification, and no request body, credentials or session
token. An external error or log service is intentionally not selected in code;
its data retention, redaction and cost require approval before connection.
