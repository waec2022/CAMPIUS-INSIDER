/* =========================================================
   CAMPUS GUIDE — app.js
   Structured search (no AI, no external API). Vanilla JS.
   ========================================================= */

(function () {
  "use strict";

  var STOPWORDS = ["where", "is", "the", "who", "what", "please", "a", "an", "of", "to", "how", "do", "i", "can"];

  var TYPE_META = {
    office: { label: "Office", icon: "🏢", filter: "offices" },
    lecturer: { label: "Lecturer", icon: "👤", filter: "lecturers" },
    course: { label: "Course", icon: "📘", filter: "courses" },
    department: { label: "Department", icon: "🏛️", filter: "departments" },
    faculty: { label: "Faculty", icon: "🎓", filter: "faculties" },
    service: { label: "Service", icon: "🛎️", filter: "services" },
    building: { label: "Building", icon: "📍", filter: "buildings" },
    information: { label: "Information", icon: "📄", filter: "information" },
    update: { label: "Update", icon: "📣", filter: "information" },
    announcement: { label: "Announcement", icon: "📢", filter: "information" },
    event: { label: "Event", icon: "📅", filter: "information" },
    campaign: { label: "Campaign", icon: "🎯", filter: "information" },
    notice: { label: "Notice", icon: "📋", filter: "information" },
    document: { label: "Document", icon: "📄", filter: "information" }
  };

  var VERIFICATION_META = {
    "verified-information": { label: "Verified Information", className: "badge--verified" },
    "verified-staff": { label: "Verified Staff", className: "badge--verified" },
    "official-staff": { label: "Official Staff", className: "badge--verified" },
    "pending-verification": { label: "Pending Verification", className: "badge--pending" },
    "unverified": { label: "Unverified", className: "badge--unverified" }
  };

  var FILTERS = ["all", "offices", "lecturers", "courses", "departments", "faculties", "services", "buildings", "information"];

  /* ---------------- helpers ---------------- */

  function isExpired(record) {
    if (!record.expiresAt) return false;
    return new Date(record.expiresAt).getTime() < Date.now();
  }

  function activeRecords() {
    return CAMPUS_DATA.records.filter(function (r) { return !isExpired(r); });
  }

  function recordById(id) {
    for (var i = 0; i < CAMPUS_DATA.records.length; i++) {
      if (CAMPUS_DATA.records[i].id === id) return CAMPUS_DATA.records[i];
    }
    return null;
  }

  function typeMeta(type) {
    return TYPE_META[type] || { label: type, icon: "📄", filter: "information" };
  }

  function verificationMeta(v) {
    return VERIFICATION_META[v] || null;
  }

  function tokenize(query) {
    return query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(function (t) { return t && STOPWORDS.indexOf(t) === -1; });
  }

  /* ---------------- search ---------------- */

  function scoreRecord(record, rawQuery, tokens) {
    var title = (record.title || "").toLowerCase();
    var subtitle = (record.subtitle || "").toLowerCase();
    var description = (record.description || "").toLowerCase();
    var keywords = (record.keywords || []).map(function (k) { return k.toLowerCase(); });
    var q = rawQuery.toLowerCase().trim();

    var score = 0;

    if (title === q) score += 100;
    else if (title.indexOf(q) === 0) score += 80;

    tokens.forEach(function (tok) {
      if (title.indexOf(tok) !== -1) score += 20;
      if (keywords.some(function (k) { return k.indexOf(tok) !== -1; })) score += 16;
      if (subtitle.indexOf(tok) !== -1) score += 8;
      if (description.indexOf(tok) !== -1) score += 4;
    });

    // related-record boost: if query matches something this record relates to
    if (record.related && score === 0) {
      record.related.forEach(function (relId) {
        var rel = recordById(relId);
        if (rel && rel.title && rel.title.toLowerCase().indexOf(q) !== -1) score += 2;
      });
    }

    return score;
  }

  function search(query, filter) {
    var tokens = tokenize(query);
    if (tokens.length === 0 && query.trim() === "") return [];

    var results = activeRecords()
      .map(function (r) { return { record: r, score: scoreRecord(r, query, tokens) }; })
      .filter(function (r) { return r.score > 0; });

    if (filter && filter !== "all") {
      results = results.filter(function (r) { return typeMeta(r.record.type).filter === filter; });
    }

    results.sort(function (a, b) { return b.score - a.score; });
    return results.map(function (r) { return r.record; });
  }

  /* ---------------- rendering: shared ---------------- */

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function verificationBadgeHTML(record) {
    var meta = verificationMeta(record.verification);
    if (!meta) return "";
    return '<span class="badge ' + meta.className + '">✓ ' + meta.label + "</span>";
  }

  function resultItemHTML(record) {
    var tm = typeMeta(record.type);
    return (
      '<a class="result-item" href="#/record/' + record.id + '">' +
        '<span class="result-item__icon result-item__icon--' + record.type + '">' + tm.icon + "</span>" +
        '<span class="result-item__body">' +
          '<span class="result-item__type">' + tm.label + "</span>" +
          '<span class="result-item__title">' + record.title + "</span>" +
          '<span class="result-item__desc">' + (record.subtitle || record.description || "") + "</span>" +
        "</span>" +
        '<span class="result-item__arrow">›</span>' +
      "</a>"
    );
  }

  /* ---------------- live banner ---------------- */

  function renderLiveBanner() {
    var slot = document.getElementById("liveBanner");
    if (!slot) return;
    var lu = CAMPUS_DATA.liveUpdate;
    if (!lu || isExpired(lu)) { slot.innerHTML = ""; return; }
    slot.innerHTML =
      '<div class="live-banner live-banner--' + (lu.priority || "normal") + '">' +
        '<span class="live-banner__tag">LIVE</span>' +
        '<span class="live-banner__text">' + lu.title + "</span>" +
      "</div>";
  }

  /* ---------------- view: home ---------------- */

  function renderHome() {
    var quickAccess = ["department", "course", "lecturer", "office", "building", "service"];
    var grid = document.getElementById("quickAccessGrid");
    if (grid) {
      grid.innerHTML = Object.keys(TYPE_META)
        .filter(function (t) { return quickAccess.indexOf(t) !== -1; })
        .map(function (t) {
          var m = TYPE_META[t];
          return (
            '<a class="quick-tile" href="#/search?filter=' + m.filter + '">' +
              '<span class="quick-tile__icon">' + m.icon + "</span>" +
              '<span class="quick-tile__label">' + m.label + "s</span>" +
            "</a>"
          );
        }).join("");
    }

    var updatesWrap = document.getElementById("latestUpdates");
    if (updatesWrap) {
      var updates = activeRecords()
        .filter(function (r) { return ["update", "announcement", "event", "campaign"].indexOf(r.type) !== -1; })
        .slice(0, 4);
      updatesWrap.innerHTML = updates.map(function (r) {
        var tm = typeMeta(r.type);
        return (
          '<a class="update-chip" href="#/record/' + r.id + '">' +
            '<span class="update-chip__icon update-chip__icon--' + r.type + '">' + tm.icon + "</span>" +
            '<span class="update-chip__text">' +
              '<span class="update-chip__title">' + r.title + "</span>" +
              '<span class="update-chip__date">' + (r.subtitle || "") + "</span>" +
            "</span>" +
          "</a>"
        );
      }).join("");
    }
  }

  /* ---------------- view: results ---------------- */

  var currentFilter = "all";

  function renderFilterChips() {
    var wrap = document.getElementById("filterChips");
    if (!wrap) return;
    wrap.innerHTML = FILTERS.map(function (f) {
      var label = f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1);
      var active = f === currentFilter ? " filter-chip--active" : "";
      return '<button type="button" class="filter-chip' + active + '" data-filter="' + f + '">' + label + "</button>";
    }).join("");

    wrap.querySelectorAll(".filter-chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        currentFilter = btn.getAttribute("data-filter");
        renderFilterChips();
        runSearchFromInput();
      });
    });
  }

  function renderResults(query) {
    var resultsList = document.getElementById("resultsList");
    var resultsCount = document.getElementById("resultsCount");
    if (!resultsList) return;

    if (!query || !query.trim()) {
      resultsList.innerHTML = "";
      if (resultsCount) resultsCount.textContent = "";
      return;
    }

    var results = search(query, currentFilter);

    if (resultsCount) {
      resultsCount.textContent = results.length
        ? "Found " + results.length + " result" + (results.length === 1 ? "" : "s") + ' for "' + query + '"'
        : "";
    }

    resultsList.innerHTML = results.length
      ? results.map(resultItemHTML).join("")
      : '<div class="no-results">No results for "' + escapeHTML(query) + '". Try a different word.</div>';
  }

  function runSearchFromInput() {
    var input = document.getElementById("searchInput");
    renderResults(input ? input.value : "");
  }

  /* ---------------- view: detail ---------------- */

  function fieldRow(label, value) {
    if (!value) return "";
    return '<div class="info-row"><span class="info-row__label">' + label + '</span><span class="info-row__value">' + value + "</span></div>";
  }

  function relatedChipsHTML(record) {
    if (!record.related || !record.related.length) return "";
    var chips = record.related
      .map(recordById)
      .filter(Boolean)
      .map(function (r) {
        return '<a class="related-chip" href="#/record/' + r.id + '">' + typeMeta(r.type).icon + " " + r.title + "</a>";
      }).join("");
    if (!chips) return "";
    return '<div class="related-section"><h3 class="related-section__title">Related Information</h3><div class="related-chips">' + chips + "</div></div>";
  }

  function renderDetail(id) {
    var record = recordById(id);
    var wrap = document.getElementById("detailBody");
    if (!wrap) return;

    if (!record || isExpired(record)) {
      wrap.innerHTML = '<div class="no-results">This record is unavailable.</div>';
      return;
    }

    var tm = typeMeta(record.type);
    var titleEl = document.getElementById("detailTitle");
    if (titleEl) titleEl.textContent = record.title;

    var infoRows = "";
    if (record.type === "office" || record.type === "building") {
      infoRows =
        fieldRow("Location", record.location) +
        fieldRow("Opening Hours", record.hours) +
        fieldRow("Phone", record.phone) +
        fieldRow("Email", record.email);
      if (record.whatToBring && record.whatToBring.length) {
        infoRows += fieldRow("What to Bring", record.whatToBring.join(", "));
      }
    } else if (record.type === "lecturer") {
      infoRows =
        fieldRow("Department", record.department ? (recordById(record.department) || {}).title : "") +
        fieldRow("Phone", record.phone) +
        fieldRow("Email", record.email) +
        fieldRow("Office", record.office ? (recordById(record.office) || {}).title : "");
    } else if (record.type === "course") {
      infoRows =
        fieldRow("Level", record.level) +
        fieldRow("Semester", record.semester) +
        fieldRow("Department", record.department ? (recordById(record.department) || {}).title : "") +
        fieldRow("Lecturer(s)", (record.lecturers || []).map(function (lid) { return (recordById(lid) || {}).title; }).filter(Boolean).join(", "));
    } else {
      infoRows = fieldRow("Category", record.category);
    }

    var verification = verificationBadgeHTML(record);
    var mapBtn = record.mapUrl ? '<a class="btn-secondary" href="' + record.mapUrl + '" target="_blank" rel="noopener">Get Directions</a>' : "";
    var downloadBtn = (record.downloadAllowed && record.documentUrl) ? '<a class="btn-primary" href="' + record.documentUrl + '" target="_blank" rel="noopener">Download</a>' : "";

    wrap.innerHTML =
      '<div class="detail-head">' +
        '<span class="detail-head__icon detail-head__icon--' + record.type + '">' + tm.icon + "</span>" +
        '<div class="detail-head__text">' +
          '<h1 class="detail-head__title">' + record.title + " " + verification + "</h1>" +
          '<p class="detail-head__subtitle">' + (record.subtitle || "") + "</p>" +
        "</div>" +
      "</div>" +
      (record.description ? '<p class="detail-desc">' + record.description + "</p>" : "") +
      (infoRows ? '<div class="info-grid">' + infoRows + "</div>" : "") +
      '<div class="detail-actions">' + mapBtn + downloadBtn + "</div>" +
      relatedChipsHTML(record);
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  /* ---------------- routing ---------------- */

  function showView(name) {
    ["view-home", "view-search", "view-detail"].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) node.style.display = id === "view-" + name ? "" : "none";
    });
    var shell = document.getElementById("searchShell");
    if (shell) shell.classList.toggle("search-shell--hero", name === "home");
  }

  function parseHash() {
    var hash = window.location.hash.replace(/^#\/?/, "");
    var parts = hash.split("?");
    var path = parts[0] || "";
    var params = {};
    if (parts[1]) {
      parts[1].split("&").forEach(function (pair) {
        var kv = pair.split("=");
        params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
      });
    }
    return { path: path, params: params };
  }

  function route() {
    var r = parseHash();

    if (r.path.indexOf("record/") === 0) {
      var id = r.path.slice("record/".length);
      showView("detail");
      renderDetail(id);
      window.scrollTo(0, 0);
      return;
    }

    if (r.path === "search") {
      showView("search");
      currentFilter = r.params.filter || "all";
      var input = document.getElementById("searchInput");
      if (input && r.params.q) input.value = r.params.q;
      renderFilterChips();
      runSearchFromInput();
      if (input) input.focus();
      window.scrollTo(0, 0);
      return;
    }

    showView("home");
    renderHome();
    window.scrollTo(0, 0);
  }

  /* ---------------- init ---------------- */

  function init() {
    renderLiveBanner();

    var searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        if (parseHash().path !== "search") {
          window.location.hash = "#/search";
        }
        runSearchFromInput();
      });
      searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") e.preventDefault();
      });
    }

    var homeSearchForm = document.getElementById("homeSearchForm");
    if (homeSearchForm) {
      homeSearchForm.addEventListener("submit", function (e) {
        e.preventDefault();
      });
    }

    window.addEventListener("hashchange", route);
    route();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
