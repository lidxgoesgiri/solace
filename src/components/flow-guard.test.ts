import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialFlowState, flowReducer, type FlowState } from "@/lib/flow";
import { FlowGuard } from "./flow-guard";

const page = vi.hoisted(() => ({
  pathname: "/hasil%60",
  hydrated: true,
  flow: null as FlowState | null,
  replace: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => page.pathname,
  useRouter: () => ({ replace: page.replace }),
}));
vi.mock("@/store/flow-store", () => ({
  useFlow: () => page.flow,
  useFlowHydrated: () => page.hydrated,
}));
vi.mock("@/components/page-loading", () => ({
  PageLoading: () => createElement("p", { "data-testid": "flow-loading" }, "Loading"),
}));

function renderUnknownPage() {
  return renderToStaticMarkup(createElement(FlowGuard, null,
    createElement("section", { "data-testid": "not-found" }, "Not found"),
  ));
}

beforeEach(() => {
  page.pathname = "/hasil%60";
  page.hydrated = true;
  page.flow = createInitialFlowState();
  page.replace.mockClear();
});

describe("K3: malformed history routes", () => {
  it("does not expose a 404 before persisted crisis state is known", () => {
    page.hydrated = false;
    expect(renderUnknownPage()).toContain("flow-loading");
    expect(renderUnknownPage()).not.toContain("not-found");
  });

  it("keeps unknown-page content hidden while help is pending", () => {
    page.flow = flowReducer(createInitialFlowState(), { type: "REQUEST_HELP", from: "/" });
    expect(renderUnknownPage()).toContain("flow-loading");
    expect(renderUnknownPage()).not.toContain("not-found");
  });

  it("shows the real 404 when no crisis is pending", () => {
    expect(renderUnknownPage()).toContain("not-found");
    expect(renderUnknownPage()).not.toContain("flow-loading");
  });

  it("restores ordinary 404 behavior after acknowledgement", () => {
    page.flow = flowReducer(
      flowReducer(createInitialFlowState(), { type: "REQUEST_HELP", from: "/" }),
      { type: "ACKNOWLEDGE_CRISIS" },
    );
    expect(renderUnknownPage()).toContain("not-found");
  });

  it("does not delay the landing page while storage loads", () => {
    page.pathname = "/";
    page.hydrated = false;
    const html = renderToStaticMarkup(createElement(FlowGuard, null, "Landing"));
    expect(html).toContain("Landing");
    expect(html).not.toContain("flow-loading");
  });
});
