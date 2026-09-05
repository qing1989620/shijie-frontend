import { describe, expect, it } from "vitest";
import { formatMs, renderMath, stemTextSafe } from "../src/lib/testkit";
import { tokens } from "../src/stores/auth";

describe("formatMs", () => {
  it("formats milliseconds as m:ss", () => {
    expect(formatMs(0)).toBe("0:00");
    expect(formatMs(65000)).toBe("1:05");
    expect(formatMs(null)).toBe("0:00");
  });
});

describe("renderMath", () => {
  it("renders inline LaTeX to KaTeX html", () => {
    const out = renderMath("椭圆 $\\frac{x^2}{25}+\\frac{y^2}{16}=1$ 的焦点");
    expect(JSON.stringify(out)).toContain("katex");
  });
  it("keeps plain text untouched", () => {
    const out = renderMath("没有公式的普通文本");
    expect(JSON.stringify(out)).toContain("没有公式的普通文本");
  });
});

describe("stemTextSafe", () => {
  it("strips LaTeX and truncates", () => {
    expect(stemTextSafe("$\\frac{x^2}{9}$ 的离心率是？额外很长的内容需要被截断掉一部分")).toHaveLength(15);
  });
});

describe("auth tokens", () => {
  it("stores and clears session", () => {
    tokens.access = "a";
    tokens.refresh = "r";
    expect(tokens.hasSession).toBe(true);
    tokens.clear();
    expect(tokens.hasSession).toBe(false);
  });
});
