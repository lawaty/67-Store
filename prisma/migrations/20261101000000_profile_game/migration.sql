-- Ensure column exists
ALTER TABLE `GamingProfile` ADD COLUMN IF NOT EXISTS `game` VARCHAR(191) NOT NULL DEFAULT 'mlbb';

-- Update existing rows to have mlbb
UPDATE `GamingProfile` SET `game` = 'mlbb' WHERE `game` IS NULL OR `game` = '';

-- Drop foreign key if exists
SET @fk_name = (SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'GamingProfile' AND CONSTRAINT_TYPE = 'FOREIGN KEY' LIMIT 1);
SET @sql = IF(@fk_name IS NOT NULL, CONCAT('ALTER TABLE `GamingProfile` DROP FOREIGN KEY `', @fk_name, '`'), 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop index if exists
DROP INDEX IF EXISTS `GamingProfile_accountId_userId_serverId_key` ON `GamingProfile`;

-- Create new unique index
CREATE UNIQUE INDEX `GamingProfile_accountId_game_userId_serverId_key` ON `GamingProfile`(`accountId`, `game`, `userId`, `serverId`);

-- Re-add foreign key
ALTER TABLE `GamingProfile` ADD CONSTRAINT `GamingProfile_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `ClientAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
