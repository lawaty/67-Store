-- Extend PaymentProvider enum with PAYMOB (additive only).
ALTER TABLE `Payment` MODIFY `provider` ENUM('INSTAPAY', 'CRYPTO', 'COINS', 'PAYMOB') NOT NULL;
ALTER TABLE `WalletFunding` MODIFY `provider` ENUM('INSTAPAY', 'CRYPTO', 'COINS', 'PAYMOB') NOT NULL;
