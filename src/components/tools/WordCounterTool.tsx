"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import ToolResult from "@/components/ToolResult";
import { countWords, WordCountResult } from "@/lib/toolEngines";

function ReadingBar({ score, label }: { score: number; label: string }) {
  const color =
    score >= 70 ? "#34d399" :
    score >= 50 ? "#fbbf24" : "#f87171";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span style={{ color: "var(--text-muted)" }}>Readability</span>
        <span style={{ color }}>{label} ({score}/100)</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function WordCounterTool() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<WordCountResult | null>(null);
  const [open, setOpen] = useState(false);

  const run = () => {
    setResult(countWords(text));
    setOpen(true);
  };

  const mins = result ? Math.floor(result.reading_time_sec / 60) : 0;
  const secs = result ? result.reading_time_sec % 60 : 0;
  const readingLabel = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const stats = result ? [
    { label: "Words",            value: result.words },
    { label: "Characters",       value: result.chars },
    { label: "Chars (no spaces)",value: result.chars_no_spaces },
    { label: "Sentences",        value: result.sentences },
    { label: "Paragraphs",       value: result.paragraphs },
    { label: "Avg word length",  value: result.avg_word_length },
    { label: "Reading time",     value: readingLabel },
  ] : [];

  return (
    <div className="space-y-4">
      <Textarea
        label="Your text"
        placeholder="Paste or type any text..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        hint={`${text.trim().split(/\s+/).filter(Boolean).length} words · ${text.length} chars`}
      />

      <div className="flex justify-end">
        <Button onClick={run} disabled={!text.trim()} icon={<span>📝</span>}>
          Analyze
        </Button>
      </div>

      <ToolResult
        open={open}
        onClose={() => setOpen(false)}
        title="Word Counter Pro"
        icon="📝"
        color="from-sky-500 to-cyan-600"
      >
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="glass rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
                    {s.label}
                  </p>
                  <p className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="glass rounded-xl p-4">
              <ReadingBar score={result.flesch_score} label={result.flesch_label} />
            </div>
          </div>
        )}
      </ToolResult>
    </div>
  );
}
