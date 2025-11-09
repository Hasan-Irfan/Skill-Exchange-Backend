# Monetary Exchange UI Flow - Complete Guide

## Overview

This guide explains the complete UI flow for monetary exchanges from both perspectives:
- **Listing Type "OFFER"**: Listing owner offers a service
- **Listing Type "NEED"**: Listing owner needs a service

**Scenario**: 
- **You (Listing Owner)**: Own a listing
- **Me (Exchange Initiator)**: Want to create an exchange with you

---

## 📋 Scenario 1: Listing Type "OFFER" (You Offer Service)

### **Your Listing**: "I offer Web Development services - 10,000 PKR"

---

### **STEP 1: I Click "Exchange" Button** 👆

**UI**: I'm viewing your listing and click "Propose Exchange" button

**API Call**: `POST /api/v1/exchanges`
**Method**: `createExchangeService()`

**Request Body** (from me):
```json
{
  "requestListing": "listing_id_123",
  "offerSkill": {
    "name": "Graphic Design",
    "skillId": "skill_id_456",
    "level": "intermediate",
    "hourlyRate": 5000,
    "currency": "PKR",
    "details": "I can help with logo design"
  },
  "type": "monetary",
  "monetary": {
    "currency": "PKR",
    "totalAmount": 10000
  },
  "notes": "I need your web development service"
}
```

**Response** (to me):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_789",
    "initiator": "my_user_id",
    "receiver": "your_user_id",
    "status": "proposed",
    "type": "monetary",
    "monetary": {
      "currency": "PKR",
      "totalAmount": 10000
    },
    "thread": "thread_id_101",
    "audit": [{
      "at": "2024-01-15T10:00:00Z",
      "by": "my_user_id",
      "action": "created"
    }]
  }
}
```

**What Happens**:
- Exchange created with status `"proposed"`
- Thread created for messaging
- You receive notification: "New exchange proposal"

**My UI**: Shows "Exchange Proposed" status, opens chat thread

---

### **STEP 2: You See Exchange Proposal** 👀

**UI**: You see notification and open exchange details

**API Call**: `GET /api/v1/exchanges/:id`
**Response**: Full exchange details with status `"proposed"`

**Your UI Shows**:
- Exchange proposal from me
- My offer: Graphic Design service
- Your listing: Web Development (10,000 PKR)
- Exchange type: Monetary
- Status: "Pending Your Response"
- Chat thread available

---

### **STEP 3: We Chat in Thread** 💬

**UI**: Both of us can send messages in the thread

**API Call**: `POST /api/v1/threads/:threadId/messages`
**Request**:
```json
{
  "text": "Hi! I'm interested in your web development service. Can we discuss the timeline?",
  "attachments": []
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "message_id_202",
    "thread": "thread_id_101",
    "sender": "my_user_id",
    "text": "Hi! I'm interested...",
    "createdAt": "2024-01-15T10:05:00Z"
  }
}
```

**What Happens**:
- Message saved to thread
- Both users can see messages
- Thread `lastMessageAt` updated

---

### **STEP 4: You Accept Exchange** ✅

**UI**: You click "Accept Exchange" button

**API Call**: `POST /api/v1/exchanges/:id/accept`
**Method**: `acceptExchangeService()`

**Request Body**: (empty or optional notes)
```json
{}
```

**Response** (to you):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_789",
    "status": "accepted_initial",
    "audit": [
      { "at": "2024-01-15T10:00:00Z", "by": "my_user_id", "action": "created" },
      { "at": "2024-01-15T10:10:00Z", "by": "your_user_id", "action": "accepted" }
    ]
  }
}
```

**What Happens**:
- Exchange status changes to `"accepted_initial"`
- I receive notification: "Exchange accepted"

**Your UI**: Shows "Accepted - Sign Agreement" status
**My UI**: Shows "Accepted - Sign Agreement" status

---

### **STEP 5: We Sign Agreement** ✍️

**UI**: Both of us see "Sign Agreement" button

#### **5a. I Sign First** (Initiator)

**API Call**: `POST /api/v1/exchanges/:id/sign-agreement`
**Method**: `signAgreementService()`

**Request Body** (from me):
```json
{
  "signed": true,
  "newTerms": ["Project completion in 2 weeks", "Payment upon completion"],
  "type": "monetary",
  "monetary": {
    "totalAmount": 10000,
    "currency": "PKR"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_789",
    "status": "accepted_initial", // Still accepted_initial (waiting for you)
    "agreement": {
      "terms": ["Project completion in 2 weeks", "Payment upon completion"],
      "signedBy": ["my_user_id"]
    },
    "monetary": {
      "currency": "PKR",
      "totalAmount": 10000
    }
  }
}
```

