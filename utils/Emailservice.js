const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const generateEmailTemplate = (title, content, color = '#db89ca') => `
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; border: 1px solid #eee; }
        .header { background-color: ${color}; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; background-color: #ffffff; }
        .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; background-color: #f9f9f9; }
        .btn { background-color: ${color}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { text-align: left; background: #f8f8f8; padding: 10px; border-bottom: 2px solid #eee; }
        td { padding: 10px; border-bottom: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>${title}</h1></div>
        <div class="content">${content}</div>
        <div class="footer">
          <p>© 2026 Your Company. All rights reserved.</p>
          <p>Support: support@example.com</p>
        </div>
      </div>
    </body>
  </html>
`;

const sendOrderConfirmationEmail = async (customerEmail, customerName, orderId, transactionId, totalAmount, items) => {
  try {
    const itemsHTML = items.map(item => `
      <tr>
        <td>${item.productName}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">৳${item.price.toFixed(0)}</td>
        <td style="text-align: right;">৳${item.subtotal.toFixed(0)}</td>
      </tr>
    `).join('');

    const content = `
      <p>Hello ${customerName},</p>
      <p>Thank you for your order! Your payment has been processed successfully.</p>
      <div style="background: #f0f7ff; padding: 15px; border-radius: 5px;">
        <strong>Order ID:</strong> ${orderId}<br>
        <strong>Transaction ID:</strong> ${transactionId}
      </div>
      <h3>Order Details</h3>
      <table>
        <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th style="text-align: right;">Total</th></tr></thead>
        <tbody>${itemsHTML}</tbody>
      </table>
      <p style="text-align: right; font-size: 18px;"><strong>Total: ৳${totalAmount.toFixed(0)}</strong></p>
      <p>Your order is being processed and will be shipped soon.</p>
    `;

    await transporter.sendMail({
      from: `"Store Name" <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject: `Order Confirmation - ${orderId}`,
      html: generateEmailTemplate('Order Confirmed', content),
    });
    return true;
  } catch (error) {
    console.error('Email Error:', error);
    return false;
  }
};

const sendOrderShippedEmail = async (customerEmail, customerName, orderId, trackingNumber, estimatedDelivery) => {
  try {
    const content = `
      <p>Hello ${customerName},</p>
      <p>Great news! Your order <strong>${orderId}</strong> is on its way.</p>
      <div style="background: #f0fff0; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>Tracking Number:</strong> ${trackingNumber}<br>
        <strong>Est. Delivery:</strong> ${estimatedDelivery}
      </div>
      <center><a href="https://track.example.com/${trackingNumber}" class="btn">Track Package</a></center>
    `;

    await transporter.sendMail({
      from: `"Store Name" <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject: `Order Shipped - ${orderId}`,
      html: generateEmailTemplate('Shipped!', content, '#4caf50'),
    });
    return true;
  } catch (error) {
    console.error('Email Error:', error);
    return false;
  }
};

const sendPaymentReceiptEmail = async (customerEmail, customerName, orderId, transactionId, amount, paymentMethod, paymentDate) => {
  try {
    const content = `
      <p>Hello ${customerName},</p>
      <p>Please find your payment receipt below:</p>
      <table>
        <tr><td>Order ID</td><td><strong>${orderId}</strong></td></tr>
        <tr><td>Transaction ID</td><td><strong>${transactionId}</strong></td></tr>
        <tr><td>Method</td><td><strong>${paymentMethod}</strong></td></tr>
        <tr><td>Date</td><td><strong>${paymentDate}</strong></td></tr>
        <tr><td>Total Paid</td><td><strong>৳${amount.toFixed(0)}</strong></td></tr>
      </table>
    `;

    await transporter.sendMail({
      from: `"Accounts" <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject: `Payment Receipt - ${orderId}`,
      html: generateEmailTemplate('Payment Receipt', content),
    });
    return true;
  } catch (error) {
    console.error('Email Error:', error);
    return false;
  }
};

const sendRefundEmail = async (customerEmail, customerName, orderId, refundAmount, reason) => {
  try {
    const content = `
      <p>Hello ${customerName},</p>
      <p>A refund has been processed for your order <strong>${orderId}</strong>.</p>
      <div style="background: #fff5eb; padding: 15px; border-radius: 5px;">
        <strong>Amount:</strong> ৳${refundAmount.toFixed(0)}<br>
        <strong>Reason:</strong> ${reason}
      </div>
      <p>Funds will appear in your original payment method within 3-5 business days.</p>
    `;

    await transporter.sendMail({
      from: `"Accounts" <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject: `Refund Confirmation - ${orderId}`,
      html: generateEmailTemplate('Refund Processed', content, '#ff9800'),
    });
    return true;
  } catch (error) {
    console.error('Email Error:', error);
    return false;
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendPaymentReceiptEmail,
  sendRefundEmail,
};