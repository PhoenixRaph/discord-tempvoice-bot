import sqlite3 from 'sqlite3';
import { join } from 'path';
import { promisify } from 'util';
import { TempVoiceSettings, TempChannel, GuildLogSettings, LogFilter } from './types';
import { DatabaseResult, DatabaseError } from './types';
import { randomUUID } from 'crypto';

// Initialize database
const db = new sqlite3.Database(join(process.cwd(), 'data.db'));

// Promisify run and get methods with proper typing
type SqliteGet = {
  <T = unknown>(sql: string, params: unknown[]): Promise<T | undefined>;
  <T = unknown>(sql: string): Promise<T | undefined>;
};
type SqliteRun = {
  (sql: string, params: unknown[]): Promise<sqlite3.RunResult>;
  (sql: string): Promise<sqlite3.RunResult>;
};
type SqliteAll = {
  (sql: string, params: unknown[]): Promise<unknown[]>;
  (sql: string): Promise<unknown[]>;
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
    category_id TEXT,
    default_name TEXT NOT NULL DEFAULT '{username}''s Channel',
    default_slots INTEGER NOT NULL DEFAULT 0,
    default_bitrate INTEGER NOT NULL DEFAULT 64000,
    allowed_actions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(guild_id, creator_channel_id)
  )
