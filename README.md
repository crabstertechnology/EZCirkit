# EZCirkit E-Commerce, Web IDE & Mobile Platform

EZCirkit is a premium, all-in-one educational electronics ecosystem designed to make hardware programming and electronics kit commerce seamless. The platform includes a **Next.js Web E-Commerce Storefront**, a **Web-Based Arduino IDE**, a **Firestore Content Manager**, a **Cloud Compilation Server**, and a **Flutter Mobile App**.

---

## 📂 Repository Structure

* **`src/`**: Next.js (App Router) web application incorporating the storefront, admin console, dynamic checkouts, and Web IDE.
* **`arduino-compiler/`**: Express.js server wrapping the Arduino CLI executable, performing cloud-based compilation with dynamic dependency header injections.
* **`ezcirkit_app/`**: High-performance Flutter mobile application with a regex C++ editor, STK500v1 over-the-air/USB OTG flasher, and a responsive serial monitor.
* **`scripts/`**: Development and admin scripts for bulk-processing SEO, managing orders, and testing shipping APIs.

---

## 🛒 E-Commerce & Checkout Features

### 📦 Product Catalog & Shopping Cart
* **Interactive Storefront**: Rich user interfaces built with ShadCN UI, Tailwind CSS, and Lucide icons.
* **Product Detail & Reviews**: Rating inputs, specification lists, and a rich testimonials layout.
* **Razorpay Payment Gateway**: Process credit/debit cards, net banking, UPI, and wallets securely.

### 🚚 Dynamic Shipping Calculator (Shiprocket Integration)
* **Centralized Shipping Policy Controller (`src/config/shipping.ts`)**: Easily switch between shipping strategies:
  * **Flat Rate + Free Shipping Threshold**: Set standard rates (e.g. ₹79) and offer free shipping above a target cart total (e.g. ₹999).
  * **Zone-Based Shipping**: Determine flat rates depending on the customer's state region (Local, Regional, or National).
  * **Dynamic Shipping Quotes (Shiprocket)**: Live API-driven calculations retrieved at checkout.
* **Volumetric Weight Discrepancy Fix**: Implements dimensional weight checks ($\text{Length} \times \text{Width} \times \text{Height} / 5000$) using standard box parameters ($34 \times 24 \times 6$ cm) to accurately quote 1kg tier pricing instead of lower physical-only weight tier quotes.
* **Automated Shipment Booking**: Creates a shipment automatically in Shiprocket upon payment capture.

---

## 🔍 Automated E-Commerce SEO Suite

* **Bulk SEO Generator Endpoint (`/api/internal/bulk-seo`)**: An admin-only API using Firebase Auth and Firestore REST API to automatically build:
  * Optimized, character-capped Meta Titles.
  * Meta Descriptions detailing price, availability, brand, category, and shipping constraints under 160 characters.
  * Category-specific Frequently Asked Questions (FAQs) (e.g., sensors, display modules, development boards, etc.).
* **Rich JSON-LD Schemas**: Renders structured Google search snippet schemas (`Product`, `AggregateRating`, and `FAQPage`) dynamically for search crawlers.
* **Command Line Automation**: Run `npm run generate:seo` to execute the sync script in a single command.

---

## 💻 Web-Based IDE (`/ide`)

* **Monaco Code Editor**: Premium code workspace featuring custom synth-wave theme coloring tailored for Arduino C/C++.
* **HTML5 Web Serial Flasher**: Flashes compiled hex code directly onto a connected physical microcontroller (e.g., Arduino Uno) from standard Chrome/Opera web browsers without software installs.
* **Educational Instruction Overlays**:
  * **Video Tab**: Floating picture-in-picture YouTube tutorial player.
  * **Diagram Tab**: Drag-and-zoom modal displaying wiring board layouts.
  * **Pinout Spec**: Clean monospaced table outlining physical wiring configurations.
* **Interactive Serial Monitor**: Dual-direction text telemetry monitor supporting custom baud rates, autoscroll toggles, and timestamp logs.

---

