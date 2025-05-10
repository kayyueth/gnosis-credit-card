"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  variant?: "default" | "credit";
  usedValue?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, variant = "default", usedValue, ...props }, ref) => {
    // Ensure value is between 0 and 100
    const clampedValue = Math.max(0, Math.min(100, value));

    if (variant === "credit" && usedValue !== undefined) {
      // For credit card progress bar with used and available indicators
      const clampedUsedValue = Math.max(0, Math.min(100, usedValue));

      return (
        <div
          ref={ref}
          className={cn(
            "relative h-4 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800",
            className
          )}
          {...props}
        >
          {/* Used credit (in red/amber) */}
          <div
            className="h-full bg-zinc-500 dark:bg-zinc-600 absolute left-0 top-0 transition-all"
            style={{ width: `${clampedUsedValue}%` }}
          />
          {/* Available credit (in green/primary) */}
          <div
            className="h-full bg-primary absolute right-0 top-0 transition-all"
            style={{ width: `${100 - clampedUsedValue}%` }}
          />
        </div>
      );
    }

    // Default progress bar
    return (
      <div
        ref={ref}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800",
          className
        )}
        {...props}
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    );
  }
);

Progress.displayName = "Progress";

export { Progress };
