-- CreateTable
CREATE TABLE `FundingCost` (
    `id` VARCHAR(191) NOT NULL,
    `fundingId` VARCHAR(191) NOT NULL,
    `basisEgpMinor` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FundingCost_fundingId_key`(`fundingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FundingCost` ADD CONSTRAINT `FundingCost_fundingId_fkey` FOREIGN KEY (`fundingId`) REFERENCES `Funding`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `Funding` MODIFY `basisEgpMinor` INTEGER NULL;

-- Backfill legacy confirmed funding cost events
INSERT INTO `FundingCost` (`id`, `fundingId`, `basisEgpMinor`, `createdAt`)
SELECT CONCAT('legacy:', `id`), `id`, `basisEgpMinor`, `createdAt`
FROM `Funding`
WHERE `basisEgpMinor` IS NOT NULL;