**My UI**: Shows "Agreement Signed - Waiting for Other Party"

---

#### **5b. You Sign Agreement** (Receiver)

**API Call**: `POST /api/v1/exchanges/:id/sign-agreement`
**Request Body** (from you):
```json
{
  "signed": true,
  "newTerms": ["Project completion in 2 weeks", "Payment upon completion"]
}
```

**Response** (to you):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_789",
    "status": "agreement_signed", // ✅ Status changed!
    "agreement": {
      "terms": ["Project completion in 2 weeks", "Payment upon completion"],
      "signedBy": ["my_user_id", "your_user_id"]
    }
  }
}
```

**What Happens**:
- Exchange status changes to `"agreement_signed"`
- Both users receive notification: "Agreement signed - Ready for payment"

**Your UI**: Shows "Agreement Signed - Payment Required"
**My UI**: Shows "Agreement Signed - Make Payment" (I need to pay)

---

### **STEP 6: I Initiate Payment** 💳 (Optional - Dummy Payment)

**UI**: I see "Make Payment" button

**API Call**: `POST /api/v1/exchanges/:exchangeId/initiate-payment`
**Method**: `initiateExchangePaymentService()`

**Request Body** (from me):
```json
{
  "amount": 10000,
  "currency": "PKR",
  "gateway": "stripe"
}
```

**Response** (to me):
```json
{
  "success": true,
  "paymentIntent": {
    "id": "sim_exchange_789_1234567890",
    "amount": 10000,
    "currency": "PKR",
    "gateway": "stripe",
    "gatewayRef": "gateway_exchange_789_1234567890",
    "status": "requires_payment_method",
    "clientSecret": "sk_test_gateway_exchange_789_1234567890",
    "simulated": true
  },
  "message": "Payment intent created. Use the clientSecret or redirectUrl to complete payment.",
  "nextStep": "Call /exchanges/:id/fund-escrow after payment is confirmed"
}
```

**My UI**: 
- Shows payment form (simulated)
- I enter card details (dummy)
- Click "Pay 10,000 PKR"

**What Happens**:
- Payment intent created (simulated)
- Frontend processes payment (dummy)
- Ready to fund escrow

---

### **STEP 7: I Fund Escrow** 💰

**UI**: After payment confirmation, I click "Fund Escrow" button

**API Call**: `POST /api/v1/exchanges/:id/fund-escrow`
**Method**: `fundEscrowService()`

**Request Body** (from me):
```json
{
  "amount": 10000
}
```

**Response** (to me):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_789",
    "status": "escrow_funded",
    "monetary": {
      "currency": "PKR",
      "totalAmount": 10000,
      "escrowPaymentId": "payment_id_303"
    },
    "audit": [
      { "at": "2024-01-15T10:00:00Z", "by": "my_user_id", "action": "created" },
      { "at": "2024-01-15T10:10:00Z", "by": "your_user_id", "action": "accepted" },
      { "at": "2024-01-15T10:20:00Z", "by": "my_user_id", "action": "agreement_signed" },
      { "at": "2024-01-15T10:21:00Z", "by": "your_user_id", "action": "agreement_signed" },
      { "at": "2024-01-15T10:30:00Z", "by": "my_user_id", "action": "payment_escrowed" }
    ]
  }
}
```

**What Happens**:
- Payment created with status `"escrowed"`
- Exchange status changes to `"escrow_funded"`
- Payment stored in escrow
- You receive notification: "Escrow funded - Ready to start"

**My UI**: Shows "Escrow Funded - Waiting to Start"
**Your UI**: Shows "Escrow Funded - Start Exchange" button

---

### **STEP 8: You Start Exchange** 🚀

**UI**: You click "Start Exchange" button

**API Call**: `POST /api/v1/exchanges/:id/start`
**Method**: `startExchangeService()`

**Request Body**: (empty)
```json
{}
```

