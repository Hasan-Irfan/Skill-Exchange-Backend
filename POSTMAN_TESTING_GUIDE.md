# Postman Testing Guide - Complete Exchange Flow

## 📖 User Story

**As a user**, I want to test the complete exchange functionality from start to finish, including:
- Creating an exchange proposal
- Accepting/declining exchanges
- Signing agreements
- Making payments
- Completing exchanges
- Viewing payment details

**Test Scenario**: 
- **User A (Initiator)**: Creates exchange proposal
- **User B (Listing Owner)**: Receives and manages exchange
- **Listing Type**: "OFFER" (Listing owner offers service, initiator pays)

---

## 🛠️ Prerequisites

1. **Postman Installed**
2. **Backend Server Running** (e.g., `http://localhost:3000`)
3. **Base URL**: `http://localhost:3000/api/v1`
4. **Two User Accounts** (or create them during testing)

---

## 📋 Setup: Authentication

### Step 1: Create User A (Initiator)

**Request**: `POST /api/v1/auth/signup`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "username": "initiator_user",
  "email": "initiator@test.com",
  "password": "password123",
  "bio": "I'm the exchange initiator"
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "User registered successfully",
  "userID": "user_a_id_123",
  "username": "initiator_user",
  "email": "initiator@test.com"
}
```

**💾 Save**: `userA_id = "user_a_id_123"`

---

### Step 2: Login as User A

**Request**: `POST /api/v1/auth/login`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "email": "initiator@test.com",
  "password": "password123"
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Logged in successfully",
  "username": "initiator_user",
  "userID": "user_a_id_123",
  "email": "initiator@test.com",
  "roles": [],
  "avatarUrl": null,
  "bio": "I'm the exchange initiator",
  "status": "active",
  "rating": 0,
  "location": null
}
```

**💾 Save**: 
- `userA_token` = Copy from cookies: `accessToken` OR from response headers
- Set as Postman environment variable: `{{userA_token}}`

**📝 Note**: If tokens are in cookies, enable "Send cookies" in Postman settings. Otherwise, extract from response and use in Authorization header.

---

### Step 3: Create User B (Listing Owner)

**Request**: `POST /api/v1/auth/signup`

**Body**:
```json
{
  "username": "listing_owner",
  "email": "owner@test.com",
  "password": "password123",
  "bio": "I own the listing"
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "User registered successfully",
  "userID": "user_b_id_456",
  "username": "listing_owner",
  "email": "owner@test.com"
}
```

**💾 Save**: `userB_id = "user_b_id_456"`

---

### Step 4: Login as User B

**Request**: `POST /api/v1/auth/login`

**Body**:
```json
{
  "email": "owner@test.com",
  "password": "password123"
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Logged in successfully",
  "username": "listing_owner",
  "userID": "user_b_id_456",
  "email": "owner@test.com",
  "roles": [],
  "avatarUrl": null,
  "bio": "I own the listing",
  "status": "active",
  "rating": 0,
  "location": null
}
```

**💾 Save**: 
- `userB_token` = Copy from cookies or headers
- Set as Postman environment variable: `{{userB_token}}`

---

### Step 5: Create Listing (as User B)

**📝 Note**: Assuming you have a listing creation endpoint. If not, create a listing manually in the database or skip this step and use an existing listing ID.

**Request**: `POST /api/v1/listings` (or your listing creation endpoint)

**Headers**:
```
Authorization: Bearer {{userB_token}}
Content-Type: application/json
```

**Body**:
```json
{
  "title": "Web Development Services",
  "skill": "skill_id_web_dev",
  "type": "offer",
  "hourlyRate": 10000,
  "description": "Professional web development services"
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "listing_id_789",
    "title": "Web Development Services",
    "owner": "user_b_id_456",
    "type": "offer",
    "hourlyRate": 10000,
    "active": true
  }
}
```

**💾 Save**: `listing_id = "listing_id_789"`

---

## 🎯 Exchange Flow Testing

### Step 6: User A Creates Exchange Proposal

**User Story**: *As User A, I want to propose an exchange for User B's listing*

**Request**: `POST /api/v1/exchanges`

