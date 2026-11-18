-- CreateEnum
CREATE TYPE "membership_role" AS ENUM ('HEADTEACHER', 'HEAD_OF_YEAR', 'TEACHER');

-- CreateEnum
CREATE TYPE "membership_status" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "membership_role" NOT NULL,
    "status" "membership_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organisation_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_year_groups" (
    "membership_id" UUID NOT NULL,
    "year_group" INTEGER NOT NULL,

    CONSTRAINT "membership_year_groups_pkey" PRIMARY KEY ("membership_id","year_group")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_hash" BYTEA NOT NULL,
    "user_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_throttles" (
    "email" TEXT NOT NULL,
    "failures" INTEGER NOT NULL,
    "window_started_at" TIMESTAMPTZ(3) NOT NULL,
    "locked_until" TIMESTAMPTZ(3),

    CONSTRAINT "login_throttles_pkey" PRIMARY KEY ("email")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "organisation_memberships_organisation_id_idx" ON "organisation_memberships"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_memberships_user_id_organisation_id_key" ON "organisation_memberships"("user_id", "organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "organisation_memberships_user_id_id_key" ON "organisation_memberships"("user_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_membership_id_idx" ON "sessions"("membership_id");

-- AddForeignKey
ALTER TABLE "organisation_memberships" ADD CONSTRAINT "organisation_memberships_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "organisation_memberships" ADD CONSTRAINT "organisation_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "membership_year_groups" ADD CONSTRAINT "membership_year_groups_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "organisation_memberships"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_membership_id_fkey" FOREIGN KEY ("user_id", "membership_id") REFERENCES "organisation_memberships"("user_id", "id") ON DELETE CASCADE ON UPDATE RESTRICT;


ALTER TABLE users
  ADD CONSTRAINT users_email_normalised
  CHECK (email = lower(btrim(email)) AND position('@' IN email) > 1),
  ADD CONSTRAINT users_display_name_not_blank
  CHECK (length(btrim(display_name)) > 0);

ALTER TABLE membership_year_groups
  ADD CONSTRAINT membership_year_groups_year_group_positive
  CHECK (year_group > 0);

ALTER TABLE sessions
  ADD CONSTRAINT sessions_token_hash_length
  CHECK (octet_length(token_hash) = 32),
  ADD CONSTRAINT sessions_expire_after_creation
  CHECK (expires_at > created_at);

ALTER TABLE login_throttles
  ADD CONSTRAINT login_throttles_failures_positive
  CHECK (failures > 0);
