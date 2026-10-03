ALTER TABLE `findings` ADD `severity` text;--> statement-breakpoint
ALTER TABLE `findings` ADD `scope` text DEFAULT 'CODE' NOT NULL;--> statement-breakpoint
UPDATE `findings` SET `scope` = 'BRANCH' WHERE NOT EXISTS (SELECT 1 FROM `finding_anchors` WHERE `finding_anchors`.`finding_id` = `findings`.`id`);
