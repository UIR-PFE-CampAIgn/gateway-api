# --- Builder stage ---
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Create non-root user
RUN useradd --user-group --create-home appuser

# Copy package files as root first
COPY package*.json ./

# Change ownership to appuser
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Install dependencies
RUN npm ci --no-audit --no-fund

# Copy source and TypeScript configs (this runs as appuser, but we need to ensure ownership)
USER root
COPY src ./src
COPY tsconfig*.json ./
RUN chown -R appuser:appuser /app

USER appuser

# Build the app
RUN npm run build

# --- Production stage ---
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Set NODE_ENV
ENV NODE_ENV=production

# Create non-root user
RUN useradd --user-group --create-home appuser

# Copy built files and node_modules from builder
COPY --from=builder --chown=appuser:appuser /app/dist ./dist
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appuser /app/package.json ./package.json

# Switch to non-root user
USER appuser

# Expose the port
EXPOSE 3001

# Start the app
CMD ["node", "dist/main.js"]