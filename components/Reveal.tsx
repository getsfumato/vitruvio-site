/**
 * Staggered entrance. The page surfaces out of the dark the way the plate does —
 * nothing slides in from off-screen.
 *
 * Deliberately CSS, not motion. An entrance animation that starts at opacity 0
 * decides whether content is visible at all, so it must not depend on JavaScript: a
 * `motion.div` with `initial={{ opacity: 0 }}` server-renders the hidden state
 * inline, and anything that stops the animation from running — no JS, a hydration
 * error, a throttled background tab — leaves the page blank. A keyframe animation
 * degrades to "visible" on its own, and reduced-motion turns it off entirely.
 *
 * motion is used for interaction instead, where it earns its keep: see the label swap
 * and press feedback in InstallCommand.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** seconds */
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={className ? `reveal ${className}` : 'reveal'}
      style={{ '--reveal-delay': `${delay}s` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
