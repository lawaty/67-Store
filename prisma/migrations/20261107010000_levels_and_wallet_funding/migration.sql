-- CreateTable
CREATE TABLE `LevelAchievement` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `levelKey` VARCHAR(191) NOT NULL,
    `coins` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `earnedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LevelAchievement_clientId_levelKey_key`(`clientId`, `levelKey`),
    INDEX `LevelAchievement_clientId_coins_idx`(`clientId`, `coins`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WalletFunding` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `amountMinor` INTEGER NOT NULL,
    `rateMinor` INTEGER NOT NULL,
    `coins` INTEGER NOT NULL,
    `wacEgpMinor` INTEGER NOT NULL,
    `egpValueMinor` INTEGER NOT NULL,
    `provider` ENUM('INSTAPAY', 'CRYPTO', 'COINS') NOT NULL,
    `providerReference` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `depositId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidAt` DATETIME(3) NULL,

    UNIQUE INDEX `WalletFunding_providerReference_key`(`providerReference`),
    UNIQUE INDEX `WalletFunding_depositId_key`(`depositId`),
    INDEX `WalletFunding_clientId_createdAt_idx`(`clientId`, `createdAt`),
    INDEX `WalletFunding_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LevelAchievement` ADD CONSTRAINT `LevelAchievement_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WalletFunding` ADD CONSTRAINT `WalletFunding_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
