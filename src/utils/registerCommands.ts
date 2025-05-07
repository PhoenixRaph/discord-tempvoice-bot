import { REST, Routes } from 'discord.js';
import { command as tempVoiceCommand } from '../commands/tempvoice';
import { command as dbtestCommand } from '../commands/dbtest';

const commands = [
  tempVoiceCommand.data.toJSON(),
  dbtestCommand.data.toJSON()
];

const GUILD_ID = '1288565571973288069';
const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

export async function registerCommands() {
  try {
    console.log('🔄 Registriere Guild-Commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID!, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Guild-Commands erfolgreich registriert');
  } catch (error) {
    console.error('❌ Fehler bei der Command-Registrierung:', error);
  }
}
