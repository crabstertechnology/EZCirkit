// Configurable Compiler Server URL
// Set this to your deployed online server URL (e.g., "https://your-compiler.onrender.com")
// Leave empty "" to run relative to the website's domain (or fall back to localhost:3000 on static hosts)
const COMPILER_SERVER_URL = "https://ezcirkit.onrender.com";

// Monaco Editor and IDE State
let editor;
let compiledHex = null;
let activePort = null;
let serialReader = null;
let serialReaderActive = false;
let serialReadBuffer = [];
let currentReader = null;
let isSerialMonitorOpen = false;
let currentSerialLineEl = null;

// Default Sketch Templates
const SKETCHES = {
  blink: `// Blink - Turns on an LED for one second, then off for one second
void setup() {
  // initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);   // turn the LED on
  delay(1000);                       // wait for a second
  digitalWrite(LED_BUILTIN, LOW);    // turn the LED off
  delay(1000);                       // wait for a second
}`,

  fade: `// Fade - Fades an LED on pin 9 using PWM
int ledPin = 9;           // LED connected to digital pin 9
int brightness = 0;       // how bright the LED is
int fadeAmount = 5;       // how many points to fade the LED by

void setup() {
  // declare pin 9 to be an output:
  pinMode(ledPin, OUTPUT);
}

void loop() {
  // set the brightness of pin 9:
  analogWrite(ledPin, brightness);

  // change the brightness for next time through the loop:
  brightness = brightness + fadeAmount;

  // reverse the direction of the fading at the ends of the fade:
  if (brightness <= 0 || brightness >= 255) {
    fadeAmount = -fadeAmount;
  }
  // wait for 30 milliseconds to see the dimming effect
  delay(30);
}`,

  analogSerial: `// Analog Read Serial - Reads analog input on pin A0, prints to Serial Monitor
void setup() {
  // initialize serial communication at 9600 bits per second:
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  // read the input on analog pin 0:
  int sensorValue = analogRead(A0);
  
  // print out the value you read:
  Serial.print("Sensor Value: ");
  Serial.println(sensorValue);
  
  // Blink the onboard LED when reading
  digitalWrite(LED_BUILTIN, HIGH);
  delay(100);
  digitalWrite(LED_BUILTIN, LOW);
  
  delay(900); // delay in between reads
}`,

  button: `// Button Control - Turns on LED when pressing a button on pin 2
const int buttonPin = 2;     // the number of the pushbutton pin
const int ledPin =  13;      // the number of the LED pin

int buttonState = 0;         // variable for reading the pushbutton status

void setup() {
  // initialize the LED pin as an output:
  pinMode(ledPin, OUTPUT);
  // initialize the pushbutton pin as an input with internal pullup:
  pinMode(buttonPin, INPUT_PULLUP);
}

void loop() {
  // read the state of the pushbutton value:
  // Since we use INPUT_PULLUP, state is LOW when pressed
  buttonState = digitalRead(buttonPin);

  // check if the pushbutton is pressed.
  if (buttonState == LOW) {
    // turn LED on:
    digitalWrite(ledPin, HIGH);
  } else {
    // turn LED off:
    digitalWrite(ledPin, LOW);
  }
}`,

  serialEcho: `// Serial Echo - Repeats back whatever you type in the Serial Monitor
void setup() {
  // initialize serial communication
  Serial.begin(9600);
  Serial.println("Arduino ready. Type something and press Send!");
}

void loop() {
  // reply only when you receive data:
  if (Serial.available() > 0) {
    // read the incoming byte:
    char incomingByte = Serial.read();

    // say what you got:
    Serial.print("Received: ");
    Serial.write(incomingByte);
    Serial.println();
  }
}`
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  // Render Lucide Icons
  lucide.createIcons();

  // Initialize Monaco Editor
  initMonacoEditor();

  // Setup Event Listeners
  setupEventListeners();

  // Check Web Serial support
  checkWebSerialSupport();

  // Auto-connect to previously authorized board
  await autoConnectPort();
});

// Monaco Editor Config
function initMonacoEditor() {
  require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' }});
  require(['vs/editor/editor.main'], function() {
    // Remove loading overlay
    const loadingEl = document.querySelector('.loading-editor');
    if (loadingEl) loadingEl.remove();

    editor = monaco.editor.create(document.getElementById('editorContainer'), {
      value: SKETCHES.blink,
      language: 'cpp',
      theme: 'vs',
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "'Fira Code', Consolas, monospace",
      minimap: { enabled: false },
      lineHeight: 22,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      padding: { top: 12 }
    });
  });
}

