# Functional Defects Log (Bugs)

## Executive Summary

| Bug ID | Title | Module | Severity | Priority | Current Status | Last Verified |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| BUG-101 | Profile Image Upload Fails with Valid PNG | User Profile | High | P2 | Verified Fixed | 2026-08-25 |
| BUG-102 | Quantity Stepper Resets to Zero on Cart Update | Shopping Cart | Medium | P3 | Open | 2026-08-25 |

---

## BUG-101: User Profile Image Upload Fails with Valid PNG Format

* **Current Status**: Verified Fixed
* **Test Scenario**: User Profile Management - Image Upload Verification
* **Test Spec File**: `tests/auth/userRegistration.spec.ts`
* **Severity**: High
* **Priority**: P2
* **Environment**: Quality Assurance (QA) Environment - Build v1.2.4

### Description
When an authenticated user attempts to upload a valid PNG image (size 250 KB) on the profile settings page, the application displays an unhandled 500 server error banner.

### Steps to Reproduce
1. Navigate to User Profile Settings via `/account/profile`.
2. Click on 'Upload Profile Picture' file input button.
3. Select valid PNG file (`sample-profile.png`, size: 250 KB).
4. Click 'Save Profile Changes' button.

### Expected Result
Profile image should upload successfully with success banner.

### Actual Result (Initial Failure)
Page displayed 500 Internal Server Error.

### Verification History
* Date: 2026-08-25
* Build Version: Build-2026.08.25-v1.2.4
* Outcome: Test passed. Image uploaded successfully. Verified by DHRUVA automated test runner.
