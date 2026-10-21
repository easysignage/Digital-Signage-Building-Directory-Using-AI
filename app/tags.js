/* Player tag parsing: which buildings to show, touch mode, numeric settings.
   Pure functions, ES5 only. */
(function (global) {
  "use strict";

  var ALL_WORDS = ["all", "all-buildings", "all_buildings", "allbuildings"];

  function addTokens(list, value) {
    var parts = String(value === undefined || value === null ? "" : value).split(",");
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i].replace(/^\s+|\s+$/g, "").toLowerCase();
      if (t && list.indexOf(t) < 0) list.push(t);
    }
  }

  // Every tag key and value as lowercase tokens. Reads tags.all
  // ("key:value,key:value") and each entry of the tags object, so previews
  // that only pass tags.<key>=<value> work too.
  function tokens(tags) {
    var list = [];
    tags = tags || {};
    var all = String(tags.all || "").split(",");
    for (var i = 0; i < all.length; i++) {
      var kv = all[i].split(":");
      addTokens(list, kv[0]);
      if (kv.length > 1) addTokens(list, kv.slice(1).join(":"));
    }
    for (var key in tags) {
      // Skip the "all" key itself: it holds the tag list, not a request for
      // all buildings.
      if (!tags.hasOwnProperty(key) || key === "all") continue;
      addTokens(list, key);
      addTokens(list, tags[key]);
    }
    return list;
  }

  function has(toks, word) {
    return toks.indexOf(word) >= 0;
  }

  // Returns { buildings, matched, all }. With no matching tag, every building
  // is returned so the screen is never blank.
  function selectBuildings(buildings, toks) {
    buildings = buildings || [];
    for (var i = 0; i < ALL_WORDS.length; i++) {
      if (has(toks, ALL_WORDS[i])) {
        return { buildings: buildings.slice(), matched: true, all: true };
      }
    }
    var chosen = [];
    for (var b = 0; b < buildings.length; b++) {
      if (has(toks, String(buildings[b].id).toLowerCase())) chosen.push(buildings[b]);
    }
    if (!chosen.length) {
      return { buildings: buildings.slice(), matched: false, all: true };
    }
    return { buildings: chosen, matched: true, all: chosen.length === buildings.length };
  }

  function isTouch(toks) {
    return has(toks, "touchscreen");
  }

  // Parses a whole number tag, clamped to [min, max], or the default.
  function number(value, def, min, max) {
    var n = parseInt(value, 10);
    if (isNaN(n)) return def;
    return Math.max(min, Math.min(max, n));
  }

  global.DirTags = {
    tokens: tokens,
    selectBuildings: selectBuildings,
    isTouch: isTouch,
    number: number
  };
})(window);
