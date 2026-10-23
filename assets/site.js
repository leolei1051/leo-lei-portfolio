/* ============================================================
   Leo's Workspace — shared behaviour
   Scroll progress, mobile menu, scroll-reveal and a guarded
   pointer tilt on scene cards. Everything degrades gracefully:
   - no JS  → content is fully visible (reveal is CSS opt-in)
   - reduced motion → reveal + tilt disabled
   - no fine pointer → tilt disabled
   ============================================================ */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---- Scroll progress bar --------------------------------- */
  var bar = document.getElementById("progress-bar");
  if (bar) {
    var onScroll = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? h.scrollTop / max : 0;
      bar.style.transform = "scaleX(" + p + ")";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- Mobile menu ------------------------------------------ */
  var btn = document.getElementById("menu-toggle");
  var menu = document.getElementById("mobile-menu");
  if (btn && menu) {
    function closeMenu() {
      menu.classList.add("hidden");
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Open menu");
    }
    btn.addEventListener("click", function () {
      if (menu.classList.contains("hidden")) {
        menu.classList.remove("hidden");
        btn.setAttribute("aria-expanded", "true");
        btn.setAttribute("aria-label", "Close menu");
      } else {
        closeMenu();
      }
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.classList.contains("hidden")) { closeMenu(); btn.focus(); }
    });
  }

  /* ---- Scroll reveal ----------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && !reducedMotion && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    // Reduced motion or no IO support: show everything immediately.
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---- Guarded pointer tilt on scene cards ------------------- */
  if (!reducedMotion && finePointer) {
    document.querySelectorAll(".scene-card").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          "translateY(-5px) rotateX(" + (-y * 4).toFixed(2) + "deg) rotateY(" + (x * 5).toFixed(2) + "deg)";
      });
      card.addEventListener("pointerleave", function () {
        card.style.transform = "";
      });
    });
  }

  window.__siteInit = true;
})();
