import InstallCommand from '@/components/InstallCommand';
import LinkRow from '@/components/LinkRow';
import ProportionField from '@/components/ProportionField';
import Reveal from '@/components/Reveal';
import SpecimenPlate from '@/components/SpecimenPlate';

/**
 * One screen, one action — the same shape as sfumato.sh, for the same reason: a
 * visitor who has read the line either runs the command or follows a link, and a
 * scrolling descent through feature beats is in the way of both.
 *
 * The plate at the top is the argument in one object. Vitruvius wrote down the
 * proportions of a body so that anyone could check them; this page samples five
 * regions of his portrait and reports what it actually finds there, which is what
 * the engine does with a brain. Numbers you can check, not prose you have to
 * believe.
 *
 * The plate's shader is also the only thing that removes the crop and the
 * engraver's backdrop — see the comments in SpecimenPlate — which is why the
 * fallback image carries a radial mask and a screen blend of its own until the GL
 * layer takes over.
 */
export default function Home() {
  return (
    <>
      <ProportionField />

      <main className="stage">
        <Reveal className="portrait" delay={0.05}>
          <SpecimenPlate />
        </Reveal>

        <Reveal delay={0.2}>
          <h1 className="wordmark">vitruvio</h1>
        </Reveal>

        <Reveal delay={0.32}>
          <p className="lede">
            Portable, verifiable, model-agnostic knowledge. <em>The brain returns evidence, never prose.</em>
          </p>
        </Reveal>

        <Reveal className="stage__act" delay={0.44}>
          <InstallCommand />
        </Reveal>

        <Reveal className="stage__act" delay={0.58}>
          <LinkRow />
        </Reveal>
      </main>
    </>
  );
}
