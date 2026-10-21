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

  // opts: { body, items, multi, pageSeconds, portrait }
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
      relayout: layout
    };
  }

  global.DirDisplay = { start: start };
})(window);
