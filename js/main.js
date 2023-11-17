import "./media-player.js";
import "./media-playlist.js";
import { echo } from "./echo.js";

var fileInput = document.querySelector("#file");
var player = document.querySelector("media-player");

fileInput.addEventListener("input", function(e) {
  var [ file ] = e.target.files;
  var { name, type } = file;
  player.play(file);
});

echo.addEventListener("media-requestfile", function(e) {
  fileInput.click();
});

function scrollApp(e) {
  var targets = {
    player: document.querySelector("media-player"),
    playlist: document.querySelector("media-playlist")
  };
  var { dest } = e.target.dataset;
  if (!(dest in targets)) return;
  targets[dest].scrollIntoView({ behavior: "smooth" });
}

for (var jump of document.querySelectorAll(".scroll-to")) {
  jump.addEventListener("click", scrollApp);
}