/* Preloader — знак логотипа переливается, пока грузится страница */
(() => {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;

  const root = document.documentElement;
  root.classList.add("is-loading");

  /* минимальное время показа, чтобы перелив успел прочитаться */
  const MIN_MS = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 400 : 2300;
  let hidden = false;

  const hide = () => {
    if (hidden) return;
    hidden = true;
    const wait = Math.max(0, MIN_MS - performance.now());
    setTimeout(() => {
      preloader.classList.add("done");
      root.classList.remove("is-loading");
      setTimeout(() => preloader.remove(), 700);
    }, wait);
  };

  if (document.readyState === "complete") hide();
  else window.addEventListener("load", hide);

  /* страховка: не держим страницу дольше 4.5 с, даже если что-то не догрузилось */
  setTimeout(hide, 4500);
})();

document.addEventListener("DOMContentLoaded", () => {
  /* Sticky header shadow */
  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Mobile nav toggle */
  const navToggle = document.querySelector(".nav-toggle");
  const mobileNav = document.querySelector(".mobile-nav");
  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", () => {
      const willOpen = !mobileNav.classList.contains("open");
      navToggle.classList.toggle("open", willOpen);
      mobileNav.classList.toggle("open", willOpen);
      document.body.style.overflow = willOpen ? "hidden" : "";
    });
    mobileNav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        navToggle.classList.remove("open");
        mobileNav.classList.remove("open");
        document.body.style.overflow = "";
      });
    });
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Scroll progress bar */
  if (!reduceMotion) {
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    document.body.appendChild(bar);
    let ticking = false;
    const updateBar = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = `scaleX(${p})`;
      ticking = false;
    };
    updateBar();
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateBar);
        }
      },
      { passive: true }
    );
  }

  /* Hero mark parallax (pointer + scroll) */
  const heroMark = document.querySelector(".hero-mark-bg");
  const hero = document.querySelector(".hero");
  if (heroMark && hero && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    let px = 0,
      py = 0,
      sy = 0,
      raf = null;
    const apply = () => {
      heroMark.style.setProperty("--mark-x", `${px}px`);
      heroMark.style.setProperty("--mark-y", `${py + sy}px`);
      raf = null;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    hero.addEventListener(
      "mousemove",
      (e) => {
        const r = hero.getBoundingClientRect();
        px = ((e.clientX - r.left) / r.width - 0.5) * -26;
        py = ((e.clientY - r.top) / r.height - 0.5) * -18;
        schedule();
      },
      { passive: true }
    );
    hero.addEventListener("mouseleave", () => {
      px = 0;
      py = 0;
      schedule();
    });
    window.addEventListener(
      "scroll",
      () => {
        sy = Math.min(window.scrollY, 600) * 0.12;
        schedule();
      },
      { passive: true }
    );
  }

  /* Reveal on scroll */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));

    /* Страховка: если наблюдатель по какой-то причине не отработал
       (фоновая вкладка, отключённая анимация кадров) — показываем контент. */
    const forceReveal = () => revealEls.forEach((el) => el.classList.add("in-view"));
    setTimeout(() => {
      if (!document.querySelector(".reveal.in-view")) forceReveal();
    }, 3000);
    window.addEventListener("beforeprint", forceReveal);
  } else {
    revealEls.forEach((el) => el.classList.add("in-view"));
  }

  /* Animated stat counters */
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    const animateCounter = (el) => {
      const target = parseInt(el.getAttribute("data-count"), 10) || 0;
      const suffix = el.getAttribute("data-suffix") || "";
      const duration = 1400;
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if ("IntersectionObserver" in window) {
      const cio = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              cio.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      counters.forEach((el) => cio.observe(el));
    } else {
      counters.forEach(animateCounter);
    }
  }

  /* Request form */
  const requestForm = document.querySelector(".request-form");
  if (requestForm) {
    const nameField = requestForm.querySelector("#rf-name").closest(".field");
    const contactField = requestForm.querySelector("#rf-contact").closest(".field");
    const consent = requestForm.querySelector('input[name="consent"]');
    const success = requestForm.querySelector(".rf-success");

    const clearOnInput = (field) => {
      field.querySelector("input").addEventListener("input", () => field.classList.remove("invalid"));
    };
    clearOnInput(nameField);
    clearOnInput(contactField);
    consent.addEventListener("change", () => requestForm.classList.remove("consent-invalid"));

    requestForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = requestForm.querySelector("#rf-name").value.trim();
      const contact = requestForm.querySelector("#rf-contact").value.trim();

      let ok = true;
      nameField.classList.toggle("invalid", !name);
      if (!name) ok = false;
      contactField.classList.toggle("invalid", !contact);
      if (!contact) ok = false;
      requestForm.classList.toggle("consent-invalid", !consent.checked);
      if (!consent.checked) ok = false;

      if (!ok) {
        requestForm.querySelector(".field.invalid input, input[name='consent']")?.focus();
        return;
      }

      /* Статический сайт — заявка уходит письмом.
         Перед запуском заменить на реальный endpoint (CRM / Formspree / бэкенд). */
      const subject = "Заявка с сайта PerfectMatch";
      const body = `Имя: ${name}\nКонтакт: ${contact}\n\nОтправлено с сайта perfectmatch.pro`;
      window.location.href =
        "mailto:p.yasin@perfectmatch.pro?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);

      success.hidden = false;
    });
  }

  /* Testimonial carousel */
  const testiRoot = document.querySelector("[data-testimonials]");
  if (testiRoot) {
    const slides = JSON.parse(testiRoot.getAttribute("data-testimonials"));
    let index = 0;
    const quoteEl = testiRoot.querySelector(".testi-quote p");
    const nameEl = testiRoot.querySelector(".testi-person strong");
    const roleEl = testiRoot.querySelector(".testi-person span");
    const companyEl = testiRoot.querySelector(".testi-person .company");
    const logoEl = testiRoot.querySelector(".testi-logo");
    const counterEl = testiRoot.querySelector(".testi-counter");
    const prevBtn = testiRoot.querySelector(".testi-prev");
    const nextBtn = testiRoot.querySelector(".testi-next");

    const render = () => {
      const s = slides[index];
      const card = testiRoot.querySelector(".testi-card");
      card.style.opacity = 0;
      setTimeout(() => {
        quoteEl.textContent = `«${s.quote}»`;
        nameEl.textContent = s.name;
        roleEl.textContent = s.role;
        companyEl.textContent = s.company;
        if (logoEl) {
          if (s.logo) {
            logoEl.src = s.logo;
            logoEl.alt = s.company;
            logoEl.hidden = false;
          } else {
            logoEl.hidden = true;
          }
        }
        counterEl.textContent = `${index + 1} / ${slides.length}`;
        card.style.opacity = 1;
      }, 180);
    };
    prevBtn.addEventListener("click", () => {
      index = (index - 1 + slides.length) % slides.length;
      render();
    });
    nextBtn.addEventListener("click", () => {
      index = (index + 1) % slides.length;
      render();
    });

    render();
  }
});
