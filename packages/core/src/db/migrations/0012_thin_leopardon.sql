CREATE TABLE `change_unit_members` (
	`unit_id` text PRIMARY KEY NOT NULL,
	`change_unit_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`change_unit_id`) REFERENCES `change_units`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `change_unit_members_change_idx` ON `change_unit_members` (`change_unit_id`,`ordinal`);--> statement-breakpoint
CREATE TABLE `change_units` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`title` text NOT NULL,
	`source` text NOT NULL,
	`digest_group_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `change_units_snapshot_ordinal_idx` ON `change_units` (`snapshot_id`,`ordinal`);