**Headers**:
```
Authorization: Bearer {{userA_token}}
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "requestListing": "listing_id_789",
  "offerSkill": {
    "name": "Graphic Design",
    "skillId": "skill_id_graphic",
    "level": "intermediate",
    "hourlyRate": 5000,
    "currency": "PKR",
    "details": "I can help with logo design and branding"
  },
  "type": "monetary",
  "monetary": {
    "currency": "PKR",
    "totalAmount": 10000
  },
  "notes": "I need your web development service for my project"
}
```

**Expected Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_101",
    "initiator": "user_a_id_123",
    "receiver": "user_b_id_456",
    "status": "proposed",
    "type": "monetary",
    "monetary": {
      "currency": "PKR",
      "totalAmount": 10000
    },
    "offer": {
      "skillSnapshot": {
        "name": "Graphic Design",
        "level": "intermediate",
        "hourlyRate": 5000,
        "currency": "PKR"
      },
      "notes": "I need your web development service for my project"
    },
    "request": {
      "listing": "listing_id_789",
      "notes": "I need your web development service for my project"
    },
    "thread": "thread_id_202",
    "audit": [
      {
        "at": "2024-01-15T10:00:00.000Z",
        "by": "user_a_id_123",
        "action": "created"
      }
    ],
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**💾 Save**: 
- `exchange_id = "exchange_id_101"`
- `thread_id = "thread_id_202"`

**✅ Verification**:
- Status is `"proposed"`
- Initiator is User A
- Receiver is User B
- Thread created for messaging

---

### Step 7: User B Views Exchange Details

**User Story**: *As User B, I want to see the exchange proposal details*

**Request**: `GET /api/v1/exchanges/:id`

**Headers**:
```
Authorization: Bearer {{userB_token}}
```

