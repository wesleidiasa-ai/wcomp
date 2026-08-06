-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "max_users" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password_reset_expires_at" TIMESTAMP(3),
ADD COLUMN     "password_reset_token_hash" TEXT;

