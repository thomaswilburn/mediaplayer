class VisibilityTicker extends EventTarget {
  timeout = null;

  constructor(frequency) {
    super();
    this.frequency = frequency;
    window.addEventListener("visibilitychange", () => {
      var visible = document.visibilityState == "visible";
      if (visible) {
        this.tick();
      } else {
        window.clearTimeout(this.timeout);
      }
    });
    this.tick = this.tick.bind(this);
    this.tick();
  }

  tick() {
    this.dispatchEvent(new CustomEvent("tick"));
    if (document.visibilityState == "visible") {
      this.timeout = window.setTimeout(this.tick, this.frequency);
    }
  }
}

const FFT_SIZE = 32;
const FFT_WINDOW = 24;
const TICK_RATE = 300;

var template = `
<style>
:host {
  display: block;
  position: relative;
}

canvas, svg {
  display: block;
  position: absolute;
  inset: 0 0 0 0;
  width: 100%;
  height: 100%;
  background: color-mix(in srgb, black, transparent);
}

line {
  stroke: white;
  stroke-width: 4px;
  stroke-linecap: round;
}

@keyframes joy-division {
  from {
    transform: translateY(30%);
    opacity: 1;
  }

  2% {
    opacity: 1;
  }

  98% {
    opacity: 1;
  }

  to {
    transform: translateY(-40%) scale(.7);
    opacity: 0;
  }
}

path {
  stroke: white;
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
  fill: none;

  &.filled {
    fill: black;
    stroke: none;
  }

  transform-origin: center;
}
</style>
<!-- <canvas></canvas> -->
<svg viewBox="0 -8 ${FFT_WINDOW + 1} 16" preserveAspectRatio="none">
</svg>
<slot></slot>
`;

export class AudioVisual extends HTMLElement {
  #elements = [];
  #sources = new Map();
  #bars = [];
  #paused = true;

  constructor() {
    super();
    var root = this.attachShadow({ mode: "open" });
    root.innerHTML = template;
    var slot = root.querySelector("slot")
    slot.addEventListener("slotchange", this.handleSlotChange.bind(this));

    this.audioContext = new AudioContext();
    this.analyzer = new AnalyserNode(this.audioContext, {
      fftSize: FFT_SIZE * 2,
      smoothingTimeConstant: 0
    });
    window.analyzer = this.analyzer;

    this.svg = root.querySelector("svg");

    this.clock = new VisibilityTicker(TICK_RATE);
    this.clock.addEventListener("tick", this.handleTick.bind(this));
  }

  handleTick() {
    if (this.#paused) return;
    var frequencies = new Uint8Array(FFT_WINDOW);
    this.analyzer.getByteFrequencyData(frequencies);
    if (frequencies.every(f => f == 0)) return;
    var d = [...frequencies].map((b, i) => `${i+1},${(b - 128) / -128}`).join(" ");
    var ns = this.svg.namespaceURI;
    var outline = document.createElementNS(ns, "path");
    outline.setAttribute("d", "M" + d);
    outline.setAttribute("class", "outlined");
    var timeline = [
      { translate: "0 30%", scale: 1 },
      { translate: "0 -40%", scale: .8 }
    ];
    var options = { duration: 10 * 1000, iterations: 1 };
    d = `M1,1 L${d} L${FFT_WINDOW},1 Z`;
    var fill = document.createElementNS(ns, "path");
    fill.setAttribute("d", d);
    fill.setAttribute("class", "filled");
    var remover = () => fill.remove() || outline.remove();
    this.svg.append(fill, outline);
    fill.animate(timeline, options).addEventListener("finish", remover);
    outline.animate(timeline, options).addEventListener("finish", remover);
  }

  handleSlotChange(e) {
    var elements = e.target.assignedElements();
    for (var current of this.#elements) {
      if (!elements.includes(current)) {
        this.disconnectElement(current);
      }
    }
    for (var slotted of elements) {
      if (!this.#sources.has(slotted)) {
        this.connectElement(slotted);
      }
    }
  }

  start() {
    this.#paused = false;
    this.audioContext.resume();
    var animations = this.svg.getAnimations({ subtree: true });
    for (var animation of animations) {
      animation.play();
    }
  }

  pause() {
    this.#paused = true;
    var animations = this.svg.getAnimations({ subtree: true });
    for (var animation of animations) {
      animation.pause();
    }
  }

  connectElement(element) {
    var node = new MediaElementAudioSourceNode(this.audioContext, { mediaElement: element });
    this.#sources.set(element, node);
    node.connect(this.analyzer);
    node.connect(this.audioContext.destination);
  }

  disconnectElement(element) {
    var node = this.#sources.get(element);
    this.#sources.delete(element);
    node.disconnect();
  }
}

window.customElements.define("audio-visual", AudioVisual);
