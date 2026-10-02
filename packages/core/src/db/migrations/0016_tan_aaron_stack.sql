CREATE TABLE `finding_replies` (
	`id` text PRIMARY KEY NOT NULL,
	`finding_id` text NOT NULL,
	`remote_id` text NOT NULL,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`finding_id`) REFERENCES `findings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finding_replies_finding_remote_unique` ON `finding_replies` (`finding_id`,`remote_id`);--> statement-breakpoint
ALTER TABLE `finding_posts` ADD `discussion_id` text;--> statement-breakpoint
ALTER TABLE `snapshots` ADD `remote_version_id` text;--> statement-breakpoint
ALTER TABLE `snapshots` ADD `remote_version` integer;