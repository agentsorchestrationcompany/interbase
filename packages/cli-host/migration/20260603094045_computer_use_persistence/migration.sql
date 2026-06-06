CREATE TABLE `computer_use_artifact` (
	`id` text PRIMARY KEY,
	`session_id` text NOT NULL,
	`kind` text NOT NULL,
	`mime_type` text NOT NULL,
	`bytes` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`deleted_at` integer,
	`delete_reason` text,
	`handle` text NOT NULL,
	`time_created` integer NOT NULL,
	`time_updated` integer NOT NULL,
	CONSTRAINT `fk_computer_use_artifact_session_id_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `computer_use_audit` (
	`id` text PRIMARY KEY,
	`session_id` text,
	`trace_id` text NOT NULL,
	`type` text NOT NULL,
	`event` text NOT NULL,
	`time_created` integer NOT NULL,
	`time_updated` integer NOT NULL,
	CONSTRAINT `fk_computer_use_audit_session_id_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `computer_use_artifact_session_idx` ON `computer_use_artifact` (`session_id`);--> statement-breakpoint
CREATE INDEX `computer_use_artifact_expires_at_idx` ON `computer_use_artifact` (`expires_at`);--> statement-breakpoint
CREATE INDEX `computer_use_artifact_deleted_at_idx` ON `computer_use_artifact` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `computer_use_audit_session_idx` ON `computer_use_audit` (`session_id`);--> statement-breakpoint
CREATE INDEX `computer_use_audit_trace_idx` ON `computer_use_audit` (`trace_id`);--> statement-breakpoint
CREATE INDEX `computer_use_audit_type_idx` ON `computer_use_audit` (`type`);
