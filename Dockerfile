# --- Builder stage ---
    FROM node:20-bookworm-slim AS builder
    WORKDIR /app
    
    # Create non-root user
    RUN useradd --user-group --create-home appuser
    USER appuser
    
    # Copy package files and install all dependencies (including dev)
    COPY package*.json ./
    RUN npm ci --no-audit --no-fund
    
    # Copy source and TypeScript configs
    COPY src ./src
    COPY tsconfig*.json ./
    
    # Build the app
    RUN npm run build
    
    # --- Production stage ---
    FROM node:20-bookworm-slim AS runner
    WORKDIR /app
    
    # Set NODE_ENV
    ENV NODE_ENV=production
    
    # Use the same non-root user
    RUN useradd --user-group --create-home appuser
    USER appuser
    
    # Copy built files and node_modules from builder
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/package.json ./package.json
    
    # Expose the port
    EXPOSE 3001
    
    # Start the app
    CMD ["node", "dist/main.js"]
    