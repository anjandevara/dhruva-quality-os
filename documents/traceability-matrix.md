# Traceability Matrix

Generated: 2026-08-25T10:51:56.624Z

| Story ID | Epic / Feature | Spec File | Scenario Title | Tags | Last Run Status | Linked Defects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| TC-001 | Customer Access Management / User Registration | tests/auth/userRegistration.spec.ts | Register new customer and manage their task list @create | @crud, @regression, @create | PASSED | None |
| TC-002 | Universal Component Action Library / Overlay Controls | tests/components/complexComponents.spec.ts | OverlayControls resolves and dismisses a real modal dialog @smoke | @regression, @smoke | PASSED | None |
| TC-003 | Universal Component Action Library / Data Display Controls | tests/components/complexComponents.spec.ts | DataDisplayControls filters and deletes todo items dynamically @smoke | @regression, @smoke | PASSED | None |
| TC-004 | Universal Component Action Library / Picker Controls | tests/components/complexComponents.spec.ts | PickerControls uploads and validates a real file @smoke | @regression, @smoke | PASSED | None |
| TC-005 | Universal Component Action Library / Component Coverage Against Primary Target | tests/components/complexComponents.spec.ts | OverlayControls and PickerControls correctly report absence of a modal or file input on TodoMVC @smoke | @regression, @smoke | PASSED | None |
| TC-006 | E-Commerce Web Portal / Product Catalog and Checkout | tests/ecommerce/productCheckout.spec.ts | Guest searches, filters, adds a product to cart, and reaches the checkout gate @smoke @crud | @crud, @regression, @smoke | PASSED | None |
| TC-007 | E-Commerce Web Portal / Component Coverage Against Primary Target | tests/ecommerce/productCheckout.spec.ts | SelectionControls correctly reports no dropdown filters on this catalog @smoke | @crud, @regression, @smoke | PASSED | None |
| TC-008 | Order Management / Order Lifecycle | tests/orders/orderLifecycleChained.spec.ts | Step 1: Create Purchase Order via Web UI @crud @create | @chained, @regression, @crud, @create | PASSED | None |
| TC-009 | Order Management / Order Lifecycle | tests/orders/orderLifecycleChained.spec.ts | Step 2: Manager Approves Created Purchase Order @crud @update | @chained, @regression, @crud, @update | PASSED | None |
| TC-010 | Production Safety / Route Health Audit | tests/production/productionHealthAudit.spec.ts | Public catalog route responds healthy: home page | @read-only, @smoke, @prod-safe | PASSED | None |
| TC-011 | Production Safety / Route Health Audit | tests/production/productionHealthAudit.spec.ts | Public catalog route responds healthy: products listing | @read-only, @smoke, @prod-safe | PASSED | None |
| TC-012 | Production Safety / Route Health Audit | tests/production/productionHealthAudit.spec.ts | Public catalog route responds healthy: category products page | @read-only, @smoke, @prod-safe | PASSED | None |
| TC-013 | Platform Core / Environment Health Check | tests/smoke/healthCheck.spec.ts | Verify Public Web Application Health and Title @smoke | @smoke, @read-only | PASSED | None |
| TC-014 | Autonomous Quality Engine / Self-Healing Diagnostics | tests/smoke/selfHealingVerification.spec.ts | SANJEEV resolves a stale locator via fallback candidate and logs to the ledger | @smoke | PASSED | None |
| TC-015 | Autonomous Quality Engine / Artifact Provenance | tests/smoke/selfHealingVerification.spec.ts | ArtifactManager generates a valid SHA-256 hash and EventLedger chains previousEventHash | @smoke | PASSED | None |
