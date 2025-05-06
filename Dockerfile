FROM oven/bun:1 as builder

# Set working directory
WORKDIR /app

# Copy package.json first
COPY package.json ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build TypeScript
RUN bun run build

FROM oven/bun:1 as runner

WORKDIR /app

# Copy package.json and install production dependencies
COPY package.json ./
RUN bun install --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create volume for SQLite database
VOLUME /app/data

# Environment variables
ENV NODE_ENV=production \
    DISCORD_TOKEN=""

# Start the bot
CMD ["bun", "run", "dist/index.js"] 