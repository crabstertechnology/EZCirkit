const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function cancelAllOrders() {
  const email = process.env.SHIPROCKET_API_EMAIL;
  const password = process.env.SHIPROCKET_API_PASSWORD;

  if (!email || !password) {
    console.error('Error: Shiprocket credentials not found in .env.local');
    process.exit(1);
  }

  try {
    console.log('Logging in to Shiprocket...');
    const authResponse = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/auth/login',
      { email, password },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const token = authResponse.data.token;
    if (!token) {
      throw new Error('No token returned in auth response');
    }
    console.log('Login successful!');

    console.log('Fetching active Shiprocket orders...');
    const listResponse = await axios.get(
      'https://apiv2.shiprocket.in/v1/external/orders',
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const orders = listResponse.data?.data || [];
    console.log(`Found ${orders.length} total orders in this page.`);

    const activeOrderIds = orders
      .filter(order => {
        const status = (order.status || '').toLowerCase();
        return !status.includes('cancel') && status !== 'cancelled';
      })
      .map(order => order.id);

    if (activeOrderIds.length === 0) {
      console.log('No active orders found to cancel.');
      return;
    }

    console.log(`Attempting to cancel ${activeOrderIds.length} active orders... IDs:`, activeOrderIds);

    const cancelResponse = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/orders/cancel',
      { ids: activeOrderIds },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    console.log('Cancellation API response status:', cancelResponse.status);
    console.log('Response Details:', JSON.stringify(cancelResponse.data, null, 2));
    console.log('Successfully requested cancellation for all active orders!');

  } catch (error) {
    console.error('Cancellation Failed:');
    if (error.response) {
      console.error('Shiprocket Response Error:', error.response.data);
    } else {
      console.error('Error Message:', error.message);
    }
  }
}

cancelAllOrders();