**URL Parameters**:
- `id`: `exchange_id_101`

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_101",
    "initiator": {
      "_id": "user_a_id_123",
      "username": "initiator_user",
      "email": "initiator@test.com"
    },
    "receiver": {
      "_id": "user_b_id_456",
      "username": "listing_owner",
      "email": "owner@test.com"
    },
    "status": "proposed",
    "type": "monetary",
    "monetary": {
      "currency": "PKR",
      "totalAmount": 10000
    },
    "offer": {
      "skillSnapshot": {
        "name": "Graphic Design",
        "level": "intermediate"
      }
    },
    "request": {
      "listing": "listing_id_789",
      "listingSnapshot": {
        "title": "Web Development Services"
      }
    },
    "thread": "thread_id_202",
    "audit": [
      {
        "at": "2024-01-15T10:00:00.000Z",
        "by": "user_a_id_123",
        "action": "created"
      }
    ]
  }
}
```

**✅ Verification**:
- Can see full exchange details
- Status is `"proposed"`
- Can see initiator's offer

---

### Step 8: User B Accepts Exchange

**User Story**: *As User B, I want to accept the exchange proposal*

**Request**: `POST /api/v1/exchanges/:id/accept`

**Headers**:
```
Authorization: Bearer {{userB_token}}
Content-Type: application/json
```

**URL Parameters**:
- `id`: `exchange_id_101`

**Body** (raw JSON):
```json
{}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_101",
    "status": "accepted_initial",
    "audit": [
      {
        "at": "2024-01-15T10:00:00.000Z",
        "by": "user_a_id_123",
        "action": "created"
      },
      {
        "at": "2024-01-15T10:05:00.000Z",
        "by": "user_b_id_456",
        "action": "accepted"
      }
    ],
    "updatedAt": "2024-01-15T10:05:00.000Z"
  }
}
```

**✅ Verification**:
- Status changed to `"accepted_initial"`
- Audit trail updated with "accepted" action

---

### Step 9: User A Signs Agreement

**User Story**: *As User A, I want to sign the agreement with terms*

**Request**: `POST /api/v1/exchanges/:id/sign-agreement`

**Headers**:
```
Authorization: Bearer {{userA_token}}
Content-Type: application/json
```

**URL Parameters**:
- `id`: `exchange_id_101`

**Body** (raw JSON):
```json
{
  "signed": true,
  "newTerms": [
    "Project completion in 2 weeks",
    "Payment upon completion",
    "Both parties must confirm completion"
  ],
  "type": "monetary",
  "monetary": {
    "totalAmount": 10000,
    "currency": "PKR"
  }
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_101",
    "status": "accepted_initial",
    "agreement": {
      "terms": [
        "Project completion in 2 weeks",
        "Payment upon completion",
        "Both parties must confirm completion"
      ],
      "signedBy": ["user_a_id_123"]
    },
    "monetary": {
      "currency": "PKR",
      "totalAmount": 10000
    },
    "audit": [
      {
        "at": "2024-01-15T10:00:00.000Z",
        "by": "user_a_id_123",
        "action": "created"
      },
      {
        "at": "2024-01-15T10:05:00.000Z",
        "by": "user_b_id_456",
        "action": "accepted"
      },
      {
        "at": "2024-01-15T10:10:00.000Z",
        "by": "user_a_id_123",
        "action": "agreement_signed"
      }
    ]
  }
}
```

**✅ Verification**:
- Agreement terms added
- User A in `signedBy` array
- Status still `"accepted_initial"` (waiting for User B)

---

### Step 10: User B Signs Agreement

**User Story**: *As User B, I want to sign the agreement*

**Request**: `POST /api/v1/exchanges/:id/sign-agreement`

**Headers**:
```
Authorization: Bearer {{userB_token}}
Content-Type: application/json
```

**URL Parameters**:
- `id`: `exchange_id_101`

**Body** (raw JSON):
```json
{
  "signed": true
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_101",
    "status": "agreement_signed",
    "agreement": {
      "terms": [
        "Project completion in 2 weeks",
        "Payment upon completion",
        "Both parties must confirm completion"
      ],
      "signedBy": ["user_a_id_123", "user_b_id_456"]
    },
    "monetary": {
      "currency": "PKR",
      "totalAmount": 10000
    },
    "audit": [
      {
        "at": "2024-01-15T10:00:00.000Z",
        "by": "user_a_id_123",
        "action": "created"
      },
      {
        "at": "2024-01-15T10:05:00.000Z",
        "by": "user_b_id_456",
        "action": "accepted"
      },
      {
        "at": "2024-01-15T10:10:00.000Z",
        "by": "user_a_id_123",
        "action": "agreement_signed"
      },
      {
        "at": "2024-01-15T10:15:00.000Z",
        "by": "user_b_id_456",
        "action": "agreement_signed"
      }
    ]
  }
}
```

**✅ Verification**:
- Status changed to `"agreement_signed"` ✅
- Both users in `signedBy` array
- Ready for payment

---

### Step 11: User A Initiates Payment (Optional - Dummy Payment)

**User Story**: *As User A, I want to initiate payment before funding escrow*

**Request**: `POST /api/v1/exchanges/:exchangeId/initiate-payment`

**Headers**:
```
Authorization: Bearer {{userA_token}}
Content-Type: application/json
```

**URL Parameters**:
- `exchangeId`: `exchange_id_101`

**Body** (raw JSON):
```json
{
  "amount": 10000,
  "currency": "PKR",
  "gateway": "stripe"
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "paymentIntent": {
    "id": "sim_exchange_101_1705315200000",
    "amount": 10000,
    "currency": "PKR",
    "gateway": "stripe",
    "gatewayRef": "gateway_exchange_101_1705315200000",
    "status": "requires_payment_method",
    "clientSecret": "sk_test_gateway_exchange_101_1705315200000",
    "redirectUrl": null,
    "simulated": true
  },
  "message": "Payment intent created. Use the clientSecret or redirectUrl to complete payment.",
  "nextStep": "Call /exchanges/:id/fund-escrow after payment is confirmed"
}
```

**✅ Verification**:
- Payment intent created
- Returns simulated gateway response
- Ready for escrow funding

---

### Step 12: User A Funds Escrow

**User Story**: *As User A, I want to fund the escrow with full payment*

**Request**: `POST /api/v1/exchanges/:id/fund-escrow`

**Headers**:
```
Authorization: Bearer {{userA_token}}
Content-Type: application/json
```

**URL Parameters**:
- `id`: `exchange_id_101`

**Body** (raw JSON):
```json
{
  "amount": 10000
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_101",
    "status": "escrow_funded",
    "monetary": {
      "currency": "PKR",
      "totalAmount": 10000,
      "escrowPaymentId": "payment_id_303"
    },
    "audit": [
      {
        "at": "2024-01-15T10:00:00.000Z",
        "by": "user_a_id_123",
        "action": "created"
      },
      {
        "at": "2024-01-15T10:05:00.000Z",
        "by": "user_b_id_456",
        "action": "accepted"
      },
      {
        "at": "2024-01-15T10:10:00.000Z",
        "by": "user_a_id_123",
        "action": "agreement_signed"
      },
      {
        "at": "2024-01-15T10:15:00.000Z",
        "by": "user_b_id_456",
        "action": "agreement_signed"
      },
      {
        "at": "2024-01-15T10:20:00.000Z",
        "by": "user_a_id_123",
        "action": "payment_escrowed"
      }
    ],
    "updatedAt": "2024-01-15T10:20:00.000Z"
  }
}
```

**💾 Save**: `payment_id = "payment_id_303"`

**✅ Verification**:
- Status changed to `"escrow_funded"` ✅
- `escrowPaymentId` set
- Payment created in escrow

---

### Step 13: View Payment Details

**User Story**: *As User A, I want to view the payment I just created*

**Request**: `GET /api/v1/payments/:id`

**Headers**:
```
Authorization: Bearer {{userA_token}}
```

**URL Parameters**:
- `id`: `payment_id_303`

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "payment_id_303",
    "exchange": {
      "_id": "exchange_id_101",
      "status": "escrow_funded",
      "type": "monetary"
    },
    "payer": {
      "_id": "user_a_id_123",
      "username": "initiator_user",
      "email": "initiator@test.com"
    },
    "payee": null,
    "amount": 10000,
    "currency": "PKR",
    "type": "escrow",
    "status": "escrowed",
    "timeline": [
      {
        "at": "2024-01-15T10:20:00.000Z",
        "status": "escrowed",
        "note": "Escrow payment created for exchange exchange_id_101"
      }
    ],
    "createdAt": "2024-01-15T10:20:00.000Z",
    "updatedAt": "2024-01-15T10:20:00.000Z"
  }
}
```