## 🔒 Firestore Admin Portal (`/admin`)

* **Chapter & Tutorial Creator**: Manage curriculum lessons, chapters, and custom code templates.
* **YouTube Durations Scraper Integration**: Automatically queries backend scrapers to fetch and format video playtimes (e.g., `4:12` or `1h 15m`) during video URL input.
* **Product Manager**: Interface to upload circuit diagrams, add metadata descriptions, configure physical weights, and customize codes.

---

## 📱 Mobile IDE & Compiler App (Flutter)

A fast, lightweight Flutter app providing portable access to the EZCirkit education network:
* **REST-based Firestore Integrator**: Uses pure REST calls rather than heavy native Firebase SDK dependencies to keep compile times low and builds straightforward.
* **High-Performance Code Widget**: Custom `ArduinoCodeController` extending `TextEditingController` with custom C++ regex syntax styling.
* **Cloud Compiler Client**: Sends workspace sketches to `https://ezcirkit.onrender.com/api/compile` to return compiled Intel HEX binaries.
* **Native STK500v1 Flash Programmer**:
  * Runs over a USB OTG adapter directly on Android devices.
  * Performs DTR/RTS signal line resets (250ms high/low pulses) to force the Optiboot bootloader startup.
  * Synchronizes and writes compiled bytes in 128-byte segments.
* **Interactive Mobile Serial Monitor**: Includes custom baud rate selectors, dynamic data streams, log clearing, custom line endings (`\n`, `\r`, `\r\n`), and smart session locking (pauses during flashing to avoid read/write conflicts, then automatically resumes).
* **Embedded WebView Store**: Integrates the e-commerce next.js site inside an in-app WebView for seamless shopping.

---

## ⚡ Cloud Compiler Server (`arduino-compiler`)

An Express.js-based microservice that manages compilation of Arduino sketches:
* **Arduino CLI Core Wrapper**: Spawns compilation tasks via `arduino-cli compile --fqbn arduino:avr:uno`.
* **Automatic Header Dependency Injector**: Parses sketches and auto-injects standard libraries (`<Arduino.h>`, `<Wire.h>`, `<SPI.h>`, `<EEPROM.h>`) as well as external libraries (like `Adafruit_SSD1306`, `U8g2lib`, `LiquidCrystal_I2C`, `DHT`, `OneWire`, `DallasTemperature`, `FastLED`, `Servo`) if keyword markers are detected.
* **Automatic Workspace Cleanup**: Cleans up temporary build files in `/builds` after compilation succeeds or fails.

---

## ⚙️ Running Locally

### 1. Prerequisites
* **Node.js** (v20 or higher)
* **Flutter SDK** (v3.0.0 or higher)
* **Arduino CLI** (configured locally, or build using the Dockerfile)

### 2. Next.js Web App Setup
1. Copy environmental variables to a `.env.local` file:
   ```env
   NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key
   ADMIN_EMAIL=your_admin_email
   ADMIN_PASSWORD=your_admin_password
   INTERNAL_SEO_SECRET=ezcirkit-seo-2024-internal
   ```
2. Build & run developer server:
   ```bash
   npm install
   npm run dev
   ```

### 3. Local Compiler Server Setup
1. Open the compiler folder:
   ```bash
   cd arduino-compiler
   npm install
   node server.js
   ```
   *Note: Ensure `arduino-cli` is installed on your local path and configured with the `arduino:avr` core.*

### 4. Running the Flutter App
1. Navigate to the app directory:
   ```bash
   cd ezcirkit_app
   flutter create .
   flutter pub get
   flutter run
   ```

---

## 🐳 Docker Deployment

The Express compilation server is Dockerized to run seamlessly in containerized hosting environments (like Render or fly.io):
```bash
docker build -t ezcirkit-compiler -f Dockerfile .
docker run -p 3000:3000 ezcirkit-compiler
```

---

## 🔒 Firestore Security Rules
Deploy the rule configurations to secure store items and payment records:
```bash
firebase login
firebase deploy --only firestore:rules
```
