import { AudioVisual } from "./audio-visuals.js";

var template = `
<style>
.outer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.visual-container {
  display: block;
  flex: 1;
  position: relative;

  & > * {
    position: absolute;
    width: 100%;
    height: 100%;
    inset: 0 0 0 0;
    object-fit: contain;
    background: black;
  }
}

.controls {
  display: flex;
  padding: 20px;
  gap: 20px;

  #play {
    aspect-ratio: 1;
  }

  #track {
    flex: 1;
    accent-color: #808;
  }
}

</style>
<div class="outer">
  <div class="visual-container">
    <audio-visual as="visualizer">
      <audio as="audio"></audio>
    </audio-visual>
    <video as="video" hidden></video>
  </div>
  <div class="controls">
    <button id="play" as="play">PLAY</button>
    <input type="range" id="track" as="track" value=0>
  </div>
</div>
`

export class MediaPlayer extends HTMLElement {
  #src = null;
  #elements = {};
  #activePlayer = null;

  constructor() {
    super();
    var root = this.attachShadow({ mode: "open" });
    root.innerHTML = template;
    for (var element of root.querySelectorAll("[as]")) {
      var name = element.getAttribute("as");
      this.#elements[name] = element;
    }

    var { audio, video } = this.#elements;
    for (var mediaElement of [ audio, video ]) {
      var events = "canplay loaded playing paused timeupdate".split(" ");
      for (var event of events) {
        mediaElement.addEventListener(event, this.handleMediaEvent.bind(this));
      }
    }

    var { track, play } = this.#elements;
    play.addEventListener("click", this.handlePlayButton.bind(this));
    track.addEventListener("input", this.handleRange.bind(this));
  }

  play(file) {
    if (this.#src) {
      // URL.revokeObjectURL(this.#src);
    }
    this.#src = URL.createObjectURL(file);
    var { audio, video, visualizer } = this.#elements;
    audio.src = "";
    video.src = "";
    var [ media ] = file.type.split("/");
    video.toggleAttribute("hidden", media != "video");
    visualizer.toggleAttribute("hidden", media != "audio");
    var player = media == "video" ? video : audio;
    this.#activePlayer = player;
    player.src = this.#src;
    player.play();
    visualizer.start();
  }

  handleMediaEvent(e) {
    var { currentTime, duration, paused } = e.target;
    var { play, track } = this.#elements;
    play.innerHTML = paused ? "play" : "pause";
    track.min = 0;
    track.max = duration;
    track.value = currentTime;
  }

  handlePlayButton(e) {
    var { audio, video } = this.#elements;
    var player = this.#activePlayer || audio;
    if (player.paused) {
      player.play();
    } else {
      player.pause();
    }
  }

  handleRange() {
    var { track } = this.#elements;
    this.#activePlayer.currentTime = track.valueAsNumber;
  }
}

window.customElements.define("media-player", MediaPlayer);