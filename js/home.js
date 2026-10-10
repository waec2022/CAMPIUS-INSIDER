
/* =========================================================
   CAMPUS GUIDE — home.js
   Renders the Featured cards on the home page and handles
   the #/list?type=... category pages. No dependencies.
   ========================================================= */

(function () {
  "use strict";

  var TYPE_LABEL = {
    event: "Event",
    campaign: "Campaign",
    announcement: "Announcement",
    update: "Update"
  };

  var FEATURED_TYPES = ["event", "campaign", "announcement"];

  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function isExpired(r) {
    return !!r.expiresAt && new Date(r.expiresAt).getTime() < Date.now();
  }

  function activeRecords() {
    return (CAMPUS_DATA.records || []).filter(function (r) { return !isExpired(r); });
  }

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return esc(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function featuredCard(r) {
    var label = TYPE_LABEL[r.type] || "Update";
    var image = r.image || r.photo;
    var imageStyle = image ? ' style="background-image:url(&quot;' + esc(image) + '&quot;)"' : "";
    var cls = FEATURED_TYPES.indexOf(r.type) !== -1 ? r.type : "update";

    return (
      '<article class="featured-card featured-card--' + cls + '">' +
        '<div class="featured-card__image"' + imageStyle + "></div>" +
        '<div class="featured-card__shade"></div>' +
        '<div class="featured-card__top">' +
          '<span class="featured-tag featured-tag--' + cls + '">' + label + "</span>" +
          '<span class="featured-date">' + formatDate(r.publishedAt) + "</span>" +
        "</div>" +
        '<div class="featured-card__content">' +
          '<h3 class="featured-card__title">' + esc(r.title) + "</h3>" +
          '<p class="featured-card__desc">' + esc(r.description || "") + "</p>" +
          '<a class="featured-card__btn" href="#/record/' + esc(r.id) + '">View Details →</a>' +
        "</div>" +
      "</article>"
    );
  }

  function renderFeatured() {
    var grid = document.getElementById("featuredGrid");
    if (!grid) return;

    var items = activeRecords()
      .filter(function (r) { return FEATURED_TYPES.indexOf(r.type) !== -1; })
      .sort(function (a, b) { return (b.publishedAt || "").localeCompare(a.publishedAt || ""); })
      .slice(0, 3);

    grid.innerHTML = items.length
      ? items.map(featuredCard).join("")
      : '<div class="no-results">Nothing featured right now.</div>';
  }

  /* ---------- Category list page: #/list?type=event ---------- */

  function parseQuery() {
    var hash = window.location.hash.replace(/^#\/?/, "");
    var parts = hash.split("?");
    var params = {};
    if (parts[1]) {
      parts[1].split("&").forEach(function (pair) {
        var kv = pair.split("=");
        params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
      });
    }
    return { path: parts[0], params: params };
  }

  function showSearchView() {
    var home = document.getElementById("view-home");
    var search = document.getElementById("view-search");
    var detail = document.getElementById("view-detail");
    var shell = document.getElementById("searchShell");
    if (home) home.style.display = "none";
    if (detail) detail.style.display = "none";
    if (search) search.style.display = "";
    if (shell) shell.classList.remove("search-shell--hero");
  }

  function renderList(typeParam) {
    var types = typeParam ? typeParam.split(",") : [];
    var label = TYPE_LABEL[types[0]] || "Items";

    var chips = document.getElementById("filterChips");
    var count = document.getElementById("resultsCount");
    var list = document.getElementById("resultsList");
    if (chips) chips.innerHTML = "";

    var items = activeRecords().filter(function (r) { return types.indexOf(r.type) !== -1; });
    if (count) count.textContent = label + "s · " + items.length + " item" + (items.length === 1 ? "" : "s");
    if (list) {
      list.innerHTML = items.length
        ? items.map(function (r) {
            var tag = TYPE_LABEL[r.type] || "Information";
            return (
              '<a class="result-item" href="#/record/' + esc(r.id) + '">' +
                '<span class="result-item__icon result-item__icon--' + esc(r.type) + '">📄</span>' +
                '<span class="result-item__body">' +
                  '<span class="result-item__type">' + tag + " · " + formatDate(r.publishedAt) + "</span>" +
                  '<span class="result-item__title">' + esc(r.title) + "</span>" +
                  '<span class="result-item__desc">' + esc(r.description || "") + "</span>" +
                "</span>" +
                '<span class="result-item__arrow">›</span>' +
              "</a>"
            );
          }).join("")
        : '<div class="no-results">Nothing here yet.</div>';
    }
  }

  function applyRoute() {
    var r = parseQuery();
    if (r.path === "list") {
      showSearchView();
      renderList(r.params.type || "");
      window.scrollTo(0, 0);
    }
  }

  /* app.js also listens for hashchange and would reset the view,
     so this runs one tick later to win. */
  window.addEventListener("hashchange", function () {
    window.setTimeout(applyRoute, 0);
  });

  function init() {
    renderFeatured();
    applyRoute();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
