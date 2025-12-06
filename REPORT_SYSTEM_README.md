# Report System - User Stories & Implementation Guide

## Overview

The report system allows users to report issues with exchanges or other users. Any admin can handle reports without assignment - the system automatically tracks when an admin starts working on a report.

---

## User Stories

### Story 1: User Creates a Report

**As a** user  
**I want to** report a problem with an exchange or another user  
**So that** administrators can review and resolve the issue

**Scenario:**
1. User is involved in an exchange or wants to report another user
2. User fills out a report form with:
   - Type of report (abuse, fraud, no_show, quality, payment, other)
   - Description of the issue
   - Optional: Evidence URLs (images, documents)
   - Optional: Exchange ID (if reporting an exchange)
3. System validates:
   - User is not blocked or suspended
   - User cannot report themselves
   - If exchange is provided, user must be involved in that exchange
   - If exchange is provided, the reported user must be the other party
4. System automatically sets priority:
   - `fraud` → `urgent`
   - `abuse`, `payment`, `no_show` → `high`
   - Others → `medium`
5. Report is created with status `open`
6. User receives confirmation

**API Endpoint:**
```
POST /api/v1/reports
Body: {
  "againstUser": "user_id",
  "exchange": "exchange_id",  // optional
  "type": "abuse" | "fraud" | "no_show" | "quality" | "payment" | "other",
  "description": "Detailed description of the issue",
  "evidence": ["url1", "url2"]  // optional array of evidence URLs
}
```

---

### Story 2: User Views Their Reports

**As a** user  
**I want to** see all my submitted reports  
**So that** I can track their status and see updates

**Scenario:**
1. User navigates to "My Reports" page
2. System shows list of user's reports with:
   - Report type
   - Status (open, under_review, resolved, rejected)
   - Priority
   - Date created
   - Against user information
   - Exchange information (if applicable)
3. User can filter by:
   - Status
   - Type
4. User can sort by date (newest/oldest)
5. User can click on a report to see full details

**API Endpoint:**
```
GET /api/v1/reports?status=open&type=fraud&limit=50&skip=0&sortBy=createdAt&sortOrder=-1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "_id": "report_id",
        "type": "fraud",
        "status": "under_review",
        "priority": "urgent",
        "description": "...",
        "againstUser": { "username": "...", "email": "..." },
        "exchange": { "status": "...", "type": "..." },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 10,
    "limit": 50,
    "skip": 0
  }
}
```

---

### Story 3: User Views Single Report Details

**As a** user  
**I want to** see detailed information about a specific report  
**So that** I can see admin updates and resolution

**Scenario:**
1. User clicks on a report from their list
2. System shows:
   - Full report details
   - Status and priority
   - Admin notes (if any)
   - Resolution (if resolved)
   - Action taken (if any)
   - Evidence URLs
   - Audit trail (who did what and when)
3. User can only view their own reports

**API Endpoint:**
```
GET /api/v1/reports/:id
```

---

### Story 4: Admin Views All Reports

**As an** administrator  
**I want to** see all reports in the system  
**So that** I can review and handle issues

**Scenario:**
1. Admin navigates to "Reports" page
2. System shows all reports with:
   - Reporter information
   - Reported user information
   - Report type, status, priority
   - Exchange information (if applicable)
   - Date created/updated
3. Admin can filter by:
   - Status (open, under_review, resolved, rejected)
   - Type
   - Priority
   - Reporter
   - Reported user
   - Exchange
4. Admin can sort by any field
5. Reports are displayed in a table/list format

**API Endpoint:**
```
GET /api/v1/admin/reports?status=open&priority=urgent&limit=50&skip=0
```

---

### Story 5: Admin Reviews a Report

**As an** administrator  
**I want to** review a report and update its status  
**So that** I can resolve user issues

**Scenario:**
1. Admin clicks on a report to view details
2. System shows:
   - Full report information
   - Reporter and reported user details
   - Exchange details (if applicable)
   - Evidence
   - Current status and priority
   - Admin notes
   - Resolution
   - Action taken
   - Complete audit trail
