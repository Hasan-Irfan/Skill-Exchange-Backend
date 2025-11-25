# Admin Postman Story Guide

This guide explains how to exercise every critical admin pathway that involves:
- `exchangeServices.js` (exchange lifecycle, disputes, payments)
- `adminService.js` (role management, user moderation, dispute resolution)
- `listingService.js` (protected listing updates / deletions)

We use a **story-driven scenario** so the Postman collection can be scripted end-to-end.

---

## Characters & Fixtures

| Actor | Role(s) | Description |
|-------|---------|-------------|
| **User A (Alice)** | initiator / buyer | Creates exchanges, funds escrow when required |
| **User B (Bob)**   | receiver / seller | Owns the listing, provides or receives services |
| **User C (Chloe)** | admin (superAdmin) | Resolves disputes, manages users and listings |

Pre-create the following across environments:

| Key | Value | Notes |
|-----|-------|-------|
| `LISTING_OFFER_ID` | Listing owned by Bob (`type: "offer"`) | Buyer pays seller (monetary / hybrid) |
| `LISTING_NEED_ID`  | Listing owned by Bob (`type: "need"`)  | Bob needs service; Bob pays Alice |
| `TOKEN_ALICE` | JWT for User A |
| `TOKEN_BOB`   | JWT for User B |
| `TOKEN_ADMIN` | JWT for User C (contains `"admin"` & `"superAdmin"` roles) |

All requests use base URL: `{{BASE_URL}} = http://localhost:4000/api/v1`

Add the header: `Authorization: Bearer {{TOKEN_*}}` in each request.

---

## 📋 Scenario: Monetary Dispute (Offer Listing)

**Characters**
- **User A – Alice (initiator/buyer)**
- **User B – Bob (listing owner/seller)**
- **User C – Chloe (admin/superAdmin)**

**Goal**: Walk through every request as if you were running a Postman collection, matching the style of `MONETARY_EXCHANGE_UI_FLOW.md`. Each step shows the exact body and expected response so you can copy/paste into Postman.

### **STEP 1: Alice creates exchange** 👤➡️📄
**API**: `POST /api/v1/exchanges`  
**Service**: `createExchangeService`
```json
{
  "requestListing": "{{LISTING_OFFER_ID}}",
  "type": "monetary",
  "monetary": { "currency": "PKR", "totalAmount": 5000 },
  "notes": "Need 5 hours of tutoring"
}
```
**Response**
```json
{
  "success": true,
  "data": {
    "_id": "{{EXCHANGE_ID}}",
    "status": "proposed",
    "type": "monetary",
    "request": { "listing": "{{LISTING_OFFER_ID}}" },
    "monetary": { "currency": "PKR", "totalAmount": 5000 }
  }
}
```

