import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} from 'discord.js';

export function createVoiceChannelControlEmbed(allowedActions: string[]) {
  const actionDescriptions: { [key: string]: string } = {
    'edit_name': '⚙️ Kanal Einstellungen (Name & Limit)',
    'transfer_owner': '👑 Besitzer übertragen',
    'kick_user': '📞 Nutzer kicken',
    'ban_user': '👤 Nutzer ent-/blocken'
  };

  const enabledActions = allowedActions
    .filter(action => actionDescriptions[action]) // Only show actions that have descriptions
    .map(action => `• ${actionDescriptions[action]}`)
    .join('\n');

  return new EmbedBuilder()
    .setTitle('Voice Channel Steuerung')
    .setDescription(
      'Hier sind die verfügbaren Aktionen für deinen temporären Voice-Channel:\n\n' +
      enabledActions
    )
    .setColor('#5865F2')
    .setTimestamp();
}

export function createVoiceChannelControls(allowedActions: string[]) {
  const buttons: ButtonBuilder[] = [];

  if (allowedActions.includes('edit_name')) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('channel_settings')
        .setLabel('Kanal Einstellung')
        .setEmoji('⚙️')
        .setStyle(ButtonStyle.Primary)
    );
  }

  if (allowedActions.includes('transfer_owner')) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('transfer_owner')
        .setLabel('Transfer Owner')
        .setEmoji('👑')
        .setStyle(ButtonStyle.Primary)
    );
  }

  if (allowedActions.includes('kick_user')) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('kick_user')
        .setLabel('Nutzer Kicken')
        .setEmoji('📞')
        .setStyle(ButtonStyle.Danger)
    );
  }

  if (allowedActions.includes('ban_user')) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('toggle_user')
        .setLabel('Nutzer Ent-/Blocken')
        .setEmoji('👤')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
}

export function createChannelSettingsModal(channelName: string, currentSlots: number) {
  const modal = new ModalBuilder()
    .setCustomId('channel_settings')
    .setTitle('Voice-Channel Einstellungen');

  const nameInput = new TextInputBuilder()
    .setCustomId('channel_name')
    .setLabel('Channel Name')
    .setPlaceholder('Gebe einen Namen für deinen Channel ein')
    .setValue(channelName)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const slotsInput = new TextInputBuilder()
    .setCustomId('channel_slots')
    .setLabel('Benutzer Limit (0 = Unendlich)')
    .setPlaceholder('Gebe die maximale Anzahl an Benutzern ein')
    .setValue(currentSlots.toString())
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
  const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(slotsInput);

  modal.addComponents(firstActionRow, secondActionRow);
  return modal;
}
