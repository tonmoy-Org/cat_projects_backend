const express = require('express');

const generateRandomString = (length) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateOrderId = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${dateStr}-${generateRandomString(5)}`;
};

const generateTransactionId = () => {
  return `TXN-${Date.now()}-${generateRandomString(5)}`;
};

const generateInvoiceId = () => {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `INV-${dateStr}-${generateRandomString(5)}`;
};

const generateCouponCode = (prefix = 'COUPON') => {
  return `${prefix.toUpperCase()}-${generateRandomString(6)}`;
};

const generatePaymentRef = () => {
  return `PAY-${Date.now()}-${generateRandomString(6)}`;
};

module.exports = {
  generateOrderId,
  generateTransactionId,
  generateInvoiceId,
  generateCouponCode,
  generatePaymentRef,
};