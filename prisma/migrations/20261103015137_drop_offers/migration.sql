/*
  Warnings:

  - You are about to drop the `Offer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OfferClient` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `OfferClient` DROP FOREIGN KEY `OfferClient_clientId_fkey`;

-- DropForeignKey
ALTER TABLE `OfferClient` DROP FOREIGN KEY `OfferClient_offerId_fkey`;

-- DropTable
DROP TABLE `Offer`;

-- DropTable
DROP TABLE `OfferClient`;
