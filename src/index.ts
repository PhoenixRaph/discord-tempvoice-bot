import {
  Client,
  GatewayIntentBits,
  Events,
  Collection,
  Interaction,
  DiscordAPIError,
  PermissionsBitField,
} from 'discord.js';
import { registerCommands } from './utils/registerCommands';
import { handleTempVoice } from './handlers/tempVoiceHandler';
import { handleButtonInteraction, handleModalSubmit } from './handlers/setupHandler';
import { handleVoiceControl, handleSettingsModal } from './handlers/voiceControlHandler';
import { handleLogButton, handleLogSelectMenu } from './handlers/logSetupHandler';
import { createPermissionErrorEmbed, checkBotPermissions } from './utils/permissionUtils';

// Create Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// Command handling
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  try {
    // Prüfe Berechtigungen vor der Ausführung
    if (interaction.guild) {
      const requiredPermissions = [
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.MoveMembers,
        PermissionsBitField.Flags.MuteMembers,
        PermissionsBitField.Flags.DeafenMembers,
        PermissionsBitField.Flags.ManageRoles,
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.Speak,
      ];

      const { hasPermissions, missingPermissions } = checkBotPermissions(
        client,
        interaction.guild.id,
        requiredPermissions,
      );

      if (!hasPermissions && interaction.isRepliable()) {
        const errorEmbed = createPermissionErrorEmbed(
          interaction.guild.members.me!,
          missingPermissions,
        );

        await interaction.reply({
          embeds: [errorEmbed],
          ephemeral: true,
        });
        return;
      }
    }

    // Normale Interaktionsverarbeitung
    if (interaction.isChatInputCommand()) {
      const command = (client as any).commands.get(interaction.commandName);

      if (!command) {
        console.error(`Kein Befehl mit dem Namen ${interaction.commandName} gefunden.`);
        return;
      }

      await command.execute(interaction);
    } else if (interaction.isButton()) {
      // Unterscheide zwischen Setup-, Voice-Control- und Log-Setup-Buttons
      if (
        interaction.customId.startsWith('channel_') ||
        interaction.customId.startsWith('transfer_') ||
        interaction.customId.startsWith('kick_') ||
        interaction.customId.startsWith('toggle_')
      ) {
        if (
          interaction.customId === 'toggle_log' ||
          interaction.customId === 'toggle_ban_actions' ||
          interaction.customId === 'toggle_kick_actions' ||
          interaction.customId === 'toggle_channel_actions' ||
          interaction.customId === 'toggle_owner_actions' ||
          interaction.customId === 'save_settings'
        ) {
          await handleLogButton(interaction);
        } else {
          await handleVoiceControl(interaction);
        }
      } else {
        await handleButtonInteraction(interaction);
      }
    } else if (interaction.isStringSelectMenu()) {
      if (
        interaction.customId === 'log_type_select' ||
        interaction.customId === 'log_channel_select' ||
        interaction.customId === 'log_mode_select'
      ) {
        await handleLogSelectMenu(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId === 'channel_settings_modal') {
        await handleSettingsModal(interaction);
      } else {
        await handleModalSubmit(interaction);
      }
    }
  } catch (error) {
    console.error('Fehler bei der Verarbeitung der Interaktion:', error);

    if (interaction.isRepliable()) {
      // Spezifische Fehlerbehandlung für verschiedene Fehlertypen
      if (error instanceof DiscordAPIError) {
        switch (error.code) {
          case 50013: // Missing Permissions
            if (interaction.guild?.members.me) {
              const requiredPermissions = [
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.EmbedLinks,
                PermissionsBitField.Flags.ManageChannels,
                PermissionsBitField.Flags.MoveMembers,
                PermissionsBitField.Flags.MuteMembers,
                PermissionsBitField.Flags.DeafenMembers,
                PermissionsBitField.Flags.ManageRoles,
              ];

              const errorEmbed = createPermissionErrorEmbed(
                interaction.guild.members.me,
                requiredPermissions,
              );

              if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
              } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
              }
            }
            break;

          case 50001: // Missing Access
            await interaction.reply({
              content: 'Der Bot hat keinen Zugriff auf diesen Kanal oder diese Ressource.',
              ephemeral: true,
            });
            break;

          case 50004: // Widget Disabled
            await interaction.reply({
              content: 'Server-Widget ist deaktiviert.',
              ephemeral: true,
            });
            break;

          case 50007: // Cannot send messages to this user
            await interaction.reply({
              content: 'Der Bot kann keine Direktnachrichten an diesen Benutzer senden.',
              ephemeral: true,
            });
            break;

          default:
            await interaction.reply({
              content: `Es ist ein API-Fehler aufgetreten (Code: ${error.code}). Bitte versuche es später erneut.`,
              ephemeral: true,
            });
        }
      } else {
        // Generische Fehlerbehandlung
        const reply = {
          content: 'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    }
  }
});

// Voice state update handling
client.on(Events.VoiceStateUpdate, handleTempVoice);

// Client ready event
client.once(Events.ClientReady, async (c) => {
  console.log(`Bereit! Eingeloggt als ${c.user.tag}`);

  // Register slash commands
  await registerCommands();
});

// Error handling
client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

// Login
client.login(process.env.DISCORD_TOKEN);
