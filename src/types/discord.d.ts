import { Collection } from 'discord.js';
import { Command } from '../commands/tempvoice';

declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, Command>;
  }
}
