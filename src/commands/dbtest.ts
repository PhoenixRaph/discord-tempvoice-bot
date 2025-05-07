import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../types/Command';
import db from '../database/db';

interface TestEntry {
  id: string;
  test_data: string;
  created_at: string;
  updated_at: string;
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('dbtest')
    .setDescription('Testet die Datenbankverbindung und Operationen')
    .addSubcommand(subcommand =>
      subcommand
        .setName('save')
        .setDescription('Speichert einen Test-Eintrag in der Datenbank')
        .addStringOption(option =>
          option
            .setName('test_data')
            .setDescription('Test-Daten zum Speichern')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('read')
        .setDescription('Liest den letzten Test-Eintrag aus der Datenbank')
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'Dieser Befehl kann nur in einem Server verwendet werden.', flags: ['Ephemeral'] });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      console.log('=== DB Test Command Start ===');
      console.log('Guild ID:', interaction.guild.id);
      console.log('Subcommand:', subcommand);

      if (subcommand === 'save') {
        const testData = interaction.options.getString('test_data', true);
        console.log('Test data to save:', testData);

        // Test-Eintrag speichern
        const testEntry = {
          id: interaction.guild.id,
          test_data: testData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Attempting to save test entry:', testEntry);
        await db.runAsync(
          `INSERT INTO test_entries (id, test_data, created_at, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE
           SET test_data = ?, updated_at = ?`,
          [testEntry.id, testEntry.test_data, testEntry.created_at, testEntry.updated_at,
           testEntry.test_data, testEntry.updated_at]
        );
        console.log('Test entry saved successfully');

        await interaction.reply({ content: `Test-Daten wurden gespeichert: ${testData}`, flags: ['Ephemeral'] });
      } else if (subcommand === 'read') {
        console.log('Attempting to read test entry');
        const result = await db.getAsync<TestEntry>(
          'SELECT * FROM test_entries WHERE id = ?',
          [interaction.guild.id]
        );
        console.log('Query result:', result);

        if (result) {
          await interaction.reply({
            content: `Letzter Test-Eintrag: ${result.test_data}`,
            flags: ['Ephemeral']
          });
        } else {
          await interaction.reply({
            content: 'Keine Test-Einträge gefunden.',
            flags: ['Ephemeral']
          });
        }
      }
    } catch (error) {
      console.error('Error in dbtest command:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      await interaction.reply({
        content: 'Ein Fehler ist aufgetreten. Bitte überprüfen Sie die Logs.',
        flags: ['Ephemeral']
      });
    }
    console.log('=== DB Test Command End ===');
  }
}; 