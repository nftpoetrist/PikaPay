import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "purple" | "green" | "amber" | "blue" | "red" | "mono";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const dotColors: Record<BadgeVariant, string> = {
  purple: "bg-violet-400",
  green:  "bg-emerald-400",
  amber:  "bg-amber-400",
  blue:   "bg-sky-400",
  red:    "bg-red-400",
  mono:   "bg-white/30",
};

export function Badge({ variant = "mono", dot = false, children, className, ...props }: BadgeProps) {
  return (
    <span className={cn("badge", `badge-${variant}`, className)} {...props}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}
