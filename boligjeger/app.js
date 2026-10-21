const nok = new Intl.NumberFormat("nb-NO");
const state = {
  all: [],
  updated: null,
  view: "liste",
  sort: "nyeste",
  maxPrice: "",
  minBeds: "",
  minBra: "",
  maxFee: "",
  areas: new Set(),
  hideSold: true,
  selectedId: null,
  ready: false,
};

let map = null;
let cluster = null;
let markers = new Map();

const $ = (id) => document.getElementById(id);

function positive(value) {
  return typeof value === "number" && value > 0 ? value : null;
}

function kr(value) {
  const amount = positive(value);
  if (amount == null) return null;
  return nok.format(amount) + "\u00a0kr";
}

function krSpan(from, to) {
  const start = positive(from);
  const end = positive(to);
  if (start == null) return "Pris ikke oppgitt";
  if (end == null || end === start) return kr(start);
  return nok.format(start) + "–" + nok.format(end) + "\u00a0kr";
}

function priceOf(item) {
  return positive(item.totalpris) ?? positive(item.prisantydning);
}

function sizeOf(item) {
  return positive(item.bra_til) ?? positive(item.bra);
}

function bedsOf(item) {
  return positive(item.soverom_til) ?? positive(item.soverom);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function wideScreen() {
  return window.matchMedia("(min-width: 980px)").matches;
}

function defaultView() {
  return wideScreen() ? "delt" : "liste";
}

function readParams() {
  const params = new URLSearchParams(location.search);
  const sort = params.get("sort");
  state.sort = ["nyeste", "pris-asc", "pris-desc", "kvm", "storrelse"].includes(sort) ? sort : "nyeste";
  state.maxPrice = params.get("pris") || "";
  state.minBeds = params.get("sov") || "";
  state.minBra = params.get("bra") || "";
  state.maxFee = params.get("felles") || "";
  state.hideSold = params.get("solgt") !== "vis";
  state.areas = new Set((params.get("omrade") || "").split(",").map((part) => part.trim()).filter(Boolean));
  const view = params.get("vis");
  state.view = ["liste", "kart", "delt"].includes(view) ? view : defaultView();
  state.selectedId = params.get("bolig");
}

function writeParams() {
  if (!state.ready) return;
  const params = new URLSearchParams();
  if (state.sort !== "nyeste") params.set("sort", state.sort);
  if (state.maxPrice) params.set("pris", state.maxPrice);
  if (state.minBeds) params.set("sov", state.minBeds);
  if (state.minBra) params.set("bra", state.minBra);
  if (state.maxFee) params.set("felles", state.maxFee);
  if (state.areas.size) params.set("omrade", [...state.areas].join(","));
  if (!state.hideSold) params.set("solgt", "vis");
  if (state.view !== defaultView()) params.set("vis", state.view);
  if (state.selectedId) params.set("bolig", state.selectedId);
  const query = params.toString();
  const next = query ? `${location.pathname}?${query}` : location.pathname;
  const current = location.pathname + location.search;
  if (next !== current) history.replaceState(null, "", next);
}

function syncControls() {
  $("sort").value = state.sort;
  $("maxPrice").value = state.maxPrice;
  $("minBeds").value = state.minBeds;
  $("minBra").value = state.minBra;
  $("maxFee").value = state.maxFee;
  $("hideSold").checked = state.hideSold;
  for (const select of [$("maxPrice"), $("minBeds"), $("minBra"), $("maxFee")]) {
    select.classList.toggle("is-on", Boolean(select.value));
  }
  $("hideSold").parentElement.classList.toggle("is-on", state.hideSold);
  const active = Boolean(state.maxPrice || state.minBeds || state.minBra || state.maxFee || state.areas.size || !state.hideSold);
  $("reset").hidden = !active;
  const areaBtn = $("areaBtn");
  areaBtn.classList.toggle("is-on", state.areas.size > 0);
  areaBtn.textContent = state.areas.size ? `Område (${state.areas.size})` : "Område";
}

function applyView(view, { refit = false } = {}) {
  state.view = view;
  document.body.dataset.view = view;
  for (const button of document.querySelectorAll("[data-view-btn]")) {
    const wanted = button.dataset.viewBtn;
    let pressed = wanted === view;
    if (!wideScreen() && view === "delt" && wanted === "liste") pressed = true;
    button.setAttribute("aria-pressed", pressed ? "true" : "false");
  }
  if (view === "kart" || (view === "delt" && wideScreen())) {
    ensureMap();
    requestAnimationFrame(() => {
      if (map) map.invalidateSize();
      if (refit) fitMap(filtered());
    });
  }
}

function filtered() {
  const maxPrice = Number(state.maxPrice) || 0;
  const minBeds = Number(state.minBeds) || 0;
  const minBra = Number(state.minBra) || 0;
  const maxFee = state.maxFee === "" ? null : Number(state.maxFee);
  return state.all.filter((item) => {
    if (state.hideSold && item.status === "solgt") return false;
    const price = priceOf(item);
    if (maxPrice && (price == null || price > maxPrice)) return false;
    const beds = bedsOf(item);
    if (minBeds && (beds == null || beds < minBeds)) return false;
    const size = sizeOf(item);
    if (minBra && (size == null || size < minBra)) return false;
    if (maxFee != null && (item.felleskost == null || item.felleskost > maxFee)) return false;
    if (state.areas.size) {
      const names = item.bydeler || [];
      if (!names.some((name) => state.areas.has(name))) return false;
    }
    return true;
  }).sort(compare);
}

function compare(a, b) {
  const specs = {
    "pris-asc": [priceOf, 1],
    "pris-desc": [priceOf, -1],
    nyeste: [(item) => item.publisert || null, -1],
    kvm: [(item) => positive(item.kvm_pris), 1],
    storrelse: [sizeOf, -1],
  };
  const [fn, sign] = specs[state.sort] || specs.nyeste;
  const primary = cmp(fn(a), fn(b), sign);
  if (primary) return primary;
  return String(a.address).localeCompare(String(b.address), "nb");
}

function cmp(a, b, sign) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a < b) return -sign;
  if (a > b) return sign;
  return 0;
}

