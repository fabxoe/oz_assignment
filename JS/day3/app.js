(() => {
  "use strict";

  const API_URL = "https://api4.binance.com/api/v3/ticker/24hr";
  const FAVORITES_KEY = "cryptoFavorites";
  const POLL_INTERVAL = 1000;

  const state = {
    tickers: [],
    favorites: loadFavorites(),
    activeTab: "all",
    query: "",
    requestInFlight: false,
    pollId: null,
  };

  const elements = {
    marketCard: document.querySelector(".market-card"),
    marketStatus: document.querySelector("#marketStatus"),
    updatedAt: document.querySelector("#updatedAt"),
    tickerBody: document.querySelector("#tickerBody"),
    searchInput: document.querySelector("#searchInput"),
    favoriteCount: document.querySelector("#favoriteCount"),
    tabs: [...document.querySelectorAll(".tab")],
  };

  function loadFavorites() {
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");

      if (!Array.isArray(saved)) {
        return new Set();
      }

      return new Set(
        saved.filter(
          (symbol) =>
            typeof symbol === "string" &&
            /^[A-Z0-9]+USDT$/.test(symbol)
        )
      );
    } catch {
      return new Set();
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify([...state.favorites])
      );
      return true;
    } catch {
      setStatus(
        "관심 종목을 브라우저에 저장하지 못했습니다.",
        "error"
      );
      return false;
    }
  }

  function setStatus(message, type = "loading") {
    elements.marketStatus.textContent = message;
    elements.marketCard.dataset.status = type;
  }

  function normalizeTicker(ticker) {
    const lastPrice = Number(ticker.lastPrice);
    const changePercent = Number(ticker.priceChangePercent);
    const highPrice = Number(ticker.highPrice);
    const lowPrice = Number(ticker.lowPrice);

    if (
      typeof ticker.symbol !== "string" ||
      !ticker.symbol.endsWith("USDT") ||
      ![lastPrice, changePercent, highPrice, lowPrice].every(Number.isFinite)
    ) {
      return null;
    }

    return {
      symbol: ticker.symbol,
      lastPrice,
      changePercent,
      highPrice,
      lowPrice,
    };
  }

  async function fetchTickers() {
    if (state.requestInFlight) {
      return;
    }

    state.requestInFlight = true;

    if (state.tickers.length === 0) {
      setStatus("시장 데이터를 불러오는 중입니다.");
    }

    try {
      const response = await fetch(API_URL, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`API 요청 실패 (${response.status})`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("예상하지 못한 API 응답입니다.");
      }

      state.tickers = data
        .map(normalizeTicker)
        .filter((ticker) => ticker !== null);

      renderTable();
      setStatus(
        `${state.tickers.length.toLocaleString("ko-KR")}개 USDT 종목을 실시간으로 표시하고 있습니다.`,
        "success"
      );
      elements.updatedAt.textContent = new Date().toLocaleTimeString("ko-KR", {
        hour12: false,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "알 수 없는 오류";
      setStatus(
        `가격 정보를 갱신하지 못했습니다. 자동으로 다시 시도합니다. (${reason})`,
        "error"
      );

      if (state.tickers.length === 0) {
        renderMessage("시장 데이터를 불러오지 못했습니다. 잠시 후 다시 시도합니다.");
      }
    } finally {
      state.requestInFlight = false;
    }
  }

  function getVisibleTickers() {
    return state.tickers.filter((ticker) => {
      const matchesTab =
        state.activeTab === "all" || state.favorites.has(ticker.symbol);
      const matchesSearch =
        state.query === "" || ticker.symbol.includes(state.query);

      return matchesTab && matchesSearch;
    });
  }

  function formatPrice(price) {
    let maximumFractionDigits = 8;

    if (price >= 1000) {
      maximumFractionDigits = 2;
    } else if (price >= 1) {
      maximumFractionDigits = 4;
    } else if (price >= 0.01) {
      maximumFractionDigits = 6;
    }

    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits,
      minimumFractionDigits: 0,
    }).format(price);
  }

  function formatChange(change) {
    return `${change > 0 ? "+" : ""}${change.toFixed(2)}%`;
  }

  function getChangeClass(change) {
    if (change > 0) {
      return "positive";
    }

    if (change < 0) {
      return "negative";
    }

    return "neutral";
  }

  function createCell(text, className = "") {
    const cell = document.createElement("td");
    cell.textContent = text;

    if (className) {
      cell.className = className;
    }

    return cell;
  }

  function createTickerRow(ticker) {
    const row = document.createElement("tr");
    const favoriteCell = document.createElement("td");
    const favoriteButton = document.createElement("button");
    const isFavorite = state.favorites.has(ticker.symbol);

    favoriteButton.type = "button";
    favoriteButton.className = `favorite-button${isFavorite ? " selected" : ""}`;
    favoriteButton.dataset.symbol = ticker.symbol;
    favoriteButton.setAttribute("aria-pressed", String(isFavorite));
    favoriteButton.setAttribute(
      "aria-label",
      `${ticker.symbol} 관심 종목 ${isFavorite ? "삭제" : "추가"}`
    );
    favoriteButton.textContent = isFavorite ? "★" : "☆";
    favoriteCell.append(favoriteButton);

    row.append(
      favoriteCell,
      createCell(ticker.symbol, "symbol"),
      createCell(formatPrice(ticker.lastPrice), "numeric"),
      createCell(
        formatChange(ticker.changePercent),
        `numeric change ${getChangeClass(ticker.changePercent)}`
      ),
      createCell(formatPrice(ticker.highPrice), "numeric"),
      createCell(formatPrice(ticker.lowPrice), "numeric")
    );

    return row;
  }

  function renderMessage(message) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    row.className = "message-row";
    cell.colSpan = 6;
    cell.textContent = message;
    row.append(cell);
    elements.tickerBody.replaceChildren(row);
  }

  function renderTable() {
    const visibleTickers = getVisibleTickers();

    elements.favoriteCount.textContent = String(state.favorites.size);

    if (visibleTickers.length === 0) {
      const message =
        state.activeTab === "favorites" && state.favorites.size === 0
          ? "아직 저장한 관심 종목이 없습니다."
          : "검색 조건에 맞는 USDT 종목이 없습니다.";
      renderMessage(message);
      return;
    }

    const fragment = document.createDocumentFragment();

    visibleTickers.forEach((ticker) => {
      fragment.append(createTickerRow(ticker));
    });

    elements.tickerBody.replaceChildren(fragment);
  }

  function toggleFavorite(symbol) {
    if (state.favorites.has(symbol)) {
      state.favorites.delete(symbol);
    } else {
      state.favorites.add(symbol);
    }

    saveFavorites();
    renderTable();
  }

  function selectTab(tabName) {
    state.activeTab = tabName;

    elements.tabs.forEach((tab) => {
      const isActive = tab.dataset.tab === tabName;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    renderTable();
  }

  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toUpperCase();
    renderTable();
  });

  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      selectTab(tab.dataset.tab);
    });
  });

  elements.tickerBody.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest(".favorite-button");

    if (favoriteButton) {
      toggleFavorite(favoriteButton.dataset.symbol);
    }
  });

  window.addEventListener("beforeunload", () => {
    window.clearInterval(state.pollId);
  });

  elements.favoriteCount.textContent = String(state.favorites.size);
  fetchTickers();
  state.pollId = window.setInterval(fetchTickers, POLL_INTERVAL);
})();