// Check if Browser Supports Web Serial
function checkWebSerialSupport() {
  const supportBadge = document.getElementById('webSerialSupport');
  if ('serial' in navigator) {
    supportBadge.textContent = 'Supported';
    supportBadge.className = 'badge success';
  } else {
    supportBadge.textContent = 'Unsupported';
    supportBadge.className = 'badge error';
    logToConsole('WARNING: Web Serial API is not supported in this browser. You will not be able to connect or upload to the Arduino Uno. Please use a Chromium-based browser (Chrome, Edge, Opera).', 'error');
  }
}

// Auto-connect to previously authorized board
async function autoConnectPort() {
  if (!('serial' in navigator)) return;

  // Run the check immediately on page load
  await performAutoConnectCheck();

  // Listen for physical plug-in events
  navigator.serial.addEventListener('connect', async () => {
    logToConsole("Board plug-in detected. Auto-connecting...", "info");
    await performAutoConnectCheck();
  });

  // Poll every second in case events are not fired or permission delay occurs
  setInterval(async () => {
    await performAutoConnectCheck();
  }, 1000);
}

// Perform active port auto-connect check
async function performAutoConnectCheck() {
  if (activePort) return; // Already connected

  try {
    const ports = await navigator.serial.getPorts();
    if (ports.length > 0) {
      activePort = ports[0];
      
      // Listen for disconnects
      navigator.serial.addEventListener('disconnect', (event) => {
        if (event.port === activePort) {
          logToConsole("Board physically disconnected.", "warning");
          disconnectPort();
        }
      });

      logToConsole("Board auto-connected.", "success");
      document.getElementById('portStatusText').textContent = "Disconnect Board";
      document.getElementById('portStatusText').parentElement.classList.remove('btn-secondary');
      document.getElementById('portStatusText').parentElement.classList.add('btn-success');
      document.getElementById('footerConnectionText').textContent = "Connected: Arduino Uno";
      
      // Switch to Serial Monitor Tab and automatically open the stream
      const serialTabBtn = document.querySelector('.tab-btn[data-tab="serial"]');
      if (serialTabBtn) serialTabBtn.click();
      if (!isSerialMonitorOpen) {
        await toggleSerialMonitor();
      }
    }
  } catch (err) {
    console.warn("Auto-connect check failed:", err);
  }
}

// Log message to Compiler Console
function logToConsole(message, type = 'info') {
  const consoleTerm = document.getElementById('consoleTerminal');
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  
  // Format timestamps
  const now = new Date();
  const timeStr = `[${now.toTimeString().split(' ')[0]}] `;
  line.textContent = timeStr + message;
  
  consoleTerm.appendChild(line);
  consoleTerm.scrollTop = consoleTerm.scrollHeight;
}

// Log message to Serial Terminal
function logToSerial(message, type = 'rx') {
  const serialTerm = document.getElementById('serialTerminal');
  const showTimestamp = document.getElementById('showTimestampCheck').checked;

  // Non-rx logs (like system/error messages or TX) should always start on a fresh line
  if (type !== 'rx') {
    currentSerialLineEl = null;
  }

  // Split incoming text chunks by newline characters
  const parts = message.split(/(\r?\n)/);

  for (const part of parts) {
    if (part === '\n' || part === '\r\n' || part === '\r') {
      // Newline encountered: terminate the current line so the next part goes to a new line
      currentSerialLineEl = null;
    } else if (part.length > 0) {
      // Content chunk: append to current line or create a new div line if needed
      if (!currentSerialLineEl) {
        currentSerialLineEl = document.createElement('div');
        currentSerialLineEl.className = `log-line serial-${type}`;
        
        // Add timestamp at start of new line if enabled
        if (showTimestamp && (type === 'rx' || type === 'tx')) {
          const now = new Date();
          const timeStr = `[${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}] `;
          currentSerialLineEl.textContent = timeStr;
        }
        
        serialTerm.appendChild(currentSerialLineEl);
      }
      
      currentSerialLineEl.textContent += part;
    }
  }
  
  if (document.getElementById('autoscrollCheck').checked) {
    serialTerm.scrollTop = serialTerm.scrollHeight;
  }
}