3. Admin can update:
   - Status (open, under_review, resolved, rejected)
   - Priority (low, medium, high, urgent)
   - Admin notes
   - Resolution description
   - Action taken (none, warning, suspend, block, refund, chargeback)
   - Evidence URLs
4. **Important:** When admin updates an `open` report, status automatically changes to `under_review`
5. Reporter receives notification when report is updated
6. All changes are logged in audit trail

**API Endpoint:**
```
PATCH /api/v1/admin/reports/:id
Body: {
  "status": "resolved",  // optional
  "priority": "high",    // optional
  "adminNotes": "Internal notes for other admins",  // optional
  "resolution": "Issue resolved by...",  // optional
  "actionTaken": "warning" | "suspend" | "block" | "refund" | "chargeback" | "none",  // optional
  "evidence": ["url1", "url2"],  // optional
  "note": "Audit trail note"  // optional
}
```

**Auto-behavior:**
- If report status is `open` and admin updates it (without explicitly setting status), status automatically becomes `under_review`
- Reporter automatically receives a notification

---

### Story 6: Admin Resolves a Report

**As an** administrator  
**I want to** mark a report as resolved with details  
**So that** the reporter knows the issue has been handled

**Scenario:**
1. Admin reviews the report and determines resolution
2. Admin updates report with:
   - Status: `resolved`
   - Resolution description
   - Action taken (if any)
   - Admin notes (for internal reference)
3. System:
   - Updates report status
   - Sends notification to reporter
   - Logs action in audit trail
4. Reporter sees updated status in their reports list

**API Endpoint:**
```
PATCH /api/v1/admin/reports/:id
Body: {
  "status": "resolved",
  "resolution": "The reported user has been warned and the issue has been addressed.",
  "actionTaken": "warning",
  "adminNotes": "User was warned via email. Monitoring for repeat offenses."
}
```

---

### Story 7: Admin Rejects a Report

**As an** administrator  
**I want to** reject a report if it's invalid or unfounded  
**So that** the system doesn't keep invalid reports open

**Scenario:**
1. Admin reviews report and determines it's invalid
2. Admin updates report with:
   - Status: `rejected`
   - Resolution: Explanation of why it was rejected
   - Admin notes: Internal reasoning
3. System:
   - Updates report status
   - Sends notification to reporter
   - Logs action in audit trail
4. Reporter sees the rejection and reason

**API Endpoint:**
```
PATCH /api/v1/admin/reports/:id
Body: {
  "status": "rejected",
  "resolution": "Report was rejected because the evidence provided does not support the claim.",
  "adminNotes": "No evidence of fraud found. Exchange completed successfully."
}
```

---

## Report Status Flow

```
open → under_review → resolved
  ↓
rejected
```

**Status Descriptions:**
- `open`: Report just created, waiting for admin review
- `under_review`: Admin is currently reviewing the report (auto-set when admin updates an open report)
- `resolved`: Admin has resolved the issue
- `rejected`: Admin determined the report is invalid

---

## Report Types

1. **abuse** - Harassment, inappropriate behavior
2. **fraud** - Scamming, deceptive practices
3. **no_show** - User didn't show up for exchange
4. **quality** - Service/skill quality issues
5. **payment** - Payment-related problems
6. **other** - Any other issue

---

## Priority Levels

- **urgent** - Automatically set for `fraud` reports
- **high** - Automatically set for `abuse`, `payment`, `no_show` reports
- **medium** - Default for other report types
- **low** - Can be manually set by admin

---

## Action Taken Options

When resolving a report, admins can specify what action was taken:

- **none** - No action needed
- **warning** - User received a warning
- **suspend** - User account suspended
- **block** - User account blocked
- **refund** - Payment refunded
- **chargeback** - Payment chargeback processed

---

## Key Simplifications

