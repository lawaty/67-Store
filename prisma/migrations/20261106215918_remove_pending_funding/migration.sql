/*
  Warnings:

  - You are about to drop the `FundingCost` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `basisEgpMinor` on table `Funding` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `FundingCost` DROP FOREIGN KEY `FundingCost_fundingId_fkey`;

-- AlterTable
ALTER TABLE `Funding` MODIFY `basisEgpMinor` INTEGER NOT NULL;

-- DropTable
DROP TABLE `FundingCost`;