### **STEP 2: Bob accepts proposal** ✅
**API**: `POST /api/v1/exchanges/{{EXCHANGE_ID}}/accept`  
**Body**: `{}`  
**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "{{EXCHANGE_ID}}",
    "status": "accepted_initial",
    "audit": [
      { "action": "created", "by": "{{USER_A}}" },
      { "action": "accepted", "by": "{{USER_B}}" }
    ]
  }
}
```

### **STEP 3: Agreement signed (both users)** ✍️
**API**: `POST /api/v1/exchanges/{{EXCHANGE_ID}}/sign-agreement`

- Alice signs first:
```json
{
  "signed": true,
  "monetary": { "totalAmount": 5000, "currency": "PKR" },
  "type": "monetary",
  "newTerms": ["Provide 5 hours tutoring"]
}
```
- Bob signs second:
```json
{ "signed": true }
```
**Response after second signature**
```json
{
  "success": true,
  "data": {
    "_id": "{{EXCHANGE_ID}}",
    "status": "agreement_signed",
    "agreement": { "signedBy": ["{{USER_A}}","{{USER_B}}"] }
  }
}
```

### **STEP 4: Alice funds escrow** 💰
**API**: `POST /api/v1/exchanges/{{EXCHANGE_ID}}/fund-escrow`
```json
{ "amount": 5000 }
```
**Response**
```json
{
  "success": true,
  "data": {
    "_id": "{{EXCHANGE_ID}}",
    "status": "escrow_funded",
    "monetary": {
      "currency": "PKR",
      "totalAmount": 5000,
      "escrowPaymentId": "{{PAYMENT_ID}}"
    }
  }
}
```

### **STEP 5: Bob starts exchange** 🚀
`POST /api/v1/exchanges/{{EXCHANGE_ID}}/start` → `{ "success": true, "data": { "status": "in_progress" } }`

### **STEP 6: Bob disputes completion** ⚠️
**API**: `POST /api/v1/exchanges/{{EXCHANGE_ID}}/dispute`
```json
{ "reason": "Tutor missed 3 sessions" }
```
**Response**
```json
{
  "success": true,
  "data": {
    "_id": "{{EXCHANGE_ID}}",
    "status": "disputed",
    "dispute": {
      "raisedBy": "{{USER_B}}",
      "reason": "Tutor missed 3 sessions"
    }
  }
}
```

### **STEP 7: Bob files a report (optional but recommended)** 📝
**API**: `POST /api/v1/reports`
```json
{
  "againstUser": "{{USER_A}}",
  "exchange": "{{EXCHANGE_ID}}",
  "type": "fraud",
  "description": "Tutor collected money but skipped sessions",
  "evidence": ["https://proof.example/chat.png"]
}
```
**Response**
```json
{
  "success": true,
  "data": {
    "_id": "{{REPORT_ID}}",
    "status": "open",
    "priority": "urgent"
  }
}
```

### **STEP 8: Admin Chloe lists open disputes** 👩‍⚖️
**API**: `GET /api/v1/admin/reports?status=open&priority=urgent`

### **STEP 9: Admin assigns report** 📌
`POST /api/v1/admin/reports/{{REPORT_ID}}/assign` → `{ "success": true, "data": { "status": "under_review", "assignedTo": "{{ADMIN_ID}}" } }`

### **STEP 10: Admin resolves exchange dispute** 🧾
**API**: `POST /api/v1/admin/exchanges/{{EXCHANGE_ID}}/resolve-dispute`
```json
{
  "paymentAction": "refund",
  "reason": "Tutor missed sessions; refunding payer",
  "note": "Evidence supports Bob"
}
```
**Response**
```json
{
  "success": true,
  "data": {
    "_id": "{{EXCHANGE_ID}}",
    "status": "resolved",
    "audit": [
      { "action": "admin_resolved_dispute", "by": "{{ADMIN_ID}}" }
    ]
  }
}
```

### **STEP 11: Admin closes report and suspends user** 🔒
**Update report**
```
PATCH /api/v1/admin/reports/{{REPORT_ID}}
{
  "status": "resolved",
  "actionTaken": "suspend",
  "resolution": "Suspended Alice for 7 days",
  "note": "Repeated no-shows"
}
```
**Suspend user**
```
POST /api/v1/admin/manage-user-status
{
  "targetUserId": "{{USER_A}}",
  "action": "suspend",
  "duration": 7,
  "durationUnit": "days",
  "reason": "Repeated disputes"
}
```

This step-by-step mirrors the UI-guide style with explicit Postman-ready bodies and expected responses. The rest of the document dives deeper into variations.

---

## 1. Exchange Lifecycle (Monetary Story)

> **Story**: Alice (initiator) wants Bob’s offer listing. They negotiate a monetary exchange, escrow fails, Bob disputes completion, and admin Chloe resolves it.

### Step 1 – Alice creates exchange
```
POST {{BASE_URL}}/exchanges
Authorization: Bearer {{TOKEN_ALICE}}
Body:
{
  "requestListing": "{{LISTING_OFFER_ID}}",
  "monetary": { "totalAmount": 5000, "currency": "PKR" },
  "notes": "Need 5 hours of tutoring",
  "type": "monetary"
}
```
**Expected**: `201` with `status: "proposed"`, `type: "monetary"`.

**Edge cases**:
- Missing `requestListing` → `400`
- `offerSkill`/`monetary` both missing → `400`
- Initiator equals listing owner → `400`, “Cannot propose to yourself”

### Step 2 – Bob accepts proposal
```
POST {{BASE_URL}}/exchanges/{{EXCHANGE_ID}}/accept
Authorization: Bearer {{TOKEN_BOB}}
```
**Expected**: `status: "accepted_initial"`, thread created.

**Edge cases**:
- Alice attempts accept → `400`, “Only receiver can respond”
- Exchange not `proposed` → `400`

### Step 3 – Agreement signatures (both parties)
```
POST {{BASE_URL}}/exchanges/{{EXCHANGE_ID}}/sign-agreement
Authorization: Bearer {{TOKEN_ALICE}}
Body:
{
  "signed": true,
  "monetary": { "totalAmount": 5000, "currency": "PKR" }
}
```
Repeat for Bob. Expected after both sign: `status: "agreement_signed"`.

**Edge cases**:
- Missing monetary total/currency for monetary/hybrid when signing → `400`
- Trying to add monetary fields to barter type → `400`

### Step 4 – Alice funds escrow
```
POST {{BASE_URL}}/exchanges/{{EXCHANGE_ID}}/fund-escrow
Authorization: Bearer {{TOKEN_ALICE}}
Body: { "amount": 5000 }
```
**Expected**: `status: "escrow_funded"`, `monetary.escrowPaymentId` returned.

**Edge cases**:
- Bob attempts to fund → `400`, “Only the payer can fund the escrow”
- Currency mismatch → `400`
- Amount not equal to agreed total → `400`
- Barter exchange funding attempt → `400`

### Step 5 – Exchange start
```
POST {{BASE_URL}}/exchanges/{{EXCHANGE_ID}}/start
Authorization: Bearer {{TOKEN_BOB}}
```
**Expected**: `status: "in_progress"`.

Edge cases:
- Start before escrow funded (monetary/hybrid) → `400`
- Start after completion → returns existing state (idempotent)

### Step 6 – Completion confirmations
```
POST {{BASE_URL}}/exchanges/{{EXCHANGE_ID}}/confirm-complete
Authorization: Bearer {{TOKEN_ALICE}}
```
Then Bob. On second confirmation, exchange becomes `completed` and escrow auto-captures.

Edge cases:
- Confirm when not `in_progress` → `400`
- Duplicate confirm → `200` with unchanged status (idempotent)

### Step 7 – Dispute raised
Bob claims Alice mis-represented work.
```
POST {{BASE_URL}}/exchanges/{{EXCHANGE_ID}}/dispute
Authorization: Bearer {{TOKEN_BOB}}
Body: { "reason": "Work quality unacceptable" }
```
**Expected**: `status: "disputed"`, `dispute.raisedBy` = Bob.

Edge cases:
- Dispute when status not `in_progress`/`completed` → `400`
- Non-participant disputes → `400`

### Step 8 – Admin resolves dispute in Bob’s favor (refund payer)
```
POST {{BASE_URL}}/admin/exchanges/{{EXCHANGE_ID}}/resolve-dispute
Authorization: Bearer {{TOKEN_ADMIN}}
Body: {
  "paymentAction": "refund",
  "reason": "Work not proven",
  "note": "Refunding Alice's payment"
}
```
**Expected**:
- Exchange `status: "resolved"`
- Payment status `refunded`
- Audit entry `admin_resolved_dispute`

Edge cases:
- Exchange not `disputed` → `400`
- Missing escrow (barter) → payment action skipped (no error)
- Non-admin tries route → `403`

---

## 2. Hybrid Exchange Scenario (Partial barter + money)

> **Story**: Alice offers her skill + PKR 2,000 for Bob’s offer listing. After partial completion, Alice disputes and admin releases partial payment.

### 2.1 Create hybrid proposal
```
POST /exchanges
Authorization: Bearer {{TOKEN_ALICE}}
Body:
{
  "requestListing": "{{LISTING_OFFER_ID}}",
  "offerSkill": {
    "skillId": "{{SKILL_ID}}",
    "name": "Photography edit",
    "level": "expert",
    "hourlyRate": 2000
  },
  "monetary": { "totalAmount": 2000, "currency": "PKR" },
  "type": "hybrid",
  "notes": "I will edit your photos + small cash top-up"
}
```

Flow follows Steps 2-6 above (agreement, escrow for monetary portion, start).

### 2.2 Alice disputes for partial work
```
POST /exchanges/{{ID}}/dispute
Authorization: Bearer {{TOKEN_ALICE}}
Body: { "reason": "Only half the assets delivered" }
```

### 2.3 Admin resolves with release (Bob gets funds) but logs split
```
POST /admin/exchanges/{{ID}}/resolve-dispute
Authorization: Bearer {{TOKEN_ADMIN}}
Body: {
  "paymentAction": "release",
  "note": "Evidence shows deliverables were met; releasing escrow."
}
```
*Hybrid note*: barter side is handled outside payment. Admin should update report`s `actionTaken` = `none` or `warning`.

