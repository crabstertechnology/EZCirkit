const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function testServiceability() {
  const email = process.env.SHIPROCKET_API_EMAIL;
  const password = process.env.SHIPROCKET_API_PASSWORD;

  try {
    const authResponse = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/auth/login',
      { email, password },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const token = authResponse.data.token;
    
    const response = await axios.get(
      'https://apiv2.shiprocket.in/v1/external/courier/serviceability/',
      {
        params: {
          pickup_postcode: '641019',
          delivery_postcode: '560066',
          weight: 0.98,
          cod: 0,
          length: 34,
          breadth: 24,
          height: 6,
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const couriers = response.data?.data?.available_courier_companies || [];
    const targetCouriers = couriers.filter(c => c.courier_name.toLowerCase().includes('amazon') || c.courier_name.toLowerCase().includes('dtdc'));
    
    targetCouriers.forEach(c => {
      console.log('---');
      console.log('courier_name:', c.courier_name);
      // Print any key that has a numeric value
      for (const [key, value] of Object.entries(c)) {
        if (typeof value === 'number' && value !== 0) {
          console.log(`  ${key}: ${value}`);
        } else if (typeof value === 'string' && !isNaN(value) && parseFloat(value) !== 0) {
          console.log(`  ${key} (string): ${value}`);
        }
      }
      console.log('whatsapp_charges:', c.whatsapp_charges);
    });

  } catch (error) {
    console.error('Failed:', error.response?.data || error.message);
  }
}

testServiceability();
