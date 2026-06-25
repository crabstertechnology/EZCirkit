export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  components: string[];
  image: string;
  wiringInstructions: string[];
}

export const PROJECTS_DATA: ProjectItem[] = [
  {
    id: 'plant-watering',
    title: 'Smart Plant Watering System',
    description: 'Auto-water your plants based on soil moisture levels. Measures water saturation and triggers the submersible pump via a relay when the soil becomes dry.',
    difficulty: 'Beginner',
    duration: '1 hour',
    components: [
      'Arduino Uno R3 Compatible',
      'Soil Moisture Sensor v2.0',
      '1-Channel Relay Module',
      'DC Submersible Water Pump',
      'Jumper Wires (M-F)'
    ],
    image: '/2.jpg',
    wiringInstructions: [
      'Connect Soil Moisture Sensor VCC to Arduino 5V and GND to Arduino GND.',
      'Connect Soil Moisture Sensor Analog Out to Arduino A0 pin.',
      'Connect Relay Module VCC to Arduino 5V and GND to Arduino GND.',
      'Connect Relay Module IN pin to Arduino digital pin D7.',
      'Connect DC Submersible Water Pump positive lead to Relay NO (Normally Open) contact, and negative lead to the external battery power source GND.',
      'Connect the battery positive terminal to the Relay COM (Common) contact.'
    ]
  },
  {
    id: 'temp-monitor',
    title: 'Temperature Monitoring System',
    description: 'Read and display live temperature & humidity measurements on the serial monitor. Uses the DHT11 sensor to track room conditions in real time.',
    difficulty: 'Beginner',
    duration: '45 mins',
    components: [
      'Arduino Uno R3 Compatible',
      'DHT11 Temp & Humidity Sensor',
      'Jumper Wires (M-F)'
    ],
    image: '/2.jpg',
    wiringInstructions: [
      'Connect DHT11 Sensor VCC pin to Arduino 5V.',
      'Connect DHT11 Sensor GND pin to Arduino GND.',
      'Connect DHT11 Sensor DATA pin to Arduino digital pin D2.',
      'Open the Arduino IDE serial monitor at 9600 baud rate to read the live logging data.'
    ]
  },
  {
    id: 'oled-weather',
    title: 'OLED Weather Display',
    description: 'Show live temperature & humidity readings on a crisp 0.96" OLED screen. Reads digital sensor streams and formats them into a neat screen interface.',
    difficulty: 'Intermediate',
    duration: '2 hours',
    components: [
      'Arduino Uno R3 Compatible',
      'DHT11 Temp & Humidity Sensor',
      '0.96" OLED Display',
      'Jumper Wires (M-F)',
      'Solderless Breadboard'
    ],
    image: '/2.jpg',
    wiringInstructions: [
      'Connect OLED VCC to 5V and GND to GND on the breadboard rail.',
      'Connect OLED SCL pin to Arduino A5 (SCL) and SDA pin to Arduino A4 (SDA).',
      'Connect DHT11 VCC to 5V, GND to GND, and DATA pin to Arduino digital pin D2.',
      'Initialize U8g2 or Adafruit SSD1306 library in your sketch to draw text on the OLED screen.'
    ]
  },
  {
    id: 'touch-light',
    title: 'Touch Controlled Light',
    description: 'Make a futuristic touch-controlled lamp using the TTP223 capacitive touch module. Tap to toggle the light state on or off instantly.',
    difficulty: 'Beginner',
    duration: '40 mins',
    components: [
      'Arduino Uno R3 Compatible',
      'TTP223 Touch Module',
      'Vibrant LEDs Pack',
      'Resistors Pack',
      'Solderless Breadboard'
    ],
    image: '/2.jpg',
    wiringInstructions: [
      'Connect TTP223 Touch Module VCC to 5V and GND to GND.',
      'Connect TTP223 Touch Module OUT pin to Arduino digital pin D3.',
      'Insert a Red LED on the breadboard. Connect its anode (long leg) to Arduino digital pin D9 through a 220Ω resistor.',
      'Connect the LED cathode (short leg) to Arduino GND.',
      'Configure pin D3 as INPUT and pin D9 as OUTPUT in setup, then read state to toggle LED.'
    ]
  },
  {
    id: 'soil-alarm',
    title: 'Soil Moisture Alarm',
    description: 'Sounds an audible warning buzzer when the plant soil gets too dry, with an integrated push button to mute/snooze the alarm.',
    difficulty: 'Intermediate',
    duration: '50 mins',
    components: [
      'Arduino Uno R3 Compatible',
      'Soil Moisture Sensor v2.0',
      'Active Piezo Buzzer',
      'Tactile Push Buttons',
      'Resistors Pack'
    ],
    image: '/2.jpg',
    wiringInstructions: [
      'Connect Soil Moisture Sensor VCC to 5V, GND to GND, and Analog Out to A0.',
      'Connect Active Piezo Buzzer positive (+) pin to digital pin D8 and negative (-) pin to GND.',
      'Insert a tactile push button on the breadboard. Connect one side to D2 and the other side to GND.',
      'Write logic to read the A0 moisture value. If it is below a threshold, set D8 HIGH to sound the buzzer unless the button is pressed to set a snooze timer.'
    ]
  },
  {
    id: 'digital-counter',
    title: '7-Segment Digital Counter',
    description: 'A manual click counter that displays digits from 0 to 9 on a 7-segment red screen. Increments with each press of a button.',
    difficulty: 'Beginner',
    duration: '1 hour',
    components: [
      'Arduino Uno R3 Compatible',
      '7-Segment Display',
      'Tact Switch with Cap',
      'Resistors Pack',
      'Solderless Breadboard'
    ],
    image: '/2.jpg',
    wiringInstructions: [
      'Place the 7-Segment Display on the breadboard.',
      'Connect segments A, B, C, D, E, F, G to Arduino pins D2, D3, D4, D5, D6, D7, D8 through 220Ω current-limiting resistors.',
      'Connect the Common Cathode pins of the display to GND.',
      'Connect the Tact Switch with Cap pin to digital pin D9 with internal INPUT_PULLUP enabled.',
      'Write software debouncing to count clicks and display the respective number on the segment pins.'
    ]
  },
  {
    id: 'temp-relay',
    title: 'Temperature Controlled Relay',
    description: 'Automatically switch on appliances like a fan or heater when the temperature crosses a set threshold using an analog temp sensor.',
    difficulty: 'Advanced',
    duration: '1.5 hours',
    components: [
      'Arduino Uno R3 Compatible',
      'LM35 Temperature Sensor',
      '1-Channel Relay Module',
      'Jumper Wires (M-F)',
      'Solderless Breadboard'
    ],
    image: '/2.jpg',
    wiringInstructions: [
      'Connect LM35 VCC to 5V, GND to GND, and Out pin to Arduino Analog pin A1.',
      'Connect Relay Module VCC to 5V, GND to GND, and IN pin to digital pin D7.',
      'Connect a load (such as a 5V fan) across the Relay NO and COM pins connected to power.',
      'Read A1 voltage, calculate temperature in Celsius, and trigger D7 HIGH when it exceeds 30°C.'
    ]
  },
  {
    id: 'morse-gen',
    title: 'Morse Code Generator',
    description: 'Practice sending Morse code by tapping out audio signals. The system plays sound tones corresponding to short and long button taps.',
    difficulty: 'Beginner',
    duration: '30 mins',
    components: [
      'Arduino Uno R3 Compatible',
      'Active Piezo Buzzer',
      'Tactile Push Buttons',
      'Solderless Breadboard'
    ],
    image: '/2.jpg',
    wiringInstructions: [
      'Connect the Piezo Buzzer positive pin to Arduino digital pin D8 and negative pin to GND.',
      'Connect the tactile button on the breadboard, bridging pin D2 to GND.',
      'Enable the internal pullup resistor on pin D2 in setup.',
      'Whenever the button state is LOW (pressed), set pin D8 HIGH to ring the buzzer.'
    ]
  },
  {
    id: 'water-level',
    title: 'Water Level Indicator',
    description: 'Measure water level inside a container using simple probe wires. Illuminates three different colored LEDs representing Low, Medium, and Full water levels.',
    difficulty: 'Intermediate',
    duration: '1 hour',
    components: [
      'Arduino Uno R3 Compatible',
      'Vibrant LEDs Pack',
      'Resistors Pack',
      'Jumper Wires (M-F)',
      'Solderless Breadboard'
    ],
    image: '/2.jpg',
    wiringInstructions: [
      'Connect three LEDs (Red, Yellow, Green) to pins D3, D4, D5 through 220Ω resistors.',
      'Place three bare jumper wires at different heights inside a glass cup, connecting them to A0, A1, A2.',
      'Place a common wire connected to Arduino 5V at the bottom of the glass.',
      'Read analog values on pins A0, A1, and A2. When water completes the circuit with the 5V terminal, turn on the respective LEDs.'
    ]
  },
  {
    id: 'traffic-light',
    title: 'Blinking Traffic Light',
    description: 'Recreate a miniature intersection traffic light system. Program Red, Yellow, and Green LEDs to loop through a standard traffic light sequence.',
    difficulty: 'Beginner',
    duration: '20 mins',
    components: [
      'Arduino Uno R3 Compatible',
      'Vibrant LEDs Pack',
      'Resistors Pack',
      'Solderless Breadboard'
    ],
    image: '/2.jpg',
    wiringInstructions: [
      'Connect the Red LED anode to pin D10 via a 220Ω resistor.',
      'Connect the Yellow LED anode to pin D9 via a 220Ω resistor.',
      'Connect the Green LED anode to pin D8 via a 220Ω resistor.',
      'Connect all three LED cathodes to GND.',
      'Loop timing delays: Red (5s) -> Green (5s) -> Yellow (2s) -> Red (5s).'
    ]
  }
];
