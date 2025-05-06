import {
  ButtonInteraction,
  ModalSubmitInteraction,
  ChannelType,
  GuildMember,
  VoiceChannel,
} from 'discord.js';
import { createChannelSettingsModal } from '../components/VoiceChannelComponents';
import db from '../database/db';

export async function handleVoiceControl(interaction: ButtonInteraction) {
  if (!interaction.guild || !interaction.member) return;

  const channelId = interaction.channelId;
  if (!channelId) return;

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel?.isVoiceBased() || !(channel instanceof VoiceChannel)) return;

  const tempChannel = await db.findTempChannel(channel.id);
  if (!tempChannel || tempChannel.owner_id !== interaction.user.id) {
    await interaction.reply({
      content: 'Du hast keine Berechtigung, diesen Kanal zu verwalten.',
      ephemeral: true,
    });
    return;
  }

  switch (interaction.customId) {
    case 'channel_settings':
      const modal = createChannelSettingsModal(channel.name, channel.userLimit ?? 0);
      await interaction.showModal(modal);
      break;
  }
}

export async function handleSettingsModal(interaction: ModalSubmitInteraction) {
  if (!interaction.guild || !interaction.member) return;

  const channelId = interaction.channelId;
  if (!channelId) return;

  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel?.isVoiceBased() || !(channel instanceof VoiceChannel)) return;

  const tempChannel = await db.findTempChannel(channel.id);
  if (!tempChannel || tempChannel.owner_id !== interaction.user.id) {
    await interaction.reply({
      content: 'Du hast keine Berechtigung, diesen Kanal zu verwalten.',
      ephemeral: true,
    });
    return;
  }

  if (interaction.customId === 'channel_settings_modal') {
    const newName = interaction.fields.getTextInputValue('channel_name');
    const newLimit = parseInt(interaction.fields.getTextInputValue('user_limit'));

    if (isNaN(newLimit) || newLimit < 0 || newLimit > 99) {
      await interaction.reply({
        content: 'Bitte gib eine gültige Zahl zwischen 0 und 99 ein.',
        ephemeral: true,
      });
      return;
    }

    try {
      await channel.edit({
        name: newName,
        userLimit: newLimit === 0 ? undefined : newLimit,
      });

      await interaction.reply({
        content: 'Einstellungen wurden erfolgreich aktualisiert!',
        ephemeral: true,
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Kanaleinstellungen:', error);
      await interaction.reply({
        content: 'Es ist ein Fehler beim Aktualisieren der Einstellungen aufgetreten.',
        ephemeral: true,
      });
    }
  }
}
