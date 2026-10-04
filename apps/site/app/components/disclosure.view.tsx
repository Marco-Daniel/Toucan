// import libraries
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

// import types
import type { MouseEvent, ReactNode } from "react";

interface DisclosureProps {
  /** The always-visible toggle's content. */
  summary: ReactNode;
  className: string;
  summaryClassName: string;
  /** The toggle's accessible name, when its content is an icon. */
  label?: string;
  children: ReactNode;
}

/**
 * A menu that opens without JavaScript (a <details>), and once the scripts
 * run closes again on navigation, on a link click inside it, on Escape and on
 * a click outside it.
 */
export function Disclosure({
  summary,
  className,
  summaryClassName,
  label,
  children,
}: DisclosureProps) {
  const details = useRef<HTMLDetailsElement>(null);
  // Mirrors the <details>' own state, so the toggle can say whether it's open.
  const [isOpen, setIsOpen] = useState(false);
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (details.current) {
      details.current.open = false;
    }
  }, [pathname, hash]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const element = details.current;
      if (event.key === "Escape" && element?.open === true) {
        element.open = false;
        element.querySelector("summary")?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      const element = details.current;
      if (
        element?.open === true &&
        event.target instanceof Node &&
        !element.contains(event.target)
      ) {
        element.open = false;
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  // A link to the page you're on changes no location, so the click closes it too.
  const onClick = (event: MouseEvent<HTMLDetailsElement>) => {
    if (event.target instanceof Element && event.target.closest("a") !== null && details.current) {
      details.current.open = false;
    }
  };

  return (
    <details
      ref={details}
      className={className}
      onClick={onClick}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className={summaryClassName} aria-label={label} aria-expanded={isOpen}>
        {summary}
      </summary>
      {children}
    </details>
  );
}
