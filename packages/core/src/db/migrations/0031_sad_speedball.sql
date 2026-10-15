ALTER TABLE `findings` ADD `author` text DEFAULT 'REVIEWER' NOT NULL;--> statement-breakpoint
ALTER TABLE `findings` ADD `author_name` text;