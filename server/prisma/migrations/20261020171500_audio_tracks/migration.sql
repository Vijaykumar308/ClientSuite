CREATE TABLE "project_audio_tracks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_audio_tracks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "project_assets"
ADD COLUMN "audioTrackId" TEXT,
ADD COLUMN "fileName" TEXT NOT NULL DEFAULT '';

UPDATE "project_assets"
SET "fileName" = "title";

INSERT INTO "project_audio_tracks" ("id", "tenantId", "projectId", "title", "createdAt", "updatedAt")
SELECT
    'audio-track-' || md5("tenantId" || ':' || "projectId" || ':' || "title"),
    "tenantId",
    "projectId",
    "title",
    MIN("createdAt"),
    MAX("updatedAt")
FROM "project_assets"
GROUP BY "tenantId", "projectId", "title";

UPDATE "project_assets" AS asset
SET "audioTrackId" = track."id"
FROM "project_audio_tracks" AS track
WHERE track."tenantId" = asset."tenantId"
  AND track."projectId" = asset."projectId"
  AND track."title" = asset."title";

WITH ranked_assets AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "audioTrackId"
            ORDER BY "versionNumber", "createdAt", "id"
        ) AS "newVersionNumber",
        ROW_NUMBER() OVER (
            PARTITION BY "audioTrackId"
            ORDER BY "versionNumber" DESC, "createdAt" DESC, "id" DESC
        ) AS "latestVersion"
    FROM "project_assets"
)
UPDATE "project_assets" AS asset
SET
    "versionNumber" = ranked."newVersionNumber",
    "isActiveVersion" = ranked."latestVersion" = 1
FROM ranked_assets AS ranked
WHERE asset."id" = ranked."id";

ALTER TABLE "project_assets"
ALTER COLUMN "audioTrackId" SET NOT NULL,
ALTER COLUMN "fileName" DROP DEFAULT;

CREATE INDEX "project_audio_tracks_tenantId_projectId_idx"
ON "project_audio_tracks"("tenantId", "projectId");

CREATE INDEX "project_assets_audioTrackId_idx"
ON "project_assets"("audioTrackId");

CREATE UNIQUE INDEX "project_assets_audioTrackId_versionNumber_key"
ON "project_assets"("audioTrackId", "versionNumber");

ALTER TABLE "project_audio_tracks"
ADD CONSTRAINT "project_audio_tracks_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "project_audio_tracks_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_assets"
ADD CONSTRAINT "project_assets_audioTrackId_fkey"
FOREIGN KEY ("audioTrackId") REFERENCES "project_audio_tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
