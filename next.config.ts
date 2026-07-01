
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: ['https://*.cloudworkstations.dev'],

  // Compress responses with gzip
  compress: true,

  // Tree-shake large icon libraries — only imports used icons
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  images: {
    // Serve modern formats: avif first, then webp fallback
    formats: ['image/avif', 'image/webp'],
    // Aggressive caching — 30 days for remote images
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  async rewrites() {
    return [
      // Redirect old kit image paths to the new kit folder
      {
        source: '/new-kit-front.png',
        destination: '/kit/new-kit-front.png',
      },
      {
        source: '/kit-inside.png',
        destination: '/kit/kit-inside.png',
      },
      {
        source: '/kit-back.png',
        destination: '/kit/kit-back.png',
      },
      // DHT11
      {
        source: '/dht11_humidity_and_temperature_sensor_module_for_arduino-4.jpg',
        destination: '/dht11/dht11_humidity_and_temperature_sensor_module_for_arduino-4.jpg',
      },
      {
        source: '/dht11_humidity_and_temperature_sensor_module_for_arduino-5.jpg',
        destination: '/dht11/dht11_humidity_and_temperature_sensor_module_for_arduino-5.jpg',
      },
      {
        source: '/dht11_humidity_and_temperature_sensor_module_for_arduino.jpg',
        destination: '/dht11/dht11_humidity_and_temperature_sensor_module_for_arduino.jpg',
      },
      // W1209
      {
        source: '/W1209-Temperature-Control-Switch-With-Temperature-Sensor-6-768x853_500x-e1656962043690.webp',
        destination: '/w1209/W1209-Temperature-Control-Switch-With-Temperature-Sensor-6-768x853_500x-e1656962043690.webp',
      },
      {
        source: '/optimized_W1209_Digital_Temperature_Controller_Thermostat_Module1_1000x.webp',
        destination: '/w1209/optimized_W1209_Digital_Temperature_Controller_Thermostat_Module1_1000x.webp',
      },
      {
        source: '/optimized_W1209_Digital_Temperature_Controller_Thermostat_Module2_1000x.webp',
        destination: '/w1209/optimized_W1209_Digital_Temperature_Controller_Thermostat_Module2_1000x.webp',
      },
      {
        source: '/optimized_W1209_Digital_Temperature_Controller_Thermostat_Module3_1000x.webp',
        destination: '/w1209/optimized_W1209_Digital_Temperature_Controller_Thermostat_Module3_1000x.webp',
      },
      // ESP32
      {
        source: '/ESP-32_38_Pin_diagram_480x480.webp',
        destination: '/esp32/ESP-32_38_Pin_diagram_480x480.webp',
      },
      {
        source: '/ESP32S-Development-Board.webp',
        destination: '/esp32/ESP32S-Development-Board.webp',
      },
      {
        source: '/ESP32S_38Pin_Development_Board_WIFI_BLUETOOTH_2.webp',
        destination: '/esp32/ESP32S_38Pin_Development_Board_WIFI_BLUETOOTH_2.webp',
      },
      // MB102
      {
        source: '/MB102-Breadboard-3.3V5V-Power-Supply-Module.jpg',
        destination: '/mb102/MB102-Breadboard-3.3V5V-Power-Supply-Module.jpg',
      },
      {
        source: '/mb102_power_supply_module_angled_view_side_profile_showing_dc_jack_and_usb_top_view_showing_jumpers_module_plugged_into_breadboard_1_.jpg',
        destination: '/mb102/mb102_power_supply_module_angled_view_side_profile_showing_dc_jack_and_usb_top_view_showing_jumpers_module_plugged_into_breadboard_1_.jpg',
      },
      {
        source: '/white_rectangular_mb102_solderless_breadboard_with_830_tie-point_holes_featuring_red_and_blue_power_rail_lines_running_along_the_edges_standard_2.54mm_spacing_and_alphanumeric.jpg',
        destination: '/mb102/white_rectangular_mb102_solderless_breadboard_with_830_tie-point_holes_featuring_red_and_blue_power_rail_lines_running_along_the_edges_standard_2.54mm_spacing_and_alphanumeric.jpg',
      },
      // VC02
      {
        source: '/vc-02_ai-thinker_offline_voice_module_speech_recognition_kit_7_.jpg',
        destination: '/vc02/vc-02_ai-thinker_offline_voice_module_speech_recognition_kit_7_.jpg',
      },
      {
        source: '/vc02.webp',
        destination: '/vc02/vc02.webp',
      },
      // Numbered (101, 102, 103)
      {
        source: '/101_0a30e475-4c0f-4642-ae0f-ad6129ac8aa7_1000x.webp',
        destination: '/numbered/101_0a30e475-4c0f-4642-ae0f-ad6129ac8aa7_1000x.webp',
      },
      {
        source: '/102_adabc2ab-2023-4f74-889b-f53cbc000aeb.webp',
        destination: '/numbered/102_adabc2ab-2023-4f74-889b-f53cbc000aeb.webp',
      },
      {
        source: '/103_870f4e12-04a6-4c2a-9aee-465b6eb41c2e_1000x.webp',
        destination: '/numbered/103_870f4e12-04a6-4c2a-9aee-465b6eb41c2e_1000x.webp',
      },
      // Imports (61s)
      {
        source: '/61hrjXgbhZL.jpg',
        destination: '/imports/61hrjXgbhZL.jpg',
      },
      {
        source: '/61jOHXtm4hL.jpg',
        destination: '/imports/61jOHXtm4hL.jpg',
      },
      {
        source: '/61jqj4UJSqL.jpg',
        destination: '/imports/61jqj4UJSqL.jpg',
      },
      // Shopping
      {
        source: '/shopping.webp',
        destination: '/shopping/shopping.webp',
      },
      {
        source: '/:filename(shopping%20\\(\\d+\\)\\.webp|shopping\\ \\(\\d+\\)\\.webp)',
        destination: '/shopping/:filename',
      },
    ];
  },
};

export default nextConfig;
