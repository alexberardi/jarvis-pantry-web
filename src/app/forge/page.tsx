"use client";

import { Sparkles, MessageSquare, Code, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ForgePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10">
          <Sparkles className="h-8 w-8 text-[var(--color-primary)]" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-[var(--color-text)]">
          Command Forge
        </h1>
        <p className="mt-3 text-lg text-[var(--color-text-muted)]">
          Describe what you want. AI builds it for you.
        </p>
      </div>

      {/* How it works */}
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          {
            icon: MessageSquare,
            title: "Describe",
            description:
              "Tell the AI what your command should do in plain English",
          },
          {
            icon: Code,
            title: "Generate",
            description:
              "AI writes the command code, manifest, and tests using the SDK docs",
          },
          {
            icon: Upload,
            title: "Publish",
            description:
              "Review the code, submit to the Pantry, and share with the community",
          },
        ].map((step) => (
          <div
            key={step.title}
            className={cn(
              "rounded-lg border border-[var(--color-border)]",
              "bg-[var(--color-surface)] p-6 text-center"
            )}
          >
            <step.icon className="mx-auto h-8 w-8 text-[var(--color-primary)]" />
            <h3 className="mt-3 font-semibold text-[var(--color-text)]">
              {step.title}
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* Coming soon CTA */}
      <div className="mt-12 rounded-lg border border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 p-8 text-center">
        <p className="text-lg font-medium text-[var(--color-text)]">
          Coming Soon
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          The Command Forge is under construction. In the meantime, you can
          build commands manually using the{" "}
          <code className="rounded bg-[var(--color-surface-alt)] px-1.5 py-0.5 text-xs">
            jarvis-command-sdk
          </code>
        </p>
      </div>
    </div>
  );
}
