CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`eventSequence` integer,
	`seasonRaceNumber` integer,
	`sessionType` text,
	`sessionDate` text,
	`sessionStartTime` text,
	`driverId` integer,
	`eventId` integer
);
