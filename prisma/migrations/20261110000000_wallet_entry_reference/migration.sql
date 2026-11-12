-- AlterTable
ALTER TABLE `WalletEntry` ADD COLUMN `reference` VARCHAR(191) NULL,
    ADD UNIQUE INDEX `WalletEntry_reference_key`(`reference`);
