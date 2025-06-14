/*
  Warnings:

  - Added the required column `Sec` to the `Verified` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Verified" ADD COLUMN     "Sec" BOOLEAN NOT NULL;
