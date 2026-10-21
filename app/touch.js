/* Touch mode: search with an on-screen keyboard, filters, company details and
   an idle reset. Enabled by the `touchscreen` tag. ES5 only. */
(function (global) {
  "use strict";

  var Dir = global.Dir;
  var el = Dir.el;
  var doc = global.document;

  var KEY_ROWS = ["1234567890", "QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  var MAX_QUERY = 30;

  // Finds the nearest ancestor (or self) carrying a given expando property.
  function closestWith(node, prop, stop) {
    while (node && node !== stop) {
      if (node[prop] !== undefined) return node;
      node = node.parentNode;
    }
    return null;
  }

  function button(className, text, label) {
    var b = el("div", "t-btn " + (className || ""), text);
    b.setAttribute("role", "button");
    if (label) b.setAttribute("aria-label", label);
    return b;
  }

  function uniqueSorted(items, field) {
    var seen = {};
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var v = items[i][field];
      if (v && !seen[v]) {
        seen[v] = true;
        out.push(v);
      }
    }
    return out.sort();
  }

  // opts: { app, body, items, buildings, multi, idleSeconds, portrait }
  function start(opts) {
    var items = opts.items;
    var state = { query: "", category: "", building: "", details: null };
    var lastInput = new Date().getTime();
    var filtered = [];

    // ---- Build the pieces once; layout() only re-parents them. ------------
    var layoutBox = el("div", "t-layout");
    var main = el("div", "t-main");
    var side = el("div", "t-side");

    var search = el("div", "t-search");
    search.appendChild(el("span", "t-search-label", "Search"));
    var queryText = search.appendChild(el("span", "t-query"));
    search.appendChild(el("span", "t-caret"));
    var placeholder = search.appendChild(el("span", "t-placeholder", "Type a company or category"));
    var clearBtn = search.appendChild(button("t-clear", "×", "Clear search"));

    var filters = el("div", "t-filters");
    var buildingChips = el("div", "t-chips t-chips-buildings");
    var categoryChips = el("div", "t-chips");
    if (opts.multi) filters.appendChild(buildingChips);
    filters.appendChild(categoryChips);
    Dir.dragScroll(buildingChips);
    Dir.dragScroll(categoryChips);

    var results = el("div", "t-results");
    var count = results.appendChild(el("div", "t-count label"));
    var listWrap = results.appendChild(el("div", "t-list-wrap"));
    var list = listWrap.appendChild(el("div", "t-list"));
    var arrows = listWrap.appendChild(el("div", "t-arrows"));
    var upBtn = arrows.appendChild(button("t-arrow", "▲", "Scroll up"));
    var downBtn = arrows.appendChild(button("t-arrow", "▼", "Scroll down"));
    Dir.dragScroll(list);

    var keys = el("div", "t-keys");
    for (var r = 0; r < KEY_ROWS.length; r++) {
      var rowEl = keys.appendChild(el("div", "t-key-row"));
      for (var k = 0; k < KEY_ROWS[r].length; k++) {
        var key = rowEl.appendChild(button("t-key", KEY_ROWS[r].charAt(k)));
        key.dirKey = KEY_ROWS[r].charAt(k);
      }
      if (r === KEY_ROWS.length - 1) {
        var back = rowEl.appendChild(button("t-key t-key-wide", "⌫", "Backspace"));
        back.dirKey = "BACK";
      }
    }
    var lastRow = keys.appendChild(el("div", "t-key-row"));
    var space = lastRow.appendChild(button("t-key t-key-space", "Space"));
    space.dirKey = " ";
    var clearKey = lastRow.appendChild(button("t-key t-key-wide", "Clear"));
    clearKey.dirKey = "CLEAR";

    var details = el("div", "t-details");

    function layout(portrait) {
      Dir.clear(opts.body);
      Dir.clear(layoutBox);
      Dir.clear(main);
      Dir.clear(side);
      Dir.toggleClass(layoutBox, "is-portrait-layout", portrait);
      main.appendChild(search);
      if (portrait) {
        main.appendChild(filters);
        main.appendChild(results);
      } else {
        main.appendChild(results);
        side.appendChild(filters);
      }
      side.appendChild(keys);
      layoutBox.appendChild(main);
      layoutBox.appendChild(side);
      opts.body.appendChild(layoutBox);
      opts.body.appendChild(details);
    }

    // ---- Filters ---------------------------------------------------------
    function chip(container, text, value, active, prop) {
      var c = container.appendChild(button("t-chip" + (active ? " is-active" : ""), text));
      c[prop] = value;
    }

    function renderChips() {
      Dir.clear(buildingChips);
      chip(buildingChips, "All buildings", "", !state.building, "dirBuilding");
      for (var i = 0; i < opts.buildings.length; i++) {
        var b = opts.buildings[i];
        chip(buildingChips, b.name, b.id, state.building === b.id, "dirBuilding");
      }

      var pool = [];
      for (var j = 0; j < items.length; j++) {
        if (!state.building || items[j].buildingId === state.building) pool.push(items[j]);
      }
      var cats = uniqueSorted(pool, "category");
      if (state.category && cats.indexOf(state.category) < 0) state.category = "";
      Dir.clear(categoryChips);
      chip(categoryChips, "All categories", "", !state.category, "dirCategory");
      for (var c = 0; c < cats.length; c++) {
        chip(categoryChips, cats[c], cats[c], state.category === cats[c], "dirCategory");
      }
    }

    // ---- Results ---------------------------------------------------------
    function matches(item, q) {
      if (state.building && item.buildingId !== state.building) return false;
      if (state.category && item.category !== state.category) return false;
      return !q || item.key.replace(" ", "").indexOf(q) >= 0 || item.key.indexOf(q) >= 0;
    }

    function renderList() {
      var q = Dir.normalize(state.query);
      filtered = [];
      for (var i = 0; i < items.length; i++) {
        if (matches(items[i], q)) filtered.push(items[i]);
      }

      queryText.textContent = state.query;
      Dir.toggleClass(search, "has-query", !!state.query);
      placeholder.style.display = state.query ? "none" : "";
      count.textContent = filtered.length === 1 ? "1 company" : filtered.length + " companies";

      Dir.clear(list);
      list.scrollTop = 0;
      if (!filtered.length) {
        var empty = list.appendChild(el("div", "t-empty"));
        empty.appendChild(el("p", "", state.query
          ? "No companies match “" + state.query + "”"
          : "No companies match these filters"));
        var reset = empty.appendChild(button("t-empty-btn", "Clear search"));
        reset.dirAction = "reset";
      } else {
        var frag = doc.createDocumentFragment();
        for (var j = 0; j < filtered.length; j++) {
          var it = filtered[j];
          var row = el("div", "t-row");
          row.setAttribute("role", "button");
          row.dirIndex = j;
          var left = row.appendChild(el("div", "t-row-main"));
          left.appendChild(el("div", "t-row-name", it.name));
          left.appendChild(el("div", "t-row-meta", opts.multi
            ? it.category + "  ·  " + it.buildingName : it.category));
          var where = row.appendChild(el("div", "t-row-where"));
          where.appendChild(el("div", "t-row-floor", "Floor " + it.floor));
          where.appendChild(el("div", "t-row-suite", "Suite " + it.suite));
          row.appendChild(el("div", "t-row-go", "›"));
          frag.appendChild(row);
        }
        list.appendChild(frag);
      }
      updateArrows();
    }

    function updateArrows() {
      var canScroll = list.scrollHeight > list.clientHeight + 2;
      Dir.toggleClass(upBtn, "is-disabled", !canScroll || list.scrollTop <= 0);
      Dir.toggleClass(downBtn, "is-disabled",
        !canScroll || list.scrollTop + list.clientHeight >= list.scrollHeight - 2);
    }

    // ---- Details ---------------------------------------------------------
    function infoBox(parent, label, value) {
      if (!value) return;
      var box = parent.appendChild(el("div", "t-info"));
      box.appendChild(el("div", "label", label));
      box.appendChild(el("div", "t-info-value", value));
    }

    function contactLine(parent, label, value) {
      if (!value) return;
      var line = parent.appendChild(el("div", "t-contact"));
      line.appendChild(el("div", "t-contact-label label", label));
      line.appendChild(el("div", "t-contact-value", value));
    }

    function openDetails(item) {
      state.details = item;
      Dir.clear(details);
      var top = details.appendChild(el("div", "t-details-top"));
      var backBtn = top.appendChild(button("t-back", "‹  Back"));
      backBtn.dirAction = "back";

      var bodyEl = details.appendChild(el("div", "t-details-body"));
      var leftCol = bodyEl.appendChild(el("div", "t-details-left"));
      var rightCol = bodyEl.appendChild(el("div", "t-details-right"));

      var head = leftCol.appendChild(el("div", "t-details-head"));
      var badge = head.appendChild(el("div", "t-badge"));
      badge.appendChild(el("span", "", Dir.initials(item.name)));
      if (item.logo) {
        var img = el("img");
        img.alt = item.name + " logo";
        img.onerror = function () { if (img.parentNode) img.parentNode.removeChild(img); };
        img.src = "images/logos/" + item.logo;
        badge.appendChild(img);
        Dir.toggleClass(badge, "has-logo", true);
      }
      var titles = head.appendChild(el("div", "t-details-titles"));
      titles.appendChild(el("h2", "t-details-name", item.name));
      if (item.category) titles.appendChild(el("p", "t-details-cat", item.category));

      var info = leftCol.appendChild(el("div", "t-info-row"));
      infoBox(info, "Building", item.buildingName);
      infoBox(info, "Floor", item.floor);
      infoBox(info, "Suite", item.suite);

      if (item.floor) {
        rightCol.appendChild(el("p", "t-wayfind",
          "Take the elevator to Floor " + item.floor +
          (item.suite ? ", then follow signs to Suite " + item.suite : "") + "."));
      }

      var contacts = rightCol.appendChild(el("div", "t-contacts"));
      contactLine(contacts, "Phone", item.phone);
      contactLine(contacts, "Website", item.website);
      contactLine(contacts, "Email", item.email);
      contactLine(contacts, "Hours", item.hours);
      if (item.description) rightCol.appendChild(el("p", "t-desc", item.description));

      Dir.toggleClass(opts.app, "show-details", true);
    }

    function closeDetails() {
      state.details = null;
      Dir.toggleClass(opts.app, "show-details", false);
      Dir.clear(details);
      updateArrows();
    }

    // ---- Input -----------------------------------------------------------
    function type(key) {
      if (key === "BACK") state.query = state.query.slice(0, -1);
      else if (key === "CLEAR") state.query = "";
      else if (state.query.length < MAX_QUERY) {
        if (key === " " && (!state.query || state.query.slice(-1) === " ")) return;
        state.query += key;
      }
      renderList();
    }

    function reset() {
      state.query = "";
      state.category = "";
      state.building = "";
      if (state.details) closeDetails();
      renderChips();
      renderList();
      buildingChips.scrollLeft = 0;
      categoryChips.scrollLeft = 0;
      categoryChips.scrollTop = 0;
    }

    function onClick(e) {
      var t = e.target;
      var action = closestWith(t, "dirAction", opts.app);
      if (action) {
        if (action.dirAction === "back") closeDetails();
        else if (action.dirAction === "reset") reset();
        return;
      }
      var key = closestWith(t, "dirKey", keys);
      if (key) return type(key.dirKey);

      var b = closestWith(t, "dirBuilding", buildingChips);
      if (b && !buildingChips.dirDragged) {
        state.building = b.dirBuilding;
        renderChips();
        return renderList();
      }
      var c = closestWith(t, "dirCategory", categoryChips);
      if (c && !categoryChips.dirDragged) {
        state.category = c.dirCategory;
        renderChips();
        return renderList();
      }
      var row = closestWith(t, "dirIndex", list);
      if (row && !list.dirDragged) return openDetails(filtered[row.dirIndex]);
    }

    function scrollBy(dir) {
      list.scrollTop += dir * Math.max(1, list.clientHeight * 0.8);
      updateArrows();
    }

    opts.app.addEventListener("click", onClick);
    clearBtn.addEventListener("click", function () { type("CLEAR"); });
    upBtn.addEventListener("click", function () { scrollBy(-1); });
    downBtn.addEventListener("click", function () { scrollBy(1); });
    list.addEventListener("scroll", updateArrows);

    function touched() {
      lastInput = new Date().getTime();
    }
    doc.addEventListener("touchstart", touched);
    doc.addEventListener("mousedown", touched);
    doc.addEventListener("keydown", function (e) {
      touched();
      var k = e.key || "";
      if (k === "Escape") {
        if (state.details) closeDetails();
        else type("CLEAR");
      } else if (k === "Backspace") {
        e.preventDefault();
        if (!state.details) type("BACK");
      } else if (!state.details && k.length === 1 && /[A-Za-z0-9 ]/.test(k)) {
        type(k.toUpperCase());
      }
    });

    function isDirty() {
      return state.query || state.category || state.building || state.details ||
        list.scrollTop > 0;
    }

    layout(opts.portrait);
    renderChips();
    renderList();

    return {
      // Called once a second by app.js.
      tick: function () {
        if (new Date().getTime() - lastInput > opts.idleSeconds * 1000 && isDirty()) reset();
      },
      relayout: function (portrait) {
        layout(portrait);
        updateArrows();
      }
    };
  }

  global.DirTouch = { start: start };
})(window);
