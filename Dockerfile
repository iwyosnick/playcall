# Use the official Node.js image as a base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of your application's source code
COPY . .

# Expose the port your app listens on
EXPOSE 8080

# Define the command to run your app
CMD ["node", "server.js"]
