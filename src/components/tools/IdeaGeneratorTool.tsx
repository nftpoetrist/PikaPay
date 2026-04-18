"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import ToolResult from "@/components/ToolResult";
import { generateIdeas, IdeaResult } from "@/lib/toolEngines";
import { RefreshCw } from "lucide-react";

export default function IdeaGeneratorTool() {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<IdeaResult | null>(null);
  const [open, setOpen] = useState(false);

  const run = () => {
    setResult(generateIdeas(topic));
    setOpen(true);
  };

  const regenerate = () => {
    if (!result) return;
    setResult(generateIdeas(result.topic));
  };

  return (
    <div className="space-y-4">
      <Input
        label="Your topic"
        placeholder="e.g. productivity, crypto, fitness, cooking..."
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && topic.trim()) run(); }}
        hint="Press Enter or click Generate"
      />

      <div className="flex justify-end">
        <Button onClick={run} disabled={!topic.trim()} icon={<span>💡</span>}>
          Generate Ideas
        </Button>
      </div>

      <ToolResult
        open={open}
        onClose={() => setOpen(false)}
        title="Idea Generator"
        icon="💡"
        color="from-amber-500 to-orange-500"
        copyText={result?.ideas.map((idea, i) => `${i + 1}. ${idea}`).join("\n")}
      >
        {result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                6 ideas for <span style={{ color: "var(--text-primary)" }}>"{result.topic}"</span>
                {" "}· <span className="text-amber-400">{result.category}</span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw size={12} />}
                onClick={regenerate}
              >
                Regenerate
              </Button>
            </div>

            {result.ideas.map((idea, i) => (
              <motion.div
                key={idea}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass rounded-xl p-4 flex items-start gap-3"
              >
                <span
                  className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold bg-gradient-to-br from-amber-500 to-orange-500 text-white"
                >
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {idea}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </ToolResult>
    </div>
  );
}
