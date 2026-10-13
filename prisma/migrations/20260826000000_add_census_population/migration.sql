-- CreateTable
CREATE TABLE "Census_City_Population" (
    "id" SERIAL NOT NULL,
    "City" TEXT NOT NULL,
    "County" TEXT NOT NULL,
    "CountyFips" INTEGER NOT NULL,
    "Year" INTEGER NOT NULL,
    "Population" INTEGER NOT NULL,

    CONSTRAINT "Census_City_Population_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Census_County_Population" (
    "id" SERIAL NOT NULL,
    "County" TEXT NOT NULL,
    "CountyFips" INTEGER NOT NULL,
    "Year" INTEGER NOT NULL,
    "Population" INTEGER NOT NULL,

    CONSTRAINT "Census_County_Population_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Census_City_Population_County_Year_idx" ON "Census_City_Population"("County", "Year");

-- CreateIndex
CREATE UNIQUE INDEX "Census_City_Population_City_Year_key" ON "Census_City_Population"("City", "Year");

-- CreateIndex
CREATE UNIQUE INDEX "Census_County_Population_County_Year_key" ON "Census_County_Population"("County", "Year");

