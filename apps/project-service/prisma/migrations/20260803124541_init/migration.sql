-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "category_id" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "year" INTEGER NOT NULL,
    "cover_media_id" TEXT,
    "gallery_media_ids" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "metrics_area" TEXT,
    "metrics_duration_months" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_category_id_idx" ON "projects"("category_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_featured_idx" ON "projects"("featured");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
