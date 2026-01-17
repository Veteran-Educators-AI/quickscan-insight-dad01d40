# Scanner Bridge Companion App
# A Docker container that provides TWAIN/SANE scanner access to the web app

FROM node:20-slim

# Install SANE scanner libraries and dependencies
RUN apt-get update && apt-get install -y \
    sane \
    sane-utils \
    libsane-dev \
    libusb-1.0-0 \
    libusb-1.0-0-dev \
    usbutils \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install Node.js dependencies
RUN npm install

# Copy application source
COPY . .

# Expose WebSocket port
EXPOSE 8765

# Run the scanner bridge
CMD ["node", "server.js"]
