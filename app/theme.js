/* ============================================================================
   theme.js  —  applies EasySignage theme settings from player tags
   ============================================================================
   Load after easysignage.js and theme.css:

       <script src="easysignage.js"></script>
       <script src="theme.js"></script>
       <script>
         var panel = EasySignage.read();
         var theme = EasySignageTheme.apply(panel);   // { name, portrait }
       </script>

   Player tags it reads (all optional):
       theme   "dark" (default), "light" or "contrast"
       accent  a hex colour such as "#ff6a00" for highlights

   It also adds "is-portrait" or "is-landscape" to <html>.
   Classic ES5 script: works on older Tizen, webOS and BrightSign players.
   ============================================================================ */
(function (global) {
  "use strict";

  var THEMES = { dark: "", light: "theme-light", contrast: "theme-contrast" };
  var HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

  function addClass(el, name) {
    if (name && (" " + el.className + " ").indexOf(" " + name + " ") < 0) {
      el.className = (el.className ? el.className + " " : "") + name;
    }
  }

  // True when the screen is taller than it is wide. Prefers the reported
  // resolution ("1080x1920") and falls back to the window size.
  function isPortrait(panel) {
    var parts = ((panel && panel.resolution) || "").split("x");
    var w = parseInt(parts[0], 10) || global.innerWidth;
    var h = parseInt(parts[1], 10) || global.innerHeight;
    return h > w;
  }

  function apply(panel) {
    var tags = (panel && panel.tags) || {};
    var root = global.document.documentElement;

    var name = String(tags.theme || "dark").toLowerCase();
    if (!THEMES.hasOwnProperty(name)) name = "dark";
    addClass(root, THEMES[name]);

    // Only accept a plain hex colour, so a typo can't break the page.
    if (HEX.test(tags.accent || "")) {
      root.style.setProperty("--accent", tags.accent);
    }

    var portrait = isPortrait(panel);
    addClass(root, portrait ? "is-portrait" : "is-landscape");

    return { name: name, portrait: portrait };
  }

  global.EasySignageTheme = { apply: apply, isPortrait: isPortrait };
})(window);
