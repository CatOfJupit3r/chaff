CREATE TABLE `assistant_exchanges` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`card_id` text NOT NULL,
	`question` text NOT NULL,
	`answer` text,
	`status` text NOT NULL,
	`progress` text,
	`error` text,
	`runner` text NOT NULL,
	`model` text,
	`asked_at` integer NOT NULL,
	`answered_at` integer,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assistant_exchanges_card_idx` ON `assistant_exchanges` (`snapshot_id`,`card_id`,`asked_at`);--> statement-breakpoint
CREATE TABLE `digest_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`digest_id` text NOT NULL,
	`part` text NOT NULL,
	`part_id` text,
	`instructions` text NOT NULL,
	`runner` text NOT NULL,
	`model` text,
	`status` text NOT NULL,
	`progress` text,
	`error` text,
	`content` text,
	`is_selected` integer DEFAULT false NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`digest_id`) REFERENCES `digests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `digest_revisions_digest_idx` ON `digest_revisions` (`digest_id`,`started_at`);