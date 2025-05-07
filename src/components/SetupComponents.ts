import {
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

interface SetupState {
  creatorChannel?: { id: string; name: string };
  category?: { id: string; name: string };
  position: 'top' | 'bottom';
  defaultName: string;
  defaultSlots: number;
  defaultBitrate: number;
  allowedActions?: string[];
}

export function createSetupEmbed(state: SetupState) {
  const creatorInfo = state.creatorChannel 
    ? `Kanal: 🔈➕・${state.creatorChannel.name}`
    : 'Kanal: 🔈➕・Nicht ausgewählt';

  const categoryInfo = state.category
    ? `## 🎮 [===== ${state.category.name} =====] 🎮`
    : '## 🎮 [===== Keine Kategorie =====] 🎮';

  const positionEmoji = state.position === 'top' ? '⬆️' : '⬇️';

  return new EmbedBuilder()
    .setTitle('Voice Channel Setup - Page 1/2')
    .setDescription(
      '**Ersteller:**\n' +
      `${creatorInfo}\n\n` +
      '**Kanal Einstellung:**\n' +
      `${categoryInfo}\n` +
      `• Anordnung: ${positionEmoji}\n` +
      `• Name: » ${state.defaultName || 'Nicht konfiguriert'}\n` +
      `• Limit: ${state.defaultSlots || 0}\n` +
      '• NSFW: ❌\n\n' +
      '**Kanal Berechtigungen:**\n' +
      'Synchronisiert mit Kategorie\n\n' +
      '**Beschreibung:**\n' +
      'VC = Voice Chat :)'
    )
    .setColor('#5865F2')
    .setTimestamp();
}

export function createSetupEmbedPage2(state: SetupState) {
  const selectedActions = state.allowedActions || [];
  const actionEmojis: { [key: string]: string } = {
    'edit_name': '✏️',
    'edit_limit': '📏',
    'transfer_owner': '📌',
    'kick_user': '👢',
    'ban_user': '🔨'
  };

  const actionLabels: { [key: string]: string } = {
    'edit_name': 'Name bearbeiten',
    'edit_limit': 'Limit bearbeiten',
    'transfer_owner': 'Besitzer ändern',
    'kick_user': 'Nutzer kicken',
    'ban_user': 'Nutzer ent-/bannen'
  };

  const selectedActionsText = selectedActions.length > 0
    ? selectedActions.map(action => `• ${actionEmojis[action]} ${actionLabels[action]}`).join('\n')
    : 'Keine Aktionen ausgewählt';

  return new EmbedBuilder()
    .setTitle('Voice Channel Setup - Page 2/2')
    .setDescription(
      '**Verfügbare Kanalaktionen:**\n' +
      'Wähle die Aktionen aus, die der Channel-Owner verwenden kann.\n\n' +
      '**Ausgewählte Aktionen:**\n' +
      `${selectedActionsText}\n\n` +
      '**Beschreibung:**\n' +
      'Diese Einstellungen bestimmen, welche Aktionen der Besitzer eines temporären Voice-Channels ausführen kann.'
    )
    .setColor('#5865F2')
    .setTimestamp();
}

export function createActionButtons() {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('position_toggle')
        .setLabel('⬆️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('edit_settings')
        .setLabel('✏️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('delete_config')
        .setLabel('🗑️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('next_page')
        .setLabel('➡️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('finish_setup')
        .setLabel('Abschließen')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );
}

export function createTopButtonRow() {
  return createActionButtons();
}

export function createBottomButtonRow() {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('toggle_nsfw')
        .setLabel('🔞')
        .setStyle(ButtonStyle.Secondary)
    );
}

export function createVoiceChannelSelect(channels: { id: string; name: string }[]) {
  return new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('voice_channel_select')
        .setPlaceholder('Sprachkanal auswählen...')
        .addOptions(
          channels.map(channel => 
            new StringSelectMenuOptionBuilder()
              .setLabel(channel.name)
              .setValue(channel.id)
          )
        )
    );
}

export function createCategorySelect(categories: { id: string; name: string }[]) {
  return new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('category_select')
        .setPlaceholder('Kategorie auswählen...')
        .addOptions(
          categories.map(category => 
            new StringSelectMenuOptionBuilder()
              .setLabel(category.name)
              .setValue(category.id)
          )
        )
    );
}

export function createSettingsModal() {
  return new ModalBuilder()
    .setCustomId('settings_modal')
    .setTitle('Voice-Channel Einstellungen')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('default_name')
          .setLabel('Standard Kanalname ($user$ = Benutzername)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('» $user$ VC')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('default_slots')
          .setLabel('Standard Nutzerlimit (0 = Unbegrenzt)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('0')
          .setRequired(false)
      )
    );
}

export function createChannelActionsSelect() {
  return new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('channel_actions_select')
        .setPlaceholder('Kanalaktionen auswählen...')
        .setMinValues(0)
        .setMaxValues(5)
        .addOptions([
          new StringSelectMenuOptionBuilder()
            .setLabel('Name bearbeiten')
            .setDescription('Erlaubt dem Owner den Kanalnamen zu ändern')
            .setValue('edit_name')
            .setEmoji('✏️'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Limit bearbeiten')
            .setDescription('Erlaubt dem Owner das Nutzerlimit zu ändern')
            .setValue('edit_limit')
            .setEmoji('📏'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Besitzer ändern')
            .setDescription('Erlaubt dem Owner die Besitzerschaft zu übertragen')
            .setValue('transfer_owner')
            .setEmoji('📌'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Nutzer kicken')
            .setDescription('Erlaubt dem Owner Nutzer aus dem Kanal zu kicken')
            .setValue('kick_user')
            .setEmoji('👢'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Nutzer ent-/bannen')
            .setDescription('Erlaubt dem Owner Nutzer zu bannen/entbannen')
            .setValue('ban_user')
            .setEmoji('🔨')
        ])
    );
}

export function createTempVoiceEmbed(existingConfigs: { id: string; name: string }[]) {
  return new EmbedBuilder()
    .setTitle('Voice Channel Creator')
    .setDescription(
      'Hier kannst du die Einstellungen für die Voice-Channel Creator verwalten.\n\n' +
      '**Verfügbare Optionen:**\n' +
      '• Wähle eine existierende Konfiguration aus dem Dropdown-Menü\n' +
      '• Erstelle eine neue Konfiguration mit dem Button\n\n' +
      '**Beschreibung:**\n' +
      'Der Voice-Channel Creator ermöglicht es Benutzern, temporäre Voice-Channels zu erstellen.'
    )
    .setColor('#5865F2')
    .setTimestamp();
}

export function createConfigSelect(configs: { id: string; name: string }[]) {
  return new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('config_select')
        .setPlaceholder('Konfiguration auswählen...')
        .addOptions(
          configs.length > 0 
            ? configs.map(config => 
                new StringSelectMenuOptionBuilder()
                  .setLabel(config.name)
                  .setValue(config.id)
              )
            : [
                new StringSelectMenuOptionBuilder()
                  .setLabel('Keine Konfigurationen vorhanden')
                  .setValue('no_configs')
                  .setDescription('Erstelle eine neue Konfiguration mit dem Button unten')
                  .setDefault(true)
              ]
        )
    );
}

export function createNewConfigButton() {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('new_config')
        .setLabel('Neuen Creator erstellen')
        .setStyle(ButtonStyle.Success)
        .setEmoji('➕')
    );
}
