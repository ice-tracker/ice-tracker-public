/*
  Warnings:

  - A unique constraint covering the columns `[LogID]` on the table `Report` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[LogID]` on the table `Test_Report` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Arrest" ALTER COLUMN "ApprehensionSiteLandmark" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Detainer" ALTER COLUMN "FacilityCity" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "LogID" TEXT;

-- AlterTable
ALTER TABLE "Test_Report" ADD COLUMN     "LogID" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Report_LogID_key" ON "Report"("LogID");

-- CreateIndex
CREATE UNIQUE INDEX "Test_Report_LogID_key" ON "Test_Report"("LogID");
