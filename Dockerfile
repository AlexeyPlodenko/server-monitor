# Stage 1: Build
FROM node:24-slim AS builder
WORKDIR /app/
# Install build tools ONLY in this stage
RUN apt-get update && apt-get install -y python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Runtime
FROM node:24-slim
WORKDIR /app/
# Copy ONLY the built node_modules and your code
COPY --from=builder /app/node_modules/ ./node_modules/

# Create necessary directories for persistence
RUN mkdir -p logs state tests

COPY . .

CMD [ "npm", "start" ]
