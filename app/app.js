/* Building directory bootstrap: reads the player, picks buildings and mode,
   and runs the single 1-second timer. ES5 only. */
(function () {
  "use strict";

  var panel = EasySignage.read();
  // Tags can arrive on the injected player object, in the URL query, or both,
  // so read every source. Other fields named like "*tag*" are read too.
  var queryTags = EasySignage.parseQuery(window.location ? window.location.search : "").tags;
  var sources = [panel.tags, queryTags];
  for (var field in panel) {
    if (panel.hasOwnProperty(field) && field !== "tags" && /tag/i.test(field)) {
      sources.push(panel[field]);
    }
  }
  var tags = {};
  var objects = [queryTags, panel.tags];
  for (var s = 0; s < objects.length; s++) {
    var obj = objects[s];
    if (obj && typeof obj === "object" && !(obj instanceof Array)) {
      for (var k in obj) if (obj.hasOwnProperty(k)) tags[k] = obj[k];
    }
  }
  EasySignageTheme.apply({ resolution: panel.resolution, tags: tags });
  var root = document.documentElement;

  // Orientation from the real viewport: a screen mounted in portrait can
  // still report a landscape resolution (e.g. "1920x1080") when the player
  // rotates the output. Fall back to the reported resolution only when the
  // viewport size is unknown.
  function isPortrait() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (w > 0 && h > 0) return h > w;
    return EasySignageTheme.isPortrait(panel);
  }
  function applyOrientation() {
    var portrait = isPortrait();
    Dir.toggleClass(root, "is-portrait", portrait);
    Dir.toggleClass(root, "is-landscape", !portrait);
    return portrait;
  }
  var portrait = applyOrientation();
  var data = window.APP_DATA || { buildings: [] };

  var tokens = DirTags.tokens.apply(null, sources);
  var selection = DirTags.selectBuildings(data.buildings, tokens);
  // The touchscreen tag makes the screen tappable: it pages through the list
  // with a "Tap the screen" prompt, and a tap opens search and details.
  var touch = DirTags.isTouch(tokens);
  var buildings = selection.buildings;
  var multi = buildings.length > 1;

  var app = document.getElementById("app");
  Dir.toggleClass(root, "mode-display", true);

  document.getElementById("title").textContent = tags.title || "Building Directory";
  var names = [];
  for (var i = 0; i < buildings.length; i++) names.push(buildings[i].name);
  document.getElementById("subtitle").textContent =
    multi && selection.all ? "All buildings" : names.join("  ·  ");

  var opts = {
    app: app,
    body: document.getElementById("body"),
    items: Dir.flatten(buildings),
    buildings: buildings,
    multi: multi,
    portrait: portrait,
    pageSeconds: DirTags.number(tags.page_seconds, 10, 5, 60),
    idleSeconds: DirTags.number(tags.idle_seconds, 60, 15, 600),
    tapPrompt: touch
  };
  var display = DirDisplay.start(opts);
  var touchMode = null;
  var mode = display;

  function setModeClass(isTouch) {
    Dir.toggleClass(root, "mode-touch", isTouch);
    Dir.toggleClass(root, "mode-display", !isTouch);
  }

  if (touch) {
    // After the idle time, go back to the auto-paging list.
    opts.onIdle = function () {
      touchMode.hide();
      setModeClass(false);
      display.relayout(applyOrientation());
      mode = display;
    };
    // Runs after any element's own click handlers, so the tap that opens
    // touch mode doesn't also press something in it.
    document.addEventListener("click", function () {
      if (mode !== display) return;
      display.stop();
      setModeClass(true);
      if (touchMode) touchMode.show(applyOrientation());
      else touchMode = DirTouch.start(opts);
      mode = touchMode;
    });
  }

  // When no building tag matched, say so on screen for a few minutes and show
  // what the player actually sent, so a misconfigured tag is easy to spot.
  var NOTE_SECONDS = 300;
  var note = null;
  if (!selection.matched) {
    var received = tokens.length ? tokens.join(", ") : "none";
    if (received.length > 140) received = received.slice(0, 140) + "…";
    // Screen name and data source show whether any player data arrived at
    // all, which separates "tags not set up" from "app not getting data".
    var message = "No building tag found, showing all buildings. Tags received: " +
      received + "  \u00b7  Screen: " + (panel.name || "unknown") +
      "  \u00b7  Data from: " + (EasySignage.usedGlobal() ? "player object" : "URL") +
      " (" + (window.location && window.location.search ? "URL has data" : "URL empty") + ")";
    if (window.console) console.warn("Building directory: " + message);
    note = app.appendChild(Dir.el("div", "dir-note", message));
  }
  var seconds = 0;

  // Clock: only touch the DOM when the minute changes.
  var clock = document.getElementById("clock");
  function updateClock() {
    var t = Dir.formatTime(new Date());
    if (clock.textContent !== t) clock.textContent = t;
  }
  updateClock();

  // Some players size or rotate the window after the page loads without a
  // resize event, so also check the size once a second.
  function sizeKey() {
    return window.innerWidth + "x" + window.innerHeight;
  }
  var lastSize = sizeKey();
  // Lay out once more after the player has settled (fonts, window size).
  setTimeout(function () {
    lastSize = sizeKey();
    mode.relayout(applyOrientation());
  }, 2000);
  function relayoutIfResized() {
    var size = sizeKey();
    if (size === lastSize) return;
    lastSize = size;
    mode.relayout(applyOrientation());
  }

  setInterval(function () {
    updateClock();
    relayoutIfResized();
    mode.tick();
    if (note && ++seconds >= NOTE_SECONDS) {
      app.removeChild(note);
      note = null;
    }
  }, 1000);

  // Previews resize, and some players apply rotation after the page loads.
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(relayoutIfResized, 250);
  });

  // Lets :active pressed styles show on older touch webviews.
  document.addEventListener("touchstart", function () {}, false);
})();