// Set up UI Interaction Listeners
function setupEventListeners() {
  // Tab buttons switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const targetTab = btn.getAttribute('data-tab');
      document.getElementById(`${targetTab}Tab`).classList.add('active');
    });
  });

  // Clear log buttons
  document.getElementById('clearConsoleBtn').addEventListener('click', () => {
    document.getElementById('consoleTerminal').innerHTML = '';
  });

  document.getElementById('clearSerialBtn').addEventListener('click', () => {
    document.getElementById('serialTerminal').innerHTML = '';
    currentSerialLineEl = null;
  });

  // Web Serial Port Connection Toggle
  document.getElementById('connectPortBtn').addEventListener('click', handlePortSelection);

  // Verify / Compile Button
  document.getElementById('verifyBtn').addEventListener('click', handleCompile);

  // Upload Button
  document.getElementById('uploadBtn').addEventListener('click', handleUpload);

  // Serial Monitor Toggle Panel Button
  document.getElementById('serialToggleBtn').addEventListener('click', () => {
    // Switch to Serial Monitor Tab
    const serialTabBtn = document.querySelector('.tab-btn[data-tab="serial"]');
    if (serialTabBtn) serialTabBtn.click();
    
    // Toggle active port for serial reading if connected
    toggleSerialMonitor();
  });

  // Serial Terminal sending interaction
  const serialInput = document.getElementById('serialInput');
  const sendSerialBtn = document.getElementById('sendSerialBtn');

  serialInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendSerialData();
    }
  });

  sendSerialBtn.addEventListener('click', sendSerialData);
}

// -------------------------------------------------------------
// Compilation & Verification
// -------------------------------------------------------------
async function handleCompile() {
  if (!editor) return;
  
  const code = editor.getValue();
  const verifyBtn = document.getElementById('verifyBtn');
  const editorStatus = document.getElementById('editorStatus');
  const progressBarContainer = document.getElementById('compileProgressBarContainer');
  const progressBar = document.getElementById('compileProgressBar');
  const progressText = document.getElementById('compileProgressText');
  
  // Update state
  verifyBtn.disabled = true;
  editorStatus.textContent = 'Compiling';
  editorStatus.className = 'status-indicator running';
  
  // Show progress elements
  progressBarContainer.style.display = 'block';
  progressBar.style.width = '0%';
  progressBar.style.background = 'var(--color-primary)';
  progressText.style.display = 'inline-block';
  progressText.textContent = '0%';
  progressText.style.color = 'var(--color-primary)';
  progressText.style.background = 'hsla(24, 95%, 50%, 0.1)';
  progressText.style.borderColor = 'hsla(24, 95%, 50%, 0.2)';
  
  let progress = 0;
  const progressInterval = setInterval(() => {
    if (progress < 90) {
      // Increment slows down as it gets closer to 90%
      const increment = Math.max(1, Math.floor((90 - progress) / 8));
      progress += increment;
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `${progress}%`;
    }
  }, 100);
  
  function endProgress(success) {
    clearInterval(progressInterval);
    progressBar.style.width = '100%';
    progressText.textContent = '100%';
    
    if (success) {
      progressBar.style.background = 'var(--color-success)';
      progressText.style.color = 'var(--color-success)';
      progressText.style.background = 'hsla(142, 60%, 40%, 0.1)';
      progressText.style.borderColor = 'hsla(142, 60%, 40%, 0.2)';
    } else {
      progressBar.style.background = 'var(--color-danger)';
      progressText.style.color = 'var(--color-danger)';
      progressText.style.background = 'hsla(354, 70%, 48%, 0.1)';
      progressText.style.borderColor = 'hsla(354, 70%, 48%, 0.2)';
    }
    
    setTimeout(() => {
      progressBarContainer.style.display = 'none';
      progressText.style.display = 'none';
    }, 1500);
  }
  
  logToConsole('Starting compilation for Arduino Uno...', 'info');
  
  try {
    // Use the online COMPILER_SERVER_URL if configured, otherwise run relative to the website's domain
    let compileUrl = '/api/compile';
    if (COMPILER_SERVER_URL) {
      compileUrl = `${COMPILER_SERVER_URL}/api/compile`;
    }

    const response = await fetch(compileUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });
    
    const result = await response.json();
    
    if (result.success) {
      compiledHex = result.hex;
      logToConsole('Compilation finished successfully!', 'success');
      
      // Print compile summary info
      const lines = result.stdout.split('\n');
      lines.forEach(line => {
        if (line.trim() && !line.includes('Downloading index') && !line.includes('Error initializing')) {
          logToConsole(line, 'compile-log');
        }
      });
      
      editorStatus.textContent = 'Success';
      editorStatus.className = 'status-indicator success';
      
      // Enable Upload if port is selected or can be selected
      document.getElementById('uploadBtn').disabled = false;
      endProgress(true);
    } else {
      compiledHex = null;
      document.getElementById('uploadBtn').disabled = true;
      logToConsole('Compilation FAILED!', 'error');
      
      // Print compile errors
      const lines = result.error.split('\n');
      lines.forEach(line => {
        if (line.trim() && !line.includes('Downloading index') && !line.includes('Error initializing')) {
          logToConsole(line, 'error');
        }
      });
      
      editorStatus.textContent = 'Error';
      editorStatus.className = 'status-indicator error';
      endProgress(false);
    }
  } catch (err) {
    compiledHex = null;
    document.getElementById('uploadBtn').disabled = true;
    logToConsole(`Error contacting compiler server: ${err.message}`, 'error');
    editorStatus.textContent = 'Failed';
    editorStatus.className = 'status-indicator error';
    endProgress(false);
  } finally {
    verifyBtn.disabled = false;
  }
}

