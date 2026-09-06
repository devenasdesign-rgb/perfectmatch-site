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

  /* Полоса над шапкой во встроенных браузерах (Telegram и подобные).
     Такие браузеры сдвигают точку прилипания вниз на высоту своей
     полупрозрачной панели, и над шапкой видно прокручивающийся контент.
     Высоту этого отступа заранее не знает никто, поэтому меряем реальное
     положение шапки и закрываем полосу фиксированной заглушкой.
     Это обычный div: его, в отличие от вложенного блока или тени,
     не может обрезать ни backdrop-filter, ни overflow родителя. */
  if (header) {
    const filler = document.createElement("div");
    filler.className = "header-filler";
    document.body.appendChild(filler);

    let fillerTicking = false;
    const syncFiller = () => {
      const gap = header.getBoundingClientRect().top;
      filler.style.height = gap > 0 ? gap + "px" : "0px";
      fillerTicking = false;
    };
    const scheduleFiller = () => {
      if (!fillerTicking) {
        fillerTicking = true;
        requestAnimationFrame(syncFiller);
      }
    };
    syncFiller();
    window.addEventListener("scroll", scheduleFiller, { passive: true });
    window.addEventListener("resize", scheduleFiller);
    window.addEventListener("orientationchange", scheduleFiller);
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
      /* threshold в долях элемента не годится: блок с текстом политики
         высотой ~9000px никогда не покажет 15% себя в окне 900px, и такой
         блок оставался невидимым навсегда. Считаем появлением любое
         пересечение, а нужную задержку даёт отрицательный rootMargin. */
      { threshold: 0, rootMargin: "0px 0px -80px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));

    /* Страховка на случай, если наблюдатель не отработал (фоновая вкладка,
       остановленная отрисовка). Проверяем каждый элемент отдельно: раньше
       условие смотрело, показался ли хоть один, и не спасало страницу,
       где часть блоков уже видна, а один застрял невидимым. */
    const forceReveal = () => revealEls.forEach((el) => el.classList.add("in-view"));
    setTimeout(() => {
      revealEls.forEach((el) => {
        if (el.classList.contains("in-view")) return;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("in-view");
      });
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

  /* Request form(s) — на главной есть форма прямо в блоке, и такая же
     форма живёт в попапе на всех страницах, поэтому логика вынесена
     в функцию и работает через name-атрибуты, а не id (id должны быть
     уникальны, а форм на странице может быть несколько). */
  const bindRequestForm = (form) => {
    const nameInput = form.querySelector('input[name="name"]');
    const contactInput = form.querySelector('input[name="contact"]');
    const nameField = nameInput.closest(".field");
    const contactField = contactInput.closest(".field");
    const consent = form.querySelector('input[name="consent"]');
    const success = form.querySelector(".rf-success");

    const clearOnInput = (field) => {
      field.querySelector("input").addEventListener("input", () => field.classList.remove("invalid"));
    };
    clearOnInput(nameField);
    clearOnInput(contactField);
    consent.addEventListener("change", () => form.classList.remove("consent-invalid"));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const contact = contactInput.value.trim();

      let ok = true;
      nameField.classList.toggle("invalid", !name);
      if (!name) ok = false;
      contactField.classList.toggle("invalid", !contact);
      if (!contact) ok = false;
      form.classList.toggle("consent-invalid", !consent.checked);
      if (!consent.checked) ok = false;

      if (!ok) {
        form.querySelector(".field.invalid input, input[name='consent']")?.focus();
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
  };
  document.querySelectorAll(".request-form").forEach(bindRequestForm);

  /* Ссылка на политику лежит внутри <label> чекбокса — без этого клик по
     ней заодно переключал бы согласие. */
  document.querySelectorAll(".field-check .policy-link").forEach((link) => {
    link.addEventListener("click", (e) => e.stopPropagation());
  });

  /* Попап заявки — открывается по кнопкам «Обсудить задачу»
     и «Получить HR-диагностику» вместо перехода к якорю #contact. */
  const modal = document.getElementById("requestModal");
  if (modal) {
    const closeBtn = modal.querySelector(".modal-close");
    let lastFocused = null;

    const openModal = () => {
      lastFocused = document.activeElement;
      modal.classList.add("open");
      document.body.style.overflow = "hidden";
      modal.querySelector('input[name="name"]')?.focus({ preventScroll: true });
    };

    const closeModal = () => {
      modal.classList.remove("open");
      document.body.style.overflow = "";
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus({ preventScroll: true });
      }
    };

    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
    });

    const triggerLabels = ["обсудить задачу", "получить hr-диагностику", "получить расчёт"];
    document.querySelectorAll("a.btn, button.btn").forEach((el) => {
      if (modal.contains(el)) return;
      if (!triggerLabels.includes(el.textContent.trim().toLowerCase())) return;
      el.addEventListener("click", (e) => {
        e.preventDefault();
        openModal();
      });
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
