import { describe, it, expect } from "vitest";
import { cleanEsoText, renderEsoFormattedText, getEsoIconUrl, cn } from "../lib/utils";

describe("cleanEsoText utility", () => {
  it("returns empty string for non-string or falsy inputs", () => {
    expect(cleanEsoText(null)).toBe("");
    expect(cleanEsoText(undefined)).toBe("");
    expect(cleanEsoText("")).toBe("");
    expect(cleanEsoText(123)).toBe("");
    expect(cleanEsoText({})).toBe("");
    expect(cleanEsoText([])).toBe("");
    expect(cleanEsoText(true)).toBe("");
    expect(cleanEsoText(false)).toBe("");
  });

  it("normalizes literal escaped newlines to spaces", () => {
    expect(cleanEsoText("Line 1\\nLine 2")).toBe("Line 1 Line 2");
    expect(cleanEsoText("Header\\n\\nSubtext")).toBe("Header Subtext");
    expect(cleanEsoText("\\nLeading and trailing\\n")).toBe("Leading and trailing");
  });

  it("strips ESO hyperlink wrappers (|H...|h[Name]|h)", () => {
    const rawLink = "|H1:item:12345:1:1:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h[Rubedite Sword]|h";
    expect(cleanEsoText(rawLink)).toBe("[Rubedite Sword]");

    const multiLink = "Compare |H1:item:1|h[Item A]|h with |H1:item:2|h[Item B]|h";
    expect(cleanEsoText(multiLink)).toBe("Compare [Item A] with [Item B]");
  });

  it("strips inline texture tags (|t...|t)", () => {
    expect(cleanEsoText("Item |t16:16:eso/ui/icon.dds|t Description")).toBe("Item Description");
    expect(cleanEsoText("|t32:32:icon.dds|tOnly Icon")).toBe("Only Icon");
  });

  it("strips ESO color codes (|cRRGGBB...|r) and handles unclosed color codes", () => {
    expect(cleanEsoText("|cFF0000Red Text|r Normal Text")).toBe("Red Text Normal Text");
    expect(cleanEsoText("|c00FF00Unclosed Green")).toBe("Unclosed Green");
    expect(cleanEsoText("|cff0000Lower Hex|r")).toBe("Lower Hex");
    expect(cleanEsoText("|cFF0000Red|r |c0000FFBlue|r")).toBe("Red Blue");
  });

  it("strips leftover color reset tags (|r)", () => {
    expect(cleanEsoText("Orphan |r tag")).toBe("Orphan tag");
  });

  it("strips ESO grammatical gender and number suffixes (^n, ^p, ^ns, ^m, ^f, ^d)", () => {
    expect(cleanEsoText("Iron Sword^p")).toBe("Iron Sword");
    expect(cleanEsoText("Rubedite Ingot^ns")).toBe("Rubedite Ingot");
    expect(cleanEsoText("Cuirass^f")).toBe("Cuirass");
    expect(cleanEsoText("Shield^d")).toBe("Shield");
    expect(cleanEsoText("Great^m Sword^f")).toBe("Great Sword");
  });

  it("collapses multiple whitespace characters and trims output", () => {
    expect(cleanEsoText("   too   many    spaces   ")).toBe("too many spaces");
    expect(cleanEsoText("\t  padded text  \n")).toBe("padded text");
  });

  it("handles complex real-world ESO item and formatting combinations", () => {
    const combined = "|cFFFFFF|H1:item:12345:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h[Rubedite Ingot^ns]|h|r";
    expect(cleanEsoText(combined)).toBe("[Rubedite Ingot]");

    const formattedTooltip = "|cFFD700Master Crafter's\\n|t16:16:icon.dds|t|H1:item:1|h[Hammer]^f|h|r";
    expect(cleanEsoText(formattedTooltip)).toBe("Master Crafter's [Hammer]");
  });
});

describe("renderEsoFormattedText utility", () => {
  it("returns null for non-string or falsy inputs", () => {
    expect(renderEsoFormattedText(null)).toBeNull();
    expect(renderEsoFormattedText(undefined)).toBeNull();
    expect(renderEsoFormattedText("")).toBeNull();
    expect(renderEsoFormattedText(123)).toBeNull();
  });

  it("renders plain text without color codes", () => {
    const rendered = renderEsoFormattedText("Plain text line");
    expect(rendered).toBeDefined();
    expect(rendered.length).toBe(1);
  });

  it("renders text with color codes and newlines", () => {
    const rendered = renderEsoFormattedText("|cFF0000Red Text|r\\n|c00FF00Green Text|r");
    expect(rendered).toBeDefined();
    expect(rendered.length).toBe(2);
  });
});

describe("getEsoIconUrl utility", () => {
  it("returns null for invalid or empty inputs", () => {
    expect(getEsoIconUrl(null)).toBeNull();
    expect(getEsoIconUrl(undefined)).toBeNull();
    expect(getEsoIconUrl("")).toBeNull();
    expect(getEsoIconUrl("   ")).toBeNull();
  });

  it("converts DDS icon paths to safe PNG endpoints", () => {
    expect(getEsoIconUrl("/esoui/art/icons/gear_nord_heavy_head_a.dds")).toMatch(/\/api\/icons\/gear_nord_heavy_head_a\.png$/);
    expect(getEsoIconUrl("icon_name.dds?v=1#hash")).toMatch(/\/api\/icons\/icon_name\.png$/);
  });

  it("falls back to generic icon for unsafe filenames containing invalid characters", () => {
    expect(getEsoIconUrl("path/to/invalid@file#name!.dds")).toMatch(/\/api\/icons\/gear_generic\.png$/);
  });
});

describe("cn utility", () => {
  it("merges tailwind class names properly", () => {
    expect(cn("px-2 py-1", "bg-red-500")).toBe("px-2 py-1 bg-red-500");
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
