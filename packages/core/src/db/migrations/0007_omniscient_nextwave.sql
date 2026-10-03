CREATE TABLE `finding_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`finding_id` text NOT NULL,
	`host` text NOT NULL,
	`remote_id` text NOT NULL,
	`url` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`finding_id`) REFERENCES `findings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finding_posts_finding_unique` ON `finding_posts` (`finding_id`);--> statement-breakpoint
ALTER TABLE `finding_events` ADD `source` text DEFAULT 'REVIEWER' NOT NULL;--> statement-breakpoint
ALTER TABLE `finding_events` ADD `note` text;--> statement-breakpoint
ALTER TABLE `finding_events` ADD `commits` text;