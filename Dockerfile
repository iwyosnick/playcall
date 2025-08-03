# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Create a non-root user for security
RUN addgroup -g 1001 -S nginx && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Copy only the built files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx configuration for Cloud Run with security headers
RUN echo 'server { \
    listen $PORT; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Security headers \
    add_header X-Content-Type-Options nosniff; \
    add_header X-Frame-Options DENY; \
    add_header X-XSS-Protection "1; mode=block"; \
    add_header Referrer-Policy "strict-origin-when-cross-origin"; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Prevent access to sensitive files \
    location ~ /\. { \
        deny all; \
    } \
    \
    location ~ \.(env|log)$ { \
        deny all; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Change ownership to non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Switch to non-root user
USER nginx

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
