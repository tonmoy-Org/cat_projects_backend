// utils/emailService.js
const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // Use app-specific password for Gmail
  },
});

/**
 * Send order confirmation email
 */
const sendOrderConfirmationEmail = async (
  customerEmail,
  customerName,
  orderId,
  transactionId,
  totalAmount,
  items
) => {
  try {
    const itemsHTML = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">
            ${item.productName}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">
            ৳${item.price.toFixed(0)}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">
            ৳${item.subtotal.toFixed(0)}
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #db89ca; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 20px; }
            .order-summary { margin: 20px 0; }
            .table { width: 100%; border-collapse: collapse; }
            .th { background-color: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .order-id { background-color: #e8f4f8; padding: 10px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmation</h1>
            </div>

            <div class="content">
              <p>Hello ${customerName},</p>
              <p>Thank you for your order! Your payment has been processed successfully.</p>

              <div class="order-id">
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><strong>Transaction ID:</strong> ${transactionId}</p>
              </div>

              <h2>Order Details</h2>
              <table class="table">
                <thead>
                  <tr>
                    <th class="th">Product Name</th>
                    <th class="th" style="text-align: center;">Quantity</th>
                    <th class="th" style="text-align: right;">Price</th>
                    <th class="th" style="text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
              </table>

              <div class="order-summary" style="margin-top: 20px; text-align: right;">
                <p><strong>Total Amount: ৳${totalAmount.toFixed(0)}</strong></p>
              </div>

              <p>Your order is being processed and will be shipped soon. You will receive tracking information via email.</p>

              <p style="margin-top: 30px;">
                If you have any questions, please contact our support team at support@example.com
              </p>

              <p>
                Best regards,<br>
                The E-Commerce Team
              </p>
            </div>

            <div class="footer">
              <p>© 2026 Your Company. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Order Confirmation - ${orderId}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Order confirmation email sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return false;
  }
};

/**
 * Send order shipped email
 */
const sendOrderShippedEmail = async (
  customerEmail,
  customerName,
  orderId,
  trackingNumber,
  estimatedDelivery
) => {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4caf50; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Order has been Shipped!</h1>
            </div>

            <div class="content">
              <p>Hello ${customerName},</p>
              <p>Great news! Your order ${orderId} has been shipped.</p>

              <div style="background-color: #e8f5e9; padding: 15px; margin: 20px 0;">
                <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
                <p><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>
              </div>

              <p>Click below to track your package:</p>
              <p>
                <a href="https://track.example.com/${trackingNumber}" 
                   style="background-color: #db89ca; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  Track Your Order
                </a>
              </p>

              <p>If you have any questions, please contact support@example.com</p>

              <p>
                Best regards,<br>
                The E-Commerce Team
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Order Shipped - ${orderId}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Shipment notification email sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending shipment email:', error);
    return false;
  }
};

/**
 * Send payment receipt email
 */
const sendPaymentReceiptEmail = async (
  customerEmail,
  customerName,
  orderId,
  transactionId,
  amount,
  paymentMethod,
  paymentDate
) => {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #db89ca; color: white; padding: 20px; text-align: center; }
            .receipt { background-color: #f9f9f9; padding: 20px; }
            .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Receipt</h1>
            </div>

            <div class="receipt">
              <h2>Receipt Details</h2>
              <div class="row">
                <span>Order ID:</span>
                <strong>${orderId}</strong>
              </div>
              <div class="row">
                <span>Transaction ID:</span>
                <strong>${transactionId}</strong>
              </div>
              <div class="row">
                <span>Payment Method:</span>
                <strong>${paymentMethod}</strong>
              </div>
              <div class="row">
                <span>Payment Date:</span>
                <strong>${paymentDate}</strong>
              </div>
              <div class="row" style="font-size: 18px; font-weight: bold;">
                <span>Amount Paid:</span>
                <strong>৳${amount.toFixed(0)}</strong>
              </div>

              <p style="margin-top: 30px; color: #666;">
                This is a receipt for your payment. Please keep this for your records.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Payment Receipt - ${orderId}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Payment receipt email sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending payment receipt email:', error);
    return false;
  }
};

/**
 * Send refund notification email
 */
const sendRefundEmail = async (
  customerEmail,
  customerName,
  orderId,
  refundAmount,
  reason
) => {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Refund Processed</h1>
            </div>

            <div class="content">
              <p>Hello ${customerName},</p>
              <p>Your refund has been processed.</p>

              <div style="background-color: #fff3e0; padding: 15px; margin: 20px 0;">
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><strong>Refund Amount:</strong> ৳${refundAmount.toFixed(0)}</p>
                <p><strong>Reason:</strong> ${reason}</p>
              </div>

              <p>The refund will be credited back to your original payment method within 3-5 business days.</p>

              <p>If you have any questions, please contact support@example.com</p>

              <p>
                Best regards,<br>
                The E-Commerce Team
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Refund Confirmation - ${orderId}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Refund notification email sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending refund email:', error);
    return false;
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendPaymentReceiptEmail,
  sendRefundEmail,
};