`);

// Migration: Füge updated_at hinzu, falls sie nicht existiert
try {
  await runAsync(`
    ALTER TABLE temp_voice_settings 
    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  `);
  console.log('✅ Migration: updated_at Spalte hinzugefügt');
} catch (error) {
  // Ignoriere Fehler, wenn die Spalte bereits existiert
  console.log('ℹ️ Migration: updated_at Spalte existiert bereits');
}

// Migration: Füge allowed_actions hinzu, falls sie nicht existiert
try {
  await runAsync(`
    ALTER TABLE temp_voice_settings 
    ADD COLUMN allowed_actions TEXT
  `);
  console.log('✅ Migration: allowed_actions Spalte hinzugefügt');
} catch (error) {
  // Ignoriere Fehler, wenn die Spalte bereits existiert
  console.log('ℹ️ Migration: allowed_actions Spalte existiert bereits');
}

// Migration: Setze Standardwerte für allowed_actions
try {
  await runAsync(`
    UPDATE temp_voice_settings 
    SET allowed_actions = '[]' 
    WHERE allowed_actions IS NULL
  `);
  console.log('✅ Migration: Standardwerte für allowed_actions gesetzt');
} catch (error) {
  console.error('❌ Fehler beim Setzen der Standardwerte:', error);
}

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

// Test table for debugging
await runAsync(`
  CREATE TABLE IF NOT EXISTS test_entries (
    id TEXT PRIMARY KEY,
    test_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('✅ Database tables initialized');

export async function findSettings(
  guildId: string,
  creatorChannelId: string,
): Promise<TempVoiceSettings | undefined> {
  try {
    const result = (await getAsync(
      'SELECT * FROM temp_voice_settings WHERE guild_id = ? AND creator_channel_id = ?',
      [guildId, creatorChannelId],
    )) as TempVoiceSettings | undefined;
    return result;
  } catch (error) {
    const dbError = error as DatabaseError;
    throw new Error(`Failed to find settings: ${dbError.message}`);
  }
}

export async function createSettings(settings: TempVoiceSettings): Promise<DatabaseResult> {
  try {
    console.log('📝 Erstelle neue Einstellungen:', settings);
    
    const result = await runAsync(
      `INSERT INTO temp_voice_settings (
        id, guild_id, creator_channel_id, category_id, 
        default_name, default_slots, default_bitrate, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        settings.id,
        settings.guild_id,
        settings.creator_channel_id,
        settings.category_id || null,
        settings.default_name,
        settings.default_slots,
        settings.default_bitrate,
        settings.created_at,
        settings.updated_at,
      ],
    );
    
    console.log('✅ Einstellungen erfolgreich erstellt');
    return result;
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Einstellungen:', error);
    const dbError = error as DatabaseError;
    throw new Error(`Failed to create settings: ${dbError.message}`);
  }
}

export async function updateSettings(
  guildId: string,
  creatorChannelId: string,
  data: Partial<TempVoiceSettings>
) {
  try {
    console.log('📝 Aktualisiere Einstellungen:', { guildId, creatorChannelId, data });
    
    const updates: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'guild_id' && key !== 'creator_channel_id') {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    values.push(guildId, creatorChannelId);

    const query = `UPDATE temp_voice_settings 
                  SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                  WHERE guild_id = ? AND creator_channel_id = ?`;

    console.log('📝 SQL Query:', query);
    console.log('📦 Parameter:', values);

    await runAsync(query, values);
    console.log('✅ Einstellungen erfolgreich aktualisiert');
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Einstellungen:', error);
    throw error;
  }
}

export async function deleteGuildSettings(guildId: string) {
  await runAsync('DELETE FROM temp_voice_settings WHERE guild_id = ?', [guildId]);
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
    [data.id, data.guildId, data.channelId, data.ownerId, data.name, data.slots, data.bitrate],
  );
}

export async function findTempChannel(channelId: string): Promise<TempChannel | undefined> {
  const result = await getAsync('SELECT * FROM temp_voice_channels WHERE channel_id = ?', [channelId]);
  return result as TempChannel | undefined;
}

export async function getAllTempChannels(): Promise<TempChannel[]> {
  const results = await allAsync('SELECT * FROM temp_voice_channels');
  return results as TempChannel[];
}

export async function deleteTempChannel(id: string) {
  const query = 'DELETE FROM temp_voice_channels WHERE id = ?';
  await runAsync(query, [id]);
}

export async function updateTempChannel(id: string, data: { ownerId: string }) {
  const query = 'UPDATE temp_voice_channels SET owner_id = ? WHERE id = ?';
  await runAsync(query, [data.ownerId, id]);
}

export async function getGuildLogSettings(guildId: string): Promise<GuildLogSettings | null> {
  const result = (await getAsync('SELECT * FROM guild_log_settings WHERE guild_id = ?', [
    guildId,
  ])) as GuildLogSettings | null;
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
  try {
    console.log('\n=== Creating Guild Log Settings ===');
    console.log('📤 Input data:', JSON.stringify(data, null, 2));

    const query = `INSERT INTO guild_log_settings (
      id, guild_id, bot_log_enabled, bot_log_channel_id,
      temp_channel_log_enabled, temp_channel_log_channel_id,
      move_log_enabled, move_log_channel_id, move_log_mode,
      mute_log_enabled, mute_log_channel_id, mute_log_mode,
      audit_log_access
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
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
      data.auditLogAccess ?? false,
    ];

    console.log('📝 SQL Query:', query);
    console.log('📦 Parameters:', JSON.stringify(params, null, 2));

    await runAsync(query, params);
    console.log('✅ Successfully created guild log settings');
    console.log('=== Finished Creating Guild Log Settings ===\n');
  } catch (error) {
    console.error('\n❌ ERROR: Failed to create guild log settings:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

export async function updateGuildLogSettings(guildId: string, data: Partial<GuildLogSettings>) {
  try {
    console.log('\n=== Updating Guild Log Settings ===');
    console.log('🎯 Guild ID:', guildId);
    console.log('📤 Update data:', JSON.stringify(data, null, 2));

    const updates: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'guild_id' && key !== 'created_at' && key !== 'updated_at') {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    values.push(guildId);

    const query = `UPDATE guild_log_settings SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?`;
    console.log('📝 SQL Query:', query);
    console.log('📦 Parameters:', JSON.stringify(values, null, 2));

    await runAsync(query, values);
    console.log('✅ Successfully updated guild log settings');
    console.log('=== Finished Updating Guild Log Settings ===\n');
  } catch (error) {
    console.error('\n❌ ERROR: Failed to update guild log settings:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

export async function getLogFilters(guildId: string): Promise<LogFilter | null> {
  const result = (await getAsync('SELECT * FROM log_filters WHERE guild_id = ?', [
    guildId,
  ])) as LogFilter | null;
  return result;
}

export async function updateLogFilters(guildId: string, filters: Partial<LogFilter>) {
  try {
    console.log('\n=== Updating Log Filters ===');
    console.log('🎯 Guild ID:', guildId);
    console.log('📤 Filter data:', JSON.stringify(filters, null, 2));

    // Prüfe, ob die Log-Einstellungen existieren
    const logSettings = await getAsync('SELECT * FROM guild_log_settings WHERE guild_id = ?', [guildId]);
    if (!logSettings) {
      console.log('⚠️ Log settings not found, creating default entry...');
      await runAsync(
        `INSERT INTO guild_log_settings (
          id, guild_id, bot_log_enabled, temp_channel_log_enabled,
          move_log_enabled, move_log_mode, mute_log_enabled, mute_log_mode
        ) VALUES (?, ?, false, false, false, 'simple', false, 'simple')`,
        [randomUUID(), guildId],
      );
      console.log('✅ Created default log settings');
    }

    // Prüfe, ob ein Filter-Eintrag existiert
    const existingFilter = await getAsync('SELECT * FROM log_filters WHERE guild_id = ?', [guildId]);

    if (!existingFilter) {
      console.log('➕ Creating new filter entry...');
      const query = `INSERT INTO log_filters (
        guild_id, ban_actions, kick_actions, channel_deletions,
        channel_creations, auto_owner_transfers, manual_owner_transfers,
        channel_edits
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

      const params = [
        guildId,
        filters.ban_actions ?? true,
        filters.kick_actions ?? true,
        filters.channel_deletions ?? true,
        filters.channel_creations ?? true,
        filters.auto_owner_transfers ?? true,
        filters.manual_owner_transfers ?? true,
        filters.channel_edits ?? true,
      ];

      console.log('📝 SQL Query:', query);
      console.log('📦 Parameters:', JSON.stringify(params, null, 2));

      await runAsync(query, params);
      console.log('✅ Successfully created new filter entry');
    } else {
      console.log('🔄 Updating existing filter entry...');
      const updates: string[] = [];
      const values: unknown[] = [];

      Object.entries(filters).forEach(([key, value]) => {
        if (key !== 'guild_id') {
          updates.push(`${key} = ?`);
          values.push(value);
        }
      });

      values.push(guildId);

      const query = `UPDATE log_filters SET ${updates.join(', ')} WHERE guild_id = ?`;
      console.log('📝 SQL Query:', query);
      console.log('📦 Parameters:', JSON.stringify(values, null, 2));

      await runAsync(query, values);
      console.log('✅ Successfully updated filter entry');
    }
    console.log('=== Finished Updating Log Filters ===\n');
  } catch (error) {
    console.error('\n❌ ERROR: Failed to update log filters:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

export async function getAllSettings(guildId: string): Promise<TempVoiceSettings[]> {
  const result = (await allAsync('SELECT * FROM temp_voice_settings WHERE guild_id = ?', [
    guildId,
  ])) as TempVoiceSettings[];
  return result;
}

export async function deleteCreatorSettings(guildId: string, creatorChannelId: string) {
  await runAsync('DELETE FROM temp_voice_settings WHERE guild_id = ? AND creator_channel_id = ?', [
    guildId,
    creatorChannelId,
  ]);
}

export async function getAllConfigs(guildId: string): Promise<{ id: string; name: string }[]> {
  try {
    const configs = await allAsync(`
      SELECT creator_channel_id as id, creator_channel_id as name
      FROM temp_voice_settings
      WHERE guild_id = ?
    `, [guildId]);
    
    return configs as { id: string; name: string }[];
  } catch (error) {
    console.error('Error getting all configs:', error);
    return [];
  }
}

export default {
  findSettings,
  createSettings,
  updateSettings,
  deleteGuildSettings,
  createTempChannel,
  findTempChannel,
  getAllTempChannels,
  deleteTempChannel,
  updateTempChannel,
  getGuildLogSettings,
  createGuildLogSettings,
  updateGuildLogSettings,
  getLogFilters,
  updateLogFilters,
  getAllSettings,
  deleteCreatorSettings,
  getAllConfigs,
  runAsync,
  getAsync,
  allAsync,
};
