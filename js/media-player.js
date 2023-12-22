import { AudioVisual } from "./audio-visuals.js";
import { echo } from "./echo.js";

var templatePath = new URL("media-player.html", import.meta.url).toString();
var html = await fetch(templatePath).then(r => r.text());

import { ConspiracyElement } from "https://thomaswilburn.github.io/conspiracy/index.js";

export class MediaPlayer extends ConspiracyElement {
  #src = null;
  #file = null;
  activePlayer = null;
  static template = html;

  constructor() {
    super();

    var bind = ["handlePlayButton", "handleRange", "handleSkipButton"];
    for (var f of bind) {
      this[f] = this[f].bind(this);
    }

    this.ui.refs.audio.isAudio = true;
    this.activePlayer = this.ui.refs.audio;

    echo.addEventListener("player:play", (e) => this.play(e.detail));
  }

  play(file) {
    if (this.#src) {
      URL.revokeObjectURL(this.#src);
    }
    this.#file = file;
    this.#src = URL.createObjectURL(file);
    var { audio, video, visualizer } = this.ui.refs;
    audio.src = "";
    video.src = "";
    var [ media ] = file.type.split("/");
    var player = media == "video" ? video : audio;
    this.activePlayer = player;
    player.src = this.#src;
    player.play();
    visualizer.start();
    this.scrollIntoView({ behavior: "smooth" });
    this.render();
  }

  handleEvent(e) {
    var { currentTime, duration, paused } = e.target;
    var minutes = 60;
    var hours = Math.floor(currentTime / (60 * 60));
    var minutes = Math.floor((currentTime - hours) / 60);
    var seconds = Math.floor(currentTime % 60);
    var pad = n => n.toString().padStart(2, "0");
    this.timecode = [hours, minutes, seconds].map(pad).join(":");
    var event = `media:${e.type}`;
    echo.shout(event, this.#file);
    this.render();
  }

  handlePlayButton(e) {
    if (!this.#src) {
      return echo.shout("playlist:openfile");
    }
    var { audio, video, visualizer } = this.ui.refs;
    var player = this.activePlayer || audio;
    if (player.paused) {
      player.play();
      visualizer.start();
    } else {
      player.pause();
      visualizer.pause();
    }
  }

  handleSkipButton(e) {
    this.activePlayer.currentTime += 15;
  }

  handleRange(e) {
    var track = e.target;
    this.activePlayer.currentTime = track.valueAsNumber;
  }
}

window.customElements.define("media-player", MediaPlayer);
