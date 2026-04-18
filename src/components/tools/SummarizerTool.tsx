"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import ToolResult from "@/components/ToolResult";
import { summarizeText, SummaryResult } from "@/lib/toolEngines";

export default function SummarizerTool() {
  const [text, setText] = useState("");
  const [sentences, setSentences] = useState(3);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [open, setOpen] = useState(false);

  const run = () => {
    const r = summarizeText(text, sentences);
    setResult(r);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <Textarea
        label="Your text"
        placeholder="Paste any article, essay, or paragraph to summarize..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        hint={`${text.trim().split(/\s+/).filter(Boolean).length} words`}
      />

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
            Output sentences: {sentences}
          </p>
          <input
            type="range"
            min={1}
            max={6}
            value={sentences}
            onChange={(e) => setSentences(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
        </div>
        <Button onClick={run} disabled={text.trim().split(/\s+/).length < 10} icon={<span>✦</span>}>
          Summarize
        </Button>
      </div>

      <ToolResult
        open={open}
        onClose={() => setOpen(false)}
        title="Text Summarizer"
        icon="✦"
        color="from-violet-500 to-purple-600"
        copyText={result?.summary}
      >
        {result && (
          <div className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Original", value: `${result.original_words} words` },
                { label: "Summary", value: `${result.summary_words} words` },
                { label: "Compressed", value: `${result.compression}%` },
              ].map((s) => (
                <div key={s.label} className="glass rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
                    {s.label}
                  </p>
                  <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Summary output */}
            <div className="glass rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                Summary ({result.sentences} sentences)
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                {result.summary}
              </p>
            </div>
          </div>
        )}
      </ToolResult>
    </div>
  );
}
