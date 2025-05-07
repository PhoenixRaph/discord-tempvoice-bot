import { SlashCommandBuilder, ButtonInteraction, StringSelectMenuInteraction, ModalSubmitInteraction, MessageComponentInteraction, CommandInteraction } from 'discord.js';
import { Command } from '../types/Command';
import {
  createSetupEmbed,
  createTopButtonRow,
  createBottomButtonRow,
  createVoiceChannelSelect,
  createCategorySelect,
  createSettingsModal,
  createSetupEmbedPage2,
  createActionButtons,
  createChannelActionsSelect,
  createTempVoiceEmbed,
  createConfigSelect,
  createNewConfigButton,
} from '../components/SetupComponents';
import db from '../database/db';
import { randomUUID } from 'crypto';

interface SetupState {
  creatorChannel?: { id: string; name: string };
  category?: { id: string; name: string };
  position: 'top' | 'bottom';
  defaultName: string;
  defaultSlots: number;
  defaultBitrate: number;
  allowedActions?: string[];
}

// Speichert den State für jede Guild
const setupStates = new Map<string, SetupState>();

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('tempvoice')
    .setDescription('Konfiguriere die Voice-Channel Creator Einstellungen'),

  async execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Dieser Befehl kann nur in einem Server verwendet werden.',
        ephemeral: true
      });
      return;
    }

    try {
      // Hole alle existierenden Konfigurationen
      const configs = await db.getAllConfigs(interaction.guild.id);
      
      // Hole die Channel-Informationen aus Discord
      const configsWithNames = await Promise.all(configs.map(async config => {
        const channel = await interaction.guild!.channels.fetch(config.name);
        return {
          id: config.id,
          name: channel ? `${channel.name} (Creator)` : 'Unbekannter Channel'
        };
      }));
      
      // Erstelle das Embed und die Komponenten
      const embed = createTempVoiceEmbed(configsWithNames);
      const selectMenu = createConfigSelect(configsWithNames);
      const newButton = createNewConfigButton();

      // Sende die Nachricht
      await interaction.reply({
        embeds: [embed],
        components: [selectMenu, newButton],
        flags: ['Ephemeral']
      });
    } catch (error) {
      console.error('Fehler beim Ausführen des tempvoice Befehls:', error);
      await interaction.reply({
        content: 'Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.',
        ephemeral: true
      });
    }
  },
};

