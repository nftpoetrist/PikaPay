"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Tool } from "@/lib/tools";

interface Props {
  tool: Tool;
  index: number;
}

export default function ToolCard({ tool, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/tools/${tool.slug}`}>
        <div className="glass glass-hover rounded-2xl p-6 h-full flex flex-col cursor-pointer group">
          <div className="flex items-start justify-between mb-4">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white text-lg font-bold shadow-lg`}
            >
              {tool.icon}
            </div>
            <div className="flex items-center gap-2">
              {tool.badge && (
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-medium border border-violet-500/20">
                  {tool.badge}
                </span>
              )}
              <span className="text-white/30 text-xs px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                {tool.category}
              </span>
            </div>
          </div>

          <h3 className="text-white font-semibold text-base mb-2 group-hover:text-violet-200 transition-colors">
            {tool.name}
          </h3>
          <p className="text-white/40 text-sm leading-relaxed flex-1 mb-5">{tool.description}</p>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-violet-300 font-bold text-lg">
                ${tool.price.toFixed(tool.price < 0.01 ? 3 : 2)}
              </span>
              <span className="text-white/30 text-xs ml-1">USDC</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/30 group-hover:text-violet-300 transition-colors text-sm">
              <span>Use tool</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
