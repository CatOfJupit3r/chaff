CREATE TABLE `stack_branches` (
	`id` text PRIMARY KEY NOT NULL,
	`stack_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`branch` text NOT NULL,
	`position` integer NOT NULL,
	`kept_host_parent` text,
	FOREIGN KEY (`stack_id`) REFERENCES `stacks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stack_branches_workspace_branch_unique` ON `stack_branches` (`workspace_id`,`branch`);--> statement-breakpoint
CREATE INDEX `stack_branches_stack_idx` ON `stack_branches` (`stack_id`,`position`);--> statement-breakpoint
CREATE TABLE `stacks` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`base_branch` text,
	`is_hidden` integer DEFAULT false NOT NULL,
	`dismissed_changes` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stacks_workspace_idx` ON `stacks` (`workspace_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`repo_path` text NOT NULL,
	`default_branch` text,
	`remote_connection_id` text,
	`remote_project` text,
	`stack_filters` text DEFAULT '{"activity":"ANY","review":"ALL","source":"ALL","isMineOnly":false}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_workspaces`("id", "name", "repo_path", "default_branch", "remote_connection_id", "remote_project", "stack_filters", "created_at", "updated_at") SELECT "id", "name", "repo_path", "default_branch", "remote_connection_id", "remote_project", "stack_filters", "created_at", "updated_at" FROM `workspaces`;--> statement-breakpoint
DROP TABLE `workspaces`;--> statement-breakpoint
ALTER TABLE `__new_workspaces` RENAME TO `workspaces`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_repo_path_unique` ON `workspaces` (`repo_path`);