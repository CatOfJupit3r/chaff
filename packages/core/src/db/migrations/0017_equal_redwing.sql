ALTER TABLE `settings` ADD `code_font` text DEFAULT 'GEIST_MONO' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `code_line_height` text DEFAULT 'DEFAULT' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `density` text DEFAULT 'COMFORTABLE' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `syntax_light` text DEFAULT 'CHAFF' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `syntax_dark` text DEFAULT 'CHAFF' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `diff_layout` text DEFAULT 'unified' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `diff_context` text DEFAULT 'THREE' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `is_whitespace_ignored` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `inline_diff` text DEFAULT 'WORD' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `navigator_width` integer DEFAULT 300 NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `is_context_panel_pinned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `default_progression` text DEFAULT 'changes' NOT NULL;