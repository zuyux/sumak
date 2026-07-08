export interface SharedAudioAnalyser {
  context: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
}

const registryKey = Symbol.for('sumak.sharedAudioAnalyserRegistry');
const elementKey = Symbol.for('sumak.sharedAudioAnalyser');

type AudioWithAnalyser = HTMLMediaElement & {
  [elementKey]?: SharedAudioAnalyser;
};

type GlobalWithAnalyserRegistry = typeof globalThis & {
  [registryKey]?: WeakMap<HTMLMediaElement, SharedAudioAnalyser>;
};

const globalWithRegistry = globalThis as GlobalWithAnalyserRegistry;
const analyserByElement =
  globalWithRegistry[registryKey] ??
  (globalWithRegistry[registryKey] = new WeakMap<
    HTMLMediaElement,
    SharedAudioAnalyser
  >());

export function getAudioAnalyser(audio: HTMLMediaElement): SharedAudioAnalyser | null {
  const audioWithAnalyser = audio as AudioWithAnalyser;
  const existing =
    audioWithAnalyser[elementKey] ?? analyserByElement.get(audio);
  if (existing) return existing;

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) return null;

  const context = new AudioContextClass();
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.72;

  // A media element can only be wrapped by createMediaElementSource once.
  // Keep this graph for the lifetime of the persistent audio element so that
  // revisiting /player can reuse it.
  let source: MediaElementAudioSourceNode;
  try {
    source = context.createMediaElementSource(audio);
  } catch (error) {
    void context.close();
    // A source created by code from before the shared registry cannot be
    // recovered. A browser refresh replaces that media element; do not keep
    // retrying and flooding the console in the meantime.
    if (error instanceof DOMException && error.name === 'InvalidStateError') {
      return null;
    }
    throw error;
  }

  const graph = { context, analyser, source };
  source.connect(analyser);
  analyser.connect(context.destination);
  analyserByElement.set(audio, graph);
  audioWithAnalyser[elementKey] = graph;
  return graph;
}
