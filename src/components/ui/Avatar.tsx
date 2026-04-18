import { cn } from "@/lib/utils";

interface AvatarProps {
  address?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizes = { xs: "w-6 h-6 text-[9px]", sm: "w-8 h-8 text-[11px]", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" };

// Deterministic gradient from address
function colorFromAddress(addr: string) {
  const gradients = [
    "from-violet-500 to-indigo-500",
    "from-sky-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-pink-500 to-rose-500",
    "from-amber-500 to-orange-500",
    "from-fuchsia-500 to-purple-500",
  ];
  const idx = parseInt(addr.slice(2, 4), 16) % gradients.length;
  return gradients[idx];
}

export function Avatar({ address, size = "md", className }: AvatarProps) {
  const gradient = address ? colorFromAddress(address) : "from-violet-500 to-indigo-500";
  const initials = address ? address.slice(2, 4).toUpperCase() : "??";

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-white flex-shrink-0",
        gradient,
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
