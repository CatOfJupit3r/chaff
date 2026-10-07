CREATE TABLE `finding_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`finding_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`author` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`finding_id`) REFERENCES `findings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `finding_messages_finding_idx` ON `finding_messages` (`finding_id`);