CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`editor` text NOT NULL,
	`theme` text NOT NULL,
	`accent` text NOT NULL,
	`code_size` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`repo_path` text NOT NULL,
	`default_branch` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_repo_path_unique` ON `workspaces` (`repo_path`);