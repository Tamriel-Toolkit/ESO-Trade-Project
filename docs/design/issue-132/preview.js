/* Shared read-only preview behavior. Not a replacement for production handlers. */
(() => {
  "use strict";
  const data = window.REVIEW_DATA;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const state = {
    screen: "home",
    query: "",
    category: "",
    display: "populated",
    bar: "front",
  };
  const qualityNames = [
    "Unknown",
    "Normal",
    "Fine",
    "Superior",
    "Epic",
    "Legendary",
  ];
  const gold = (number) => `${number.toLocaleString("en-US")}g`;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function cell(className, strong, small) {
    const node = element("span", className);
    node.append(element("strong", "", strong), element("small", "", small));
    return node;
  }
  function announce(message) {
    let node = $("[data-announcement]");
    if (!node) {
      node = element("div", "review-announcement");
      node.dataset.announcement = "";
      node.setAttribute("role", "status");
      Object.assign(node.style, {
        position: "fixed",
        bottom: "20px",
        left: "20px",
        right: "20px",
        maxWidth: "620px",
        margin: "auto",
        padding: "14px 18px",
        background: "#efe9dc",
        color: "#222722",
        border: "1px solid #776246",
        zIndex: "100",
      });
      document.body.append(node);
    }
    node.hidden = false;
    node.textContent = message;
    clearTimeout(announce.timeout);
    announce.timeout = setTimeout(() => {
      node.hidden = true;
    }, 4500);
  }
  function show(screen) {
    if (!["home", "marketplace", "characters"].includes(screen)) return;
    const movedFromHiddenContent =
      document.activeElement?.closest("[data-screen]")?.dataset.screen !==
        screen && Boolean(document.activeElement?.closest("[data-screen]"));
    state.screen = screen;
    $$("[data-state]").forEach((node) => {
      node.disabled = screen !== "marketplace";
      node.title = "Marketplace listing-state preview";
    });
    $$("[data-screen]").forEach((node) => {
      node.hidden = node.dataset.screen !== screen;
    });
    $$("[data-go]").forEach((node) => {
      node.classList.toggle("active", node.dataset.go === screen);
      if (node.dataset.go === screen) node.setAttribute("aria-current", "page");
      else node.removeAttribute("aria-current");
    });
    document.title = `${screen[0].toUpperCase() + screen.slice(1)} · ${document.body.dataset.concept || "Design review"} · Tamriel Trade Hub`;
    const url = new URL(location.href);
    url.searchParams.set("screen", screen);
    history.replaceState(null, "", url);
    if (window.parent !== window)
      window.parent.postMessage(
        { type: "design-review-screen", screen },
        location.origin,
      );
    window.scrollTo({ top: 0, behavior: "instant" });
    render();
    if (movedFromHiddenContent) {
      const heading =
        $(`[data-screen="${screen}"] h1`) || $(`[data-screen="${screen}"]`);
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
  }
  function render() {
    const rows = data.listings.filter(
      (item) =>
        item.name.toLowerCase().includes(state.query.toLowerCase()) &&
        (!state.category || item.category === state.category),
    );
    $$("[data-count], [data-result-count]").forEach((node) => {
      node.textContent = state.display === "populated" ? rows.length : "0";
    });
    $$("[data-listings]").forEach((container) => {
      container.replaceChildren();
      container.setAttribute("aria-busy", String(state.display === "loading"));
      if (state.display !== "populated" || rows.length === 0) {
        const messages = {
          loading: [
            "Loading listings…",
            "Reviewing the existing loading treatment.",
          ],
          empty: [
            "No matching listings",
            "Try another item name or adjust the filters.",
          ],
          error: [
            "Listings could not be loaded",
            "An error-state design sample. No service request was made.",
          ],
        };
        const [heading, copy] = messages[state.display] || messages.empty;
        const node = element("div", "preview-state");
        node.setAttribute("role", "status");
        node.append(element("h3", "", heading), element("p", "", copy));
        container.append(node);
        return;
      }
      rows.forEach((item) => {
        const index = data.listings.indexOf(item);
        const row = element("button", "listing-row");
        row.type = "button";
        row.dataset.item = index;
        row.setAttribute(
          "aria-label",
          `View ${item.name}, ${gold(item.price)} each`,
        );
        const identity = element("span", "item-identity");
        const icon = element(
          "span",
          "item-icon",
          item.category === "Jewelry"
            ? "◇"
            : item.category === "Materials"
              ? "⌁"
              : item.category === "Furnishings"
                ? "⌂"
                : "▤",
        );
        icon.setAttribute("aria-hidden", "true");
        const copy = element("span", "item-copy");
        copy.append(
          element("strong", "item-name", item.name),
          element(
            "span",
            `item-meta quality-${item.quality}`,
            `${qualityNames[item.quality]} · ${item.category} · ${item.subcategory}`,
          ),
        );
        identity.append(icon, copy);
        const price = cell("price-cell", gold(item.price), "each");
        price.append(
          element(
            "small",
            "stack-price",
            `${gold(item.price * item.quantity)} / stack`,
          ),
        );
        const trader = cell("trader-cell", item.guild, item.location);
        trader.append(element("small", "seller-name", item.seller));
        const total = item.stacks * item.quantity;
        row.append(
          identity,
          price,
          cell(
            "stack-cell",
            `${item.stacks} ${item.stacks === 1 ? "stack" : "stacks"}`,
            `${item.quantity} each · ${total} ${total === 1 ? "item" : "items"}`,
          ),
          trader,
          element("span", "freshness", "3 Sep"),
        );
        row.addEventListener("click", () => openItem(index));
        container.append(row);
      });
    });
    $$("[data-gear]").forEach((container) => {
      container.replaceChildren();
      data.gear
        .filter((item) => !item.bar || item.bar === state.bar)
        .forEach((item) => {
          const row = element("div", "gear-row");
          row.append(
            element("span", "slot-label", item.slot),
            cell(
              "gear-copy",
              item.name,
              `${item.quality} · ${item.trait} · ${item.set}`,
            ),
          );
          row.querySelector("strong").className = "gear-name";
          row.querySelector("small").className = "gear-meta";
          container.append(row);
        });
    });
  }
  function openItem(index) {
    const item = data.listings[index];
    const dialog = $("#item-detail");
    const content = $("[data-detail-content]");
    if (!dialog || !content) return;
    content.replaceChildren();
    const heading = element("h2", "", item.name);
    heading.id = "detail-title";
    dialog.setAttribute("aria-labelledby", "detail-title");
    content.append(
      heading,
      element(
        "p",
        "item-meta",
        `${qualityNames[item.quality]} · ${item.category} · ${item.subcategory}`,
      ),
    );
    const list = element("dl", "detail-data");
    [
      ["Unit price", gold(item.price)],
      ["Per stack", gold(item.price * item.quantity)],
      [
        "Observed quantity",
        `${item.stacks} stacks · ${item.quantity} each · ${item.stacks * item.quantity} items`,
      ],
      ["Seller", item.seller],
      ["Guild trader", item.guild],
      ["Location", item.location],
      ["Observed", item.observed],
    ].forEach(([label, value]) => {
      list.append(element("dt", "", label), element("dd", "", value));
    });
    content.append(
      list,
      element(
        "p",
        "review-note",
        "Historical reference snapshot, not current availability.",
      ),
    );
    if (!dialog.open) dialog.showModal();
  }
  $$("[data-go]").forEach((node) =>
    node.addEventListener("click", (event) => {
      event.preventDefault();
      show(node.dataset.go);
    }),
  );
  $$("[data-categories]").forEach((container) => {
    data.categories.forEach((category, index) => {
      const button = element("button", "category-link");
      button.type = "button";
      button.dataset.filterCategory = category;
      button.append(
        element("span", "category-index", String(index + 1).padStart(2, "0")),
        element("span", "category-name", category),
        element("span", "category-arrow", "↗"),
      );
      button.addEventListener("click", () => {
        state.category = category;
        $$("[data-category]").forEach((node) => {
          node.value = category;
        });
        show("marketplace");
      });
      container.append(button);
    });
  });
  Object.entries(data.character).forEach(([key, value]) => {
    $$(`[data-character-${key}]`).forEach((node) => {
      node.textContent = key === "level" ? `Level ${value}` : value;
    });
  });
  $$("[data-search]").forEach((node) =>
    node.addEventListener("input", () => {
      state.query = node.value;
      render();
    }),
  );
  $$("[data-category]").forEach((node) => {
    data.categories.forEach((category) => {
      if (![...node.options].some((option) => option.value === category))
        node.append(new Option(category, category));
    });
    node.addEventListener("change", () => {
      state.category = node.value;
      render();
    });
  });
  $$("[data-state]").forEach((node) =>
    node.addEventListener("change", () => {
      state.display = node.value;
      render();
    }),
  );
  $$("[data-bar], [data-weapon-bar]").forEach((node) =>
    node.addEventListener("click", () => {
      state.bar = node.dataset.bar || node.dataset.weaponBar;
      $$("[data-bar], [data-weapon-bar]").forEach((button) => {
        button.classList.toggle("active", button === node);
        button.setAttribute("aria-pressed", String(button === node));
      });
      render();
    }),
  );
  $$("[data-close]").forEach((node) =>
    node.addEventListener("click", () => node.closest("dialog")?.close()),
  );
  $$(
    "[data-preview-only], [data-unavailable], [data-settings-open], [data-account-open], [data-save-search]",
  ).forEach((node) =>
    node.addEventListener("click", (event) => {
      event.preventDefault();
      announce(
        "Visual reference only. This action stays unchanged in the application; no data was saved or changed.",
      );
    }),
  );
  $$("[data-saved-search]").forEach((node) =>
    node.addEventListener("click", () => {
      state.query = node.dataset.savedSearch;
      $$("[data-search]").forEach((input) => {
        input.value = state.query;
      });
      show("marketplace");
    }),
  );
  $$("[data-hub], [data-quality], [data-last-seen], [data-sort]").forEach(
    (node) =>
      node.addEventListener("change", () =>
        announce(
          "Filter styling sample only. Search and category demonstrate filtering in this reference preview.",
        ),
      ),
  );
  $$("[data-clear]").forEach((node) =>
    node.addEventListener("click", () => {
      state.query = "";
      state.category = "";
      state.display = "populated";
      $$("[data-search]").forEach((n) => {
        n.value = "";
      });
      $$("[data-category]").forEach((n) => {
        n.value = "";
      });
      $$("[data-state]").forEach((n) => {
        n.value = "populated";
      });
      render();
    }),
  );
  show(new URLSearchParams(location.search).get("screen") || "home");
})();
