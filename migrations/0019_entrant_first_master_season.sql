ALTER TABLE `entrants` ADD `firstMasterSeason` integer;--> statement-breakpoint
-- Entrants flagged master before seasons were tracked are eligible from 2026
UPDATE `entrants` SET `firstMasterSeason` = 2026 WHERE `master` = 1;
