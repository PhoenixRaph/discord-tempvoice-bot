import {
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
} from 'discord.js';

export function createSetupEmbed() {
  return new EmbedBuilder()
    .setTitle('Voice Channel Creator Setup')
    .setDescription('Konfiguriere die Einstellungen für den Voice-Channel Creator.')
    .setColor('#5865F2')
    .addFields(
      {
        name: 'Standardeinstellungen',
        value:
          'Diese Einstellungen werden für alle neuen temporären Channels verwendet:\n' +
          '• Name: Verwendet `$user$` als Platzhalter für den Benutzernamen\n' +
          '• Limit: Maximale Anzahl von Benutzern (0 = unbegrenzt)\n' +
          '• Bitrate: Audioqualität in kbps\n' +
          '• Beschreibung: Wird in der Kanalinfo angezeigt',
      },
      {
        name: 'Verfügbare Aktionen',
        value:
          '• ⚙️ Einstellungen bearbeiten\n' +
          '• 💾 Einstellungen speichern\n' +
          '• ❌ Setup abbrechen',
      },
    );
}

export function createSetupActionRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('channel_settings')
      .setLabel('Einstellungen')
      .setEmoji('⚙️')
      .setStyle(ButtonStyle.Primary),
  );
}

export function createCategorySelect() {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('category_select')
      .setPlaceholder('Kategorie auswählen...'),
  );
}

export function createPermissionsSelect() {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('permissions_select')
      .setPlaceholder('Kanal für Berechtigungen importieren...'),
  );
}

export function createActionButtons() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('save_settings')
      .setLabel('Speichern')
      .setEmoji('💾')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('cancel_setup')
      .setLabel('Abbrechen')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger),
  );
}

export function createBanButton() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('toggle_ban')
      .setLabel('Nutzer ent-/bannen')
      .setEmoji('🚫')
      .setStyle(ButtonStyle.Secondary),
  );
}
