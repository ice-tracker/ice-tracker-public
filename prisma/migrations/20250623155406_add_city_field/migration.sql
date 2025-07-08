/*
  Warnings:

  - Added the required column `City` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `City` to the `Test_Report` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "City" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Test_Report" ADD COLUMN     "City" TEXT NOT NULL;
