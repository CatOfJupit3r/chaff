ALTER TABLE `digests` ADD `model` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `agent_models` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `digest_instructions` text DEFAULT '' NOT NULL;