# MMS Manual QA Test Plan

> Companion to [MANUAL-TESTING-GUIDE.md](MANUAL-TESTING-GUIDE.md), which covers
> generic methodology — the six testing lenses, severity rubric, and the bug/
> feature report templates. **That doc tells you _how_ to test. This doc tells
> you _what_ to test in MMS.** Read both. Use the generic guide's bug report
> template (§5) for everything you find here.

MMS (Meguin Depot Manager) is a back-office app for a lubricants depot:
customers with credit limits, bills, payments with admin approval, a product
catalogue, and stock split across a warehouse and an office. Two roles —
**user** (day-to-day entry) and **admin** (approvals, exports, user
management). §4 below is a condensed glossary cheat-sheet.

---

## 1. Setup

```bash
pnpm install
cp .env.example .env.local   # ask a dev for DATABASE_URL / AUTH_SECRET if you don't have one
pnpm db:migrate
pnpm db:seed                 # ⚠️ truncates and reloads demo data — dev DB only, never against real data
pnpm dev                     # → http://localhost:3000
```

### Test accounts (created by `pnpm db:seed`)

| Name   | Email               | Password   | Role  |
| ------ | ------------------- | ---------- | ----- |
| Ahmed  | `admin@meguin.test` | `admin123` | admin |
| Salman | `user@meguin.test`  | `user123`  | user  |

**Test almost everything below as both roles.** Most bugs in this app live in
the gap between what a `user` and an `admin` can do — a button that should be
hidden but isn't, or a rule enforced client-side but not on the server.

Keep DevTools open the whole session (Console + Network tabs) — see the
generic guide §1 for what counts as a bug there.

---

## 2. App map

| Route                                                                     | Who can view it                                                                         |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `/login`                                                                  | anyone; redirects to `/dashboard` if already signed in                                  |
| `/dashboard`                                                              | any signed-in user                                                                      |
| `/customers`                                                              | any signed-in user                                                                      |
| `/customers/[id]` (tabs: Ledger, Payments, Bills, Return Bills, Info)     | any signed-in user                                                                      |
| `/customers/[id]/bills/new`                                               | any signed-in user                                                                      |
| `/customers/[id]/bills/[billId]/print`                                    | any signed-in user                                                                      |
| `/customers/[id]/return-bills/new`                                        | **admin only** — link is hidden for `user`; direct URL should still be blocked          |
| `/payments`                                                               | any signed-in user                                                                      |
| `/products`                                                               | any signed-in user                                                                      |
| `/stock`, `/stock/movements`                                              | any signed-in user                                                                      |
| `/stock/transfers`, `/stock/transfers/new`, `/stock/transfers/[id]/print` | any signed-in user                                                                      |
| `/users`                                                                  | **admin only** — direct visit as `user` should 404 (not redirect to login/dashboard)    |
| `/api/export/[resource]`                                                  | **admin only** — direct hit as `user` or logged-out should error, never download a file |

---

## 3. Domain quick reference

Condensed glossary:

### Roles — who can do what

| Action                                           | user | admin                                 |
| ------------------------------------------------ | ---- | ------------------------------------- |
| Record a sale bill (cash/deferred)               | ✅   | ✅ (auto-approves even if over-limit) |
| Approve / reject a pending bill                  | ❌   | ✅                                    |
| Create a return bill (credit note)               | ❌   | ✅                                    |
| Record a payment                                 | ✅   | ✅                                    |
| Approve / reject a payment                       | ❌   | ✅                                    |
| Create a customer                                | ✅   | ✅                                    |
| Edit a customer                                  | ❌   | ✅                                    |
| **Create** a product                             | ❌   | ✅                                    |
| **Edit / delete** a product                      | ✅   | ✅                                    |
| Manage categories (create/delete)                | ❌   | ✅                                    |
| View stock & movement history                    | ✅   | ✅                                    |
| Set opening stock / add / adjust / reorder level | ❌   | ✅                                    |
| Create a stock transfer                          | ✅   | ✅                                    |
| Manage users                                     | ❌   | ✅                                    |
| Export data                                      | ❌   | ✅                                    |

⚠️ **Products is the one inverted permission in the app**: creating a new
article requires admin, but editing or deleting an existing one doesn't. It's
easy to assume the opposite — test it deliberately (§5.7).

### Key enums

