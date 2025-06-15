import 'dotenv/config';
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
import { handleButtonInteraction as handleSetupButton, handleModalSubmit as handleSetupModal } from './handlers/setupHandler';
import { handleVoiceControl, handleSettingsModal } from './handlers/voiceControlHandler';
import { handleLogSelectMenu } from './handlers/logSetupHandler';
import { createPermissionErrorEmbed, checkBotPermissions } from './utils/permissionUtils';
import { 
  command as tempVoiceCommand, 
  handleButtonInteraction, 
  handleModalSubmit, 
  handleSelectMenuInteraction 
} from './commands/tempvoice';
import { command as dbtestCommand } from './commands/dbtest';
import db from './database/db';

// Create Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// Initialize commands collection
client.commands = new Collection();
client.commands.set(tempVoiceCommand.data.name, tempVoiceCommand);
client.commands.set(dbtestCommand.data.name, dbtestCommand);

// Command handling
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  try {
    console.log('\n=== InteractionCreate Event ===');
    console.log('Interaction Type:', interaction.type);
    if (interaction.isButton()) {
      console.log('Button ID:', interaction.customId);
    }

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
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`Kein Befehl mit dem Namen ${interaction.commandName} gefunden.`);
        return;
      }

      await command.execute(interaction);
    } else if (interaction.isButton()) {
      console.log('Processing button interaction...');
      console.log('Button ID:', interaction.customId);
      
      if (
        interaction.customId === 'new_config' ||
        interaction.customId === 'position_toggle' ||
        interaction.customId === 'edit_settings' ||
        interaction.customId === 'delete_config' ||
        interaction.customId === 'next_page' ||
        interaction.customId === 'toggle_nsfw' ||
        interaction.customId === 'finish_setup'
      ) {
        console.log('Routing to handleButtonInteraction...');
        await handleButtonInteraction(interaction);
      } else if (
        interaction.customId === 'channel_settings' ||
        interaction.customId === 'transfer_owner' ||
        interaction.customId === 'kick_user' ||
        interaction.customId === 'toggle_user'
      ) {
        console.log('Routing to handleVoiceControl...');
        await handleVoiceControl(interaction);
      } else {
        console.log('⚠️ Unbekannter Button:', interaction.customId);
      }
    } else if (interaction.isStringSelectMenu()) {
      console.log('Processing select menu interaction...');
      console.log('Select Menu ID:', interaction.customId);
      
      if (
        interaction.customId === 'log_type_select' ||
        interaction.customId === 'log_channel_select' ||
        interaction.customId === 'log_mode_select'
      ) {
        console.log('Routing to handleLogSelectMenu...');
        await handleLogSelectMenu(interaction);
      } else if (
        interaction.customId === 'voice_channel_select' ||
        interaction.customId === 'category_select' ||
        interaction.customId === 'channel_actions_select' ||
        interaction.customId === 'config_select'
      ) {
        console.log('Routing to handleSelectMenuInteraction...');
        await handleSelectMenuInteraction(interaction);
      } else if (
        interaction.customId === 'transfer_owner_select'
      ) {
        console.log('Routing to handleVoiceControl...');
        await handleVoiceControl(interaction);
      } else {
        console.log('⚠️ Unbekanntes Select Menu:', interaction.customId);
      }
    } else if (interaction.isModalSubmit()) {
      console.log('Processing modal submit...');
      console.log('Modal ID:', interaction.customId);
      
      if (interaction.customId === 'settings_modal') {
        console.log('Routing to tempvoice handleModalSubmit...');
        await handleModalSubmit(interaction);
      } else if (interaction.customId === 'channel_settings') {
        console.log('Routing to voiceControlHandler handleSettingsModal...');
        await handleSettingsModal(interaction);
      } else {
        console.log('Routing to setupHandler handleModalSubmit...');
        await handleSetupModal(interaction);
      }
    }
  } catch (error) {
    console.error('Fehler bei der Verarbeitung der Interaktion:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }

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
  console.log(`🤖 Bereit! Eingeloggt als ${c.user.tag}`);

  // Cleanup orphaned temp channels
  console.log('\n🧹 Starte Cleanup von temporären Channels...');
  try {
    const tempChannels = await db.getAllTempChannels();
    console.log(`  └─ Gefundene temporäre Channels: ${tempChannels.length}`);

    for (const tempChannel of tempChannels) {
      try {
        const guild = await c.guilds.fetch(tempChannel.guild_id);
        const channel = await guild.channels.fetch(tempChannel.channel_id).catch(() => null);
        
        if (channel) {
          // Prüfe ob der Channel leer ist
          if (channel.type === 2 && channel.members.size === 0) {
            console.log(`  └─ Lösche leeren Channel: ${channel.name}`);
            await channel.delete();
            await db.deleteTempChannel(tempChannel.channel_id);
          }
        } else {
          // Channel existiert nicht mehr, lösche aus DB
          console.log(`  └─ Channel existiert nicht mehr: ${tempChannel.channel_id}`);
          await db.deleteTempChannel(tempChannel.channel_id);
        }
      } catch (error) {
        console.error(`  └─ Fehler beim Verarbeiten von Channel ${tempChannel.channel_id}:`, error);
      }
    }
    console.log('✅ Cleanup abgeschlossen');
  } catch (error) {
    console.error('❌ Fehler beim Cleanup:', error);
  }

  // Register slash commands
  await registerCommands();

  // Ausgabe aller geladenen Commands
  console.log('\n📋 Geladene Slash-Commands:');
  client.commands.forEach((cmd, name) => {
    const desc = cmd.data?.description || cmd.data?.toJSON?.().description || '';
    console.log(`  └─ /${name}: ${desc}`);
  });

  // Datenbank-Status prüfen
  try {
    // Beispiel: Teste, ob die Tabelle test_entries existiert
    await db.runAsync('SELECT 1 FROM test_entries LIMIT 1');
    console.log('\n💾 Datenbank-Status:');
    console.log('  └─ ✅ Verbindung und Tabellen sind OK');
  } catch (err) {
    console.error('\n💾 Datenbank-Status:');
    console.error('  └─ ❌ Fehler bei der Datenbankprüfung:', err);
  }
});

// Error handling
client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

// Login
client.login(process.env.DISCORD_TOKEN);
