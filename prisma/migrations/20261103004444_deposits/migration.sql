-- CreateTable
CREATE TABLE `Deposit` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(3) NOT NULL,
    `amountMinor` INTEGER NOT NULL,
    `rateMinor` INTEGER NOT NULL,
    `coins` INTEGER NOT NULL,
    `wacEgpMinor` INTEGER NOT NULL,
    `egpValueMinor` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Deposit_clientId_createdAt_idx`(`clientId`, `createdAt`),
    INDEX `Deposit_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Deposit` ADD CONSTRAINT `Deposit_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
