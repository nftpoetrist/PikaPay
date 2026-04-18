"use client";

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix" | "suffix"> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, prefix, suffix, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-[11px] font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-3 flex items-center" style={{ color: "var(--text-muted)" }}>
            {prefix}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "input",
            prefix && "!pl-9",
            suffix && "!pr-9",
            error && "border-red-500/40 focus:border-red-500/60 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.12)]",
            className
          )}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 flex items-center" style={{ color: "var(--text-muted)" }}>
            {suffix}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  )
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-[11px] font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          "input",
          error && "border-red-500/40",
          className
        )}
        style={{ resize: "vertical", minHeight: 120, lineHeight: 1.6 }}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  )
);
Textarea.displayName = "Textarea";
