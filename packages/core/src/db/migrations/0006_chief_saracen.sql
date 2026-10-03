CREATE TABLE `finding_anchor_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`anchor_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`match` text NOT NULL,
	`file_id` text,
	`unit_id` text,
	`start_line` integer,
	`end_line` integer,
	`text` text NOT NULL,
	`context_before` text NOT NULL,
	`context_after` text NOT NULL,
	FOREIGN KEY (`anchor_id`) REFERENCES `finding_anchors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`) REFERENCES `snapshot_files`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finding_anchor_locations_anchor_snapshot_unique` ON `finding_anchor_locations` (`anchor_id`,`snapshot_id`);--> statement-breakpoint
ALTER TABLE `findings` ADD `answer` text;--> statement-breakpoint
ALTER TABLE `units` ADD `revision` text;--> statement-breakpoint
ALTER TABLE `units` ADD `previous_unit_id` text;--> statement-breakpoint
ALTER TABLE `unit_marks` ADD `is_carried` integer DEFAULT false NOT NULL;