1. **No Assignment System**: Any admin can handle any report. No need to assign reports to specific admins.
2. **Auto Status Update**: When an admin updates an `open` report, it automatically becomes `under_review`.
3. **Simple Status Flow**: Only 4 statuses - open, under_review, resolved, rejected.
4. **Automatic Priority**: Priority is set automatically based on report type.
5. **Audit Trail**: All actions are automatically logged with timestamp, admin, action, and note.

---

## Frontend Implementation Tips

### Creating a Report
```javascript
// Simple form with:
// - againstUser (required) - user ID
// - exchange (optional) - exchange ID
// - type (required) - dropdown with 6 options
// - description (required) - textarea
// - evidence (optional) - file upload or URL input
```

### Displaying Reports
```javascript
// For users: Show only their reports
// For admins: Show all reports with filters

// Status badges:
// - open: yellow/orange
// - under_review: blue
// - resolved: green
// - rejected: red

// Priority indicators:
// - urgent: red badge
// - high: orange badge
// - medium: yellow badge
// - low: gray badge
```

### Admin Actions
```javascript
// When admin opens a report:
// - Show all details
// - Provide form to update:
//   - Status dropdown
//   - Priority dropdown
//   - Admin notes textarea
//   - Resolution textarea
//   - Action taken dropdown
//   - Note for audit trail

// Remember: If status is "open" and admin updates it,
// status automatically becomes "under_review"
```

---

## API Response Examples

### Create Report Response
```json
{
  "success": true,
  "data": {
    "_id": "report_id",
    "reporter": "user_id",
    "againstUser": "reported_user_id",
    "exchange": "exchange_id",
    "type": "fraud",
    "description": "User never delivered the service",
    "status": "open",
    "priority": "urgent",
    "evidence": ["https://example.com/evidence1.jpg"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get Reports Response (Admin)
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "_id": "report_id",
        "reporter": {
          "_id": "user_id",
          "username": "john_doe",
          "email": "john@example.com",
          "avatarUrl": "https://..."
        },
        "againstUser": {
          "_id": "reported_user_id",
          "username": "jane_smith",
          "email": "jane@example.com",
          "status": "active"
        },
        "exchange": {
          "_id": "exchange_id",
          "status": "completed",
          "type": "monetary"
        },
        "type": "fraud",
        "description": "...",
        "status": "under_review",
        "priority": "urgent",
        "adminNotes": "Reviewing evidence...",
        "resolution": null,
        "actionTaken": "none",
        "evidence": ["url1"],
        "audit": [
          {
            "at": "2024-01-01T00:00:00.000Z",
            "by": "admin_id",
            "action": "updated",
            "note": "Report updated by admin"
          }
        ],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T01:00:00.000Z"
      }
    ],
    "total": 1,
    "limit": 50,
    "skip": 0
  }
}
```

---

## Error Handling

Common errors you might encounter:

- `"Reporter not found"` - Invalid reporter ID
- `"User being reported not found"` - Invalid againstUser ID
- `"Blocked or suspended users cannot create reports"` - User account is restricted
- `"Cannot report yourself"` - User trying to report themselves
- `"Exchange not found"` - Invalid exchange ID
- `"You can only report exchanges you are involved in"` - User not part of the exchange
- `"againstUser must be the other party in the exchange"` - Wrong user ID for exchange report
- `"Report not found"` - Invalid report ID
- `"Unauthorized to view this report"` - User trying to view someone else's report
- `"Only admins can update reports"` - Non-admin trying to update report
- `"Invalid status"` - Invalid status value
- `"Invalid priority"` - Invalid priority value
- `"Invalid actionTaken"` - Invalid actionTaken value

---

## Summary

The report system is designed to be simple and straightforward:

1. **Users create reports** with type, description, and optional evidence
2. **Reports start as `open`** with auto-set priority
3. **Any admin can handle any report** - no assignment needed
4. **When admin updates an `open` report**, it automatically becomes `under_review`
5. **Admin resolves or rejects** with resolution details and action taken
6. **All actions are logged** in the audit trail
7. **Users are notified** when their reports are updated

This keeps the system simple for both users and admins while maintaining full functionality and accountability.

