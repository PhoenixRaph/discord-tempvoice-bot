import { REST, Routes } from 'discord.js';
import { command as tempVoiceCommand } from '../commands/tempvoice';

const commands = [tempVoiceCommand.data.toJSON()];

const rest = new REST().setToken(Bun.env.DISCORD_TOKEN!);

export async function registerCommands() {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(Bun.env.CLIENT_ID!), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}
