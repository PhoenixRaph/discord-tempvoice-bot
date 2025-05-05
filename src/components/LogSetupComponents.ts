import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  StringSelectMenuBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import { GuildLogSettings, LogFilter } from '../database/types';

// Angepasste Typen für die UI-Komponenten
interface UIGuildLogSettings extends Omit<GuildLogSettings, 'id' | 'guild_id' | 'created_at' | 'updated_at'> {
  bot_log_channel_id: string | undefined;
  temp_channel_log_channel_id: string | undefined;
  move_log_channel_id: string | undefined;
  mute_log_channel_id: string | undefined;
}

export function createLogSetupEmbed(settings?: GuildLogSettings) {
  const embed = new EmbedBuilder()
    .setTitle('Voice Setup - Übersicht')
    .setDescription('Mit diesem Setup kannst du die Logging-Funktionen und Berechtigungen für den Voice-Bot konfigurieren. Wähle unten eine Seite aus, um mit der Einrichtung zu beginnen.')
    .setColor('#5865F2');

  if (settings) {
    embed.addFields(
      {
        name: 'Bot Log',
        value: `Status: ${settings.bot_log_enabled ? '✅ Aktiv' : '❌ Inaktiv'}\n` +
               `Kanal: ${settings.bot_log_channel_id ? `<#${settings.bot_log_channel_id}>` : 'Nicht konfiguriert'}`
      },
      {
        name: 'Temp Channel Log',
        value: `Status: ${settings.temp_channel_log_enabled ? '✅ Aktiv' : '❌ Inaktiv'}\n` +
               `Kanal: ${settings.temp_channel_log_channel_id ? `<#${settings.temp_channel_log_channel_id}>` : 'Nicht konfiguriert'}`
      },
      {
        name: 'Move Log',
        value: `Status: ${settings.move_log_enabled ? '✅ Aktiv' : '❌ Inaktiv'}\n` +
               `Kanal: ${settings.move_log_channel_id ? `<#${settings.move_log_channel_id}>` : 'Nicht konfiguriert'}\n` +
               `Modus: ${settings.move_log_mode === 'detailed' ? 'Detailliert (mit Emojis)' : 'Einfach'}`
      },
      {
        name: 'Mute Log',
        value: `Status: ${settings.mute_log_enabled ? '✅ Aktiv' : '❌ Inaktiv'}\n` +
               `Kanal: ${settings.mute_log_channel_id ? `<#${settings.mute_log_channel_id}>` : 'Nicht konfiguriert'}\n` +
               `Modus: ${settings.mute_log_mode === 'detailed' ? 'Detailliert (mit Emojis)' : 'Einfach'}`
      }
    );
  }

  return embed;
}

export function createLogTypeSelect() {
  return new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('log_type_select')
        .setPlaceholder('Wähle einen Log-Typ aus...')
        .addOptions([
          new StringSelectMenuOptionBuilder()
            .setLabel('Bot Log')
            .setDescription('Konfiguration der Bot-Logs')
            .setValue('bot_log')
            .setEmoji('🤖'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Temp Channel Log')
            .setDescription('Konfiguration der Temp Channel Logs')
            .setValue('temp_channel_log')
            .setEmoji('📝'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Move Log')
            .setDescription('Konfiguration der Bewegungs-Logs')
            .setValue('move_log')
            .setEmoji('🔄'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Mute Log')
            .setDescription('Konfiguration der Mute-Logs')
            .setValue('mute_log')
            .setEmoji('🔇')
        ])
    );
}

export function createLogChannelSelect(channels: { id: string; name: string }[]) {
  return new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('log_channel_select')
        .setPlaceholder('Wähle einen Kanal aus...')
        .addOptions(
          channels.map(channel => 
            new StringSelectMenuOptionBuilder()
              .setLabel(channel.name)
              .setValue(channel.id)
          )
        )
    );
}

export function createLogModeSelect() {
  return new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('log_mode_select')
        .setPlaceholder('Wähle einen Modus aus...')
        .addOptions([
          new StringSelectMenuOptionBuilder()
            .setLabel('Einfach')
            .setDescription('Einfache Textausgabe ohne Emojis')
            .setValue('simple'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Detailliert')
            .setDescription('Detaillierte Ausgabe mit Emojis')
            .setValue('detailed')
        ])
    );
}

export function createLogControlButtons(isEnabled: boolean) {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('toggle_log')
        .setLabel(isEnabled ? 'Deaktivieren' : 'Aktivieren')
        .setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('save_settings')
        .setLabel('Einstellungen speichern')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!isEnabled)
    );
}

export function createLogFilterButtons(filters: LogFilter) {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('toggle_ban_actions')
        .setLabel('Bann-Aktionen')
        .setStyle(filters.ban_actions ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('toggle_kick_actions')
        .setLabel('Kick-Aktionen')
        .setStyle(filters.kick_actions ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('toggle_channel_actions')
        .setLabel('Kanal-Aktionen')
        .setStyle(filters.channel_creations || filters.channel_deletions ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('toggle_owner_actions')
        .setLabel('Besitzer-Aktionen')
        .setStyle(filters.auto_owner_transfers || filters.manual_owner_transfers ? ButtonStyle.Success : ButtonStyle.Secondary)
    );
} 