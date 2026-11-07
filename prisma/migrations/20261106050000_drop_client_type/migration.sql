-- Drop Client.type (ClientType enum was inline on the column in MySQL)
ALTER TABLE `Client` DROP COLUMN `type`;
