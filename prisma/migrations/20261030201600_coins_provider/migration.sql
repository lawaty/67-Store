-- AlterTable
ALTER TABLE `Payment` MODIFY `provider` ENUM('INSTAPAY', 'CRYPTO', 'COINS') NOT NULL;
