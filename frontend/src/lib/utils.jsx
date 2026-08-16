import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Clean raw ESO Lua API strings by stripping color codes (|cRRGGBB...|r), 
 * hyperlink tags (|H...|h...|h), texture tags (|t...|t), and formatting artifacts.
 */
export function cleanEsoText(text) {
  if (!text || typeof text !== "string") return "";

  let cleaned = text;

  // 0. Normalize literal escaped newlines to space for clean single-line title/name displays
  cleaned = cleaned.replace(/\\n/g, " ");

  // 1. Strip ESO hyperlink wrappers: |H1:item:...|h[Name]|h -> [Name]
  cleaned = cleaned.replace(/\|H[^|]*\|h([^|]*)\|h/gi, "$1");

  // 2. Strip inline texture tags: |t[^|]*|t -> ""
  cleaned = cleaned.replace(/\|t[^|]*\|t/gi, "");

  // 3. Strip ESO color codes: |c[0-9a-fA-F]{6}(.*?)(?:\|r|$)/gi -> $1
  cleaned = cleaned.replace(/\|c[0-9a-fA-F]{6}(.*?)(?:\|r|$)/gi, "$1");

  // 4. Strip leftover color resets: |r
  cleaned = cleaned.replace(/\|r/gi, "");

  // 5. Clean up multiple spaces or leading/trailing whitespace
  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Parses ESO Lua text with color codes |cRRGGBB...|r and newline sequences into React JSX elements with colored spans and line breaks.
 */
export function renderEsoFormattedText(text) {
  if (!text || typeof text !== "string") return null;

  // Normalize literal escaped newlines to real newlines
  const normalized = text.replace(/\\n/g, "\n");
  const lines = normalized.split("\n");

  const renderedLines = lines.map((line, lineIdx) => {
    // First clean links & textures
    let str = line.replace(/\|H[^|]*\|h([^|]*)\|h/gi, "$1").replace(/\|t[^|]*\|t/gi, "");

    // Check if line contains color tags
    if (!/\|c[0-9a-fA-F]{6}/i.test(str)) {
      const cleanLine = str.replace(/\|r/gi, "");
      return (
        <React.Fragment key={`line-${lineIdx}`}>
          {cleanLine}
          {lineIdx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    }

    const regex = /\|c([0-9a-fA-F]{6})(.*?)(?:\|r|$)/gi;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(str.substring(lastIndex, match.index));
      }
      const hexColor = `#${match[1]}`;
      const innerText = match[2];
      parts.push(
        <span key={`color-${lineIdx}-${match.index}`} style={{ color: hexColor }} className="font-semibold">
          {innerText}
        </span>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < str.length) {
      const remaining = str.substring(lastIndex).replace(/\|r/gi, "");
      if (remaining) parts.push(remaining);
    }

    return (
      <React.Fragment key={`line-${lineIdx}`}>
        {parts}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });

  return renderedLines;
}
