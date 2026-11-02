// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PaymentMethodsLoadError } from "./PaymentMethodsLoadError";

afterEach(cleanup);

describe("PaymentMethodsLoadError", () => {
  it("announces the provider-fetch failure without implying an order was placed", () => {
    render(<PaymentMethodsLoadError retrying={false} onRetry={() => {}} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Payment options could not be loaded");
    expect(alert.textContent).not.toContain("Order placed");
  });

  it("offers a retry action without submitting the checkout form", () => {
    const retry = vi.fn();
    render(<form onSubmit={vi.fn()}><PaymentMethodsLoadError retrying={false} onRetry={retry} /></form>);
    const button = screen.getByRole("button", { name: "Retry payment options" });
    expect(button.getAttribute("type")).toBe("button");
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("disables repeated retry clicks while the provider request is in flight", () => {
    const retry = vi.fn();
    render(<PaymentMethodsLoadError retrying onRetry={retry} />);
    const button = screen.getByRole("button", { name: /Retrying payment options/i });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(retry).not.toHaveBeenCalled();
  });
});
