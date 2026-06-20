/*
  Warnings:

  - You are about to drop the column `openai_api_key` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "openai_api_key",
ADD COLUMN     "ai_api_key" TEXT;
