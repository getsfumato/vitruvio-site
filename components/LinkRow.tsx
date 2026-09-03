/**
 * Three destinations, no words: source, guide, sfumato.
 *
 * All three glyphs are drawn on the same 24-unit box at the same optical weight —
 * GitHub is solid because its mark only reads as itself filled, so the other two are
 * given 1.4–1.5-unit strokes, which lands at a similar ink density at 22px. The
 * accessible name lives in the label, not on the page.
 */

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 .5C5.73.5.9 5.33.9 11.6c0 5.02 3.26 9.27 7.77 10.77.57.1.78-.25.78-.55v-1.9c-3.17.69-3.84-1.53-3.84-1.53-.52-1.32-1.27-1.67-1.27-1.67-1.03-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.72-1.53-2.53-.29-5.2-1.27-5.2-5.64 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.14 1.17a10.9 10.9 0 0 1 5.72 0c2.18-1.48 3.13-1.17 3.13-1.17.63 1.57.24 2.73.12 3.02.74.8 1.18 1.82 1.18 3.07 0 4.38-2.68 5.35-5.22 5.63.41.36.78 1.06.78 2.14v3.17c0 .3.2.66.79.55 4.5-1.5 7.76-5.75 7.76-10.77C23.1 5.33 18.27.5 12 .5Z"
      />
    </svg>
  );
}

/**
 * The guide: a codex, open. Fifteen chapters read in order is a book, not a
 * question-mark-in-a-circle, and the spine is what makes the shape read as one at
 * 22px rather than as two panels.
 */
function GuideMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5.6C10.2 4.2 7.9 3.6 4.4 3.6v14c3.5 0 5.8.6 7.6 2 1.8-1.4 4.1-2 7.6-2v-14c-3.5 0-5.8.6-7.6 2Z" />
      <path d="M12 5.6v12" />
    </svg>
  );
}

/** The pixel S from sfumato's favicon, on the same 24-unit box as its neighbours. */
function SfumatoMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      <g fill="currentColor">
        <rect x="5" y="1" width="8" height="2" />
        <rect x="3" y="3" width="2" height="2" />
        <rect x="3" y="5" width="2" height="2" />
        <rect x="5" y="7" width="6" height="2" />
        <rect x="11" y="9" width="2" height="2" />
        <rect x="11" y="11" width="2" height="2" />
        <rect x="3" y="13" width="8" height="2" />
      </g>
    </svg>
  );
}

const LINKS = [
  { href: 'https://github.com/getsfumato/vitruvio', label: 'Source on GitHub', Mark: GithubMark },
  {
    href: 'https://docs.vitruvio.sh',
    label: 'Docs',
    Mark: GuideMark,
  },
  { href: 'https://sfumato.sh', label: 'sfumato', Mark: SfumatoMark },
] as const;

export default function LinkRow() {
  return (
    <nav className="links" aria-label="Project links">
      {LINKS.map(({ href, label, Mark }) => (
        <a key={href} href={href} aria-label={label} title={label}>
          <Mark />
        </a>
      ))}
    </nav>
  );
}
