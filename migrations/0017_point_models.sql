CREATE TABLE `point_models` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`positionBasis` text DEFAULT 'class' NOT NULL,
	`positionPoints` text DEFAULT '[]' NOT NULL,
	`mastersPoints` text DEFAULT '[]' NOT NULL,
	`bonusRacePoints` integer DEFAULT 0 NOT NULL,
	`greenFlagPoints` integer DEFAULT 0 NOT NULL,
	`polePositionPoints` integer DEFAULT 0 NOT NULL,
	`hardChargerPoints` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `events` ADD `pointModelId` integer;--> statement-breakpoint
ALTER TABLE `seasons` ADD `pointModelId` integer;--> statement-breakpoint
-- Seed the schemes that were previously hard-coded in result.service.ts and keyed by events.pointModel text
INSERT INTO `point_models` (`id`, `name`, `description`, `positionBasis`, `positionPoints`, `mastersPoints`, `bonusRacePoints`, `greenFlagPoints`, `polePositionPoints`, `hardChargerPoints`) VALUES
	(1, 'Classic 15-14-13', 'Original Track-Notes scoring', 'class', '[15,14,13,12,11,10,9,8,7,6,5,4,3,2,1]', '[15,12,10,9,8,7,6,5,4,3,2,1]', 5, 1, 1, 1),
	(2, '2026 15-12-10', 'Track-Notes 2026 scoring', 'class', '[15,12,10,9,8,7,6,5,4,3,2,1]', '[15,12,10,9,8,7,6,5,4,3,2,1]', 5, 1, 1, 1);
--> statement-breakpoint
INSERT INTO `point_models` (`id`, `name`, `description`, `positionBasis`, `positionPoints`, `mastersPoints`, `bonusRacePoints`, `greenFlagPoints`, `polePositionPoints`, `hardChargerPoints`)
	SELECT 3, '2025 Bonus Race', 'Bonus Race worth 2 points', 'class', '[15,14,13,12,11,10,9,8,7,6,5,4,3,2,1]', '[15,12,10,9,8,7,6,5,4,3,2,1]', 2, 1, 1, 1
	WHERE EXISTS (SELECT 1 FROM `events` WHERE `pointModel` = '2025 Bonus Race');
--> statement-breakpoint
-- A season takes the model of its regular events, falling back on its year
UPDATE `seasons` SET `pointModelId` = CASE
	WHEN EXISTS (SELECT 1 FROM `events` e WHERE e.`seasonId` = `seasons`.`id` AND e.`pointModel` NOT LIKE '%Bonus Race%' AND (e.`pointModel` LIKE '%2026%' OR e.`pointModel` LIKE '%15-12-10%')) THEN 2
	WHEN EXISTS (SELECT 1 FROM `events` e WHERE e.`seasonId` = `seasons`.`id` AND e.`pointModel` NOT LIKE '%Bonus Race%') THEN 1
	WHEN `year` >= 2026 THEN 2
	ELSE 1
END;
--> statement-breakpoint
-- Events that scored differently from their season keep that model as an override
UPDATE `events` SET `pointModelId` = CASE
	WHEN `pointModel` = '2025 Bonus Race' THEN 3
	WHEN `pointModel` LIKE '%Bonus Race%' THEN NULL
	WHEN `pointModel` LIKE '%2026%' OR `pointModel` LIKE '%15-12-10%' THEN 2
	ELSE 1
END;
--> statement-breakpoint
UPDATE `events` SET `pointModelId` = NULL
	WHERE `pointModelId` = (SELECT s.`pointModelId` FROM `seasons` s WHERE s.`id` = `events`.`seasonId`);
