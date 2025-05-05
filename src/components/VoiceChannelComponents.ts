import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

export function createVoiceChannelControls() {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('channel_settings')
        .setLabel('Kanal Einstellung')
        .setEmoji('⚙️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('transfer_owner')
        .setLabel('Transfer Owner')
        .setEmoji('👑')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('kick_user')
        .setLabel('Nutzer Kicken')
        .setEmoji('📞')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('toggle_user')
        .setLabel('Nutzer Ent-/Blocken')
        .setEmoji('👤')
        .setStyle(ButtonStyle.Secondary)
    );
}

export function createChannelSettingsModal(currentName: string, currentLimit: number, currentBitrate?: number, currentDescription?: string) {
  return new ModalBuilder()
    .setCustomId('channel_settings_modal')
    .setTitle('Kanaleinstellungen bearbeiten')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>()
        .addComponents(
          new TextInputBuilder()
            .setCustomId('channel_name')
            .setLabel('Kanalname')
            .setStyle(TextInputStyle.Short)
            .setValue(currentName)
            .setRequired(true)
            .setPlaceholder('» $user$ VC')
        ),
      new ActionRowBuilder<TextInputBuilder>()
        .addComponents(
          new TextInputBuilder()
            .setCustomId('user_limit')
            .setLabel('Nutzerlimit (0 = Unbegrenzt)')
            .setStyle(TextInputStyle.Short)
            .setValue(currentLimit.toString())
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(2)
        ),
      new ActionRowBuilder<TextInputBuilder>()
        .addComponents(
          new TextInputBuilder()
            .setCustomId('bitrate')
            .setLabel('Bitrate (In Kbps, 8-96 Oder 96-384 Nitro)')
            .setStyle(TextInputStyle.Short)
            .setValue(currentBitrate?.toString() ?? '')
            .setRequired(false)
            .setPlaceholder('Gib eine Bitrate ein')
        ),
      new ActionRowBuilder<TextInputBuilder>()
        .addComponents(
          new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Beschreibung')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(currentDescription ?? 'VC = Voice Chat ;)')
            .setRequired(false)
            .setPlaceholder('Eine Beschreibung für deinen Channel')
        )
    );
} 