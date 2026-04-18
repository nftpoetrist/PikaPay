"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import ToolResult from "@/components/ToolResult";
import { formatText, CaseFormat, FormatResult } from "@/lib/toolEngines";

const FORMATS: { key: CaseFormat; label: string; example: string }[] = [
  { key: "uppercase",  label: "UPPERCASE",   example: "HELLO WORLD" },
  { key: "lowercase",  label: "lowercase",   example: "hello world" },
  { key: "title",      label: "Title Case",  example: "Hello World" },
  { key: "sentence",   label: "Sentence",    example: "Hello world" },
  { key: "camel",      label: "camelCase",   example: "helloWorld" },
  { key: "pascal",     label: "PascalCase",  example: "HelloWorld" },
  { key: "snake",      label: "snake_case",  example: "hello_world" },
  { key: "kebab",      label: "kebab-case",  example: "hello-world" },
];

export default function TextFormatterTool() {
  const [text, setText] = useState("");
  const [activeFormat, setActiveFormat] = useState<CaseFormat>("title");
  const [result, setResult] = useState<FormatResult | null>(null);
  const [open, setOpen] = useState(false);

  const run = () => {
    setResult(formatText(text, activeFormat));
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <Textarea
        label="Your text"
        placeholder="Enter text to format..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {/* Format picker */}
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-2.5" style={{ color: "var(--text-muted)" }}>
          Choose format
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFormat(f.key)}
              className="px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer"
              style={{
                background: activeFormat === f.key ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${activeFormat === f.key ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.07)"}`,
              }}
            >
              <p
                className="text-xs font-semibold"
                style={{ color: activeFormat === f.key ? "#c4b5fd" : "var(--text-primary)" }}
              >
                {f.label}
              </p>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                {f.example}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={run} disabled={!text.trim()} icon={<span>Aa</span>}>
          Format Text
        </Button>
      </div>

      <ToolResult
        open={open}
        onClose={() => setOpen(false)}
        title="Text Formatter"
        icon="Aa"
        color="from-emerald-500 to-teal-600"
        copyText={result?.output}
      >
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Format</p>
                <p className="font-bold text-sm text-emerald-400">
                  {FORMATS.find((f) => f.key === result.format)?.label}
                </p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Chars delta</p>
                <p className="font-bold text-sm" style={{ color: result.char_delta === 0 ? "var(--text-muted)" : result.char_delta > 0 ? "#fbbf24" : "#34d399" }}>
                  {result.char_delta > 0 ? `+${result.char_delta}` : result.char_delta}
                </p>
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                Output
              </p>
              <p
                className="text-sm leading-relaxed break-words font-mono"
                style={{ color: "var(--text-primary)" }}
              >
                {result.output}
              </p>
            </div>
          </div>
        )}
      </ToolResult>
    </div>
  );
}