### 2.4 Testing split (future enhancement)
```
POST /admin/exchanges/{{ID}}/resolve-dispute
Body: {
  "paymentAction": "split",
  "splitNote": "50/50 settlement agreed",
  "note": "Manual settlement"
}
```
Currently logs audit `payment_split_requested` for reference.

---

## 3. Barter Exchange Scenario (No payment)

> **Story**: Listing type `need`. Bob needs a website; Alice offers service via barter exchange. No escrow. After completion Bob disputes the outcome.

### 3.1 Create barter exchange
```
POST /exchanges
Authorization: Bearer {{TOKEN_ALICE}}
Body:
{
  "requestListing": "{{LISTING_NEED_ID}}",
  "offerSkill": {
    "skillId": "{{SKILL_WEB}}",
    "name": "Web Design",
    "level": "expert"
  },
  "type": "barter",
  "notes": "Will build landing page in exchange for marketing help"
}
```
No escrow steps; after both sign agreement, call `POST /exchanges/{{ID}}/start`. Completion uses `confirm-complete` as usual.

### 3.2 Bob disputes
```
POST /exchanges/{{ID}}/dispute
Authorization: Bearer {{TOKEN_BOB}}
Body: { "reason": "Website never deployed" }
```

### 3.3 Admin resolution (no payment)
```
POST /admin/exchanges/{{ID}}/resolve-dispute
Authorization: Bearer {{TOKEN_ADMIN}}
Body: {
  "note": "Verified: site was not delivered. Recorded warning."
}
```
Since barter, `paymentAction` is optional and ignored. Admin should additionally call report endpoints if penalties needed.

