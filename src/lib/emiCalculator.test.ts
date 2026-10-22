import { describe, expect, it } from "vitest";
import { buildEmiCalculatorPath, calculateEmiQuote, formatEmiNpr } from "@/lib/emiCalculator";

describe("calculateEmiQuote", () => {
  it("calculates a 0% installment quote with a down payment", () => {
    const quote = calculateEmiQuote({
      productPrice: 120000,
      downPayment: 24000,
      annualInterestRate: 0,
      months: 12,
    });
    expect(quote.principal).toBe(96000);
    expect(quote.monthlyPayment).toBe(8000);
    expect(quote.totalInterest).toBe(0);
    expect(quote.totalPayable).toBe(120000);
  });

  it("balances a rounded last installment without underpaying the principal", () => {
    const quote = calculateEmiQuote({ productPrice: 1000, downPayment: 0, annualInterestRate: 0, months: 3 });
    expect(quote.monthlyPayment).toBe(333.33);
    expect(quote.finalPayment).toBe(333.34);
    expect(quote.totalInstallments).toBe(1000);
    expect(quote.totalPayable).toBe(1000);
  });

  it("uses amortized balance for a nonzero APR", () => {
    const quote = calculateEmiQuote({
      productPrice: 100000,
      downPayment: 0,
      annualInterestRate: 12,
      months: 12,
      processingFee: 1000,
    });
    expect(quote.monthlyPayment).toBeCloseTo(8884.88, 2);
    expect(quote.totalInterest).toBeGreaterThan(6000);
    expect(quote.totalPayable).toBeCloseTo(quote.totalInstallments + 1000, 2);
  });

  it("can pay the full price upfront", () => {
    const quote = calculateEmiQuote({
      productPrice: 34000,
      downPayment: 34000,
      annualInterestRate: 5,
      months: 6,
    });
    expect(quote.monthlyPayment).toBe(0);
    expect(quote.totalPayable).toBe(34000);
  });

  it("rejects invalid inputs", () => {
    expect(() => calculateEmiQuote({ productPrice: 2000, downPayment: 3000, annualInterestRate: 0, months: 3 })).toThrow();
    expect(() => calculateEmiQuote({ productPrice: -1, downPayment: 0, annualInterestRate: 0, months: 3 })).toThrow();
    expect(() => calculateEmiQuote({ productPrice: 1000, downPayment: 0, annualInterestRate: -1, months: 3 })).toThrow();
    expect(() => calculateEmiQuote({ productPrice: 1000, downPayment: 0, annualInterestRate: 0, months: 0 })).toThrow();
    expect(() => calculateEmiQuote({ productPrice: Infinity, downPayment: 0, annualInterestRate: 0, months: 3 })).toThrow();
  });
});

describe("EMI page helpers", () => {
  it("carries product name and price in a URL-safe form", () => {
    expect(buildEmiCalculatorPath({ name: "iPhone 18 Pro & Max", price: 279900 })).toBe("/emi?product=iPhone+18+Pro+%26+Max&price=279900");
  });
  it("formats NPR values", () => {
    expect(formatEmiNpr(1000)).toContain("1,000.00");
  });
});
