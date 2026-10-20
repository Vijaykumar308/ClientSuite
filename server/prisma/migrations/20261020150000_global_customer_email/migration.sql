CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

DROP INDEX "users_tenantId_email_key";
