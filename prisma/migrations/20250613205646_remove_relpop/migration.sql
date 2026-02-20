/*
  Warnings:

  - You are about to drop the column `RelativePopulation` on the `Report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Report" DROP COLUMN "RelativePopulation",
ADD COLUMN     "TotalPopulation" INTEGER NOT NULL DEFAULT 0;
