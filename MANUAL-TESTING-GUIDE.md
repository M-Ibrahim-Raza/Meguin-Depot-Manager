# Manual Frontend Testing Guide (Generic)

A reusable, frontend-only testing playbook for any web app, plus copy-paste
templates for reporting bugs and feature requests to an agentic developer.

> For MMS-specific step-by-step test scenarios (accounts, routes, business
> rules), see [MANUAL-QA-TEST-PLAN.md](MANUAL-QA-TEST-PLAN.md).

---

## 1. Setup

1. Run the app locally (e.g. `npm run dev`) and open it in a browser.
2. Get test accounts for **every role** (admin/user/etc.). Always test as each role.
3. Keep **DevTools open** the whole time:
   - **Console** — any red error during a working flow is a bug. Note it.
   - **Network** — watch API calls; a 200 with an error body, a 500, or a button that fires nothing are all bugs. Read the response, not just the status.
   - **Device toolbar** — test at 375px (mobile) and 768px (tablet).

---

## 2. The six testing lenses

For every screen and input, go beyond the happy path:

1. **Happy path** — does the intended flow work end to end? (Do this first.)
2. **Boundaries** — min, min−1, max, max+1, zero, empty for every field. _(Most bugs live here.)_
3. **Invalid input** — letters in number fields, bad date formats, emoji, leading/trailing spaces, very long strings, HTML/script tags (`<script>alert(1)</script>`).
4. **State & sequence** — double-click submit, do steps out of order, hit Back after submit, refresh mid-form, edit the same record in two tabs.
5. **Permissions** — can a low-privilege role reach a restricted action via URL, a stray button, or a replayed request? Does the **server** reject it, not just the UI?
6. **Consistency** — after an action, do all views of that data agree (list, detail, totals, dashboards)?

**Boundary example** — a field accepting 1–120 chars:

| Input     | Expected              |
| --------- | --------------------- |
| empty     | rejected, clear error |
| 1 char    | accepted              |
| 120 chars | accepted              |
| 121 chars | rejected, clear error |

Do the same for numbers (0, negative, max, max+1, decimals where only ints are allowed) and dates (valid, `2026-13-40`, `not-a-date`, empty).

---

## 3. Check on EVERY screen

- Loads with no console errors.
- Loading, empty, and error states all render sensibly (test error states by killing the network and reloading).
- Buttons disable while a request is in flight (no double-submit).
- Success/error messages appear and are useful.
- Back / forward / refresh don't corrupt state.
- Layout holds at mobile and tablet widths.

---

## 4. Severity

| Severity     | Definition                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| **Critical** | Data loss/corruption, wrong money math, permission bypass, crash/white screen, or core flow fully blocked. |
| **High**     | Primary feature broken or giving wrong results; no workaround.                                             |
| **Medium**   | Works but wrong/confusing; workaround exists.                                                              |
| **Low**      | Cosmetic, copy, minor UX friction.                                                                         |

Treat anything touching money or permissions as **Critical** by default.

---

## 5. Bug report template (one per bug)

```markdown
## BUG: <one-line summary>

- **Severity:** Critical | High | Medium | Low
- **Area / Feature:** <where it lives>
- **Role:** <role used> | logged-out
- **Environment:** local dev · <browser + version> · width <px>
- **Frequency:** always | intermittent (N of M)

### Steps to reproduce

1. Log in as <role>
2. Go to <URL or click path>
3. <exact inputs, with exact values>
4. <action>

### Expected

<what should happen>

### Actual

<what happened — quote any error verbatim>

### Evidence

- Screenshot/recording: <attach>
- Console errors: <paste, or "none">
- Network: <failing call, status, response body, or "n/a">

### Impact

<who is affected and why it matters>

### Notes for the developer (optional)

- Suspected area: <file/component>
- Regression test to add: <the scenario above>
```

---

## 6. Feature-request template

```markdown
## FEATURE: <short title>

- **Type:** New feature | Enhancement | UX polish
- **Priority:** Must-have | Nice-to-have | Someday
- **Area / Feature:** <where it lives>
- **Role affected:** <role(s)>

### Problem / motivation

<the user pain or gap today>

### Proposed behavior

<what it should do, from the user's point of view>

### Acceptance criteria (testable)

- [ ] <observable condition>
- [ ] <permission rule, if any>
- [ ] <empty/error/loading state handled>

### Out of scope

<what this explicitly does NOT include>

### Notes for the developer (optional)

- Likely touch points: <files/components>
- Reuse: <existing util/component to extend>
```

```

---

## 7. Suggested order of attack

1. Happy path of each core flow (confirm the app works at all).
2. Permission tests — every restricted action, as a low-privilege role and via direct URL.
3. Boundary + invalid input on every form.
4. State/sequence edge cases (double-submit, two-tab, refresh mid-flow).
5. Consistency sweep — do dashboards/totals/lists agree after each action?
6. Responsive + keyboard-only pass across the app.
```
