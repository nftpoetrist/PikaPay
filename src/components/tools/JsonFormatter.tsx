"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Copy, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const format = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setOutput("");
    }
  };

  const minify = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setOutput("");
    }
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-white/40 text-xs uppercase tracking-widest mb-2 block">Input JSON</label>
          <textarea
            className="input-glass w-full px-4 py-3 text-sm font-mono"
            placeholder='{"key": "value", "arr": [1,2,3]}'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
          />
        </div>
        <div>
          <label className="text-white/40 text-xs uppercase tracking-widest mb-2 block">Output</label>
          <div className="relative">
            <textarea
              className="input-glass w-full px-4 py-3 text-sm font-mono"
              readOnly
              value={output || (error ? `// Error: ${error}` : "")}
              rows={10}
              style={{ color: error ? "rgba(248,113,113,0.8)" : undefined }}
              placeholder="Formatted output appears here..."
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-red-400 text-sm"
          >
            <XCircle size={15} />
            <span>{error}</span>
          </motion.div>
        )}
        {output && !error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-emerald-400 text-sm"
          >
            <CheckCircle size={15} />
            <span>Valid JSON</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={format}
          disabled={!input}
          className="btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        >
          Format
        </button>
        <button
          onClick={minify}
          disabled={!input}
          className="glass flex items-center gap-2 px-5 py-2.5 rounded-xl text-white/60 hover:text-white/80 text-sm font-medium transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        >
          <Minimize2 size={14} />
          Minify
        </button>
        <button
          onClick={copy}
          disabled={!output}
          className="glass flex items-center gap-2 px-5 py-2.5 rounded-xl text-white/60 hover:text-white/80 text-sm font-medium transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        >
          <Copy size={14} />
          {copied ? "Copied!" : "Copy Output"}
        </button>
      </div>
    </div>
  );
}
