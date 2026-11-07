/*
  Warnings:

  - You are about to drop the column `amountMinor` on the `Funding` table. All the data in the column will be lost.
  - You are about to drop the column `basisEgpMinor` on the `Funding` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Funding` table. All the data in the column will be lost.
  - You are about to drop the column `feesMinor` on the `Funding` table. All the data in the column will be lost.
  - Added the required column `egpPaidMinor` to the `Funding` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Funding` DROP COLUMN `amountMinor`,
    DROP COLUMN `basisEgpMinor`,
    DROP COLUMN `currency`,
    DROP COLUMN `feesMinor`,
    ADD COLUMN `egpPaidMinor` INTEGER NOT NULL;