// Button Handler
export async function handleButtonInteraction(interaction: ButtonInteraction) {
  console.log('\n=== Button Interaction Start ===');
  console.log('Button ID:', interaction.customId);
  
  if (!interaction.guild) {
    console.log('❌ Keine Guild gefunden');
    return;
  }

  // Initialisiere oder hole den State für diese Guild
  let state = setupStates.get(interaction.guild.id);
  if (!state) {
    console.log('ℹ️ Initialisiere neuen State für Guild:', interaction.guild.id);
    state = {
      position: 'top',
      defaultName: '{username}\'s Channel',
      defaultSlots: 0,
      defaultBitrate: 64000,
      allowedActions: []
    };
    setupStates.set(interaction.guild.id, state);
  }

  console.log('📊 Aktueller State:', state);

  try {
    switch (interaction.customId) {
      case 'select_voice_channel':
        console.log('🎙️ Öffne Voice Channel Auswahl');
        // Die Auswahl erfolgt über das Select Menu
        break;

      case 'position_toggle':
        console.log('🔄 Wechsle Position von', state.position, 'zu', state.position === 'top' ? 'bottom' : 'top');
        state.position = state.position === 'top' ? 'bottom' : 'top';
        await updateSetupMessage(interaction, state);
        break;

      case 'edit_settings':
        console.log('📝 Öffne Settings Modal');
        await interaction.showModal(createSettingsModal());
        break;

      case 'delete_config':
        console.log('🗑️ Lösche Konfiguration für Creator:', state.creatorChannel?.id);
        if (state.creatorChannel) {
          await db.deleteCreatorSettings(interaction.guild.id, state.creatorChannel.id);
          state.creatorChannel = undefined;
          await updateSetupMessage(interaction, state);
        }
        break;

      case 'next_page':
        console.log('📄 Wechsle zur nächsten Seite');
        await interaction.update({
          embeds: [createSetupEmbedPage2(state)],
          components: [
            createActionButtons(),
            createChannelActionsSelect()
          ]
        });
        break;

      case 'pin_channel':
        console.log('📌 Pin Channel');
        // TODO: Implementiere Pin-Funktion
        break;

      case 'edit_limit':
        console.log('📏 Bearbeite Limit');
        // TODO: Implementiere Limit-Bearbeitung
        break;

      case 'toggle_nsfw':
        console.log('🔞 Toggle NSFW');
        // TODO: Implementiere NSFW-Toggle
        break;

      case 'new_config':
        console.log('➕ Neue Konfiguration erstellen');
        
        // Aktualisiere die Nachricht
        await interaction.update({
          embeds: [createSetupEmbed(state)],
          components: [
            createTopButtonRow(),
            createBottomButtonRow(),
            createVoiceChannelSelect(interaction.guild.channels.cache
              .filter(ch => ch.type === 2)
              .map(ch => ({ id: ch.id, name: ch.name }))),
            createCategorySelect(interaction.guild.channels.cache
              .filter(ch => ch.type === 4)
              .map(ch => ({ id: ch.id, name: ch.name })))
          ]
        });
        break;

      case 'finish_setup':
        console.log('✅ Setup abgeschlossen');
        
        // Hole alle existierenden Konfigurationen
        const configs = await db.getAllConfigs(interaction.guild.id);
        
        // Erstelle das Embed und die Komponenten
        const embed = createTempVoiceEmbed(configs);
        const selectMenu = createConfigSelect(configs);
        const newButton = createNewConfigButton();

        // Aktualisiere die Nachricht
        await interaction.update({
          embeds: [embed],
          components: [selectMenu, newButton]
        });
        break;
    }
    console.log('✅ Button Interaction erfolgreich verarbeitet');
  } catch (error) {
    console.error('❌ Fehler in Button Interaction:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
  console.log('=== Button Interaction End ===\n');
}

// Select Menu Handler
export async function handleSelectMenuInteraction(interaction: StringSelectMenuInteraction) {
  console.log('\n=== Select Menu Interaction Start ===');
  console.log('Select Menu ID:', interaction.customId);
  console.log('Selected Values:', interaction.values);
  
  if (!interaction.guild) {
    console.log('❌ Keine Guild gefunden');
    return;
  }

  // Initialisiere oder hole den State für diese Guild
  let state = setupStates.get(interaction.guild.id);
  if (!state) {
    console.log('ℹ️ Initialisiere neuen State für Guild:', interaction.guild.id);
    state = {
      position: 'top',
      defaultName: '{username}\'s Channel',
      defaultSlots: 0,
      defaultBitrate: 64000,
      allowedActions: []
    };
    setupStates.set(interaction.guild.id, state);
  }

  console.log('📊 Aktueller State:', state);

  try {
    switch (interaction.customId) {
      case 'config_select':
        console.log('⚙️ Konfiguration ausgewählt:', interaction.values[0]);
        const configId = interaction.values[0];
        
        if (configId === 'no_configs') {
          console.log('ℹ️ Keine Konfigurationen vorhanden');
          return;
        }
        
        // Hole die ausgewählte Konfiguration
        const config = await db.findSettings(interaction.guild.id, configId);
        if (!config) {
          console.log('❌ Konfiguration nicht gefunden');
          return;
        }

        // Initialisiere den State mit den Konfigurationsdaten
        const newState: SetupState = {
          creatorChannel: {
            id: config.creator_channel_id,
            name: interaction.guild.channels.cache.get(config.creator_channel_id)?.name || 'Unbekannt'
          },
          category: config.category_id ? {
            id: config.category_id,
            name: interaction.guild.channels.cache.get(config.category_id)?.name || 'Unbekannt'
          } : undefined,
          position: 'top',
          defaultName: config.default_name,
          defaultSlots: config.default_slots,
          defaultBitrate: config.default_bitrate,
          allowedActions: config.allowed_actions ? JSON.parse(config.allowed_actions) : []
        };

        // Speichere den State
        setupStates.set(interaction.guild.id, newState);

        // Aktualisiere die Nachricht
        await interaction.update({
          embeds: [createSetupEmbed(newState)],
          components: [
            createTopButtonRow(),
            createBottomButtonRow(),
            createVoiceChannelSelect(interaction.guild.channels.cache
              .filter(ch => ch.type === 2)
              .map(ch => ({ id: ch.id, name: ch.name }))),
            createCategorySelect(interaction.guild.channels.cache
              .filter(ch => ch.type === 4)
              .map(ch => ({ id: ch.id, name: ch.name })))
          ]
        });
        break;

      case 'voice_channel_select':
        console.log('🎙️ Voice Channel ausgewählt:', interaction.values[0]);
        const channel = interaction.guild.channels.cache.get(interaction.values[0]);
        console.log('📊 Gefundener Channel:', channel ? {
          id: channel.id,
          name: channel.name,
          type: channel.type
        } : 'Nicht gefunden');
        
        if (channel && channel.type === 2) {
          console.log('✅ Channel ist ein Voice Channel');
          state.creatorChannel = {
            id: channel.id,
            name: channel.name,
          };
          
          console.log('📝 Speichere Creator-Einstellungen...');
          const settings = {
            id: randomUUID(),
            guild_id: interaction.guild.id,
            creator_channel_id: channel.id,
            category_id: state.category?.id,
            default_name: state.defaultName || '{username}\'s Channel',
            default_slots: state.defaultSlots || 0,
            default_bitrate: state.defaultBitrate || 64000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          console.log('📦 Settings Objekt:', JSON.stringify(settings, null, 2));
          
          try {
            // Prüfe, ob bereits Einstellungen existieren
            const existingSettings = await db.findSettings(interaction.guild.id, channel.id);
            
            if (existingSettings) {
              console.log('🔄 Aktualisiere existierende Einstellungen...');
              await db.updateSettings(interaction.guild.id, channel.id, {
                default_name: settings.default_name,
                default_slots: settings.default_slots,
                default_bitrate: settings.default_bitrate,
                updated_at: settings.updated_at
              });
              console.log('✅ Einstellungen aktualisiert');
            } else {
              console.log('➕ Erstelle neue Einstellungen...');
              await db.createSettings(settings);
              console.log('✅ Neue Einstellungen erstellt');
            }
          } catch (error) {
            console.error('❌ Fehler beim Speichern der Einstellungen:', error);
            if (error instanceof Error) {
              console.error('Error details:', error.message);
              console.error('Error stack:', error.stack);
            }
            throw error;
          }
          
          console.log('🔄 Aktualisiere Message...');
          await interaction.update({
            embeds: [createSetupEmbed(state)],
            components: [
              createTopButtonRow(),
              createBottomButtonRow(),
              createVoiceChannelSelect(interaction.guild.channels.cache
                .filter(ch => ch.type === 2)
                .map(ch => ({ id: ch.id, name: ch.name }))),
              createCategorySelect(interaction.guild.channels.cache
                .filter(ch => ch.type === 4)
                .map(ch => ({ id: ch.id, name: ch.name })))
            ]
          });
          console.log('✅ Message aktualisiert');
        }
        break;

      case 'category_select':
        console.log('📁 Kategorie ausgewählt:', interaction.values[0]);
        const category = interaction.guild.channels.cache.get(interaction.values[0]);
        console.log('📊 Gefundene Kategorie:', category ? {
          id: category.id,
          name: category.name,
          type: category.type
        } : 'Nicht gefunden');
        
        if (category && category.type === 4) {
          console.log('✅ Kategorie ist eine Kategorie');
          state.category = {
            id: category.id,
            name: category.name,
          };
          
          console.log('📝 Speichere Kategorie-Einstellungen...');
          if (!state.creatorChannel) {
            console.log('❌ Kein Creator-Channel ausgewählt');
            return;
          }

          console.log('📦 Update Daten:', {
            guildId: interaction.guild.id,
            creatorChannelId: state.creatorChannel.id,
            categoryId: category.id
          });

          await db.updateSettings(interaction.guild.id, state.creatorChannel.id, {
            category_id: category.id,
            updated_at: new Date().toISOString(),
          });
          console.log('✅ Settings aktualisiert');
          
          console.log('🔄 Aktualisiere Message...');
          await interaction.update({
            embeds: [createSetupEmbed(state)],
            components: [
              createTopButtonRow(),
              createBottomButtonRow(),
              createVoiceChannelSelect(interaction.guild.channels.cache
                .filter(ch => ch.type === 2)
                .map(ch => ({ id: ch.id, name: ch.name }))),
              createCategorySelect(interaction.guild.channels.cache
                .filter(ch => ch.type === 4)
                .map(ch => ({ id: ch.id, name: ch.name })))
            ]
          });
          console.log('✅ Message aktualisiert');
        }
        break;

      case 'channel_actions_select':
        console.log('🎮 Kanalaktionen ausgewählt:', interaction.values);
        
        // Speichere die ausgewählten Aktionen im State
        state.allowedActions = interaction.values;
        
        // Speichere die Einstellungen in der Datenbank
        if (state.creatorChannel) {
          console.log('📝 Speichere Kanalaktionen...');
          try {
            // Prüfe, ob bereits Einstellungen existieren
            const existingSettings = await db.findSettings(interaction.guild.id, state.creatorChannel.id);
            
            if (existingSettings) {
              console.log('🔄 Aktualisiere existierende Einstellungen...');
              await db.updateSettings(interaction.guild.id, state.creatorChannel.id, {
                allowed_actions: JSON.stringify(interaction.values),
                updated_at: new Date().toISOString(),
              });
              console.log('✅ Kanalaktionen aktualisiert');
            } else {
              console.log('⚠️ Keine Einstellungen gefunden, erstelle neue...');
              const settings = {
                id: randomUUID(),
                guild_id: interaction.guild.id,
                creator_channel_id: state.creatorChannel.id,
                default_name: state.defaultName || '{username}\'s Channel',
                default_slots: state.defaultSlots || 0,
                default_bitrate: state.defaultBitrate || 64000,
                allowed_actions: JSON.stringify(interaction.values),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              await db.createSettings(settings);
              console.log('✅ Neue Einstellungen mit Kanalaktionen erstellt');
            }
          } catch (error) {
            console.error('❌ Fehler beim Speichern der Kanalaktionen:', error);
            if (error instanceof Error) {
              console.error('Error details:', error.message);
              console.error('Error stack:', error.stack);
            }
          }
        } else {
          console.log('⚠️ Kein Creator-Channel ausgewählt, kann Kanalaktionen nicht speichern');
        }
        
        // Aktualisiere die Nachricht
        try {
          await interaction.update({
            embeds: [createSetupEmbedPage2(state)],
            components: [
              createActionButtons(),
              createChannelActionsSelect()
            ]
          });
          console.log('✅ Message aktualisiert');
        } catch (error) {
          console.error('❌ Fehler beim Aktualisieren der Nachricht:', error);
          if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
          }
        }
        break;
    }
    console.log('✅ Select Menu Interaction erfolgreich verarbeitet');
  } catch (error) {
    console.error('❌ Fehler in Select Menu Interaction:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
  console.log('=== Select Menu Interaction End ===\n');
}

// Modal Handler
export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
  console.log('\n=== Modal Submit Start ===');
  console.log('Modal ID:', interaction.customId);
  console.log('Interaction Type:', interaction.type);
  console.log('Interaction Guild:', interaction.guild?.id);
  console.log('Interaction Channel:', interaction.channel?.id);
  console.log('Interaction User:', interaction.user.id);
  console.log('Interaction Deferred:', interaction.deferred);
  console.log('Interaction Replied:', interaction.replied);
  
  if (!interaction.guild) {
    console.log('❌ Keine Guild gefunden');
    return;
  }

  const state = setupStates.get(interaction.guild.id);
  if (!state) {
    console.log('❌ Kein State für Guild gefunden:', interaction.guild.id);
    return;
  }

  console.log('📊 Aktueller State:', JSON.stringify(state, null, 2));

  try {
    if (interaction.customId === 'settings_modal') {
      console.log('📝 Verarbeite Settings Modal');
      
      // Hole die Werte aus dem Modal
      const defaultName = interaction.fields.getTextInputValue('default_name');
      const defaultSlots = interaction.fields.getTextInputValue('default_slots');

      console.log('📦 Modal Eingaben:', {
        defaultName,
        defaultSlots
      });

      // Aktualisiere den State
      if (defaultName) {
        console.log('📝 Setze neuen Namen:', defaultName);
        state.defaultName = defaultName;
      }
      if (defaultSlots) {
        const slots = parseInt(defaultSlots);
        console.log('📏 Versuche Slots zu parsen:', defaultSlots, '->', slots);
        if (!isNaN(slots) && slots >= 0) {
          console.log('✅ Gültige Slots-Zahl:', slots);
          state.defaultSlots = slots;
        } else {
          console.log('❌ Ungültige Slots-Zahl:', defaultSlots);
        }
      }

      // Speichere den aktualisierten State
      setupStates.set(interaction.guild.id, state);
      console.log('✅ State aktualisiert:', JSON.stringify(state, null, 2));

      // Speichere die Einstellungen in der Datenbank
      if (state.creatorChannel) {
        console.log('📝 Speichere Einstellungen...');
        try {
          // Prüfe, ob bereits Einstellungen existieren
          const existingSettings = await db.findSettings(interaction.guild.id, state.creatorChannel.id);
          
          if (existingSettings) {
            console.log('🔄 Aktualisiere existierende Einstellungen...');
            await db.updateSettings(interaction.guild.id, state.creatorChannel.id, {
              default_name: state.defaultName,
              default_slots: state.defaultSlots,
              default_bitrate: state.defaultBitrate,
              updated_at: new Date().toISOString(),
            });
            console.log('✅ Einstellungen aktualisiert');
          } else {
            console.log('➕ Erstelle neue Einstellungen...');
            const settings = {
              id: randomUUID(),
              guild_id: interaction.guild.id,
              creator_channel_id: state.creatorChannel.id,
              category_id: state.category?.id,
              default_name: state.defaultName,
              default_slots: state.defaultSlots,
              default_bitrate: state.defaultBitrate,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            await db.createSettings(settings);
            console.log('✅ Neue Einstellungen erstellt');
          }
        } catch (error) {
          console.error('❌ Fehler beim Speichern der Einstellungen:', error);
          if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
          }
        }
      } else {
        console.log('⚠️ Kein Creator-Channel ausgewählt, kann Einstellungen nicht speichern');
      }

      // Aktualisiere die Nachricht
      console.log('🔄 Bereite Message-Update vor...');
      const voiceChannels = interaction.guild.channels.cache
        .filter(channel => channel.type === 2)
        .map(channel => ({
          id: channel.id,
          name: channel.name,
        }));

      const categories = interaction.guild.channels.cache
        .filter(channel => channel.type === 4)
        .map(channel => ({
          id: channel.id,
          name: channel.name,
        }));

      console.log('📊 Verfügbare Channels:', {
        voiceChannels: voiceChannels.length,
        categories: categories.length
      });

      const components = [
        createTopButtonRow(),
        createBottomButtonRow(),
        createVoiceChannelSelect(voiceChannels),
        createCategorySelect(categories),
      ];

      console.log('🔄 Versuche Message zu aktualisieren...');
      try {
        console.log('1️⃣ Defer Update...');
        await interaction.deferUpdate();
        console.log('✅ Defer Update erfolgreich');

        console.log('2️⃣ Edit Reply...');
        await interaction.editReply({
          embeds: [createSetupEmbed(state)],
          components,
        });
        console.log('✅ Edit Reply erfolgreich');
      } catch (updateError) {
        console.error('❌ Fehler beim Update:', updateError);
        if (updateError instanceof Error) {
          console.error('Error details:', updateError.message);
          console.error('Error stack:', updateError.stack);
        }
        throw updateError;
      }
      console.log('✅ Nachricht erfolgreich aktualisiert');
    }
  } catch (error) {
    console.error('❌ Fehler in Modal Submit:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
  console.log('=== Modal Submit End ===\n');
}

async function updateSetupMessage(interaction: MessageComponentInteraction, state: SetupState) {
  console.log('🔄 Aktualisiere Setup Message...');
  const voiceChannels = interaction.guild!.channels.cache
    .filter(channel => channel.type === 2)
    .map(channel => ({
      id: channel.id,
      name: channel.name,
    }));

  const categories = interaction.guild!.channels.cache
    .filter(channel => channel.type === 4)
    .map(channel => ({
      id: channel.id,
      name: channel.name,
    }));

  const components = [
    createTopButtonRow(),
    createBottomButtonRow(),
    createVoiceChannelSelect(voiceChannels),
    createCategorySelect(categories),
  ];

  await interaction.update({
    embeds: [createSetupEmbed(state)],
    components,
  });
  console.log('✅ Message aktualisiert');
}
