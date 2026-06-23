"use client";

import React, { useState } from "react";
import Link from "next/link";

interface FormattedMessageProps {
  content: string;
  role: "user" | "model" | "system";
}

function CodeBlock({ codeText, lang }: { codeText: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="w-full my-3 border border-white/10 rounded-xl overflow-hidden bg-slate-950/90 font-mono text-[10px]">
      <div className="bg-slate-900/80 px-3 py-1.5 text-slate-400 border-b border-white/5 font-sans font-bold flex justify-between items-center font-semibold">
        <span>{lang || "code"}</span>
        <button
          onClick={handleCopy}
          className="text-[9px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer active:scale-95 transition-all duration-155 font-semibold"
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-emerald-400 select-all leading-normal scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <code>{codeText}</code>
      </pre>
    </div>
  );
}

function parseInline(text: string): React.ReactNode {
  // Tokenize bold (**), inline code (`), and markdown links ([label](url))
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-extrabold text-emerald-300">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="px-1.5 py-0.5 rounded bg-slate-950/80 border border-white/5 font-mono text-[10px] text-teal-300 select-all">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
          const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
          if (match) {
            const label = match[1];
            const url = match[2];
            return (
              <Link
                key={i}
                href={url}
                className="text-emerald-400 hover:text-emerald-300 underline font-black transition duration-150"
              >
                {label}
              </Link>
            );
          }
        }
        return part;
      })}
    </>
  );
}

export default function FormattedMessage({ content, role }: FormattedMessageProps) {
  if (role === "user") {
    return <span className="font-semibold">{content}</span>;
  }
  if (role === "system") {
    return <span className="font-mono text-rose-300">{content}</span>;
  }

  // Parse model response blocks
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  
  let currentTable: string[][] = [];
  let currentList: { type: "ol" | "ul"; items: string[] } | null = null;
  let inCodeBlock = false;
  let currentCodeLines: string[] = [];
  let currentCodeLang = "";

  const flushTable = (key: number) => {
    if (currentTable.length === 0) return;
    
    const filteredRows = currentTable.filter((row) => {
      const isSeparator = row.every((cell) => /^[:\s-]*$/.test(cell));
      return !isSeparator && row.some((cell) => cell.trim().length > 0);
    });

    if (filteredRows.length > 0) {
      const headers = filteredRows[0];
      const dataRows = filteredRows.slice(1);

      blocks.push(
        <div
          key={`table-${key}`}
          className="w-full overflow-x-auto my-3 border border-white/10 rounded-2xl bg-slate-950/40 shadow-inner"
        >
          <table className="w-full text-[11px] border-collapse min-w-[280px]">
            <thead>
              <tr className="bg-slate-900/60 border-b border-white/10">
                {headers.map((h, idx) => (
                  <th
                    key={idx}
                    className="px-3 py-2 text-left font-black text-slate-350 uppercase tracking-wider whitespace-nowrap"
                  >
                    {parseInline(h.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {dataRows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-white/5 transition duration-150 odd:bg-slate-900/10 even:bg-slate-900/30"
                >
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-3 py-2 font-medium text-slate-200">
                      {parseInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    currentTable = [];
  };

  const flushList = (key: number) => {
    if (!currentList) return;
    const { type, items } = currentList;
    
    blocks.push(
      type === "ul" ? (
        <ul key={`list-${key}`} className="my-2 pl-4 space-y-1">
          {items.map((item, idx) => (
            <li key={idx} className="text-xs text-slate-200 leading-relaxed flex items-start gap-2">
              <span className="text-emerald-400 mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ol key={`list-${key}`} className="my-2 pl-4 space-y-1 list-decimal text-emerald-400 marker:font-black">
          {items.map((item, idx) => (
            <li key={idx} className="text-xs text-slate-200 leading-relaxed pl-1">
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ol>
      )
    );
    currentList = null;
  };

  const flushCodeBlock = (key: number) => {
    if (currentCodeLines.length === 0) return;
    const codeText = currentCodeLines.join("\n");
    blocks.push(
      <CodeBlock key={`code-${key}`} codeText={codeText} lang={currentCodeLang} />
    );
    currentCodeLines = [];
    currentCodeLang = "";
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        inCodeBlock = false;
        flushCodeBlock(i);
      } else {
        flushTable(i);
        flushList(i);
        inCodeBlock = true;
        currentCodeLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      currentCodeLines.push(line);
      continue;
    }

    const isTableRow = line.trim().startsWith("|") && line.trim().endsWith("|");
    if (isTableRow) {
      flushList(i);
      const cells = line.trim().slice(1, -1).split("|");
      currentTable.push(cells);
      continue;
    } else {
      flushTable(i);
    }

    const isUnorderedList = line.trim().startsWith("- ") || line.trim().startsWith("* ");
    const isOrderedList = /^\d+\.\s/.test(line.trim());

    if (isUnorderedList || isOrderedList) {
      flushTable(i);
      const listType = isUnorderedList ? "ul" : "ol";
      const cleanedItem = isUnorderedList
        ? line.trim().slice(2)
        : line.trim().replace(/^\d+\.\s/, "");

      if (currentList && currentList.type === listType) {
        currentList.items.push(cleanedItem);
      } else {
        flushList(i);
        currentList = { type: listType, items: [cleanedItem] };
      }
      continue;
    } else {
      flushList(i);
    }

    if (line.trim().startsWith("#")) {
      const match = line.trim().match(/^(#+)\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const headingStyles =
          level === 1
            ? "text-sm font-black text-white mt-4 mb-2 border-b border-white/10 pb-1"
            : level === 2
            ? "text-xs font-black text-emerald-400 mt-3 mb-1.5"
            : "text-[11px] font-bold text-teal-400 mt-2 mb-1";
        blocks.push(
          <div key={i} className={headingStyles}>
            {parseInline(text)}
          </div>
        );
        continue;
      }
    }

    if (!line.trim()) {
      blocks.push(<div key={i} className="h-1.5" />);
      continue;
    }

    blocks.push(
      <p key={i} className="text-xs leading-relaxed text-slate-200 my-1">
        {parseInline(line)}
      </p>
    );
  }

  flushTable(lines.length);
  flushList(lines.length);
  flushCodeBlock(lines.length);

  return <div className="space-y-0.5 w-full overflow-hidden">{blocks}</div>;
}
