/* Display mode: the full listing, auto-paged. No interaction. ES5 only. */
(function (global) {
  "use strict";

  var Dir = global.Dir;
  var el = Dir.el;

  function makeRow() {
    var row = el("div", "dir-row");
    var main = el("div", "dir-row-main");
    row.dirName = main.appendChild(el("div", "dir-name"));
    row.dirMeta = main.appendChild(el("div", "dir-meta"));
    row.appendChild(main);
    row.dirFloor = row.appendChild(el("div", "dir-cell dir-floor"));
    row.dirSuite = row.appendChild(el("div", "dir-cell dir-suite"));
    return row;
  }

  function fillRow(row, item, multi) {
    if (!item) {
      row.style.visibility = "hidden";
      return;
    }
    row.style.visibility = "";
    row.dirName.textContent = item.name;
    row.dirMeta.textContent = multi && item.category
      ? item.category + "  ·  " + item.buildingName
      : (item.category || item.buildingName);
    row.dirFloor.textContent = item.floor;
    row.dirSuite.textContent = item.suite;
  }

  // Pointing-hand icon ("touch_app" from Google Material Icons, Apache 2.0),
  // drawn inline so it takes the text colour.
  var HAND_PATH = "M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 " +
    "2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26" +
    "c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72" +
    "c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44" +
    "h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z";

  function makeTapPrompt() {
    var ns = "http://www.w3.org/2000/svg";
    var box = el("div", "dir-tap");
    // The hand sits in a white disc with two rings rippling out behind it.
    var icon = box.appendChild(el("div", "dir-tap-icon"));
    icon.appendChild(el("span", "dir-tap-ring"));
    icon.appendChild(el("span", "dir-tap-ring dir-tap-ring-late"));
    var disc = icon.appendChild(el("span", "dir-tap-disc"));
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "dir-tap-hand");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS(ns, "path");
    path.setAttribute("d", HAND_PATH);
    path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
    disc.appendChild(svg);
    var text = box.appendChild(el("div", "dir-tap-text"));
    text.appendChild(el("div", "dir-tap-title", "Tap to start"));
    text.appendChild(el("div", "dir-tap-sub", "Search companies & directions"));
    return box;
  }

  function makeColumn() {
    var col = el("div", "dir-col");
    var head = el("div", "dir-colhead label");
    head.appendChild(el("div", "dir-row-main", "Company"));
    head.appendChild(el("div", "dir-cell", "Floor"));
    head.appendChild(el("div", "dir-cell", "Suite"));
    col.appendChild(head);
    col.dirList = col.appendChild(el("div", "dir-list"));
    return col;
  }

  // opts: { body, items, multi, pageSeconds, portrait, tapPrompt }
  function start(opts) {
    var body = opts.body;
    var items = opts.items;
    var rows = [];
    var cols, perPage = 1, pages = 1, page = 0, ticks = 0, fadeTimer = null;
    var footer, pageLabel;

    function showPage(n) {
      page = n;
      var first = page * perPage;
      for (var i = 0; i < rows.length; i++) fillRow(rows[i], items[first + i], opts.multi);
      pageLabel.textContent = pages > 1 ? "Page " + (page + 1) + " of " + pages : "";
    }

    function layout(portrait) {
      Dir.clear(body);
      if (fadeTimer) clearTimeout(fadeTimer);
      cols = el("div", "dir-cols");
      footer = el("div", "dir-footer");
      pageLabel = footer.appendChild(el("div", "dir-page"));
      body.appendChild(cols);
      body.appendChild(footer);
      // Floats over the top-left of the list (see .dir-tap in style.css).
      if (opts.tapPrompt) body.appendChild(makeTapPrompt());
      Dir.toggleClass(body, "has-tap", !!opts.tapPrompt);

      if (!items.length) {
        cols.appendChild(el("div", "dir-empty", "No listings yet"));
        rows = [];
        pages = 1;
        pageLabel.textContent = "";
        return;
      }

      // Measure how many rows fit in one column.
      var first = cols.appendChild(makeColumn());
      var sample = first.dirList.appendChild(makeRow());
      fillRow(sample, items[0], opts.multi);
      var rowH = sample.offsetHeight || 1;
      var perCol = Math.max(1, Math.floor(first.dirList.clientHeight / rowH));
      first.dirList.removeChild(sample);

      var columns = [first];
      if (!portrait && items.length > perCol) {
        Dir.toggleClass(cols, "is-two", true);
        columns.push(cols.appendChild(makeColumn()));
      }

      rows = [];
      for (var c = 0; c < columns.length; c++) {
        for (var r = 0; r < perCol; r++) rows.push(columns[c].dirList.appendChild(makeRow()));
      }
      perPage = rows.length;
      pages = Math.ceil(items.length / perPage);
      ticks = 0;
      showPage(page < pages ? page : 0);
    }

    function next() {
      Dir.toggleClass(cols, "is-fading", true);
      fadeTimer = setTimeout(function () {
        showPage((page + 1) % pages);
        Dir.toggleClass(cols, "is-fading", false);
      }, 600);
    }

    layout(opts.portrait);

    return {
      // Called once a second by app.js.
      tick: function () {
        if (pages < 2) return;
        ticks++;
        if (ticks >= opts.pageSeconds) {
          ticks = 0;
          next();
        }
      },
      relayout: layout,
      // Stops paging before another mode takes over the body.
      stop: function () {
        if (fadeTimer) clearTimeout(fadeTimer);
        pages = 1;
      }
    };
  }

  global.DirDisplay = { start: start };
})(window);
