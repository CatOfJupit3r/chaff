CREATE TABLE `finding_anchors` (
	`id` text PRIMARY KEY NOT NULL,
	`finding_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`unit_id` text,
	`file_id` text,
	`path` text NOT NULL,
	`side` text NOT NULL,
	`start_line` integer,
	`end_line` integer,
	`quote` text NOT NULL,
	`context_before` text NOT NULL,
	`context_after` text NOT NULL,
	FOREIGN KEY (`finding_id`) REFERENCES `findings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`file_id`) REFERENCES `snapshot_files`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `finding_anchors_finding_idx` ON `finding_anchors` (`finding_id`);--> statement-breakpoint
CREATE INDEX `finding_anchors_unit_idx` ON `finding_anchors` (`unit_id`);--> statement-breakpoint
CREATE TABLE `finding_events` (
	`id` text PRIMARY KEY NOT NULL,
	`finding_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`finding_id`) REFERENCES `findings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `finding_events_finding_idx` ON `finding_events` (`finding_id`);--> statement-breakpoint
CREATE TABLE `findings` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`number` integer NOT NULL,
	`target_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `review_targets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `findings_workspace_number_unique` ON `findings` (`workspace_id`,`number`);--> statement-breakpoint
CREATE INDEX `findings_target_idx` ON `findings` (`target_id`);--> statement-breakpoint
CREATE TABLE `unit_marks` (
	`unit_id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`mark` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `unit_marks_snapshot_idx` ON `unit_marks` (`snapshot_id`);