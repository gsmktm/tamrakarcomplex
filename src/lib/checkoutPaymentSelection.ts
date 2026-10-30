/**
 * Keep checkout selection restricted to payment providers that are actually
 * ready for use. A provider can remain in the registry while disabled.
 */
export type ReadyPaymentOption = Readonly<{
  slug: string;
  is_ready: boolean;
}>;

export function chooseReadyPaymentMethod(
  methods: readonly ReadyPaymentOption[],
  currentSlug: string,
): string {
  if (methods.some((method) => method.slug === currentSlug && method.is_ready)) {
    return currentSlug;
  }
  return methods.find((method) => method.is_ready)?.slug ?? "";
}
