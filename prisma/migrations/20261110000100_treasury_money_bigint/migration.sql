-- AlterTable
ALTER TABLE `Funding`
    MODIFY `egpPaidMinor` BIGINT NOT NULL,
    MODIFY `usdtMinor` BIGINT NOT NULL;

-- AlterTable
ALTER TABLE `TreasuryConsumption`
    MODIFY `usdtMinor` BIGINT NOT NULL,
    MODIFY `basisEgpMinor` BIGINT NOT NULL,
    MODIFY `wacEgpMinor` BIGINT NOT NULL;

-- AlterTable
ALTER TABLE `Reconciliation`
    MODIFY `expectedUsdtMinor` BIGINT NOT NULL,
    MODIFY `supplierUsdtMinor` BIGINT NOT NULL,
    MODIFY `gapUsdtMinor` BIGINT NOT NULL;
