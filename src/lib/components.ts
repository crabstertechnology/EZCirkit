export interface ComponentItem {
  id: string;
  name: string;
  quantity: number;
  iconName: 'hash' | 'grid' | 'cable' | 'thermometer' | 'droplet' | 'cpu' | 'toggle' | 'volume' | 'git' | 'power' | 'lightbulb' | 'arrow' | 'menu' | 'split' | 'waves' | 'gauge' | 'wind';
  description: string;
  specifications: string[];
  sampleCode?: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  colIndex: number;
  rowIndex: number;
  price: number;
}

export const COMPONENTS_DATA: ComponentItem[] = [
  // Column 1 (Leftmost)
  {
    id: 'comp-7seg',
    name: '7-Segment Display',
    quantity: 1,
    iconName: 'hash',
    description: 'A 1-digit, 10-pin red LED display used to show numeric digits from 0 to 9. Ideal for counters, digital scoreboards, and numerical feedback.',
    specifications: ['Common Cathode configuration', 'Operating Voltage: 2.0V - 3.3V', 'Digit Height: 0.56 inches', '10-pin package'],
    sampleCode: `// Display digit '1' on 7-Segment Display
int segB = 3;
int segC = 4;

void setup() {
  pinMode(segB, OUTPUT);
  pinMode(segC, OUTPUT);
}

void loop() {
  digitalWrite(segB, HIGH); // Turn segment B on
  digitalWrite(segC, HIGH); // Turn segment C on
}`,
    difficulty: 'Beginner',
    colIndex: 0,
    rowIndex: 0,
    price: 49
  },
  {
    id: 'comp-breadboard',
    name: 'Solderless Breadboard',
    quantity: 1,
    iconName: 'grid',
    description: 'A premium 830 tie-point breadboard with color-coded power rails. Used to temporarily prototype and construct electrical connections without soldering.',
    specifications: ['830 total connection points', 'Fits standard 2.54mm pin pitch', 'Internal steel spring clips', 'Double-sided tape backing included'],
    difficulty: 'Beginner',
    colIndex: 0,
    rowIndex: 1,
    price: 149
  },
  {
    id: 'comp-usb',
    name: 'USB Programming Cable',
    quantity: 1,
    iconName: 'cable',
    description: 'A robust blue USB Type A-to-B cable to connect your Arduino Uno R3 board to a computer for code uploading, power, and serial monitoring.',
    specifications: ['Length: 50cm', 'Interface: USB Type A to Type B', 'Premium high-density shielding', 'Active power and data delivery'],
    difficulty: 'Beginner',
    colIndex: 0,
    rowIndex: 2,
    price: 79
  },

  // Column 2
  {
    id: 'comp-dht11',
    name: 'DHT11 Temp & Humidity Sensor',
    quantity: 1,
    iconName: 'thermometer',
    description: 'A composite digital temperature and relative humidity sensor. Outputs pre-calibrated digital signals, making it extremely reliable and easy to wire.',
    specifications: ['Temperature Range: 0°C to 50°C (±2°C)', 'Humidity Range: 20-90% RH (±5%)', 'Sampling Rate: 1 Hz (once per second)', 'Operating Voltage: 3V - 5.5V'],
    sampleCode: `#include <DHT.h>
#define DHTPIN 2
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  Serial.print("Humidity: "); Serial.print(h); Serial.print("% ");
  Serial.print("Temp: "); Serial.print(t); Serial.println("C");
  delay(2000);
}`,
    difficulty: 'Intermediate',
    colIndex: 1,
    rowIndex: 0,
    price: 129
  },
  {
    id: 'comp-soil',
    name: 'Soil Moisture Sensor v2.0',
    quantity: 1,
    iconName: 'droplet',
    description: 'A capacitive soil moisture sensor module designed to measure water content in soil. Being capacitive, it is highly resistant to probe corrosion over time.',
    specifications: ['Capacitive sensing technology', 'Corrosion-resistant coating', 'Operating Voltage: 3.3V - 5.5V DC', 'Analog voltage output: 1.2V - 3.0V'],
    sampleCode: `const int sensorPin = A0;

void setup() {
  Serial.begin(9600);
}

void loop() {
  int value = analogRead(sensorPin);
  Serial.print("Soil Moisture (Analog): ");
  Serial.println(value);
  delay(500);
}`,
    difficulty: 'Intermediate',
    colIndex: 1,
    rowIndex: 1,
    price: 149
  },
  {
    id: 'comp-arduino',
    name: 'Arduino Uno R3 Compatible',
    quantity: 1,
    iconName: 'cpu',
    description: 'The open-source brain of the entire kit. Built on the ATmega328P microcontroller, it has everything needed to program and control your electronic circuits.',
    specifications: ['Microcontroller: ATmega328P', 'Digital I/O Pins: 14 (6 support PWM)', 'Analog Input Pins: 6', 'Flash Memory: 32 KB', 'Clock Speed: 16 MHz'],
    sampleCode: `void setup() {
  pinMode(LED_BUILTIN, OUTPUT); // Built-in LED on pin 13
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}`,
    difficulty: 'Beginner',
    colIndex: 1,
    rowIndex: 2,
    price: 499
  },

  // Column 3
  {
    id: 'comp-tactile',
    name: 'Tactile Push Buttons',
    quantity: 2,
    iconName: 'toggle',
    description: 'Momentary push button switches. They temporarily bridge the electric flow when pressed, serving as standard digital triggers for your code.',
    specifications: ['Momentary contact mechanism', 'Body Size: 6x6mm', '4-pin breadboard-friendly design', 'Reliable copper contacts'],
    sampleCode: `const int buttonPin = 2;

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  Serial.begin(9600);
}

void loop() {
  if (digitalRead(buttonPin) == LOW) {
    Serial.println("Button Pressed!");
    delay(250); // Debounce delay
  }
}`,
    difficulty: 'Beginner',
    colIndex: 2,
    rowIndex: 0,
    price: 19
  },
  {
    id: 'comp-buzzer',
    name: 'Active Piezo Buzzer',
    quantity: 1,
    iconName: 'volume',
    description: 'A small active buzzer module that generates an audible, single-frequency alarm tone when supplied with direct current.',
    specifications: ['Operating Voltage: 3.5V - 5V DC', 'Resonant Frequency: 2300Hz ±300Hz', 'Current consumption: < 25mA', 'Internal oscillator included'],
    sampleCode: `const int buzzerPin = 8;

void setup() {
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  digitalWrite(buzzerPin, HIGH); // Turn buzzer ON
  delay(500);
  digitalWrite(buzzerPin, LOW);  // Turn buzzer OFF
  delay(500);
}`,
    difficulty: 'Beginner',
    colIndex: 2,
    rowIndex: 1,
    price: 29
  },
  {
    id: 'comp-relay',
    name: '1-Channel Relay Module',
    quantity: 1,
    iconName: 'git',
    description: 'A 5V electromagnetic relay module that enables low-voltage microcontrollers like the Arduino to switch high-power circuits (such as home appliances or water pumps).',
    specifications: ['Control Voltage: 5V DC', 'AC Load Capability: 10A @ 250V AC', 'DC Load Capability: 10A @ 30V DC', 'Onboard indicator LEDs', 'Optoisolated safety boundary'],
    sampleCode: `const int relayPin = 7;

void setup() {
  pinMode(relayPin, OUTPUT);
}

void loop() {
  digitalWrite(relayPin, HIGH); // Trigger relay close
  delay(3000);
  digitalWrite(relayPin, LOW);  // Open relay contact
  delay(3000);
}`,
    difficulty: 'Advanced',
    colIndex: 2,
    rowIndex: 2,
    price: 99
  },
  {
    id: 'comp-lm35',
    name: 'LM35 Temperature Sensor',
    quantity: 1,
    iconName: 'thermometer',
    description: 'A precision analog temperature sensor whose output voltage is linearly proportional to the Celsius temperature. Requires no calibration.',
    specifications: ['Scale Factor: 10.0 mV/°C', 'Temperature Range: -55°C to +150°C', 'Accuracy: ±0.5°C guaranteed at 25°C', 'Operating Voltage: 4V to 30V'],
    sampleCode: `const int tempPin = A1;

void setup() {
  Serial.begin(9600);
}

void loop() {
  int value = analogRead(tempPin);
  float mv = (value / 1024.0) * 5000.0;
  float celsius = mv / 10.0;
  Serial.print("Temperature: "); Serial.print(celsius); Serial.println("C");
  delay(1000);
}`,
    difficulty: 'Intermediate',
    colIndex: 2,
    rowIndex: 3,
    price: 79
  },
  {
    id: 'comp-tactswitch',
    name: 'Tact Switch with Cap',
    quantity: 1,
    iconName: 'power',
    description: 'A larger 12x12mm tactile button complete with a comfortable bright red cap. Great for resetting devices, main power toggles, or key menu actions.',
    specifications: ['Button Body Size: 12x12mm', 'Cap Color: Red', 'Durable mechanical lifecycle', 'Sits securely in breadboard ties'],
    difficulty: 'Beginner',
    colIndex: 2,
    rowIndex: 4,
    price: 29
  },

  // Column 4
  {
    id: 'comp-leds',
    name: 'Vibrant LEDs Pack',
    quantity: 5,
    iconName: 'lightbulb',
    description: 'A colored selection of 5mm LEDs. Includes Red, Blue, Yellow, Green, and White. Perfect for status lights, displays, and logic indicators.',
    specifications: ['Standard 5mm package', 'Colors: Red, Blue, Yellow, Green, White', 'Operating Current: 15-20 mA', 'Forward Voltage: 1.8V to 3.2V'],
    sampleCode: `int ledPin = 9;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  digitalWrite(ledPin, HIGH); // Turn LED on
  delay(500);
  digitalWrite(ledPin, LOW);  // Turn LED off
  delay(500);
}`,
    difficulty: 'Beginner',
    colIndex: 3,
    rowIndex: 0,
    price: 49
  },
  {
    id: 'comp-diodes',
    name: 'Rectifier Diodes',
    quantity: 5,
    iconName: 'arrow',
    description: 'General-purpose 1N4007 rectifier diodes that allow current to flow in only one direction. Prevents back-EMF damage when switching motors or coils.',
    specifications: ['Model: 1N4007', 'Max Forward Current: 1.0 Amp', 'Peak Reverse Voltage: 1000 Volts', 'DO-41 axial package'],
    difficulty: 'Advanced',
    colIndex: 3,
    rowIndex: 1,
    price: 29
  },
  {
    id: 'comp-resistors',
    name: 'Resistors Pack',
    quantity: 15,
    iconName: 'menu',
    description: 'Axial lead resistors of different values (including 220Ω, 1kΩ, and 10kΩ). Used to limit electrical current to protect LEDs and set up voltage divisors.',
    specifications: ['Values: 220 Ohm, 1k Ohm, 10k Ohm', 'Tolerance: ±5%', 'Power rating: 0.25 Watt (1/4 W)', 'Carbon film type'],
    difficulty: 'Beginner',
    colIndex: 3,
    rowIndex: 2,
    price: 39
  },

  // Column 5
  {
    id: 'comp-jumpers',
    name: 'Jumper Wires (M-F)',
    quantity: 20,
    iconName: 'split',
    description: 'Male-to-female colorful prototyping wires. Ideal for connecting components on the breadboard straight to the female pin headers of the Arduino.',
    specifications: ['Type: Male to Female', 'Length: 20cm', 'Flexible multi-color jackets', 'Compatible with 2.54mm headers'],
    difficulty: 'Beginner',
    colIndex: 4,
    rowIndex: 0,
    price: 99
  },
  {
    id: 'comp-leads',
    name: 'Multimeter Test Leads',
    quantity: 1,
    iconName: 'waves',
    description: 'Heavy-duty insulated probe leads (Red & Black) with standard banana plug jacks. Used with your digital multimeter to safely probe active circuit points.',
    specifications: ['Rating: CAT II 1000V / 10A max', 'Wire length: 80cm', 'Standard 4mm banana inputs', 'Flexible PVC insulation'],
    difficulty: 'Intermediate',
    colIndex: 4,
    rowIndex: 1,
    price: 99
  },

  // Column 6 (Rightmost)
  {
    id: 'comp-multimeter',
    name: 'Digital Multimeter',
    quantity: 1,
    iconName: 'gauge',
    description: 'A versatile DT-830D digital multimeter with a built-in LCD screen. Measures voltage, current, resistance, transistor gain, and continuity.',
    specifications: ['Model: DT-830D', 'Display: 3.5 digit LCD screen', 'Continuity buzzer built-in', 'Overload protection on all ranges', 'Includes 9V battery inside'],
    difficulty: 'Intermediate',
    colIndex: 5,
    rowIndex: 0,
    price: 399
  },
  {
    id: 'comp-pump',
    name: 'DC Submersible Water Pump',
    quantity: 1,
    iconName: 'wind',
    description: 'A micro DC submersible water pump. Perfect for developing plant irrigation automated systems, fountains, or liquid transfer experiments.',
    specifications: ['Operating Voltage: 3V - 6V DC', 'Flow Rate: 80 - 120 Liters/Hour', 'Pumping Head: 40 - 110 cm', 'Outlet Outer Diameter: 7.5 mm'],
    sampleCode: `const int pumpPin = 6; // Connected to Relay or MOSFET gate

void setup() {
  pinMode(pumpPin, OUTPUT);
}

void loop() {
  digitalWrite(pumpPin, HIGH); // Turn water pump ON
  delay(3000);                 // Pump water for 3 seconds
  digitalWrite(pumpPin, LOW);  // Turn pump OFF
  delay(10000);                // Wait 10 seconds before restarting
}`,
    difficulty: 'Advanced',
    colIndex: 5,
    rowIndex: 1,
    price: 249
  }
];
