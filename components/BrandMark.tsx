/**
 * The mark, in the size variant that ships for 24–48px (public/brand/mark-small.svg):
 * Leonardo's circle and square, and the man reduced to a V whose outer edges run from
 * the square's top corners to the midpoint of its base, with the head resting on the
 * square's top edge. Inline rather than an <img> so it paints with the page and never
 * flashes in late; the palette is the page's own — ivory figure, gold construction.
 *
 * It sits in the corner and is not a link: on a one-screen page there is nowhere for
 * a home link to go.
 */
export default function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" role="img" aria-label="vitruvio">
      <rect
        x="3.056"
        y="5.611"
        width="25.889"
        height="25.889"
        fill="none"
        stroke="#cba053"
        strokeOpacity="0.28"
      />
      <circle cx="16" cy="16" r="15.5" fill="none" stroke="#cba053" strokeOpacity="0.55" />
      <path fill="#e9e1d1" d="M3.556 6.111L16 31L28.444 6.111H25.649L16 25.41L6.351 6.111Z" />
      <circle cx="16" cy="7.667" r="1.556" fill="#e9e1d1" />
    </svg>
  );
}
