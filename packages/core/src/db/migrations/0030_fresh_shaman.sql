ALTER TABLE `findings` ADD `external_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `findings_target_external_id_unique` ON `findings` (`target_id`,`external_id`);