function formatVisning(iso) {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;
  const zone = { timeZone: "Europe/Oslo" };
  const weekday = new Intl.DateTimeFormat("nb-NO", { ...zone, weekday: "short" }).format(when).replace(".", "");
  const day = new Intl.DateTimeFormat("nb-NO", { ...zone, day: "numeric", month: "short" }).format(when).replace(".", "");
  const clock = new Intl.DateTimeFormat("nb-NO", { ...zone, hour: "2-digit", minute: "2-digit" }).format(when);
  return `Visning ${weekday} ${day} kl. ${clock}`;
}

function formatUpdated(iso) {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";
  const text = new Intl.DateTimeFormat("nb-NO", {
    timeZone: "Europe/Oslo",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(when);
  return `Oppdatert ${text}`;
}

function badgeList(item) {
  const badges = [];
  if (item.status === "solgt") badges.push(["sold", "Solgt"]);
  if (item.status === "kommer_for_salg") badges.push(["soon", "Kommer for salg"]);
  if (item.ny && item.status !== "solgt") badges.push(["ny", "Ny"]);
  if (item.prisfall) badges.push(["fall", "Prisfall"]);
  if (item.visning_i_dag) badges.push(["today", "Visning i dag"]);
  if (item.type === "prosjekt") badges.push(["project", "Prosjekt"]);
  if (item.privat) badges.push(["private", "Privat"]);
  return badges;
}

function factLine(item) {
  const parts = [];
  const size = positive(item.bra);
  if (size) {
    const end = positive(item.bra_til);
    const label = end ? `${size}–${end}` : String(size);
    parts.push(item.arealtype === "P-rom" ? `${label} m² P-rom` : `${label} m²`);
  }
  const beds = positive(item.soverom);
  if (beds) {
    const end = positive(item.soverom_til);
    parts.push(end ? `${beds}–${end} soverom` : `${beds} soverom`);
  }
  if (item.felleskost === 0) parts.push("Felleskost 0 kr");
  else if (positive(item.felleskost)) parts.push(`Felleskost ${kr(item.felleskost)}`);
  return parts.join(" · ");
}

function renderCards(items) {
  const root = $("cards");
  root.replaceChildren();
  if (!items.length) {
    const empty = el("div", "empty");
    empty.append(el("p", null, "Ingen rekkehus matcher filtrene."));
    const reset = el("button", "chip", "Nullstill filter");
    reset.type = "button";
    reset.addEventListener("click", resetFilters);
    empty.append(reset);
    root.append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    const card = document.createElement("a");
    card.className = "card" + (item.status === "solgt" ? " is-sold" : "") + (item.id === state.selectedId ? " is-on" : "");
    card.href = item.url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.dataset.id = item.id;
    card.addEventListener("click", () => selectListing(item.id, "list"));

    const media = el("div", "card-media");
    if (item.bilde) {
      const image = document.createElement("img");
      image.src = item.bilde;
      image.alt = item.address;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => image.replaceWith(el("div", "placeholder", "Bilde mangler")));
      media.append(image);
    } else {
      media.append(el("div", "placeholder", "Bilde mangler"));
    }
    const badges = el("div", "badges");
    for (const [kind, label] of badgeList(item)) badges.append(el("span", `badge ${kind}`, label));
    media.append(badges);

    const body = el("div", "card-body");
    if (item.prisfall && item.prisendring_felt === "prisantydning" && positive(item.forrige_prisantydning)) {
      body.append(el("p", "was", kr(item.forrige_prisantydning)));
    }
    const asking = positive(item.prisantydning);
    body.append(el("p", "price", asking ? krSpan(item.prisantydning, item.prisantydning_til) : krSpan(item.totalpris, item.totalpris_til)));
    if (asking && positive(item.totalpris)) {
      const total = el("p", "total");
      total.textContent = "Totalpris " + krSpan(item.totalpris, item.totalpris_til);
      if (item.prisfall && item.prisendring_felt === "totalpris" && positive(item.forrige_totalpris)) {
        const was = document.createElement("s");
        was.textContent = kr(item.forrige_totalpris);
        total.prepend(was, document.createTextNode(" "));
      }
      body.append(total);
    }
    if (item.prisfall && item.prisendring) {
      body.append(el("p", "fall-line", `Prisfall ${kr(Math.abs(item.prisendring))}`));
    }
    if (positive(item.kvm_pris)) body.append(el("p", "kvm", `${nok.format(item.kvm_pris)} kr/m²`));
    body.append(el("h2", "addr", item.address));
    body.append(el("p", "where", item.omrade || "Oslo"));
    const facts = factLine(item);
    if (facts) body.append(el("p", "facts", facts));
    if (item.visning) {
      const text = formatVisning(item.visning);
      if (text) body.append(el("p", "viewing", text));
    }
    if (item.overskrift && item.overskrift !== item.address) body.append(el("p", "blurb", item.overskrift));
    const who = [item.eierform, item.megler].filter(Boolean).join(" · ");
    if (who) body.append(el("p", "broker", who));

    card.append(media, body);
    fragment.append(card);
  }
  root.append(fragment);
}

function renderAreas() {
  const counts = new Map();
  for (const item of state.all) {
    if (state.hideSold && item.status === "solgt") continue;
    for (const name of item.bydeler || []) counts.set(name, (counts.get(name) || 0) + 1);
  }
  const list = $("areaList");
  list.replaceChildren();
  const names = [...counts.keys()].sort((a, b) => a.localeCompare(b, "nb"));
  for (const name of names) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = name;
    input.checked = state.areas.has(name);
    input.addEventListener("change", () => {
      if (input.checked) state.areas.add(name);
      else state.areas.delete(name);
      render(true);
    });
    label.append(input, document.createTextNode(name), el("span", "n", String(counts.get(name))));
    list.append(label);
  }
}

