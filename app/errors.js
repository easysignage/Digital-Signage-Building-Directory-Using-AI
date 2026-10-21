/* Shows script errors on the screen instead of leaving it blank, so a
   problem on a player (where there is no console) can be read and reported.
   Loaded first, before any other script. ES5 only. */
(function (global) {
  "use strict";

  var shown = 0;

  function show(text) {
    if (shown >= 5) return;
    shown++;
    var doc = global.document;
    var box = doc.getElementById("app-errors");
    if (!box) {
      box = doc.createElement("div");
      box.id = "app-errors";
      box.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:9999;" +
        "padding:16px 24px;background:#000;color:#ffd400;" +
        "font:bold 28px/1.3 Arial,sans-serif;white-space:pre-wrap;word-wrap:break-word;";
      (doc.body || doc.documentElement).appendChild(box);
    }
    var line = doc.createElement("div");
    line.textContent = "Error: " + text;
    box.appendChild(line);
  }

  global.onerror = function (message, source, line, col) {
    var file = String(source || "").split("/").pop();
    show(message + (file ? "  (" + file + ":" + line + (col ? ":" + col : "") + ")" : ""));
    return false;
  };

  global.AppErrors = { show: show };
})(window);
