// components/ui/skeleton.tsx
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-surface-muted shimmer-bg", className)} {...props} />
  );
}

export { Skeleton };
