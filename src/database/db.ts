import sqlite3 from 'sqlite3';
import { join } from 'path';
import { promisify } from 'util';
import { TempVoiceSettings, TempVoiceChannel, GuildLogSettings, LogFilter } from './types';

// Initialize database
const db = new sqlite3.Database(join(process.cwd(), 'data.db'));

// Promisify run and get methods with proper typing
type RunResult = { lastID: number; changes: number };
type SqliteGet = {
  (sql: string, params: any[]): Promise<any>;
  (sql: string): Promise<any>;
};
type SqliteRun = {
  (sql: string, params: any[]): Promise<RunResult>;
  (sql: string): Promise<RunResult>;
};
type SqliteAll = {
  (sql: string, params: any[]): Promise<any[]>;
  (sql: string): Promise<any[]>;
};

const runAsync = promisify(db.run).bind(db) as SqliteRun;
const getAsync = promisify(db.get).bind(db) as SqliteGet;
const allAsync = promisify(db.all).bind(db) as SqliteAll;

// Initialize tables
await runAsync(`
  CREATE TABLE IF NOT EXISTS temp_voice_settings (
    id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    creator_channel_id TEXT NOT NULL,
    default_name TEXT NOT NULL DEFAULT '{username}''s Channel',
    default_slots INTEGER NOT NULL DEFAULT 0,
    default_bitrate INTEGER NOT NULL DEFAULT 64000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, creator_channel_id)
  )
`);

