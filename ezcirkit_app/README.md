# EZCirkit Mobile IDE & Compiler App (Flutter)

A premium, high-performance mobile application version of the **EZCirkit IDE** built using Flutter. This app allows users to browse step-by-step coding experiments, view video tutorials, inspect circuit pinouts, compile code in the cloud, and flash compiled sketches directly to physical Arduino Uno boards over USB OTG on Android.

---

## 📱 Features

1. **Interactive Curriculum Dashboard**:
   * Loads educational chapters and experiment lists dynamically via the Firestore REST API.
   * Allows searching and filtering experiments by chapters with visual indicators.
   * Automatically extracts YouTube thumbnails and metadata for previews.
2. **Mobile IDE & Code Workspace**:
   * Custom syntax-highlighted code editor tailored for Arduino/C++ development.
   * Floating action toggles to verify and upload sketches.
3. **Cloud Compiler Integration**:
   * Sends code sketches to the secure compiler backend (`https://ezcirkit.onrender.com/api/compile`).
   * Displays step-by-step compiler logs and handles syntax compilation errors.
4. **Native STK500v1 Flash Programmer**:
   * Translates Intel HEX compilations into 128-byte pages.
   * Triggers hardware DTR/RTS resets to initiate the Optiboot bootloader.
   * Synchronizes and writes pages directly to the connected microcontroller over USB OTG.
5. **Interactive Serial Monitor**:
   * Read and write lines dynamically at configurable baud rates (e.g. 9600, 115200).
   * Supports autoscroll, timestamp toggling, custom line endings (`\n`, `\r`, `\r\n`), and log clearing.

---

## 🛠️ App Architecture

The app uses a modular **Provider-based MVVM (Model-View-ViewModel)** architecture:

* **Services (`lib/services/`)**:
  * `FirestoreService`: Handles server-side fetches of chapters and experiments using the Firestore HTTP REST API. Does not require heavy Firebase SDKs or `google-services.json` credentials, ensuring out-of-the-box building.
  * `CompilerService`: POSTs Arduino code to the server and parses compiler success or failure objects.
  * `UsbService`: Manages scanning, connection streams, configuration variables, and physical attachment hooks for USB serial adapters.
  * `Stk500Flasher`: Implements the STK500v1 bootloader protocol to upload compiled Intel HEX binaries to the microcontroller.
* **Widgets & Utils (`lib/widgets/` & `lib/utils/`)**:
  * `ArduinoCodeController`: Custom regex-based code highlighter controller that overrides `TextEditingController` for fast highlighting.
  * `CodeEditor`: Custom scroll-synchronized layout linking code lines, line numbers gutter, and horizontal scroll constraints.
* **Screens (`lib/screens/`)**:
  * `DashboardScreen`: Lists available educational topics and experiments.
  * `IdeScreen`: Layout containing:
    * **Editor Tab**: Code editor, progress indicators, and verify/upload toolbar.
    * **Video Tab**: Embedded Youtube video player for instruction.
    * **Diagram Tab**: Photo-viewer enabling pan-and-zoom of board connections and pinouts.
    * **Monitor Tab**: Text fields, controls, and logging scroll list for serial telemetry.

---

## 🚀 How to Run the App

### 1. Prerequisites
Ensure you have the following installed on your developer machine:
* [Flutter SDK](https://docs.flutter.dev/get-started/install) (v3.0.0 or higher)
* [Android SDK](https://developer.android.com/studio) (for Android device building)
* A USB OTG adapter and an Arduino Uno connected via USB cable to your phone.

### 2. Initialize Platform Assets
Navigate to the `ezcirkit_app` directory in your terminal and initialize the platform folders:
```bash
cd ezcirkit_app
flutter create .
```
This generates the platform-specific directories (`android/`, `ios/`, etc.) around the existing Dart codebase without overwriting them.

### 3. Fetch Dependencies
Install the required packages defined in `pubspec.yaml`:
```bash
flutter pub get
```

### 4. Run on a Physical Android Device
1. Connect your Android phone to your PC via USB and enable **USB Debugging** in Developer Options.
2. Select your device using `flutter devices`.
3. Launch the app in debug mode:
   ```bash
   flutter run
   ```

---

## ⚡ How Flashing Works Under the Hood
1. When you tap **Upload**, the active Serial Monitor telemetry subscription is suspended to prevent read-write conflicts.
2. The serial baud parameters are configured to **115200 Baud** (Optiboot's default communication speed).
3. The app toggles the USB **DTR (Data Terminal Ready)** and **RTS (Request to Send)** signals high for 250ms and then low. This acts as a hardware reset trigger, forcing the Arduino microcontroller to reboot into its bootloader.
4. The app sends an insync request (`[0x30, 0x20]`). If it receives a response containing `[0x14, 0x10]`, it has synced.
5. The parsed 128-byte pages are loaded to their memory address and flashed sequentially.
6. Once completed, the app restores the communication baud rate back to your monitor setting (usually 9600 Baud) and restarts the background Serial Monitor listener automatically.
