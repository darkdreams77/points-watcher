/*
  Warnings:

  - A unique constraint covering the columns `[forumId]` on the table `Member` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "manualStatus" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Member_forumId_key" ON "Member"("forumId");
