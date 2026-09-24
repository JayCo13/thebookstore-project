# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Build arguments for React environment variables
ARG REACT_APP_API_URL

# Set environment variables for build
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
