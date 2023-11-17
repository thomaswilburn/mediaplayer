import { echo } from "./echo.js";

var template = `
<style>
  input[type="file"] {
    position: absolute;
    left: -10000px;
  }

  .container {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  ul {
    list-style-type: none;
    display: block;
    margin: 0;
    padding: 0;
    background: black;
    flex: 1 1 0;
    overflow-y: scroll;

    & li {
      font-size: 13px;
      background: #333;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 8px 2px;
      cursor: pointer;

      &.active {
        font-weight: bold;
      }
    }
  }

  .toolbar {
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    text-transform: uppercase;
    font-family: inherit;
    gap: 4px;
    background: black;

    & label, & button {
      flex: 1;
      appearance: none;
      border: none;
      color: inherit;
      background: var(--bg);
      font-family: inherit;
      text-transform: inherit;
      font-size: inherit;
      text-align: center;
      padding: 4px;
    }
  }
</style>
<div class="container">
  <ul as="tracks"></ul>
  <div class="toolbar">
    <input type="file" id="file-input" as="add" multiple accept="audio/*, video/*">
    <label for="file-input">Add tracks</label>
    <button as="clear">Clear playlist</button>
  </div>
</div>
`;

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

    echo.addEventListener("media-timeupdate", this.handleMediaEvent.bind(this));
    echo.addEventListener("media-ended", this.handleMediaEvent.bind(this));
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
      console.log(files[0]);
      echo.shout("media-requestplay", files[0]);
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
    echo.shout("media-requestplay", file);
  }

  handleMediaEvent(e) {
    var file = e.detail;
    if (e.type == "media-ended") {
      var list = [...this.#elements.tracks.querySelectorAll("li")];
      var active = list.find(li => li.file == file);
      var next = active.nextElementSibling;
      if (!next) return;
      echo.shout("media-requestplay", next.file);
    }
    for (var li of this.#elements.tracks.children) {
      if (li.file) {
        li.classList.toggle("active", li.file == file);
      }
    }
  }

}

window.customElements.define("media-playlist", MediaPlaylist);