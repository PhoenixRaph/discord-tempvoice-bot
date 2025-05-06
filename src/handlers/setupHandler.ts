import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  ChatInputCommandInteraction,
} from 'discord.js';
import { randomUUID } from 'crypto';
import db from '../database/db';
import {
  createSetupEmbed,
  createSetupActionRow,
  createCategorySelect,
  createPermissionsSelect,
  createActionButtons,
} from '../components/SetupComponents';

// Temporärer Speicher für Setup-Prozess
interface SetupState {
  creatorChannel: string;
  categoryId: string;
  settings: {
    name: string;
    limit: number;
    bitrate: number;
    description: string;
  };
}

const setupCache = new Map<string, SetupState>();

export async function handleSetupCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) return;

  const creator = interaction.options.getChannel('creator', true);
  const category = interaction.options.getChannel('category', true);

  // Prüfe, ob der Kanal bereits ein Creator ist
  const existingSettings = await db.findSettings(interaction.guild.id, creator.id);
  if (existingSettings) {
    await interaction.reply({
      content: 'Dieser Kanal ist bereits als Voice-Channel Creator konfiguriert.',
      ephemeral: true,
    });
    return;
  }

  // Initialisiere Cache für diesen Server
  setupCache.set(interaction.guild.id, {
    creatorChannel: creator.id,
    categoryId: category.id,
    settings: {
      name: '» $user$ VC',
      limit: 10,
      bitrate: 64000,
      description: 'VC = Voice Chat ;)',
    },
  });

  const embed = createSetupEmbed();
  const actionRow = createSetupActionRow();
  const actionButtons = createActionButtons();

  await interaction.reply({
    embeds: [embed],
    components: [actionRow, actionButtons],
    ephemeral: true,
  });
}

export async function handleButtonInteraction(interaction: ButtonInteraction) {
  if (!interaction.guild) return;

  const state = setupCache.get(interaction.guild.id);
  if (!state) return;

  switch (interaction.customId) {
    case 'save_settings':
      try {
        await db.createSettings({
          id: randomUUID(),
          guildId: interaction.guild.id,
          creatorChannelId: state.creatorChannel,
          defaultName: state.settings.name,
          defaultSlots: state.settings.limit,
          defaultBitrate: state.settings.bitrate,
        });

        setupCache.delete(interaction.guild.id);

        await interaction.reply({
          content: 'Voice-Channel Creator wurde erfolgreich eingerichtet!',
          ephemeral: true,
        });
      } catch (error) {
        console.error('Fehler beim Speichern der Einstellungen:', error);
        await interaction.reply({
          content: 'Es ist ein Fehler beim Speichern der Einstellungen aufgetreten.',
          ephemeral: true,
        });
      }
      break;

    case 'channel_settings':
      const modal = new ModalBuilder()
        .setCustomId('setup_settings_modal')
        .setTitle('Kanaleinstellungen bearbeiten')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('channel_name')
              .setLabel('Standard Kanalname ($user$ = Benutzername)')
              .setStyle(TextInputStyle.Short)
              .setValue(state.settings.name)
              .setRequired(true)
              .setPlaceholder('» $user$ VC'),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('user_limit')
              .setLabel('Standard Nutzerlimit (0 = Unbegrenzt)')
              .setStyle(TextInputStyle.Short)
              .setValue(state.settings.limit.toString())
              .setRequired(true)
              .setMinLength(1)
              .setMaxLength(2),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('bitrate')
              .setLabel('Standard Bitrate (In Kbps)')
              .setStyle(TextInputStyle.Short)
              .setValue(state.settings.bitrate.toString())
              .setRequired(true)
              .setPlaceholder('64000'),
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('description')
              .setLabel('Beschreibung')
              .setStyle(TextInputStyle.Paragraph)
              .setValue(state.settings.description)
              .setRequired(false)
              .setPlaceholder('Eine Beschreibung für die temporären Channels'),
          ),
        );

      await interaction.showModal(modal);
      break;

    case 'cancel_setup':
      setupCache.delete(interaction.guild.id);
      await interaction.reply({
        content: 'Setup wurde abgebrochen.',
        ephemeral: true,
      });
      break;
  }
}

export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
  if (!interaction.guild) return;

  const state = setupCache.get(interaction.guild.id);
  if (!state) return;

  if (interaction.customId === 'setup_settings_modal') {
    const newName = interaction.fields.getTextInputValue('channel_name');
    const newLimit = parseInt(interaction.fields.getTextInputValue('user_limit'));
    const newBitrate = parseInt(interaction.fields.getTextInputValue('bitrate'));
    const newDescription = interaction.fields.getTextInputValue('description');

    if (isNaN(newLimit) || newLimit < 0 || newLimit > 99) {
      await interaction.reply({
        content: 'Bitte gib eine gültige Zahl zwischen 0 und 99 für das Nutzerlimit ein.',
        ephemeral: true,
      });
      return;
    }

    if (isNaN(newBitrate) || newBitrate < 8 || newBitrate > 384) {
      await interaction.reply({
        content: 'Bitte gib eine gültige Bitrate zwischen 8 und 384 ein.',
        ephemeral: true,
      });
      return;
    }

    state.settings = {
      name: newName,
      limit: newLimit,
      bitrate: newBitrate * 1000, // Umrechnung in bps
      description: newDescription,
    };

    setupCache.set(interaction.guild.id, state);

    const embed = createSetupEmbed();
    const actionRow = createSetupActionRow();
    const actionButtons = createActionButtons();

    await interaction.reply({
      embeds: [embed],
      components: [actionRow, actionButtons],
      ephemeral: true,
    });
  }
}
