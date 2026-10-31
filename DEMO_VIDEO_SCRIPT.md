# Brightloop Product Demonstration Video Script

**Target Duration**: 3 to 4 Minutes  
**Format**: Screen capture walkthrough with picture-in-picture narration or voiceover.

---

## Video Outline & Timestamps

| Timestamp | Scene | Feature Highlight |
| :--- | :--- | :--- |
| **0:00 - 0:30** | Scene 1: Introduction | Vision, Architecture & Problem Statement |
| **0:30 - 1:05** | Scene 2: Executive Dashboard | Sub-second KPIs, Real-time MRR & Aging Analysis |
| **1:05 - 1:40** | Scene 3: Catalog & Variants | Products, Plans, Price Differentials & Discounts |
| **1:40 - 2:20** | Scene 4: Subscription FSM | Quotation Templates, State Transitions & FSM |
| **2:20 - 2:55** | Scene 5: Automated Billing | Idempotent Recurring Batch Invoicing & Payments |
| **2:55 - 3:30** | Scene 6: Customer Portal | Self-service Portal & Enterprise RBAC Enforcement |
| **3:30 - 3:55** | Scene 7: Conclusion | Performance Summary, High Concurrency & Wrap-up |

---

## Detailed Script & Teleprompter Track

### Scene 1: Introduction & Architecture (0:00 - 0:30)

**[Screen Visual]**:  
*Show Brightloop landing login screen on `http://localhost:5173/login`, then a quick diagram graphic showing Go Gin Backend (`:8080`) + Embedded SQLite (WAL) + React Frontend (`:5173`).*

**[Voiceover / Speaker]**:  
> "Welcome to **Brightloop** — a high-performance, unified B2B Subscription, Billing, and Revenue Operations platform built from the ground up for modern recurring businesses.  
> 
> Managing complex B2B contracts, custom add-ons, tiered pricing, and recurring invoicing often forces companies to juggle disparate tools like Stripe, Chargebee, and Odoo. Brightloop unifies all of this into a single, high-speed monolithic architecture powered by Go, embedded SQLite with zero external database dependencies, and a sleek React frontend. Let’s dive in."

---

### Scene 2: Executive Finance Dashboard (0:30 - 1:05)

**[Screen Visual]**:  
*Log in as `admin@brightloop.local`. The Executive Dashboard loads instantly.*  
*Mouse cursor hovers over the 4 top KPI cards (Active Subscriptions, Monthly Recurring Revenue, Accounts Receivable, Overdue Count), then highlights the 30/60/90-day aging breakdown and monthly cash trend chart.*

**[Voiceover / Speaker]**:  
> "Logging in as the Finance Administrator, we are immediately greeted by the Executive Dashboard. Notice how fast this loads — all queries run in sub-2-millisecond indexed passes directly in Go.
> 
> In one view, executives see live Active Subscriptions, total Monthly Recurring Revenue, and our current outstanding Accounts Receivable. To eliminate delinquent accounts, our aging engine automatically categorizes outstanding balances into 30, 60, and 90-plus day risk buckets, allowing the revenue team to target collections proactively."

---

### Scene 3: Product Catalog, Variants & Plans (1:05 - 1:40)

**[Screen Visual]**:  
*Navigate to `/admin/products` and `/admin/plans`.*  
*Show products: Brightloop CRM and Brightloop ERP Enterprise.*  
*Expand product variants showing "Brand: Odoo Connector (+₹560.00)" and discount codes.*

**[Voiceover / Speaker]**:  
> "Brightloop features a flexible, multi-dimensional catalog. Products can be packaged as standalone licenses, services, or add-ons.
> 
> Here in the Enterprise ERP tier, notice our variant engine: selecting the 'Odoo Connector' variant dynamically layers an extra ₹560 pricing differential onto the contract base price. We also manage complex subscription plans with custom billing frequencies — monthly or yearly — and strict operational flags like pause permissions, minimum contract quantities, and automated renewal rules."

---

### Scene 4: Quotation Templates & Subscription FSM (1:40 - 2:20)

