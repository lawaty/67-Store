-- Treasury USDT quantities move from cents to milli-USDT (1 USDT = 1000).
ALTER TABLE `Funding` RENAME COLUMN `usdtMinor` TO `usdtMilli`;
UPDATE `Funding` SET `usdtMilli` = `usdtMilli` * 10;

ALTER TABLE `TreasuryConsumption` RENAME COLUMN `usdtMinor` TO `usdtMilli`;
UPDATE `TreasuryConsumption` SET `usdtMilli` = `usdtMilli` * 10;

ALTER TABLE `Reconciliation` RENAME COLUMN `expectedUsdtMinor` TO `expectedUsdtMilli`;
ALTER TABLE `Reconciliation` RENAME COLUMN `supplierUsdtMinor` TO `supplierUsdtMilli`;
ALTER TABLE `Reconciliation` RENAME COLUMN `gapUsdtMinor` TO `gapUsdtMilli`;
UPDATE `Reconciliation`
SET `expectedUsdtMilli` = `expectedUsdtMilli` * 10,
    `supplierUsdtMilli` = `supplierUsdtMilli` * 10,
    `gapUsdtMilli` = `gapUsdtMilli` * 10;
