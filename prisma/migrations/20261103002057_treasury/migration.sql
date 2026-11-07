-- AlterTable
ALTER TABLE `Order` ADD COLUMN `cogsEgpMinor` INTEGER NULL,
    ADD COLUMN `coinsCharged` INTEGER NULL,
    ADD COLUMN `refundedAt` DATETIME(3) NULL,
    ADD COLUMN `tradingMarginMinor` INTEGER NULL,
    ADD COLUMN `wacEgpMinor` INTEGER NULL;

-- CreateTable
CREATE TABLE `Funding` (
    `id` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `amountMinor` INTEGER NOT NULL,
    `feesMinor` INTEGER NOT NULL,
    `usdtMinor` INTEGER NOT NULL,
    `basisEgpMinor` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Funding_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TreasuryConsumption` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `usdtMinor` INTEGER NOT NULL,
    `basisEgpMinor` INTEGER NOT NULL,
    `wacEgpMinor` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TreasuryConsumption_orderId_key`(`orderId`),
    INDEX `TreasuryConsumption_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reconciliation` (
    `id` VARCHAR(191) NOT NULL,
    `expectedUsdtMinor` INTEGER NOT NULL,
    `supplierUsdtMinor` INTEGER NOT NULL,
    `gapUsdtMinor` INTEGER NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Reconciliation_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
