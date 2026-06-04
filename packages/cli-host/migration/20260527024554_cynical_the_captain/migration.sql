CREATE TABLE `thread_goal` (
	`session_id` text PRIMARY KEY,
	`goal_id` text NOT NULL,
	`objective` text NOT NULL,
	`status` text NOT NULL,
	`token_budget` integer,
	`tokens_used` integer DEFAULT 0 NOT NULL,
	`time_used_seconds` integer DEFAULT 0 NOT NULL,
	`budget_limit_reported` integer DEFAULT false NOT NULL,
	`time_created` integer NOT NULL,
	`time_updated` integer NOT NULL,
	CONSTRAINT `fk_thread_goal_session_id_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE CASCADE
);
