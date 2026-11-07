-- AlterTable
ALTER TABLE `Order` ADD COLUMN `coinsConsumed` INTEGER NULL,
    ADD COLUMN `markupBasisPoints` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Order_clientId_createdAt_idx` ON `Order`(`clientId`, `createdAt`);
