/**
 * Crabster Technology — SEO Mappings and Utilities
 * Maps clean, lowercase SEO slugs to dynamic Firestore document IDs
 */

export const COMPONENT_SLUGS: Record<string, string> = {
  'ultrasonic-sensor': '5XzI12pe4WZ0RuGPLaqg', // HC-SR04 Ultrasonic Range Finder Sensor Module for Arduino
  'hc-sr04-ultrasonic-sensor': '5XzI12pe4WZ0RuGPLaqg',
  'soil-moisture-sensor': '85JYsmYxmXNGo3i7YWcv', // Soil Moisture Sensor Hygrometer Module Compatible with Arduino
  'capacitive-soil-moisture-sensor': 'Ahd2xCwwsBmOb0jYOszW', // Capacitive Soil Moisture Sensor V2.0 for Arduino
  'w1209-temperature-controller': 'IDHVMrvVtHvjo5mrsTtH', // W1209 Digital Temperature Controller Thermostat Module
  'servo-motor': 'SdJ4yw6FDNDIphsia77p', // SG90 Micro Servo Motor (9g)
  'dc-water-pump': 'V29bN2vbaAWOONBzHOEp', // DC 3-6V Mini Micro Submersible Water Pump
  '7-segment-display': 'aE6OG2IH9sXkzfq9dxaf', // 1-Digit 7 Segment Display – Common Cathode
  'ldr-sensor': 'dPNErWUYOpJq99j327oQ', // LDR Light Sensor Module for Arduino
  'dht11-sensor': 'tsUquRv4UOWe9ly2BJFl', // DHT11 Humidity and Temperature Sensor Module for Arduino
  'esp32-board': 'vrEa72G4j3Ml3rcjZBFf', // ESP32-WROOM-32 38Pin Development Board WiFi+Bluetooth Ultra-Low Power Consumption Dual Core
  'pir-sensor': 'yzmHVTeJSKOHTxvE74n1', // PIR Motion Sensor Module (HC-SR501)
  'breadboard': '6delcj1UwqZVtMwwRflX', // MB102 830 Points Solderless Breadboard
  'relay-module': '7Yt6F9645TO7Es6m9bWS', // 1 Channel 5V Relay Module
  'push-button': 'bJW0skOUDFTUlmHgwEOj', // 2 Pin Tactile Push Button Switch
  'breadboard-power-supply': 'ow076hQJFMm6rMNHEdJW', // 3.3V/5V MB102 Breadboard Power Supply Module
  'water-level-sensor': 'piGs2zbD0yyKGUHwHJZ6', // Water Level Sensor Module for Arduino
  'current-sensor': 'qG61UrCN8Jv7vtYAzDYS', // ACS712 30A Hall Effect Current Sensor Module
  'toy-motor': 'sRtKO8aH9w9RNL2Q79fn', // DC 5V Toy Motor with Fan
  'rfid-sensor': 'uBPMpW7HvZmTH7ssokoj', // RC522 RFID RF IC Card Sensor Module for Arduino, ARM & Raspberry Pi
  'usb-cable': 'zYYXzjbotUo2EivNbed4', // Micro USB-A to Micro-B Cable for ESP32 WROOM, ESP8266 NodeMCU & Wemos
  '18650-battery': 'kTt9xmY6WqiRWAj16TRJ', // 3.7V 2000mAh 18650 Li-Ion Rechargeable Battery
  'battery-holder': 'KbVkdxJpsMnLBgnu9rbW', // 18650 Single Battery Cell Holder (1 Slot)
  'voltage-sensor': 'N4oHk3E8x3iDRe7ct3TV', // 25V Voltage Detection Sensor Module
  'touch-sensor': 'OoqrbfQv0pRjeRlV60Km', // TTP223 Capacitive Touch Sensor Module
  'boost-converter': 'aczlnWLvo1MmzdJahQo4', // MT3608 DC-DC Step-Up Boost Converter Module
  'mpu6050-gyroscope': 'c2ZYxbHguePUOSPy1pIH', // MPU6050 6-Axis Gyroscope & Accelerometer Sensor Module
  'battery-charger': 'e9GezeuGCzNiBCPPDhDe', // TP4056 1A Li-ion Battery Charging Module with Current Protection (USB Type-C)
  'lcd-display': 'hMtMc1vIoDw8j4y99PCD', // 16x2 LCD Display (Blue Backlight) with IIC/I2C Interface
  'gas-sensor': 'iJAF4Iwdc8aCTOv70vsX', // MQ-7 Carbon Monoxide (CO) Gas Sensor Module
  'soldering-iron-kit': 'ihNvnhiYFNds56F5CEY9', // Noel 7 in 1 Soldering iron kit 25W Gold
  'speech-recognition-module': 'jKZ5xqOFtEM72BeaPcye', // Ai-Thinker VC-02 Series Offline Speech Recognition Control Module
  'fire-sensor': 'nIChX0LRD4F7jiNCSaTy', // IR Flame / Fire Sensor Module for Arduino
  'stm8s-board': '1L6wz8gPTH4isVykFs3e', // STM8S103F3P6 Development Board (202)
  'voice-recorder-module': '6cue5vOMrzM6hXTQNxq2', // SD1820 Voice Recorder Module with Microphone
  'ezcirkit': 'azTYls91q9XKl58LRY4g', // Flagship product
};

export const CATEGORY_SLUGS: Record<string, string> = {
  'sensors': 'Sensors',
  'arduino-boards': 'Arduino Boards',
  'development-boards': 'Development Boards',
  'displays': 'Displays',
  'power-modules': 'Power Modules',
  'robotics': 'Robotics',
  'wires-connectors': 'Wires & Connectors',
  'components': 'Components',
  'diy-kits': 'DIY Kits',
  'ezcirkit': 'EZCirkit',
};

// Inverse mappings for backward lookup
export const COMPONENT_ID_TO_SLUG = Object.entries(COMPONENT_SLUGS).reduce<Record<string, string>>((acc, [slug, id]) => {
  // Prefer shorter/cleaner slug in case of duplicates
  if (!acc[id] || slug.length < acc[id].length) {
    acc[id] = slug;
  }
  return acc;
}, {});

export const CATEGORY_NAME_TO_SLUG = Object.entries(CATEGORY_SLUGS).reduce<Record<string, string>>((acc, [slug, name]) => {
  acc[name] = slug;
  return acc;
}, {});

/**
 * Converts a raw string (like a product name) to an SEO-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

/**
 * Resolves a slug to either a Firestore Product ID or a Category Name.
 */
export function resolveSeoSlug(slug: string): { type: 'component' | 'category' | null; value: string } {
  const lowercaseSlug = slug.toLowerCase();
  
  // 1. Check exact component slug mapping
  if (COMPONENT_SLUGS[lowercaseSlug]) {
    return { type: 'component', value: COMPONENT_SLUGS[lowercaseSlug] };
  }
  
  // 2. Check exact category slug mapping
  if (CATEGORY_SLUGS[lowercaseSlug]) {
    return { type: 'category', value: CATEGORY_SLUGS[lowercaseSlug] };
  }
  
  // 3. Check if slug is a raw Firestore ID
  if (Object.values(COMPONENT_SLUGS).includes(slug)) {
    return { type: 'component', value: slug };
  }
  
  return { type: null, value: '' };
}
