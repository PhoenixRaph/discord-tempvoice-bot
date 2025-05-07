import { ButtonInteraction, ModalSubmitInteraction, VoiceChannel, TextChannel, ChannelType } from 'discord.js';
import db from '../database/db';
import { createChannelSettingsModal } from '../components/VoiceChannelComponents';

export async function handleVoiceControl(interaction: ButtonInteraction) {
  if (!interaction.isButton()) return;

  console.log('Button interaction received:', interaction.customId);
  
  // Finde den zugehörigen Voice-Channel
  const textChannel = interaction.channel;
  if (!textChannel) {
    console.log('No channel found');
    return;
  }

  console.log('Channel type:', textChannel.type);
  console.log('Channel name:', (textChannel as TextChannel).name);

  if (textChannel.type !== 2) {
    console.log('Not a guild text channel');
    return;
  }

  // Suche nach dem Voice-Channel mit dem entsprechenden Namen
  const voiceChannelName = textChannel.name.replace('💬・', '');
  console.log('Looking for voice channel:', voiceChannelName);

  const voiceChannel = interaction.guild?.channels.cache.find(
    ch => ch.type === ChannelType.GuildVoice && ch.name === voiceChannelName
  ) as VoiceChannel;

  if (!voiceChannel) {
    console.log('Voice channel not found');
    await interaction.reply({
      content: 'Der zugehörige Voice-Channel wurde nicht gefunden.',
      flags: ['Ephemeral']
    });
    return;
  }

  console.log('Found voice channel:', voiceChannel.name);

  const tempChannel = await db.findTempChannel(voiceChannel.id);
  if (!tempChannel) {
    console.log('Temp channel not found in database');
    await interaction.reply({
      content: 'Dieser Channel wurde nicht als temporärer Voice-Channel erkannt.',
      flags: ['Ephemeral']
    });
    return;
  }

  // Prüfe ob der Benutzer der Channel-Besitzer ist
  if (interaction.user.id !== tempChannel.owner_id) {
    console.log('User is not channel owner');
    await interaction.reply({
      content: 'Nur der Besitzer dieses Channels kann die Einstellungen ändern.',
      flags: ['Ephemeral']
    });
    return;
  }

  // Hole die erlaubten Aktionen aus den Einstellungen
  const settings = await db.findSettings(interaction.guildId!, tempChannel.channel_id);
  console.log('Found settings:', settings);
  
  // Default actions if no settings are found
  const defaultActions = ['edit_name', 'transfer_owner', 'kick_user', 'ban_user'];
  const allowedActions = settings?.allowed_actions ? JSON.parse(settings.allowed_actions) : defaultActions;

  console.log('Allowed actions:', allowedActions);

  // Prüfe ob die Aktion erlaubt ist
  const actionMap: { [key: string]: string } = {
    channel_settings: 'edit_name',
    transfer_owner: 'transfer_owner',
    kick_user: 'kick_user',
    toggle_user: 'ban_user',
  };

  const requiredAction = actionMap[interaction.customId];
  console.log('Required action:', requiredAction);

  if (!allowedActions.includes(requiredAction)) {
    console.log('Action not allowed');
    await interaction.reply({
      content: 'Diese Aktion ist für diesen Channel nicht erlaubt.',
      flags: ['Ephemeral']
    });
    return;
  }

  switch (interaction.customId) {
    case 'channel_settings': {
      console.log('Showing settings modal');
      const modal = createChannelSettingsModal(voiceChannel.name || 'Temporärer Channel', voiceChannel.userLimit || 0);
      await interaction.showModal(modal);
      break;
    }
    // Weitere Cases für andere Buttons werden später implementiert
  }
}

export async function handleSettingsModal(interaction: ModalSubmitInteraction) {
  if (!interaction.isModalSubmit() || !interaction.channelId) return;

  console.log('Modal submit received');

  // Finde den zugehörigen Voice-Channel
  const textChannel = interaction.channel;
  if (!textChannel) {
    console.log('No channel found in modal submit');
    return;
  }

  console.log('Modal submit channel type:', textChannel.type);

  if (textChannel.type !== 2) {
    console.log('Not a guild text channel in modal submit');
    return;
  }

  const voiceChannelName = (textChannel as unknown as TextChannel).name.replace('💬・', '');
  console.log('Looking for voice channel:', voiceChannelName);

  const voiceChannel = interaction.guild?.channels.cache.find(
    ch => ch.type === ChannelType.GuildVoice && ch.name === voiceChannelName
  ) as VoiceChannel;

  if (!voiceChannel) {
    console.log('Voice channel not found in modal submit');
    await interaction.reply({
      content: 'Der zugehörige Voice-Channel wurde nicht gefunden.',
      flags: ['Ephemeral']
    });
    return;
  }

  const tempChannel = await db.findTempChannel(voiceChannel.id);
  if (!tempChannel) {
    console.log('Temp channel not found in database in modal submit');
    await interaction.reply({
      content: 'Dieser Channel wurde nicht als temporärer Voice-Channel erkannt.',
      flags: ['Ephemeral']
    });
    return;
  }

  // Prüfe ob der Benutzer der Channel-Besitzer ist
  if (interaction.user.id !== tempChannel.owner_id) {
    console.log('User is not channel owner in modal submit');
    await interaction.reply({
      content: 'Nur der Besitzer dieses Channels kann die Einstellungen ändern.',
      flags: ['Ephemeral']
    });
    return;
  }

  const newName = interaction.fields.getTextInputValue('channel_name');
  const slotsValue = interaction.fields.getTextInputValue('channel_slots');
  const slots = parseInt(slotsValue);

  console.log('New settings:', { newName, slots });

  if (isNaN(slots) || slots < 0 || slots > 99) {
    await interaction.reply({
      content: 'Die eingegebene Anzahl an Slots ist ungültig. Bitte gib eine Zahl zwischen 0 und 99 ein.',
      flags: ['Ephemeral']
    });
    return;
  }

  try {
    await voiceChannel.edit({
      name: newName,
      userLimit: slots === 0 ? undefined : slots,
    });

    await interaction.reply({
      content: `Die Channel-Einstellungen wurden erfolgreich aktualisiert!\nNeuer Name: ${newName}\nBenutzer Limit: ${slots === 0 ? 'Unendlich' : slots}`,
      flags: ['Ephemeral']
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Channel-Einstellungen:', error);
    await interaction.reply({
      content: 'Es gab einen Fehler beim Aktualisieren der Channel-Einstellungen.',
      flags: ['Ephemeral']
    });
  }
}
