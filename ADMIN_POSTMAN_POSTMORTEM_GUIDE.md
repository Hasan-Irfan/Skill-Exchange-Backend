## Admin Postman Playbook

This README mirrors the style of `MONETARY_EXCHANGE_UI_FLOW.md`: every workflow is broken into **step-by-step API calls**, mapping **Route ➜ Controller ➜ Service** so you can trace behavior and edge cases straight from Postman into the code (`src/routes/adminRoutes.js`, `src/controllers/adminController.js`, `src/services/adminService.js`, plus `exchangeServices.js` and `listingService.js` for dispute context).

---

### 1. Environment & Global Headers

- `{{baseUrl}} = https://<host>/api/v1`
- Header template: `Authorization: Bearer {{adminToken}}`, `Content-Type: application/json`
- Use a **super admin** token when working with `/admin/manage-role`; regular admins cover everything else.

```javascript
// Pre-request script snippet
pm.request.headers.add({
  key: "Authorization",
  value: `Bearer ${pm.environment.get("adminToken")}`
});
```

---

### 2. Role Governance Flow (Super Admin Only)

| Step | API Route (Method) | Controller ➜ Service | Purpose |
| --- | --- | --- | --- |
| 2.1 | `POST /admin/manage-role` | `manageAdminRole` ➜ `manageAdminRoleService` | Promote/demote/update roles |

#### Happy Path – Promote to Admin
```json
{
  "targetUserId": "6500...bbb",
  "action": "promote"
}
```
**Expected**: `200 OK`, response `data.roles` contains `"admin"`. Audit logged inside user doc.

#### Edge Tests
- Non-super admin token ⇒ `Only superAdmin can manage admin roles`.
- `action:"promote"` when already admin ⇒ `User is already an admin`.
- `action:"demote"` for `superAdmin` target ⇒ `Cannot demote superAdmin`.
- `action:"update"` without `"role"` or with invalid values ⇒ `Invalid role...`.
- Fire concurrent promote requests to validate session transaction prevents duplicate pushes.

---

### 3. User Enforcement Flow

| Step | Route | Controller ➜ Service | Actions |
| --- | --- | --- | --- |
| 3.1 | `POST /admin/manage-user-status` | `manageUserStatus` ➜ `manageUserStatusService` | `block`, `suspend`, `unblock`, `unsuspend` |

#### Suspend Request
```json
{
  "targetUserId": "6501...ddd",
  "action": "suspend",
  "duration": 2,
  "durationUnit": "weeks",
  "reason": "Chargeback dispute"
}
```
**Expected**: `data.status = "suspended"`, `suspension.isPermanent = false`, `suspendedUntil` ≈ now + 14 days.

#### Edge Matrix
- Admin (non-super) tries to suspend another admin ⇒ `Only superAdmin can...`.
- Any action against super admin ⇒ `Cannot block or suspend superAdmin`.
- Missing `duration` / `durationUnit` for suspension ⇒ validation error.
- Invalid `durationUnit` (`minutes`, `years`) ⇒ `Invalid durationUnit...`.
- Idempotent `unblock`: should clear `suspension` and set `status: "active"` even if already active.

---

### 4. Report Triage Flow

| Step | Route | Controller ➜ Service | Description |
| --- | --- | --- | --- |
| 4.1 | `GET /admin/reports` | `getReports` ➜ `getReportsService` | List with filters |
| 4.2 | `GET /admin/reports/:id` | `getReport` ➜ `getReportService` | Detail view |
| 4.3 | `POST /admin/reports/:id/assign` | `assignReport` ➜ `assignReportService` | Claim report |
| 4.4 | `PATCH /admin/reports/:id` | `updateReport` ➜ `updateReportService` | Status / notes updates |

**List Query Example**
```
GET {{baseUrl}}/admin/reports?status=open&priority=high&assignedTo=&limit=20&skip=0&sortBy=createdAt&sortOrder=desc
```
Expect `data.reports[]` plus pagination summary.

