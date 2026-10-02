DROP INDEX `review_targets_workspace_branch_unique`;--> statement-breakpoint
ALTER TABLE `review_targets` ADD `kind` text DEFAULT 'BRANCH' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `review_targets_workspace_branch_kind_unique` ON `review_targets` (`workspace_id`,`branch`,`kind`);--> statement-breakpoint
ALTER TABLE `snapshots` ADD `working_fingerprint` text;