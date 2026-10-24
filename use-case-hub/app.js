(function () {
  "use strict";

  var UC = window.UC;
  if (!UC || !UC.data) return;

  var PALETTE = ["#73ff9d", "#b6a6ff", "#ffb280", "#76a2ff", "#a294e4"];
  var NIVA = ["Lav", "Middels", "Høy"];
  var STATUSES = ["Ide", "Utforskes", "Pilot", "I drift"];
  var NIVA_ORDER = { Lav: 0, Middels: 1, "Høy": 2 };
  var STATUS_ORDER = { "I drift": 0, Pilot: 1, Utforskes: 2, Ide: 3 };
  var STORE = "uc-hub-status";

  var state = {
    fn: "Alle",
    inn: "Alle",
    ris: "Alle",
    st: "Alle",
    sort: "hurtig",
    q: "",
    open: "",
    overrides: loadOverrides()
  };

  var kilder = {};
  UC.kilder.forEach(function (k) { kilder[k.id] = k; });

  function loadOverrides() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      var out = {};
      Object.keys(parsed || {}).forEach(function (id) {
        if (STATUSES.indexOf(parsed[id]) !== -1) out[id] = parsed[id];
      });
      return out;
    } catch (err) {
      return {};
    }
  }

  function saveOverrides() {
    try {
      var keys = Object.keys(state.overrides);
      if (!keys.length) localStorage.removeItem(STORE);
      else localStorage.setItem(STORE, JSON.stringify(state.overrides));
    } catch (err) {
      /* Nettleseren kan nekte lagring. Valget gjelder da bare denne visningen. */
    }
  }

  function statusOf(u) {
    return state.overrides[u.id] || "Ide";
  }

  function colorFor(name) {
    var found = UC.funksjoner.filter(function (f) { return f.navn === name; })[0];
    return PALETTE[found ? found.i : 0];
  }

  function nivaColor(n) {
    if (n === "Lav") return "#73ff9d";
    if (n === "Middels") return "#ffb280";
    return "#ff9a9a";
  }

  function statusColor(s) {
    if (s === "I drift") return "#73ff9d";
    if (s === "Pilot") return "#76a2ff";
    if (s === "Utforskes") return "#b6a6ff";
    return "#c4c4c4";
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === "class") node.className = attrs[key];
        else if (key === "text") node.textContent = attrs[key];
        else if (key === "hidden") node.hidden = !!attrs[key];
        else node.setAttribute(key, attrs[key]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child == null || child === false) continue;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return node;
  }

  function externalLink(href, text) {
    var a = el("a", { href: href, target: "_blank", rel: "noopener noreferrer" });
    a.appendChild(document.createTextNode(text));
    a.appendChild(el("span", { class: "sr-only", text: " (åpnes i ny fane)" }));
    return a;
  }

  function chip(label, group, value, color, count) {
    var pressed = state[group] === value;
    var btn = el("button", {
      type: "button",
      class: "chip" + (pressed ? " is-on" : ""),
      "data-group": group,
      "data-filter": value,
      "aria-pressed": pressed ? "true" : "false"
    });
    btn.style.setProperty("--c", color);
    btn.appendChild(el("span", { class: "dot", "aria-hidden": "true" }));
    btn.appendChild(document.createTextNode(label));
    if (count !== undefined) btn.appendChild(el("span", { class: "chip-count", text: String(count) }));
    btn.addEventListener("click", function () {
      state[group] = value;
      syncChips();
      renderList();
    });
    return btn;
  }

  function syncChips() {
    document.querySelectorAll(".chip[data-group]").forEach(function (btn) {
      var on = state[btn.getAttribute("data-group")] === btn.getAttribute("data-filter");
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function buildFilters() {
    var fnRow = document.getElementById("fn-row");
    fnRow.appendChild(chip("Alle funksjoner", "fn", "Alle", "#ffffff", UC.data.length));
    UC.funksjoner.forEach(function (f) {
      var n = UC.data.filter(function (u) { return u.f === f.navn; }).length;
      fnRow.appendChild(chip(f.navn, "fn", f.navn, PALETTE[f.i], n));
    });

    var innRow = document.getElementById("inn-row");
    innRow.appendChild(chip("Alle", "inn", "Alle", "#ffffff"));
    NIVA.forEach(function (n) { innRow.appendChild(chip(n, "inn", n, nivaColor(n))); });

    var risRow = document.getElementById("ris-row");
    risRow.appendChild(chip("Alle", "ris", "Alle", "#ffffff"));
    NIVA.forEach(function (n) { risRow.appendChild(chip(n, "ris", n, nivaColor(n))); });

    var stRow = document.getElementById("st-row");
    stRow.appendChild(chip("Alle", "st", "Alle", "#ffffff"));
    STATUSES.forEach(function (s) { stRow.appendChild(chip(s, "st", s, statusColor(s))); });
  }

  function matches(u) {
    var q = state.q.trim().toLowerCase();
    if (state.fn !== "Alle" && u.f !== state.fn) return false;
    if (state.inn !== "Alle" && u.innsats !== state.inn) return false;
    if (state.ris !== "Alle" && u.risiko !== state.ris) return false;
    if (state.st !== "Alle" && statusOf(u) !== state.st) return false;
    if (!q) return true;
    return (u.navn + " " + u.hva + " " + u.f).toLowerCase().indexOf(q) !== -1;
  }

  function compare(a, b) {
    if (state.sort === "navn") return a.navn.localeCompare(b.navn, "nb");
    if (state.sort === "innsats") return NIVA_ORDER[a.innsats] - NIVA_ORDER[b.innsats];
    if (state.sort === "risiko") return NIVA_ORDER[a.risiko] - NIVA_ORDER[b.risiko];
    if (state.sort === "status") return STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)];
    if (state.sort === "funksjon") return a.f.localeCompare(b.f, "nb");
    return (NIVA_ORDER[a.innsats] + NIVA_ORDER[a.risiko]) - (NIVA_ORDER[b.innsats] + NIVA_ORDER[b.risiko]);
  }

  function renderList(focusId) {
    var list = UC.data.filter(matches).sort(compare);
    var grid = document.getElementById("grid");
    var empty = document.getElementById("empty");
    grid.replaceChildren();
    list.forEach(function (u) { grid.appendChild(card(u)); });
    empty.hidden = list.length !== 0;
    var treff = document.getElementById("treff");
    treff.textContent = list.length + " treff" + (list.length ? " · klikk et kort for detaljer" : "");
    updateSaveNote();
    if (focusId) {
      var sel = document.querySelector('[data-status-for="' + cssEscape(focusId) + '"]');
      if (sel) sel.focus();
      else {
        treff.tabIndex = -1;
        treff.focus();
      }
    }
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function card(u) {
    var c = colorFor(u.f);
    var open = state.open === u.id;
    var st = statusOf(u);
    var k = u.kilde ? kilder[u.kilde] : null;
    var article = el("article", { class: "card" + (open ? " is-open" : ""), "data-id": u.id });
    article.style.setProperty("--c", c);

    var select = el("select", { "data-status-for": u.id, "aria-label": "Status for " + u.navn });
    STATUSES.forEach(function (name) {
      var opt = el("option", { value: name, text: name });
      if (name === st) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", function (event) {
      event.stopPropagation();
      if (select.value === "Ide") delete state.overrides[u.id];
      else state.overrides[u.id] = select.value;
      saveOverrides();
      renderList(u.id);
    });

    var statusField = el("label", { class: "status-field" });
    statusField.style.setProperty("--s", statusColor(st));
    statusField.appendChild(el("span", { text: "Status" }));
    statusField.appendChild(select);

    var kicker = el("span", { class: "card-kicker" });
    var dot = el("span", { class: "dot", "aria-hidden": "true" });
    dot.style.setProperty("--c", c);
    kicker.appendChild(dot);
    kicker.appendChild(document.createTextNode(u.f));

    var top = el("div", { class: "card-top" });
    top.appendChild(kicker);
    top.appendChild(statusField);

    var toggle = el("button", {
      type: "button",
      class: "card-toggle",
      "aria-expanded": open ? "true" : "false",
      "aria-controls": "det-" + u.id,
      id: "tog-" + u.id
    }, u.navn);
    toggle.addEventListener("click", function () {
      state.open = state.open === u.id ? "" : u.id;
      paintOpen();
    });
    var title = el("h3", { class: "card-title" }, toggle);

    var pills = el("div", { class: "pills" });
    pills.appendChild(levelPill("Innsats " + u.innsats.toLowerCase(), nivaColor(u.innsats)));
    pills.appendChild(levelPill("Risiko " + u.risiko.toLowerCase(), nivaColor(u.risiko)));
    if (k) pills.appendChild(el("span", { class: "pill pill-src", text: "Kildebelagt" }));

    var head = el("div", { class: "card-head" });
    head.appendChild(top);
    head.appendChild(title);
    head.appendChild(el("p", { class: "card-what", text: u.hva }));
    head.appendChild(pills);

    var detail = el("div", {
      class: "card-detail",
      id: "det-" + u.id,
      role: "region",
      "aria-labelledby": "tog-" + u.id,
      hidden: open ? null : "hidden"
    });
    if (open) detail.hidden = false;

    var col1 = el("div");
    col1.appendChild(el("p", { class: "detail-label", text: "Eksempel på prompt" }));
    col1.appendChild(el("div", { class: "prompt", text: u.eks }));
    var toolBlock = el("div", { class: "tool-block" });
    toolBlock.appendChild(el("p", { class: "detail-label", text: "Verktøy" }));
    toolBlock.appendChild(el("div", { class: "detail-copy tool-name", text: u.verktoy }));
    col1.appendChild(toolBlock);

    var col2 = el("div");
    col2.appendChild(el("p", { class: "detail-label", text: "Verdi" }));
    col2.appendChild(el("div", { class: "detail-copy", text: u.verdi }));
    if (k) {
      var line = el("div", { class: "source-line" }, "Kilde: ");
      line.appendChild(externalLink(k.u, k.t));
      col2.appendChild(line);
    }

    var col3 = el("div");
    col3.appendChild(el("p", { class: "detail-label", text: "Risiko og rekkverk" }));
    col3.appendChild(el("div", { class: "detail-copy", text: u.rekkverk }));

    detail.appendChild(col1);
    detail.appendChild(col2);
    detail.appendChild(col3);
    article.addEventListener("click", function (event) {
      if (event.target.closest("a, select, button, label")) return;
      state.open = state.open === u.id ? "" : u.id;
      paintOpen();
    });
    article.appendChild(head);
    article.appendChild(detail);
    return article;
  }

  function levelPill(text, color) {
    var pill = el("span", { class: "pill" });
    var dot = el("span", { class: "dot", "aria-hidden": "true" });
    dot.style.setProperty("--c", color);
    pill.appendChild(dot);
    pill.appendChild(document.createTextNode(text));
    return pill;
  }

  function paintOpen() {
    document.querySelectorAll(".card").forEach(function (article) {
      var id = article.getAttribute("data-id");
      var open = state.open === id;
      article.classList.toggle("is-open", open);
      var btn = article.querySelector(".card-toggle");
      var det = article.querySelector(".card-detail");
      if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (det) det.hidden = !open;
    });
  }

  function updateSaveNote() {
    var n = Object.keys(state.overrides).length;
    var note = document.getElementById("save-note");
    var next = "Status på kortene lagres i denne nettleseren.";
    if (n === 1) next = "1 status er endret og lagres i denne nettleseren.";
    else if (n > 1) next = n + " statuser er endret og lagres i denne nettleseren.";
    if (note.textContent !== next) note.textContent = next;
  }

  function renderStatic() {
    var quick = UC.data.filter(function (u) { return u.innsats === "Lav" && u.risiko === "Lav"; });
    document.getElementById("stat-cases").textContent = String(UC.data.length);
    document.getElementById("stat-fn").textContent = String(UC.funksjoner.length);
    document.getElementById("stat-n-cases").textContent = String(UC.data.length);
    document.getElementById("stat-n-fn").textContent = String(UC.funksjoner.length);
    document.getElementById("stat-n-quick").textContent = String(quick.length);
    document.getElementById("stat-n-src").textContent = String(UC.data.filter(function (u) { return u.kilde; }).length);

    var quickHost = document.getElementById("quick");
    UC.funksjoner.forEach(function (f) {
      var items = quick.filter(function (u) { return u.f === f.navn; });
      if (!items.length) return;
      var box = el("div", { class: "quick" });
      box.style.setProperty("--c", PALETTE[f.i]);
      box.appendChild(el("h3", { text: f.navn }));
      var ul = el("ul");
      items.forEach(function (u) { ul.appendChild(el("li", { text: u.navn })); });
      box.appendChild(ul);
      quickHost.appendChild(box);
    });

    var steps = document.getElementById("steps");
    UC.steg.forEach(function (s) {
      var li = el("li", { class: "step" });
      li.style.setProperty("--c", PALETTE[s.c]);
      li.appendChild(el("div", { class: "step-num", text: s.n }));
      var body = el("div", { class: "step-body" });
      body.appendChild(el("h3", { text: s.t }));
      body.appendChild(el("p", { text: s.d }));
      li.appendChild(body);
      steps.appendChild(li);
    });

    var rules = document.getElementById("rules");
    UC.regler.forEach(function (g) {
      var card = el("article", { class: "rule" });
      card.style.setProperty("--c", PALETTE[g.c]);
      card.appendChild(el("h3", { text: g.t }));
      card.appendChild(el("p", { text: g.d }));
      var src = kilder[g.k];
      if (src) card.appendChild(externalLink(src.u, "Les kilden"));
      rules.appendChild(card);
    });

    var sources = document.getElementById("sources");
    UC.kilder.forEach(function (k) {
      sources.appendChild(el("li", {}, externalLink(k.u, k.t)));
    });
  }

  document.getElementById("sok").addEventListener("input", function (event) {
    state.q = event.target.value;
    renderList();
  });
  document.getElementById("sorter").addEventListener("change", function (event) {
    state.sort = event.target.value;
    renderList();
  });
  document.getElementById("reset-filter").addEventListener("click", function () {
    state.fn = "Alle";
    state.inn = "Alle";
    state.ris = "Alle";
    state.st = "Alle";
    state.sort = "hurtig";
    state.q = "";
    document.getElementById("sok").value = "";
    document.getElementById("sorter").value = "hurtig";
    syncChips();
    renderList();
  });
  document.getElementById("reset-status").addEventListener("click", function () {
    state.overrides = {};
    saveOverrides();
    renderList();
    document.getElementById("save-note").textContent = "Status er tilbakestilt til Ide.";
  });

  buildFilters();
  renderStatic();
  renderList();
})();
