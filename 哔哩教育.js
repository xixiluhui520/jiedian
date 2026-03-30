// @name 哔哩教育
// @author
// @description 教育类 B 站视频源，支持弹幕与双线路播放
// @dependencies: axios
// @version 1.1.0
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/教育/哔哩教育.js

const axios = require("axios");
const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

const BILI_COOKIE =
  process.env.BILI_COOKIE ||
  "SESSDATA=7a686aa6%2C1784348734%2C5ed7b%2A11CjB50S07mX66-caPqEpESTG-P6js9gOHyPxFgrDQcq5KgMUFd87q-uBy16f01pa7RJQSVnhucTFmUUgwT1hZSUJCQkdTVHgwcl83OGhFTWRZMG54UmxqVjZrbUJLenN3d29QeHpVVlVTS0tmbXhyNmhmSkhveXpicjVTbTZYamZKeE5oTmNqbXZ3IIEC;bili_jct=4b2a7e044f5a609411631a9c2fe903da;DedeUserID=696832566;DedeUserID__ckMd5=34a48ab580cec706;sid=n6quuh18";

const PROXY_BASE = process.env.BILI_PROXY_BASE || "https://bili.haohaoxixi.cn:7777";
const LINE_NAME_PRIMARY = "\u54d4\u54e9\u6559\u80b2";
const LINE_NAME_COMPAT = "\u54d4\u54e9\u6559\u80b2\u517c\u5bb9";
const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BILI_HEADERS = {
  "User-Agent": DEFAULT_UA,
  Referer: "https://www.bilibili.com",
  ...(BILI_COOKIE ? { Cookie: BILI_COOKIE } : {}),
};

const CLASSES = [
  { type_id: "1年级语文", type_name: "1年级语文" },
  { type_id: "1年级数学", type_name: "1年级数学" },
  { type_id: "1年级英语", type_name: "1年级英语" },
  { type_id: "2年级语文", type_name: "2年级语文" },
  { type_id: "2年级数学", type_name: "2年级数学" },
  { type_id: "2年级英语", type_name: "2年级英语" },
  { type_id: "3年级语文", type_name: "3年级语文" },
  { type_id: "3年级数学", type_name: "3年级数学" },
  { type_id: "3年级英语", type_name: "3年级英语" },
  { type_id: "4年级语文", type_name: "4年级语文" },
  { type_id: "4年级数学", type_name: "4年级数学" },
  { type_id: "4年级英语", type_name: "4年级英语" },
  { type_id: "5年级语文", type_name: "5年级语文" },
  { type_id: "5年级数学", type_name: "5年级数学" },
  { type_id: "5年级英语", type_name: "5年级英语" },
  { type_id: "6年级语文", type_name: "6年级语文" },
  { type_id: "6年级数学", type_name: "6年级数学" },
  { type_id: "6年级英语", type_name: "6年级英语" },
  { type_id: "7年级语文", type_name: "7年级语文" },
  { type_id: "7年级数学", type_name: "7年级数学" },
  { type_id: "7年级英语", type_name: "7年级英语" },
  { type_id: "7年级历史", type_name: "7年级历史" },
  { type_id: "7年级地理", type_name: "7年级地理" },
  { type_id: "7年级生物", type_name: "7年级生物" },
  { type_id: "7年级物理", type_name: "7年级物理" },
  { type_id: "7年级化学", type_name: "7年级化学" },
  { type_id: "8年级语文", type_name: "8年级语文" },
  { type_id: "8年级数学", type_name: "8年级数学" },
  { type_id: "8年级英语", type_name: "8年级英语" },
  { type_id: "8年级历史", type_name: "8年级历史" },
  { type_id: "8年级地理", type_name: "8年级地理" },
  { type_id: "8年级生物", type_name: "8年级生物" },
  { type_id: "8年级物理", type_name: "8年级物理" },
  { type_id: "8年级化学", type_name: "8年级化学" },
  { type_id: "9年级语文", type_name: "9年级语文" },
  { type_id: "9年级数学", type_name: "9年级数学" },
  { type_id: "9年级英语", type_name: "9年级英语" },
  { type_id: "9年级历史", type_name: "9年级历史" },
  { type_id: "9年级地理", type_name: "9年级地理" },
  { type_id: "9年级生物", type_name: "9年级生物" },
  { type_id: "9年级物理", type_name: "9年级物理" },
  { type_id: "9年级化学", type_name: "9年级化学" },
  { type_id: "高一语文", type_name: "高一语文" },
  { type_id: "高一数学", type_name: "高一数学" },
  { type_id: "高一英语", type_name: "高一英语" },
  { type_id: "高一历史", type_name: "高一历史" },
  { type_id: "高一地理", type_name: "高一地理" },
  { type_id: "高一生物", type_name: "高一生物" },
  { type_id: "高一思想政治", type_name: "高一思想政治" },
  { type_id: "高一物理", type_name: "高一物理" },
  { type_id: "高一化学", type_name: "高一化学" },
  { type_id: "高二语文", type_name: "高二语文" },
  { type_id: "高二数学", type_name: "高二数学" },
  { type_id: "高二英语", type_name: "高二英语" },
  { type_id: "高二历史", type_name: "高二历史" },
  { type_id: "高二地理", type_name: "高二地理" },
  { type_id: "高二生物", type_name: "高二生物" },
  { type_id: "高二思想政治", type_name: "高二思想政治" },
  { type_id: "高二物理", type_name: "高二物理" },
  { type_id: "高二化学", type_name: "高二化学" },
  { type_id: "高三语文", type_name: "高三语文" },
  { type_id: "高三数学", type_name: "高三数学" },
  { type_id: "高三英语", type_name: "高三英语" },
  { type_id: "高三历史", type_name: "高三历史" },
  { type_id: "高三地理", type_name: "高三地理" },
  { type_id: "高三生物", type_name: "高三生物" },
  { type_id: "高三思想政治", type_name: "高三思想政治" },
  { type_id: "高三物理", type_name: "高三物理" },
  { type_id: "高三化学", type_name: "高三化学" },
  { type_id: "奥数", type_name: "奥数" },
  { type_id: "奥林匹克物理", type_name: "奥物" },
  { type_id: "奥林匹克化学", type_name: "奥化" },
  { type_id: "高中信息技术", type_name: "高中信息技术" },
];

