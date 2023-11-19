class VisibilityTicker extends EventTarget {
  timeout = null;

  constructor(frequency) {
    super();
    this.frequency = frequency;
    window.addEventListener("visibilitychange", () => {
      var visible = document.visibilityState == "visible";
      if (visible) {
        this.dispatchEvent(new CustomEvent("visible"));
        this.tick();
      } else {
        this.dispatchEvent(new CustomEvent("hidden"));
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

const FFT_SIZE = 128;
const FFT_WINDOW = 96;
const TICK_RATE = 400;

var templatePath = new URL("audio-visuals.html", import.meta.url).toString();
var template = await fetch(templatePath.toString()).then(r => r.text());
template = template.replace("$WINDOW", FFT_WINDOW + 1);

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
    this.clock.addEventListener("visible", this.start.bind(this));
    this.clock.addEventListener("hidden", this.pause.bind(this));
  }

  handleTick() {
    if (this.#paused) return;
    var frequencies = new Uint8Array(FFT_SIZE);
    this.analyzer.getByteFrequencyData(frequencies);
    if (frequencies.every(f => f == 0)) return;
    var offset = 0;//(FFT_SIZE - FFT_WINDOW) / 2;
    frequencies = frequencies.slice(offset, offset + FFT_WINDOW);
    var d = [...frequencies].map((b, i) => `${i+1},${1 - (b / 255)}`).join(" ");
    var ns = this.svg.namespaceURI;
    var outline = document.createElementNS(ns, "path");
    outline.setAttribute("d", "M" + d);
    outline.setAttribute("class", "outlined");
    var timeline = [
      { opacity: .01, translate: "0 30%" },
      { offset: .05, opacity: 1 },
      { offset: .95, opacity: 1 },
      { opacity: .01, translate: "0 -40%", scale: .8 }
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
    for (var path of this.svg.querySelectorAll("path")) {
      var animations = path.getAnimations();
      if (!animations.length) path.remove();
      animations.forEach(a => a.play());
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
