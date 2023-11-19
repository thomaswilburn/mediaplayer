import { echo } from "./echo.js";

var templatePath = new URL("media-playlist.html", import.meta.url).toString();
var template = await fetch(templatePath).then(r => r.text());

class MediaPlaylist extends HTMLElement {

  #elements = {};

  constructor() {
    super();
    var root = this.attachShadow({ mode: "open" });
    root.innerHTML = template;
    for (var as of root.querySelectorAll("[as]")) {
      var name = as.getAttribute("as");
      this.#elements[name] = as;
    }

    var { add, clear, tracks } = this.#elements;
    add.addEventListener("input", this.handleAddFile.bind(this));
    clear.addEventListener("click", this.handleClearButton.bind(this));
    tracks.addEventListener("click", this.handleTrackSelection.bind(this));

    echo.addEventListener("media:timeupdate", this.handleMediaEvent.bind(this));
    echo.addEventListener("media:ended", this.handleMediaEvent.bind(this));
    echo.addEventListener("playlist:openfile", () => this.#elements.add.click());
  }

  handleAddFile(e) {
    var { tracks } = this.#elements;
    var wasEmpty = tracks.children.length == 0;
    var files = e.target.files;
    for (var file of files) {
      var li = document.createElement("li");
      li.innerHTML = file.name;
      li.file = file;
      tracks.append(li);
    }
    if (wasEmpty) {
      echo.shout("player:play", files[0]);
    }
  }

  handleClearButton(e) {
    var { tracks } = this.#elements;
    while (tracks.children.length) {
      tracks.children[0].remove();
    }
  }

  handleTrackSelection(e) {
    var { file } = e.target;
    if (!file) return;
    echo.shout("player:play", file);
  }

  handleMediaEvent(e) {
    var file = e.detail;
    if (e.type == "media-ended") {
      var list = [...this.#elements.tracks.querySelectorAll("li")];
      var active = list.find(li => li.file == file);
      var next = active.nextElementSibling;
      if (!next) return;
      echo.shout("player:play", next.file);
    }
    for (var li of this.#elements.tracks.children) {
      if (li.file) {
        li.classList.toggle("active", li.file == file);
      }
    }
  }

}

window.customElements.define("media-playlist", MediaPlaylist);