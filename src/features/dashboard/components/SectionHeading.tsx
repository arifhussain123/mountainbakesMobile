import type { ReactNode } from 'react';
import { SectionHeader } from '@/shared/ui';

export interface SectionHeadingProps {
  /** Leading word(s), e.g. "Daily". */
  text: string;
  /** Trailing word(s), e.g. "Sales". */
  accent: string;
  /** Optional trailing actions (e.g. the Compare/Export pills), right-aligned next to the heading. */
  right?: ReactNode;
}

/**
 * Kept for its existing API; since the 2026 redesign it is the shared
 * sentence-case h2 `SectionHeader` ("Daily sales") rather than an uppercase
 * heading with an accent-coloured last word.
 */
export function SectionHeading({ text, accent, right }: SectionHeadingProps) {
  const title = `${text} ${accent.toLowerCase()}`;
  return <SectionHeader title={title} right={right} style={{ marginTop: 24 }} />;
}
