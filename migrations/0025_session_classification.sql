ALTER TABLE `sessions` ADD `classification` text;--> statement-breakpoint
UPDATE `sessions` SET `classification` = 'DQ' WHERE `disqualified` = 1;
