# Use the official Bun image
FROM oven/bun:1 as runner

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN bun install --production

# Copy source code
COPY . .

# Create volume for SQLite database
VOLUME /app/data

# Environment variables
ENV DISCORD_TOKEN=""

# Start the bot
CMD ["bun", "run", "src/index.ts"] 