-- AlterTable
ALTER TABLE "users" ADD COLUMN     "custom_categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
