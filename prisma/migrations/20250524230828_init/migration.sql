-- CreateTable
CREATE TABLE "Verified" (
    "id" SERIAL NOT NULL,
    "Date" TEXT NOT NULL,
    "Latitude" DOUBLE PRECISION NOT NULL,
    "Longitude" DOUBLE PRECISION NOT NULL,
    "Description" TEXT,

    CONSTRAINT "Verified_pkey" PRIMARY KEY ("id")
);
