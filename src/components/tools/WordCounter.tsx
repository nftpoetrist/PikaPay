"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";

export default function WordCounter() {
  const [text, setText] = useState("");

  const analyze = useCallback((t: string) => {
    const words = t.trim() ? t.trim().split(/\s+/).length : 0;
    const chars = t.length;
    const charsNoSpaces = t.replace(/\s/g, "").length;
    const sentences = t.trim() ? t.split(/[.!?]+/).filter(Boolean).length : 0;
    const paragraphs = t.trim() ? t.split(/\n\s*\n/).filter((p) => p.trim()).length : 0;
    const readingTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, charsNoSpaces, sentences, paragraphs, readingTime };
  }, []);

  const stats = analyze(text);

  const metrics = [
    { label: "Words", value: stats.words },
    { label: "Characters", value: stats.chars },
    { label: "Chars (no spaces)", value: stats.charsNoSpaces },
    { label: "Sentences", value: stats.sentences },
    { label: "Paragraphs", value: stats.paragraphs },
    { label: "Reading time", value: `${stats.readingTime} min` },
  ];

  return (
    <div className="space-y-5">
      <div>
        <textarea
          className="input-glass w-full px-4 py-3 text-sm font-mono"
          placeholder="Paste or type your text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-4 text-center"
          >
            <p className="text-white/30 text-xs uppercase tracking-widest mb-1">{m.label}</p>
            <p className="text-white font-bold text-2xl">{m.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setText("")}
          disabled={!text}
          className="glass px-5 py-2.5 rounded-xl text-white/50 hover:text-white/80 text-sm font-medium transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        >
          Clear
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(JSON.stringify(stats, null, 2))}
          disabled={!text}
          className="btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        >
          Copy Stats
        </button>
      </div>
    </div>
  );
}
