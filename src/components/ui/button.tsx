import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-70 aria-disabled:pointer-events-none aria-disabled:opacity-70 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Hover/pressed change only the border/inner outline, never the fill or text colour,
        // so gold-on-navy and navy-on-cream outlined buttons keep their contrast after a tap.
        outline: "border border-input bg-background text-foreground hover:border-accent hover:shadow-[inset_0_0_0_1px_hsl(var(--accent))] active:shadow-[inset_0_0_0_2px_hsl(var(--accent))]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:underline underline-offset-4 active:shadow-[inset_0_0_0_2px_hsl(var(--accent))]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/**
 * Outline buttons keep the light `bg-background` fill unless the caller sets its own fill.
 * On that light fill, caller text colours meant for navy (gold, red-300, emerald-300…) fall to ~2:1,
 * so text and icons are forced to a token that reaches 4.5:1: foreground, or destructive for
 * delete-style buttons. Caller borders (e.g. gold) and focus rings are kept.
 */
export function outlineLightFillClasses(className?: string): string | undefined {
  const tokens = (className ?? "").split(/\s+/).filter(Boolean);
  if (tokens.some((t) => /^bg-/.test(t))) return undefined; // caller owns the fill
  const danger = tokens.some((t) => /(^|:)text-(red|rose|destructive)/.test(t) || /(^|:)border-(red|rose|destructive)/.test(t));
  return danger
    ? "text-destructive hover:text-destructive border-destructive/60 hover:bg-background"
    : "text-foreground hover:text-foreground hover:bg-background";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const forced = variant === "outline" ? outlineLightFillClasses(className) : undefined;
    return <Comp className={cn(buttonVariants({ variant, size, className }), forced)} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