**✅ Verification**:
- Payment status is `"escrowed"`
- Payer is User A
- Payee is null (will be set on capture)
- Amount is 10,000 PKR

---

### Step 14: User B Starts Exchange

**User Story**: *As User B, I want to start the exchange work*

**Request**: `POST /api/v1/exchanges/:id/start`

**Headers**:
```
Authorization: Bearer {{userB_token}}
Content-Type: application/json
```

**URL Parameters**:
- `id`: `exchange_id_101`

**Body** (raw JSON):
```json
{}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_101",
    "status": "in_progress",
    "audit": [
      {
        "at": "2024-01-15T10:00:00.000Z",
        "by": "user_a_id_123",
        "action": "created"
      },
      {
        "at": "2024-01-15T10:05:00.000Z",
        "by": "user_b_id_456",
        "action": "accepted"
      },
      {
        "at": "2024-01-15T10:10:00.000Z",
        "by": "user_a_id_123",
        "action": "agreement_signed"
      },
      {
        "at": "2024-01-15T10:15:00.000Z",
        "by": "user_b_id_456",
        "action": "agreement_signed"
      },
      {
        "at": "2024-01-15T10:20:00.000Z",
        "by": "user_a_id_123",
        "action": "payment_escrowed"
      },
      {
        "at": "2024-01-15T10:25:00.000Z",
        "by": "user_b_id_456",
        "action": "started"
      }
    ],
    "updatedAt": "2024-01-15T10:25:00.000Z"
  }
}
```

**✅ Verification**:
- Status changed to `"in_progress"` ✅
- Audit trail updated

---

### Step 15: User A Confirms Completion (First)

**User Story**: *As User A, I want to confirm that the work is complete*

**Request**: `POST /api/v1/exchanges/:id/confirm-complete`

**Headers**:
```
Authorization: Bearer {{userA_token}}
Content-Type: application/json
```

**URL Parameters**:
- `id`: `exchange_id_101`

**Body** (raw JSON):
```json
{}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_101",
    "status": "in_progress",
    "confirmations": {
      "initiator": true,
      "receiver": false
    },
    "audit": [
      // ... previous audit entries
      {
        "at": "2024-01-15T10:30:00.000Z",
        "by": "user_a_id_123",
        "action": "completion_confirmed"
      }
    ]
  }
}
```