---

## 4. Report + Admin Actions Story

> Suppose Bob files a report after or during a dispute to provide evidence against Alice. This is separate from the dispute status and feeds the admin’s report queue. Use reports whenever you need policy enforcement (warnings, suspensions) or want to document behavior outside escrow release logic.

### 4.1 When to call dispute vs report

| Situation | API | Body Example |
|-----------|-----|--------------|
| Exchange execution must halt and escrow locked | `POST /exchanges/{{ID}}/dispute` | `{ "reason": "Service not delivered" }`
| No exchange or you simply need to alert admins to misconduct | `POST /reports` | `{ "againstUser": "...", "type": "fraud", "description": "..." }`
| You already disputed but also want an evidence trail subject to SLA (e.g., repeated fraud) | Call **both**: keep exchange disputed and create a report referencing the same exchange |

In Postman collections, place “Dispute” requests under Exchanges and “Create Report” under Reports. When filling the report body, pass the same `exchangeId` so admins can see the context.

### 4.2 Bob creates report
```
POST /reports
Authorization: Bearer {{TOKEN_BOB}}
Body:
{
  "againstUser": "{{USER_ALICE_ID}}",
  "exchange": "{{EXCHANGE_ID}}",
  "type": "fraud",
  "description": "Second time Alice cancelled after receiving work",
  "evidence": ["https://files.example.com/chat.png"]
}
```
Auto-priority `urgent`. Report `status: "open"`.

### 4.3 Admin lists urgent reports
```
GET /admin/reports?priority=urgent&status=open&limit=10
Authorization: Bearer {{TOKEN_ADMIN}}
```

### 4.4 Assign report
```
POST /admin/reports/{{REPORT_ID}}/assign
Authorization: Bearer {{TOKEN_ADMIN}}
```

### 4.5 Update resolution + action
```
PATCH /admin/reports/{{REPORT_ID}}
Authorization: Bearer {{TOKEN_ADMIN}}
Body:
{
  "status": "resolved",
  "adminNotes": "Evidence inconclusive",
  "actionTaken": "warning",
  "resolution": "Issued warning to Alice",
  "note": "Closed after warning"
}
```

### 4.6 (Optional) Suspend Alice
```
POST /admin/manage-user-status
Authorization: Bearer {{TOKEN_ADMIN}}
Body:
{
  "targetUserId": "{{USER_ALICE_ID}}",
  "action": "suspend",
  "duration": 3,
  "durationUnit": "days",
  "reason": "Two fraud reports within a week"
}
```

Edge cases:
- Admin without superAdmin role tries to suspend another admin → `400`
- Missing `duration` fields on suspend → `400`
- Unblock before expiry using `action: "unsuspend"`

---

## 5. Payment Intervention Standalone Tests

> Used when payment workflow fails (e.g., manual release or refund).

### 5.1 Release payment (stuck in `escrow_funded`)
```
POST /admin/payment-intervention
Authorization: Bearer {{TOKEN_ADMIN}}
Body:
{
  "exchangeId": "{{EXCHANGE_ID}}",
  "paymentId": "{{ESCROW_PAYMENT_ID}}",
  "action": "release",
  "reason": "Both parties confirmed but webhook failed"
}
```
**Expected**: payment captured, audit `admin_payment_released`.

