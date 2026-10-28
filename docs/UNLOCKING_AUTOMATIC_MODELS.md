# /unlocking automatic device model catalog

Implemented October 28, 2026.

## What is now automatic

- `src/hooks/useUnlockingDeviceModels.ts` fetches `phone_models` plus `unlock_catalog` from the existing Supabase application database.
- Each source is paginated in 500-row batches (not silently capped at the first 1000), merged by normalized brand/model, and sorted.
- New models entered in `phone_models` appear on `/unlocking` after a cache refresh; the page revalidates every 5 minutes and has a **Refresh models** button.
- Brand tabs are generated from actual returned data, replacing the old manually coded ten-brand list.
- All returned models are browseable even when no specific unlock service has been registered. Service matches appear first in the relevant category.
- Brand and model are preserved as separate order fields, including brands with spaces.

## Important distinction: device model vs service availability

Presence of a model in the database only establishes that the device is listed. It **does not** prove that any paid supplier supports network unlock, FRP assistance, account unlock, or software repair.

- `phone_models` gives the general inventory of brand/model names.
- `unlock_catalog` holds manually maintained feature listings when present.
- `unlocking_services_export.csv` is a local service offer reference, not a live upstream supplier guarantee.
- Staff must confirm ownership, eligibility, terms, provider availability, current price, and turnaround **before** attempting paid processing.

We do not bypass or deactivate stolen-device blacklists, device theft protections, account security, or enterprise controls without authorized recovery/administrator validation.

## Future: integrate an authorized supplier API

The website reference UnlockRiver does not provide a confirmed public developer API in our research. Do not scrape private endpoints, duplicate proprietary customer data, or publish supplier credentials. Instead, build a separate server-only supplier adapter with provider consent and documented REST/DHRU contracts.

Suggested interface (not yet wired):

```ts
type SupplierCatalogAdapter = {
  listBrands(): Promise<{ id: string; name: string }[]>;
  listModels(brandId: string): Promise<{ id: string; name: string }[]>;
  listServices(modelId?: string): Promise<{ id: string; name: string; available: boolean }[]>;
  quote(serviceId: string, country?: string, carrier?: string): Promise<{ amountNpr: number; expiresAt: string }>;
  createAuthorizedOrder(input: { serviceId: string; deviceId: string; consentReference: string }): Promise<{ reference: string }>;
  checkOrder(reference: string): Promise<{ status: string }>;
};
```

Use secrets only on Supabase Edge Functions or other protected server components; rate-limit sync jobs, store provider sync timestamps, validate third-party schemas, provide an administrator approval stage, and never trust the frontend price. Supplier model synchronization requires real supplier credentials and license terms; **that is not active in this change**.

## Verification

- Run `npm test -- --run src/hooks/useUnlockingDeviceModels.test.ts`
- Run `npm run build`
- Open `/unlocking`, verify all brand tabs and refreshed counts.
- Add a model in an authorized admin catalog and click **Refresh models**. The new record should appear.
- Test model selection for brands containing spaces.
- Check order submission permissions and per-customer row access in `unlock_requests`.
- Confirm public browse rights for `phone_models` and `unlock_catalog` are safe; do not expose privileged supplier or customer data.
