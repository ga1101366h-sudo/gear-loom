-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gears" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "category" TEXT NOT NULL,
    "effector_type" TEXT,
    "image_url" TEXT,
    "default_icon" TEXT,
    "author_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gears_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_gears" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gear_id" TEXT NOT NULL,
    "custom_image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_gears_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedalboards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "nodes" TEXT NOT NULL,
    "edges" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedalboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '名称未設定ボード',
    "nodes" TEXT NOT NULL,
    "edges" TEXT NOT NULL,
    "thumbnail" TEXT,
    "actual_photo_url" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_posts" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "photo_url" TEXT,
    "extra_images" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "gears_category_idx" ON "gears"("category");

-- CreateIndex
CREATE INDEX "gears_author_id_idx" ON "gears"("author_id");

-- CreateIndex
CREATE INDEX "user_gears_user_id_idx" ON "user_gears"("user_id");

-- CreateIndex
CREATE INDEX "user_gears_gear_id_idx" ON "user_gears"("gear_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_gears_user_id_gear_id_key" ON "user_gears"("user_id", "gear_id");

-- CreateIndex
CREATE INDEX "pedalboards_user_id_idx" ON "pedalboards"("user_id");

-- CreateIndex
CREATE INDEX "boards_user_id_idx" ON "boards"("user_id");

-- CreateIndex
CREATE INDEX "board_posts_board_id_idx" ON "board_posts"("board_id");

-- AddForeignKey
ALTER TABLE "gears" ADD CONSTRAINT "gears_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_gears" ADD CONSTRAINT "user_gears_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_gears" ADD CONSTRAINT "user_gears_gear_id_fkey" FOREIGN KEY ("gear_id") REFERENCES "gears"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedalboards" ADD CONSTRAINT "pedalboards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_posts" ADD CONSTRAINT "board_posts_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
