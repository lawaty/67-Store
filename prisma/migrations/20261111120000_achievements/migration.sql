-- AlterTable
ALTER TABLE `Payment` MODIFY `provider` ENUM('INSTAPAY', 'PAYMOB', 'CRYPTO', 'COINS') NOT NULL;

-- AlterTable
ALTER TABLE `WalletFunding` MODIFY `provider` ENUM('INSTAPAY', 'PAYMOB', 'CRYPTO', 'COINS') NOT NULL;

-- CreateTable
CREATE TABLE `Achievement` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `icon` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `type` ENUM('TOTAL_ORDERS', 'ORDERS_PER_MONTH', 'ORDERS_PER_WEEK') NOT NULL,
    `target` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Achievement_active_sortOrder_idx`(`active`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientAchievement` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `achievementId` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `earnedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClientAchievement_clientId_idx`(`clientId`),
    UNIQUE INDEX `ClientAchievement_clientId_achievementId_key`(`clientId`, `achievementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ClientAchievement` ADD CONSTRAINT `ClientAchievement_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientAchievement` ADD CONSTRAINT `ClientAchievement_achievementId_fkey` FOREIGN KEY (`achievementId`) REFERENCES `Achievement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