**✅ Verification**:
- Status still `"in_progress"` (waiting for User B)
- `confirmations.initiator` is `true`
- `confirmations.receiver` is `false`

---

### Step 16: User B Confirms Completion (Second)

**User Story**: *As User B, I want to confirm completion and release payment*

**Request**: `POST /api/v1/exchanges/:id/confirm-complete`

**Headers**:
```
Authorization: Bearer {{userB_token}}
Content-Type: application/json
```

**URL Parameters**:
- `id`: `exchange_id_101`

**Body** (raw JSON):
```json
{}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_101",
    "status": "completed",
    "completedAt": "2024-01-15T10:35:00.000Z",
    "confirmations": {
      "initiator": true,
      "receiver": true
    },
    "audit": [
      // ... previous audit entries
      {
        "at": "2024-01-15T10:30:00.000Z",
        "by": "user_a_id_123",
        "action": "completion_confirmed"
      },
      {
        "at": "2024-01-15T10:35:00.000Z",
        "by": "user_b_id_456",
        "action": "completed"
      }
    ],
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

**✅ Verification**:
- Status changed to `"completed"` ✅
- `completedAt` timestamp set
- Both confirmations are `true`
- Payment automatically captured (check next step)

---

### Step 17: Verify Payment Captured

**User Story**: *As User B, I want to verify that payment was captured*

**Request**: `GET /api/v1/payments/:id`

**Headers**:
```
Authorization: Bearer {{userB_token}}
```

**URL Parameters**:
- `id`: `payment_id_303`

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "payment_id_303",
    "exchange": {
      "_id": "exchange_id_101",
      "status": "completed",
      "type": "monetary"
    },
    "payer": {
      "_id": "user_a_id_123",
      "username": "initiator_user",
      "email": "initiator@test.com"
    },
    "payee": {
      "_id": "user_b_id_456",
      "username": "listing_owner",
      "email": "owner@test.com"
    },
    "amount": 10000,
    "currency": "PKR",
    "type": "escrow",
    "status": "captured",
    "timeline": [
      {
        "at": "2024-01-15T10:20:00.000Z",
        "status": "escrowed",
        "note": "Escrow payment created for exchange exchange_id_101"
      },
      {
        "at": "2024-01-15T10:35:00.000Z",
        "status": "captured",
        "note": "Payment captured upon exchange completion"
      }
    ],
    "createdAt": "2024-01-15T10:20:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

**✅ Verification**:
- Payment status is `"captured"` ✅
- Payee is User B (listing owner) ✅
- Timeline shows capture event
- User B's `payments.totalReceived` should be updated (check dashboard)

---

### Step 18: View User B's Payment Statistics

**User Story**: *As User B, I want to see my payment statistics*

**Request**: `GET /api/v1/users/:id` (or your user profile endpoint)

**Headers**:
```
Authorization: Bearer {{userB_token}}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "user_b_id_456",
    "username": "listing_owner",
    "email": "owner@test.com",
    "payments": {
      "totalReceived": 10000,
      "totalPaid": 0,
      "receivedCount": 1,
      "paidCount": 0,
      "currency": "PKR"
    }
  }
}
```

**✅ Verification**:
- `totalReceived` is 10,000 PKR ✅
- `receivedCount` is 1 ✅

---

### Step 19: View User A's Payment Statistics

**User Story**: *As User A, I want to see my payment statistics*

**Request**: `GET /api/v1/users/:id` (or your user profile endpoint)

**Headers**:
```
Authorization: Bearer {{userA_token}}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "user_a_id_123",
    "username": "initiator_user",
    "email": "initiator@test.com",
    "payments": {
      "totalReceived": 0,
      "totalPaid": 10000,
      "receivedCount": 0,
      "paidCount": 1,
      "currency": "PKR"
    }
  }
}
```

**✅ Verification**:
- `totalPaid` is 10,000 PKR ✅
- `paidCount` is 1 ✅

---

### Step 20: View All Payments for Exchange

**User Story**: *As either user, I want to see all payments for this exchange*

**Request**: `GET /api/v1/exchanges/:exchangeId/payments`

**Headers**:
```
Authorization: Bearer {{userA_token}}
```

**URL Parameters**:
- `exchangeId`: `exchange_id_101`

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "_id": "payment_id_303",
      "exchange": "exchange_id_101",
      "payer": {
        "_id": "user_a_id_123",
        "username": "initiator_user"
      },
      "payee": {
        "_id": "user_b_id_456",
        "username": "listing_owner"
      },
      "amount": 10000,
      "currency": "PKR",
      "type": "escrow",
      "status": "captured",
      "createdAt": "2024-01-15T10:20:00.000Z"
    }
  ]
}
```

