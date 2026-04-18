import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "full";
}

const radii = { sm: "rounded-lg", md: "rounded-xl", lg: "rounded-2xl", full: "rounded-full" };

export function Skeleton({ className, rounded = "md" }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton", radii[rounded], className)}
      aria-hidden="true"
    />
  );
}

// Preset compositions
export function ToolCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <Skeleton className="w-11 h-11" rounded="lg" />
        <Skeleton className="w-14 h-5" rounded="full" />
      </div>
      <div className="space-y-2 flex-1">
        <Skeleton className="w-3/4 h-4" />
        <Skeleton className="w-full h-3" />
        <Skeleton className="w-5/6 h-3" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="w-16 h-5" />
        <Skeleton className="w-8 h-4" />
      </div>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="p-6 space-y-2">
      <Skeleton className="w-20 h-3" />
      <Skeleton className="w-28 h-7" />
      <Skeleton className="w-16 h-3" />
    </div>
  );
}

export function NavbarSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="w-24 h-7" rounded="lg" />
      <Skeleton className="w-20 h-7" rounded="lg" />
    </div>
  );
}