**Response** (to you):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_789",
    "status": "in_progress",
    "audit": [
      // ... previous audit entries
      { "at": "2024-01-15T10:35:00Z", "by": "your_user_id", "action": "started" }
    ]
  }
}
```

**What Happens**:
- Exchange status changes to `"in_progress"`
- I receive notification: "Exchange started"

**Your UI**: Shows "In Progress - Work in Progress"
**My UI**: Shows "In Progress - Work in Progress"

---

### **STEP 9: Work Happens** 🔨

**UI**: Both of us can:
- Chat in thread
- Share files/updates
- Track progress

**API Calls**: 
- `POST /api/v1/threads/:threadId/messages` - Send messages
- `GET /api/v1/exchanges/:id` - Check exchange status

---

### **STEP 10: I Confirm Completion** ✅ (First)

**UI**: I click "Mark as Complete" button

**API Call**: `POST /api/v1/exchanges/:id/confirm-complete`
**Method**: `confirmCompleteService()`

**Request Body**: (empty)
```json
{}
```

**Response** (to me):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_789",
    "status": "in_progress", // Still in_progress (waiting for you)
    "confirmations": {
      "initiator": true,
      "receiver": false
    }
  }
}
```

**My UI**: Shows "Completion Confirmed - Waiting for Other Party"

---

### **STEP 11: You Confirm Completion** ✅ (Second)

**UI**: You click "Mark as Complete" button

**API Call**: `POST /api/v1/exchanges/:id/confirm-complete`
**Request Body**: (empty)
```json
{}
```

**Response** (to you):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_789",
    "status": "completed", // ✅ Status changed!
    "completedAt": "2024-01-15T11:00:00Z",
    "confirmations": {
      "initiator": true,
      "receiver": true
    },
    "audit": [
      // ... previous audit entries
      { "at": "2024-01-15T11:00:00Z", "by": "your_user_id", "action": "completed" }
    ]
  }
}
```

**What Happens**:
- Exchange status changes to `"completed"`
- Payment automatically captured
- Payment status changes to `"captured"`
- **You receive payment**: 10,000 PKR added to your `payments.totalReceived`
- **I see payment deducted**: 10,000 PKR added to my `payments.totalPaid`
- Both users receive notification: "Exchange completed"

**Your UI**: 
- Shows "Completed ✅"
- Shows "Payment Received: 10,000 PKR"
- Your dashboard shows: `totalReceived: 10,000 PKR`

**My UI**: 
- Shows "Completed ✅"
- Shows "Payment Made: 10,000 PKR"
- My dashboard shows: `totalPaid: 10,000 PKR`

---

### **STEP 12: View Payment Details** 💳

**UI**: Both of us can view payment details

**API Call**: `GET /api/v1/payments/:paymentId`
**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "payment_id_303",
    "exchange": "exchange_id_789",
    "payer": {
      "_id": "my_user_id",
      "username": "initiator_user"
    },
    "payee": {
      "_id": "your_user_id",
      "username": "listing_owner"
    },
    "amount": 10000,
    "currency": "PKR",
    "type": "escrow",
    "status": "captured",
    "timeline": [
      { "at": "2024-01-15T10:30:00Z", "status": "escrowed", "note": "Escrow payment created" },
      { "at": "2024-01-15T11:00:00Z", "status": "captured", "note": "Payment captured upon exchange completion" }
    ]
  }
}
```

---

## 📋 Scenario 2: Listing Type "NEED" (You Need Service)

### **Your Listing**: "I need Web Development help - Will pay 10,000 PKR"

---

### **STEP 1: I Click "Exchange" Button** 👆

**UI**: I'm viewing your listing and click "Propose Exchange" button

**API Call**: `POST /api/v1/exchanges`
**Request Body** (from me):
```json
{
  "requestListing": "listing_id_456",
  "offerSkill": {
    "name": "Web Development",
    "skillId": "skill_id_789",
    "level": "expert",
    "hourlyRate": 10000,
    "currency": "PKR",
    "details": "I can help you with web development"
  },
  "type": "monetary",
  "monetary": {
    "currency": "PKR",
    "totalAmount": 10000
  },
  "notes": "I can provide web development service"
}
```

**Response**: Same as Scenario 1

**What Happens**: Same as Scenario 1

---

### **STEP 2-4: Same as Scenario 1** ✅

- You see proposal
- We chat
- You accept exchange

---

### **STEP 5: We Sign Agreement** ✍️

