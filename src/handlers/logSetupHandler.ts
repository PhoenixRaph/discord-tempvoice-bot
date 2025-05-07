import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ChatInputCommandInteraction,
  ChannelType,
} from 'discord.js';
import { randomUUID } from 'crypto';
import db from '../database/db';
import { LogFilter } from '../database/types';
import {
  createLogSetupEmbed,
  createLogTypeSelect,
  createLogChannelSelect,
  createLogModeSelect,
  createLogControlButtons,
  createLogFilterButtons,
} from '../components/LogSetupComponents';

// Cache für den Setup-Prozess
interface LogSetupState {
  currentType: 'bot_log' | 'temp_channel_log' | 'move_log' | 'mute_log' | null;
  settings: {
    botLogEnabled: boolean;
    botLogChannelId: string | null;
    tempChannelLogEnabled: boolean;
    tempChannelLogChannelId: string | null;
    moveLogEnabled: boolean;
    moveLogChannelId: string | null;
    moveLogMode: 'simple' | 'detailed';
    muteLogEnabled: boolean;
    muteLogChannelId: string | null;
    muteLogMode: 'simple' | 'detailed';
  };
  filters: LogFilter;
}

const setupCache = new Map<string, LogSetupState>();

export async function handleLogSetupCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  // Lade existierende Einstellungen
  const existingSettings = await db.getGuildLogSettings(interaction.guild.id);
  const existingFilters = await db.getLogFilters(interaction.guild.id);

  // Initialisiere Cache
  setupCache.set(interaction.guild.id, {
    currentType: null,
    settings: {
      botLogEnabled: existingSettings?.bot_log_enabled ?? false,
      botLogChannelId: existingSettings?.bot_log_channel_id ?? null,
      tempChannelLogEnabled: existingSettings?.temp_channel_log_enabled ?? false,
      tempChannelLogChannelId: existingSettings?.temp_channel_log_channel_id ?? null,
      moveLogEnabled: existingSettings?.move_log_enabled ?? false,
      moveLogChannelId: existingSettings?.move_log_channel_id ?? null,
      moveLogMode: existingSettings?.move_log_mode ?? 'simple',
      muteLogEnabled: existingSettings?.mute_log_enabled ?? false,
      muteLogChannelId: existingSettings?.mute_log_channel_id ?? null,
      muteLogMode: existingSettings?.mute_log_mode ?? 'simple',
    },
    filters: {
      ban_actions: existingFilters?.ban_actions ?? true,
      kick_actions: existingFilters?.kick_actions ?? true,
      channel_deletions: existingFilters?.channel_deletions ?? true,
      channel_creations: existingFilters?.channel_creations ?? true,
      auto_owner_transfers: existingFilters?.auto_owner_transfers ?? true,
      manual_owner_transfers: existingFilters?.manual_owner_transfers ?? true,
      channel_edits: existingFilters?.channel_edits ?? true,
    },
  });

  const embed = createLogSetupEmbed(
    existingSettings ?? {
      id: '',
      guild_id: interaction.guild.id,
      bot_log_enabled: false,
      bot_log_channel_id: null,
      temp_channel_log_enabled: false,
      temp_channel_log_channel_id: null,
      move_log_enabled: false,
      move_log_channel_id: null,
      move_log_mode: 'simple',
      mute_log_enabled: false,
      mute_log_channel_id: null,
      mute_log_mode: 'simple',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  );
  const typeSelect = createLogTypeSelect();

  await interaction.reply({
    embeds: [embed],
    components: [typeSelect],
    flags: ['Ephemeral'],
  });
}

