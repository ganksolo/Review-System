import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import Sidebar from "@/components/layout/Sidebar";

describe("Sidebar", () => {
  it("should render all navigation items", () => {
    render(<Sidebar />);

    expect(screen.getByText("仪表板")).toBeInTheDocument();
    expect(screen.getByText("交易列表")).toBeInTheDocument();
    expect(screen.getByText("新建交易")).toBeInTheDocument();
    expect(screen.getByText("规则库")).toBeInTheDocument();
    expect(screen.getByText("数据分析")).toBeInTheDocument();
  });

  it("should render the app title", () => {
    render(<Sidebar />);
    expect(screen.getByText("交易复盘")).toBeInTheDocument();
  });

  it("should render correct navigation links", () => {
    render(<Sidebar />);

    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));

    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/trades");
    expect(hrefs).toContain("/trades/new");
    expect(hrefs).toContain("/rules");
    expect(hrefs).toContain("/analytics");
  });

  it("should render mobile menu button", () => {
    render(<Sidebar />);
    expect(screen.getByLabelText("打开菜单")).toBeInTheDocument();
  });

  it("should open sidebar when mobile menu button is clicked", () => {
    render(<Sidebar />);

    const menuButton = screen.getByLabelText("打开菜单");
    fireEvent.click(menuButton);

    expect(screen.getByLabelText("关闭菜单")).toBeInTheDocument();
  });

  it("should close sidebar when close button is clicked", () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByLabelText("打开菜单"));
    fireEvent.click(screen.getByLabelText("关闭菜单"));

    const aside = screen.getByRole("complementary");
    expect(aside.className).toContain("-translate-x-full");
  });

  it("should close sidebar on Escape key", () => {
    render(<Sidebar />);

    fireEvent.click(screen.getByLabelText("打开菜单"));
    fireEvent.keyDown(document, { key: "Escape" });

    const aside = screen.getByRole("complementary");
    expect(aside.className).toContain("-translate-x-full");
  });

  it("should render version in footer", () => {
    render(<Sidebar />);
    expect(screen.getByText("Trading Review v1.0")).toBeInTheDocument();
  });
});
