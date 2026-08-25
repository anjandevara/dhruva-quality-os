# Business Logic Doubts & Requirement Ambiguities

## DBT-001: Ambiguity in Session Timeout Behavior on Checkout Page

* **Feature**: Shopping Cart and Payment Checkout
* **Observed Date**: 2026-08-25
* **Assigned To**: Product Owner / QA Lead

### Observed Behavior
When a user remains idle on checkout for 15 minutes, the cart is cleared upon redirect.

### Ambiguity Question
Should the application preserve cart items in session or clear them completely?
