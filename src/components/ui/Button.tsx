"use client";

import { forwardRef, ButtonHTMLAttributes, ReactNode, MouseEvent } from "react";
import { motion, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const sizes = {
  sm: "px-3.5 py-2 text-xs rounded-xl gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-7 py-3.5 text-base rounded-2xl gap-2.5",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, icon, iconRight,
     children, disabled, onMouseEnter, onMouseLeave, onClick, ...props }, ref) => {
    const scale = useSpring(1, { stiffness: 420, damping: 22 });

    const handleEnter = (e: MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading) scale.set(1.025);
      onMouseEnter?.(e);
    };
    const handleLeave = (e: MouseEvent<HTMLButtonElement>) => {
      scale.set(1);
      onMouseLeave?.(e);
    };
    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      scale.set(0.95);
      setTimeout(() => scale.set(1), 120);
      onClick?.(e);
    };

    return (
      <motion.span style={{ scale, display: "inline-flex" }}>
        <button
          ref={ref}
          disabled={disabled || loading}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          onClick={handleClick}
          className={cn("btn", `btn-${variant}`, sizes[size], "w-full", className)}
          {...props}
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : icon}
          {children}
          {!loading && iconRight}
        </button>
      </motion.span>
    );
  }
);
Button.displayName = "Button";

export { Button };
