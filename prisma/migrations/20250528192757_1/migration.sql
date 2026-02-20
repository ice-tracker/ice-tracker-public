/*
  Warnings:

  - You are about to drop the column `Description` on the `Verified` table. All the data in the column will be lost.
  - You are about to drop the column `Sec` on the `Verified` table. All the data in the column will be lost.
  - Added the required column `Address` to the `Verified` table without a default value. This is not possible if the table is not empty.
  - Added the required column `CourtHouseProbationReason` to the `Verified` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Email` to the `Verified` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ExtraInformation` to the `Verified` table without a default value. This is not possible if the table is not empty.
  - Added the required column `FollowUp` to the `Verified` table without a default value. This is not possible if the table is not empty.
  - Added the required column `HowICE` to the `Verified` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ImmigrationStatus` to the `Verified` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Location` to the `Verified` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Monitoring` to the `Verified` table without a default value. This is not possible if the table is not empty.
  - Added the required column `MonitoringType` to the `Verified` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Name` to the `Verified` table without a default value. This is not possible if the table is not empty.
  - Added the required column `PhoneNumber` to the `Verified` table without a default value. This is not possible if the table is not empty.
  - Added the required column `PoliceCustodyTime` to the `Verified` table without a default value. This is not possible if the table is not empty.
  - Added the required column `synthetic` to the `Verified` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Verified" DROP COLUMN "Description",
DROP COLUMN "Sec",
ADD COLUMN     "Address" TEXT NOT NULL,
ADD COLUMN     "CourtHouseProbationReason" TEXT NOT NULL,
ADD COLUMN     "Email" TEXT NOT NULL,
ADD COLUMN     "ExtraInformation" TEXT NOT NULL,
ADD COLUMN     "FollowUp" TEXT NOT NULL,
ADD COLUMN     "HowICE" TEXT NOT NULL,
ADD COLUMN     "ImmigrationStatus" TEXT NOT NULL,
ADD COLUMN     "Location" TEXT NOT NULL,
ADD COLUMN     "Monitoring" TEXT NOT NULL,
ADD COLUMN     "MonitoringType" TEXT NOT NULL,
ADD COLUMN     "Name" TEXT NOT NULL,
ADD COLUMN     "PhoneNumber" TEXT NOT NULL,
ADD COLUMN     "PoliceCustodyTime" INTEGER NOT NULL,
ADD COLUMN     "synthetic" BOOLEAN NOT NULL;
