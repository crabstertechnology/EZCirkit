# EZCirkit E-Commerce & Hardware IDE Platform

A premium, all-in-one web platform featuring an e-commerce storefront for electronics kits, user authentication, a checkout process via Razorpay, and a fully featured **Web-Based Arduino compiler & flasher (EZCirkit IDE)**. 

---

## 🚀 Key Features

### 🛒 E-Commerce & Admin Storefront
* **Product Catalog & Cart**: Interactive product selection, shopping cart, and Razorpay payment gateway integration.
* **Firestore Admin Portal**: Admin interface to create and manage chapters and experiments.
* **Intelligent Experiment Form**:
  * **Auto-fetching YouTube Durations**: Paste a YouTube video link, and the platform automatically queries the backend scraper API to fetch and format the video length (e.g., `4:12` or `1h 15m`).
  * **Rich Metadata Support**: Attach custom Arduino code sketches, upload circuit diagrams (URLs), and enter monospaced custom pinout descriptions.

### 💻 EZCirkit IDE (`/ide`)
* **Monaco Code Editor**: Modern, high-performance editor with synth-wave style syntax highlighting for C++/Arduino code.
* **Web Serial Flasher**: Upload compiled binary sketches directly to connected Arduino Uno boards from the browser via Web Serial.
* **Interactive Instruction Overlay**:
  * **Video Tutorial**: Embeds YouTube tutorial playbacks directly alongside the code workspace.
  * **Circuit Diagrams & Pinouts**: Floating circular `(i)` button triggers a modal displaying full-width circuit board diagrams and monospaced connection pinout specifications.
* **Serial Monitor**: Built-in interactive console for checking serial data lines (`Serial.print`) from the board.

---

## 🛠️ Technology Stack
* **Frontend**: Next.js (App Router), React, Tailwind CSS, ShadCN UI, Lucide Icons.
* **Database & Auth**: Firebase Firestore and Firebase Authentication.
* **Payments**: Razorpay.
* **Compiler & Flasher**: Vanilla HTML5, CSS3, JavaScript, Monaco Editor, Web Serial API, and Arduino CLI (via locally running compiler).

---

## 📱 Mobile Compatibility
* **Compilation**: Code can be written, reviewed, and compiled on any mobile browser (iOS and Android).
* **Board Flashing/Uploading**:
  * **Android**: Supported! Connect your Arduino Uno using a USB OTG adapter and run **Google Chrome** or **Opera** (these browsers support Web Serial on Android).
  * **iOS (iPhone/iPad)**: Not supported due to Apple iOS's WebKit restrictions on direct USB/Serial access.

---

## ⚙️ Running the Project Locally

### 1. Prerequisites
* **Node.js** (v20 or higher)
* **Firebase Project** (Console config credentials)
* **Razorpay Developer Keys**

### 2. Setting Up Environment Variables
Create a `.env.local` file in the root folder:
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### 3. Firebase Web Configuration
Update the Firebase configuration object inside [src/firebase/config.ts](file:///w:/CRABSTERTECHNOLOGY/EZCIRKITEWEB/src/firebase/config.ts) with your project's credentials.

### 4. Running the Main Store & Web IDE
Install dependencies and run the development server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## ⚡ Setting Up the Local Compiler Server
To compile and upload code to physical Arduino boards, you must run the local compiler utility:

1. Navigate to the `arduino-compiler` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the compiler server:
   ```bash
   node server.js
   ```
This starts the local compiler service on `http://localhost:8080`, allowing compilation and flashing via the Web Serial API from your IDE dashboard.

---

## 🔒 Firestore Security Rules
Deploy security configurations to keep user data and order items protected:
```bash
firebase login
firebase deploy --only firestore:rules
```
