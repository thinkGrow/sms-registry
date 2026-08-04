/*
  Warnings:

  - You are about to drop the column `deferredYears` on the `Student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "deferredYears",
ADD COLUMN     "deferredAt" TIMESTAMP(3);
