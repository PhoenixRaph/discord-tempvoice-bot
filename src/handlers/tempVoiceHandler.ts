import { VoiceState, ChannelType, PermissionFlagsBits } from 'discord.js';
import { randomUUID } from 'crypto';
import db from '../database/db';
import { createVoiceChannelControls } from '../components/VoiceChannelComponents';

export async function handleTempVoice(oldState: VoiceState, newState: VoiceState) {
  // Benutzer ist einem Voice-Channel beigetreten
  if (newState.channel) {
    const settings = await db.findSettings(
      newState.guild.id,
      newState.channel.id
    );

    // Prüfe, ob der beigetretene Channel ein Creator-Channel ist
    if (settings) {
      try {
        const channelName = settings.default_name.replace('{username}', newState.member?.displayName || 'Benutzer');

        // Erstelle neuen temporären Voice-Channel
        const channel = await newState.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildVoice,
          userLimit: settings.default_slots === 0 ? undefined : settings.default_slots,
          bitrate: settings.default_bitrate,
          parent: newState.channel.parent,
          permissionOverwrites: [
            {
              id: newState.member!.id,
              allow: [
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.MoveMembers,
                PermissionFlagsBits.MuteMembers,
                PermissionFlagsBits.DeafenMembers,
              ],
            },
          ],
        });

        // Verschiebe den Benutzer in seinen neuen Channel
        await newState.setChannel(channel);

        // Sende die Kontrollnachricht
        const textChannel = channel.parent?.children.cache
          .find(ch => ch.type === ChannelType.GuildText);
          
        if (textChannel?.isTextBased()) {
          await textChannel.send({
            content: `Willkommen in deinem temporären Voice-Channel, ${newState.member?.toString()}!`,
            components: [createVoiceChannelControls()]
          });
        }

        // Speichere den temporären Channel in der Datenbank
        await db.createTempChannel({
          id: randomUUID(),
          guildId: newState.guild.id,
          channelId: channel.id,
          ownerId: newState.member!.id,
          name: channelName,
          slots: settings.default_slots,
          bitrate: settings.default_bitrate
        });
      } catch (error) {
        console.error('Fehler beim Erstellen des temporären Voice-Channels:', error);
      }
    }
  }

  // Benutzer hat einen Voice-Channel verlassen
  if (oldState.channel) {
    const tempChannel = await db.findTempChannel(oldState.channel.id);

    // Wenn dies ein temporärer Channel war und er leer ist, lösche ihn
    if (tempChannel && oldState.channel.members.size === 0) {
      try {
        await oldState.channel.delete();
        await db.deleteTempChannel(tempChannel.id);
      } catch (error) {
        console.error('Fehler beim Löschen des temporären Voice-Channels:', error);
      }
    }
  }
} 