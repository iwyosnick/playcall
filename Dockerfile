# Use a simple static file server
FROM nginx:alpine

# Copy all files to nginx
COPY . /usr/share/nginx/html/

# Create nginx configuration for Cloud Run
RUN echo 'server { \
    listen $PORT; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
