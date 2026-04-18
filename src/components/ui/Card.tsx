"use client";

import { forwardRef, HTMLAttributes, useRef, MouseEvent } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "deep" | "accent";
  hover?: boolean;
  tilt?: boolean;         // subtle 3D tilt on hover
  padding?: "sm" | "md" | "lg" | "none";
}

const paddings = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };

const variants = {
  default:  "glass rounded-2xl",
  elevated: "glass-sm rounded-2xl shadow-2xl",
  deep:     "glass-deep rounded-2xl",
  accent:   "glass rounded-2xl border-violet-500/20 bg-violet-500/[0.04]",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", hover = false, tilt = false,
     padding = "md", children, onMouseMove, onMouseLeave, ...props }, ref) => {

    const rotateX = useSpring(0, { stiffness: 300, damping: 30 });
    const rotateY = useSpring(0, { stiffness: 300, damping: 30 });
    const glowX   = useSpring(50, { stiffness: 200, damping: 25 });
    const glowY   = useSpring(50, { stiffness: 200, damping: 25 });
    const innerRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
      if (tilt && innerRef.current) {
        const rect = innerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top)  / rect.height;
        rotateX.set((y - 0.5) * -6);
        rotateY.set((x - 0.5) *  6);
        glowX.set(x * 100);
        glowY.set(y * 100);
      }
      onMouseMove?.(e);
    };

    const handleMouseLeave = (e: MouseEvent<HTMLDivElement>) => {
      rotateX.set(0);
      rotateY.set(0);
      glowX.set(50);
      glowY.set(50);
      onMouseLeave?.(e);
    };

    const glowBg = useTransform(
      [glowX, glowY],
      ([x, y]) =>
        `radial-gradient(circle at ${x}% ${y}%, rgba(139,92,246,0.07) 0%, transparent 60%)`
    );

    if (!tilt) {
      return (
        <div
          ref={ref}
          className={cn(variants[variant], paddings[padding], hover && "card-hover cursor-pointer", className)}
          {...props}
        >
          {children}
        </div>
      );
    }

    return (
      <motion.div
        ref={innerRef}
        style={{ rotateX, rotateY, transformPerspective: 800, willChange: "transform" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(variants[variant], paddings[padding], hover && "card-hover cursor-pointer", "relative overflow-hidden", className)}
        {...(props as object)}
      >
        {/* Glow follow layer */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{ background: glowBg }}
        />
        <div className="relative z-10">{children}</div>
      </motion.div>
    );
  }
);
Card.displayName = "Card";

export { Card };
