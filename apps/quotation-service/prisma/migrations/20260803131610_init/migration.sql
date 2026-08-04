-- CreateTable
CREATE TABLE "quotation_requests" (
    "id" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "service_slugs" TEXT[],
    "project_type" TEXT NOT NULL DEFAULT '',
    "budget_min" INTEGER,
    "budget_max" INTEGER,
    "budget_currency" TEXT,
    "timeline" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "attachments" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'requested',
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_line_items" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unit_price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',

    CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotation_requests_idempotency_key_key" ON "quotation_requests"("idempotency_key");

-- CreateIndex
CREATE INDEX "quotation_requests_status_idx" ON "quotation_requests"("status");

-- CreateIndex
CREATE INDEX "quote_line_items_quotation_id_idx" ON "quote_line_items"("quotation_id");

-- AddForeignKey
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