Edge cases:
- Payment already captured → payment service error, response `400`
- PaymentId mismatch → `400`

### 5.2 Refund payment (manual cancellation)
```
POST /admin/payment-intervention
Body:
{
  "exchangeId": "...",
  "paymentId": "...",
  "action": "refund",
  "reason": "Exchange cancelled before start"
}
```

### 5.3 Hold payment
```
POST /admin/payment-intervention
Body:
{
  "exchangeId": "...",
  "paymentId": "...",
  "action": "hold",
  "reason": "Fraud investigation"
}
```
No payment status change, but audit record created.

---

## 6. Listing Protection Tests

`listingService` enforces restrictions whenever exchanges reference a listing.

### 6.1 Attempt to edit hourly rate during active exchange
```
PATCH /listings/{{LISTING_ID}}
Authorization: Bearer {{TOKEN_BOB}}
Body: { "hourlyRate": 9999 }
```
If there’s an exchange with status not in `["declined","cancelled","completed","resolved"]`, expect:
```
400 { "message": "Cannot modify key listing fields while there are active exchanges referencing this listing" }
```

### 6.2 Attempt to delete listing with active exchanges
```
DELETE /listings/{{LISTING_ID}}
Authorization: Bearer {{TOKEN_BOB}}
```
Expected error when active exchange exists.

These tests ensure admin workflows respect marketplace data integrity.

---

## 7. User Role Matrix & Payments

| Listing Type | Payer | Payee | Notes |
|--------------|-------|-------|-------|
| `offer`      | Initiator (Alice) | Receiver (Bob) | Listing owner offers skill |
| `need`       | Receiver (Bob) | Initiator (Alice) | Listing owner needs skill |
| `hybrid`     | Depends on listing type | Opposite party | Monetary portion follows listing type; barter part is negotiated |
| `barter`     | N/A | N/A | No escrow; disputes rely on admin evidence |

Use this table when verifying Postman responses:
- Funding escrow ensures only payer can pay (based on listing type).
- Admin payment release automatically picks payee; override with `payeeId` when manual routing is needed.

---

## 8. Error & Edge Case Checklist

| Scenario | How to Test | Expected Outcome |
|----------|-------------|------------------|
| Non-participant tries to dispute | Call `/exchanges/:id/dispute` as unrelated user | `400 Unauthorized` |
| Dispute raised before start | Call when status = `accepted_initial` | `400 Can only dispute ongoing or completed exchanges` |
| Admin resolves already resolved dispute | Call after first resolution | `400 Exchange is not in disputed status` |
| Admin tries to block superAdmin | manage-user-status with target superAdmin | `400 Cannot block or suspend superAdmin` |
| Escrow double fund | Call `/fund-escrow` twice | `400 Escrow already funded` |
| Payment release with wrong paymentId | Provide random ID | `400 Payment ID does not match exchange escrow payment` |
| Listing soft delete with ongoing exchange | Call delete | `400 Cannot delete listing while there are ongoing exchanges referencing this listing` |
| Report without description | Missing field | `400 description is required` |
| Signed agreement without type | Remove `type` | `400 Exchange type must be set` |

---

## 9. Suggested Postman Folder Structure

1. `Auth` – login / token retrieval
2. `Listings` – CRUD & protection tests
3. `Exchanges` – create, accept, agreement, escrow, start, confirm, dispute
4. `Admin` – role management, user status, reports, dispute resolution, payment intervention, dashboard
5. `Reports` – user report flows

Set environment variables for IDs as they are generated:
- `EXCHANGE_MONETARY_ID`, `ESCROW_MONETARY_ID`
- `EXCHANGE_HYBRID_ID`, `ESCROW_HYBRID_ID`
- `EXCHANGE_BARTER_ID`
- `REPORT_ID`

---

## 10. Final Tips

- **Use separate Postman environments** for Alice, Bob, and Chloe to avoid header mistakes.
- **Record response IDs** in environment variables immediately after creation.
- **Always test both success and failure** for each route (happy path + edge case).
- **Leverage Postman tests** (JavaScript tab) to assert response codes, statuses, and audit trail changes.

By following this guide you can validate every branch in `adminService.js`, `exchangeServices.js`, and `listingService.js`, ensuring admins can fairly resolve monetary, hybrid, and barter disputes from start to finish.

