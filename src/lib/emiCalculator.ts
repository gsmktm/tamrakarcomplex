/**
 * Indicative EMI mathematics for customers. No bank approval or financing
 * offer is represented by these calculations.
 */
export interface EmiQuoteInput {
  productPrice: number;
  downPayment: number;
  annualInterestRate: number;
  months: number;
  processingFee?: number;
}

export interface EmiQuote {
  productPrice: number;
  downPayment: number;
  principal: number;
  annualInterestRate: number;
  months: number;
  processingFee: number;
  monthlyPayment: number;
  finalPayment: number;
  totalInstallments: number;
  totalInterest: number;
  totalPayable: number;
}

const toPaisa = (value: number) => Math.round(value * 100);
const toNpr = (paisa: number) => paisa / 100;

function mustBeNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number`);
  }
}

/** Price, down payment and processing fee are NPR. Interest is annual percent. */
export function calculateEmiQuote(input: EmiQuoteInput): EmiQuote {
  const { productPrice, downPayment, annualInterestRate, months, processingFee = 0 } = input;

  mustBeNonNegativeFinite(productPrice, "Product price");
  mustBeNonNegativeFinite(downPayment, "Down payment");
  mustBeNonNegativeFinite(annualInterestRate, "Interest rate");
  mustBeNonNegativeFinite(processingFee, "Processing fee");
  if (!Number.isSafeInteger(months) || months < 1 || months > 360) {
    throw new RangeError("Tenure must be between 1 and 360 whole months");
  }
  if (annualInterestRate > 100) {
    throw new RangeError("Interest rate must be at most 100% APR");
  }
  const pricePaisa = toPaisa(productPrice);
  const downPaisa = toPaisa(downPayment);
  const feePaisa = toPaisa(processingFee);
  if (downPaisa > pricePaisa) {
    throw new RangeError("Down payment cannot exceed product price");
  }

  const principalPaisa = pricePaisa - downPaisa;
  const principal = toNpr(principalPaisa);
  const periodicRate = annualInterestRate / 1200;
  const installment = principalPaisa === 0
    ? 0
    : periodicRate === 0
      ? principal / months
      : principal * (periodicRate / (1 - Math.pow(1 + periodicRate, -months)));

  // Round the displayed installment to paisa, and derive totals from it.
  const installmentPaisa = Math.max(0, toPaisa(installment));
  // Preserve the total principal even when rounding would leave the final
  // scheduled installment short by one or more paisa.
  const installmentsPaisa = Math.max(principalPaisa, toPaisa(installment * months));
  const finalPaymentPaisa = installmentsPaisa - installmentPaisa * (months - 1);
  const totalInterestPaisa = installmentsPaisa - principalPaisa;

  return {
    productPrice: toNpr(pricePaisa),
    downPayment: toNpr(downPaisa),
    principal,
    annualInterestRate,
    months,
    processingFee: toNpr(feePaisa),
    monthlyPayment: toNpr(installmentPaisa),
    finalPayment: toNpr(finalPaymentPaisa),
    totalInstallments: toNpr(installmentsPaisa),
    totalInterest: toNpr(totalInterestPaisa),
    totalPayable: toNpr(downPaisa + installmentsPaisa + feePaisa),
  };
}

export function formatEmiNpr(value: number): string {
  return `Rs. ${value.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildEmiCalculatorPath(product?: { name?: string; price?: number }): string {
  if (!product) return "/emi";
  const params = new URLSearchParams();
  if (product.name) params.set("product", product.name);
  if (Number.isFinite(product.price) && (product.price ?? 0) > 0) {
    params.set("price", String(product.price));
  }
  const query = params.toString();
  return query ? `/emi?${query}` : "/emi";
}