**✅ Verification**:
- Can see all payments for exchange
- Payment details visible

---

## 🧪 Additional Test Scenarios

### Test 21: Decline Exchange

**User Story**: *As User B, I want to decline an exchange proposal*

**Request**: `POST /api/v1/exchanges/:id/decline`

**Headers**:
```
Authorization: Bearer {{userB_token}}
Content-Type: application/json
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_101",
    "status": "declined",
    "audit": [
      // ... previous entries
      {
        "at": "2024-01-15T10:40:00.000Z",
        "by": "user_b_id_456",
        "action": "declined"
      }
    ]
  }
}
```

---

### Test 22: Cancel Exchange (Before Completion)

**User Story**: *As User A, I want to cancel an exchange and get refund*

**Request**: `POST /api/v1/exchanges/:id/cancel`

**Headers**:
```
Authorization: Bearer {{userA_token}}
Content-Type: application/json
```

**Body**:
```json
{
  "reason": "Change of plans"
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_101",
    "status": "cancelled",
    "audit": [
      // ... previous entries
      {
        "at": "2024-01-15T10:45:00.000Z",
        "by": "user_a_id_123",
        "action": "cancelled"
      }
    ]
  }
}
```

**✅ Verification**:
- Exchange status is `"cancelled"`
- Payment should be refunded (check payment status)

---

### Test 23: Dispute Exchange

**User Story**: *As User A, I want to dispute an exchange*

**Request**: `POST /api/v1/exchanges/:id/dispute`

**Headers**:
```
Authorization: Bearer {{userA_token}}
Content-Type: application/json
```

**Body**:
```json
{
  "reason": "Service quality not as expected"
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "exchange_id_101",
    "status": "disputed",
    "audit": [
      // ... previous entries
      {
        "at": "2024-01-15T10:50:00.000Z",
        "by": "user_a_id_123",
        "action": "disputed",
        "note": "Service quality not as expected"
      }
    ]
  }
}
```

---

## 📊 Test Checklist

### ✅ Exchange Flow
- [ ] Create exchange proposal
- [ ] View exchange details
- [ ] Accept exchange
- [ ] Decline exchange (alternative)
- [ ] Sign agreement (both parties)
- [ ] Fund escrow
- [ ] Start exchange
- [ ] Confirm completion (both parties)
- [ ] Exchange completed

### ✅ Payment Flow
- [ ] Initiate payment (optional)
- [ ] Fund escrow
- [ ] View payment details
- [ ] Payment captured on completion
- [ ] View payment statistics
- [ ] View exchange payments

### ✅ Edge Cases
- [ ] Cancel exchange (refund)
- [ ] Dispute exchange
- [ ] Wrong user tries to fund escrow
- [ ] Payment amount mismatch
- [ ] Exchange not ready for payment

---

## 🔧 Postman Environment Variables

Set these in Postman:

```
base_url = http://localhost:3000/api/v1
userA_token = <token from login>
userB_token = <token from login>
exchange_id = <exchange ID>
payment_id = <payment ID>
thread_id = <thread ID>
listing_id = <listing ID>
```

---

## 📝 Notes

1. **Authentication**: Tokens expire in 45 minutes. Re-login if needed.
2. **Payment Direction**: For "offer" listings, initiator pays. For "need" listings, listing owner pays.
3. **Idempotency**: Most operations are idempotent (safe to retry).
4. **Transactions**: Payment operations use MongoDB transactions for safety.
5. **User Stats**: Payment statistics update automatically on capture/refund.

---

## 🎯 Success Criteria

✅ Exchange flows from `proposed` → `accepted_initial` → `agreement_signed` → `escrow_funded` → `in_progress` → `completed`

✅ Payment flows from `escrowed` → `captured`

✅ User payment statistics update correctly

✅ All API calls return expected responses

✅ Authorization works correctly (users can only access their exchanges)

---

**Happy Testing! 🚀**

