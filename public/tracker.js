(function () {
  try {
    var w = window;
    if (w.__JENAFY__) return;

    function findScript() {
      if (document.currentScript && document.currentScript.getAttribute) {
        return document.currentScript;
      }
      var nodes = document.querySelectorAll("script[data-site-id]");
      for (var i = 0; i < nodes.length; i++) {
        var src = nodes[i].getAttribute("src") || "";
        if (src.indexOf("tracker.js") !== -1) return nodes[i];
      }
      return nodes[0] || null;
    }

    var script = findScript();
    var siteId = script && script.getAttribute("data-site-id");
    if (!siteId) return;
    w.__JENAFY__ = true;

    var src = (script && script.src) || "";
    var origin = src.replace(/\/tracker\.js(?:\?.*)?$/, "") || "";
    var endpoint = origin + "/api/collect";

    var SESSION_MS = 30 * 60 * 1000;
    var GRID_X = 40;
    var GRID_Y = 30;
    var lastPath = "";
    var lastPvAt = 0;
    var lastHref = document.referrer || "";
    var queue = [];
    var flushTimer = 0;
    var scrollSeen = {};
    var moveBuf = [];
    var moveTimer = 0;

    function uuid() {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
    }

    function storageGet(k) {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    }
    function storageSet(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {}
    }

    function visitorId() {
      var id = storageGet("jen_vid");
      if (!id) {
        id = uuid();
        storageSet("jen_vid", id);
      }
      return id;
    }

    function sessionId() {
      var now = Date.now();
      var sid = storageGet("jen_sid");
      var sat = parseInt(storageGet("jen_sat") || "0", 10);
      if (!sid || !sat || now - sat > SESSION_MS) {
        sid = uuid();
        storageSet("jen_sid", sid);
      }
      storageSet("jen_sat", String(now));
      return sid;
    }

    function device() {
      var ua = navigator.userAgent || "";
      if (/iPad|Tablet/i.test(ua)) return "tablet";
      if (/Mobi|Android|iPhone|iPod/i.test(ua) || w.innerWidth < 768) return "mobile";
      return "desktop";
    }

    function browser() {
      var ua = navigator.userAgent;
      if (/Edg\//.test(ua)) return "Edge";
      if (/CriOS|Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
      if (/Firefox|FxiOS/.test(ua)) return "Firefox";
      if (/Safari\//.test(ua) && !/Chrome|CriOS/.test(ua)) return "Safari";
      return "Other";
    }

    function os() {
      var ua = navigator.userAgent;
      if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
      if (/Android/.test(ua)) return "Android";
      if (/Mac OS X/.test(ua)) return "macOS";
      if (/Windows/.test(ua)) return "Windows";
      if (/Linux/.test(ua)) return "Linux";
      return "Other";
    }

    function utmFrom(href) {
      try {
        var u = new URL(href);
        function g(k) {
          return u.searchParams.get(k) || undefined;
        }
        var o = {};
        if (g("utm_source")) o.source = g("utm_source");
        if (g("utm_medium")) o.medium = g("utm_medium");
        if (g("utm_campaign")) o.campaign = g("utm_campaign");
        if (g("utm_term")) o.term = g("utm_term");
        if (g("utm_content")) o.content = g("utm_content");
        return o;
      } catch (e) {
        return {};
      }
    }

    function pagePath() {
      return location.pathname || "/";
    }

    function baseEvent() {
      return {
        ts: Date.now(),
        path: pagePath(),
        device: device(),
      };
    }

    function enqueue(ev) {
      queue.push(ev);
      if (queue.length >= 15) flush();
      else if (!flushTimer) flushTimer = setTimeout(flush, 2000);
    }

    function flush() {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = 0;
      }
      if (!queue.length) return;
      var events = queue.splice(0, 60);
      var body = JSON.stringify({
        siteId: siteId,
        visitorId: visitorId(),
        sessionId: sessionId(),
        events: events,
      });
      try {
        var sent = false;
        if (navigator.sendBeacon) {
          sent = navigator.sendBeacon(endpoint, new Blob([body], { type: "text/plain" }));
        }
        if (!sent) {
          fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: body,
            keepalive: true,
            mode: "cors",
          }).catch(function () {});
        }
      } catch (e) {}
    }

    function pageview() {
      var p = pagePath();
      var now = Date.now();
      if (p === lastPath && now - lastPvAt < 800) return;
      lastPath = p;
      lastPvAt = now;
      var href = location.href;
      enqueue(
        Object.assign(baseEvent(), {
          t: "pv",
          title: document.title || "",
          href: href.slice(0, 1000),
          ref: (lastHref || "").slice(0, 1000),
          utm: utmFrom(href),
          browser: browser(),
          os: os(),
          sw: screen.width,
          sh: screen.height,
          vw: w.innerWidth,
          vh: w.innerHeight,
          lang: (navigator.language || "").slice(0, 20),
        }),
      );
      lastHref = href;
    }

    function onNav() {
      setTimeout(pageview, 40);
    }

    var _push = history.pushState;
    history.pushState = function () {
      var before = location.href;
      var r = _push.apply(this, arguments);
      if (location.href !== before) onNav();
      return r;
    };
    var _replace = history.replaceState;
    history.replaceState = function () {
      var before = location.href;
      var r = _replace.apply(this, arguments);
      if (location.href !== before) onNav();
      return r;
    };
    w.addEventListener("popstate", onNav);

    document.addEventListener(
      "click",
      function (e) {
        try {
          var t = e.target;
          if (
            t &&
            t.closest &&
            t.closest(
              "input[type=password], input[type=email], input[type=tel], input[autocomplete=cc-number], [data-jenafy-ignore]",
            )
          )
            return;
          var doc = document.documentElement;
          var wdt = Math.max(doc.scrollWidth, doc.clientWidth, 1);
          var hgt = Math.max(doc.scrollHeight, doc.clientHeight, 1);
          var x = ("pageX" in e ? e.pageX : 0) / wdt;
          var y = ("pageY" in e ? e.pageY : 0) / hgt;
          enqueue(
            Object.assign(baseEvent(), {
              t: "ck",
              x: Math.max(0, Math.min(1, x)),
              y: Math.max(0, Math.min(5, y)),
              vw: w.innerWidth,
              vh: w.innerHeight,
              sy: Math.round(w.scrollY || doc.scrollTop || 0),
            }),
          );
        } catch (err) {}
      },
      true,
    );

    function scrollDepth() {
      var doc = document.documentElement;
      var h = Math.max(doc.scrollHeight - w.innerHeight, 1);
      return Math.round(((w.scrollY || doc.scrollTop || 0) / h) * 100);
    }

    var scrollTick = 0;
    w.addEventListener(
      "scroll",
      function () {
        if (scrollTick) return;
        scrollTick = setTimeout(function () {
          scrollTick = 0;
          try {
            var d = scrollDepth();
            var marks = [25, 50, 75, 90, 100];
            var p = pagePath();
            for (var i = 0; i < marks.length; i++) {
              var m = marks[i];
              if (d >= m && !scrollSeen[p + ":" + m]) {
                scrollSeen[p + ":" + m] = 1;
                enqueue(Object.assign(baseEvent(), { t: "sc", depth: m }));
              }
            }
          } catch (e) {}
        }, 200);
      },
      { passive: true },
    );

    document.addEventListener(
      "mousemove",
      function (e) {
        if (moveTimer) return;
        moveTimer = setTimeout(function () {
          moveTimer = 0;
        }, 250);
        try {
          if (Math.random() > 0.25) return;
          var gx = Math.max(0, Math.min(GRID_X - 1, Math.floor((e.clientX / Math.max(w.innerWidth, 1)) * GRID_X)));
          var gy = Math.max(0, Math.min(GRID_Y - 1, Math.floor((e.clientY / Math.max(w.innerHeight, 1)) * GRID_Y)));
          var key = gx + "," + gy;
          if (moveBuf.indexOf(key) === -1) moveBuf.push(key);
          if (moveBuf.length >= 8) {
            enqueue(Object.assign(baseEvent(), { t: "mv", cells: moveBuf.splice(0, 12) }));
          }
        } catch (err) {}
      },
      { passive: true },
    );

    setInterval(function () {
      if (document.visibilityState === "visible") {
        sessionId();
        enqueue(Object.assign(baseEvent(), { t: "hb" }));
      }
      if (moveBuf.length) enqueue(Object.assign(baseEvent(), { t: "mv", cells: moveBuf.splice(0, 12) }));
    }, 15000);

    w.addEventListener("pagehide", function () {
      if (moveBuf.length) enqueue(Object.assign(baseEvent(), { t: "mv", cells: moveBuf.splice(0, 12) }));
      flush();
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flush();
    });

    w.JenafyAnalytics = {
      track: function (name) {
        try {
          if (!name) return;
          enqueue(Object.assign(baseEvent(), { t: "ev", name: String(name).slice(0, 64) }));
        } catch (e) {}
      },
    };

    if (document.readyState === "complete" || document.readyState === "interactive") pageview();
    else document.addEventListener("DOMContentLoaded", pageview);
  } catch (e) {}
})();
