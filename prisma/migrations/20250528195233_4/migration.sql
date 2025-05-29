/*
  Warnings:

  - You are about to drop the `Verified2` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Verified2";

-- CreateTable
CREATE TABLE "Verified" (
    "id" SERIAL NOT NULL,
    "Sec" BOOLEAN NOT NULL,
    "Date" TEXT NOT NULL,
    "Location" TEXT NOT NULL,
    "CourtHouseProbationReason" TEXT NOT NULL,
    "PoliceCustodyTime" INTEGER NOT NULL,
    "Address" TEXT NOT NULL,
    "Latitude" DOUBLE PRECISION NOT NULL,
    "Longitude" DOUBLE PRECISION NOT NULL,
    "ImmigrationStatus" TEXT NOT NULL,
    "ExtraInformation" TEXT NOT NULL,
    "Monitoring" TEXT NOT NULL,
    "MonitoringType" TEXT NOT NULL,
    "HowICE" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "PhoneNumber" TEXT NOT NULL,
    "FollowUp" TEXT NOT NULL,
    "synthetic" BOOLEAN NOT NULL,

    CONSTRAINT "Verified_pkey" PRIMARY KEY ("id")
);
