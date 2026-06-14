---
name: invoice-generation
description: Generate an invoice for a client — pull time logs, calculate hours, generate a PDF, email the invoice. Used for "invoice client X" or "create invoice for project Y".
trigger:
  - "invoice client"
  - "create invoice"
  - "generate invoice"
  - "send invoice"
tools_required: ["filesystem", "gmail"]
category: communication
estimated_time: "5-15 minutes"
always_loaded: false
preferred_model_role: office
---

# Invoice Generation

## Purpose

Generate an invoice for a client. The skill pulls time logs (or the agreed scope for fixed-price projects), calculates the amount, generates a PDF, and emails it to the client. Used for "invoice client X" or "create invoice for project Y". The skill is **autonomous for standard invoices** (hourly at the team's rate, fixed scope, retainer) and **HALTS for unusual terms** (custom milestones, multi-currency, disputed hours) — those need a human-composed invoice.

The skill composes the `filesystem` MCP (for the PDF generation + attachment) + `gmail` MCP (for sending) into a single flow.

## Prerequisites

- A client (`args.client` is the client name; the skill looks up the engagement)
- A billing period (default: last month; `args.period` can override)
- A pricing model (the skill looks up the client's contract; defaults to hourly at the team's rate)
- The client has a billing email (`args.to_email`; the skill looks it up if not provided)
- The team's invoice template (at `docs/templates/invoice.html`; the skill renders the template with the data)

## Steps

### Step 1: Pull the time logs (for hourly invoices)

If the client's pricing model is hourly, the skill pulls the time logs:

```
api.list_time_logs({
  client: "<client name>",
  start: "<period start>",
  end: "<period end>",
  billable: true,
})
```

The response is an array of `{ date, user, hours, description, hourly_rate }` entries. The skill aggregates by user + project.

If the pricing model is fixed-price, the skill pulls the agreed milestones from the contract.

If the pricing model is retainer, the skill pulls the monthly retainer amount from the contract.

### Step 2: Calculate the line items

The skill aggregates the time logs into line items:

- By user: `<user name> — <hours> hours @ $<rate> = $<total>`
- By project: `<project name> — <hours> hours @ $<rate> = $<total>` (if the client has multiple projects)
- By phase: `<phase name> — <hours> hours @ $<rate> = $<total>` (for multi-phase engagements)

The skill also adds a line item for expenses (if any) and a line item for the previous balance (if unpaid).

### Step 3: Compute the total

The skill applies:

- **Subtotal** — sum of line items
- **Tax** (if applicable) — `<subtotal> × <tax_rate>`
- **Discount** (if applicable) — `-<discount_amount>`
- **Previous balance** — `+<unpaid_amount>` (carried from prior invoices)
- **Total** — `<subtotal> + <tax> - <discount> + <previous_balance>`

The math is verified by the skill (the LLM doesn't do arithmetic; the skill uses a calculator).

### Step 4: Render the PDF

The skill renders the invoice template with the data:

```html
<!-- docs/templates/invoice.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Invoice #<number></title>
  <style>... invoice CSS ...</style>
</head>
<body>
  <header>
    <h1>Invoice</h1>
    <p>Invoice #: <number></p>
    <p>Date: <date></p>
    <p>Due date: <date + 30 days></p>
  </header>

  <section class="bill-to">
    <h2>Bill to</h2>
    <p><client name></p>
    <p><client address></p>
  </section>

  <section class="line-items">
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>User / Project</th>
          <th>Description</th>
          <th>Hours</th>
          <th>Rate</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr ng-repeat="item in items">
          <td>{{item.date}}</td>
          <td>{{item.user_or_project}}</td>
          <td>{{item.description}}</td>
          <td>{{item.hours}}</td>
          <td>{{item.rate}}</td>
          <td>{{item.total}}</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="totals">
    <p>Subtotal: $<subtotal></p>
    <p>Tax (<rate>%): $<tax></p>
    <p>Discount: -$<discount></p>
    <p>Previous balance: $<previous_balance></p>
    <p><strong>Total: $<total></strong></p>
  </section>

  <section class="payment-terms">
    <h2>Payment terms</h2>
    <p>Net 30. Please remit to <bank details>.</p>
  </section>
</body>
</html>
```

The template is filled with the data; the HTML is converted to PDF using a Node-side renderer (e.g. Puppeteer or a lightweight `html-to-pdf` library). The PDF is saved to `/workspace/invoices/<client-slug>-<date>.pdf`.

### Step 5: Record the invoice in the DB

The skill records the invoice in the `invoices` table via the API factory:

```
{
  client: "<client name>",
  invoice_number: "<number>",
  period_start: "<date>",
  period_end: "<date>",
  subtotal: <amount>,
  tax: <amount>,
  discount: <amount>,
  previous_balance: <amount>,
  total: <amount>,
  due_date: "<date + 30 days>",
  status: "draft",
  pdf_path: "/workspace/invoices/<slug>.pdf",
}
```

The dashboard renders the invoice list; the operator can see which invoices are pending, paid, or overdue.

### Step 6: Draft the email

The skill calls `email-draft` with the invoice as an attachment:

```
gmail.create_draft({
  to: "<client billing email>",
  subject: "Invoice <number> from <Team Name> — due <date>",
  body: "<cover letter — 1 paragraph + invoice summary>",
  attachments: [{ filename: "<slug>.pdf", path: "/workspace/invoices/<slug>.pdf" }],
})
```

The cover letter is a short note: "Attached is invoice <number> for the period <start> – <end>. Total due is $<total>. Payment is due by <date>. Let me know if you have questions."

### Step 7: Optionally send (manual approval)

The skill does **not** send the email automatically. The user reviews the draft in Gmail and clicks Send. The `args.send = true` flag can be set to auto-send (use with care — the user is trusting the skill to send a real invoice).

If `args.send = true`, the skill sends the draft:

```
gmail.send_draft({ draft_id: "<draft-id>" })
```

The invoice status is updated to `sent` in the DB.

### Step 8: Log to system_logs

The skill writes a `system_logs` row:

```
{
  level: "info",
  source: "skill:invoice-generation",
  message: "Generated invoice <number> for <client>",
  payload: { client, invoice_number, total, status: "draft" | "sent" }
}
```

The dashboard renders the event in the logs page.

### Step 9: Notify the user

Send the user a chat message:

```
[INVOICE DRAFTED] <Client Name>: <number>
- Period: <start> – <end>
- Total: $<total>
- Due: <date>
- PDF: <path>
- Email: <Gmail draft URL>
- Status: <draft | sent>
```

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "client": "...",
    "invoice_number": "...",
    "total": 12500.00,
    "currency": "USD",
    "due_date": "...",
    "pdf_path": "...",
    "gmail_draft_url": "...",
    "status": "draft" | "sent",
    "duration_ms": 12345
  }
}
```

The dashboard renders the invoice card; the chat shows the summary.

## Error Handling

- **No time logs for the period** — the skill halts; the user reviews
- **The contract pricing is unclear** — the skill picks the most common (hourly); the user reviews
- **The PDF renderer fails** — the skill retries; if it keeps failing, the user generates the PDF manually
- **The client has no billing email** — the user provides one
- **The invoice amount is $0 (e.g. all hours were non-billable)** — the skill halts; the user reviews
- **The Gmail draft fails (attachment too large)** — the skill reduces the PDF quality; retries

## Quality Checks

Before declaring the invoice complete:

- [ ] Time logs pulled (or contract terms for fixed/retainer)
- [ ] Line items aggregated correctly
- [ ] Math verified (subtotal + tax - discount + previous = total)
- [ ] PDF rendered with the team template
- [ ] PDF attached to the Gmail draft
- [ ] `invoices` row created in the DB
- [ ] `system_logs` row created
- [ ] User notified

An invoice that doesn't pass all 8 is a degraded invoice. The skill returns `skill:result` with `degraded: true` and a `note` field; the user reviews the invoice before sending.
