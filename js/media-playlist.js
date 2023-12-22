import { echo } from "./echo.js";

var templatePath = new URL("media-playlist.html", import.meta.url).toString();
var html = await fetch(templatePath).then(r => r.text());

import { ConspiracyElement } from "https://thomaswilburn.github.io/conspiracy/index.js";

class MediaPlaylist extends ConspiracyElement {
  static template = html;
  files = [];

  constructor() {
    super();

    var binds = ["handleAddFile", "handleClearButton", "handleTrackSelection", "handleMediaEvent"];
    for (var f of binds) {
      this[f] = this[f].bind(this);
    }

    echo.addEventListener("media:timeupdate", this.handleMediaEvent);
    echo.addEventListener("media:ended", this.handleMediaEvent);
    echo.addEventListener("playlist:openfile", this.handleAddFile);
  }

  handleAddFile(e) {
    if (!e.target.files) {
      // open the file picker
      return this.ui.refs.input.click();
    }
    var wasEmpty = this.files.length == 0;
    for (var file of e.target.files) {
      this.files.push({ name: file.name, file })
    }
    this.render();
    if (wasEmpty) {
      echo.shout("player:play", this.files[0].file);
    }
  }

  handleClearButton(e) {
    this.files.length = 0;
    this.render();
  }

  handleTrackSelection(e) {
    var { file } = e.target;
    if (!file) return;
    echo.shout("player:play", file);
  }

  handleMediaEvent(e) {
    var file = e.detail;
    if (e.type == "media:ended") {
      var active = this.files.find(li => li.file == file);
      var index = this.files.indexOf(active);
      var next = this.files[index+1];
      if (!next) return;
      echo.shout("player:play", next.file);
    }
    for (var li of this.files) {
      li.active = li.file == file;
    }
    this.render();
  }

}

window.customElements.define("media-playlist", MediaPlaylist);