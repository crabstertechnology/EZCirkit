const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function testShiprocket() {
  const email = process.env.SHIPROCKET_API_EMAIL;
  const password = process.env.SHIPROCKET_API_PASSWORD;

  console.log('Testing Shiprocket API integration...');
  console.log('Using API Email:', email);

  if (!email || !password) {
    console.error('Error: Shiprocket credentials not found in .env.local');
    process.exit(1);
  }

  try {
    // 1. Test Auth Login
    console.log('\n--- Step 1: Testing Login ---');
    const authResponse = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/auth/login',
      { email, password },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const token = authResponse.data.token;
    if (!token) {
      throw new Error('No token returned in auth response');
    }
    console.log('Success! Token generated (starts with):', token.substring(0, 15) + '...');

    // 2. Test Serviceability
    console.log('\n--- Step 2: Testing Courier Serviceability (Ad-hoc) ---');
    const serviceabilityResponse = await axios.get(
      'https://apiv2.shiprocket.in/v1/external/courier/serviceability/',
      {
        params: {
          pickup_postcode: '382424',
          delivery_postcode: '400001',
          weight: 0.5,
          cod: 0,
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    console.log('Status code:', serviceabilityResponse.status);
    const availableCouriers = serviceabilityResponse.data?.data?.available_courier_companies || [];
    console.log(`Found ${availableCouriers.length} serviceable courier companies.`);
    
    if (availableCouriers.length > 0) {
      console.log('Top 3 Available Couriers:');
      availableCouriers.slice(0, 3).forEach((c, idx) => {
        console.log(`  ${idx + 1}. Name: ${c.courier_name} | Rate: ₹${c.rate} | ETD: ${c.etd || 'N/A'}`);
      });
    }

    console.log('\n--- Test Completed Successfully! ---');

  } catch (error) {
    console.error('\n--- Test Failed! ---');
    if (error.response) {
      console.error('Shiprocket Response Error Data:', error.response.data);
      console.error('Shiprocket Response Status:', error.response.status);
    } else {
      console.error('Error Message:', error.message);
    }
  }
}

testShiprocket();