function updateChrome(items) {
  const noun = items.length === 1 ? "bolig" : "boliger";
  $("count").textContent = items.length ? `${items.length} ${noun}` : "Ingen boliger";
  $("updated").textContent = state.updated ? formatUpdated(state.updated) : "";
  syncControls();
}

function pinLabel(item) {
  const amount = priceOf(item);
  if (amount == null) return "–";
  const millions = amount / 1_000_000;
  const digits = millions >= 10 ? 1 : 2;
  return millions.toFixed(digits).replace(".", ",") + " mill";
}

function pinIcon(item) {
  const classes = ["pin", item.status === "solgt" ? "solgt" : "", item.prisfall ? "fall" : "", item.id === state.selectedId ? "on" : ""].filter(Boolean).join(" ");
  return L.divIcon({
    className: "pin-anchor",
    html: `<div class="${classes}">${pinLabel(item).replace(/[&<>]/g, "")}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });
}

function ensureMap() {
  if (map) return;
  const holder = $("map");
  if (!window.L || !window.L.markerClusterGroup) {
    holder.replaceChildren(el("p", "map-fallback", "Kartet kunne ikke lastes. Listevisningen virker fortsatt."));
    return;
  }
  map = L.map(holder, { zoomControl: false, scrollWheelZoom: true }).setView([59.9139, 10.7522], 11);
  L.control.zoom({ position: "topright" }).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);
  map.on("click", () => {
    if (!state.selectedId) return;
    state.selectedId = null;
    hideMapCard();
    refreshPinStyles();
    writeParams();
    document.querySelectorAll(".card.is-on").forEach((node) => node.classList.remove("is-on"));
  });
  renderMarkers(filtered(), true);
}

function renderMarkers(items, refit) {
  if (!map || !window.L) return;
  if (cluster) map.removeLayer(cluster);
  markers = new Map();
  cluster = L.markerClusterGroup({
    maxClusterRadius: 42,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 16,
  });
  for (const item of items) {
    if (item.lat == null || item.lng == null) continue;
    const marker = L.marker([item.lat, item.lng], { icon: pinIcon(item), title: item.address });
    marker.on("click", (event) => {
      L.DomEvent.stopPropagation(event);
      selectListing(item.id, "map");
    });
    markers.set(item.id, marker);
    cluster.addLayer(marker);
  }
  map.addLayer(cluster);
  if (refit) fitMap(items);
}

function refreshPinStyles() {
  if (!markers.size) return;
  for (const item of filtered()) {
    const marker = markers.get(item.id);
    if (marker) marker.setIcon(pinIcon(item));
  }
}

function fitMap(items) {
  if (!map) return;
  const points = items.filter((item) => item.lat != null && item.lng != null);
  if (!points.length) return;
  if (points.length === 1) {
    map.setView([points[0].lat, points[0].lng], 14);
    return;
  }
  map.fitBounds(points.map((item) => [item.lat, item.lng]), { padding: [36, 36], maxZoom: 14 });
}

function hideMapCard() {
  const card = $("mapCard");
  card.hidden = true;
  card.replaceChildren();
}

function showMapCard(item) {
  const card = $("mapCard");
  if (!item) {
    hideMapCard();
    return;
  }
  card.hidden = false;
  card.replaceChildren();
  if (item.bilde) {
    const image = document.createElement("img");
    image.src = item.bilde;
    image.alt = "";
    image.referrerPolicy = "no-referrer";
    card.append(image);
  } else {
    card.append(el("div", "placeholder", "Bilde"));
  }
  const body = el("div", "map-card-body");
  body.append(el("p", "price", positive(item.prisantydning) ? krSpan(item.prisantydning, item.prisantydning_til) : krSpan(item.totalpris, item.totalpris_til)));
  if (positive(item.totalpris) && positive(item.prisantydning)) body.append(el("p", "total", "Totalpris " + krSpan(item.totalpris, item.totalpris_til)));
  body.append(el("p", "addr", item.address));
  body.append(el("p", "where", item.omrade || "Oslo"));
  const facts = factLine(item);
  if (facts) body.append(el("p", "facts", facts));
  const link = el("a", "finn", "Se annonse på Finn");
  link.href = item.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  body.append(link);
  const close = el("button", "close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Lukk");
  close.addEventListener("click", () => {
    state.selectedId = null;
    hideMapCard();
    refreshPinStyles();
    writeParams();
    document.querySelectorAll(".card.is-on").forEach((node) => node.classList.remove("is-on"));
  });
  card.append(body, close);
}

function selectListing(id, source) {
  const item = state.all.find((row) => row.id === id);
  if (!item) {
    state.selectedId = null;
    hideMapCard();
    return;
  }
  state.selectedId = id;
  document.querySelectorAll(".card").forEach((node) => node.classList.toggle("is-on", node.dataset.id === id));
  const card = document.querySelector(`.card[data-id="${id}"]`);
  if (card && source !== "list") card.scrollIntoView({ block: "nearest" });
  showMapCard(item);
  refreshPinStyles();
  if (map && item && item.lat != null && source === "map") {
    const zoom = Math.max(map.getZoom(), 15);
    map.flyTo([item.lat, item.lng], zoom, { duration: 0.35 });
  }
  writeParams();
}

function render(refit) {
  const items = filtered();
  if (state.selectedId && !items.some((item) => item.id === state.selectedId)) {
    state.selectedId = null;
    hideMapCard();
  }
  renderCards(items);
  updateChrome(items);
  if (map) renderMarkers(items, refit);
  else if ((state.view === "kart" || state.view === "delt") && refit) ensureMap();
  const selected = state.all.find((item) => item.id === state.selectedId);
  if (selected) showMapCard(selected);
  writeParams();
}

function renderAreaOpen() {
  const panel = $("areaPanel");
  const button = $("areaBtn");
  panel.hidden = false;
  button.setAttribute("aria-expanded", "true");
  const rect = button.getBoundingClientRect();
  const width = panel.offsetWidth;
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
  let top = rect.bottom + 8;
  if (top + panel.offsetHeight > window.innerHeight - 16) top = Math.max(12, rect.top - panel.offsetHeight - 8);
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
}

function closeArea() {
  $("areaPanel").hidden = true;
  $("areaBtn").setAttribute("aria-expanded", "false");
}

function resetFilters() {
  state.maxPrice = "";
  state.minBeds = "";
  state.minBra = "";
  state.maxFee = "";
  state.areas = new Set();
  state.hideSold = true;
  state.sort = "nyeste";
  renderAreas();
  render(true);
}

function bind() {
  for (const button of document.querySelectorAll("[data-view-btn]")) {
    button.addEventListener("click", () => {
      applyView(button.dataset.viewBtn, { refit: true });
      render(false);
    });
  }
  for (const [id, key] of [["maxPrice", "maxPrice"], ["minBeds", "minBeds"], ["minBra", "minBra"], ["maxFee", "maxFee"], ["sort", "sort"]]) {
    $(id).addEventListener("change", () => {
      state[key] = $(id).value;
      render(true);
    });
  }
  $("hideSold").addEventListener("change", () => {
    state.hideSold = $("hideSold").checked;
    for (const name of [...state.areas]) {
      const stillThere = state.all.some((item) => (state.hideSold ? item.status !== "solgt" : true) && (item.bydeler || []).includes(name));
      if (!stillThere) state.areas.delete(name);
    }
    renderAreas();
    render(true);
  });
  $("reset").addEventListener("click", resetFilters);
  $("areaBtn").addEventListener("click", () => {
    if ($("areaPanel").hidden) renderAreaOpen();
    else closeArea();
  });
  $("areaClear").addEventListener("click", () => {
    state.areas.clear();
    renderAreas();
    render(true);
  });
  document.addEventListener("click", (event) => {
    if ($("areaPanel").hidden) return;
    if (event.target.closest("#areaPanel") || event.target.closest("#areaBtn")) return;
    closeArea();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeArea();
  });
  $("filters").addEventListener("scroll", closeArea);
  window.addEventListener("resize", () => {
    if (!$("areaPanel").hidden) renderAreaOpen();
    if (map && (state.view === "kart" || (state.view === "delt" && wideScreen()))) map.invalidateSize();
  });
}

async function load() {
  readParams();
  applyView(state.view);
  bind();
  try {
    const response = await fetch("listings.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    state.all = Array.isArray(data.listings) ? data.listings : [];
    state.updated = data.updated_at || null;
  } catch (error) {
    $("count").textContent = "Kunne ikke laste boliger";
    $("cards").append(el("div", "empty", "Sjekk tilkoblingen og last siden på nytt. Forrige liste blir liggende når neste oppdatering feiler."));
    console.error(error);
    return;
  }
  state.ready = true;
  renderAreas();
  syncControls();
  render(true);
  if (state.selectedId) selectListing(state.selectedId, "map");
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

load();
