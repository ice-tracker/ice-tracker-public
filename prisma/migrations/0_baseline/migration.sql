-- CreateTable
CREATE TABLE "Arrest" (
    "id" SERIAL NOT NULL,
    "ApprehensionDate" TEXT NOT NULL,
    "ApprehensionTime" TEXT,
    "BirthYear" INTEGER NOT NULL,
    "Gender" TEXT NOT NULL,
    "CitizenshipCountry" TEXT NOT NULL,
    "ApprehensionSiteLandmark" TEXT NOT NULL DEFAULT 'Unknown',

    CONSTRAINT "Arrest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" INTEGER,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "batchId" TEXT,
    "source" TEXT,
    "snapshot" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Detainer" (
    "id" SERIAL NOT NULL,
    "Date" TEXT NOT NULL,
    "BirthYear" INTEGER NOT NULL,
    "Gender" TEXT NOT NULL,
    "CitizenshipCountry" TEXT NOT NULL,
    "DetentionFacility" TEXT NOT NULL,
    "FacilityCity" TEXT NOT NULL DEFAULT 'Unknown',

    CONSTRAINT "Detainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flock_Camera" (
    "id" SERIAL NOT NULL,
    "Latitude" DOUBLE PRECISION NOT NULL,
    "Longitude" DOUBLE PRECISION NOT NULL,
    "Manufacturer" TEXT NOT NULL,
    "Operator" TEXT NOT NULL,

    CONSTRAINT "Flock_Camera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place_Of_Interest" (
    "id" SERIAL NOT NULL,
    "Name" TEXT NOT NULL,
    "Address" TEXT NOT NULL,
    "Latitude" DOUBLE PRECISION NOT NULL,
    "Longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Place_Of_Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "Date" TEXT NOT NULL,
    "Latitude" DOUBLE PRECISION NOT NULL,
    "Longitude" DOUBLE PRECISION NOT NULL,
    "Time" TEXT,
    "Location" TEXT NOT NULL,
    "Activity" TEXT NOT NULL,
    "Sec" BOOLEAN NOT NULL DEFAULT false,
    "Description" TEXT,
    "Cars" TEXT,
    "Tactic" TEXT,
    "Address" TEXT,
    "RelReportID" INTEGER,
    "Agents" TEXT,
    "Radius" DOUBLE PRECISION DEFAULT 0,
    "RandomLatitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "RandomLongitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalPopulation" INTEGER NOT NULL DEFAULT 0,
    "NumAbducted" INTEGER NOT NULL DEFAULT 0,
    "OnlyStreet" BOOLEAN NOT NULL DEFAULT false,
    "StreetGeom" TEXT,
    "City" TEXT,
    "CreatedBy" TEXT NOT NULL DEFAULT 'LUCE',

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

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
    "Cars" TEXT,
    "Tactic" TEXT,
    "Address" TEXT,
    "RelReportID" INTEGER,
    "Agents" TEXT,
    "Radius" DOUBLE PRECISION DEFAULT 0,
    "RandomLatitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "RandomLongitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "TotalPopulation" INTEGER NOT NULL DEFAULT 0,
    "NumAbducted" INTEGER NOT NULL DEFAULT 0,
    "OnlyStreet" BOOLEAN NOT NULL DEFAULT false,
    "StreetGeom" TEXT,
    "City" TEXT,
    "CreatedBy" TEXT NOT NULL DEFAULT 'LUCE',

    CONSTRAINT "Test_Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_batchId_idx" ON "AuditLog"("batchId" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource" ASC, "resourceId" ASC);

