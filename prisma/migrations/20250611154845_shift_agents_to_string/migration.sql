/*
  Warnings:

  - You are about to drop the column `AgentsTEMP` on the `Report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Report" DROP COLUMN "AgentsTEMP",
ADD COLUMN     "Agents" TEXT;
