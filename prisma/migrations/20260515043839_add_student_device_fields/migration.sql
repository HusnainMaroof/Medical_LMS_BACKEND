/*
  Warnings:

  - A unique constraint covering the columns `[deviceId]` on the table `students` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "students" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "deviceRegisteredAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "students_deviceId_key" ON "students"("deviceId");
