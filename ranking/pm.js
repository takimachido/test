import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(cors());

const KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2";
const MARKETS_URL = `${KALSHI_BASE}/markets`;
const SERIES_URL = `${KALSHI_BASE}/series`;

const HERO_TTL_MS = 60 * 1000;
const CRYPTO_TTL_MS = 60 * 1000;
const SERIES_TTL_MS = 6 * 60 * 60 * 1000;
const META_TTL_MS = 15 * 60 * 1000;

const heroCache = { ts: 0, data: null };
const cryptoCache = { ts: 0, data: null };
const seriesCache = { ts: 0, data: null };
const metaCache = new Map();

const http = axios.create({
  timeout: 15000,
  headers: { Accept: "application/json" }
});

const isAbsUrl = (u) => typeof u === "string" && /^https?:\/\//i.test(u);
const absImg = (u) => {
  if (!u) return null;
  if (isAbsUrl(u)) return u;
  if (u.startsWith("/")) return `https://kalshi.com${u}`;
  return `https://kalshi.com/${u}`;
};

const toNum = (v) => {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
};

const clampPct = (n) => {
  if (n === null) return null;
  const x = Math.round(n);
  return Math.max(0, Math.min(100, x));
};

const priceCents = (m) => {
  const lp = toNum(m.last_price);
  if (lp !== null) return clampPct(lp);
  const lpd = toNum(m.last_price_dollars);
  if (lpd !== null) return clampPct(lpd * 100);
  const yb = toNum(m.yes_bid);
  if (yb !== null) return clampPct(yb);
  const ybd = toNum(m.yes_bid_dollars);
  if (ybd !== null) return clampPct(ybd * 100);
  const ya = toNum(m.yes_ask);
  if (ya !== null) return clampPct(ya);
  const yad = toNum(m.yes_ask_dollars);
  if (yad !== null) return clampPct(yad * 100);
  return null;
};

const volValue = (m) => toNum(m.volume_24h) ?? toNum(m.volume) ?? 0;

const CRYPTO_RE =
  /\b(CRYPTO|CRYPTOCURRENCY|BITCOIN|BTC|ETHEREUM|ETH|SOLANA|\bSOL\b|DOGE|XRP|BNB|AVAX|ADA|USDT|USDC|STABLECOIN|DEFI|BLOCKCHAIN|NFT|ALTCOIN|MEME|COINBASE|BINANCE|MICROSTRATEGY|MSTR)\b/i;

const isCryptoMarket = (m) => {
  const s = `${m?.title || ""} ${m?.subtitle || ""} ${m?.yes_sub_title || ""} ${m?.no_sub_title || ""} ${m?.ticker || ""} ${m?.event_ticker || ""}`;
  return CRYPTO_RE.test(s);
};

const fetchMarketsPaged = async (params, maxPages = 10) => {
  let cursor = null;
  const out = [];
  for (let i = 0; i < maxPages; i++) {
    const r = await http.get(MARKETS_URL, {
      params: {
        limit: 1000,
        ...params,
        ...(cursor ? { cursor } : {})
      }
    });
    const markets = Array.isArray(r.data?.markets) ? r.data.markets : [];
    out.push(...markets);
    cursor = r.data?.cursor || null;
    if (!cursor) break;
  }
  return out;
};

const fetchAllSeries = async () => {
  const now = Date.now();
  if (seriesCache.data && now - seriesCache.ts < SERIES_TTL_MS) return seriesCache.data;

  const r = await http.get(SERIES_URL, { params: { include_product_metadata: false } });
  const series = Array.isArray(r.data?.series) ? r.data.series : [];
  seriesCache.ts = now;
  seriesCache.data = series;
  return series;
};

const getEventMetadata = async (eventTicker) => {
  const cached = metaCache.get(eventTicker);
  const now = Date.now();
  if (cached && now - cached.ts < META_TTL_MS) return cached.data;

  const url = `${KALSHI_BASE}/events/${encodeURIComponent(eventTicker)}/metadata`;
  const r = await http.get(url);
  const data = r.data || null;

  metaCache.set(eventTicker, { ts: now, data });
  return data;
};

