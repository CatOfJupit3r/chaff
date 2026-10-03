CREATE TABLE `digests` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`runner` text NOT NULL,
	`status` text NOT NULL,
	`progress` text,
	`error` text,
	`content` text,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `digests_snapshot_idx` ON `digests` (`snapshot_id`,`started_at`);--> statement-breakpoint
ALTER TABLE `settings` ADD `digest_runner` text DEFAULT 'CLAUDE_CODE' NOT NULL;