const QUALITY_NAME_MAP = {
  127: "8K 超高清",
  126: "杜比视界",
  125: "HDR 真彩色",
  120: "4K 超清",
  116: "1080P60 高帧率",
  112: "1080P+ 高码率",
  80: "1080P 高清",
  74: "720P60 高帧率",
  64: "720P 高清",
  32: "480P 清晰",
  16: "360P 流畅",
};

function logInfo(msg) {
  OmniBox.log("info", `[BILI-EDU] ${msg}`);
}

function logError(msg, err) {
  OmniBox.log("error", `[BILI-EDU] ${msg}: ${err?.message || err}`);
}

async function getCacheSafe(key) {
  try {
    return await OmniBox.getCache(key);
  } catch (_) {
    return null;
  }
}

async function setCacheSafe(key, value, exSeconds) {
  try {
    await OmniBox.setCache(key, value, exSeconds);
  } catch (_) {}
}

function fixCover(url) {
  if (!url) return "";
  const value = String(url);
  if (value.startsWith("//")) return `https:${value}`;
  return value;
}

function stripHtml(text) {
  return String(text || "").replace(/<[^>]*>/g, "").trim();
}

function formatSearchDuration(duration) {
  if (!duration || typeof duration !== "string") return "00:00";
  const parts = duration.split(":");
  return parts.length >= 2 ? parts.slice(-2).join(":") : "00:00";
}

function normalizeVideoItem(item) {
  return {
    vod_id: `video:${String(item?.aid || "")}`,
    vod_name: stripHtml(item?.title || ""),
    vod_pic: fixCover(item?.pic),
    vod_remarks: formatSearchDuration(item?.duration),
  };
}

function buildSearchPayload(raw, page) {
  const list = (raw?.data?.result || [])
    .filter((item) => item?.type === "video")
    .map(normalizeVideoItem)
    .filter((item) => item.vod_id && item.vod_name);

  return {
    page,
    pagecount: Number(raw?.data?.numPages || 1),
    total: Number(raw?.data?.numResults || list.length),
    list,
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSearchPage(keyword, page) {
  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data } = await axios.get("https://api.bilibili.com/x/web-interface/search/type", {
        headers: BILI_HEADERS,
        timeout: 12000,
        params: {
          search_type: "video",
          keyword,
          page,
          page_size: 20,
        },
      });

      const payload = buildSearchPayload(data, page);
      if (payload.list.length > 0) {
        return payload;
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < 3) {
      await delay(250 * attempt);
    }
  }

  if (lastError) {
    throw lastError;
  }

  return {
    page,
    pagecount: 1,
    total: 0,
    list: [],
  };
}

