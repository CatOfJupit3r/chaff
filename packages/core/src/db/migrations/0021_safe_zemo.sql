PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`editor` text NOT NULL,
	`theme` text NOT NULL,
	`accent` text NOT NULL,
	`code_size` text NOT NULL,
	`code_font` text DEFAULT 'GEIST_MONO' NOT NULL,
	`code_line_height` text DEFAULT 'DEFAULT' NOT NULL,
	`density` text DEFAULT 'COMFORTABLE' NOT NULL,
	`syntax_light` text DEFAULT 'CHAFF' NOT NULL,
	`syntax_dark` text DEFAULT 'CHAFF' NOT NULL,
	`diff_layout` text DEFAULT 'unified' NOT NULL,
	`diff_context` text DEFAULT 'THREE' NOT NULL,
	`is_whitespace_ignored` integer DEFAULT false NOT NULL,
	`inline_diff` text DEFAULT 'WORD' NOT NULL,
	`navigator_width` integer DEFAULT 300 NOT NULL,
	`is_context_panel_pinned` integer DEFAULT false NOT NULL,
	`default_progression` text DEFAULT 'changes' NOT NULL,
	`digest_runner` text DEFAULT 'CLAUDE_CODE' NOT NULL,
	`agent_commands` text DEFAULT '[]' NOT NULL,
	`shortcuts` text DEFAULT '[]' NOT NULL,
	`onboarding` text DEFAULT '{"status":"NOT_STARTED","completedItems":[],"shownHints":[]}' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_settings`("id", "editor", "theme", "accent", "code_size", "code_font", "code_line_height", "density", "syntax_light", "syntax_dark", "diff_layout", "diff_context", "is_whitespace_ignored", "inline_diff", "navigator_width", "is_context_panel_pinned", "default_progression", "digest_runner", "agent_commands", "shortcuts", "onboarding", "updated_at") SELECT "id", "editor", "theme", "accent", "code_size", "code_font", "code_line_height", "density", "syntax_light", "syntax_dark", "diff_layout", "diff_context", "is_whitespace_ignored", "inline_diff", "navigator_width", "is_context_panel_pinned", "default_progression", "digest_runner", "agent_commands", "shortcuts", "onboarding", "updated_at" FROM `settings`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;--> statement-breakpoint
UPDATE `settings` SET `onboarding` = json_object('status', coalesce(json_extract(`onboarding`, '$.status'), 'NOT_STARTED'), 'completedItems', json('[]'), 'shownHints', json('[]'));--> statement-breakpoint
PRAGMA foreign_keys=ON;