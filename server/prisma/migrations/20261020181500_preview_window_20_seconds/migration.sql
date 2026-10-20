UPDATE "tenants"
SET "maxPreviewSeconds" = 20;

ALTER TABLE "tenants"
ALTER COLUMN "maxPreviewSeconds" SET DEFAULT 20;

ALTER TABLE "project_assets"
ALTER COLUMN "previewDurationSeconds" SET DEFAULT 20;
