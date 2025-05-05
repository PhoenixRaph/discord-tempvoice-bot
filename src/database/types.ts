export interface TempVoiceSettings {
  id: string;
  guild_id: string;
  creator_channel_id: string;
  default_name: string;
  default_slots: number;
  default_bitrate: number;
  created_at: Date;
}

export interface TempVoiceChannel {
  id: string;
  guild_id: string;
  channel_id: string;
  owner_id: string;
  name: string;
  slots: number;
  bitrate: number;
  created_at: Date;
}

export interface GuildLogSettings {
  id: string;
  guild_id: string;
  bot_log_enabled: boolean;
  bot_log_channel_id?: string;
  temp_channel_log_enabled: boolean;
  temp_channel_log_channel_id?: string;
  move_log_enabled: boolean;
  move_log_channel_id?: string;
  move_log_mode: 'simple' | 'detailed';
  mute_log_enabled: boolean;
  mute_log_channel_id?: string;
  mute_log_mode: 'simple' | 'detailed';
  audit_log_access: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LogFilter {
  ban_actions: boolean;
  unban_actions: boolean;
  kick_actions: boolean;
  channel_deletions: boolean;
  channel_creations: boolean;
  auto_owner_transfers: boolean;
  manual_owner_transfers: boolean;
  channel_edits: boolean;
} 