// -------------------------------------------------------------
// Web Serial & Board Handling
// -------------------------------------------------------------
async function handlePortSelection() {
  if (!('serial' in navigator)) {
    alert('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
    return;
  }

  // If already connected, disconnect
  if (activePort) {
    await disconnectPort();
    return;
  }

  try {
    // Request a port from user
    activePort = await navigator.serial.requestPort();
    
    // Listen for disconnects
    navigator.serial.addEventListener('disconnect', (event) => {
      if (event.port === activePort) {
        logToConsole("Board physically disconnected.", "warning");
        disconnectPort();
      }
    });

    logToConsole("Board selected and ready.", "success");
    document.getElementById('portStatusText').textContent = "Disconnect Board";
    document.getElementById('portStatusText').parentElement.classList.remove('btn-secondary');
    document.getElementById('portStatusText').parentElement.classList.add('btn-success');
    document.getElementById('footerConnectionText').textContent = "Connected: Arduino Uno";
    
    // Switch to Serial Monitor Tab and automatically open the stream
    const serialTabBtn = document.querySelector('.tab-btn[data-tab="serial"]');
    if (serialTabBtn) serialTabBtn.click();
    if (!isSerialMonitorOpen) {
      await toggleSerialMonitor();
    }
    
  } catch (err) {
    console.error("Error selecting port:", err);
    logToConsole(`Error selecting port: ${err.message}`, 'error');
    activePort = null;
  }
}

async function disconnectPort() {
  // If serial monitor is reading, stop it first
  if (isSerialMonitorOpen) {
    await stopSerialMonitorReading();
  }

  if (activePort) {
    activePort = null;
  }

  logToConsole("Board disconnected.", "info");
  document.getElementById('portStatusText').textContent = "Connect Board";
  document.getElementById('portStatusText').parentElement.classList.remove('btn-success');
  document.getElementById('portStatusText').parentElement.classList.add('btn-secondary');
  document.getElementById('footerConnectionText').textContent = "Discovered: No device selected";
  
  // Disable serial interaction
  disableSerialInput(true);
  isSerialMonitorOpen = false;
  const serialBtn = document.getElementById('serialToggleBtn');
  serialBtn.classList.remove('btn-success');
  serialBtn.classList.add('btn-accent');
  serialBtn.querySelector('span').textContent = 'Serial Monitor';
}

// -------------------------------------------------------------
// Serial Monitor Logic
// -------------------------------------------------------------
async function toggleSerialMonitor() {
  if (!activePort) {
    logToConsole("Please select and connect a board first.", "warning");
    alert("Please click 'Connect Board' and choose your Arduino USB Serial Port first.");
    return;
  }

  const serialBtn = document.getElementById('serialToggleBtn');

  if (isSerialMonitorOpen) {
    // Close serial monitor
    await stopSerialMonitorReading();
    serialBtn.classList.remove('btn-success');
    serialBtn.classList.add('btn-accent');
    serialBtn.querySelector('span').textContent = 'Open Serial Monitor';
    logToSerial("--- Serial Monitor Closed ---", "system");
  } else {
    // Open serial monitor
    try {
      const baudRate = parseInt(document.getElementById('baudRateSelect').value);
      logToConsole(`Opening Serial Monitor at ${baudRate} baud...`, "info");
      logToSerial(`--- Serial Monitor Opened (${baudRate} Baud) ---`, "system");

      // Open port (if not already open)
      // Note: activePort might already be open or closed. If it throws, it might be open already.
      try {
        await activePort.open({ baudRate });
      } catch (err) {
        // Port might be open already, or permission error
        if (!err.message.includes("already open")) {
          throw err;
        }
      }

      isSerialMonitorOpen = true;
      serialBtn.classList.remove('btn-accent');
      serialBtn.classList.add('btn-success');
      serialBtn.querySelector('span').textContent = 'Close Serial Monitor';
      
      // Enable text input sending
      disableSerialInput(false);

      // Start asynchronous reading loop
      startSerialMonitorReading();
    } catch (err) {
      logToConsole(`Failed to open serial monitor: ${err.message}`, "error");
      logToSerial(`Connection Failed: ${err.message}`, "error");
    }
  }
}

function disableSerialInput(disabled) {
  document.getElementById('serialInput').disabled = disabled;
  document.getElementById('sendSerialBtn').disabled = disabled;
}

// Read loop for Serial Monitor
async function startSerialMonitorReading() {
  serialReaderActive = true;
  let textDecoder = new TextDecoder();
  
  try {
    while (serialReaderActive && activePort && activePort.readable) {
      serialReader = activePort.readable.getReader();
      
      try {
        while (true) {
          const { value, done } = await serialReader.read();
          if (done) break;
          
          if (value) {
            const text = textDecoder.decode(value);
            // Handle outputting character/line values
            logToSerial(text, 'rx');
          }
        }
      } catch (err) {
        console.error("Serial read error:", err);
      } finally {
        serialReader.releaseLock();
        serialReader = null;
      }
    }
  } catch (err) {
    console.error("Serial reader root error:", err);
  }
}

async function stopSerialMonitorReading() {
  serialReaderActive = false;
  disableSerialInput(true);
  
  if (serialReader) {
    try {
      await serialReader.cancel();
    } catch (e) {
      console.warn("Error cancelling reader:", e);
    }
  }
  
  // Wait a small delay and close the physical port to release resource
  await new Promise(r => setTimeout(r, 200));
  if (activePort) {
    try {
      await activePort.close();
    } catch (e) {
      console.warn("Error closing port:", e);
    }
  }
  isSerialMonitorOpen = false;
}

// Send user data from input bar to board
async function sendSerialData() {
  if (!activePort || !activePort.writable || !isSerialMonitorOpen) return;
  
  const inputEl = document.getElementById('serialInput');
  let text = inputEl.value;
  if (!text) return;

  const lineEnding = document.getElementById('lineEndingSelect').value;
  if (lineEnding === 'nl') text += '\n';
  else if (lineEnding === 'cr') text += '\r';
  else if (lineEnding === 'nlcr') text += '\r\n';

  try {
    const encoder = new TextEncoder();
    const writer = activePort.writable.getWriter();
    await writer.write(encoder.encode(text));
    writer.releaseLock();
    
    // Log TX (transmitted data) to monitor
    logToSerial(inputEl.value, 'tx');
    inputEl.value = '';
  } catch (err) {
    logToSerial(`Send failed: ${err.message}`, 'error');
  }
}

// -------------------------------------------------------------
// STK500v1 Flasher (Optiboot Upload Protocol)
// -------------------------------------------------------------
async function handleUpload() {
  if (!activePort) {
    alert("Please select and connect a board first.");
    return;
  }
  if (!compiledHex) {
    alert("Please verify/compile your sketch successfully before uploading.");
    return;
  }

  const uploadBtn = document.getElementById('uploadBtn');
  const verifyBtn = document.getElementById('verifyBtn');
  const serialBtn = document.getElementById('serialToggleBtn');

  const editorStatus = document.getElementById('editorStatus');
  const progressBarContainer = document.getElementById('compileProgressBarContainer');
  const progressBar = document.getElementById('compileProgressBar');
  const progressText = document.getElementById('compileProgressText');
  const uploadIcon = uploadBtn.querySelector('i');
  const uploadText = uploadBtn.querySelector('span');

  const originalBtnHTML = uploadBtn.innerHTML;

  // Change state
  uploadBtn.disabled = true;
  verifyBtn.disabled = true;
  serialBtn.disabled = true;

  // Setup Progress Helper
  function updateProgress(percent, statusText) {
    const pct = Math.min(100, Math.max(0, Math.round(percent)));
    progressBar.style.width = `${pct}%`;
    progressText.textContent = `${pct}%`;
    uploadBtn.style.setProperty('--upload-progress', `${pct}%`);
    if (uploadText) {
      uploadText.textContent = `${statusText} (${pct}%)`;
    }
  }

  // Set initial loading states
  uploadBtn.classList.add('btn-loading');
  uploadBtn.style.setProperty('--upload-progress', '0%');
  if (uploadIcon) {
    uploadIcon.classList.add('spin');
  }
  if (uploadText) {
    uploadText.textContent = 'Connecting...';
  }

  editorStatus.textContent = 'Uploading';
  editorStatus.className = 'status-indicator running';
  progressBarContainer.style.display = 'block';
  progressBar.style.width = '0%';
  progressBar.style.background = 'var(--color-purple)';
  progressText.style.display = 'inline-block';
  progressText.textContent = '0%';
  progressText.style.color = 'var(--color-purple)';
  progressText.style.background = 'hsla(271, 66%, 50%, 0.1)';
  progressText.style.borderColor = 'hsla(271, 66%, 50%, 0.2)';

  // Switch console tab to display compile logs & upload details
  const consoleTabBtn = document.querySelector('.tab-btn[data-tab="console"]');
  if (consoleTabBtn) consoleTabBtn.click();

  logToConsole("Initiating direct Web Serial upload...", "info");
  updateProgress(5, 'Connecting');

  // Store whether we need to restore serial monitor after flashing
  const wasMonitorOpen = isSerialMonitorOpen;
  if (isSerialMonitorOpen) {
    logToConsole("Closing active serial monitor to access port...", "info");
    await stopSerialMonitorReading();
    serialBtn.classList.remove('btn-success');
    serialBtn.classList.add('btn-accent');
    serialBtn.querySelector('span').textContent = 'Serial Monitor';
  }

  // Parse HEX file into 128-byte pages
  let pages = [];
  try {
    pages = parseHexToPages(compiledHex);
    logToConsole(`Parsed HEX successfully. Total program size: ${pages.length * 128} bytes (${pages.length} flash pages).`, "info");
  } catch (err) {
    logToConsole(`HEX Parse Error: ${err.message}`, "error");
    
    // Restore UI states on error
    uploadBtn.disabled = false;
    verifyBtn.disabled = false;
    serialBtn.disabled = false;
    uploadBtn.classList.remove('btn-loading');
    if (uploadIcon) uploadIcon.classList.remove('spin');
    uploadBtn.innerHTML = originalBtnHTML;
    
    editorStatus.textContent = 'Error';
    editorStatus.className = 'status-indicator error';
    progressBar.style.background = 'var(--color-danger)';
    progressText.style.color = 'var(--color-danger)';
    progressText.style.background = 'hsla(354, 70%, 48%, 0.1)';
    progressText.style.borderColor = 'hsla(354, 70%, 48%, 0.2)';
    setTimeout(() => {
      progressBarContainer.style.display = 'none';
      progressText.style.display = 'none';
    }, 1500);
    return;
  }

  let uploadSuccess = false;

  try {
    // 1. Open serial port at 115200 baud (Optiboot default speed)
    logToConsole("Opening serial connection at 115200 baud...", "info");
    updateProgress(10, 'Opening Port');
    await activePort.open({ baudRate: 115200 });

    // Start background reader loop for buffer collection
    startUploadReadLoop(activePort);

    // 2. Perform Arduino Uno Hardware DTR Reset to trigger Optiboot bootloader
    logToConsole("Resetting Arduino Uno...", "info");
    updateProgress(15, 'Resetting');
    await activePort.setSignals({ dataTerminalReady: true, requestToSend: true });
    await new Promise(r => setTimeout(r, 250)); // DTR low reset pulse
    await activePort.setSignals({ dataTerminalReady: false, requestToSend: false });
    await new Promise(r => setTimeout(r, 200)); // Wait for bootloader to stabilize

    // 3. Sync with bootloader (STK_GET_SYNC)
    updateProgress(20, 'Syncing');
    const writer = activePort.writable.getWriter();
    
    try {
      await getSync(writer);
      
      // 4. Enter Programming Mode
      logToConsole("Entering programming mode...", "info");
      updateProgress(25, 'Entering Prog');
      await sendStkCommand(writer, [0x50, 0x20]); // STK_ENTER_PROGMODE, STK_CRC_EOP
      
      // 5. Flash pages
      logToConsole("Writing flash memory...", "info");
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        
        // Show progress percentage
        const flashProgress = Math.round(((i + 1) / pages.length) * 70); // 0 to 70
        const progress = 25 + flashProgress; // 25% to 95%
        logToConsole(`Flashing page ${i+1}/${pages.length} (${Math.round(((i + 1) / pages.length) * 100)}%) at address 0x${page.address.toString(16).toUpperCase()}...`, "info");
        
        updateProgress(progress, 'Flashing');
        
        // Load Address (divided by 2 because AVR address is Word-based)
        const wordAddr = page.address / 2;
        const addrLow = wordAddr & 0xFF;
        const addrHigh = (wordAddr >> 8) & 0xFF;
        
        await sendStkCommand(writer, [0x55, addrLow, addrHigh, 0x20]); // STK_LOAD_ADDRESS, low, high, STK_CRC_EOP
        
        // Program page (128 bytes)
        // Command layout: STK_PROG_PAGE (0x64), size_high (0x00), size_low (0x80), memType ('F' = 0x46), ...data..., STK_CRC_EOP (0x20)
        const progCmd = [0x64, 0x00, 0x80, 0x46, ...page.data, 0x20];
        await sendStkCommand(writer, progCmd);
      }

      // 6. Leave Programming Mode
      logToConsole("Leaving programming mode...", "info");
      updateProgress(98, 'Finishing');
      await sendStkCommand(writer, [0x51, 0x20]); // STK_LEAVE_PROGMODE, STK_CRC_EOP

      logToConsole("Upload completed successfully! Your program is running.", "success");
      uploadSuccess = true;
      updateProgress(100, 'Success');

    } finally {
      writer.releaseLock();
    }

  } catch (err) {
    console.error("Upload process error:", err);
    logToConsole(`Upload FAILED: ${err.message}`, "error");
    alert(`Upload failed: ${err.message}`);
  } finally {
    // Stop uploader reading loops
    await stopUploadReadLoop();
    
    // Wait a brief moment to ensure port release
    await new Promise(r => setTimeout(r, 150));
    
    // Close port
    try {
      await activePort.close();
    } catch (e) {
      console.warn("Error closing port post-upload:", e);
    }

    // Restore UI states
    uploadBtn.classList.remove('btn-loading');
    if (uploadIcon) {
      uploadIcon.classList.remove('spin');
    }
    uploadBtn.innerHTML = originalBtnHTML;
    
    uploadBtn.disabled = false;
    verifyBtn.disabled = false;
    serialBtn.disabled = false;

    // Reset progress bar on editor panel header
    if (uploadSuccess) {
      progressBar.style.background = 'var(--color-success)';
      progressText.style.color = 'var(--color-success)';
      progressText.style.background = 'hsla(142, 60%, 40%, 0.1)';
      progressText.style.borderColor = 'hsla(142, 60%, 40%, 0.2)';
      editorStatus.textContent = 'Success';
      editorStatus.className = 'status-indicator success';
    } else {
      progressBar.style.background = 'var(--color-danger)';
      progressText.style.color = 'var(--color-danger)';
      progressText.style.background = 'hsla(354, 70%, 48%, 0.1)';
      progressText.style.borderColor = 'hsla(354, 70%, 48%, 0.2)';
      editorStatus.textContent = 'Error';
      editorStatus.className = 'status-indicator error';
    }

    setTimeout(() => {
      progressBarContainer.style.display = 'none';
      progressText.style.display = 'none';
    }, 1500);

    // Restore Serial Monitor if it was open before upload
    if (wasMonitorOpen) {
      logToConsole("Restoring serial monitor connection...", "info");
      // Wait slightly and reopen
      setTimeout(() => {
        toggleSerialMonitor();
      }, 500);
    }
  }
}


