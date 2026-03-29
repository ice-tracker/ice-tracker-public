-- CreateTable
CREATE TABLE "Place_Of_Interest" (
    "id" SERIAL NOT NULL,
    "Name" TEXT NOT NULL,
    "Address" TEXT NOT NULL,
    "Latitude" DOUBLE PRECISION NOT NULL,
    "Longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Place_Of_Interest_pkey" PRIMARY KEY ("id")
);

