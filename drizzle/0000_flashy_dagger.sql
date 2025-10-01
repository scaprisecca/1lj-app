CREATE TABLE `backup_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_uri` text NOT NULL,
	`run_type` text NOT NULL,
	`run_time` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`size_bytes` integer,
	`status` text DEFAULT 'success' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_date` text NOT NULL,
	`html_body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_entries_entry_date_unique` ON `journal_entries` (`entry_date`);