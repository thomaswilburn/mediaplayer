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
  align-items: center;

  button {
    aspect-ratio: 1;
    width: 48px;
    display: grid;
    justify-content: center;
    align-items: center;
    border-radius: 100%;
    border: 1px solid white;
    background: #808;
    color: white;

    & svg {
      width: 100%;
      height: 100%;
    }

    & path {
      fill: currentColor;
    }

  }

  #play {
    &[data-state="playing"] .play-icon { display: none; }
    &[data-state="paused"] .pause-icon { display: none; }
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
    <button id="play" as="play" data-state="paused">
      <svg viewBox="0 0 16 16">
        <path class="play-icon" d="M6,2 L12,8 L6,14 Z" />
        <path class="pause-icon" d="M5,2 l2,0 l0,12 l-2,0 l0,-14 M9,2 l2,0 l0,12 l-2,0 l0,-14" /> 
      </svg>
    </button>
    <button as="skip">
      <svg viewBox="0 0 16 16">
        <path d="M5,3 l3,5 l-3,5 l0,-10 M10,3 l3,5 l-3,5 l0,-10" />
      </svg>
    </button>
    <input type="range" id="track" as="track" value=0>
    <div as="timecode"></div>
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

    var { track, play, skip } = this.#elements;
    play.addEventListener("click", this.handlePlayButton.bind(this));
    track.addEventListener("input", this.handleRange.bind(this));
    skip.addEventListener("click", this.handleSkipButton.bind(this));
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
    var { play, track, timecode } = this.#elements;
    play.dataset.state = paused ? "paused" : "playing";
    track.min = 0;
    track.max = duration;
    track.value = currentTime;
    var minutes = 60;
    var hours = Math.floor(currentTime / (60 * 60));
    var minutes = Math.floor((currentTime - hours) / 60);
    var seconds = Math.floor(currentTime % 60);
    var pad = n => n.toString().padStart(2, "0");
    timecode.innerHTML = [hours, minutes, seconds].map(pad).join(":");
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

  handleSkipButton(e) {
    this.#activePlayer.currentTime += 15;
  }

  handleRange() {
    var { track } = this.#elements;
    this.#activePlayer.currentTime = track.valueAsNumber;
  }
}

window.customElements.define("media-player", MediaPlayer);
