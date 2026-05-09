FROM node:22-alpine

WORKDIR /app

# Copy dependency specifications first
COPY package*.json ./

# Install dependencies cleanly
RUN npm install

# Copy the rest of the backend files
COPY . .

# Assume PORT is 8080, expose it for container network
EXPOSE 8080

# Start the Express server
CMD ["node", "src/index.js"]
