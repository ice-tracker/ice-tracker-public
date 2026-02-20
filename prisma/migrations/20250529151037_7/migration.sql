/*
  Warnings:

  - You are about to drop the `Verified` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Verified";

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "Date" TEXT NOT NULL,
    "Latitude" DOUBLE PRECISION NOT NULL,
    "Longitude" DOUBLE PRECISION NOT NULL,
    "Time" TEXT NOT NULL,
    "Location" TEXT NOT NULL,
    "Activity" TEXT NOT NULL,
    "Sec" BOOLEAN NOT NULL DEFAULT false,
    "Description" TEXT,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);
