const express = require('express');
const router = express.Router();

const {
  initiateSSLCommerzPayment,
  handleSuccessPayment,
  handleFailPayment,
  handleIPNPayment,
} = require('../controllers/paymentController');

router.post('/sslcommerz/initiate', initiateSSLCommerzPayment);
router.post('/sslcommerz/success/:transactionId', handleSuccessPayment);
router.get('/sslcommerz/fail/:transactionId', handleFailPayment);
router.post('/sslcommerz/ipn', handleIPNPayment);

module.exports = router;