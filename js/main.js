import "./media-player.js";

var fileInput = document.querySelector("#file");
var player = document.querySelector("media-player");

fileInput.addEventListener("input", function(e) {
  var [ file ] = e.target.files;
  var { name, type } = file;
  player.play(file);
});