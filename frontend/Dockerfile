# Stage 1: Build the Vite app
FROM node:22-alpine AS build

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install cleanly
RUN npm ci

# Copy all frontend files
COPY . .

# Accept Vite env vars at build time (must be passed via --build-arg)
ARG VITE_REACT_APP_BACKEND_URL
ENV VITE_REACT_APP_BACKEND_URL=$VITE_REACT_APP_BACKEND_URL

# Build for production
RUN npm run build

# Stage 2: Serve the app with Nginx
FROM nginx:alpine

# Copy the build output from the builder stage
COPY --from=build /app/dist /usr/share/nginx/html

# Use nginx's built-in template mechanism — entrypoint runs envsubst on *.template files
# at container startup, outputting to /etc/nginx/conf.d/. This lets BACKEND_URL be
# injected into the CSP connect-src from the runtime environment without rebuilding.
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Expose Nginx default port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