**Assign Body**
```json
{}
```
Controller injects `req.user.id` as `adminId`. Expect `assignedTo = adminId`, `status` auto-shifts to `under_review`.

**Update Body Template**
```json
{
  "status": "resolved",
  "priority": "urgent",
  "adminNotes": "Verified evidence, issuing warning",
  "actionTaken": "warning",
  "resolution": "Warned offender",
  "evidence": ["https://.../screenshot.png"],
  "note": "Escalated to moderation"
}
```

**Edge Tests**
- Send invalid `status` (`processing`) ⇒ `Invalid status`.
- Invalid `priority` or `actionTaken` enumerations.
- Update `adminNotes` only—ensure audit entry still appended.
- Non-admin token on assign/update ⇒ `Only admins can...`.

---

### 5. Exchange Context Cheat Sheet

Admins resolve issues created by the primary exchange flow (`exchangeServices.js`). Keep this matrix handy when testing disputes or payment decisions.

| Listing Type | Initiator Role | Receiver Role | Escrow Payer | Escrow Payee | Typical Admin Issues |
| --- | --- | --- | --- | --- | --- |
| `offer` | Buyer | Listing owner sells service | Initiator | Receiver | Late delivery, quality disputes |
| `need` | Service provider | Listing owner buys service | Receiver | Initiator | Buyer non-payment, work disputes |
| `barter` | Skill swap | Skill swap | None | None | Proof-of-work disagreements |
| `hybrid` | Mix | Mix | Determined by listing type | Opposite party | Partial completion (skill delivered, payment pending) |

Exchange states: `proposed → accepted_initial → agreement_signed → (monetary/hybrid) escrow_funded → in_progress → completed`. Disputes can be raised from `in_progress` or `completed`, flipping to `disputed`.

---

### 6. Admin Dispute Resolution Flow (Exchange-Level)

| Step | Route | Controller ➜ Service |
| --- | --- | --- |
| 6.1 | `POST /admin/exchanges/:exchangeId/resolve-dispute` | `adminResolveDispute` ➜ `adminResolveDisputeService` |

**Sample Body**
```json
{
  "note": "Receiver failed to deliver. Refunding payer.",
  "paymentAction": "refund",
  "reason": "Evidence supports buyer",
  "payeeId": null,
  "splitNote": null
}
```
The controller injects `req.user.id` as `adminId`. Service enforces:
- Exchange must be `disputed`.
- Exchange status becomes `resolved`, audit entry `admin_resolved_dispute`.
- If `resolution.paymentAction` present and escrow exists:
  - `"release"` ➜ `captureEscrowPaymentService` with computed payee (based on listing type) or override `payeeId`.
  - `"refund"` ➜ `refundPaymentService` (ignores dispute lock).
  - `"split"` ➜ currently logs `payment_split_requested` (no auto payout).
- Errors while running payment logic **do not** fail the HTTP response; they’re logged server-side. Confirm via Postman that response still returns `success: true`.

**Edge Coverage**
- Resolving when exchange `status !== disputed` ⇒ `Exchange is not in disputed status`.
- Provide `paymentAction:"release"` without identifying payee for orphaned listings ⇒ expect `Payee ID is required...`.
- Test hybrid scenario: run `split` and ensure audit contains `payment_split_requested`.
- Try resolving barter dispute with `paymentAction` provided ⇒ monetary code gracefully skips because there is no `escrowPaymentId`.

---

### 7. Admin Payment Intervention Flow (Manual Escrow Control)

| Step | Route | Controller ➜ Service |
| --- | --- | --- |
| 7.1 | `POST /admin/payment-intervention` | `adminPaymentIntervention` ➜ `adminPaymentInterventionService` |

#### Release Template
```json
{
  "exchangeId": "6510...eee",
  "paymentId": "pay_escrow_123",
  "action": "release",
  "payeeId": "6501...ddd",
  "reason": "Milestone achieved early"
}
```