async function loadSearchWithFallback(keyword, page, cacheNamespace) {
  const normalizedKeyword = String(keyword || "").trim();
  const currentKey = `${cacheNamespace}:v2:${normalizedKeyword}:${page}`;
  const staleKey = `${cacheNamespace}:stale:v2:${normalizedKeyword}:${page}`;
  let latestResult = {
    page,
    pagecount: 0,
    total: 0,
    list: [],
  };

  try {
    const result = await fetchSearchPage(normalizedKeyword, page);
    latestResult = result;
    if (result.list.length > 0) {
      await setCacheSafe(currentKey, result, 180);
      await setCacheSafe(staleKey, result, 3600);
      return result;
    }
  } catch (error) {
    logError(`搜索失败 ${normalizedKeyword}`, error);
  }

  const cached = await getCacheSafe(currentKey);
  if (cached?.list?.length || cached?.total === 0) {
    logInfo(`命中当前搜索缓存: ${normalizedKeyword} page=${page}`);
    return cached;
  }

  const stale = await getCacheSafe(staleKey);
  if (stale?.list?.length || stale?.total === 0) {
    logInfo(`命中旧搜索缓存: ${normalizedKeyword} page=${page}`);
    return stale;
  }

  return latestResult;
}

function getContextUserAgent(context) {
  const headers = context?.headers || {};
  return String(
    headers["User-Agent"] ||
      headers["user-agent"] ||
      headers["USER-AGENT"] ||
      ""
  );
}

function shouldEscapeProxyMpd(context) {
  const userAgent = getContextUserAgent(context).toLowerCase();
  if (!userAgent) return true;
  return !userAgent.includes("okhttp") && !userAgent.includes("dart");
}

function appendProxyEscape(url, context) {
  const value = shouldEscapeProxyMpd(context) ? "true" : "false";
  const source = String(url || "");

  if (!source.includes("/bili/video/mpd")) {
    return source;
  }

  if (/[?&]isEscape=(true|false)/i.test(source)) {
    return source.replace(/([?&]isEscape=)(true|false)/i, `$1${value}`);
  }

  return `${source}${source.includes("?") ? "&" : "?"}isEscape=${value}`;
}

function buildVideoDashCompatUrl(aid, cid, context, qn = 127) {
  const isEscape = shouldEscapeProxyMpd(context) ? "true" : "false";
  return (
    `${PROXY_BASE}/bili/video/mpd?aid=${encodeURIComponent(aid)}` +
    `&cid=${encodeURIComponent(cid)}&qn=${encodeURIComponent(qn)}` +
    `&compat=true&isEscape=${isEscape}`
  );
}

function buildVideoHlsCompatUrl(aid, cid, qn = 127) {
  return (
    `${PROXY_BASE}/bili/video/hls/master.m3u8?aid=${encodeURIComponent(aid)}` +
    `&cid=${encodeURIComponent(cid)}&qn=${encodeURIComponent(qn)}`
  );
}

function shouldUseVideoHlsCompat(context) {
  const from = String(context?.from || "web").toLowerCase();
  const userAgent = getContextUserAgent(context).toLowerCase();

  if (from === "peekpili") {
    return false;
  }

  if (
    from === "web" ||
    from === "uz" ||
    userAgent.includes("mozilla/") ||
    userAgent.includes("chrome/") ||
    userAgent.includes("safari/") ||
    userAgent.includes("edg/") ||
    userAgent.includes("okhttp") ||
    userAgent.includes("dart")
  ) {
    return true;
  }

  return true;
}

function getPlaybackCacheProfile(context) {
  return {
    transport: shouldUseVideoHlsCompat(context) ? "hls" : "dash",
    escape: shouldEscapeProxyMpd(context) ? "esc" : "raw",
  };
}

async function requestProxyJSON(url) {
  const { data } = await axios.get(url, {
    headers: {
      "User-Agent": BILI_HEADERS["User-Agent"],
      Referer: PROXY_BASE,
      Origin: PROXY_BASE,
    },
    timeout: 15000,
  });
  return data;
}

async function home() {
  const result = await loadSearchWithFallback("启蒙", 1, "biledu:home");
  return {
    class: CLASSES,
    list: result.list,
  };
}

async function category(params) {
  const keyword = String(params.categoryId || "").trim();
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  if (!keyword) {
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }

  return loadSearchWithFallback(keyword, page, "biledu:category");
}

async function search(params) {
  return loadSearchWithFallback(
    params.keyword || params.wd || "",
    Math.max(1, parseInt(params.page, 10) || 1),
    "biledu:search"
  );
}

