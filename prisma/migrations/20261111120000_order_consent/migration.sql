-- Add consent fields: policy version accepted and acceptance timestamp
ALTER TABLE `Order`
  ADD COLUMN `termsVersion` VARCHAR(191) NULL,
  ADD COLUMN `termsAcceptedAt` DATETIME(3) NULL;
