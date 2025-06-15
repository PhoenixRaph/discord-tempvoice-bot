import { ButtonInteraction, ModalSubmitInteraction, VoiceChannel, TextChannel, ChannelType, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageComponentInteraction, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../database/db';
import { createChannelSettingsModal } from '../components/VoiceChannelComponents';

export async function handleVoiceControl(interaction: MessageComponentInteraction) {
  console.log('Voice control interaction received:', interaction.customId);
  
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

  if (requiredAction && !allowedActions.includes(requiredAction)) {
    console.log('Action not allowed');
    await interaction.reply({
      content: 'Diese Aktion ist für diesen Channel nicht erlaubt.',
      flags: ['Ephemeral']
    });
    return;
  }

  if (interaction.isButton()) {
    switch (interaction.customId) {
      case 'channel_settings': {
        console.log('Showing settings modal');
        const modal = createChannelSettingsModal(voiceChannel.name || 'Temporärer Channel', voiceChannel.userLimit || 0);
        await interaction.showModal(modal);
        break;
      }
      case 'transfer_owner': {
        console.log('Showing transfer owner select menu');
        
        // Get all members in the voice channel except the current owner
        const members = voiceChannel.members.filter(member => member.id !== tempChannel.owner_id);
        
        if (members.size === 0) {
          await interaction.reply({
            content: 'Es sind keine anderen Benutzer im Voice-Channel.',
            flags: ['Ephemeral']
          });
          return;
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('transfer_owner_select')
          .setPlaceholder('Wähle den neuen Besitzer')
          .addOptions(
            members.map(member => 
              new StringSelectMenuOptionBuilder()
                .setLabel(member.displayName)
                .setDescription(`ID: ${member.id}`)
                .setValue(member.id)
            )
          );

        await interaction.reply({
          content: 'Wähle den neuen Besitzer des Channels:',
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
          flags: ['Ephemeral']
        });
        break;
      }
      case 'kick_user': {
        console.log('Showing kick user select menu');
        
        // Get all members in the voice channel except the current owner
        const members = voiceChannel.members.filter(member => member.id !== tempChannel.owner_id);
        
        if (members.size === 0) {
          await interaction.reply({
            content: 'Es sind keine anderen Benutzer im Voice-Channel.',
            flags: ['Ephemeral']
          });
          return;
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('kick_user_select')
          .setPlaceholder('Wähle einen Benutzer zum Kicken')
          .addOptions(
            members.map(member => 
              new StringSelectMenuOptionBuilder()
                .setLabel(member.displayName)
                .setDescription(`ID: ${member.id}`)
                .setValue(member.id)
            )
          );

        await interaction.reply({
          content: 'Wähle einen Benutzer zum Kicken:',
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
          flags: ['Ephemeral']
        });
        break;
      }
      case 'toggle_user': {
        console.log('Showing user block/unblock menu');
        
        // Get all members in the voice channel except the current owner
        const members = voiceChannel.members.filter(member => member.id !== tempChannel.owner_id);
        
        if (members.size === 0) {
          await interaction.reply({
            content: 'Es sind keine anderen Benutzer im Voice-Channel.',
            flags: ['Ephemeral']
          });
          return;
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('block_user_select')
          .setPlaceholder('Wähle einen Benutzer zum Blocken')
          .addOptions(
            members.map(member => 
              new StringSelectMenuOptionBuilder()
                .setLabel(member.displayName)
                .setDescription(`ID: ${member.id}`)
                .setValue(member.id)
            )
          );

        await interaction.reply({
          content: 'Wähle einen Benutzer zum Blocken:',
          components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
          flags: ['Ephemeral']
        });
        break;
      }
      case 'unblock_user': {
        const userId = interaction.customId.split('_')[2]; // Extract user ID from customId
        try {
          // Remove block permissions
          await voiceChannel.permissionOverwrites.delete(userId);
          await interaction.update({
            content: `Der Benutzer wurde erfolgreich entblockt.`,
            components: []
          });
        } catch (error) {
          console.error('Error unblocking user:', error);
          await interaction.update({
            content: 'Es gab einen Fehler beim Entblocken des Benutzers.',
            components: []
          });
        }
        break;
      }
    }
  } else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'transfer_owner_select') {
      const newOwnerId = interaction.values[0];
      const newOwner = voiceChannel.members.get(newOwnerId);
      
      if (!newOwner) {
        await interaction.reply({
          content: 'Der ausgewählte Benutzer ist nicht mehr im Voice-Channel.',
          flags: ['Ephemeral']
        });
        return;
      }

      try {
        // Update permissions
        await voiceChannel.permissionOverwrites.edit(newOwnerId, {
          ManageChannels: true,
          MoveMembers: true,
          MuteMembers: true,
          DeafenMembers: true
        });

        // Remove old owner permissions
        await voiceChannel.permissionOverwrites.edit(tempChannel.owner_id, {
          ManageChannels: false,
          MoveMembers: false,
          MuteMembers: false,
          DeafenMembers: false
        });

        // Update database
        await db.updateTempChannel(tempChannel.id, {
          ownerId: newOwnerId
        });

        await interaction.update({
          content: `Der Besitzer wurde erfolgreich an ${newOwner.toString()} übertragen.`,
          components: []
        });
      } catch (error) {
        console.error('Error transferring ownership:', error);
        await interaction.update({
          content: 'Es gab einen Fehler beim Übertragen des Besitzers.',
          components: []
        });
      }
    } else if (interaction.customId === 'kick_user_select') {
      const userId = interaction.values[0];
      const user = voiceChannel.members.get(userId);
      
      if (!user) {
        await interaction.reply({
          content: 'Der ausgewählte Benutzer ist nicht mehr im Voice-Channel.',
          flags: ['Ephemeral']
        });
        return;
      }

      try {
        // Kick user
        await user.voice.disconnect();
        await interaction.update({
          content: `${user.toString()} wurde erfolgreich gekickt.`,
          components: []
        });
      } catch (error) {
        console.error('Error kicking user:', error);
        await interaction.update({
          content: 'Es gab einen Fehler beim Kicken des Benutzers.',
          components: []
        });
      }
    } else if (interaction.customId === 'block_user_select') {
      const userId = interaction.values[0];
      const user = voiceChannel.members.get(userId);
      
      if (!user) {
        await interaction.reply({
          content: 'Der ausgewählte Benutzer ist nicht mehr im Voice-Channel.',
          flags: ['Ephemeral']
        });
        return;
      }

      try {
        // Block user
        await voiceChannel.permissionOverwrites.edit(userId, {
          Connect: false,
          ViewChannel: false
        });

        // Create unblock button
        const unblockButton = new ButtonBuilder()
          .setCustomId(`unblock_user_${userId}`)
          .setLabel('Benutzer entblocken')
          .setStyle(ButtonStyle.Danger);

        await interaction.update({
          content: `${user.toString()} wurde erfolgreich blockiert.`,
          components: [new ActionRowBuilder<ButtonBuilder>().addComponents(unblockButton)]
        });
      } catch (error) {
        console.error('Error blocking user:', error);
        await interaction.update({
          content: 'Es gab einen Fehler beim Blocken des Benutzers.',
          components: []
        });
      }
    }
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

  if (interaction.customId === 'transfer_owner_modal') {
    const newOwnerId = interaction.fields.getTextInputValue('new_owner_id');
    
    // Validate the new owner ID
    const newOwner = await interaction.guild?.members.fetch(newOwnerId).catch(() => null);
    if (!newOwner) {
      await interaction.reply({
        content: 'Der angegebene Benutzer wurde nicht gefunden.',
        flags: ['Ephemeral']
      });
      return;
    }

    // Check if the new owner is in the voice channel
    if (!voiceChannel.members.has(newOwnerId)) {
      await interaction.reply({
        content: 'Der neue Besitzer muss im Voice-Channel sein.',
        flags: ['Ephemeral']
      });
      return;
    }

    try {
      // Update permissions
      await voiceChannel.permissionOverwrites.edit(newOwnerId, {
        ManageChannels: true,
        MoveMembers: true,
        MuteMembers: true,
        DeafenMembers: true
      });

      // Remove old owner permissions
      await voiceChannel.permissionOverwrites.edit(tempChannel.owner_id, {
        ManageChannels: false,
        MoveMembers: false,
        MuteMembers: false,
        DeafenMembers: false
      });

      // Update database
      await db.updateTempChannel(tempChannel.id, {
        ownerId: newOwnerId
      });

      await interaction.reply({
        content: `Der Besitzer wurde erfolgreich an ${newOwner.toString()} übertragen.`,
        flags: ['Ephemeral']
      });
    } catch (error) {
      console.error('Error transferring ownership:', error);
      await interaction.reply({
        content: 'Es gab einen Fehler beim Übertragen des Besitzers.',
        flags: ['Ephemeral']
      });
    }
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