#### Refund Template
```json
{
  "exchangeId": "6510...eee",
  "paymentId": "pay_escrow_123",
  "action": "refund",
  "reason": "Chargeback investigation"
}
```

#### Hold Template
```json
{
  "exchangeId": "6510...eee",
  "paymentId": "pay_escrow_123",
  "action": "hold",
  "reason": "Manual compliance review"
}
```

**Validation Points**
- Ensure `paymentId` matches `exchange.monetary.escrowPaymentId`; otherwise expect `Payment ID does not match exchange escrow payment`.
- For `release`, provide explicit `payeeId` if the underlying listing was deleted; else service attempts listing lookup.
- Non-admin token ⇒ `Only admins can intervene in payments`.
- Calling `release` twice should trigger capture failure but still log `admin_payment_released` attempt—confirm HTTP response conveys the capture error message if thrown.

---

### 8. Listings + Active Exchange Constraints

When admins investigate disputes they often need to reproduce the user path. The `listingService` enforces several guards:

1. **Update Listing With Active Exchange**
   - Route: `PATCH /listings/:id` → `listingController.updateListing` → `updateListingService`
   - Attempt to edit `skills`, `hourlyRate`, or `currency` while referenced by active exchange.
   - Expected error: `Cannot modify key listing fields while there are active exchanges referencing this listing`.

2. **Delete Listing With Active Exchange**
   - Route: `DELETE /listings/:id` → `deleteListingService`
   - Expected: `Cannot delete listing while there are ongoing exchanges referencing it`.

3. **Skill Validation**
   - Provide inactive skill IDs in `create`/`update`.
   - Expected: `One or more skills are invalid or inactive`.

Use Postman to simulate these before/after dispute to confirm the backend’s preventive messaging aligns with admin guidance.

---

### 9. Dispute Scenario Playbooks

| Scenario | User Flow Setup (Exchange APIs) | Admin Action | Expected Outcome |
| --- | --- | --- | --- |
| Offer listing, late delivery | Run full monetary flow, receiver disputes after initiator confirms completion | `POST /admin/exchanges/:id/resolve-dispute` with `paymentAction:"refund"` | Exchange `resolved`, escrow refunded to initiator (payer) |
| Offer listing, buyer ghosted | Receiver completed work, initiator silent | `POST /admin/payment-intervention` with `action:"release"` targeting receiver | Escrow captured to receiver; audit `admin_payment_released` |
| Need listing, provider fails to deliver | Listing owner paid escrow (receiver), initiator disputes | `resolve-dispute` with `paymentAction:"release"` (payee defaults to initiator) | Funds move to initiator who was service provider |
| Hybrid exchange partial completion | Users exchanged skill + money; skill fulfilled but cash contested | `resolve-dispute` with `paymentAction:"split"` and `splitNote` describing manual payout plan | Exchange `resolved`, audit logs split request for finance follow-up |
| Barter disagreement | No escrow; users dispute skill quality | `resolve-dispute` without `paymentAction` | Exchange `resolved`; ensure response lacks `monetary` mutations |

---

### 10. Quick Smoke Checklist

- Promote ➜ demote ➜ promote same user via `/admin/manage-role`; check responses & error handling.
- Suspend user for 24h (`durationUnit:"hours"`), unblock, then permanantly block to test suspension object.
- Assign a report to yourself, update it with every `actionTaken` variant (`warning`, `suspend`, `block`, `refund`, `chargeback`).
- Run `resolve-dispute` and `payment-intervention` across monetary, barter, and hybrid exchanges; ensure payer/payee roles follow the matrix in Section 5.
- Watch notification payloads (server logs or DB) to confirm `sendExchangeNotification` fires on each major step (assignment, resolution, payment releases).

Keep this README attached to your Postman collection so everyone shares the same canonical flow references, mirroring the depth of `MONETARY_EXCHANGE_UI_FLOW.md` but focused on admin tooling. Test aggressively against the edge cases above to keep escalation tooling reliable.

