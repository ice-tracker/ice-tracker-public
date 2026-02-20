-- CreateTable
CREATE TABLE "Test_Report" (
    "id" SERIAL NOT NULL,
    "Date" TEXT NOT NULL,
    "Latitude" DOUBLE PRECISION NOT NULL,
    "Longitude" DOUBLE PRECISION NOT NULL,
    "Time" TEXT,
    "Location" TEXT NOT NULL,
    "Activity" TEXT NOT NULL,
    "Sec" BOOLEAN NOT NULL DEFAULT false,
    "Description" TEXT,
    "Cars" INTEGER,
    "Tactic" TEXT,
    "Address" TEXT,
    "RelReportID" INTEGER,
    "Agents" TEXT,
    "Radius" DOUBLE PRECISION DEFAULT 0,
    "RandomLatitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "RandomLongitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalPopulation" INTEGER NOT NULL DEFAULT 0,
    "NumAbducted" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Test_Report_pkey" PRIMARY KEY ("id")
);