const hydrateImages = async (events) => {
  const metas = await Promise.allSettled(events.map((e) => getEventMetadata(e.ticker)));
  return events.map((evt, i) => {
    const meta = metas[i]?.status === "fulfilled" ? metas[i].value : null;
    if (!meta) return evt;

    const eventImg = absImg(meta.featured_image_url || meta.image_url);
    if (eventImg) evt.image_url = eventImg;

    const details = Array.isArray(meta.market_details) ? meta.market_details : [];
    const byMarketTicker = {};
    for (const d of details) {
      if (!d?.market_ticker) continue;
      byMarketTicker[d.market_ticker] = {
        image_url: absImg(d.image_url),
        color_code: d.color_code || null
      };
    }

    evt.outcomes = evt.outcomes.map((o) => {
      const d = byMarketTicker[o.ticker];
      if (!d) return o;
      return {
        ...o,
        image_url: d.image_url || o.image_url,
        color_code: d.color_code || o.color_code
      };
    });

    return evt;
  });
};

const buildEventsFromMarkets = (allMarkets, opts = {}) => {
  const eventsMap = {};
  const excludeSports = opts.excludeSports ?? true;
  const excludeLeagues = opts.excludeLeagues ?? true;

  for (const market of allMarkets) {
    if (excludeSports && market.category === "Sports") continue;

    if (excludeLeagues) {
      const t = String((market.title || "") + (market.ticker || "")).toUpperCase();
      if (["NBA", "NFL", "MLB", "SOCCER"].some((k) => t.includes(k))) continue;
    }

    const eventId = market.event_ticker;
    if (!eventId) continue;

    if (!eventsMap[eventId]) {
      eventsMap[eventId] = {
        ticker: eventId,
        title: market.title || eventId,
        volume: 0,
        image_url: null,
        outcomes: []
      };
    }

    const v = volValue(market);
    eventsMap[eventId].volume += v;

    const name =
      (market.subtitle && String(market.subtitle).trim()) ||
      (market.yes_sub_title && String(market.yes_sub_title).trim()) ||
      "Yes";

    eventsMap[eventId].outcomes.push({
      name,
      price: priceCents(market),
      volume: v,
      ticker: market.ticker,
      image_url: null,
      color_code: null
    });
  }

  return Object.values(eventsMap)
    .map((event) => {
      event.outcomes.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
      event.outcomes = event.outcomes.slice(0, 3);
      return event;
    })
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
};

const getHeroEvents = async () => {
  const now = Date.now();
  if (heroCache.data && now - heroCache.ts < HERO_TTL_MS) return heroCache.data;

  const markets = await fetchMarketsPaged({ status: "open" }, 6);
  let events = buildEventsFromMarkets(markets, { excludeSports: true, excludeLeagues: true }).slice(0, 69);
  events = await hydrateImages(events);

  heroCache.ts = now;
  heroCache.data = events;
  return events;
};

const getCryptoEvents = async () => {
  const now = Date.now();
  if (cryptoCache.data && now - cryptoCache.ts < CRYPTO_TTL_MS) return cryptoCache.data;

  const allSeries = await fetchAllSeries();
  const cryptoSeriesTickers = allSeries
    .filter((s) => {
      const tags = Array.isArray(s?.tags) ? s.tags.join(" ") : "";
      const hay = `${s?.title || ""} ${s?.category || ""} ${tags}`;
      return CRYPTO_RE.test(hay);
    })
    .map((s) => s.ticker)
    .filter(Boolean);

  const pickedSeries = cryptoSeriesTickers.slice(0, 18);

  const seriesReqs = pickedSeries.map((st) =>
    http.get(MARKETS_URL, {
      params: {
        status: "open",
        series_ticker: st,
        limit: 1000
      }
    })
  );

  const seriesRes = await Promise.allSettled(seriesReqs);

  let cryptoMarkets = [];
  for (const r of seriesRes) {
    if (r.status !== "fulfilled") continue;
    const ms = Array.isArray(r.value.data?.markets) ? r.value.data.markets : [];
    cryptoMarkets.push(...ms);
  }

  cryptoMarkets = cryptoMarkets.filter(isCryptoMarket);

  if (cryptoMarkets.length < 10) {
    const scanned = await fetchMarketsPaged({ status: "open" }, 12);
    cryptoMarkets = scanned.filter(isCryptoMarket);
  }

  let cryptoEvents = buildEventsFromMarkets(cryptoMarkets, { excludeSports: true, excludeLeagues: false }).slice(0, 15);
  cryptoEvents = await hydrateImages(cryptoEvents);
  cryptoEvents = cryptoEvents.slice(0, 3);

  cryptoCache.ts = now;
  cryptoCache.data = cryptoEvents;
  return cryptoEvents;
};

app.get("/kalshi-markets", async (req, res) => {
  try {
    const [markets, crypto] = await Promise.all([getHeroEvents(), getCryptoEvents()]);
    res.json({ markets, crypto });
  } catch (error) {
    res.status(500).json({ error: "Erro ao processar dados" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {});
