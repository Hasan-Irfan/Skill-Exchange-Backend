# Stripe Test Mode - Complete Guide

## How to Check if You're in Test Mode

### 1. Check Your API Keys

**Test Mode Keys:**
- Secret Key: Starts with `sk_test_...`
- Publishable Key: Starts with `pk_test_...`

**Live Mode Keys:**
- Secret Key: Starts with `sk_live_...`
- Publishable Key: Starts with `pk_live_...`

### 2. Check Your .env File

```env
# Test Mode (for development)
STRIPE_SECRET_KEY=sk_test_51Q...your_test_key
STRIPE_PUBLISHABLE_KEY=pk_test_51Q...your_test_key

# Live Mode (for production)
STRIPE_SECRET_KEY=sk_live_51Q...your_live_key
STRIPE_PUBLISHABLE_KEY=pk_live_51Q...your_live_key
```

### 3. Check Stripe Dashboard

1. Go to https://dashboard.stripe.com
2. Look at the top right corner
3. You'll see a toggle: **"Test mode"** or **"Live mode"**
4. If it says "Test mode" → You're in test mode
5. If it says "Live mode" → You're in live mode

## Test Mode vs Live Mode

| Feature | Test Mode | Live Mode |
|---------|-----------|-----------|
| **Money** | Fake/test money | Real money |
| **Cards** | Test cards only | Real cards |
| **Charges** | No real charges | Real charges |
| **Balance** | Test balance | Real balance |
| **Webhooks** | Test webhooks | Real webhooks |

## Testing Top-Up in Test Mode

### Step 1: Verify Test Mode Setup

1. **Check your .env file:**
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

2. **Check Stripe Dashboard:**
   - Go to https://dashboard.stripe.com/test
   - Make sure toggle shows "Test mode"

### Step 2: Use Test Cards

Stripe provides test cards that work in test mode:

#### Successful Payment Cards:
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

#### Other Test Cards:
```
# Decline Card
4242 4242 4242 0002

# Requires 3D Secure
4000 0025 0000 3155

# Insufficient Funds
4000 0000 0000 9995
```

### Step 3: Test Top-Up Flow

1. **Open your app** and go to Dashboard
2. **Click "Top Up"** button
3. **Enter amount** (e.g., $10.00)
4. **Enter test card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/25` (any future date)
   - CVC: `123` (any 3 digits)
5. **Click "Add $10"**
6. **Payment should succeed**

### Step 4: Verify in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/payments
2. You should see:
   - Payment Intent created
   - Status: "Succeeded"
   - Amount: $10.00 (or your test amount)

3. Go to https://dashboard.stripe.com/test/balance
4. You should see:
   - Test balance increased by the amount
   - Transaction history

### Step 5: Verify in Your App

1. **Check wallet balance:**
   - Should show the new amount
   - Refresh if needed

2. **Check transaction history:**
   - Go to wallet transactions
   - Should see the top-up transaction

## Testing Webhooks (Important!)

### Option 1: Stripe CLI (Recommended for Local Testing)

1. **Install Stripe CLI:**
   ```bash
   # Windows (using Scoop)
   scoop install stripe

   # Or download from:
   # https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward webhooks to your local server:**
   ```bash
   stripe listen --forward-to http://localhost:8080/api/v1/wallet/webhooks/stripe
   ```

4. **Copy the webhook signing secret:**
   - CLI will show: `whsec_...`
   - Add to your .env:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

5. **Test webhook:**
   ```bash
   stripe trigger payment_intent.succeeded
   ```

### Option 2: Stripe Dashboard Webhooks

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL:
   ```
   https://your-domain.com/api/v1/wallet/webhooks/stripe
   ```
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
5. Copy the webhook signing secret
6. Add to your .env file

### Option 3: Manual Confirmation (If Webhook Not Working)

If webhook isn't configured, the frontend will automatically call the confirm endpoint after payment succeeds. This should still work!

## Complete Testing Checklist

### ✅ Pre-Testing Setup
- [ ] Stripe account created
- [ ] Test mode API keys in .env
- [ ] Frontend has `VITE_STRIPE_PUBLISHABLE_KEY` in .env
- [ ] Backend running on port 8080
- [ ] Frontend running

### ✅ Test Top-Up
- [ ] Click "Top Up" button
- [ ] Enter amount (e.g., $10)
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Payment succeeds
- [ ] Wallet balance updates
- [ ] Check Stripe Dashboard shows payment

### ✅ Verify Stripe Dashboard
- [ ] Go to Stripe Dashboard (test mode)
- [ ] Check Payments → See your payment
- [ ] Check Balance → See test balance increased
- [ ] Check Customers → See customer created

### ✅ Verify Your App
- [ ] Wallet balance shows correct amount
- [ ] Transaction history shows top-up
- [ ] No errors in console

## Troubleshooting

### Payment Succeeds but Balance Doesn't Update

**Possible causes:**
1. Webhook not configured
2. Webhook secret wrong
3. Frontend confirm endpoint not called

**Solutions:**
1. Check browser console for errors
2. Check backend logs for webhook/confirm calls
3. Manually call confirm endpoint if needed

### "Payment failed" Error

**Check:**
1. Using correct test card
2. Card details correct (expiry, CVC)
3. Stripe keys are test keys
4. Network connection

### Webhook Not Receiving Events

**Check:**
1. Webhook URL is correct
2. Server is accessible (for production)
3. Using Stripe CLI for local testing
4. Webhook secret matches

## Switching Between Test and Live Mode

### To Switch to Live Mode:

1. **Get live keys from Stripe Dashboard:**
   - Toggle to "Live mode"
   - Go to Developers → API Keys
   - Copy live keys

2. **Update .env:**
   ```env
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

3. **Update frontend .env:**
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

4. **Restart servers**

⚠️ **Warning:** Live mode uses REAL money! Only use for production.

## Test Mode Limitations

- ✅ All features work the same
- ✅ Webhooks work
- ✅ Payment processing works
- ❌ No real money
- ❌ Test balance separate from live balance
- ❌ Can't withdraw to real bank account

## Quick Test Commands

```bash
# Check if Stripe is configured
echo $STRIPE_SECRET_KEY

# Test webhook locally
stripe listen --forward-to http://localhost:8080/api/v1/wallet/webhooks/stripe

# Trigger test event
stripe trigger payment_intent.succeeded
```

## Summary

**Test Mode = Safe Testing Environment**
- Use test cards (no real money)
- All features work
- Perfect for development
- Check Stripe Dashboard to verify

**Live Mode = Real Money**
- Use real cards
- Real charges
- Only for production
- Be careful!

