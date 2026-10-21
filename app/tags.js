/* Player tag parsing: which buildings to show, touch mode, numeric settings.
   Pure functions, ES5 only. */
(function (global) {
  "use strict";

  var ALL_WORDS = ["all", "all-buildings", "all_buildings", "allbuildings"];

  function addToken(list, s) {
    var t = String(s).replace(/^\s+|\s+$/g, "").toLowerCase();
    if (t && list.indexOf(t) < 0) list.push(t);
  }

  // Adds tokens from a tag value of any shape: "a,b", "key:value", a JSON
  // string, an array of strings, or objects like { key: "a", value: "b" }.
  function collect(list, value, depth) {
    if (value === undefined || value === null || depth > 4) return;
    if (typeof value === "object") {
      for (var key in value) {
        if (!value.hasOwnProperty(key)) continue;
        // Array indexes and the "all" key (which holds the whole tag list)
        // are not tags themselves.
        if (!(value instanceof Array) && key !== "all") addToken(list, key);
        collect(list, value[key], depth + 1);
      }
      return;
    }
    var s = String(value);
    if (/^\s*[\[{]/.test(s)) {
      try {
        collect(list, JSON.parse(s), depth + 1);
        return;
      } catch (e) {}
    }
    var parts = s.split(/[,;|]/);
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split(":");
      for (var j = 0; j < kv.length; j++) addToken(list, kv[j]);
    }
  }

  // Every tag key and value as lowercase tokens, from any number of sources
  // (the player object's tags, the URL query's tags, ...).
  function tokens() {
    var list = [];
    for (var i = 0; i < arguments.length; i++) collect(list, arguments[i], 0);
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
    return has(toks, "touchscreen") || has(toks, "touch");
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
