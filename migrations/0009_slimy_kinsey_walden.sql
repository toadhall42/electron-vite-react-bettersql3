CREATE TABLE `events` (
	`id` integer PRIMARY KEY NOT NULL,
	`track` text NOT NULL,
	`sanction` text NOT NULL,
	`dates` text NOT NULL,
	`number` integer NOT NULL,
	`seasonId` integer NOT NULL,
	`pointModel` text NOT NULL
);
