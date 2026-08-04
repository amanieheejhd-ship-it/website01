-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "seo_title" TEXT NOT NULL DEFAULT '',
    "seo_description" TEXT NOT NULL DEFAULT '',
    "seo_og_image_media_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "media_refs" TEXT[],

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "quote" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "avatar_media_id" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "sections_page_id_idx" ON "sections"("page_id");

-- CreateIndex
CREATE UNIQUE INDEX "sections_page_id_order_key" ON "sections"("page_id", "order");

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
