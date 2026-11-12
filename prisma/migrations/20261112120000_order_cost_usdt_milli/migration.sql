-- Add the actual USDT cost snapshot for delivered orders. Written by the
-- fulfilment cost-to-consume path and read by the Prisma order adapter.
ALTER TABLE `Order`
  ADD COLUMN `costUsdtMilli` BIGINT NULL;
