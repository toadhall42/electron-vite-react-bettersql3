PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_entrants` (
	`id` integer PRIMARY KEY NOT NULL,
	`driverid` integer NOT NULL,
	`vehicleid` integer,
	`number` text NOT NULL,
	`defaulttire` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`master` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_entrants`("id", "driverid", "vehicleid", "number", "defaulttire", "active", "notes", "master") SELECT "id", "driverid", "vehicleid", "number", "defaulttire", "active", "notes", "master" FROM `entrants`;--> statement-breakpoint
DROP TABLE `entrants`;--> statement-breakpoint
ALTER TABLE `__new_entrants` RENAME TO `entrants`;--> statement-breakpoint
PRAGMA foreign_keys=ON;