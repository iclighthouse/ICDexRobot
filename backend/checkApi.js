const axios = require('axios');
const API_URL =
  process.env.NODE_ENV !== 'development'
    ? 'https://api.binance.com/api/v3/ping'
    : 'https://testnet.binance.vision/api/v3/ping';
const checkApi = async () => {
  try {
    console.log('Test connectivity');
    const response = await axios.get(API_URL, { timeout: 5 * 1000 });
    if (response.status === 200) {
      console.log('Server is running on port 26535.');
      process.exit(0);
    } else {
      console.error(
        `❌ Failed to connect to Binance servers. Status code: ${response.status}`
      );
      process.exit(1);
    }
  } catch (err) {
    if (err.response) {
      console.error(
        `❌ Failed to connect to Binance servers, ${JSON.stringify(
          err.response.data
        )}.`
      );
    } else {
      console.error(`❌ Failed to connect to Binance servers.`);
    }
    process.exit(1);
  }
};

checkApi();
