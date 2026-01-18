# Use Node 18 Alpine (lightweight)
FROM node:18-alpine

# Set app directory
WORKDIR /usr/src/app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install @supadata/js cors dotenv express mysql2 pg openai

# Copy all other files
COPY . .

# Expose port 3001
ENV PORT=3001
EXPOSE 3001

# Start the app
CMD ["node", "Tiktok/backend/server.js"]

