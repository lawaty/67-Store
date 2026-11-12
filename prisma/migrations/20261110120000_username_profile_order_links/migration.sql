-- 1. ClientAccount.username: add nullable, backfill, then enforce
ALTER TABLE `ClientAccount` ADD COLUMN `username` VARCHAR(191) NULL;
UPDATE `ClientAccount`
SET `username` = CONCAT(LEFT(SUBSTRING_INDEX(`email`, '@', 1), 32), '_', REPLACE(`id`, '-', ''))
WHERE `username` IS NULL;
ALTER TABLE `ClientAccount` MODIFY `username` VARCHAR(191) NOT NULL;
ALTER TABLE `ClientAccount` ADD UNIQUE INDEX `ClientAccount_username_key` (`username`);

-- 2. GamingProfile: client ownership, drop label
ALTER TABLE `GamingProfile` ADD COLUMN `clientId` VARCHAR(191) NULL;
UPDATE `GamingProfile` p
JOIN `ClientAccount` a ON p.`accountId` = a.`id`
SET p.`clientId` = a.`clientId`
WHERE p.`clientId` IS NULL;
ALTER TABLE `GamingProfile` DROP INDEX `GamingProfile_accountId_game_userId_serverId_key`;
ALTER TABLE `GamingProfile` MODIFY `clientId` VARCHAR(191) NOT NULL;
ALTER TABLE `GamingProfile` MODIFY `accountId` VARCHAR(191) NULL;
ALTER TABLE `GamingProfile` ADD UNIQUE INDEX `GamingProfile_clientId_game_userId_serverId_key` (`clientId`, `game`, `userId`, `serverId`);
ALTER TABLE `GamingProfile` ADD INDEX `GamingProfile_accountId_idx` (`accountId`);
ALTER TABLE `GamingProfile` ADD CONSTRAINT `GamingProfile_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `GamingProfile` DROP COLUMN `label`;

-- 3. Order.profileId: add nullable, create a profile for any order that has none, link, enforce
ALTER TABLE `Order` ADD COLUMN `profileId` VARCHAR(191) NULL;

INSERT IGNORE INTO `GamingProfile` (`id`, `clientId`, `accountId`, `game`, `userId`, `serverId`, `playerName`, `createdAt`)
SELECT UUID(), o.`clientId`, a.`id`, pr.`game`, o.`userId`, o.`serverId`, MAX(o.`playerName`), MIN(o.`createdAt`)
FROM `Order` o
JOIN `Product` pr ON pr.`id` = o.`productId`
LEFT JOIN `ClientAccount` a ON a.`clientId` = o.`clientId`
LEFT JOIN `GamingProfile` gp
  ON gp.`clientId` = o.`clientId` AND gp.`game` = pr.`game`
  AND gp.`userId` = o.`userId` AND gp.`serverId` = o.`serverId`
WHERE gp.`id` IS NULL
GROUP BY o.`clientId`, a.`id`, pr.`game`, o.`userId`, o.`serverId`;

UPDATE `Order` o
JOIN `Product` pr ON pr.`id` = o.`productId`
JOIN `GamingProfile` gp
  ON gp.`clientId` = o.`clientId` AND gp.`game` = pr.`game`
  AND gp.`userId` = o.`userId` AND gp.`serverId` = o.`serverId`
SET o.`profileId` = gp.`id`
WHERE o.`profileId` IS NULL;

ALTER TABLE `Order` MODIFY `profileId` VARCHAR(191) NOT NULL;
ALTER TABLE `Order` ADD INDEX `Order_profileId_idx` (`profileId`);
ALTER TABLE `Order` ADD CONSTRAINT `Order_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `GamingProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
