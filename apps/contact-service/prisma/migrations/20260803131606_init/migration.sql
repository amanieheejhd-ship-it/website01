-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'website',
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contact_submissions_idempotency_key_key" ON "contact_submissions"("idempotency_key");

-- CreateIndex
CREATE INDEX "contact_submissions_status_idx" ON "contact_submissions"("status");
