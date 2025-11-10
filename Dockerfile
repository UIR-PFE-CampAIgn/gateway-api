# --- Builder image
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install dependencies with devDeps for building
COPY package*.json ./
RUN npm ci --include=dev --no-audit --no-fund

# Copy only source code and TypeScript configs
COPY src ./src
COPY tsconfig*.json ./

# Build the app
RUN npm run build

# --- Production image
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user for security
RUN useradd --user-group --create-home --shell /bin/false appuser
USER appuser

# Copy runtime dependencies
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose the app port
EXPOSE 3001

# Start the application
CMD ["node", "dist/main.js"]
