import Link from 'next/link';
import {
  ArrowRight,
  AudioLines,
  Bitcoin,
  Disc3,
  Headphones,
  Radio,
  Sparkles,
} from 'lucide-react';

const features = [
  {
    icon: Headphones,
    label: 'Listen',
    title: 'Discover sound differently.',
    copy: 'Explore music through an immersive player built to keep the artwork, artist, and sound in one place.',
  },
  {
    icon: Disc3,
    label: 'Collect',
    title: 'Own the music you love.',
    copy: 'Collect limited digital releases with provenance secured on the Bitcoin economy through Stacks.',
  },
  {
    icon: Sparkles,
    label: 'Create',
    title: 'Release on your terms.',
    copy: 'Turn original music into a collectible release and connect directly with the people listening.',
  },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(124,92,255,0.18),transparent_32%),radial-gradient(circle_at_18%_72%,rgba(255,112,67,0.12),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:72px_72px]" />

      <section className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-center px-6 pb-20 pt-28 md:px-10">
        <div className="mb-8 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/70 backdrop-blur">
          <Radio className="h-3.5 w-3.5" />
          Sounds &amp; sats
        </div>

        <div className="grid items-end gap-12 lg:grid-cols-[1.25fr_.75fr]">
          <div>
            <h1 className="title max-w-5xl text-[clamp(4rem,12vw,10rem)] leading-[0.78] tracking-[-0.06em]">
              MUSIC,
              <br />
              <span className="text-white/35">WITH VALUE.</span>
            </h1>
          </div>

          <div className="max-w-lg pb-2 lg:pb-4">
            <p className="text-lg leading-relaxed text-white/65 md:text-xl">
              SUMAK is a home for independent sound—where artists release music
              as digital collectibles and listeners discover, play, and own it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/player"
                className="group inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-white/85"
              >
                Open the player
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/mint"
                className="inline-flex items-center gap-3 rounded-full border border-white/20 px-6 py-3.5 text-sm font-medium text-white transition hover:border-white/45 hover:bg-white/5"
              >
                Release music
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-20 flex items-center gap-4 text-xs uppercase tracking-[0.22em] text-white/35">
          <AudioLines className="h-4 w-4" />
          Built for the next wave of independent music
        </div>
      </section>

      <section className="relative border-y border-white/10 bg-black/25">
        <div className="mx-auto grid max-w-7xl md:grid-cols-3">
          {features.map(({ icon: Icon, label, title, copy }, index) => (
            <article
              key={label}
              className={`group p-8 md:p-10 lg:p-12 ${
                index !== features.length - 1 ? 'border-b border-white/10 md:border-b-0 md:border-r' : ''
              }`}
            >
              <div className="mb-12 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.25em] text-white/40">
                  0{index + 1} / {label}
                </span>
                <Icon className="h-5 w-5 text-white/50 transition group-hover:text-white" />
              </div>
              <h2 className="title max-w-xs text-2xl leading-tight">{title}</h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/50">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto grid max-w-7xl gap-12 px-6 py-24 md:px-10 lg:grid-cols-2 lg:py-32">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-300/25 bg-orange-300/10">
            <Bitcoin className="h-5 w-5 text-orange-200" />
          </div>
          <h2 className="title mt-8 max-w-xl text-4xl leading-tight md:text-6xl">
            The track is more than a stream.
          </h2>
        </div>
        <div className="flex max-w-xl flex-col justify-end">
          <p className="text-lg leading-8 text-white/55">
            SUMAK gives every release a place to be heard, seen, and collected.
            Music remains at the center; ownership adds a closer connection
            between artist and audience.
          </p>
          <Link
            href="/player"
            className="mt-8 inline-flex w-fit items-center gap-2 border-b border-white/35 pb-1 text-sm font-medium transition hover:border-white"
          >
            Start listening <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="relative border-t border-white/10 px-6 py-8 md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 text-xs uppercase tracking-[0.2em] text-white/35">
          <span>SUMAK</span>
          <span>Sounds &amp; sats</span>
        </div>
      </footer>
    </div>
  );
}
