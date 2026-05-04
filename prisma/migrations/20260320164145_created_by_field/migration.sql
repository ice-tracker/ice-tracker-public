-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "CreatedBy" TEXT NOT NULL DEFAULT 'LUCE';

-- AlterTable
ALTER TABLE "Test_Report" ADD COLUMN     "CreatedBy" TEXT NOT NULL DEFAULT 'LUCE';