await runAsync(`
  CREATE TABLE IF NOT EXISTS temp_voice_channels (
    id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slots INTEGER NOT NULL,
    bitrate INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

await runAsync(`
  CREATE TABLE IF NOT EXISTS guild_log_settings (
    id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL UNIQUE,
    bot_log_enabled BOOLEAN DEFAULT false,
    bot_log_channel_id TEXT,
    temp_channel_log_enabled BOOLEAN DEFAULT false,
    temp_channel_log_channel_id TEXT,
    move_log_enabled BOOLEAN DEFAULT false,
    move_log_channel_id TEXT,
    move_log_mode TEXT CHECK(move_log_mode IN ('simple', 'detailed')) DEFAULT 'simple',
    mute_log_enabled BOOLEAN DEFAULT false,
    mute_log_channel_id TEXT,
    mute_log_mode TEXT CHECK(mute_log_mode IN ('simple', 'detailed')) DEFAULT 'simple',
    audit_log_access BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

await runAsync(`
  CREATE TABLE IF NOT EXISTS log_filters (
    guild_id TEXT PRIMARY KEY,
    ban_actions BOOLEAN DEFAULT true,
    unban_actions BOOLEAN DEFAULT true,
    kick_actions BOOLEAN DEFAULT true,
    channel_deletions BOOLEAN DEFAULT true,
    channel_creations BOOLEAN DEFAULT true,
    auto_owner_transfers BOOLEAN DEFAULT true,
    manual_owner_transfers BOOLEAN DEFAULT true,
    channel_edits BOOLEAN DEFAULT true,
    FOREIGN KEY (guild_id) REFERENCES guild_log_settings(guild_id) ON DELETE CASCADE
  )
`);

export async function findSettings(guildId: string, creatorChannelId: string): Promise<TempVoiceSettings | null> {
  const result = await getAsync(
    'SELECT * FROM temp_voice_settings WHERE guild_id = ? AND creator_channel_id = ?',
    [guildId, creatorChannelId]
  ) as TempVoiceSettings | null;
  return result;
}

export async function createSettings(data: {
  id: string;
  guildId: string;
  creatorChannelId: string;
  defaultName?: string;
  defaultSlots?: number;
  defaultBitrate?: number;
}) {
  await runAsync(
    `INSERT INTO temp_voice_settings (
      id, guild_id, creator_channel_id, default_name, default_slots, default_bitrate
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.guildId,
      data.creatorChannelId,
      data.defaultName || "{username}'s Channel",
      data.defaultSlots || 0,
      data.defaultBitrate || 64000
    ]
  );
}

export async function deleteGuildSettings(guildId: string) {
  await runAsync(
    'DELETE FROM temp_voice_settings WHERE guild_id = ?',
    [guildId]
  );
}

export async function createTempChannel(data: {
  id: string;
  guildId: string;
  channelId: string;
  ownerId: string;
  name: string;
  slots: number;
  bitrate: number;
}) {
  await runAsync(
    `INSERT INTO temp_voice_channels (
      id, guild_id, channel_id, owner_id, name, slots, bitrate
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.guildId,
      data.channelId,
      data.ownerId,
      data.name,
      data.slots,
      data.bitrate
    ]
  );
}

export async function findTempChannel(channelId: string): Promise<TempVoiceChannel | null> {
  const result = await getAsync(
    'SELECT * FROM temp_voice_channels WHERE channel_id = ?',
    [channelId]
  ) as TempVoiceChannel | null;
  return result;
}

export async function deleteTempChannel(id: string) {
  await runAsync(
    'DELETE FROM temp_voice_channels WHERE id = ?',
    [id]
  );
}

export async function getGuildLogSettings(guildId: string): Promise<GuildLogSettings | null> {
  const result = await getAsync(
    'SELECT * FROM guild_log_settings WHERE guild_id = ?',
    [guildId]
  ) as GuildLogSettings | null;
  return result;
}

export async function createGuildLogSettings(data: {
  id: string;
  guildId: string;
  botLogEnabled?: boolean;
  botLogChannelId?: string;
  tempChannelLogEnabled?: boolean;
  tempChannelLogChannelId?: string;
  moveLogEnabled?: boolean;
  moveLogChannelId?: string;
  moveLogMode?: 'simple' | 'detailed';
  muteLogEnabled?: boolean;
  muteLogChannelId?: string;
  muteLogMode?: 'simple' | 'detailed';
  auditLogAccess?: boolean;
}) {
  await runAsync(
    `INSERT INTO guild_log_settings (
      id, guild_id, bot_log_enabled, bot_log_channel_id,
      temp_channel_log_enabled, temp_channel_log_channel_id,
      move_log_enabled, move_log_channel_id, move_log_mode,
      mute_log_enabled, mute_log_channel_id, mute_log_mode,
      audit_log_access
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.guildId,
      data.botLogEnabled ?? false,
      data.botLogChannelId,
      data.tempChannelLogEnabled ?? false,
      data.tempChannelLogChannelId,
      data.moveLogEnabled ?? false,
      data.moveLogChannelId,
      data.moveLogMode ?? 'simple',
      data.muteLogEnabled ?? false,
      data.muteLogChannelId,
      data.muteLogMode ?? 'simple',
      data.auditLogAccess ?? false
    ]
  );
}

export async function updateGuildLogSettings(guildId: string, data: Partial<GuildLogSettings>) {
  const updates: string[] = [];
  const values: any[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'guild_id' && key !== 'created_at' && key !== 'updated_at') {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  });

  values.push(guildId);

  await runAsync(
    `UPDATE guild_log_settings SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?`,
    values
  );
}

export async function getLogFilters(guildId: string): Promise<LogFilter | null> {
  const result = await getAsync(
    'SELECT * FROM log_filters WHERE guild_id = ?',
    [guildId]
  ) as LogFilter | null;
  return result;
}

export async function updateLogFilters(guildId: string, filters: Partial<LogFilter>) {
  const updates: string[] = [];
  const values: any[] = [];

  Object.entries(filters).forEach(([key, value]) => {
    if (key !== 'guild_id') {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  });

  values.push(guildId);

  await runAsync(
    `UPDATE log_filters SET ${updates.join(', ')} WHERE guild_id = ?`,
    values
  );
}

export async function getAllSettings(guildId: string): Promise<TempVoiceSettings[]> {
  const result = await allAsync(
    'SELECT * FROM temp_voice_settings WHERE guild_id = ?',
    [guildId]
  ) as TempVoiceSettings[];
  return result;
}

export async function deleteCreatorSettings(guildId: string, creatorChannelId: string) {
  await runAsync(
    'DELETE FROM temp_voice_settings WHERE guild_id = ? AND creator_channel_id = ?',
    [guildId, creatorChannelId]
  );
}

export default {
  findSettings,
  createSettings,
  deleteGuildSettings,
  createTempChannel,
  findTempChannel,
  deleteTempChannel,
  getGuildLogSettings,
  createGuildLogSettings,
  updateGuildLogSettings,
  getLogFilters,
  updateLogFilters,
  getAllSettings,
  deleteCreatorSettings
}; 