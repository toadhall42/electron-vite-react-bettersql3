CREATE TABLE `entrants` (
	`id` integer PRIMARY KEY NOT NULL,
	`driverid` integer NOT NULL,
	`vehicleid` integer NOT NULL,
	`number` text NOT NULL,
	`defaulttire` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`master` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` integer PRIMARY KEY NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`year` text NOT NULL,
	`class` text NOT NULL,
	`transponder` text,
	`chassisid` text
);
--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
ALTER TABLE `drivers` ADD `suffix` text;