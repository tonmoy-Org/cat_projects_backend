const SSLCommerzPayment = require('sslcommerz-lts');

const sslcz = new SSLCommerzPayment(
    process.env.SSLCOMMERZ_STORE_ID || 'tonmo683176d42ae41',
    process.env.SSLCOMMERZ_STORE_PASSWORD || 'tonmo683176d42ae41@ssl',
    process.env.SSLCOMMERZ_LIVE_MODE === 'true'
);

module.exports = sslcz;