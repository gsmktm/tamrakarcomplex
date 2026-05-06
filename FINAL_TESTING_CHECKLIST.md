# Final Testing Checklist

This checklist covers the critical flows and security requirements for the Tamrakar platform.

## 1. Price List
- [ ] **Public View:** Verify public users can view the mobile price list.
- [ ] **Brand Filter:** Test that filtering by brand updates the list correctly.
- [ ] **Search:** Ensure the search bar filters products by name/model.
- [ ] **Price Sort:** Confirm sorting by price (asc/desc) works.
- [ ] **Admin Edit:** Verify Admin/Super Admin can edit prices in `PriceListManager`.
- [ ] **Numeric Sort:** Specifically test `price_npr` numeric sorting (e.g., 10000 < 2000).
- [ ] **Verification:** Ensure unverified items do not appear in the public price list.

## 2. Brand
- [ ] **Logos:** Verify brand logos appear correctly in lists and details.
- [ ] **Normalization:** Test brand aliases (e.g., "OPPO", "Oppo", "oppo" should normalize to "Oppo").

## 3. Store
- [ ] **Free Tier:** Confirm free stores only show basic information.
- [ ] **Silver Tier:** Verify silver store contact details are visible only after login.
- [ ] **Gold Tier:** Ensure gold stores appear in "Featured" sections.
- [ ] **Diamond Tier:** Verify diamond stores appear at the top of listings.
- [ ] **Ownership:** Test that store admins can ONLY edit their own store data.

## 4. Marketplace
- [ ] **Listing Creation:** Verify store admins can add new listings.
- [ ] **Approval Flow:** Confirm Super Admin can approve/reject listings.
- [ ] **Visibility:** Test that only active/approved listings are visible to the public.
- [ ] **Tier Restriction:** Ensure free stores cannot create marketplace listings.
- [ ] **Priority:** Verify Diamond listings are prioritized in search/browse results.

## 5. Sell Phone (Leads)
- [ ] **Brand/Model Select:** Test the cascading brand -> model selection.
- [ ] **Quote Gate:** Confirm the quote/valuation is hidden until Name/Phone/Email are provided.
- [ ] **Lead Saving:** Verify leads are saved to the database correctly.
- [ ] **Admin Visibility:**
    - [ ] Super Admin sees all leads.
    - [ ] Store Admin sees only leads assigned to them.
- [ ] **Popularity:** Verify "Popular Model" order updates based on lead frequency.

## 6. Checkout
- [ ] **COD:** Test Cash on Delivery order flow.
- [ ] **eSewa:** Verify eSewa payments remain "Pending" until manual/automated verification.
- [ ] **Store Admin View:** Confirm orders appear in the respective store admin dashboard.
- [ ] **Commission:** Verify commission calculation logic for each sale.
- [ ] **Payouts:** Confirm payout ledger entries are created automatically.

## 7. Repair
- [ ] **Public Request:** Test submitting a repair request as a guest.
- [ ] **Tracking:** Verify the Tracking ID allows status lookup.
- [ ] **Assignment:** Confirm Super Admin can assign repairs to specific stores.
- [ ] **Status Updates:** Verify store admins can update the repair status (e.g., "In Progress", "Completed").

## 8. Security
- [ ] **Admin Access:** Verify public users are redirected from `/admin/*`.
- [ ] **Permissions:** Test that staff without specific permissions cannot access restricted modules.
- [ ] **Data Isolation:** Ensure store admins cannot access or modify data from other stores.
- [ ] **Production Config:** Verify no "Demo Data" fallbacks are active in production mode.

## 9. Final Verification
- [ ] **Build:** Run `npm run build` and ensure no errors.
- [ ] **TypeScript:** Fix all `tsc` errors.
- [ ] **Console:** Clear all console errors/warnings in the browser.
- [ ] **Routes:** Click through all primary routes to ensure they load.
