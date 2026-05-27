/*
  Warnings:

  - You are about to drop the column `category` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "category",
ADD COLUMN     "financial_category" TEXT,
ADD COLUMN     "source_category" TEXT;
