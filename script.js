(function () {
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const transitionMs = reduceMotion ? 0 : 420;
  const minLoaderMs = reduceMotion ? 0 : 260;
  const loadStartedAt = window.performance.now();
  let entrancePlayed = false;
  let loadingFinished = false;

  body.classList.add("is-loading");

  const loader = document.createElement("div");
  loader.className = "page-loader";
  loader.innerHTML = `
    <div class="page-loader__content" role="status" aria-live="polite" aria-label="Загрузка">
      <div class="page-loader__logo-wrap" aria-hidden="true">
        <img class="page-loader__logo" src="school-logo.svg" alt="">
      </div>
    </div>
  `;
  body.appendChild(loader);

  const layer = document.createElement("div");
  layer.className = "page-transition-layer";
  body.appendChild(layer);

  const animateEntrance = () => {
    if (reduceMotion) return;
    body.classList.add("quest-enter");
    requestAnimationFrame(() => {
      body.classList.add("quest-enter-active");
      window.setTimeout(() => {
        body.classList.remove("quest-enter", "quest-enter-active");
      }, transitionMs + 80);
    });
  };

  const finishLoading = () => {
    if (loadingFinished) return;
    loadingFinished = true;

    const elapsed = window.performance.now() - loadStartedAt;
    const waitMs = Math.max(0, minLoaderMs - elapsed);

    window.setTimeout(() => {
      body.classList.remove("is-loading");
      loader.classList.add("is-hidden");

      window.setTimeout(() => {
        loader.remove();
      }, reduceMotion ? 0 : 260);

      if (!entrancePlayed) {
        animateEntrance();
        entrancePlayed = true;
      }

      refreshOrientationHint();
    }, waitMs);
  };

  const beginExit = (href) => {
    if (body.classList.contains("quest-exit")) return;
    body.classList.add("quest-exit");
    window.setTimeout(() => {
      window.location.href = href;
    }, transitionMs);
  };

  const shouldHandleLink = (event, link) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return false;
    }

    if (link.target && link.target !== "_self") return false;

    const href = link.getAttribute("href");
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:")
    ) {
      return false;
    }

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    return true;
  };

  if (document.readyState === "complete") {
    finishLoading();
  } else {
    window.addEventListener("load", finishLoading, { once: true });
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || !shouldHandleLink(event, link)) return;

    hideTooltip();
    event.preventDefault();
    beginExit(link.href);
  });

  window.addEventListener("pageshow", (event) => {
    body.classList.remove("quest-exit");
    if (!loadingFinished) {
      finishLoading();
      return;
    }

    if (event.persisted && !reduceMotion) {
      animateEntrance();
    }

    refreshOrientationHint();
  });

  const spreadTriggers = document.querySelectorAll("[data-spread-target], [data-open-book]");
  const spreadOverlays = document.querySelectorAll("[data-spread-overlay], [data-book-spread]");
  const infoPanelTriggers = document.querySelectorAll("[data-panel-target]");
  const infoPanels = document.querySelectorAll("[data-info-panel]");
  const sliders = document.querySelectorAll("[data-slider]");
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const hoverNone = window.matchMedia("(hover: none)").matches;
  const tooltipTargets = document.querySelectorAll("[data-tooltip]");
  const orientationHintSessionKey = "alif-orientation-hint-v2-seen";
  let lastFocusedElement = null;
  let lastFocusedSpreadTrigger = null;
  let lastFocusedInfoTrigger = null;
  let activeSpreadOverlay = null;
  let activeInfoPanel = null;
  let cursorTooltip = null;
  let orientationHint = null;
  let orientationHintSeen = false;
  let orientationHintTimer = 0;
  const hasTouchLikeInput = coarse || hoverNone || (navigator.maxTouchPoints ?? 0) > 0;

  try {
    orientationHintSeen = window.sessionStorage.getItem(orientationHintSessionKey) === "1";
  } catch {
    orientationHintSeen = false;
  }

  const markOrientationHintSeen = () => {
    orientationHintSeen = true;

    try {
      window.sessionStorage.setItem(orientationHintSessionKey, "1");
    } catch {
      /* no-op */
    }
  };

  const isPhonePortrait = () => {
    const shortSide = Math.min(window.innerWidth, window.innerHeight);
    return hasTouchLikeInput && shortSide <= 820 && window.innerHeight > window.innerWidth;
  };

  const hideOrientationHint = () => {
    if (!orientationHint) return;

    orientationHint.classList.remove("is-visible");
    window.clearTimeout(orientationHintTimer);
    orientationHintTimer = 0;
  };

  const showOrientationHint = () => {
    if (!orientationHint || orientationHintSeen || !loadingFinished || !isPhonePortrait()) return;

    markOrientationHintSeen();
    window.clearTimeout(orientationHintTimer);
    window.requestAnimationFrame(() => {
      orientationHint.classList.add("is-visible");
      orientationHintTimer = window.setTimeout(() => {
        hideOrientationHint();
      }, reduceMotion ? 2600 : 4600);
    });
  };

  const refreshOrientationHint = () => {
    if (!isPhonePortrait()) {
      hideOrientationHint();
      return;
    }

    showOrientationHint();
  };

  orientationHint = document.createElement("div");
  orientationHint.className = "orientation-hint";
  orientationHint.innerHTML = `
    <div class="orientation-hint__card" role="status" aria-live="polite">
      <p class="orientation-hint__text">Для лучшего просмотра переверните телефон горизонтально</p>
      <button class="orientation-hint__close" type="button" aria-label="Закрыть подсказку">
        Понятно
      </button>
    </div>
  `;
  orientationHint.querySelector(".orientation-hint__close")?.addEventListener("click", () => {
    markOrientationHintSeen();
    hideOrientationHint();
  });
  body.appendChild(orientationHint);
  window.addEventListener("orientationchange", refreshOrientationHint);
  window.addEventListener("resize", refreshOrientationHint);

  const hideTooltip = () => {
    cursorTooltip?.classList.remove("is-visible");
  };

  const positionTooltip = (clientX, clientY) => {
    if (!cursorTooltip) return;

    const padding = 12;
    const offsetX = 18;
    const offsetY = 18;
    const width = cursorTooltip.offsetWidth;
    const height = cursorTooltip.offsetHeight;
    const left = Math.min(clientX + offsetX, window.innerWidth - width - padding);
    const top = Math.max(padding, clientY - height - offsetY);

    cursorTooltip.style.left = `${left}px`;
    cursorTooltip.style.top = `${top}px`;
  };

  const resolveSpreadOverlay = (trigger) => {
    const overlayId = trigger?.dataset.spreadTarget || trigger?.getAttribute("aria-controls");
    return overlayId ? document.getElementById(overlayId) : null;
  };

  const openSpread = (trigger) => {
    const overlay = resolveSpreadOverlay(trigger);
    if (!overlay) return;

    const closeButton = overlay.querySelector("[data-close-spread], [data-close-book]");

    hideTooltip();
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lastFocusedSpreadTrigger = trigger;
    activeSpreadOverlay = overlay;
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    body.classList.add("book-spread-open");
    window.requestAnimationFrame(() => {
      closeButton?.focus();
    });
  };

  const closeSpread = () => {
    if (!activeSpreadOverlay) return;

    activeSpreadOverlay.hidden = true;
    activeSpreadOverlay.setAttribute("aria-hidden", "true");
    body.classList.remove("book-spread-open");

    if (lastFocusedSpreadTrigger instanceof HTMLElement) {
      lastFocusedSpreadTrigger.focus();
    } else if (lastFocusedElement instanceof HTMLElement) {
      lastFocusedElement.focus();
    }

    activeSpreadOverlay = null;
  };

  const openInfoPanel = (trigger) => {
    const panelId = trigger?.dataset.panelTarget;
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel) return;

    hideTooltip();
    lastFocusedInfoTrigger = trigger;
    activeInfoPanel = panel;
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    body.classList.add("info-panel-open");
    window.requestAnimationFrame(() => {
      panel.querySelector("[data-close-info-panel]")?.focus();
    });
  };

  const closeInfoPanel = () => {
    if (!activeInfoPanel) return;

    activeInfoPanel.hidden = true;
    activeInfoPanel.setAttribute("aria-hidden", "true");
    body.classList.remove("info-panel-open");

    if (lastFocusedInfoTrigger instanceof HTMLElement) {
      lastFocusedInfoTrigger.focus();
    }

    activeInfoPanel = null;
  };

  spreadTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      openSpread(trigger);
    });
  });

  spreadOverlays.forEach((overlay) => {
    overlay.querySelectorAll("[data-close-spread], [data-close-book]").forEach((button) => {
      button.addEventListener("click", () => {
        if (activeSpreadOverlay === overlay) {
          closeSpread();
          return;
        }

        overlay.hidden = true;
        overlay.setAttribute("aria-hidden", "true");
      });
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        if (activeSpreadOverlay === overlay) {
          closeSpread();
          return;
        }

        overlay.hidden = true;
        overlay.setAttribute("aria-hidden", "true");
      }
    });

    overlay.querySelector(".book-spread__panel")?.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  });

  infoPanelTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      openInfoPanel(trigger);
    });
  });

  infoPanels.forEach((panel) => {
    panel.querySelector("[data-close-info-panel]")?.addEventListener("click", () => {
      if (activeInfoPanel === panel) {
        closeInfoPanel();
        return;
      }

      panel.hidden = true;
      panel.setAttribute("aria-hidden", "true");
    });

    panel.addEventListener("click", (event) => {
      if (event.target === panel) {
        if (activeInfoPanel === panel) {
          closeInfoPanel();
          return;
        }

        panel.hidden = true;
        panel.setAttribute("aria-hidden", "true");
      }
    });
  });

  sliders.forEach((slider) => {
    const track = slider.querySelector("[data-slider-track]");
    const slides = Array.from(slider.querySelectorAll("[data-slide]"));
    const prevButton = slider.querySelector("[data-slider-prev]");
    const nextButton = slider.querySelector("[data-slider-next]");
    const dots = Array.from(slider.querySelectorAll("[data-slider-dot]"));

    if (!track || slides.length === 0) return;

    let activeIndex = 0;

    const renderSlider = () => {
      track.style.transform = `translateX(-${activeIndex * 100}%)`;

      prevButton?.toggleAttribute("disabled", activeIndex === 0);
      nextButton?.toggleAttribute("disabled", activeIndex === slides.length - 1);

      slides.forEach((slide, index) => {
        slide.setAttribute("aria-hidden", String(index !== activeIndex));
      });

      dots.forEach((dot, index) => {
        const isActive = index === activeIndex;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-pressed", String(isActive));
      });
    };

    prevButton?.addEventListener("click", () => {
      activeIndex = Math.max(0, activeIndex - 1);
      renderSlider();
    });

    nextButton?.addEventListener("click", () => {
      activeIndex = Math.min(slides.length - 1, activeIndex + 1);
      renderSlider();
    });

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        activeIndex = index;
        renderSlider();
      });
    });

    renderSlider();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && body.classList.contains("info-panel-open")) {
      closeInfoPanel();
      return;
    }

    if (event.key === "Escape" && body.classList.contains("book-spread-open")) {
      closeSpread();
    }
  });

  if (!coarse && tooltipTargets.length > 0) {
    cursorTooltip = document.createElement("div");
    cursorTooltip.className = "cursor-tooltip";
    body.appendChild(cursorTooltip);

    tooltipTargets.forEach((target) => {
      const text = target.dataset.tooltip;
      if (!text) return;

      target.addEventListener("pointerenter", (event) => {
        cursorTooltip.textContent = text;
        cursorTooltip.classList.add("is-visible");
        positionTooltip(event.clientX, event.clientY);
      });

      target.addEventListener("pointermove", (event) => {
        if (!cursorTooltip.classList.contains("is-visible")) return;
        positionTooltip(event.clientX, event.clientY);
      });

      target.addEventListener("pointerleave", hideTooltip);

      target.addEventListener("focus", () => {
        const rect = target.getBoundingClientRect();
        cursorTooltip.textContent = text;
        cursorTooltip.classList.add("is-visible");
        positionTooltip(rect.left + rect.width / 2, rect.top);
      });

      target.addEventListener("blur", hideTooltip);
    });

    window.addEventListener("scroll", hideTooltip, { passive: true });
    window.addEventListener("resize", hideTooltip);
  }

  if (coarse) {
    const hotspots = document.querySelectorAll(".hotspot[data-preview-class]");
    hotspots.forEach((spot) => {
      if (spot.matches("a[href]")) return;

      let previewed = false;

      spot.addEventListener("click", (event) => {
        const scene = spot.closest(".scene");
        const previewClass = spot.dataset.previewClass;
        if (!scene || !previewClass) return;

        if (!previewed) {
          event.preventDefault();
          scene.classList.add(previewClass);
          previewed = true;
          window.setTimeout(() => {
            previewed = false;
            scene.classList.remove(previewClass);
          }, 1200);
        }
      });
    });
  }
})();
