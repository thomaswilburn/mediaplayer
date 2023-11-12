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
  stroke-width: 10px;
  stroke-linecap: round;
}
</style>
<!-- <canvas></canvas> -->
<svg viewBox="0 -1 ${FFT_WINDOW + 1} 2" preserveAspectRatio="none">
</svg>
<slot></slot>
`;

export class AudioVisual extends HTMLElement {
  #elements = [];
  #sources = new Map();
  #bars = [];

  constructor() {
    super();
    var root = this.attachShadow({ mode: "open" });
    root.innerHTML = template;
    var slot = root.querySelector("slot")
    slot.addEventListener("slotchange", this.handleSlotChange.bind(this));

    this.audioContext = new AudioContext();
    this.analyzer = new AnalyserNode(this.audioContext, { fftSize: 64 });
    window.analyzer = this.analyzer;

    var svg = root.querySelector("svg");
    for (var i = 0; i < FFT_WINDOW; i++) {
      var bar = document.createElementNS(svg.namespaceURI, "line");
      bar.setAttribute("vector-effect", "non-scaling-stroke");
      bar.setAttribute("x1", i + 1);
      bar.setAttribute("x2", i + 1);
      bar.setAttribute("y1", -.5);
      bar.setAttribute("y2", .5);
      svg.append(bar);
      this.#bars.push(bar);
    }

    this.clock = new VisibilityTicker(100);
    this.clock.addEventListener("tick", this.handleTick.bind(this));
  }

  handleTick() {
    var frequencies = new Uint8Array(this.analyzer.frequencyBinCount);
    this.analyzer.getByteFrequencyData(frequencies);
    var start = (FFT_SIZE - FFT_WINDOW) / 2;
    frequencies = frequencies.slice(start, start + FFT_WINDOW);
    for (var i = 0; i < frequencies.length; i++) {
      var byte = frequencies[i];
      var ratio = byte / 255 * .8;
      var bar = this.#bars[i];
      bar.setAttribute("y1", -ratio);
      bar.setAttribute("y2", ratio);
    }
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
    this.audioContext.resume();
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