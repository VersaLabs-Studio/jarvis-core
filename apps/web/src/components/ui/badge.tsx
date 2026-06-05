import * as React from "react";
import { cn } from "@/lib/cn";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "error" | "info";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
          {
            "bg-primary/10 text-primary": variant === "default",
            "bg-secondary text-secondary-foreground": variant === "secondary",
            "bg-success/10 text-success": variant === "success",
            "bg-warning/10 text-warning": variant === "warning",
            "bg-error/10 text-error": variant === "error",
            "bg-info/10 text-info": variant === "info",
          },
          className,
        )}
        {...props}
      />
    );
  },
);
Badge.displayName = "Badge";

export { Badge };
