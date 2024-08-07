const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');
require('dotenv').config()
 
// Set up and return PayPal environment with your credentials.
function environment() {
  let clientId = process.env.PAYPAL_ID;
  let clientSecret = process.env.PAYPAL_SECRET

  return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
}

// Returns PayPal HTTP client instance with environment that has access
// credentials context. Use this instance to invoke PayPal APIs, provided the
// credentials have access.
function client() {
  return new checkoutNodeJssdk.core.PayPalHttpClient(environment());
}

module.exports = { client: client };
