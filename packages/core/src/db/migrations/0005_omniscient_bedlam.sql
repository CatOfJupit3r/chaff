CREATE TABLE `connections` (
	`id` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`base_url` text NOT NULL,
	`username` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
DROP INDEX `review_targets_workspace_branch_kind_unique`;--> statement-breakpoint
ALTER TABLE `review_targets` ADD `code_host` text;--> statement-breakpoint
ALTER TABLE `review_targets` ADD `connection_id` text;--> statement-breakpoint
ALTER TABLE `review_targets` ADD `remote_project` text;--> statement-breakpoint
ALTER TABLE `review_targets` ADD `change_number` integer;--> statement-breakpoint
ALTER TABLE `review_targets` ADD `title` text;--> statement-breakpoint
ALTER TABLE `review_targets` ADD `web_url` text;--> statement-breakpoint
CREATE UNIQUE INDEX `review_targets_workspace_change_unique` ON `review_targets` (`workspace_id`,`change_number`) WHERE "review_targets"."change_number" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX `review_targets_workspace_branch_kind_unique` ON `review_targets` (`workspace_id`,`branch`,`kind`) WHERE "review_targets"."change_number" is null;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `remote_connection_id` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `remote_project` text;