# Use official Node.js runtime as parent image
FROM node:18-bullseye-slim

# Install system dependencies for downloading tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install arduino-cli
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

# Add arduino-cli to system PATH
ENV PATH="/root/bin:${PATH}"

# Initialize arduino-cli configuration
RUN arduino-cli config init

# Update index and install the Arduino AVR core (needed for Arduino Uno)
RUN arduino-cli core update-index && \
    arduino-cli core install arduino:avr

# Pre-install the recommended Arduino Uno library pack
RUN arduino-cli lib install \
    "Adafruit GFX Library" \
    "Adafruit SSD1306" \
    "DHT sensor library" \
    "Adafruit Unified Sensor" \
    "LiquidCrystal I2C" \
    "U8g2" \
    "NewPing" \
    "IRremote" \
    "RTClib" \
    "Keypad" \
    "ArduinoJson" \
    "FastLED" \
    "Adafruit NeoPixel"

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY arduino-compiler/package*.json ./
RUN npm install --only=production

# Copy server code
COPY arduino-compiler/server.js ./
COPY arduino-compiler/public/ ./public

# Expose port
EXPOSE 3000

# Start Express compilation server
CMD ["node", "server.js"]
