/* Building directory bootstrap: reads the player, picks buildings and mode,
   and runs the single 1-second timer. ES5 only. */
(function () {
  "use strict";

  var panel = EasySignage.read();
  var tags = panel.tags || {};
  var theme = EasySignageTheme.apply(panel);
  var data = window.APP_DATA || { buildings: [] };

  var tokens = DirTags.tokens(tags);
  var selection = DirTags.selectBuildings(data.buildings, tokens);
  if (!selection.matched) {
    if (window.console) {
      console.warn("Building directory: no building tag matched (" +
        (tags.all || "no tags") + "); showing all buildings.");
    }
  }
  var touch = DirTags.isTouch(tokens);
  var buildings = selection.buildings;
  var multi = buildings.length > 1;

  var app = document.getElementById("app");
  var root = document.documentElement;
  Dir.toggleClass(root, touch ? "mode-touch" : "mode-display", true);

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
    portrait: theme.portrait,
    pageSeconds: DirTags.number(tags.page_seconds, 10, 5, 60),
    idleSeconds: DirTags.number(tags.idle_seconds, 60, 15, 600)
  };
  var mode = touch ? DirTouch.start(opts) : DirDisplay.start(opts);

  // Clock: only touch the DOM when the minute changes.
  var clock = document.getElementById("clock");
  function updateClock() {
    var t = Dir.formatTime(new Date());
    if (clock.textContent !== t) clock.textContent = t;
  }
  updateClock();

  setInterval(function () {
    updateClock();
    mode.tick();
  }, 1000);

  // Players don't resize, but browser previews do.
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var portrait = EasySignageTheme.isPortrait(panel);
      Dir.toggleClass(root, "is-portrait", portrait);
      Dir.toggleClass(root, "is-landscape", !portrait);
      mode.relayout(portrait);
    }, 250);
  });

  // Lets :active pressed styles show on older touch webviews.
  document.addEventListener("touchstart", function () {}, false);
})();
