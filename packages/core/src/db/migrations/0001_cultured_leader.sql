CREATE TABLE `review_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`branch` text NOT NULL,
	`parent_branch` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_targets_workspace_branch_unique` ON `review_targets` (`workspace_id`,`branch`);--> statement-breakpoint
CREATE TABLE `regions` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`file_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`is_file_level` integer NOT NULL,
	`old_start_line` integer,
	`new_start_line` integer,
	`deletions` integer NOT NULL,
	`additions` integer NOT NULL,
	`content_hash` text NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`) REFERENCES `snapshot_files`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `regions_snapshot_ordinal_idx` ON `regions` (`snapshot_id`,`ordinal`);--> statement-breakpoint
CREATE INDEX `regions_unit_idx` ON `regions` (`unit_id`);--> statement-breakpoint
CREATE TABLE `snapshot_files` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`path` text NOT NULL,
	`old_path` text,
	`status` text NOT NULL,
	`kind` text NOT NULL,
	`old_mode` text,
	`new_mode` text,
	`old_blob_sha` text,
	`new_blob_sha` text,
	`is_binary` integer NOT NULL,
	`additions` integer NOT NULL,
	`deletions` integer NOT NULL,
	`patch` text,
	`is_too_large` integer NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `snapshot_files_snapshot_ordinal_idx` ON `snapshot_files` (`snapshot_id`,`ordinal`);--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`target_id` text NOT NULL,
	`version` integer NOT NULL,
	`parent_branch` text NOT NULL,
	`head_sha` text NOT NULL,
	`parent_head_sha` text NOT NULL,
	`base_sha` text NOT NULL,
	`file_count` integer NOT NULL,
	`additions` integer NOT NULL,
	`deletions` integer NOT NULL,
	`region_count` integer NOT NULL,
	`unit_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`target_id`) REFERENCES `review_targets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snapshots_target_version_unique` ON `snapshots` (`target_id`,`version`);--> statement-breakpoint
CREATE TABLE `units` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`file_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`key` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`symbol_kind` text,
	`is_exported` integer NOT NULL,
	`change` text NOT NULL,
	`old_start_line` integer,
	`old_end_line` integer,
	`new_start_line` integer,
	`new_end_line` integer,
	`additions` integer NOT NULL,
	`deletions` integer NOT NULL,
	`content_hash` text NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`) REFERENCES `snapshot_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `units_snapshot_ordinal_idx` ON `units` (`snapshot_id`,`ordinal`);