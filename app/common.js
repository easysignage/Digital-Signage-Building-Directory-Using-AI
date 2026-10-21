/* Shared helpers for the building directory. ES5 only. */
(function (global) {
  "use strict";

  var doc = global.document;

  // Creates an element with an optional class and text (always textContent).
  function el(tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function hasClass(node, name) {
    return (" " + node.className + " ").indexOf(" " + name + " ") >= 0;
  }

  function toggleClass(node, name, on) {
    var has = hasClass(node, name);
    if (on && !has) {
      node.className = (node.className ? node.className + " " : "") + name;
    } else if (!on && has) {
      node.className = (" " + node.className + " ")
        .replace(" " + name + " ", " ")
        .replace(/^\s+|\s+$/g, "");
    }
  }

  // Lowercase letters and digits only, so "Bean & Leaf" matches "beanleaf".
  function normalize(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function initials(name) {
    var words = String(name || "").replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/);
    var out = "";
    for (var i = 0; i < words.length && out.length < 2; i++) {
      if (words[i]) out += words[i].charAt(0).toUpperCase();
    }
    return out || "?";
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  // HH:MM, formatted by hand because Intl is unreliable on older players.
  function formatTime(d) {
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  // Flattens the chosen buildings into one A-Z list of companies.
  function flatten(buildings) {
    var items = [];
    for (var b = 0; b < buildings.length; b++) {
      var companies = buildings[b].companies || [];
      for (var c = 0; c < companies.length; c++) {
        var src = companies[c];
        items.push({
          name: src.name || "",
          floor: src.floor || "",
          suite: src.suite || "",
          category: src.category || "",
          phone: src.phone || "",
          website: src.website || "",
          email: src.email || "",
          hours: src.hours || "",
          description: src.description || "",
          logo: src.logo || "",
          buildingId: buildings[b].id,
          buildingName: buildings[b].name,
          key: normalize(src.name) + " " + normalize(src.category)
        });
      }
    }
    items.sort(function (a, b) {
      var x = a.name.toLowerCase();
      var y = b.name.toLowerCase();
      if (x < y) return -1;
      if (x > y) return 1;
      return a.buildingName < b.buildingName ? -1 : 1;
    });
    return items;
  }

  // Lets a mouse drag scroll an element (for previewing on a desktop).
  // Touch screens scroll natively. Sets node.dirDragged while a drag moved,
  // so click handlers can ignore the click that ends a drag.
  function dragScroll(node) {
    var startX, startY, left, top, down = false;
    node.addEventListener("mousedown", function (e) {
      down = true;
      node.dirDragged = false;
      startX = e.clientX;
      startY = e.clientY;
      left = node.scrollLeft;
      top = node.scrollTop;
    });
    doc.addEventListener("mousemove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) node.dirDragged = true;
      node.scrollLeft = left - dx;
      node.scrollTop = top - dy;
    });
    doc.addEventListener("mouseup", function () {
      down = false;
    });
  }

  global.Dir = {
    el: el,
    clear: clear,
    hasClass: hasClass,
    toggleClass: toggleClass,
    normalize: normalize,
    initials: initials,
    formatTime: formatTime,
    flatten: flatten,
    dragScroll: dragScroll
  };
})(window);
