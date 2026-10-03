// import types
import type { ReactNode } from "react";

interface SectionProps {
  id?: string;
  title: string;
  lead: string;
  /** dark: the glyph section's black; cream: the install section's. */
  tone?: "paper" | "dark" | "cream";
  /** Skips the top padding, for a section right after another on the same background. */
  isFlush?: boolean;
  children: ReactNode;
}

const TONES = {
  paper: "",
  dark: "bg-ink text-cream",
  cream: "bg-cream",
} as const;

/** A landing page section: the beak marker, a heading, a lead line and its content. */
export function Section({
  id,
  title,
  lead,
  tone = "paper",
  isFlush = false,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 py-16 md:py-[88px] ${isFlush ? "pt-0 md:pt-0" : ""} ${TONES[tone]}`}
    >
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
        <h2 className="beak-marker mb-3.5 text-[32px] leading-[1.1] font-extrabold tracking-[-0.03em] md:text-[40px]">
          {title}
        </h2>
        <p
          className={`mb-10 max-w-[36em] text-lg ${tone === "dark" ? "text-faded" : "text-muted"}`}
        >
          {lead}
        </p>
        {children}
      </div>
    </section>
  );
}