**Same as Scenario 1**, but payment direction is different:
- **You will pay** (because you need the service)
- **I will receive** (because I'm providing the service)

---

### **STEP 6: YOU Initiate Payment** 💳 (Not Me!)

**UI**: **YOU** see "Make Payment" button (not me!)

**API Call**: `POST /api/v1/exchanges/:exchangeId/initiate-payment`
**Request Body** (from YOU):
```json
{
  "amount": 10000,
  "currency": "PKR",
  "gateway": "stripe"
}
```

**Response**: Same payment intent response

**Your UI**: Shows payment form
**My UI**: Shows "Waiting for Payment"

---

### **STEP 7: YOU Fund Escrow** 💰

**UI**: **YOU** click "Fund Escrow" button

**API Call**: `POST /api/v1/exchanges/:id/fund-escrow`
**Request Body** (from YOU):
```json
{
  "amount": 10000
}
```

**Response**: Same as Scenario 1

**What Happens**:
- Payment created with **YOU as payer**
- **I am the payee** (will receive payment)
- Exchange status: `"escrow_funded"`

**Your UI**: Shows "Escrow Funded - Start Exchange"
**My UI**: Shows "Escrow Funded - Ready to Start"

---

### **STEP 8: Either of Us Can Start** 🚀

**UI**: Either you or I can click "Start Exchange"

**API Call**: `POST /api/v1/exchanges/:id/start`
**Response**: Same as Scenario 1

---

### **STEP 9-11: Same as Scenario 1** 🔨

- Work happens
- Both confirm completion

---

### **STEP 12: Payment Captured** 💰

**What Happens**:
- Exchange status: `"completed"`
- Payment automatically captured
- **I receive payment**: 10,000 PKR added to my `payments.totalReceived`
- **You see payment deducted**: 10,000 PKR added to your `payments.totalPaid`

**My UI**: 
- Shows "Completed ✅"
- Shows "Payment Received: 10,000 PKR"
- My dashboard: `totalReceived: 10,000 PKR`

**Your UI**: 
- Shows "Completed ✅"
- Shows "Payment Made: 10,000 PKR"
- Your dashboard: `totalPaid: 10,000 PKR`

---

## 🔄 Key Differences: Offer vs Need

| Aspect | **OFFER Listing** | **NEED Listing** |
|--------|------------------|------------------|
| **Who Pays** | Initiator (me) | Listing Owner (you) |
| **Who Receives** | Listing Owner (you) | Initiator (me) |
| **Payment Button** | Shows to Initiator | Shows to Listing Owner |
| **Fund Escrow** | Initiator funds | Listing Owner funds |
| **Dashboard Update** | Initiator: `totalPaid++`<br>Owner: `totalReceived++` | Owner: `totalPaid++`<br>Initiator: `totalReceived++` |

---

## 📊 Complete Flow Diagram

### Offer Listing Flow:
```
[Initiator] Proposes Exchange
    ↓
[Listing Owner] Accepts
    ↓
[Both] Sign Agreement
    ↓
[Initiator] Funds Escrow 💰
    ↓
[Listing Owner] Starts Exchange
    ↓
[Work Happens] 🔨
    ↓
[Both] Confirm Completion
    ↓
[Payment Captured] → Listing Owner Receives 💰
```

### Need Listing Flow:
```
[Initiator] Proposes Exchange
    ↓
[Listing Owner] Accepts
    ↓
[Both] Sign Agreement
    ↓
[Listing Owner] Funds Escrow 💰
    ↓
[Either] Starts Exchange
    ↓
[Work Happens] 🔨
    ↓
[Both] Confirm Completion
    ↓
[Payment Captured] → Initiator Receives 💰
```

---

## 🎯 UI States Summary

### Exchange Status Flow:
1. **"proposed"** → Exchange created, waiting for acceptance
2. **"accepted_initial"** → Accepted, waiting for agreement
3. **"agreement_signed"** → Agreement signed, waiting for payment
4. **"escrow_funded"** → Payment in escrow, ready to start
5. **"in_progress"** → Exchange active, work happening
6. **"completed"** → Exchange done, payment captured

### Payment Status Flow:
1. **"escrowed"** → Payment in escrow
2. **"captured"** → Payment released to payee

---

## 💡 Important Notes

1. **Payment Direction**: Determined by listing type
   - Offer → Initiator pays, Owner receives
   - Need → Owner pays, Initiator receives

2. **Agreement Signing**: Both parties must sign before payment

3. **Escrow Funding**: Only the payer can fund escrow

4. **Payment Capture**: Automatic when both parties confirm completion

5. **User Stats**: Updated automatically on payment capture

6. **Thread**: Available throughout the exchange for communication

---

## 🚨 Error Scenarios

### Wrong User Tries to Fund Escrow:
**Error**: `"Only the payer can fund the escrow. For offer listings, initiator must pay."`

### Payment Amount Mismatch:
**Error**: `"Full payment amount must be 10000 PKR"`

### Exchange Not Ready:
**Error**: `"Payment can only be initiated after agreement is signed"`

---

This completes the full UI flow for monetary exchanges! 🎉