// -------------------------------------------------------------
// STK500 Protocol Low-Level Helpers
// -------------------------------------------------------------

function startUploadReadLoop(port) {
  serialReadBuffer = [];
  serialReaderActive = true;
  
  async function run() {
    try {
      currentReader = port.readable.getReader();
      while (serialReaderActive) {
        const { value, done } = await currentReader.read();
        if (done) break;
        if (value) {
          for (let b of value) {
            serialReadBuffer.push(b);
          }
        }
      }
    } catch (err) {
      console.warn("Upload read loop ended with error:", err);
    } finally {
      if (currentReader) {
        currentReader.releaseLock();
        currentReader = null;
      }
    }
  }
  
  run();
}

async function stopUploadReadLoop() {
  serialReaderActive = false;
  if (currentReader) {
    try {
      await currentReader.cancel();
    } catch (e) {
      console.warn("Error cancelling upload reader:", e);
    }
  }
  // Wait for the async run() loop finally block to set currentReader to null
  let attempts = 0;
  while (currentReader && attempts < 50) {
    await new Promise(r => setTimeout(r, 10));
    attempts++;
  }
}

async function waitForBytes(count, timeoutMs = 1000) {
  const start = Date.now();
  while (serialReadBuffer.length < count) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Response timeout. Bootloader did not answer in time.`);
    }
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  return serialReadBuffer.splice(0, count);
}

async function getSync(writer) {
  // Try to sync multiple times (the Arduino bootloader might take a moment to reset and respond)
  const maxAttempts = 15;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      serialReadBuffer = []; // clear buffer
      await writer.write(new Uint8Array([0x30, 0x20])); // STK_GET_SYNC, STK_CRC_EOP
      
      const resp = await waitForBytes(2, 150); // Small wait window for bootloader
      if (resp[0] === 0x14 && resp[1] === 0x10) { // STK_INSYNC (0x14), STK_OK (0x10)
        return true;
      }
    } catch (e) {
      // Timeout, retry
    }
    await new Promise(r => setTimeout(r, 40));
  }
  throw new Error("Cannot sync with bootloader. Ensure FQBN is arduino:avr:uno and correct port is selected.");
}

async function sendStkCommand(writer, cmdBytes, timeout = 1000) {
  serialReadBuffer = []; // Clear buffer
  await writer.write(new Uint8Array(cmdBytes));
  
  const resp = await waitForBytes(2, timeout);
  if (resp[0] !== 0x14 || resp[1] !== 0x10) {
    throw new Error(`Command 0x${cmdBytes[0].toString(16)} failed. InSync: 0x${resp[0].toString(16)}, Status: 0x${resp[1].toString(16)}`);
  }
  return true;
}

// -------------------------------------------------------------
// Intel HEX Parser to 128-byte pages
// -------------------------------------------------------------
function parseHexToPages(hexString) {
  const lines = hexString.split('\n');
  const flash = new Uint8Array(32768); // Uno ATmega328P Flash Size
  flash.fill(0xFF);
  
  let maxAddr = 0;
  let minAddr = Infinity;
  let hasData = false;

  for (let line of lines) {
    line = line.trim();
    if (!line.startsWith(':')) continue;
    
    const byteCount = parseInt(line.substr(1, 2), 16);
    const address = parseInt(line.substr(3, 4), 16);
    const recordType = parseInt(line.substr(7, 2), 16);
    
    if (recordType === 0) { // Data record
      hasData = true;
      for (let i = 0; i < byteCount; i++) {
        const val = parseInt(line.substr(9 + i * 2, 2), 16);
        const targetAddr = address + i;
        
        if (targetAddr < flash.length) {
          flash[targetAddr] = val;
          if (targetAddr < minAddr) minAddr = targetAddr;
          if (targetAddr > maxAddr) maxAddr = targetAddr;
        }
      }
    } else if (recordType === 1) { // End of file record
      break;
    }
  }

  if (!hasData) {
    throw new Error("No flash data records found in HEX file.");
  }

  const pageSize = 128; // ATmega328P Flash Page size
  const pages = [];
  const startPage = Math.floor(minAddr / pageSize);
  const endPage = Math.floor(maxAddr / pageSize);

  for (let p = startPage; p <= endPage; p++) {
    const pageAddr = p * pageSize;
    const pageData = flash.subarray(pageAddr, pageAddr + pageSize);
    pages.push({
      index: p,
      address: pageAddr,
      data: pageData
    });
  }

  return pages;
}
