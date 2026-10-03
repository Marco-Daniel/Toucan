interface BuildMarkupProps {
  /** Markup the build produced from trusted sources: the brand's SVGs, or markdown rendered by renderMarkdown. */
  html: string;
  className?: string;
}

/** Markup the build produced, inlined. */
export function BuildMarkup({ html, className }: BuildMarkupProps) {
  // Build-time markup from the brand's SVGs or escaped markdown, never user input.
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
