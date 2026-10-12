/**
 * Payment confirmation is not the same as an HTTP 200 response.
 * Only an explicit { success: true } returned by the secure verification
 * function can cause the browser to clear its cart.
 */
export function isConfirmedPaymentVerification(data: unknown): data is { success: true; message?: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    (data as Record<string, unknown>).success === true
  );
}