export async function handleLogSelectMenu(interaction: StringSelectMenuInteraction) {
  if (!interaction.guild) return;

  const state = setupCache.get(interaction.guild.id);
  if (!state) return;

  switch (interaction.customId) {
    case 'log_type_select':
      const selectedType = interaction.values[0] as LogSetupState['currentType'];
      state.currentType = selectedType;
      setupCache.set(interaction.guild.id, state);
      await updateLogSetupMessage(interaction);
      break;

    case 'log_channel_select':
      if (!state.currentType) return;

      const channelId = interaction.values[0];
      switch (state.currentType) {
        case 'bot_log':
          state.settings.botLogChannelId = channelId;
          state.settings.botLogEnabled = true;
          break;
        case 'temp_channel_log':
          state.settings.tempChannelLogChannelId = channelId;
          state.settings.tempChannelLogEnabled = true;
          break;
        case 'move_log':
          state.settings.moveLogChannelId = channelId;
          state.settings.moveLogEnabled = true;
          break;
        case 'mute_log':
          state.settings.muteLogChannelId = channelId;
          state.settings.muteLogEnabled = true;
          break;
      }
      setupCache.set(interaction.guild.id, state);
      await updateLogSetupMessage(interaction);
      break;

    case 'log_mode_select':
      if (!state.currentType) return;

      const mode = interaction.values[0] as 'simple' | 'detailed';
      if (state.currentType === 'move_log') {
        state.settings.moveLogMode = mode;
      } else if (state.currentType === 'mute_log') {
        state.settings.muteLogMode = mode;
      }
      setupCache.set(interaction.guild.id, state);
      await updateLogSetupMessage(interaction);
      break;
  }
}

export async function handleLogButton(interaction: ButtonInteraction) {
  console.log('\n=== handleLogButton Start ===');
  console.log('Button ID:', interaction.customId);
  console.log('Guild ID:', interaction.guild?.id);

  if (!interaction.guild) {
    console.error('❌ No guild found in interaction');
    return;
  }

  const state = setupCache.get(interaction.guild.id);
  if (!state) {
    console.error('❌ No state found in cache for guild:', interaction.guild.id);
    return;
  }

  console.log('Current state:', JSON.stringify(state, null, 2));

  switch (interaction.customId) {
    case 'toggle_log':
      if (!state.currentType) return;

      switch (state.currentType) {
        case 'bot_log':
          state.settings.botLogEnabled = !state.settings.botLogEnabled;
          break;
        case 'temp_channel_log':
          state.settings.tempChannelLogEnabled = !state.settings.tempChannelLogEnabled;
          break;
        case 'move_log':
          state.settings.moveLogEnabled = !state.settings.moveLogEnabled;
          break;
        case 'mute_log':
          state.settings.muteLogEnabled = !state.settings.muteLogEnabled;
          break;
      }
      setupCache.set(interaction.guild.id, state);
      await updateLogSetupMessage(interaction);
      break;

    case 'save_settings':
      console.log('🔄 Processing save_settings button...');
      try {
        // Sofortige Antwort an Discord
        console.log('Attempting to defer update...');
        await interaction.deferUpdate();
        console.log('✅ Update deferred successfully');
        
        // Speichere die Einstellungen
        console.log('Calling saveLogSettings...');
        await saveLogSettings(interaction);
        console.log('✅ saveLogSettings completed');
      } catch (error) {
        console.error('❌ Error in save_settings button handler:', error);
        if (error instanceof Error) {
          console.error('Error details:', error.message);
          console.error('Error stack:', error.stack);
        }
        try {
          await interaction.editReply({
            content: '❌ Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
          });
        } catch (replyError) {
          console.error('❌ Failed to send error message:', replyError);
        }
      }
      break;

    case 'toggle_ban_actions':
      state.filters.ban_actions = !state.filters.ban_actions;
      setupCache.set(interaction.guild.id, state);
      await updateLogSetupMessage(interaction);
      break;

    case 'toggle_kick_actions':
      state.filters.kick_actions = !state.filters.kick_actions;
      setupCache.set(interaction.guild.id, state);
      await updateLogSetupMessage(interaction);
      break;

    case 'toggle_channel_actions':
      state.filters.channel_creations = !state.filters.channel_creations;
      state.filters.channel_deletions = !state.filters.channel_deletions;
      state.filters.channel_edits = !state.filters.channel_edits;
      setupCache.set(interaction.guild.id, state);
      await updateLogSetupMessage(interaction);
      break;

    case 'toggle_owner_actions':
      state.filters.auto_owner_transfers = !state.filters.auto_owner_transfers;
      state.filters.manual_owner_transfers = !state.filters.manual_owner_transfers;
      setupCache.set(interaction.guild.id, state);
      await updateLogSetupMessage(interaction);
      break;
  }
  console.log('=== handleLogButton End ===\n');
}

