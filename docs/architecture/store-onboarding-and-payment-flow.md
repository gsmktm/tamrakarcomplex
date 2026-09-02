# Store onboarding and subscription payment flow

## Canonical lifecycle

1. **Choose package** — `/stores/pricing` sends `plan` to `/stores/apply`.
2. **Apply** — the application stores the requested package and monthly/yearly billing period together with owner, shop, and verification details.
3. **Review** — an admin can reject, request information, or approve. Approval runs `approve_store_application`; it cannot be reproduced with direct browser updates.
4. **Provision** — approval creates or links one store and one canonical subscription. Free activates immediately. Paid plans enter `pending_payment` and retain Free entitlements until payment verification.
5. **Pay** — an authenticated owner/store admin submits the package, billing period, payment method, and provider reference from **My Subscription**. The database calculates the amount; the browser never supplies the price.
6. **Verify** — `/admin/subscriptions` lists pending payments. Staff verify the provider/bank/cash evidence, then call `verify_store_subscription_payment`.
7. **Activate** — one transaction marks payment complete, activates `store_subscriptions`, updates canonical `stores.package_id/package_slug`, and sets the start/end date (30 days monthly, 365 yearly). The action is written to `audit_logs`.
8. **Renew** — a new payment request and verification extends/replaces the active period through the same transition. Failed/refunded payments never grant entitlements.
9. **Expire/suspend** — runtime entitlement checks treat anything except an active, unexpired paid subscription as Free. A scheduled database job should mark elapsed subscriptions `expired`; the safe fallback already occurs at read time.

## Roles and responsibilities

- **Applicant:** chooses a plan and submits truthful business documents; does not pay before business approval.
- **Store owner/admin:** submits a payment reference and can read only payments for their own store.
- **Staff admin:** reviews applications and verifies payment evidence.
- **Super admin:** manages package prices/features, audits payments, suspends/refunds subscriptions, and resolves ownership conflicts.
- **Database:** owns prices, authorization, state transitions, uniqueness, activation dates, and audit records.

## Payment-provider boundary

The current UI supports verified manual references for eSewa, bank transfer, and office cash. A future eSewa callback must call the same activation transition only after checking eSewa's server-to-server status, amount, merchant code, and unique transaction reference. A success URL alone must never activate a package.

## Operational checks

- Confirm the applicant's license and store identity before approval.
- Match amount, provider reference, recipient account, and payer before clicking **Verify and activate**.
- Never edit `stores.package_slug` alone; use the verified transition or an audited super-admin assignment flow.
- For refunds, mark the payment `refunded`, suspend/cancel the subscription, and preserve the payment/audit rows.
- Configure a daily expiry job and payment-provider webhook before enabling automatic renewal.
