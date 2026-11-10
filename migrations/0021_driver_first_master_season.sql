ALTER TABLE `drivers` ADD `firstMasterSeason` integer;--> statement-breakpoint
-- A driver with several entrants takes the earliest year
UPDATE `drivers` SET `firstMasterSeason` = (
	SELECT MIN(e.`firstMasterSeason`) FROM `entrants` e WHERE e.`driverid` = `drivers`.`id`
);
