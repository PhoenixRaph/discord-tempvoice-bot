# Discord TempVoice Bot

Ein Discord.js Bot für temporäre Voice-Channels, geschrieben in TypeScript und ausgeführt mit Bun.

## Features

- Automatische Erstellung temporärer Voice-Channels
- Multi-Creator-System (mehrere Creator-Channels pro Server)
- Umfangreiches Logging-System
- Benutzerfreundliche Verwaltungsbefehle
- SQLite3-Datenbank für persistente Speicherung

## Verwendung mit Docker

### Option 1: Offizielles Image von GitHub Container Registry

```bash
# Pull das neueste Image
docker pull ghcr.io/PhoenixRaph/discord-tempvoice-bot:latest

# Starten Sie den Container
docker run -d \
  --name discord-bot \
  -v $(pwd)/data:/app/data \
  -e DISCORD_TOKEN=your_token_here \
  ghcr.io/PhoenixRaph/discord-tempvoice-bot:latest
```

### Option 2: Lokaler Build mit Docker Compose

1. Repository klonen:
```bash
git clone https://github.com/PhoenixRaph/discord-tempvoice-bot.git
cd discord-tempvoice-bot
```

2. Discord Bot Token in `docker-compose.override.yml` eintragen:
```yaml
version: '3.8'
services:
  bot:
    environment:
      DISCORD_TOKEN: "YOUR_DISCORD_BOT_TOKEN"
```

3. Container starten:
```bash
docker-compose up -d
```

## Entwicklung

### Voraussetzungen

- [Bun](https://bun.sh) (Version >= 1.0.0)
- [Docker](https://www.docker.com/) (optional)

### Setup

1. Dependencies installieren:
```bash
bun install
```

2. Entwicklungsserver starten:
```bash
bun run dev
```

## Verfügbare Befehle

- `/tempvoice setup` - Richtet einen neuen Voice-Channel Creator ein
- `/tempvoice setup_guild` - Konfiguriert die Logging-Einstellungen
- `/tempvoice list` - Zeigt alle konfigurierten Creator an
- `/tempvoice remove` - Entfernt einen Creator
- `/tempvoice disable` - Deaktiviert das System

## Docker Tags

- `latest` - Neueste Version aus dem main Branch
- `vX.Y.Z` - Spezifische Versionen (z.B. v1.0.0)
- `vX.Y` - Letzte Minor Version (z.B. v1.0)
- `sha-XXXXXXX` - Spezifische Commits

## Lizenz

MIT 