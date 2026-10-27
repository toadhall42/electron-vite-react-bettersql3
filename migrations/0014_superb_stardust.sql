PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`eventSequence` integer,
	`seasonRaceNumber` integer,
	`sessionType` text NOT NULL,
	`sessionDate` text NOT NULL,
	`sessionStartTime` text,
	`driverId` integer NOT NULL,
	`eventId` integer NOT NULL,
	`carClass` text,
	`carNumber` text,
	`position` integer DEFAULT 0 NOT NULL,
	`bestLap` text
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("id", "name", "eventSequence", "seasonRaceNumber", "sessionType", "sessionDate", "sessionStartTime", "driverId", "eventId") SELECT "id", "name", "eventSequence", "seasonRaceNumber", "sessionType", "sessionDate", "sessionStartTime", "driverId", "eventId" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;