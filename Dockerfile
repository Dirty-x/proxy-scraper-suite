# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev) to build
RUN npm install

# Copy source
COPY src ./src

# Build the project
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Create storage directory for results and logs
RUN mkdir -p storage/proxy-results storage/logs storage/datasets

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built files and production node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package.json ./
COPY --chown=nodejs:nodejs input.json ./

# Set environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Expose Dashboard Port
EXPOSE 3000

USER nodejs

# Command to run the application
ENTRYPOINT ["npm", "run", "start:prod"]
