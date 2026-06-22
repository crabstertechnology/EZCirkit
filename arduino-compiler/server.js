const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Directory for temporary builds
const BUILDS_DIR = path.join(__dirname, 'builds');

// Ensure builds directory exists
async function init() {
  try {
    await fs.mkdir(BUILDS_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating builds directory:', err);
  }
}
init();

// Route to compile Arduino code
app.post('/api/compile', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, error: 'No code provided.' });
  }

  // Create a unique temporary directory
  const buildId = crypto.randomBytes(16).toString('hex');
  const tempDir = path.join(BUILDS_DIR, buildId);
  const sketchDir = path.join(tempDir, 'sketch');
  const buildDir = path.join(tempDir, 'build');
  const sketchFile = path.join(sketchDir, 'sketch.ino');

  try {
    // Create folders
    await fs.mkdir(sketchDir, { recursive: true });
    await fs.mkdir(buildDir, { recursive: true });

    // Write Arduino sketch code with auto-injected headers
    const processedCode = autoInjectHeaders(code);
    await fs.writeFile(sketchFile, processedCode, 'utf-8');

    // Run arduino-cli compile command
    // Specify the fully qualified board name (FQBN) for Arduino Uno: arduino:avr:uno
    const compileCmd = `arduino-cli compile --fqbn arduino:avr:uno --output-dir "${buildDir}" "${sketchDir}"`;

    exec(compileCmd, async (error, stdout, stderr) => {
      let compilerOutput = stdout + '\n' + stderr;
      
      // Clean up the index update warnings or logs if necessary, but keep compilation logs
      if (error) {
        console.log(`Compilation failed for ${buildId}`);
        res.json({
          success: false,
          error: compilerOutput,
          message: 'Compilation failed. See compiler output for details.'
        });
        // Clean up build files asynchronously
        cleanUpDir(tempDir);
        return;
      }

      try {
        // Read the compiled hex file
        const hexPath = path.join(buildDir, 'sketch.ino.hex');
        const hexContent = await fs.readFile(hexPath, 'utf-8');

        res.json({
          success: true,
          hex: hexContent,
          stdout: compilerOutput,
          message: 'Compilation successful!'
        });
      } catch (readErr) {
        console.error('Error reading compiled hex file:', readErr);
        res.json({
          success: false,
          error: compilerOutput + '\n' + readErr.message,
          message: 'Compilation succeeded, but failed to retrieve HEX file.'
        });
      }

      // Clean up build files asynchronously
      cleanUpDir(tempDir);
    });

  } catch (err) {
    console.error('Server compilation error:', err);
    res.status(500).json({ success: false, error: err.message });
    cleanUpDir(tempDir);
  }
});

// Helper function to clean up build folder
async function cleanUpDir(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (err) {
    console.error(`Failed to clean up directory ${dirPath}:`, err);
  }
}

// Auto inject core headers and detect external libraries by keyword usage
function autoInjectHeaders(code) {
  let injected = [];
  
  // Base auto-includes
  if (!code.includes('<Arduino.h>') && !code.includes('"Arduino.h"')) {
    injected.push('#include <Arduino.h>');
  }
  if (!code.includes('<Wire.h>') && !code.includes('"Wire.h"')) {
    injected.push('#include <Wire.h>');
  }
  if (!code.includes('<SPI.h>') && !code.includes('"SPI.h"')) {
    injected.push('#include <SPI.h>');
  }
  if (!code.includes('<EEPROM.h>') && !code.includes('"EEPROM.h"')) {
    injected.push('#include <EEPROM.h>');
  }

  // Detect additional libraries based on usage keywords
  const libraryDetections = [
    {
      keywords: ['Adafruit_SSD1306', 'SSD1306_'],
      headers: ['<Adafruit_GFX.h>', '<Adafruit_SSD1306.h>']
    },
    {
      keywords: ['U8g2', 'U8G2'],
      headers: ['<U8g2lib.h>']
    },
    {
      keywords: ['LiquidCrystal_I2C'],
      headers: ['<LiquidCrystal_I2C.h>']
    },
    {
      keywords: ['DHT', 'dht.begin'],
      headers: ['<Adafruit_Sensor.h>', '<DHT.h>']
    },
    {
      keywords: ['OneWire'],
      headers: ['<OneWire.h>']
    },
    {
      keywords: ['DallasTemperature'],
      headers: ['<DallasTemperature.h>', '<OneWire.h>']
    },
    {
      keywords: ['NewPing'],
      headers: ['<NewPing.h>']
    },
    {
      keywords: ['IRrecv', 'decode_results', 'IRremote'],
      headers: ['<IRremote.h>']
    },
    {
      keywords: ['Keypad'],
      headers: ['<Keypad.h>']
    },
    {
      keywords: ['RTC_DS1307', 'RTC_DS3231', 'RTC_Millis', 'DateTime'],
      headers: ['<RTClib.h>']
    },
    {
      keywords: ['DynamicJsonDocument', 'StaticJsonDocument', 'JsonDocument', 'ArduinoJson'],
      headers: ['<ArduinoJson.h>']
    },
    {
      keywords: ['FastLED', 'CRGB'],
      headers: ['<FastLED.h>']
    },
    {
      keywords: ['Adafruit_NeoPixel'],
      headers: ['<Adafruit_NeoPixel.h>']
    },
    {
      keywords: ['Servo'],
      headers: ['<Servo.h>']
    },
    {
      keywords: ['SoftwareSerial'],
      headers: ['<SoftwareSerial.h>']
    },
    {
      keywords: ['Stepper'],
      headers: ['<Stepper.h>']
    }
  ];

  for (const lib of libraryDetections) {
    const hasKeyword = lib.keywords.some(kw => code.includes(kw));
    if (hasKeyword) {
      for (const h of lib.headers) {
        if (!code.includes(h)) {
          injected.push(`#include ${h}`);
        }
      }
    }
  }

  if (injected.length > 0) {
    return injected.join('\n') + '\n\n' + code;
  }
  return code;
}

app.listen(PORT, () => {
  console.log(`Arduino Compiler Server is running on http://localhost:${PORT}`);
});
