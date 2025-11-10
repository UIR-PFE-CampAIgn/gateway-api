# --- Base image for building
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

# --- Production image (smaller, no devDeps)
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only necessary files
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist


EXPOSE 3001

CMD ["node", "dist/main.js"]
