import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink transition-colors",
        "placeholder:text-muted hover:border-line-strong",
        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25",
        "disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-muted",
        "aria-[invalid=true]:border-error aria-[invalid=true]:ring-error/20",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-24 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink",
      "placeholder:text-muted hover:border-line-strong",
      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("text-sm font-medium text-ink", className)}
    {...props}
  />
));
Label.displayName = "Label";

export interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  /** Rendered with role="alert" so screen readers announce it on change. */
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

/** Label + control + hint/error, wired for screen readers. */
export function Field({ label, htmlFor, hint, error, required, children }: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ml-1 text-error" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id: htmlFor,
            "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
            "aria-invalid": error ? true : undefined,
            "aria-required": required || undefined,
          })
        : children}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
