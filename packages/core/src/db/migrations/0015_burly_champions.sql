CREATE TABLE `finding_tasks` (
	`finding_id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`runner` text NOT NULL,
	`task` text,
	`verify` text,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`finding_id`) REFERENCES `findings`(`id`) ON UPDATE no action ON DELETE cascade
);
