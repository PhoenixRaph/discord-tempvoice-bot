import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import { handleSetupCommand } from '../handlers/setupHandler';
import { handleLogSetupCommand } from '../handlers/logSetupHandler';
import db from '../database/db';

export const command = {
  data: new SlashCommandBuilder()
    .setName('tempvoice')
    .setDescription('Verwalte temporäre Voice-Channels')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Richte einen neuen Voice-Channel Creator ein')
        .addChannelOption((option) =>
          option
            .setName('creator')
            .setDescription('Der Voice-Channel, der als Creator dienen soll')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice),
        )
        .addChannelOption((option) =>
          option
            .setName('category')
            .setDescription('Die Kategorie, in der die temporären Channels erstellt werden sollen')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup_guild')
        .setDescription('Konfiguriere die Logging-Einstellungen für den Server'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('Zeige alle konfigurierten Voice-Channel Creator an'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Entferne einen Voice-Channel Creator')
        .addChannelOption((option) =>
          option
            .setName('creator')
            .setDescription('Der Voice-Channel Creator, der entfernt werden soll')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('disable')
        .setDescription('Deaktiviere das temporäre Voice-Channel System'),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    if (!interaction.isChatInputCommand()) return;

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'setup':
        await handleSetupCommand(interaction);
        break;

      case 'setup_guild':
        await handleLogSetupCommand(interaction);
        break;

      case 'list':
        const settings = await db.getAllSettings(interaction.guild.id);
        if (!settings || settings.length === 0) {
          await interaction.reply({
            content: 'Es sind keine Voice-Channel Creator konfiguriert.',
            ephemeral: true,
          });
          return;
        }

        const creatorList = settings
          .map((setting) => {
            const channel = interaction.guild!.channels.cache.get(setting.creator_channel_id);
            return (
              `• ${channel ? channel.name : 'Gelöschter Kanal'} (<#${setting.creator_channel_id}>)\n` +
              `  ↳ Name: \`${setting.default_name}\`\n` +
              `  ↳ Limit: ${setting.default_slots === 0 ? 'Unbegrenzt' : setting.default_slots}\n` +
              `  ↳ Bitrate: ${setting.default_bitrate}kbps`
            );
          })
          .join('\n\n');

        await interaction.reply({
          content: '**Konfigurierte Voice-Channel Creator:**\n\n' + creatorList,
          ephemeral: true,
        });
        break;

      case 'remove':
        const creatorToRemove = interaction.options.getChannel('creator', true);
        const existingSettings = await db.findSettings(interaction.guild.id, creatorToRemove.id);

        if (!existingSettings) {
          await interaction.reply({
            content: 'Dieser Kanal ist kein Voice-Channel Creator.',
            ephemeral: true,
          });
          return;
        }

        await db.deleteCreatorSettings(interaction.guild.id, creatorToRemove.id);
        await interaction.reply({
          content: `Der Voice-Channel Creator ${creatorToRemove.name} wurde erfolgreich entfernt.`,
          ephemeral: true,
        });
        break;

      case 'disable':
        try {
          await db.deleteGuildSettings(interaction.guild.id);
          await interaction.reply({
            content: 'Temporäres Voice-Channel System wurde deaktiviert.',
            ephemeral: true,
          });
        } catch (error) {
          console.error('Fehler beim Deaktivieren des temporären Voice-Channels:', error);
          await interaction.reply({
            content: 'Es ist ein Fehler beim Deaktivieren aufgetreten.',
            ephemeral: true,
          });
        }
        break;
    }
  },
};
