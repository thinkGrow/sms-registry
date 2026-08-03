/*
  Warnings:

  - Added the required column `degreeLevel` to the `Programme` table without a default value. This is not possible if the table is not empty.
  - Added the required column `enrolmentDate` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DegreeLevel" AS ENUM ('BACHELORS', 'MASTERS');

-- AlterTable
ALTER TABLE "Programme" ADD COLUMN     "degreeLevel" "DegreeLevel" NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "enrolmentDate" DATE NOT NULL;
