/*
  Warnings:

  - You are about to drop the column `Tactics` on the `Report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Report" DROP COLUMN "Tactics",
ADD COLUMN     "Tactic" TEXT;