- **Bill direction:** `sale` (`B-<n>`) / `return` (`R-<n>`)
- **Bill type:** `cash` / `deferred` (a bill is never itself `mixed` — only a customer's `paymentType` can be)
- **Bill status:** `paid` / `unpaid` / `pending_approval` / `rejected`
- **Payment method:** `cash` / `bank` / `cheque` / `online`
- **Payment approval:** `pending` / `approved` / `rejected`
- **Customer status** (derived, never stored): outstanding ≤ 0 → **Clear**; else outstanding⁄limit ≥ 100% → **Over Limit**; ≥ 85% → **Warning**; else **Active**
- **Stock movement kind:** `opening` / `addition` / `adjustment` / `sale` / `return` / `transfer_out` / `transfer_in`
- **Stock location:** `warehouse` / `office` — a fixed set of two, nothing else
- **Numbering:** bills `B-<n>`, returns `R-<n>`, payments `P-<NNN>`, transfer slips `T-<n>` — all monotonic, no gaps or reuse

---

## 4. Feature test scenarios

Each item names the role to use. Where no role is named, test as **both**.

### 4.1 Auth & session

- [ ] Log in as admin and as user with correct credentials — lands on `/dashboard`.
- [ ] Wrong password / unknown email → one generic error ("Invalid email or password"), never hints which field was wrong.
- [ ] Empty email or empty password → client-side validation blocks submit.
- [ ] While logged out, paste a deep link to any authed route (e.g. `/customers`) → redirected to `/login`.
- [ ] While logged in, visit `/login` directly → redirected to `/dashboard`, not shown the form.
- [ ] As `user`, paste `/users` directly into the address bar → **404 page**, not a redirect to `/login` or `/dashboard`.
- [ ] As `user`, hit `/api/export/customers` directly in the browser → blocked (401/403), no file downloads.
- [ ] Log out → subsequent back-button press doesn't reveal authed content from cache.
- [ ] (Optional/advanced) Have an admin deactivate your test account (§4.9) while you're mid-session, then try an action — the session is JWT-based with an 8-hour lifetime, so an already-issued token may keep working until it expires or you log out; note this as expected behavior, not a bug, unless the user can act _after_ a fresh login attempt with the deactivated account (that should always fail).

### 4.2 Dashboard

- [ ] "Total outstanding" KPI matches the sum you'd get from the customers list.
- [ ] "Pending approvals" KPI matches the combined pending bills + pending payments count seen on `/customers`/`/payments`.
- [ ] "Today's bills" count/total matches bills actually dated today.
- [ ] "Over-limit customers" count matches customers whose status badge shows Over Limit.
- [ ] Each KPI card links to the right screen.
- [ ] "Export bills" button on the dashboard is visible only for admin.
- [ ] Top Outstanding panel shows the correct top 5, in order, with matching status badges/credit bars.
- [ ] Create/approve a bill or payment, then reload the dashboard — the panels and KPIs reflect it immediately (no stale cache).

### 4.3 Customers

- [ ] Create a customer (either role): name required (1–120 chars; try empty, 1 char, 120 chars, 121 chars), area/phone/referral optional, credit limit required integer 0–100,000,000 (try 0, negative, decimal, 100,000,001), payment type defaults to `deferred`.
- [ ] Set an initial outstanding balance ≤ the credit limit at creation — accepted.
- [ ] Try an initial outstanding **greater than** the credit limit at creation — rejected with a clear field error.
- [ ] After creation, open Edit (admin only) — confirm there is **no field** to change outstanding directly; it can only move via bills/payments afterward.
- [ ] As `user`, confirm there is no Edit button/action anywhere on a customer.
- [ ] Confirm there is **no delete** action for a customer anywhere in the UI.
- [ ] Push a customer's outstanding to exactly 85% of their limit → status badge flips to **Warning**; one paisa under 85% → **Active**.
- [ ] Push outstanding to exactly 100% of limit → status badge flips to **Over Limit** — but note this does **not** by itself require bill approval (§4.4 explains why: the approval trigger is "strictly greater than", the status badge trigger is "≥100%"). This is a subtle, easy-to-misjudge boundary — verify both behaviors independently.
- [ ] Customer detail tabs (Ledger, Payments, Bills, Return Bills, Info) all load without console errors and show data consistent with each other.

### 4.4 Bills — sales

- [ ] Create a **cash** bill — status is always `paid` immediately; customer outstanding is unaffected.
- [ ] Create a **deferred** bill that keeps outstanding at or below the credit limit — status `unpaid`, outstanding bumped by the full bill total right away.
- [ ] Create a deferred bill that brings outstanding to **exactly** the credit limit (100%) — should go straight to `unpaid` with **no approval needed** (the check is strictly-greater-than, not ≥).
- [ ] As **user**, create a deferred bill that pushes outstanding **1 rupee over** the limit — bill status becomes `pending_approval`; outstanding does **not** change yet; the UI banner explains approval is needed.
- [ ] As **admin**, create the same over-limit bill — it **auto-approves**: status goes straight to `unpaid` and outstanding is bumped immediately. Confirm the on-screen wording differs between the two roles for this same scenario (this is the key role-asymmetric rule in the app — worth double-checking carefully).
- [ ] While a customer has a bill sitting in `pending_approval`, try to create a second bill for them — blocked (submit disabled / server rejects) until the first is resolved. Confirm this cap is **per customer**, not global.
- [ ] As admin, **approve** a pending bill — status → `unpaid`, outstanding increases by the bill total, an "approved by / at" stamp appears somewhere (bill detail or audit trail).
- [ ] Try to approve (or reject) the **same** bill a second time — blocked with an "already finalized" style error; nothing double-applies to outstanding.
- [ ] As admin, **reject** a pending bill with a reason — status → `rejected`, outstanding unaffected (it was never applied), and the stock that was deducted at creation time is **restocked** back to the exact location(s) each line drew from.
- [ ] Add two lines for the **same product at two different locations** (e.g. 5 units from warehouse + 3 from office) on one bill — allowed.
- [ ] Add two lines for the **same product at the same location** on one bill — rejected as a duplicate line.
- [ ] Quantity boundaries on a line: 0 removes the line, negative is rejected, exactly 10,000 accepted, 10,000.001/over rejected, a decimal quantity (e.g. 12.5) is accepted and preserved.
- [ ] Try to sell more than is on hand at a line's source location as **user** — blocked with an insufficient-stock message; no override option is shown.
- [ ] Try the same as **admin** — an override toggle appears; enabling it lets the sale go through and drive that location negative; confirm the resulting stock movement/ledger entry reflects the override.
- [ ] Double-click the submit button on a bill form — only one bill is created, not two (button should disable while the request is in flight).
- [ ] **Concurrency:** with exactly 1 unit left of a product at a location, open the same bill-creation flow in two browser tabs/roles and submit both for that last unit at nearly the same time — exactly one succeeds; the other gets a clear conflict/insufficient-stock error, and stock never goes negative from this race.
- [ ] Open the print page for a bill — confirm the three copy titles (Office/Stock/Receiving) are correct for a **sale** bill's direction.

### 4.5 Return bills (credit notes) — admin only

- [ ] As `user`, confirm there is no "New Return Bill" link/button anywhere, and a direct visit to `/customers/[id]/return-bills/new` is blocked.
- [ ] As admin, create a return for a product previously sold to that customer, for a quantity **within** what's still returnable (sold minus already returned) — succeeds, gets an `R-<n>` number.
- [ ] Try to return **more** than the returnable quantity — blocked with a message stating the actual returnable amount.
- [ ] Try to return a product **never sold** to that customer — blocked with a "not returnable" style message.
- [ ] Add the same article twice as separate lines in one return — rejected as a duplicate.
- [ ] Confirm the restocked quantity always lands in the **warehouse**, even if the original sale drew from the office.
- [ ] Create a return large enough to push the customer's outstanding **negative** — the UI shows a store-credit note (customer now owed money), and this is accepted, not blocked.
- [ ] If a product's price changed since the original sale, confirm the return is credited at the **price the customer actually paid**, not today's catalogue price (needs a manual price change + re-sale + return to fully exercise; note as an advanced case if time-limited).

### 4.6 Payments

- [ ] Record a payment (either role) — always created as `pending`; customer outstanding is **unchanged** until approved; toast confirms a `P-<NNN>` number.
- [ ] Amount boundaries: 0 or negative rejected, exactly 100,000,000 accepted, over that rejected, non-numeric rejected client-side.
- [ ] Try each method (`cash`/`bank`/`cheque`/`online`) — all recordable the same way.
- [ ] As admin, **approve** a pending payment — outstanding reduces by the amount (confirm it's allowed to go negative — no floor), stamped with approver/time.
- [ ] As admin, **reject** a pending payment — a reason is **required** (try 1–2 characters, expect a validation error; 3 characters should be the minimum accepted); outstanding stays untouched.
- [ ] Try to approve or reject an already-finalized payment again — blocked with a clear "already finalized"/conflict error.
- [ ] Confirm there is no edit or delete action for a payment anywhere, before or after approval.

### 4.7 Products

- [ ] As `user`, confirm there is **no** "Add Product" affordance anywhere (create is admin-only) — but confirm `user` **can** edit and delete existing products (this asymmetry is intentional; verify it doesn't accidentally hide edit/delete for non-admins too).
- [ ] As admin, create a product: article number accepts only letters/numbers/dashes (try a space, an emoji, punctuation like `/` or `#` — all rejected), 1–50 chars.
- [ ] Try creating a product with an article number that already exists — rejected as a conflict.
- [ ] Edit an existing product — confirm the article-number field is **disabled/read-only** (immutable once created); name/unit/category/price remain editable.
- [ ] Try assigning a category that doesn't exist in the categories list — rejected ("unknown category").
- [ ] Price boundaries: 0 or negative rejected, fractional rupees (e.g. 1250.50) accepted, over 100,000,000 rejected.
- [ ] Try deleting a product that has already been used on a bill — blocked with a conflict error (referential integrity).
- [ ] Create a brand-new product and immediately check the Stock page — it should already have a stock row at 0/0 (warehouse/office) with no manual step needed.

### 4.8 Stock & stock movements

- [ ] As `user`, confirm the opening/add/adjust/reorder-level actions are **not available** anywhere on the Stock pages (admin-only).
- [ ] As admin, set an **opening** quantity for a product's warehouse stock for the first time — succeeds.
- [ ] Try setting the opening quantity **again** for that same product+location — rejected (it's a one-time baseline, per location). Then confirm you _can_ still set opening for the **office** side of the same product, since it's tracked independently per location.
- [ ] **Add** stock: quantity must be > 0 (0/negative rejected), up to 1,000,000 accepted, over that rejected; an optional note (≤200 chars) is recorded.
- [ ] **Adjust** stock: try submitting without a note/reason — rejected (a note is mandatory here, unlike Add). With a note, the counted quantity becomes the new absolute total, and the ledger should show the correct signed delta (up or down) to get there.
- [ ] Set a **reorder level** — confirm this action does **not** create a stock movement/ledger row (it's config only, not a quantity change).
- [ ] Push a product's total (warehouse+office) down to exactly the reorder level — the low-stock indicator should trigger at ≤ reorder level, not strictly below it.
- [ ] Anywhere on-hand quantity is shown (product row, stock list, dashboard, export), confirm the total always equals warehouse + office — never a stored/stale third number.
- [ ] Open a product's movement history — every sale, return, transfer, and manual change you triggered above should appear with the right kind, location, signed delta, and a running balance that matches on-screen stock.

### 4.9 Stock transfers

- [ ] Create a transfer (either role) between warehouse and office — from and to must differ; try selecting the same location for both — rejected client- and server-side.
- [ ] Add the same article twice in one transfer — rejected as a duplicate line.
- [ ] Try transferring more than what's available at the source location — hard-blocked with a conflict/shortfall message; note that unlike bills, there is **no override** for transfers.
- [ ] After a successful transfer, confirm the product's **total** on-hand is unchanged — only redistributed between the two locations.
- [ ] Confirm the transfer slip (`T-<n>`) has **no edit or delete** option anywhere — it's immutable.
- [ ] Use the "reverse transfer" affordance from a transfer's print/detail page — confirm it prefills a new transfer with from/to swapped, and posts correct paired ledger legs when submitted.
- [ ] Print a transfer slip — confirm the fields (slip no., locations, date, creator, line items — no monetary amount) are complete and correct.

### 4.10 Manage Users — admin only

- [ ] As `user`, confirm there's no "Manage Users" nav item and the route is unreachable (see §4.1).
- [ ] Create a user: name (1–120), valid email format (max 255), role (admin or user), password (minimum 8 characters — try 7 to confirm it's rejected). Confirm the dialog copy makes clear there's no email invite — the admin must share the password directly.
- [ ] Try creating a user with an email that already exists — rejected as a conflict.
- [ ] Edit an existing user's name/email/role — confirm there's **no** password field in the edit form (password changes go through the separate Reset Password flow).
- [ ] Log in as the seeded admin (Ahmed) and open **your own** row in Manage Users: the role selector should be **disabled** with an explanatory note ("You cannot change your own role") — you cannot demote yourself away from admin.
- [ ] Still as your own row: confirm the row's action menu has **no** Deactivate option at all for yourself (it's hidden, not just disabled) — you cannot deactivate your own account.
- [ ] Create a second test user, then **deactivate** them as admin — confirm their status badge flips to Inactive, and immediately try logging in as that user: login should be rejected even with the correct password.
- [ ] **Reactivate** the same user — they should be able to log in again.
- [ ] Use "Reset password" on a user: confirm the new password and confirm-password fields must match (try mismatched values — rejected), and the new password must meet the same 8-character minimum.
- [ ] After logging in with a reset password, confirm the old password no longer works.
- [ ] Open "View activity" for a user you've just created/edited/deactivated/reactivated/reset — confirm each action appears in their audit log with a sensible label (Created / Updated / Deactivated / Reactivated / Password reset) and the correct actor name and timestamp.
- [ ] Search and filter the user list by name/email, role, and status — confirm results match expectations.

### 4.11 Export — admin only

- [ ] As `user` or logged-out, hit `/api/export/customers` (or any resource) directly — blocked, no file.
- [ ] As admin, export each dataset — customers, payments, bills, ledger, stock, stock-movements — in each format: CSV, JSON, XLSX, PDF. Every combination should download a correctly named file (`{resource}-{date}.{ext}`) that actually opens/parses.
- [ ] Filter a list on-screen (e.g. payments by status or date range) before exporting — confirm the exported rows match exactly what's shown, not the full unfiltered table.
- [ ] Try exporting the **ledger** dataset without selecting a customer — should be rejected/blocked, since ledger export requires a `customerId` (the other datasets don't).
- [ ] Open an exported CSV/XLSX and check a money column — values should look like plain rupees (e.g. `1250.00`), never paisas (`125000`) or a pre-formatted string like `"Rs. 1,250"`.
- [ ] If the export UI offers column selection, confirm toggling columns off actually removes them from the downloaded file.

### 4.12 Ledger tab (customer detail)

- [ ] Open a customer's Ledger tab — the running balance shown on the **last row** should exactly equal that customer's current outstanding balance shown elsewhere (customer header, dashboard, etc.).
- [ ] Confirm only **approved** payments show up as credits in the running balance — a payment still `pending` or `rejected` should not have moved the balance.
- [ ] Filter the ledger by kind (sale/return/payment) and by date range — confirm it matches what you'd expect from the underlying bills/payments, and matches the ledger export for the same customer/filters.

### 4.13 Cross-cutting consistency

- [ ] After any mutating action (create/approve/reject a bill or payment, any stock change, a transfer), reload the dashboard, the customer's status badge, their Ledger tab, and the Stock list — all should reflect the change immediately, with nothing stale.
- [ ] The app treats "today" for date-range filters as the depot's fixed `Asia/Karachi` day, not your browser's local timezone or the server's. If your machine is in a different timezone, deliberately test a bill/payment dated near midnight and confirm it lands in the "today" bucket the depot would expect, not where your local clock says midnight is.
- [ ] Quantities are decimals with 3 decimal places (e.g. `12.500`). Enter a quantity with more than 3 decimals somewhere it's accepted and confirm it's rounded/truncated consistently everywhere it's displayed (bill, stock, movement history, export).

### 4.14 Responsive & general

Apply the generic guide's "check on every screen" list (§3) and the mobile
(375px) / tablet (768px) pass (§1) across every screen above, especially:

- [ ] Bill form (many inputs, dynamic line items) at 375px.
- [ ] Customer/product/user tables — do they scroll horizontally instead of breaking layout?
- [ ] Dialogs (Add Customer, Record Payment, Add User, Approval dialogs) fit on a small screen without clipped buttons.

---

## 5. Reporting what you find

Use the bug and feature-request templates in
[MANUAL-TESTING-GUIDE.md](MANUAL-TESTING-GUIDE.md#5-bug-report-template-one-per-bug).
Per that doc's severity rubric (§4): **anything touching money or
permissions defaults to Critical** — which covers a large share of the
scenarios above (credit limits, approvals, outstanding balances, role
boundaries). When in doubt, err toward the higher severity and let the
developer downgrade it.

---

## 6. Suggested order of attack

1. Happy path of each feature area in §4, as **both** roles — confirm the app works at all before hunting for edge cases.
2. Permission boundaries — every admin-only action, tried as `user` both via the UI and by pasting a direct URL/API route.
3. Boundary and invalid input on every form (§4.3–4.10 have the specific limits).
4. State/sequence edge cases — double-submit, the two-tab stock race (§4.4), refresh mid-form, approve/reject-twice idempotency (§4.4, §4.6).
5. Consistency sweep (§4.13) — do dashboard, ledger, and stock all agree after each action?
6. Responsive + keyboard-only pass (§4.14).
