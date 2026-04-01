const express = require('express');
const {
  initiateSSLCommerzPayment,
  handleSuccessPayment,
  handleFailPayment,
  handleIPNPayment,
} = require('../controllers/paymentController');

const router = express.Router();

router.post('/sslcommerz/initiate', initiateSSLCommerzPayment);
router.post('/sslcommerz/ipn', handleIPNPayment);

router.route('/sslcommerz/status/:transactionId')
  .post(handleSuccessPayment)
  .get(handleFailPayment);

module.exports = router;
