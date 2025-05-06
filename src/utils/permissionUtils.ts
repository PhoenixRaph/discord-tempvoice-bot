import { EmbedBuilder, PermissionResolvable, GuildMember, Client } from 'discord.js';

interface MissingPermission {
  name: string;
  description: string;
}

const PERMISSION_DESCRIPTIONS: { [key: string]: string } = {
  // Kanal-Berechtigungen
  ManageChannels: 'Kanäle verwalten',
  ViewChannel: 'Kanäle anzeigen',
  Connect: 'Verbinden',
  Speak: 'Sprechen',
  Stream: 'Video streamen',
  UseVAD: 'Sprachaktivierung nutzen',
  PrioritySpeaker: 'Prioritätssprecher',

  // Nachrichten-Berechtigungen
  SendMessages: 'Nachrichten senden',
  EmbedLinks: 'Links einbetten',
  AttachFiles: 'Dateien anhängen',
  ReadMessageHistory: 'Nachrichtenverlauf lesen',
  ManageMessages: 'Nachrichten verwalten',
  AddReactions: 'Reaktionen hinzufügen',
  UseExternalEmojis: 'Externe Emojis verwenden',

  // Mitglieder-Berechtigungen
  ManageRoles: 'Rollen verwalten',
  MoveMembers: 'Mitglieder verschieben',
  MuteMembers: 'Mitglieder stummschalten',
  DeafenMembers: 'Mitglieder herunterschalten',
  ModerateMembers: 'Mitglieder moderieren',
  KickMembers: 'Mitglieder kicken',
  BanMembers: 'Mitglieder bannen',

  // Server-Berechtigungen
  ViewAuditLog: 'Audit-Log anzeigen',
  ManageGuild: 'Server verwalten',
  ManageWebhooks: 'Webhooks verwalten',
  ManageEmojisAndStickers: 'Emojis und Sticker verwalten',

  // Sonstiges
  CreateInstantInvite: 'Einladungen erstellen',
  ChangeNickname: 'Nickname ändern',
  ManageNicknames: 'Nicknamen verwalten',
};

export function createPermissionErrorEmbed(
  member: GuildMember,
  requiredPermissions: PermissionResolvable[],
): EmbedBuilder {
  const missingPermissions: MissingPermission[] = [];

  for (const permission of requiredPermissions) {
    if (!member.permissions.has(permission)) {
      const permName = String(permission);
      missingPermissions.push({
        name: permName,
        description: PERMISSION_DESCRIPTIONS[permName] || permName,
      });
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('⚠️ Fehlende Berechtigungen')
    .setDescription('Der Bot benötigt die folgenden Berechtigungen, um diese Aktion auszuführen:')
    .setColor('#FF4444')
    .setTimestamp();

  if (missingPermissions.length > 0) {
    const permissionList = missingPermissions
      .map((perm) => `• **${perm.description}** (${perm.name})`)
      .join('\n');

    embed.addFields({
      name: 'Fehlende Berechtigungen',
      value: permissionList,
    });

    embed.addFields({
      name: 'Hinweis',
      value:
        'Bitte stelle sicher, dass der Bot die notwendigen Berechtigungen hat, um alle Funktionen korrekt ausführen zu können. ' +
        'Du kannst die Berechtigungen in den Server-Einstellungen unter "Rollen" anpassen.',
    });
  } else {
    embed.addFields({
      name: 'Information',
      value:
        'Alle erforderlichen Berechtigungen sind vorhanden, aber es ist ein anderer Fehler aufgetreten. ' +
        'Bitte überprüfe die Server-Einstellungen und versuche es erneut.',
    });
  }

  return embed;
}

export function checkBotPermissions(
  client: Client,
  guildId: string,
  requiredPermissions: PermissionResolvable[],
): { hasPermissions: boolean; missingPermissions: PermissionResolvable[] } {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return { hasPermissions: false, missingPermissions: requiredPermissions };

  const botMember = guild.members.cache.get(client.user!.id);
  if (!botMember) return { hasPermissions: false, missingPermissions: requiredPermissions };

  const missingPermissions = requiredPermissions.filter(
    (permission) => !botMember.permissions.has(permission),
  );

  return {
    hasPermissions: missingPermissions.length === 0,
    missingPermissions,
  };
}
