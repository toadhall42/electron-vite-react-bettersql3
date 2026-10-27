CREATE TABLE `weather` (
	`id` integer PRIMARY KEY NOT NULL,
	`sessionId` integer,
	`weatherTempF` real,
	`weatherWindMph` real,
	`weatherPrecipIn` real,
	`weatherPressureInHg` real,
	`weatherCloudCoverPct` real
);
