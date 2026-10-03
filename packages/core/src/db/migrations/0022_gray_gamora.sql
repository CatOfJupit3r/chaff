ALTER TABLE `digests` ADD `model` text;--> statement-breakpoint
ALTER TABLE `digests` ADD `instructions` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `digest_models` text DEFAULT '[]' NOT NULL;