async function detail(params) {
  const videoId = String(params.videoId || "").replace(/^video:/, "");
  if (!videoId) return { list: [] };

  const cacheKey = `biledu:detail:v1:${videoId}`;
  const cached = await getCacheSafe(cacheKey);
  if (cached?.list?.length) {
    return cached;
  }

  try {
    const { data } = await axios.get(`https://api.bilibili.com/x/web-interface/view?aid=${videoId}`, {
      headers: BILI_HEADERS,
      timeout: 12000,
    });

    const video = data?.data;
    if (!video) return { list: [] };

    const cleanTitle = stripHtml(video.title);
    const episodes = (video.pages || []).map((page, index) => ({
      name: stripHtml(page?.part || "") || `第${index + 1}集`,
      basePlayId: `video:${videoId}_${page.cid}`,
    }));

    const result = {
      list: [
        {
          vod_id: `video:${videoId}`,
          vod_name: cleanTitle,
          vod_pic: fixCover(video.pic),
          vod_content: String(video.desc || ""),
          vod_play_sources: [
            {
              name: LINE_NAME_PRIMARY,
              episodes: episodes.map((ep) => ({
                name: ep.name,
                playId: `${ep.basePlayId}@full|${cleanTitle}|${ep.name}`,
              })),
            },
            {
              name: LINE_NAME_COMPAT,
              episodes: episodes.map((ep) => ({
                name: ep.name,
                playId: `${ep.basePlayId}@direct|${cleanTitle}|${ep.name}`,
              })),
            },
          ],
        },
      ],
    };

    await setCacheSafe(cacheKey, result, 1800);
    return result;
  } catch (error) {
    logError("详情获取失败", error);
    return { list: [] };
  }
}

async function play(params, context) {
  let playId = String(params.playId || "");
  const flag = params.flag || "";

  if (!playId) {
    return { urls: [], parse: 1, header: {}, flag };
  }

  if (playId.includes("|")) {
    playId = playId.split("|")[0] || "";
  }

  const rawPlayId = playId.replace(/^video:/, "");
  const modeMatch = rawPlayId.match(/@(direct|full)$/);
  const playMode = modeMatch?.[1] || "full";
  const rawId = rawPlayId.replace(/@(direct|full)$/, "");
  const idParts = rawId.split("_");

  if (idParts.length < 2) {
    return {
      urls: [{ name: "播放", url: rawId }],
      parse: /\.(m3u8|mp4|flv)$/i.test(rawId) ? 0 : 1,
      header: {},
      flag,
    };
  }

  const aid = idParts[0];
  const cid = idParts[1];
  const cacheProfile = getPlaybackCacheProfile(context);
  const compatTransport =
    playMode === "direct" && shouldUseVideoHlsCompat(context) ? "hls" : cacheProfile.transport;
  const cacheKey = `biledu:play:v1:${playMode}:${compatTransport}:${cacheProfile.escape}:${aid}:${cid}`;

  const cached = await getCacheSafe(cacheKey);
  if (cached?.urls?.length) {
    return cached;
  }

  try {
    const data = await requestProxyJSON(
      `${PROXY_BASE}/bili/video/play?aid=${encodeURIComponent(aid)}&cid=${encodeURIComponent(
        cid
      )}`
    );

    if (data?.code !== 0 || !Array.isArray(data?.list) || data.list.length === 0) {
      throw new Error("video proxy returned no playable urls");
    }

    const allUrls = data.list
      .map((item) => {
        if (!item?.name || !item?.url) return null;
        let finalUrl = String(item.url);
        if (finalUrl.startsWith("/")) {
          finalUrl = `${PROXY_BASE}${finalUrl}`;
        }
        if (String(item.type || "") === "mpd") {
          finalUrl = appendProxyEscape(finalUrl, context);
        }
        return {
          name: String(item.name),
          url: finalUrl,
          type: String(item.type || ""),
          qn: Number(item.qn || 0),
        };
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.qn || 0) - Number(a.qn || 0));

    const urls =
      playMode === "direct"
        ? allUrls.map(({ name, url, type, qn }) => ({
            name,
            url:
              type !== "mpd"
                ? url
                : shouldUseVideoHlsCompat(context)
                  ? buildVideoHlsCompatUrl(aid, cid, qn)
                  : buildVideoDashCompatUrl(aid, cid, context, qn),
          }))
        : allUrls.map(({ name, url }) => ({ name, url }));

    const response = {
      urls,
      url: urls[0]?.url || "",
      parse: 0,
      header: {
        "User-Agent": BILI_HEADERS["User-Agent"],
        Referer: `https://www.bilibili.com/video/av${aid}`,
        Origin: "https://www.bilibili.com",
      },
      flag,
      danmaku: [{ name: "B站弹幕", url: `https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}` }],
    };

    await setCacheSafe(cacheKey, response, 120);
    return response;
  } catch (error) {
    logError("播放获取失败", error);
    return {
      urls: [],
      url: "",
      parse: 1,
      header: {},
      flag,
    };
  }
}

module.exports = {
  home,
  category,
  search,
  detail,
  play,
};

runner.run(module.exports);
