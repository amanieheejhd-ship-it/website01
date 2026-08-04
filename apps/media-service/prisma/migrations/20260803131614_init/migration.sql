-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "checksum" TEXT NOT NULL DEFAULT '',
    "owner_context" TEXT NOT NULL,
    "owner_id" TEXT,
    "variants" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assets_owner_context_idx" ON "assets"("owner_context");
