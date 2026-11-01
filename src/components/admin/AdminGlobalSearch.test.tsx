import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { AdminGlobalSearch } from "./AdminGlobalSearch";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ role: "suadmin" }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/components/ui/command", () => {
  const Wrap = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    Command: Wrap,
    CommandDialog: ({ open, onOpenChange, children }: {
      open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode;
    }) => open ? (
      <div>
        <button onClick={() => onOpenChange(false)}>Close dialog</button>
        {children}
      </div>
    ) : null,
    CommandEmpty: Wrap,
    CommandGroup: Wrap,
    CommandItem: Wrap,
    CommandList: Wrap,
    CommandSeparator: Wrap,
    CommandInput: Wrap,
  };
});

type RpcResult = { data: unknown[] | null; error: Error | null };
function deferred() {
  let resolve!: (result: RpcResult) => void;
  const promise = new Promise<RpcResult>((done) => { resolve = done; });
  return { promise, resolve };
}

function item(title: string) {
  return { id: title, category: "product", title, subtitle: "Synthetic test only", status: "published", link: "/test" };
}

function openSearch() {
  render(<AdminGlobalSearch />);
  fireEvent.click(screen.getByRole("button", { name: /Search everything/i }));
  return screen.getByPlaceholderText("Search users, stores, products, orders...");
}

async function flushDebounce() {
  await act(async () => { vi.advanceTimersByTime(300); });
}

beforeEach(() => {
  vi.useFakeTimers();
  rpc.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AdminGlobalSearch stale RPC protection", () => {
  it("does not restore old results after the query is cleared", async () => {
    const first = deferred();
    rpc.mockReturnValueOnce(first.promise);
    const input = openSearch();
    fireEvent.change(input, { target: { value: "alpha" } });
    await flushDebounce();
    expect(rpc).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { value: "" } });
    await act(async () => { first.resolve({ data: [item("Old alpha")], error: null }); });
    expect(screen.queryByText("Old alpha")).not.toBeInTheDocument();
  });

  it("ignores an older response even when it resolves after the newer one", async () => {
    const first = deferred();
    const second = deferred();
    rpc.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const input = openSearch();
    fireEvent.change(input, { target: { value: "alpha" } });
    await flushDebounce();
    fireEvent.change(input, { target: { value: "beta" } });
    await flushDebounce();

    await act(async () => { second.resolve({ data: [item("New beta")], error: null }); });
    expect(screen.getByText("New beta")).toBeInTheDocument();
    await act(async () => { first.resolve({ data: [item("Old alpha")], error: null }); });
    expect(screen.getByText("New beta")).toBeInTheDocument();
    expect(screen.queryByText("Old alpha")).not.toBeInTheDocument();
  });

  it("clears previous results when a new RPC fails", async () => {
    const first = deferred();
    const second = deferred();
    rpc.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const input = openSearch();
      fireEvent.change(input, { target: { value: "alpha" } });
      await flushDebounce();
      await act(async () => { first.resolve({ data: [item("Old alpha")], error: null }); });
      expect(screen.getByText("Old alpha")).toBeInTheDocument();

      fireEvent.change(input, { target: { value: "beta" } });
      expect(screen.queryByText("Old alpha")).not.toBeInTheDocument();
      await flushDebounce();
      await act(async () => { second.resolve({ data: null, error: new Error("Synthetic RPC failure") }); });
      expect(screen.queryByText("Old alpha")).not.toBeInTheDocument();
      expect(errorLog).toHaveBeenCalledTimes(1);
    } finally {
      errorLog.mockRestore();
    }
  });

  it("discards a response received after the dialog closes", async () => {
    const first = deferred();
    rpc.mockReturnValueOnce(first.promise);
    const input = openSearch();
    fireEvent.change(input, { target: { value: "alpha" } });
    await flushDebounce();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    await act(async () => { first.resolve({ data: [item("Closed dialog result")], error: null }); });
    fireEvent.click(screen.getByRole("button", { name: /Search everything/i }));
    expect(screen.queryByText("Closed dialog result")).not.toBeInTheDocument();
  });
});
