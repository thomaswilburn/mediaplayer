import "./media-player.js";
import "./media-playlist.js";
import { echo } from "./echo.js";

var singleButton = document.querySelector(".load-file");
singleButton.addEventListener("click", _ => echo.shout("playlist:openfile"));

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