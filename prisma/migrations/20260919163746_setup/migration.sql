/*
  Warnings:

  - You are about to drop the column `ip` on the `AnalysisRequest` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AnalysisRequest_ip_createdAt_idx";

-- AlterTable
ALTER TABLE "AnalysisRequest" DROP COLUMN "ip";
