PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_drivers` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`firstname` text NOT NULL,
	`lastname` text NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_drivers`("id", "name", "firstname", "lastname", "active") SELECT "id", "name", "firstname", "lastname", "active" FROM `drivers`;--> statement-breakpoint
DROP TABLE `drivers`;--> statement-breakpoint
ALTER TABLE `__new_drivers` RENAME TO `drivers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;