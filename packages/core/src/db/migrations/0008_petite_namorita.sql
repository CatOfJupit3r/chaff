CREATE TABLE `fixes` (
	`id` text PRIMARY KEY NOT NULL,
	`target_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`runner` text NOT NULL,
	`status` text NOT NULL,
	`progress` text,
	`error` text,
	`branch` text NOT NULL,
	`base_sha` text NOT NULL,
	`head_sha` text,
	`finding_ids` text NOT NULL,
	`files` text,
	`summary` text,
	`report` text,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`target_id`) REFERENCES `review_targets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `fixes_target_idx` ON `fixes` (`target_id`,`started_at`);