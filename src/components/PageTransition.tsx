"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

const variants = {
  initial:  { opacity: 0, y: 14, filter: "blur(4px)" },
  enter:    { opacity: 1, y: 0,  filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit:     { opacity: 0, y: -8, filter: "blur(2px)",
    transition: { duration: 0.2,  ease: [0.4, 0, 1, 1] as [number, number, number, number] } },
};

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      style={{ willChange: "opacity, transform, filter" }}
    >
      {children}
    </motion.div>
  );
}