**[Screen Visual]**:  
*Navigate to `/staff/quotation-templates`.*  
*Click 'Convert to Quotation' on a pre-built template. Select customer 'Acme Corp'.*  
*Show the newly created contract draft. Click 'Send Quotation' (status moves to QUOTATION with validity countdown). Click 'Confirm', then click 'Activate'. The lifecycle stepper moves from DRAFT $\rightarrow$ QUOTATION $\rightarrow$ CONFIRMED $\rightarrow$ ACTIVE.*

**[Voiceover / Speaker]**:  
> "Sales teams don't have to build contracts from scratch. With Quotation Templates, staff can convert commercial packages into customer-ready quotes with one click.
> 
> Brightloop enforces a strict Finite State Machine for every contract. When we send the quote, a deterministic 30-day validity window begins. Once accepted, it moves to 'Confirmed', and upon activation, our billing scheduler automatically takes over the subscription's recurring cadence."

---

### Scene 5: Automated Batch Billing & Payment Settlement (2:20 - 2:55)

**[Screen Visual]**:  
*Navigate to `/staff/invoices`.*  
*Click 'Run Billing Cycle'. An alert shows batch execution completed, displaying invoices created.*  
*Click 'Run Billing Cycle' a second time to demonstrate idempotency: 0 duplicates created!*  
*Open an unpaid invoice. Click 'Record Payment' using Bank Transfer. The balance due drops to ₹0 and status transitions to 'PAID'.*  
*Click the Print button to reveal the clean, printable HTML tax invoice.*

**[Voiceover / Speaker]**:  
> "Now let's examine automated recurring billing. In the Invoices dashboard, clicking 'Run Billing Cycle' processes all active contracts due for renewal.
> 
> Notice what happens if we click it again: zero duplicate invoices are created. Our idempotent composite unique indexing guarantees absolute ledger integrity even across concurrent worker threads.
> 
> Recording payments is seamless — we support multi-method logging across Bank Transfer, UPI, Credit Card, and Cash. As partial or full payments are logged, the balance recalculates live. And with one click, a printable, compliant tax invoice is ready for the client."

---

### Scene 6: Customer Self-Service Portal & RBAC Security (2:55 - 3:30)

**[Screen Visual]**:  
*Log out of Admin. Log in as `customer1@brightloop-client.com`.*  
*Show the Customer Portal: only their own contracts and invoices appear.*  
*Attempt to manually navigate to `/admin/products` or call admin API: immediate 403 Forbidden alert is displayed.*

**[Voiceover / Speaker]**:  
> "Brightloop isn't just internal — it includes a dedicated Customer Self-Service Portal.
> 
> Logged in as a client, customers see only their own active subscriptions and invoices. They can review upcoming renewal dates, pause their service, and download receipts.
> 
> Furthermore, security is baked into the router level. Any customer attempt to access administrative endpoints or other tenants' data is strictly stopped by our RBAC middleware with an immediate 403 Forbidden."

---

### Scene 7: Conclusion & Architecture Wrap-Up (3:30 - 3:55)

**[Screen Visual]**:  
*Briefly switch to terminal displaying `go test -race ./tests/...` passing with 0 data races, and `npm run test` with 54 passing tests.*  
*Return to the Brightloop dashboard.*

**[Voiceover / Speaker]**:  
> "To summarize: Brightloop delivers an enterprise-grade, deterministic revenue engine in a lightweight, single-binary footprint. Over 50 unit and stress tests verify zero concurrency deadlocks under high load.
> 
> From quote to cash, Brightloop streamlines your entire recurring revenue lifecycle. Thank you for watching!"

---

## Production & Recording Tips

1. **Resolution**: 1920x1080 (1080p 60fps) or 2560x1440 (1440p).
2. **Audio**: Use a clear USB or cardioid microphone with noise suppression enabled.
3. **Pacing**: Pause for 1 second between navigation clicks to let viewers absorb the UI animations and clean status badges.
4. **Mouse Highlight**: Enable a subtle cursor click ring effect in OBS Studio or ScreenFlow.
