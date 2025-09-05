"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingOverlay({ show, className }: { show: boolean; className?: string }) {
  if (!show) return null;
  return (
    <div
      className={cn(
        "absolute inset-0 z-40 flex items-center justify-center bg-background/60",
        className
      )}
    >
      <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 shadow">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <span className="text-sm text-muted-foreground">処理中...</span>
      </div>
    </div>
  );
}
