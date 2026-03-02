-- CreateTable
CREATE TABLE "Flock_Camera" (
    "id" SERIAL NOT NULL,
    "Latitude" DOUBLE PRECISION NOT NULL,
    "Longitude" DOUBLE PRECISION NOT NULL,
    "Manufacturer" TEXT NOT NULL,
    "Operator" TEXT NOT NULL,

    CONSTRAINT "Flock_Camera_pkey" PRIMARY KEY ("id")
);
