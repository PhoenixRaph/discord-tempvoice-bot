export interface TempVoiceSettings {
  id: string;
  guild_id: string;
  creator_channel_id: string;
  category_id?: string;
  default_name: string;
  default_slots: number;
  default_bitrate: number;
  allowed_actions?: string;
  created_at: string;
  updated_at: string;
}

export interface TempChannel {
  id: string;
  guild_id: string;
  channel_id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface GuildLogSettings {
  id: string;
  guild_id: string;
  bot_log_enabled: boolean;
  bot_log_channel_id: string | null;
  temp_channel_log_enabled: boolean;
  temp_channel_log_channel_id: string | null;
  move_log_enabled: boolean;
  move_log_channel_id: string | null;
  move_log_mode: 'simple' | 'detailed';
  mute_log_enabled: boolean;
  mute_log_channel_id: string | null;
  mute_log_mode: 'simple' | 'detailed';
  created_at: string;
  updated_at: string;
}

export interface LogFilter {
  ban_actions: boolean;
  kick_actions: boolean;
  channel_creations: boolean;
  channel_deletions: boolean;
  auto_owner_transfers: boolean;
  manual_owner_transfers: boolean;
  channel_edits: boolean;
}

export interface DatabaseResult {
  lastID?: number;
  changes?: number;
}

export interface DatabaseError {
  code: string;
  message: string;
  errno?: number;
}

export interface DatabaseQueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface DatabaseTransaction {
  run: (sql: string, params?: unknown[]) => Promise<DatabaseResult>;
  get: <T>(sql: string, params?: unknown[]) => Promise<T | undefined>;
  all: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
  exec: (sql: string) => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}
