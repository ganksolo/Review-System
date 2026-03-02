import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import QueryProvider from "@/components/QueryProvider";

function TestConsumer() {
  const qc = useQueryClient();
  return <div data-testid="consumer">{qc ? "connected" : "disconnected"}</div>;
}

describe("QueryProvider", () => {
  it("should provide QueryClient to children", () => {
    render(
      <QueryProvider>
        <TestConsumer />
      </QueryProvider>
    );

    expect(screen.getByTestId("consumer")).toHaveTextContent("connected");
  });

  it("should render children", () => {
    render(
      <QueryProvider>
        <div data-testid="child">Hello</div>
      </QueryProvider>
    );

    expect(screen.getByTestId("child")).toHaveTextContent("Hello");
  });
});
