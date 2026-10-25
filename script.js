/* ═══════════════════════════════════════════════════════════════
   NOXLAB STUDIO — animations & interactions
   Vanilla JS, sans dépendance. Respecte prefers-reduced-motion.
   ═══════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = window.matchMedia("(pointer: fine)").matches;
  const html = document.documentElement;

  /* ---------- Préloader ---------- */
  const pre = $("#preloader");
  if (pre) {
    if (REDUCED) { pre.remove(); html.classList.add("loaded"); }
    else {
      document.body.classList.add("lock");
      setTimeout(() => {
        html.classList.add("loaded");
        pre.classList.add("cut");
      }, 1500);
      setTimeout(() => {
        pre.remove();
        document.body.classList.remove("lock");
      }, 2400);
    }
  }

  /* ---------- Découpage des titres en mots animés ---------- */
  $$("[data-split]").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach((w, i) => {
      // *mot* → mot en surbrillance bleue
      const bright = w.includes("*");
      const wrap = document.createElement("span");
      wrap.className = "sw" + (bright ? " hi" : "");
      const b = document.createElement("b");
      b.textContent = w.replace(/\*/g, "");
      b.style.transitionDelay = (i * 55) + "ms";
      wrap.appendChild(b);
      el.appendChild(wrap);
      el.appendChild(document.createTextNode(" "));
    });
  });

  /* ---------- Révélations au scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -46px 0px" });
  $$(".rv, [data-split], .p-row").forEach((el) => io.observe(el));

  /* ---------- Compteurs animés ---------- */
  const fmt = (n) => n.toLocaleString("fr-FR");
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      cio.unobserve(el);
      const target = parseFloat(el.dataset.count || "0");
      if (REDUCED) { el.textContent = fmt(target); return; }
      const t0 = performance.now(), dur = 1700;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.55 });
  $$("[data-count]").forEach((el) => cio.observe(el));

  /* ---------- Scroll global (barre, nav, parallaxe, process) ---------- */
  const nav = $("#nav"), prog = $("#progress"), toTop = $("#toTop");
  const heroInner = $("#heroInner");
  const processCard = $("#process"), prFill = $("#prFill");
  const prSteps = processCard ? $$(".pr-step", processCard) : [];
  const pxList = $$("[data-parallax]").map((el) => ({
    el,
    sp: parseFloat(el.dataset.parallax || "0.15"),
    c: 0,
  }));
  const refreshPx = () => {
    pxList.forEach((o) => {
      o.el.style.setProperty("--py", "0px");
      const r = o.el.getBoundingClientRect();
      o.c = r.top + window.scrollY + r.height / 2;
    });
  };
  refreshPx();
  window.addEventListener("resize", refreshPx);

  let lastY = window.scrollY, ticking = false;
  const onScroll = () => {
    const y = window.scrollY, vh = window.innerHeight;
    const max = html.scrollHeight - vh;
    if (prog) prog.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";

    if (nav) {
      nav.classList.toggle("scrolled", y > 24);
      if (y > 160 && y > lastY + 4 && !document.body.classList.contains("menu-open")) nav.classList.add("hide");
      else if (y < lastY - 4) nav.classList.remove("hide");
    }
    lastY = y;
    if (toTop) toTop.classList.toggle("show", y > 700);

    if (!REDUCED) {
      // sortie parallaxe du hero
      if (heroInner) {
        const p = Math.min(1, y / vh);
        heroInner.style.transform = "translateY(" + (y * 0.24) + "px)";
        heroInner.style.opacity = String(Math.max(0, 1 - p * 1.25));
      }
      // parallaxe des éléments décoratifs
      pxList.forEach((o) => {
        const d = (o.c - (y + vh / 2)) * o.sp;
        o.el.style.setProperty("--py", d.toFixed(1) + "px");
      });
    }

    // progression du process
    if (processCard && prFill) {
      const r = processCard.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (vh * 0.72 - r.top) / r.height));
      if (!REDUCED) prFill.style.transform = "scaleX(" + p + ")";
      else prFill.style.transform = "scaleX(1)";
      prSteps.forEach((s) => {
        const sr = s.getBoundingClientRect();
        s.classList.toggle("active", sr.top < vh * 0.72);
      });
    }
  };
  const loop = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => { onScroll(); ticking = false; });
    }
  };
  window.addEventListener("scroll", loop, { passive: true });
  onScroll();

  /* ---------- Menu mobile ---------- */
  const burger = $("#burger");
  if (burger) burger.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
  });
  $$(".mlink, .nav-link").forEach((a) => a.addEventListener("click", () => {
    document.body.classList.remove("menu-open");
    if (burger) { burger.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }
  }));

  /* ---------- Onglets des tarifs ---------- */
  const tabs = $$("#tabs .tab");
  const ind = $("#tabInd");
  const panels = $$(".panel");
  let activeTab = 0;
  panels.forEach((p) => $$(".p-row", p).forEach((r, i) => r.style.setProperty("--i", i)));
  const setTab = (i) => {
    activeTab = i;
    tabs.forEach((t, k) => t.classList.toggle("active", k === i));
    panels.forEach((p, k) => p.classList.toggle("active", k === i));
    if (ind && tabs[i]) {
      const r = tabs[i].getBoundingClientRect();
      const pr = ind.parentElement.getBoundingClientRect();
      ind.style.left = (r.left - pr.left) + "px";
      ind.style.width = r.width + "px";
    }
  };
  tabs.forEach((t, i) => t.addEventListener("click", () => setTab(i)));
  window.addEventListener("resize", () => setTab(activeTab));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTab(activeTab));
  setTab(0);

  // les cartes services activent l'onglet correspondant
  $$(".svc-card").forEach((c) => {
    const n = parseInt(c.dataset.tab || "0", 10);
    c.addEventListener("click", () => setTab(n));
  });

  /* ---------- Tilt 3D + reflet lumineux ---------- */
  if (!REDUCED && FINE) {
    $$(".tilt").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.transform = "perspective(900px) rotateX(" + ((0.5 - y) * 6).toFixed(2) +
          "deg) rotateY(" + ((x - 0.5) * 9).toFixed(2) + "deg) translateY(-4px)";
        el.style.setProperty("--gx", (x * 100).toFixed(1) + "%");
        el.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });

    /* ---------- Boutons magnétiques ---------- */
    $$(".magnetic").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) * 0.18;
        const dy = (e.clientY - r.top - r.height / 2) * 0.3;
        el.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)";
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- Curseur personnalisé ---------- */
  const cd = $("#curDot"), cr = $("#curRing");
  if (cd && cr && FINE && !REDUCED) {
    let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my, shown = false;
    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      cd.style.transform = "translate(" + mx + "px," + my + "px)";
      if (!shown) { shown = true; cd.style.opacity = "1"; cr.style.opacity = "1"; }
    });
    const rl = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      cr.style.transform = "translate(" + rx + "px," + ry + "px)";
      requestAnimationFrame(rl);
    };
    rl();
    const SEL = "a, button, .tab, input, select, textarea, label";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest && e.target.closest(SEL)) cr.classList.add("on");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest && e.target.closest(SEL)) cr.classList.remove("on");
    });
  }

  /* ---------- Bandeaux défilants : clonage pour boucle parfaite ---------- */
  $$(".mq-track").forEach((tr) => {
    const chunk = tr.children[0];
    if (chunk) for (let i = 0; i < 3; i++) tr.appendChild(chunk.cloneNode(true));
  });

  /* ---------- Notifications ---------- */
  const toast = $("#toast");
  let toastT;
  const say = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove("show"), 3800);
  };

  /* ---------- Formulaire (copie dans le presse-papiers) ---------- */
  const form = $("#cform");
  if (form) form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nom = ($("#cname") && $("#cname").value.trim()) || "anonyme";
    const type = ($("#ctype") && $("#ctype").value) || "projet";
    const msg = ($("#cmsg") && $("#cmsg").value.trim()) || "(pas de détail)";
    const txt = "NOUVELLE DEMANDE — NOXLAB STUDIO\nNom : " + nom + "\nProjet : " + type + "\n\n" + msg;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(() => {
        say("Message copié ! Colle-le dans notre DM TikTok, Instagram ou YouTube.");
        form.reset();
      }).catch(() => say("Impossible de copier : écris-nous directement sur nos réseaux."));
    } else {
      say("Copie bloquée par le navigateur : écris-nous directement sur nos réseaux.");
    }
  });

  /* ---------- Packs → préselectionner le type de projet ---------- */
  $$("[data-pack]").forEach((b) => b.addEventListener("click", () => {
    const sel = $("#ctype");
    if (!sel) return;
    const v = b.dataset.pack;
    if (Array.from(sel.options).some((o) => o.value === v)) sel.value = v;
  }));

  /* ---------- Retour en haut ---------- */
  if (toTop) toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });
  });

  /* ---------- Chrono de session « studio » (temps réel, sans onde) ---------- */
  (function chrono() {
    const tc = $("#tcTime");
    if (!tc) return;
    if (REDUCED) { tc.textContent = "PRÊT"; return; }
    const pad = (n) => String(n).padStart(2, "0");
    const t0 = Date.now() + 1800; // 00:00:00 quand l'intro du hero se révèle
    const tick = () => {
      const s = Math.max(0, Math.floor((Date.now() - t0) / 1000));
      tc.textContent = pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60);
      requestAnimationFrame(tick);
    };
    tick();
  })();

})();
