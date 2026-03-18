// utils/idGenerator.js

/**
 * Generate unique Order ID
 * Format: ORD-YYYYMMDD-XXXXX
 * Example: ORD-20260318-A7K2F
 */
const generateOrderId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
  
    // Generate random alphanumeric string
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomStr = '';
    for (let i = 0; i < 5; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  
    return `ORD-${dateStr}-${randomStr}`;
  };
  
  /**
   * Generate unique Transaction ID for SSLCommerz
   * Format: TXN-TIMESTAMP-RANDOM
   * Example: TXN-1710757200000-A7K2F
   */
  const generateTransactionId = () => {
    const timestamp = Date.now();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomStr = '';
    
    for (let i = 0; i < 5; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  
    return `TXN-${timestamp}-${randomStr}`;
  };
  
  /**
   * Generate unique Invoice ID
   * Format: INV-YYYYMM-XXXXX
   * Example: INV-202603-A7K2F
   */
  const generateInvoiceId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dateStr = `${year}${month}`;
  
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomStr = '';
    
    for (let i = 0; i < 5; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  
    return `INV-${dateStr}-${randomStr}`;
  };
  
  /**
   * Generate coupon code
   * Format: SALE-XXXX or PROMO-XXXX
   */
  const generateCouponCode = (prefix = 'COUPON') => {
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${randomStr}`;
  };
  
  /**
   * Generate payment reference number
   */
  const generatePaymentRef = () => {
    return `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  };
  
  module.exports = {
    generateOrderId,
    generateTransactionId,
    generateInvoiceId,
    generateCouponCode,
    generatePaymentRef,
  };