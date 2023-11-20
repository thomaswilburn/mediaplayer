import { AudioVisual } from "./audio-visuals.js";
import { echo } from "./echo.js";

var templatePath = new URL("media-player.html", import.meta.url).toString();
var template = await fetch(templatePath).then(r => r.text());

export class MediaPlayer extends HTMLElement {
  #src = null;
  #file = null;
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
      var events = "canplay loaded ended playing paused timeupdate".split(" ");
      for (var event of events) {
        mediaElement.addEventListener(event, this.handleMediaEvent.bind(this));
      }
    }

    var { track, play, skip, visuals } = this.#elements;
    play.addEventListener("click", this.handlePlayButton.bind(this));
    visuals.addEventListener("click", this.handlePlayButton.bind(this));
    track.addEventListener("input", this.handleRange.bind(this));
    skip.addEventListener("click", this.handleSkipButton.bind(this));

    echo.addEventListener("player:play", (e) => this.play(e.detail));
  }

  play(file) {
    if (this.#src) {
      URL.revokeObjectURL(this.#src);
    }
    this.#file = file;
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
    this.scrollIntoView({ behavior: "smooth" });
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
    var event = `media:${e.type}`;
    echo.shout(event, this.#file);
  }

  handlePlayButton(e) {
    if (!this.#src) {
      return echo.shout("playlist:openfile");
    }
    var { audio, video, visualizer } = this.#elements;
    var player = this.#activePlayer || audio;
    if (player.paused) {
      player.play();
      visualizer.start();
    } else {
      player.pause();
      visualizer.pause();
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
