/* ============================================================================
   easysignage.js  —  EasySignage HTML-ZIP player-object reader (COPY THIS FILE)
   ============================================================================

   Drop this file into your HTML-ZIP creative and load it with a plain script
   tag, BEFORE your own code:

       <script src="easysignage.js"></script>

   Then read the player/panel identity + context anywhere:

       var panel = EasySignage.read();
       var playerId = panel.player_id || "";
       var zone     = (panel.tags && panel.tags.zone) || "";

   ----------------------------------------------------------------------------
   HOW THE DATA REACHES YOU
   EasySignage delivers the same object through TWO channels; this reader uses
   whichever is available, so you don't have to care which one it was:

     1) GLOBAL JS OBJECT — injected automatically into your index.html:
            window.easysignage      // the player object

     2) URL QUERY STRING — appended to the page URL on every render:
            index.html?player_id=...&display_unit_id=...&tags.zone=north&...
        Always present, even if a strict Content-Security-Policy on your
        creative blocks the injected inline <script> (the global). read()
        falls back to parsing the query so your creative still works.

   ----------------------------------------------------------------------------
   WHAT YOU GET
   Only the BroadSign-compatible subset is delivered — the same value is exposed
   under both the native EasySignage key and its BroadSign alias:
        player_id
        name
        screen_id                / display_unit_id
        resolution               / display_unit_resolution / frame_resolution
        playlist_id              / campaign_id
        display_unit_lat_long    (only when the device location is known)
        tags                     (object; see below)

   VALUE RULES
     - Every delivered field is a STRING.
     - Empty values are present as "" — the key never disappears.
     - `tags` is an object: { zone: "north", floor: "3", ... }.
     - At most 20 tags are carried on-device; the full set exists server-side.

   This file has NO dependencies and is written as a classic (non-module)
   script so it also runs on older webviews under file:// (Tizen/webOS/
   BrightSign). Do not convert it to an ES module.
   ============================================================================ */
(function (global) {
  "use strict";

  // Rebuild the player object from a query string. This mirrors exactly what
  // the injected bootstrap does, so behaviour is identical in both channels.
  function parseQuery(search) {
    var o = {};
    var qs = (search || "").replace(/^\?/, "");
    if (qs) {
      var pairs = qs.split("&");
      for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];
        if (!pair) continue;
        var eq = pair.indexOf("=");
        var k = eq < 0 ? pair : pair.slice(0, eq);
        var v = eq < 0 ? "" : pair.slice(eq + 1);
        // "+" is a legacy space encoding; decode it before percent-decoding.
        try { k = decodeURIComponent(k.replace(/\+/g, " ")); } catch (e) {}
        try { v = decodeURIComponent(v.replace(/\+/g, " ")); } catch (e) {}
        // Keys like "tags.zone" become o.tags.zone
        if (k.indexOf("tags.") === 0) {
          o.tags = o.tags || {};
          o.tags[k.slice(5)] = v;
        } else {
          o[k] = v;
        }
      }
    }
    // Every delivered field is a string, so no numeric casting is needed.
    return o;
  }

  // Returns the player object. Prefers the injected global; falls back to the
  // query string when the global is absent (e.g. blocked by a strict CSP).
  function read() {
    var g = global.easysignage;
    if (g && typeof g === "object") return g;
    return parseQuery(global.location ? global.location.search : "");
  }

  // True when read() got its data from the injected global rather than the
  // query fallback. Handy for diagnostics; not needed for normal use.
  function usedGlobal() {
    var g = global.easysignage;
    return !!(g && typeof g === "object");
  }

  global.EasySignage = { read: read, usedGlobal: usedGlobal, parseQuery: parseQuery };
})(window);
