CREATE TABLE `pick_list_options` (
	`id` integer PRIMARY KEY NOT NULL,
	`list` text NOT NULL,
	`value` text NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pick_list_options_list_value_unique` ON `pick_list_options` (`list`,`value`);--> statement-breakpoint
INSERT INTO `pick_list_options` (`list`, `value`, `sortOrder`) VALUES
	('carClass', 'CF', 1),
	('carClass', 'HF', 2),
	('tireBrand', 'Avon', 1),
	('tireBrand', 'Hoosier', 2);
