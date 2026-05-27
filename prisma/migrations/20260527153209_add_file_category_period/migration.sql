-- AlterTable
ALTER TABLE "files" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "period" TEXT;
