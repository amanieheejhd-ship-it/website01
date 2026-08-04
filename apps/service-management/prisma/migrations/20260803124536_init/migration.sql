-- CreateTable
CREATE TABLE "service_offerings" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT '',
    "hero_media_id" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "offering_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_tiers" (
    "id" TEXT NOT NULL,
    "offering_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_from" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "unit" TEXT NOT NULL DEFAULT '',
    "inclusions" TEXT[],

    CONSTRAINT "pricing_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_offerings_slug_key" ON "service_offerings"("slug");

-- CreateIndex
CREATE INDEX "features_offering_id_idx" ON "features"("offering_id");

-- CreateIndex
CREATE INDEX "pricing_tiers_offering_id_idx" ON "pricing_tiers"("offering_id");

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "service_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_tiers" ADD CONSTRAINT "pricing_tiers_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "service_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
