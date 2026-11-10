CREATE TABLE "calendar_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "created_by_membership_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "year_group" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "calendar_events_time_order" CHECK ("ends_at" > "starts_at"),
    CONSTRAINT "calendar_events_year_group_range" CHECK ("year_group" IS NULL OR "year_group" BETWEEN 1 AND 14)
);

CREATE INDEX "calendar_events_organisation_id_starts_at_id_idx" ON "calendar_events"("organisation_id", "starts_at", "id");
CREATE INDEX "calendar_events_created_by_membership_id_idx" ON "calendar_events"("created_by_membership_id");

ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_membership_id_fkey" FOREIGN KEY ("created_by_membership_id") REFERENCES "organisation_memberships"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE "notification_reads" (
    "organisation_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "notification_key" VARCHAR(160) NOT NULL,
    "read_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("membership_id", "notification_key")
);

CREATE INDEX "notification_reads_organisation_id_membership_id_idx" ON "notification_reads"("organisation_id", "membership_id");

ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "organisation_memberships"("id") ON DELETE CASCADE ON UPDATE RESTRICT;
