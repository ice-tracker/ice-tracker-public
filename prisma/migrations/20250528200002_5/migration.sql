/*
  Warnings:

  - You are about to drop the column `Address` on the `Verified` table. All the data in the column will be lost.
  - You are about to drop the column `CourtHouseProbationReason` on the `Verified` table. All the data in the column will be lost.
  - You are about to drop the column `Email` on the `Verified` table. All the data in the column will be lost.
  - You are about to drop the column `ExtraInformation` on the `Verified` table. All the data in the column will be lost.
  - You are about to drop the column `FollowUp` on the `Verified` table. All the data in the column will be lost.
  - You are about to drop the column `HowICE` on the `Verified` table. All the data in the column will be lost.
  - You are about to drop the column `ImmigrationStatus` on the `Verified` table. All the data in the column will be lost.
  - You are about to drop the column `Location` on the `Verified` table. All the data in the column will be lost.
  - You are about to drop the column `Monitoring` on the `Verified` table. All the data in the column will be lost.
  - You are about to drop the column `MonitoringType` on the `Verified` table. All the data in the column will be lost.
  - You are about to drop the column `Name` on the `Verified` table. All the data in the column will be lost.
  - You are about to drop the column `PhoneNumber` on the `Verified` table. All the data in the column will be lost.
  - You are about to drop the column `PoliceCustodyTime` on the `Verified` table. All the data in the column will be lost.
  - You are about to drop the column `synthetic` on the `Verified` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Verified" DROP COLUMN "Address",
DROP COLUMN "CourtHouseProbationReason",
DROP COLUMN "Email",
DROP COLUMN "ExtraInformation",
DROP COLUMN "FollowUp",
DROP COLUMN "HowICE",
DROP COLUMN "ImmigrationStatus",
DROP COLUMN "Location",
DROP COLUMN "Monitoring",
DROP COLUMN "MonitoringType",
DROP COLUMN "Name",
DROP COLUMN "PhoneNumber",
DROP COLUMN "PoliceCustodyTime",
DROP COLUMN "synthetic",
ADD COLUMN     "Description" TEXT,
ALTER COLUMN "Sec" SET DEFAULT false;