async function updateLogSetupMessage(interaction: ButtonInteraction | StringSelectMenuInteraction) {
  const state = setupCache.get(interaction.guild!.id);
  if (!state) return;

  const components = [];

  // Immer Log-Typ-Auswahl anzeigen
  components.push(createLogTypeSelect());

  if (state.currentType) {
    // Kanal-Auswahl für den aktuellen Log-Typ
    const textChannels = interaction
      .guild!.channels.cache.filter((channel) => channel.type === ChannelType.GuildText)
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
      }));
    components.push(createLogChannelSelect(textChannels));

    // Modus-Auswahl für Move- und Mute-Logs
    if (state.currentType === 'move_log' || state.currentType === 'mute_log') {
      components.push(createLogModeSelect());
    }

    // Kontroll-Buttons
    let isEnabled = false;
    switch (state.currentType) {
      case 'bot_log':
        isEnabled = state.settings.botLogEnabled;
        break;
      case 'temp_channel_log':
        isEnabled = state.settings.tempChannelLogEnabled;
        break;
      case 'move_log':
        isEnabled = state.settings.moveLogEnabled;
        break;
      case 'mute_log':
        isEnabled = state.settings.muteLogEnabled;
        break;
    }
    components.push(createLogControlButtons(isEnabled));

    // Filter-Buttons für Temp Channel Log
    if (state.currentType === 'temp_channel_log') {
      components.push(createLogFilterButtons(state.filters));
    }
  }

  // Erstelle das Embed mit den aktuellen Einstellungen
  const embed = createLogSetupEmbed({
    id: '',
    guild_id: interaction.guild!.id,
    bot_log_enabled: state.settings.botLogEnabled,
    bot_log_channel_id: state.settings.botLogChannelId,
    temp_channel_log_enabled: state.settings.tempChannelLogEnabled,
    temp_channel_log_channel_id: state.settings.tempChannelLogChannelId,
    move_log_enabled: state.settings.moveLogEnabled,
    move_log_channel_id: state.settings.moveLogChannelId,
    move_log_mode: state.settings.moveLogMode,
    mute_log_enabled: state.settings.muteLogEnabled,
    mute_log_channel_id: state.settings.muteLogChannelId,
    mute_log_mode: state.settings.muteLogMode,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({
        embeds: [embed],
        components,
      });
    } else {
      await interaction.update({
        embeds: [embed],
        components,
      });
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Nachricht:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

async function saveLogSettings(interaction: ButtonInteraction) {
  console.log('\n=== Starting saveLogSettings ===');
  console.log('Interaction ID:', interaction.id);
  console.log('Guild ID:', interaction.guild?.id);
  
  if (!interaction.guild) {
    console.error('\n❌ ERROR: No guild found in interaction');
    return;
  }

  const state = setupCache.get(interaction.guild.id);
  if (!state) {
    console.error('\n❌ ERROR: No state found in cache for guild:', interaction.guild.id);
    return;
  }

  if (!state.currentType) {
    console.error('\n❌ ERROR: No current type in state for guild:', interaction.guild.id);
    return;
  }

  try {
    console.log('\n📝 Current state:', JSON.stringify(state, null, 2));
    
    // Erstelle oder aktualisiere die Einstellungen
    console.log('\n🔍 Fetching existing settings from database...');
    const existingSettings = await db.getGuildLogSettings(interaction.guild.id);
    console.log('\n📋 Existing settings from database:', JSON.stringify(existingSettings, null, 2));

    const settingsData = {
      botLogEnabled: state.settings.botLogEnabled,
      botLogChannelId: state.settings.botLogChannelId ?? undefined,
      tempChannelLogEnabled: state.settings.tempChannelLogEnabled,
      tempChannelLogChannelId: state.settings.tempChannelLogChannelId ?? undefined,
      moveLogEnabled: state.settings.moveLogEnabled,
      moveLogChannelId: state.settings.moveLogChannelId ?? undefined,
      moveLogMode: state.settings.moveLogMode,
      muteLogEnabled: state.settings.muteLogEnabled,
      muteLogChannelId: state.settings.muteLogChannelId ?? undefined,
      muteLogMode: state.settings.muteLogMode,
    };

    console.log('\n💾 Preparing settings data:', JSON.stringify(settingsData, null, 2));

    if (existingSettings) {
      console.log('\n🔄 Updating existing settings...');
      const updateData = {
        bot_log_enabled: state.settings.botLogEnabled,
        bot_log_channel_id: state.settings.botLogChannelId ?? undefined,
        temp_channel_log_enabled: state.settings.tempChannelLogEnabled,
        temp_channel_log_channel_id: state.settings.tempChannelLogChannelId ?? undefined,
        move_log_enabled: state.settings.moveLogEnabled,
        move_log_channel_id: state.settings.moveLogChannelId ?? undefined,
        move_log_mode: state.settings.moveLogMode,
        mute_log_enabled: state.settings.muteLogEnabled,
        mute_log_channel_id: state.settings.muteLogChannelId ?? undefined,
        mute_log_mode: state.settings.muteLogMode,
      };
      console.log('📤 Update data to be sent:', JSON.stringify(updateData, null, 2));
      try {
        console.log('Attempting to update settings in database...');
        await db.updateGuildLogSettings(interaction.guild.id, updateData);
        console.log('✅ Settings updated successfully in database');
      } catch (dbError) {
        console.error('❌ Database update error:', dbError);
        if (dbError instanceof Error) {
          console.error('Error message:', dbError.message);
          console.error('Error stack:', dbError.stack);
        }
        throw dbError;
      }
    } else {
      console.log('\n➕ Creating new settings...');
      const createData = {
        id: randomUUID(),
        guildId: interaction.guild.id,
        ...settingsData,
      };
      console.log('📤 Create data to be sent:', JSON.stringify(createData, null, 2));
      try {
        console.log('Attempting to create settings in database...');
        await db.createGuildLogSettings(createData);
        console.log('✅ New settings created successfully in database');
      } catch (dbError) {
        console.error('❌ Database create error:', dbError);
        if (dbError instanceof Error) {
          console.error('Error message:', dbError.message);
          console.error('Error stack:', dbError.stack);
        }
        throw dbError;
      }
    }

    // Aktualisiere die Filter
    console.log('\n🔍 Preparing to save filters:', JSON.stringify(state.filters, null, 2));
    try {
      console.log('Attempting to update filters in database...');
      await db.updateLogFilters(interaction.guild.id, state.filters);
      console.log('✅ Filters updated successfully in database');
    } catch (filterError) {
      console.error('\n❌ ERROR: Failed to save filters:', filterError);
      if (filterError instanceof Error) {
        console.error('Error details:', filterError.message);
        console.error('Error stack:', filterError.stack);
      }
      throw filterError;
    }

    // Lösche den Cache nach erfolgreichem Speichern
    setupCache.delete(interaction.guild.id);
    console.log('\n🗑️ Cache cleared');

    // Sende die Erfolgsmeldung
    try {
      console.log('Attempting to send success message...');
      await interaction.editReply({
        content: '✅ Die Einstellungen wurden erfolgreich gespeichert!',
      });
      console.log('✅ Success message sent');
    } catch (replyError) {
      console.error('\n❌ ERROR: Failed to send success message:', replyError);
      if (replyError instanceof Error) {
        console.error('Error details:', replyError.message);
        console.error('Error stack:', replyError.stack);
      }
    }
  } catch (error) {
    console.error('\n❌ ERROR: Failed to save log settings:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }

    // Sende die Fehlermeldung
    try {
      console.log('Attempting to send error message...');
      await interaction.editReply({
        content: '❌ Es ist ein Fehler beim Speichern der Einstellungen aufgetreten. Bitte versuchen Sie es erneut.',
      });
      console.log('✅ Error message sent');
    } catch (replyError) {
      console.error('\n❌ ERROR: Failed to send error message:', replyError);
      if (replyError instanceof Error) {
        console.error('Error details:', replyError.message);
        console.error('Error stack:', replyError.stack);
      }
    }
  }
  
  console.log('\n=== Finished saveLogSettings ===\n');
}
