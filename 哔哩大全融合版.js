// @name 哔哩大全融合版
// @author
// @description 普通视频 + 哔哩正片融合版，支持高规格画质与弹幕
// @dependencies: axios
// @version 2.4.0

const axios = require("axios");
const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");
const FEATURED_UPS = [
  {
    mid: "493383447",
    class_id: "up:493383447",
    class_name: "\u5e38\u5728\u6e56\u8fb9\u8d70",
  },
];
const DIY_UP_CLASS = {
  type_id: "up:diy",
  type_name: "自定义UP主",
};

const BILI_COOKIE =
  "SESSDATA=7a686aa6%2C1784348734%2C5ed7b%2A11CjB50S07mX66-caPqEpESTG-P6js9gOHyPxFgrDQcq5KgMUFd87q-uBy16f01pa7RJQSVnhucTFmUUgwT1hZSUJCQkdTVHgwcl83OGhFTWRZMG54UmxqVjZrbUJLenN3d29QeHpVVlVTS0tmbXhyNmhmSkhveXpicjVTbTZYamZKeE5oTmNqbXZ3IIEC;bili_jct=4b2a7e044f5a609411631a9c2fe903da;DedeUserID=696832566;DedeUserID__ckMd5=34a48ab580cec706;sid=n6quuh18";

const DANMU_API = "";
const PROXY_BASE = "https://bili.haohaoxixi.cn:7777";
const LINE_NAME_PRIMARY = "哔哩大全";
const LINE_NAME_COMPAT = "哔哩大全-兼容";
const UP_WORKS_LINE_NAME = "UP主全部作品";
const UP_WORKS_COMPAT_LINE_NAME = "UP主全部作品-兼容";
const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BILI_HEADERS = {
  "User-Agent": DEFAULT_UA,
  Referer: "https://www.bilibili.com",
  ...(BILI_COOKIE ? { Cookie: BILI_COOKIE } : {}),
};

const PGC_CLASSES = [
  { type_id: "pgc_1", type_name: "番剧" },
  { type_id: "pgc_4", type_name: "国创" },
  { type_id: "pgc_2", type_name: "电影" },
  { type_id: "pgc_5", type_name: "电视剧" },
  { type_id: "pgc_3", type_name: "纪录片" },
  { type_id: "pgc_7", type_name: "综艺" },
];

const VIDEO_CLASSES = [
  { type_id: "傻雕仙侠", type_name: "傻雕仙侠" },
  { type_id: "沙雕动画", type_name: "沙雕动画" },
  { type_id: "纪录片", type_name: "纪录片" },
  { type_id: "演唱会", type_name: "演唱会" },
  { type_id: "流行音乐", type_name: "流行音乐" },
  { type_id: "美食", type_name: "美食" },
  { type_id: "食谱", type_name: "食谱" },
  { type_id: "体育", type_name: "体育" },
  { type_id: "球星", type_name: "球星" },
  { type_id: "教育", type_name: "教育" },
  { type_id: "幼儿教育", type_name: "幼儿教育" },
  { type_id: "旅游", type_name: "旅游" },
  { type_id: "风景4K", type_name: "风景" },
  { type_id: "说唱", type_name: "说唱" },
  { type_id: "知名UP主", type_name: "知名UP主" },
  { type_id: "探索发现", type_name: "探索发现" },
  { type_id: "鬼畜", type_name: "鬼畜" },
  { type_id: "搞笑", type_name: "搞笑" },
  { type_id: "儿童", type_name: "儿童" },
  { type_id: "动物世界", type_name: "动物世界" },
  { type_id: "相声小品", type_name: "相声小品" },
  { type_id: "戏曲", type_name: "戏曲" },
  { type_id: "解说", type_name: "解说" },
  { type_id: "演讲", type_name: "演讲" },
  { type_id: "小姐姐", type_name: "小姐姐" },
  { type_id: "荒野求生", type_name: "荒野求生" },
  { type_id: "健身", type_name: "健身" },
  { type_id: "帕梅拉", type_name: "帕梅拉" },
  { type_id: "太极拳", type_name: "太极拳" },
  { type_id: "广场舞", type_name: "广场舞" },
  { type_id: "舞蹈", type_name: "舞蹈" },
  { type_id: "音乐", type_name: "音乐" },
  { type_id: "歌曲", type_name: "歌曲" },
  { type_id: "MV4K", type_name: "MV" },
  { type_id: "舞曲", type_name: "舞曲" },
  { type_id: "4K", type_name: "4K" },
  { type_id: "白噪音", type_name: "白噪音" },
  { type_id: "考公考证", type_name: "考公考证" },
  { type_id: "平面设计教学", type_name: "平面设计教学" },
  { type_id: "软件教程", type_name: "软件教程" },
  { type_id: "Windows", type_name: "Windows" },
];

const FEATURED_UP_CLASSES = FEATURED_UPS.map((item) => ({
  type_id: item.class_id,
  type_name: item.class_name,
}));

const CLASSES = [
  ...FEATURED_UP_CLASSES,
  DIY_UP_CLASS,
  ...PGC_CLASSES,
  ...VIDEO_CLASSES.filter((item) => item.type_id !== "知名UP主"),
];

async function logInfo(msg) {
  await OmniBox.log("info", `[BILI-ALL-MIX] ${msg}`);
}

async function logWarn(msg) {
  await OmniBox.log("warn", `[BILI-ALL-MIX] ${msg}`);
}

async function logError(msg, err) {
  await OmniBox.log("error", `[BILI-ALL-MIX] ${msg}: ${err?.message || err}`);
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

async function getEnvSafe(key, fallback = "") {
  try {
    const value = await OmniBox.getEnv(key);
    return value == null ? fallback : value;
  } catch (_) {
    return fallback;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fixCover(url) {
  if (!url) return "";
  if (String(url).startsWith("//")) return `https:${url}`;
  return String(url);
}

function stripHtml(text) {
  return String(text || "").replace(/<[^>]*>/g, "").trim();
}

function extractCollectionEpisodeOrder(text) {
  const value = stripHtml(text).replace(/\s+/g, " ");
  if (!value) return null;

  const patterns = [
    /(?:\u7075\u754c\u7bc7|\u4ed9\u754c\u7bc7)\s*0*([1-9]\d{0,3})/i,
    /(?:\u7b2c\s*|[^\d])0*([1-9]\d{0,3})(?=\s*(?:\u96c6|\u8bdd|\u7bc7|\u56de|\u7ae0|\u5f39|\uff1a|:|\u3011|\]|\)|$))/,
    /-\s*0*([1-9]\d{0,3})(?=\s*(?:\uff1a|:|\u3011|\]|\)|$))/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    const number = Number(match?.[1] || 0);
    if (Number.isFinite(number) && number > 0) {
      return number;
    }
  }

  return null;
}

function sortEpisodesByCollectionOrder(episodes = []) {
  return [...episodes]
    .map((episode, index) => ({
      ...episode,
      __index: index,
      __order: extractCollectionEpisodeOrder(episode?.name || ""),
    }))
    .sort((a, b) => {
      const aHasOrder = Number.isFinite(a.__order);
      const bHasOrder = Number.isFinite(b.__order);

      if (aHasOrder && bHasOrder && a.__order !== b.__order) {
        return a.__order - b.__order;
      }

      if (aHasOrder !== bHasOrder) {
        return aHasOrder ? -1 : 1;
      }

      return a.__index - b.__index;
    })
    .map(({ __index, __order, ...episode }) => episode);
}

function findFeaturedUpByCategoryId(categoryId) {
  return FEATURED_UPS.find((item) => item.class_id === String(categoryId || "")) || null;
}

function formatDuration(seconds) {
  const sec = parseInt(seconds, 10) || 0;
  if (sec <= 0) return "00:00";
  const minutes = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatSearchDuration(duration) {
  if (!duration || typeof duration !== "string") return "00:00";
  const parts = duration.split(":");
  return parts.length === 2 ? duration : "00:00";
}

function formatUpVideoRemark(item) {
  const rawLength = String(item?.length || "").trim();
  if (/^\d+:\d{2}(?::\d{2})?$/.test(rawLength)) {
    return rawLength;
  }

  return formatDuration(item?.duration || item?.arc?.duration || 0);
}

function buildUpVideoListItem(item) {
  const aid = String(item?.aid || item?.arc?.aid || "");
  const title = stripHtml(item?.title || item?.arc?.title || "");
  if (!aid || !title) return null;

  return {
    vod_id: `video:${aid}`,
    vod_name: title,
    vod_pic: fixCover(item?.pic || item?.arc?.pic || ""),
    vod_remarks: formatUpVideoRemark(item),
  };
}

function buildUpHomeListItem(info = {}, fallbackName = "") {
  const mid = String(info?.mid || info?.id || "");
  const name = stripHtml(info?.name || info?.uname || fallbackName || mid);
  if (!mid || !name) return null;

  const officialTitle = stripHtml(info?.official?.title || info?.official_verify?.desc || "");
  const sign = stripHtml(info?.sign || info?.usign || "");
  const videos = Number(info?.videos || 0);
  const fans = Number(info?.fans || 0);
  const remarkParts = [];

  if (officialTitle) {
    remarkParts.push(officialTitle);
  } else {
    remarkParts.push("UP主页");
  }
  if (videos > 0) {
    remarkParts.push(`投稿${videos}`);
  }
  if (fans > 0) {
    remarkParts.push(`粉丝${formatHumanCount(fans)}`);
  }

  return {
    vod_id: `up:${mid}`,
    vod_name: name,
    vod_pic: fixCover(info?.face || info?.upic || ""),
    vod_remarks: remarkParts.join(" · "),
    vod_subtitle: sign,
  };
}

function buildUpMenuListItem({
  mid = "",
  menuType = "",
  menuKey = "",
  name = "",
  pic = "",
  remarks = "",
  subtitle = "",
}) {
  const safeMid = String(mid || "");
  const safeType = String(menuType || "");
  if (!safeMid || !safeType || !name) return null;

  const keyPart = menuKey ? `:${String(menuKey)}` : "";
  return {
    vod_id: `upmenu:${safeMid}:${safeType}${keyPart}`,
    vod_name: name,
    vod_pic: fixCover(pic || ""),
    vod_remarks: remarks,
    vod_subtitle: subtitle,
  };
}


function buildPagedEpisodeSources(baseName, vodName, episodes = [], chunkSize = 50) {
  const dedupedEpisodes = dedupeEpisodesByPlayId(episodes);
  const sources = [];

  for (let index = 0; index < dedupedEpisodes.length; index += chunkSize) {
    const chunk = dedupedEpisodes.slice(index, index + chunkSize);
    if (chunk.length === 0) continue;

    const start = index + 1;
    const end = index + chunk.length;
    const sourceName =
      dedupedEpisodes.length > chunkSize ? `${baseName} ${start}-${end}` : baseName;

    sources.push({
      name: sourceName,
      episodes: chunk.map((episode) => ({
        name: episode.name,
        playId: `${episode.basePlayId}|${vodName}|${episode.name}`,
      })),
    });
  }

  return sources;
}

function buildPagedEpisodeSourceVariants(baseName, vodName, episodes = [], chunkSize = 50) {
  const dedupedEpisodes = dedupeEpisodesByPlayId(episodes);
  const variants = [];

  const pushModeSources = (mode, suffix = "") => {
    for (let index = 0; index < dedupedEpisodes.length; index += chunkSize) {
      const chunk = dedupedEpisodes.slice(index, index + chunkSize);
      if (chunk.length === 0) continue;

      const start = index + 1;
      const end = index + chunk.length;
      const chunkLabel =
        dedupedEpisodes.length > chunkSize ? ` ${start}-${end}` : "";

      variants.push({
        name: `${baseName}${suffix}${chunkLabel}`,
        episodes: chunk.map((episode) => ({
          name: episode.name,
          playId: `${episode.basePlayId}${mode}|${vodName}|${episode.name}`,
        })),
      });
    }
  };

  pushModeSources("@full");
  pushModeSources("@direct", "-兼容");

  return variants;
}

function buildSelectorSource(sourceName, vodName, episodes = []) {
  return {
    name: sourceName,
    episodes: dedupeEpisodesByPlayId(episodes).map((episode) => ({
      name: episode.name,
      playId: `${episode.basePlayId}@selector|${vodName}|${episode.name}`,
    })),
  };
}

function buildLineSource(sourceName, mode, vodName, episodes = []) {
  return {
    name: sourceName,
    episodes: dedupeEpisodesByPlayId(episodes).map((episode) => ({
      name: episode.name,
      playId: `${episode.basePlayId}${mode}|${vodName}|${episode.name}`,
    })),
  };
}

function applySectionLabelsToEpisodes(episodes = [], sections = []) {
  const sectionMap = new Map();

  for (const section of sections || []) {
    const sectionTitle = stripHtml(section?.title || "");
    const sectionEpisodes = Array.isArray(section?.episodes) ? section.episodes : [];

    for (const episode of sectionEpisodes) {
      const playId = getEpisodeIdentity(episode?.basePlayId || "");
      if (!playId || !sectionTitle || sectionMap.has(playId)) continue;
      sectionMap.set(playId, sectionTitle);
    }
  }

  return dedupeEpisodesByPlayId(episodes).map((episode) => {
    const playId = getEpisodeIdentity(episode?.basePlayId || "");
    const sectionTitle = sectionMap.get(playId) || "";
    const rawName = stripHtml(episode?.name || "");
    const name =
      sectionTitle && rawName && !rawName.includes(sectionTitle)
        ? `[${sectionTitle}] ${rawName}`
        : rawName || episode?.name || "";

    return {
      ...episode,
      name,
    };
  });
}

function buildOutlineEpisodes(sections = [], fallbackEpisodes = []) {
  const merged = [];
  const seen = new Set();

  for (const section of sections || []) {
    const labeledEpisodes = applySectionLabelsToEpisodes(
      Array.isArray(section?.episodes) ? section.episodes : [],
      [section]
    );

    for (const episode of labeledEpisodes) {
      const playId = getEpisodeIdentity(episode?.basePlayId || "");
      if (!playId || seen.has(playId)) continue;
      seen.add(playId);
      merged.push(episode);
    }
  }

  for (const episode of fallbackEpisodes || []) {
    const playId = getEpisodeIdentity(episode?.basePlayId || "");
    if (!playId || seen.has(playId)) continue;
    seen.add(playId);
    merged.push(episode);
  }

  return merged;
}

function prioritizeEpisode(episodes = [], targetPlayId = "") {
  const normalizedTarget = getEpisodeIdentity(targetPlayId);
  if (!normalizedTarget) {
    return dedupeEpisodesByPlayId(episodes);
  }

  const dedupedEpisodes = dedupeEpisodesByPlayId(episodes);
  const targetIndex = dedupedEpisodes.findIndex(
    (episode) => getEpisodeIdentity(episode?.basePlayId || "") === normalizedTarget
  );

  if (targetIndex <= 0) {
    return dedupedEpisodes;
  }

  return [
    dedupedEpisodes[targetIndex],
    ...dedupedEpisodes.slice(0, targetIndex),
    ...dedupedEpisodes.slice(targetIndex + 1),
  ];
}

function prependCurrentEpisodeShortcut(episodes = [], targetPlayId = "") {
  const dedupedEpisodes = dedupeEpisodesByPlayId(episodes);
  const normalizedTarget = getEpisodeIdentity(targetPlayId);
  if (!normalizedTarget) {
    return dedupedEpisodes;
  }

  const currentEpisode = dedupedEpisodes.find(
    (episode) => getEpisodeIdentity(episode?.basePlayId || "") === normalizedTarget
  );
  if (!currentEpisode) {
    return dedupedEpisodes;
  }

  return [
    {
      ...currentEpisode,
      name: `▶ 当前播放 ${currentEpisode.name}`,
      basePlayId: `${String(currentEpisode.basePlayId || "")}#current`,
    },
    ...dedupedEpisodes,
  ];
}

function chineseToArabic(cn) {
  const map = {
    零: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  };
  if (!Number.isNaN(Number(cn))) return parseInt(cn, 10);
  if (cn.length === 1) return map[cn] ?? cn;
  if (cn.length === 2) {
    if (cn[0] === "十") return 10 + (map[cn[1]] || 0);
    if (cn[1] === "十") return (map[cn[0]] || 0) * 10;
  }
  if (cn.length === 3) return (map[cn[0]] || 0) * 10 + (map[cn[2]] || 0);
  return cn;
}

function preprocessTitle(title) {
  if (!title) return "";
  return String(title)
    .replace(/4[kK]|[xX]26[45]|720[pP]|1080[pP]|2160[pP]|1280x720|1920x1080/g, " ")
    .replace(/[hH]\.?26[45]/g, " ")
    .replace(/BluRay|WEB-DL|HDR|REMUX/gi, " ")
    .replace(/\.mp4|\.mkv|\.avi|\.flv/gi, " ")
    .trim();
}

function extractEpisode(title) {
  if (!title) return "";
  const processed = preprocessTitle(title);

  const seMatch = processed.match(/[Ss](?:\d{1,2})?[-._\s]*[Ee](\d{1,3})/i);
  if (seMatch) return seMatch[1];

  const cnMatch = processed.match(/第\s*([零一二三四五六七八九十0-9]+)\s*[集话章节回期]/);
  if (cnMatch) return String(chineseToArabic(cnMatch[1]));

  const epMatch = processed.match(/\b(?:EP|E)[-._\s]*(\d{1,3})\b/i);
  if (epMatch) return epMatch[1];

  const bracketMatch = processed.match(/[\[\(【（](\d{1,3})[\]\)】）]/);
  if (bracketMatch && !["720", "1080", "480"].includes(bracketMatch[1])) {
    return bracketMatch[1];
  }

  return "";
}

function buildFileNameForDanmu(vodName, episodeTitle) {
  if (!vodName) return "";
  if (!episodeTitle || episodeTitle === "正片" || episodeTitle === "播放") {
    return vodName;
  }

  const digits = extractEpisode(episodeTitle);
  if (!digits) return vodName;

  const epNum = parseInt(digits, 10);
  if (!epNum || epNum <= 0) return vodName;
  return epNum < 10 ? `${vodName} S01E0${epNum}` : `${vodName} S01E${epNum}`;
}

function inferFileNameFromURL(url) {
  try {
    const urlObj = new URL(url);
    let base = urlObj.pathname.split("/").pop() || "";
    const dotIndex = base.lastIndexOf(".");
    if (dotIndex > 0) base = base.substring(0, dotIndex);
    base = base.replace(/[_-]/g, " ").replace(/\./g, " ").trim();
    return base || url;
  } catch {
    return url;
  }
}

function isPgcCategory(categoryId) {
  return /^pgc_\d+$/.test(String(categoryId || ""));
}

function isPgcVideoId(videoId) {
  return /^pgc:/.test(String(videoId || ""));
}

function isPgcPlayId(playId) {
  return /^pgc:/.test(String(playId || ""));
}

function isUpHomeVideoId(videoId) {
  return /^up:\d+$/.test(String(videoId || ""));
}

function isUpMenuVideoId(videoId) {
  return /^upmenu:\d+:[^:]+(?::.+)?$/.test(String(videoId || ""));
}

function parseUpMenuVideoId(videoId) {
  const parts = String(videoId || "").split(":");
  if (parts.length < 3 || parts[0] !== "upmenu") {
    return null;
  }

  return {
    mid: String(parts[1] || ""),
    menuType: String(parts[2] || ""),
    menuKey: parts.length > 3 ? parts.slice(3).join(":") : "",
  };
}

function parseCustomUpConfigEntries(value) {
  return String(value || "")
    .split(/[\r\n,;，；]+/)
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((item) => {
      const [midPart, aliasPart] = item.split("|");
      const mid = String(midPart || "").trim();
      const alias = String(aliasPart || "").trim();
      if (!/^\d+$/.test(mid)) return null;
      return { mid, alias };
    })
    .filter(Boolean);
}

function formatHumanCount(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return "0";
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}亿`;
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
  return String(Math.floor(num));
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

  if (!source.includes("/bili/mpd") && !source.includes("/bili/video/mpd")) {
    return source;
  }

  if (/[?&]isEscape=(true|false)/i.test(source)) {
    return source.replace(/([?&]isEscape=)(true|false)/i, `$1${value}`);
  }

  return `${source}${source.includes("?") ? "&" : "?"}isEscape=${value}`;
}

function buildDashProxyUrl(playId, context, qn = 127) {
  const isEscape = shouldEscapeProxyMpd(context) ? "true" : "false";
  return (
    `${PROXY_BASE}/proxy?ac=proxy&ids=${encodeURIComponent(playId)}` +
    `&type=mpd&qn=${encodeURIComponent(qn)}&fnval=4048&fourk=1&isEscape=${isEscape}`
  );
}

function buildHlsCompatUrl(playId, qn = 127) {
  return (
    `${PROXY_BASE}/bili/hls/master.m3u8?id=${encodeURIComponent(playId)}` +
    `&qn=${encodeURIComponent(qn)}`
  );
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

function shouldUseHlsCompat(context) {
  const from = String(context?.from || "web").toLowerCase();
  const userAgent = getContextUserAgent(context).toLowerCase();
  const isUzClient =
    from === "uz" ||
    userAgent.includes("uz影视") ||
    userAgent.includes("uz ") ||
    userAgent.includes(" uz") ||
    userAgent.includes("okhttp") ||
    userAgent.includes("dart");

  if (isUzClient) {
    return false;
  }

  if (from === "web") {
    return true;
  }

  return (
    userAgent.includes("mozilla/") ||
    userAgent.includes("chrome/") ||
    userAgent.includes("safari/") ||
    userAgent.includes("edg/")
  );
}

function getPlaybackCacheProfile(context) {
  return {
    transport: shouldUseHlsCompat(context) ? "hls" : "dash",
    escape: shouldEscapeProxyMpd(context) ? "esc" : "raw",
  };
}

function buildUgcCollectionEpisodes(video, fallbackAid) {
  const sections = Array.isArray(video?.ugc_season?.sections) ? video.ugc_season.sections : [];
  const flattened = [];

  for (const section of sections) {
    const episodes = Array.isArray(section?.episodes) ? section.episodes : [];
    for (const episode of episodes) {
      const aid = String(
        episode?.aid || episode?.arc?.aid || fallbackAid || ""
      );
      const cid = String(
        episode?.cid || episode?.page?.cid || episode?.arc?.cid || ""
      );
      if (!aid || !cid) continue;

      const title = stripHtml(
        episode?.title ||
          episode?.arc?.title ||
          episode?.page?.part ||
          ""
      );
      const badge = stripHtml(
        episode?.page?.part || episode?.label || section?.title || ""
      );
      const name = badge && badge !== title ? `${badge} ${title}`.trim() : title;

      flattened.push({
        name: name || `第${flattened.length + 1}集`,
        basePlayId: `video:${aid}_${cid}`,
      });
    }
  }

  return flattened;
}

function dedupeEpisodesByPlayId(episodes) {
  const seen = new Set();
  const result = [];

  for (const episode of episodes || []) {
    const playId = String(episode?.basePlayId || "");
    if (!playId || seen.has(playId)) continue;
    seen.add(playId);
    result.push(episode);
  }

  return result;
}

function getEpisodeIdentity(basePlayId = "") {
  const value = String(basePlayId || "");
  const match = value.match(/^video:(\d+)/);
  return match ? `video:${match[1]}` : value;
}

function buildArchiveEpisode(item, index, collectionTitle = "") {
  const aid = String(item?.aid || item?.arc?.aid || "");
  if (!aid) return null;

  const prefix = stripHtml(
    collectionTitle || item?.meta?.title || item?.season_name || ""
  );
  const title = stripHtml(item?.title || item?.arc?.title || "");
  const displayName =
    prefix && title && !title.includes(prefix) ? `[${prefix}] ${title}` : title;

  return {
    name: displayName || `第${index + 1}集`,
    basePlayId: `video:${aid}`,
  };
}

async function fetchUpAllVideos(mid) {
  const cacheKey = `biliall:up:works:v1:${mid}`;
  const cached = await getCacheSafe(cacheKey);
  if (cached?.length) {
    return cached;
  }

  const pageSize = 100;
  const maxPages = 20;
  const all = [];
  let total = 0;

  for (let page = 1; page <= maxPages; page++) {
    const { data } = await axios.get("https://api.bilibili.com/x/space/arc/search", {
      headers: BILI_HEADERS,
      timeout: 15000,
      params: {
        mid,
        pn: page,
        ps: pageSize,
        order: "pubdate",
      },
    });

    if (data?.code !== 0) {
      throw new Error(`space arc search failed: ${data?.message || data?.code}`);
    }

    const pageInfo = data?.data?.page || {};
    const pageItems = Array.isArray(data?.data?.list?.vlist) ? data.data.list.vlist : [];

    if (pageItems.length === 0) {
      break;
    }

    all.push(...pageItems);
    total = Number(pageInfo.count || all.length);

    if (all.length >= total) {
      break;
    }

    await sleep(120);
  }

  const deduped = [];
  const seen = new Set();
  for (const item of all) {
    const aid = String(item?.aid || "");
    if (!aid || seen.has(aid)) continue;
    seen.add(aid);
    deduped.push(item);
  }

  if (deduped.length > 0) {
    await setCacheSafe(cacheKey, deduped, 3600);
  }

  return deduped;
}

async function fetchUpInfo(mid) {
  const cacheKey = `biliall:up:info:v1:${mid}`;
  const cached = await getCacheSafe(cacheKey);
  if (cached?.mid) {
    return cached;
  }

  const { data } = await axios.get("https://api.bilibili.com/x/space/acc/info", {
    headers: BILI_HEADERS,
    timeout: 15000,
    params: { mid },
  });

  if (data?.code !== 0 || !data?.data?.mid) {
    throw new Error(`up info failed: ${data?.message || data?.code}`);
  }

  await setCacheSafe(cacheKey, data.data, 1800);
  return data.data;
}

async function fetchUpCollections(mid) {
  const cacheKey = `biliall:up:collections:v1:${mid}`;
  const cached = await getCacheSafe(cacheKey);
  if (cached?.seasons || cached?.series) {
    return cached;
  }

  const seasons = [];
  const series = [];
  const seenSeasonIds = new Set();
  const seenSeriesIds = new Set();
  const pageSize = 20;

  for (let page = 1; page <= 10; page += 1) {
    const { data } = await axios.get(
      "https://api.bilibili.com/x/polymer/web-space/seasons_series_list",
      {
        headers: BILI_HEADERS,
        timeout: 15000,
        params: {
          mid,
          page_num: page,
          page_size: pageSize,
        },
      }
    );

    if (data?.code !== 0) {
      throw new Error(`up collections failed: ${data?.message || data?.code}`);
    }

    const items = data?.data?.items_lists || {};
    const seasonList = Array.isArray(items?.seasons_list) ? items.seasons_list : [];
    const seriesList = Array.isArray(items?.series_list) ? items.series_list : [];

    for (const item of seasonList) {
      const seasonId = String(item?.meta?.season_id || "");
      if (!seasonId || seenSeasonIds.has(seasonId)) continue;
      seenSeasonIds.add(seasonId);
      seasons.push(item);
    }

    for (const item of seriesList) {
      const seriesId = String(item?.meta?.series_id || "");
      if (!seriesId || seenSeriesIds.has(seriesId)) continue;
      seenSeriesIds.add(seriesId);
      series.push(item);
    }

    const total = Number(items?.page?.total || seasonList.length + seriesList.length);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    if (page >= pageCount) {
      break;
    }

    await sleep(120);
  }

  const result = { seasons, series };
  await setCacheSafe(cacheKey, result, 1800);
  return result;
}

async function fetchSeasonArchives(mid, seasonId) {
  const cacheKey = `biliall:up:season:v2:${mid}:${seasonId}`;
  const cached = await getCacheSafe(cacheKey);
  if (cached?.episodes?.length) {
    return cached;
  }

  const pageSize = 100;
  const episodes = [];
  let total = 0;
  let metaTitle = "";

  for (let page = 1; page <= 30; page++) {
    const { data } = await axios.get(
      "https://api.bilibili.com/x/polymer/web-space/seasons_archives_list",
      {
        headers: BILI_HEADERS,
        timeout: 15000,
        params: {
          mid,
          season_id: seasonId,
          page_num: page,
          page_size: pageSize,
        },
      }
    );

    if (data?.code !== 0) {
      throw new Error(`season archives failed: ${data?.message || data?.code}`);
    }

    const archives = Array.isArray(data?.data?.archives) ? data.data.archives : [];
    metaTitle = stripHtml(data?.data?.meta?.title || data?.data?.meta?.name || metaTitle);
    total = Number(data?.data?.page?.total || archives.length || total);

    archives.forEach((item, index) => {
      const built = buildArchiveEpisode(item, episodes.length + index, metaTitle);
      if (built) {
        episodes.push(built);
      }
    });

    if (episodes.length >= total || archives.length === 0) {
      break;
    }

    await sleep(120);
  }

  const result = {
    title: metaTitle,
    episodes: dedupeEpisodesByPlayId(episodes),
  };

  if (result.episodes.length > 0) {
    await setCacheSafe(cacheKey, result, 3600);
  }

  return result;
}

async function fetchSeasonSectionSources(mid, seasonId, seedAid = "") {
  const cacheKey = `biliall:up:season:sections:v2:${mid}:${seasonId}`;
  const cached = await getCacheSafe(cacheKey);
  if (cached?.length) {
    return cached;
  }

  const archivesData = await axios.get(
    "https://api.bilibili.com/x/polymer/web-space/seasons_archives_list",
    {
      headers: BILI_HEADERS,
      timeout: 15000,
      params: {
        mid,
        season_id: seasonId,
        page_num: 1,
        page_size: 1,
      },
    }
  );

  if (archivesData?.data?.code !== 0) {
    throw new Error(
      `season section seed failed: ${archivesData?.data?.message || archivesData?.data?.code}`
    );
  }

  const firstAid = String(
    seedAid ||
      archivesData?.data?.data?.archives?.[0]?.aid ||
      ""
  );
  if (!firstAid) {
    return [];
  }

  const { data } = await axios.get(
    `https://api.bilibili.com/x/web-interface/view?aid=${firstAid}`,
    { headers: BILI_HEADERS, timeout: 15000 }
  );

  const sections = Array.isArray(data?.data?.ugc_season?.sections)
    ? data.data.ugc_season.sections
    : [];

  const result = sections
    .map((section) => ({
      title: stripHtml(section?.title || ""),
      episodes: buildSectionEpisodes(section, firstAid),
    }))
    .filter((section) => section.title && section.episodes.length > 0)
    .map((section) => {
      return {
        title: section.title,
        episodes: section.episodes,
      };
    })
    .filter((section) => section.episodes.length > 0);

  if (result.length > 0) {
    await setCacheSafe(cacheKey, result, 1800);
  }

  return result;
}

async function fetchSeriesArchives(mid, seriesId) {
  const cacheKey = `biliall:up:series:v2:${mid}:${seriesId}`;
  const cached = await getCacheSafe(cacheKey);
  if (cached?.episodes?.length) {
    return cached;
  }

  const pageSize = 100;
  const episodes = [];

  for (let page = 1; page <= 30; page += 1) {
    const { data } = await axios.get("https://api.bilibili.com/x/series/archives", {
      headers: BILI_HEADERS,
      timeout: 15000,
      params: {
        mid,
        series_id: seriesId,
        only_normal: true,
        sort: "desc",
        pn: page,
        ps: pageSize,
      },
    });

    if (data?.code !== 0) {
      throw new Error(`series archives failed: ${data?.message || data?.code}`);
    }

    const archives = Array.isArray(data?.data?.archives) ? data.data.archives : [];
    const metaTitle = stripHtml(data?.data?.meta?.name || data?.data?.meta?.title || "");

    archives.forEach((item, index) => {
      const built = buildArchiveEpisode(item, episodes.length + index, metaTitle);
      if (built) {
        episodes.push(built);
      }
    });

    const total = Number(data?.data?.page?.total || archives.length || 0);
    if (episodes.length >= total || archives.length === 0) {
      const result = {
        title: metaTitle,
        episodes: dedupeEpisodesByPlayId(episodes),
      };

      if (result.episodes.length > 0) {
        await setCacheSafe(cacheKey, result, 3600);
      }

      return result;
    }

    await sleep(120);
  }

  return {
    title: "",
    episodes: dedupeEpisodesByPlayId(episodes),
  };
}

async function resolveVideoCid(aidOrBvid) {
  const source = String(aidOrBvid || "").trim();
  if (!source) return null;

  const cacheKey = `biliall:video:cid:v1:${source}`;
  const cached = await getCacheSafe(cacheKey);
  if (cached?.aid && cached?.cid) {
    return cached;
  }

  const params = /^\d+$/.test(source) ? { aid: source } : { bvid: source };
  const { data } = await axios.get("https://api.bilibili.com/x/player/pagelist", {
    headers: BILI_HEADERS,
    timeout: 15000,
    params,
  });

  const first = Array.isArray(data?.data) ? data.data[0] : null;
  if (!first?.cid) {
    return null;
  }

  const result = {
    aid: /^\d+$/.test(source) ? source : String(first?.aid || ""),
    cid: String(first.cid),
  };

  if (result.aid && result.cid) {
    await setCacheSafe(cacheKey, result, 3600);
    return result;
  }

  return null;
}

function getVideoKeywordCandidates(keyword) {
  const map = {
    "4K": ["4K 超清", "4K", "4K HDR", "ULTRA HD 4K"],
    MV4K: ["MV 4K", "4K MV", "演唱会 4K MV", "音乐 MV 4K"],
    风景4K: ["风景 4K", "4K 风景", "自然风景 4K", "景色 4K"],
    纪录片: ["纪录片", "高清纪录片", "纪实"],
    演唱会: ["演唱会", "live 演唱会", "高清演唱会"],
    流行音乐: ["流行音乐", "高音质音乐", "音乐现场"],
    体育: ["体育", "体育赛事", "高清体育"],
    探索发现: ["探索发现", "探索", "科普纪录片"],
    搞笑: ["搞笑", "沙雕", "整活"],
    儿童: ["儿童", "儿童动画", "亲子"],
    动物世界: ["动物世界", "动物纪录片", "野生动物"],
    相声小品: ["相声小品", "相声", "小品"],
    小姐姐: ["小姐姐", "美女", "高颜值"],
    荒野求生: ["荒野求生", "野外生存", "求生"],
    白噪音: ["白噪音", "助眠", "环境音"],
  };

  return map[keyword] || [keyword];
}

async function requestProxyJSON(url) {
  const resp = await OmniBox.request(url, {
    method: "GET",
    headers: {
      "User-Agent": BILI_HEADERS["User-Agent"],
      Referer: PROXY_BASE,
    },
  });

  const body = resp?.body || "{}";
  try {
    return JSON.parse(body);
  } catch (error) {
    const preview = String(body).slice(0, 300);
    await logError(`Proxy JSON parse failed: ${url}`, preview);
    throw error;
  }
}

async function matchDanmu(fileName, cid) {
  if (cid) {
    return [
      { name: "B站弹幕", url: `https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}` },
    ];
  }

  if (!DANMU_API || !fileName) return [];

  try {
    const matchUrl = `${DANMU_API}/api/v2/match`;
    const response = await OmniBox.request(matchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": BILI_HEADERS["User-Agent"],
      },
      body: JSON.stringify({ fileName }),
    });

    if (response.statusCode !== 200) return [];

    const matchData = JSON.parse(response.body || "{}");
    if (!matchData.isMatched || !Array.isArray(matchData.matches) || matchData.matches.length === 0) {
      return [];
    }

    const firstMatch = matchData.matches[0];
    const episodeId = firstMatch.episodeId;
    if (!episodeId) return [];

    const animeTitle = firstMatch.animeTitle || "";
    const episodeTitle = firstMatch.episodeTitle || "";
    const name =
      animeTitle && episodeTitle
        ? `${animeTitle} - ${episodeTitle}`
        : animeTitle || episodeTitle || "弹幕";

    return [{ name, url: `${DANMU_API}/api/v2/comment/${episodeId}?format=xml` }];
  } catch (error) {
    await logError("Match danmaku failed", error);
    return [];
  }
}

async function searchBiliVideoOnce(keyword, page) {
  const { data } = await axios.get(
    "https://api.bilibili.com/x/web-interface/search/type",
    {
      headers: BILI_HEADERS,
      params: {
        search_type: "video",
        keyword,
        page,
      },
      timeout: 15000,
    }
  );

  const rawList = data?.data?.result || [];
  const list = rawList
    .filter((item) => item.type === "video")
    .map((item) => ({
      vod_id: `video:${String(item.aid || "")}`,
      vod_name: stripHtml(item.title),
      vod_pic: fixCover(item.pic),
      vod_remarks: formatSearchDuration(item.duration),
    }));

  return {
    page,
    pagecount: data?.data?.numPages || 1,
    total: data?.data?.numResults || list.length,
    list,
  };
}

async function searchBiliUpOnce(keyword, page) {
  if (/^\d+$/.test(String(keyword || "").trim())) {
    try {
      const info = await fetchUpInfo(String(keyword || "").trim());
      const item = buildUpHomeListItem(info, String(keyword || "").trim());
      return {
        page,
        pagecount: 1,
        total: item ? 1 : 0,
        list: item ? [item] : [],
      };
    } catch (_) {
      return { page, pagecount: 1, total: 0, list: [] };
    }
  }

  const { data } = await axios.get(
    "https://api.bilibili.com/x/web-interface/search/type",
    {
      headers: BILI_HEADERS,
      params: {
        search_type: "bili_user",
        keyword,
        page,
      },
      timeout: 15000,
    }
  );

  const rawList = Array.isArray(data?.data?.result) ? data.data.result : [];
  const list = rawList.map((item) => buildUpHomeListItem(item)).filter(Boolean);

  return {
    page,
    pagecount: data?.data?.numPages || 1,
    total: data?.data?.numResults || list.length,
    list,
  };
}

async function searchBiliVideoByKeywordWithRetry(keyword, page) {
  const candidates = getVideoKeywordCandidates(keyword);
  let lastError = null;
  let bestEmpty = null;

  for (const candidate of candidates) {
    for (let i = 0; i < 2; i++) {
      try {
        const result = await searchBiliVideoOnce(candidate, page);
        if (Array.isArray(result.list) && result.list.length > 0) {
          return result;
        }
        bestEmpty = result;
      } catch (error) {
        lastError = error;
      }
    }
  }

  if (bestEmpty) return bestEmpty;
  if (lastError) throw lastError;
  return { page, pagecount: 0, total: 0, list: [] };
}

async function getPopularVideoList() {
  const url = "https://api.bilibili.com/x/web-interface/popular?ps=12&pn=1";
  const { data } = await axios.get(url, { headers: BILI_HEADERS });

  return (data?.data?.list || []).map((item) => ({
    vod_id: `video:${String(item.aid || "")}`,
    vod_name: stripHtml(item.title),
    vod_pic: fixCover(item.pic),
    vod_remarks: formatDuration(item.duration),
    type_id: "",
    type_name: "",
  }));
}

async function getPgcHomeList() {
  const seasonTypes = ["1", "4", "2", "5", "3", "7"];
  const merged = [];

  for (const seasonType of seasonTypes) {
    try {
      let url = "";
      if (["1", "4"].includes(seasonType)) {
        url = `https://api.bilibili.com/pgc/web/rank/list?season_type=${seasonType}&pagesize=4&page=1&day=3`;
      } else {
        url = `https://api.bilibili.com/pgc/season/rank/web/list?season_type=${seasonType}&pagesize=4&page=1&day=3`;
      }

      const { data } = await axios.get(url, { headers: BILI_HEADERS });
      const rawList = data?.result?.list || data?.data?.list || [];

      for (const vod of rawList) {
        const title = String(vod.title || "").trim();
        if (!title || /预告|preview/i.test(title)) continue;

        merged.push({
          vod_id: `pgc:${String(vod.season_id || "")}`,
          vod_name: title,
          vod_pic: fixCover(vod.cover),
          vod_remarks: vod.new_ep?.index_show || vod.index_show || "",
          type_id: "",
          type_name: "",
        });
      }
    } catch (_) {}
  }

  return merged.slice(0, 12);
}

async function home() {
  try {
    const cacheKey = "biliall:home:full:v3";
    const cached = await getCacheSafe(cacheKey);
    if (cached?.class?.length) {
      return cached;
    }

    const [videoList, pgcList] = await Promise.all([
      getPopularVideoList().catch(() => []),
      getPgcHomeList().catch(() => []),
    ]);

    const merged = [];
    const maxLen = Math.max(videoList.length, pgcList.length);

    for (let i = 0; i < maxLen; i++) {
      if (pgcList[i]) merged.push(pgcList[i]);
      if (videoList[i]) merged.push(videoList[i]);
    }

    const result = {
      class: CLASSES,
      list: merged.slice(0, 24),
    };

    await setCacheSafe(cacheKey, result, 300);
    return result;
  } catch (error) {
    await logError("Load home failed", error);
    return { class: CLASSES, list: [] };
  }
}

async function fetchFeaturedUpCategory(mid, page, pageSize = 24) {
  const cacheKey = `biliall:up:category:v3:${mid}:${page}:${pageSize}`;
  const staleCacheKey = `biliall:up:category:stale:v3:${mid}:${page}:${pageSize}`;

  try {
    const cached = await getCacheSafe(cacheKey);
    if (cached?.list?.length) {
      return cached;
    }

    if (page > 1) {
      return { page, pagecount: 1, total: 0, list: [] };
    }

    const [info, collections, upWorks] = await Promise.all([
      fetchUpInfo(mid),
      fetchUpCollections(mid).catch(() => ({ seasons: [], series: [] })),
      fetchUpAllVideosV2(mid).catch(() => []),
    ]);

    const featuredWorks = [...upWorks]
      .sort(
        (a, b) =>
          Number(b?.play || b?.stat?.view || b?.arc?.stat?.view || 0) -
          Number(a?.play || a?.stat?.view || a?.arc?.stat?.view || 0)
      )
      .slice(0, 6);
    const latestWorks = upWorks.slice(0, Math.max(12, pageSize));

    const list = [
      buildUpMenuListItem({
        mid,
        menuType: "featured",
        name: "代表作",
        pic: featuredWorks[0]?.pic || featuredWorks[0]?.arc?.pic || info?.face || "",
        remarks: featuredWorks.length > 0 ? `精选 ${featuredWorks.length}` : "精选合集",
        subtitle: featuredWorks
          .slice(0, 2)
          .map((item) => stripHtml(item?.title || item?.arc?.title || ""))
          .filter(Boolean)
          .join(" / "),
      }),
      buildUpMenuListItem({
        mid,
        menuType: "latest",
        name: "视频",
        pic: latestWorks[0]?.pic || latestWorks[0]?.arc?.pic || info?.face || "",
        remarks: latestWorks.length > 0 ? `最新发布 ${latestWorks.length}` : "最新发布",
        subtitle: "最新投稿",
      }),
      ...(collections?.seasons || []).map((item) =>
        buildUpMenuListItem({
          mid,
          menuType: "season",
          menuKey: String(item?.meta?.season_id || ""),
          name: `合集·${stripHtml(item?.meta?.title || item?.meta?.name || "")}`,
          pic:
            item?.archives?.[0]?.pic ||
            item?.archives?.[0]?.arc?.pic ||
            info?.face ||
            "",
          remarks: `${Number(item?.meta?.total || item?.archives?.length || 0)} 集`,
          subtitle: "合集与系列",
        })
      ),
      ...(collections?.series || []).map((item) =>
        buildUpMenuListItem({
          mid,
          menuType: "series",
          menuKey: String(item?.meta?.series_id || ""),
          name: `系列·${stripHtml(item?.meta?.title || item?.meta?.name || "")}`,
          pic:
            item?.archives?.[0]?.pic ||
            item?.archives?.[0]?.arc?.pic ||
            info?.face ||
            "",
          remarks: `${Number(item?.meta?.total || item?.archives?.length || 0)} 集`,
          subtitle: "合集与系列",
        })
      ),
    ].filter(Boolean);

    const result = {
      page,
      pagecount: 1,
      total: list.length,
      list,
    };

    if (list.length > 0) {
      await setCacheSafe(cacheKey, result, 300);
      await setCacheSafe(staleCacheKey, result, 3600);
      return result;
    }

    const stale = await getCacheSafe(staleCacheKey);
    if (stale?.list?.length) {
      return stale;
    }

    return result;
  } catch (error) {
    await logWarn(`Load featured UP category failed mid=${mid}: ${error.message}`);
    const stale = await getCacheSafe(staleCacheKey);
    if (stale?.list?.length) {
      return stale;
    }

    return { page, pagecount: page, total: 0, list: [] };
  }
}

async function fetchCustomUpCategory(page, pageSize = 24) {
  if (page > 1) {
    return { page, pagecount: 1, total: 0, list: [] };
  }

  const cacheKey = `biliall:up:custom:v3:${page}:${pageSize}`;
  const cached = await getCacheSafe(cacheKey);
  if (cached?.list?.length) {
    return cached;
  }

  const envValue =
    (await getEnvSafe("BILI_CUSTOM_UPS", "")) ||
    (await getEnvSafe("DIY_UPS", ""));
  const envEntries = parseCustomUpConfigEntries(envValue);
  const defaultEntries = FEATURED_UPS.map((item) => ({
    mid: String(item.mid || ""),
    alias: String(item.class_name || ""),
  }));
  const mergedEntries = [...envEntries, ...defaultEntries].filter(Boolean);
  const uniqueEntries = [];
  const seenMids = new Set();
  for (const entry of mergedEntries) {
    const mid = String(entry?.mid || "");
    if (!mid || seenMids.has(mid)) continue;
    seenMids.add(mid);
    uniqueEntries.push(entry);
  }

  const customItems = await Promise.all(
    uniqueEntries.map(async ({ mid, alias }) => {
      try {
        const info = await fetchUpInfo(mid);
        return buildUpHomeListItem(
          {
            ...info,
            name: alias || info?.name || mid,
          },
          alias || mid
        );
      } catch (_) {
        return buildUpHomeListItem(
          {
            mid,
            name: alias || mid,
            sign: "读取失败，请检查mid",
          },
          alias || mid
        );
      }
    })
  );

  const list = customItems.filter(Boolean);
  const result = {
    page,
    pagecount: 1,
    total: list.length,
    list,
  };

  if (list.length > 0) {
    await setCacheSafe(cacheKey, result, 180);
  }

  return result;
}

async function category(params) {
  const categoryId = String(params.categoryId || "");
  const page = Math.max(1, parseInt(params.page, 10) || 1);

  if (!categoryId) {
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }

  const featuredUp = findFeaturedUpByCategoryId(categoryId);
  if (featuredUp) {
    return fetchFeaturedUpCategory(featuredUp.mid, page);
  }

  if (categoryId === DIY_UP_CLASS.type_id) {
    return fetchCustomUpCategory(page);
  }

  if (isPgcCategory(categoryId)) {
    const seasonType = categoryId.replace("pgc_", "");
    const cacheKey = `biliall:pgc:category:${seasonType}:${page}`;

    try {
      const cached = await getCacheSafe(cacheKey);
      if (cached?.list?.length) {
        return cached;
      }

      let url = "";
      if (["1", "4"].includes(seasonType)) {
        url = `https://api.bilibili.com/pgc/web/rank/list?season_type=${seasonType}&pagesize=20&page=${page}&day=3`;
      } else {
        url = `https://api.bilibili.com/pgc/season/rank/web/list?season_type=${seasonType}&pagesize=20&page=${page}&day=3`;
      }

      const { data } = await axios.get(url, { headers: BILI_HEADERS });
      const rawList = data?.result?.list || data?.data?.list || [];

      const list = rawList
        .map((vod) => {
          const title = String(vod.title || "").trim();
          if (!title || /预告|preview/i.test(title)) return null;

          return {
            vod_id: `pgc:${String(vod.season_id || "")}`,
            vod_name: title,
            vod_pic: fixCover(vod.cover),
            vod_remarks: vod.new_ep?.index_show || vod.index_show || "",
          };
        })
        .filter(Boolean);

      const result = {
        page,
        pagecount: list.length === 20 ? page + 1 : page,
        total: page * 20 + list.length,
        list,
      };

      await setCacheSafe(cacheKey, result, 300);
      return result;
    } catch (error) {
      await logError("Load PGC category failed", error);
      return { page, pagecount: 0, total: 0, list: [] };
    }
  }

  const cacheKey = `biliall:video:category:${categoryId}:${page}`;
  const staleCacheKey = `biliall:video:category:stale:${categoryId}:${page}`;

  try {
    const cached = await getCacheSafe(cacheKey);
    if (cached?.list?.length) {
      return cached;
    }

    const result = await searchBiliVideoByKeywordWithRetry(categoryId, page);

    if (Array.isArray(result.list) && result.list.length > 0) {
      await setCacheSafe(cacheKey, result, 300);
      await setCacheSafe(staleCacheKey, result, 3600);
      return result;
    }

    const stale = await getCacheSafe(staleCacheKey);
    if (stale?.list?.length) {
      await logInfo(`Fallback stale category cache: ${categoryId}, page=${page}`);
      return stale;
    }

    return result;
  } catch (error) {
    await logError("Load video category failed", error);

    const stale = await getCacheSafe(staleCacheKey);
    if (stale?.list?.length) {
      await logInfo(`Use stale category cache after error: ${categoryId}, page=${page}`);
      return stale;
    }

    return { page, pagecount: 0, total: 0, list: [] };
  }
}

async function search(params) {
  const keyword = String(params.keyword || params.wd || "").trim();
  const page = Math.max(1, parseInt(params.page, 10) || 1);

  if (!keyword) {
    return { page: 1, pagecount: 0, total: 0, list: [] };
  }

  const cacheKey = `biliall:search:v3:${keyword}:${page}`;
  const staleCacheKey = `biliall:search:stale:v3:${keyword}:${page}`;

  try {
    const cached = await getCacheSafe(cacheKey);
    if (cached?.list?.length) {
      return cached;
    }

    const [upResult, videoResult] = await Promise.all([
      searchBiliUpOnce(keyword, page).catch(() => ({ page, pagecount: 0, total: 0, list: [] })),
      searchBiliVideoByKeywordWithRetry(keyword, page),
    ]);

    const merged = [];
    const seenVodIds = new Set();

    for (const item of [...(upResult.list || []), ...(videoResult.list || [])]) {
      const vodId = String(item?.vod_id || "");
      if (!vodId || seenVodIds.has(vodId)) continue;
      seenVodIds.add(vodId);
      merged.push(item);
    }

    const result = {
      page,
      pagecount: Math.max(upResult.pagecount || 0, videoResult.pagecount || 0, page),
      total: Number(upResult.total || 0) + Number(videoResult.total || 0),
      list: merged,
    };

    if (Array.isArray(result.list) && result.list.length > 0) {
      await setCacheSafe(cacheKey, result, 300);
      await setCacheSafe(staleCacheKey, result, 3600);
      return result;
    }

    const stale = await getCacheSafe(staleCacheKey);
    if (stale?.list?.length) {
      await logInfo(`Fallback stale search cache: ${keyword}, page=${page}`);
      return stale;
    }

    return result;
  } catch (error) {
    await logError("Search failed", error);

    const stale = await getCacheSafe(staleCacheKey);
    if (stale?.list?.length) {
      await logInfo(`Use stale search cache after error: ${keyword}, page=${page}`);
      return stale;
    }

    return { page, pagecount: 0, total: 0, list: [] };
  }
}

async function detail(params) {
  const videoId = String(params.videoId || "");
  if (!videoId) return { list: [] };

  if (isPgcVideoId(videoId)) {
    const seasonId = videoId.replace("pgc:", "");
    const cacheKey = `biliall:pgc:detail:v4:${seasonId}`;

    try {
      const cached = await getCacheSafe(cacheKey);
      if (cached?.list?.length) {
        return cached;
      }

      const { data } = await axios.get(
        `https://api.bilibili.com/pgc/view/web/season?season_id=${seasonId}`,
        { headers: BILI_HEADERS }
      );

      const res = data?.result;
      if (!res) return { list: [] };

      const episodes = (res.episodes || [])
        .filter((ep) => !/预告|preview/i.test(String(ep.title || "")))
        .map((ep) => {
          const name = `${String(ep.title || "").replace(/#/g, "-")} ${String(
            ep.long_title || ""
          ).trim()}`.trim();

          return {
            name: name || "正片",
            basePlayId: `${res.season_id}_${ep.id}_${ep.cid}`,
          };
        });

      const result = {
        list: [
          {
            vod_id: `pgc:${String(res.season_id || "")}`,
            vod_name: String(res.title || ""),
            vod_pic: fixCover(res.cover),
            vod_content: String(res.evaluate || res.new_ep?.desc || ""),
            vod_remarks: res.new_ep?.index_show || "",
            vod_play_sources: [
              {
                name: LINE_NAME_PRIMARY,
                episodes: episodes.map((ep) => ({
                  name: ep.name,
                  playId: `pgc:${ep.basePlayId}@full|${res.title || ""}|${ep.name || "正片"}`,
                })),
              },
              {
                name: LINE_NAME_COMPAT,
                episodes: episodes.map((ep) => ({
                  name: ep.name,
                  playId: `pgc:${ep.basePlayId}@direct|${res.title || ""}|${ep.name || "正片"}`,
                })),
              },
            ],
          },
        ],
      };

      await setCacheSafe(cacheKey, result, 1800);
      return result;
    } catch (error) {
      await logError("Load PGC detail failed", error);
      return { list: [] };
    }
  }

  const aid = videoId.replace(/^video:/, "");
  const cacheKey = `biliall:video:detail:v2:${aid}`;

  try {
    const cached = await getCacheSafe(cacheKey);
    if (cached?.list?.length) {
      return cached;
    }

    const { data } = await axios.get(
      `https://api.bilibili.com/x/web-interface/view?aid=${aid}`,
      { headers: BILI_HEADERS }
    );

    const video = data?.data;
    if (!video) return { list: [] };

    const episodes = (video.pages || []).map((p, i) => {
      const part = p.part || `第${i + 1}集`;
      return {
        name: part,
        basePlayId: `video:${aid}_${p.cid}`,
      };
    });

    const result = {
      list: [
        {
          vod_id: `video:${String(aid)}`,
          vod_name: stripHtml(video.title),
          vod_pic: fixCover(video.pic),
          vod_content: String(video.desc || ""),
          vod_play_sources: [
            {
              name: LINE_NAME_PRIMARY,
              episodes: episodes.map((ep) => ({
                name: ep.name,
                playId: `${ep.basePlayId}@full|${video.title || ""}|${ep.name}`,
              })),
            },
            {
              name: LINE_NAME_COMPAT,
              episodes: episodes.map((ep) => ({
                name: ep.name,
                playId: `${ep.basePlayId}@direct|${video.title || ""}|${ep.name}`,
              })),
            },
          ],
        },
      ],
    };

    await setCacheSafe(cacheKey, result, 1800);
    return result;
  } catch (error) {
    await logError("Load video detail failed", error);
    return { list: [] };
  }
}

async function play(params, context) {
  let playId = String(params.playId || "");
  const flag = params.flag || "";

  if (!playId) {
    return { urls: [], parse: 1, header: {}, flag };
  }

  let vodName = "";
  let episodeName = "";

  if (playId.includes("|")) {
    const parts = playId.split("|");
    playId = parts[0] || "";
    vodName = parts[1] || "";
    episodeName = parts[2] || "";
  }

  if (isPgcPlayId(playId)) {
    const rawPlayId = playId.replace(/^pgc:/, "");
    const modeMatch = rawPlayId.match(/@(direct|full)$/);
    const playMode = modeMatch?.[1] || "full";
    const rawId = rawPlayId.replace(/@(direct|full)$/, "").replace(/#.*$/, "");
    const cacheProfile = getPlaybackCacheProfile(context);
    const cacheKey = `biliall:pgc:play:v3:${playMode}:${cacheProfile.transport}:${cacheProfile.escape}:${rawId}`;

    const cached = await getCacheSafe(cacheKey);
    if (cached?.urls?.length) {
      return cached;
    }

    const data = await requestProxyJSON(
      `${PROXY_BASE}/bili/play?id=${encodeURIComponent(rawId)}`
    );

    if (data?.code !== 0 || !Array.isArray(data?.list) || data.list.length === 0) {
      throw new Error("PGC proxy returned no playable urls");
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
                : shouldUseHlsCompat(context)
                  ? buildHlsCompatUrl(rawId, qn)
                  : buildDashProxyUrl(rawId, context, qn),
          }))
        : allUrls.map(({ name, url }) => ({ name, url }));

    const response = {
      urls,
      url: urls[0]?.url || "",
      parse: 0,
      header: {
        "User-Agent": BILI_HEADERS["User-Agent"],
        Referer: "https://www.bilibili.com",
        Origin: "https://www.bilibili.com",
      },
      flag,
    };

    const rawParts = rawId.split("_");
    const cid = rawParts[2] || "";
    let fileName = buildFileNameForDanmu(vodName || "", episodeName || "");
    if (!fileName && urls[0]?.url) {
      fileName = inferFileNameFromURL(urls[0].url);
    }
    const danmaku = await matchDanmu(fileName, cid);
    if (danmaku.length > 0) {
      response.danmaku = danmaku;
    }

    await setCacheSafe(cacheKey, response, 120);
    return response;
  }

  const rawPlayId = playId.replace(/^video:/, "");
  const modeMatch = rawPlayId.match(/@(direct|full)$/);
  const playMode = modeMatch?.[1] || "full";
  const rawId = rawPlayId.replace(/@(direct|full)$/, "").replace(/#.*$/, "");
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
  const videoCompatTransport =
    playMode === "direct" && shouldUseVideoHlsCompat(context) ? "hls" : cacheProfile.transport;
  const cacheKey = `biliall:video:play:v3:${playMode}:${videoCompatTransport}:${cacheProfile.escape}:${aid}:${cid}`;

  const cached = await getCacheSafe(cacheKey);
  if (cached?.urls?.length) {
    return cached;
  }

  const data = await requestProxyJSON(
    `${PROXY_BASE}/bili/video/play?aid=${encodeURIComponent(aid)}&cid=${encodeURIComponent(
      cid
    )}`
  );

  if (data?.code !== 0 || !Array.isArray(data?.list) || data.list.length === 0) {
    throw new Error("Video proxy returned no playable urls");
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
  };

  let fileName = buildFileNameForDanmu(vodName || "", episodeName || "");
  if (!fileName && urls[0]?.url) {
    fileName = inferFileNameFromURL(urls[0].url);
  }
  const danmaku = await matchDanmu(fileName, cid);
  if (danmaku.length > 0) {
    response.danmaku = danmaku;
  }

  await setCacheSafe(cacheKey, response, 120);
  return response;
}

const legacyDetail = detail;
const legacyPlay = play;

async function detail(params) {
  const videoId = String(params?.videoId || "");
  if (!videoId) {
    return { list: [] };
  }

  if (isPgcVideoId(videoId)) {
    return legacyDetail(params);
  }

  const aid = videoId.replace(/^video:/, "");
  const cacheKey = `biliall:video:detail:v4:${aid}`;

  try {
    const cached = await getCacheSafe(cacheKey);
    if (cached?.list?.length) {
      return cached;
    }

    const { data } = await axios.get(
      `https://api.bilibili.com/x/web-interface/view?aid=${aid}`,
      { headers: BILI_HEADERS, timeout: 15000 }
    );

    const video = data?.data;
    if (!video) {
      return { list: [] };
    }

    const cleanTitle = stripHtml(video.title);
    const buildSource = (name, mode, sourceEpisodes) => ({
      name,
      episodes: dedupeEpisodesByPlayId(sourceEpisodes).map((ep) => ({
        name: ep.name,
        playId: `${ep.basePlayId}${mode}|${cleanTitle}|${ep.name}`,
      })),
    });

    let currentEpisodes = buildUgcCollectionEpisodes(video, aid);
    let upWorksEpisodes = [];
    const ownerMid = String(video?.owner?.mid || "");

    if (ownerMid) {
      try {
        const upWorks = await fetchUpAllVideos(ownerMid);
        upWorksEpisodes = dedupeEpisodesByPlayId(
          upWorks
            .map((item, index) => buildArchiveEpisode(item, index, item?.meta?.title || ""))
            .filter(Boolean)
        );

        if (currentEpisodes.length === 0) {
          const currentItem = upWorks.find((item) => String(item?.aid || "") === String(aid));
          const seasonId = String(
            currentItem?.season_id || currentItem?.meta?.id || currentItem?.meta?.season_id || ""
          );
          if (seasonId) {
            const seasonData = await fetchSeasonArchives(ownerMid, seasonId);
            if (seasonData?.episodes?.length) {
              currentEpisodes = seasonData.episodes;
            }
          }
        }
      } catch (error) {
        await logWarn(`Load UP works failed for mid=${ownerMid}: ${error.message}`);
      }
    }

    if (currentEpisodes.length === 0) {
      currentEpisodes = (video.pages || []).map((p, i) => ({
        name: stripHtml(p?.part || "") || `第${i + 1}集`,
        basePlayId: `video:${aid}_${p.cid}`,
      }));
    }

    const vodPlaySources = [
      buildSource(LINE_NAME_PRIMARY, "@full", currentEpisodes),
      buildSource(LINE_NAME_COMPAT, "@direct", currentEpisodes),
    ];

    if (upWorksEpisodes.length > 0) {
      vodPlaySources.push(buildSource(UP_WORKS_LINE_NAME, "@full", upWorksEpisodes));
      vodPlaySources.push(buildSource(UP_WORKS_COMPAT_LINE_NAME, "@direct", upWorksEpisodes));
    }

    const result = {
      list: [
        {
          vod_id: `video:${String(aid)}`,
          vod_name: cleanTitle,
          vod_pic: fixCover(video.pic),
          vod_content: String(video.desc || ""),
          vod_play_sources: vodPlaySources,
        },
      ],
    };

    await setCacheSafe(cacheKey, result, 1800);
    return result;
  } catch (error) {
    await logError("Load video detail v4 failed", error);
    return legacyDetail(params);
  }
}

async function play(params, context) {
  const originalPlayId = String(params?.playId || "");
  if (!originalPlayId || !originalPlayId.startsWith("video:")) {
    return legacyPlay(params, context);
  }

  const parts = originalPlayId.split("|");
  const basePart = String(parts[0] || "");
  const suffixPart = parts.length > 1 ? `|${parts.slice(1).join("|")}` : "";
  const rawPlayId = basePart.replace(/^video:/, "");
  const modeMatch = rawPlayId.match(/@(direct|full)$/);
  const modeSuffix = modeMatch ? `@${modeMatch[1]}` : "";
  const rawId = rawPlayId.replace(/@(direct|full)$/, "");

  if (rawId.includes("_")) {
    return legacyPlay(params, context);
  }

  try {
    const resolved = await resolveVideoCid(rawId);
    if (!resolved?.aid || !resolved?.cid) {
      return legacyPlay(params, context);
    }

    const rewrittenPlayId = `video:${resolved.aid}_${resolved.cid}${modeSuffix}${suffixPart}`;
    return legacyPlay({ ...params, playId: rewrittenPlayId }, context);
  } catch (error) {
    await logWarn(`Resolve aid-only playId failed: ${rawId}, ${error.message}`);
    return legacyPlay(params, context);
  }
}

async function detailV2(params) {
  const videoId = String(params?.videoId || "");
  if (!videoId) {
    return { list: [] };
  }

  if (isPgcVideoId(videoId)) {
    const seasonId = videoId.replace("pgc:", "");
    const cacheKey = `biliall:pgc:detail:v4:${seasonId}`;

    try {
      const cached = await getCacheSafe(cacheKey);
      if (cached?.list?.length) {
        return cached;
      }

      const { data } = await axios.get(
        `https://api.bilibili.com/pgc/view/web/season?season_id=${seasonId}`,
        { headers: BILI_HEADERS, timeout: 15000 }
      );

      const res = data?.result;
      if (!res) {
        return { list: [] };
      }

      const episodes = (res.episodes || [])
        .filter((ep) => !/棰勫憡|preview/i.test(String(ep.title || "")))
        .map((ep) => {
          const name = `${String(ep.title || "").replace(/#/g, "-")} ${String(
            ep.long_title || ""
          ).trim()}`.trim();
          return {
            name: name || "正片",
            basePlayId: `${res.season_id}_${ep.id}_${ep.cid}`,
          };
        });

      const result = {
        list: [
          {
            vod_id: `pgc:${String(res.season_id || "")}`,
            vod_name: String(res.title || ""),
            vod_pic: fixCover(res.cover),
            vod_content: String(res.evaluate || res.new_ep?.desc || ""),
            vod_remarks: res.new_ep?.index_show || "",
            vod_play_sources: [
              {
                name: LINE_NAME_PRIMARY,
                episodes: episodes.map((ep) => ({
                  name: ep.name,
                  playId: `pgc:${ep.basePlayId}@full|${res.title || ""}|${ep.name || "正片"}`,
                })),
              },
              {
                name: LINE_NAME_COMPAT,
                episodes: episodes.map((ep) => ({
                  name: ep.name,
                  playId: `pgc:${ep.basePlayId}@direct|${res.title || ""}|${ep.name || "正片"}`,
                })),
              },
            ],
          },
        ],
      };

      await setCacheSafe(cacheKey, result, 1800);
      return result;
    } catch (error) {
      await logError("Load PGC detail v2 failed", error);
      return { list: [] };
    }
  }

  const aid = videoId.replace(/^video:/, "");
  const cacheKey = `biliall:video:detail:v4:${aid}`;

  try {
    const cached = await getCacheSafe(cacheKey);
    if (cached?.list?.length) {
      return cached;
    }

    const { data } = await axios.get(
      `https://api.bilibili.com/x/web-interface/view?aid=${aid}`,
      { headers: BILI_HEADERS, timeout: 15000 }
    );

    const video = data?.data;
    if (!video) {
      return { list: [] };
    }

    const cleanTitle = stripHtml(video.title);
    const buildSource = (name, mode, sourceEpisodes) => ({
      name,
      episodes: dedupeEpisodesByPlayId(sourceEpisodes).map((ep) => ({
        name: ep.name,
        playId: `${ep.basePlayId}${mode}|${cleanTitle}|${ep.name}`,
      })),
    });

    let currentEpisodes = buildUgcCollectionEpisodes(video, aid);
    let upWorksEpisodes = [];
    const ownerMid = String(video?.owner?.mid || "");

    if (ownerMid) {
      try {
        const upWorks = await fetchUpAllVideos(ownerMid);
        upWorksEpisodes = dedupeEpisodesByPlayId(
          upWorks
            .map((item, index) => buildArchiveEpisode(item, index, item?.meta?.title || ""))
            .filter(Boolean)
        );

        if (currentEpisodes.length === 0) {
          const currentItem = upWorks.find((item) => String(item?.aid || "") === String(aid));
          const seasonId = String(
            currentItem?.season_id || currentItem?.meta?.id || currentItem?.meta?.season_id || ""
          );
          if (seasonId) {
            const seasonData = await fetchSeasonArchives(ownerMid, seasonId);
            if (seasonData?.episodes?.length) {
              currentEpisodes = seasonData.episodes;
            }
          }
        }
      } catch (error) {
        await logWarn(`Load UP works failed for mid=${ownerMid}: ${error.message}`);
      }
    }

    if (currentEpisodes.length === 0) {
      currentEpisodes = (video.pages || []).map((p, i) => ({
        name: stripHtml(p?.part || "") || `第${i + 1}集`,
        basePlayId: `video:${aid}_${p.cid}`,
      }));
    }

    const vodPlaySources = [
      buildSource(LINE_NAME_PRIMARY, "@full", currentEpisodes),
      buildSource(LINE_NAME_COMPAT, "@direct", currentEpisodes),
    ];

    if (upWorksEpisodes.length > 0) {
      vodPlaySources.push(buildSource(UP_WORKS_LINE_NAME, "@full", upWorksEpisodes));
      vodPlaySources.push(buildSource(UP_WORKS_COMPAT_LINE_NAME, "@direct", upWorksEpisodes));
    }

    const result = {
      list: [
        {
          vod_id: `video:${String(aid)}`,
          vod_name: cleanTitle,
          vod_pic: fixCover(video.pic),
          vod_content: String(video.desc || ""),
          vod_play_sources: vodPlaySources,
        },
      ],
    };

    await setCacheSafe(cacheKey, result, 1800);
    return result;
  } catch (error) {
    await logError("Load video detail v4 failed", error);
    return { list: [] };
  }
}

async function playV2(params, context) {
  let playId = String(params?.playId || "");
  const flag = params?.flag || "";

  if (!playId) {
    return { urls: [], parse: 1, header: {}, flag };
  }

  let vodName = "";
  let episodeName = "";

  if (playId.includes("|")) {
    const parts = playId.split("|");
    playId = parts[0] || "";
    vodName = parts[1] || "";
    episodeName = parts[2] || "";
  }

  if (isPgcPlayId(playId)) {
    const rawPlayId = playId.replace(/^pgc:/, "");
    const modeMatch = rawPlayId.match(/@(direct|full)$/);
    const playMode = modeMatch?.[1] || "full";
    const rawId = rawPlayId.replace(/@(direct|full)$/, "");
    const cacheProfile = getPlaybackCacheProfile(context);
    const cacheKey = `biliall:pgc:play:v3:${playMode}:${cacheProfile.transport}:${cacheProfile.escape}:${rawId}`;

    const cached = await getCacheSafe(cacheKey);
    if (cached?.urls?.length) {
      return cached;
    }

    const data = await requestProxyJSON(
      `${PROXY_BASE}/bili/play?id=${encodeURIComponent(rawId)}`
    );

    if (data?.code !== 0 || !Array.isArray(data?.list) || data.list.length === 0) {
      throw new Error("PGC proxy returned no playable urls");
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
                : shouldUseHlsCompat(context)
                  ? buildHlsCompatUrl(rawId, qn)
                  : buildDashProxyUrl(rawId, context, qn),
          }))
        : allUrls.map(({ name, url }) => ({ name, url }));

    const response = {
      urls,
      url: urls[0]?.url || "",
      parse: 0,
      header: {
        "User-Agent": BILI_HEADERS["User-Agent"],
        Referer: "https://www.bilibili.com",
        Origin: "https://www.bilibili.com",
      },
      flag,
    };

    const rawParts = rawId.split("_");
    const cid = rawParts[2] || "";
    let fileName = buildFileNameForDanmu(vodName || "", episodeName || "");
    if (!fileName && urls[0]?.url) {
      fileName = inferFileNameFromURL(urls[0].url);
    }
    const danmaku = await matchDanmu(fileName, cid);
    if (danmaku.length > 0) {
      response.danmaku = danmaku;
    }

    await setCacheSafe(cacheKey, response, 120);
    return response;
  }

  const rawPlayId = playId.replace(/^video:/, "");
  const modeMatch = rawPlayId.match(/@(direct|full)$/);
  const playMode = modeMatch?.[1] || "full";
  const rawId = rawPlayId.replace(/@(direct|full)$/, "");

  let aid = "";
  let cid = "";
  const idParts = rawId.split("_");
  if (idParts.length >= 2) {
    aid = String(idParts[0] || "");
    cid = String(idParts[1] || "");
  } else {
    const resolved = await resolveVideoCid(rawId);
    aid = String(resolved?.aid || "");
    cid = String(resolved?.cid || "");
  }

  if (!aid || !cid) {
    return {
      urls: [{ name: "播放", url: rawId }],
      parse: /\.(m3u8|mp4|flv)$/i.test(rawId) ? 0 : 1,
      header: {},
      flag,
    };
  }

  const cacheProfile = getPlaybackCacheProfile(context);
  const videoCompatTransport =
    playMode === "direct" && shouldUseVideoHlsCompat(context) ? "hls" : cacheProfile.transport;
  const cacheKey = `biliall:video:play:v4:${playMode}:${videoCompatTransport}:${cacheProfile.escape}:${aid}:${cid}`;

  const cached = await getCacheSafe(cacheKey);
  if (cached?.urls?.length) {
    return cached;
  }

  const data = await requestProxyJSON(
    `${PROXY_BASE}/bili/video/play?aid=${encodeURIComponent(aid)}&cid=${encodeURIComponent(
      cid
    )}`
  );

  if (data?.code !== 0 || !Array.isArray(data?.list) || data.list.length === 0) {
    throw new Error("Video proxy returned no playable urls");
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
  };

  let fileName = buildFileNameForDanmu(vodName || "", episodeName || "");
  if (!fileName && urls[0]?.url) {
    fileName = inferFileNameFromURL(urls[0].url);
  }
  const danmaku = await matchDanmu(fileName, cid);
  if (danmaku.length > 0) {
    response.danmaku = danmaku;
  }

  await setCacheSafe(cacheKey, response, 120);
  return response;
}

function buildSectionEpisodes(section, fallbackAid = "") {
  const episodes = Array.isArray(section?.episodes) ? section.episodes : [];
  return dedupeEpisodesByPlayId(
    episodes
      .map((episode, index) => {
        const aid = String(episode?.aid || episode?.arc?.aid || fallbackAid || "");
        if (!aid) return null;

        const title = stripHtml(
          episode?.title || episode?.arc?.title || episode?.page?.part || ""
        );
        const sectionTitle = stripHtml(section?.title || "");
        const name =
          sectionTitle && title && !title.includes(sectionTitle)
            ? `[${sectionTitle}] ${title}`
            : title || `第${index + 1}集`;

        return {
          name,
          basePlayId: `video:${aid}`,
        };
      })
      .filter(Boolean)
  );
}

async function fetchUpAllVideosV2(mid) {
  const currentKey = `biliall:up:works:v2:${mid}`;
  const staleKey = `biliall:up:works:stale:v2:${mid}`;

  const current = await getCacheSafe(currentKey);
  if (current?.length) {
    return current;
  }

  try {
    const pageSize = 50;
    const maxPages = 30;
    const all = [];
    let total = 0;

    for (let page = 1; page <= maxPages; page++) {
      const { data } = await axios.get("https://api.bilibili.com/x/space/arc/search", {
        headers: BILI_HEADERS,
        timeout: 15000,
        params: {
          mid,
          pn: page,
          ps: pageSize,
          order: "pubdate",
        },
      });

      if (data?.code !== 0) {
        throw new Error(`space arc search failed: ${data?.message || data?.code}`);
      }

      const pageItems = Array.isArray(data?.data?.list?.vlist) ? data.data.list.vlist : [];
      total = Number(data?.data?.page?.count || total || pageItems.length);
      all.push(...pageItems);

      if (all.length >= total || pageItems.length === 0) {
        break;
      }

      await sleep(250);
    }

    const deduped = [];
    const seen = new Set();
    for (const item of all) {
      const aid = String(item?.aid || "");
      if (!aid || seen.has(aid)) continue;
      seen.add(aid);
      deduped.push(item);
    }

    if (deduped.length > 0) {
      await setCacheSafe(currentKey, deduped, 900);
      await setCacheSafe(staleKey, deduped, 21600);
      return deduped;
    }
  } catch (error) {
    await logWarn(`fetchUpAllVideosV2 failed mid=${mid}: ${error.message}`);
  }

  const stale = await getCacheSafe(staleKey);
  return Array.isArray(stale) ? stale : [];
}

async function detailUpHome(videoId) {
  const mid = String(videoId || "").replace(/^up:/, "");
  if (!/^\d+$/.test(mid)) {
    return { list: [] };
  }

  const cacheKey = `biliall:up:detail:v5:${mid}`;

  try {
    const cached = await getCacheSafe(cacheKey);
    if (cached?.list?.length) {
      return cached;
    }

    const [info, collections, upWorks] = await Promise.all([
      fetchUpInfo(mid),
      fetchUpCollections(mid).catch(() => ({ seasons: [], series: [] })),
      fetchUpAllVideosV2(mid).catch(() => []),
    ]);

    const upName = stripHtml(info?.name || mid);
    const vodPlaySources = [];
    const latestEpisodes = upWorks
      .map((item, index) => buildArchiveEpisode(item, index))
      .filter(Boolean);

    if (latestEpisodes.length > 0) {
      vodPlaySources.push(
        ...buildPagedEpisodeSourceVariants("最新投稿", upName, latestEpisodes, 50)
      );
    }

    const seasonSources = await Promise.all(
      (collections?.seasons || []).map(async (item) => {
        const seasonId = String(item?.meta?.season_id || "");
        if (!seasonId) return [];

        try {
          const seasonData = await fetchSeasonArchives(mid, seasonId);
          const sectionData = await fetchSeasonSectionSources(
            mid,
            seasonId,
            String(item?.archives?.[0]?.aid || "")
          ).catch(() => []);
          const title = stripHtml(
            item?.meta?.title || item?.meta?.name || seasonData?.title || ""
          );
          if (!title || !seasonData?.episodes?.length) {
            return [];
          }

          const outlineEpisodes =
            sectionData.length > 0
              ? buildOutlineEpisodes(sectionData, seasonData.episodes)
              : seasonData.episodes;
          seasonData.episodes = outlineEpisodes;

          return [
            ...sectionData.flatMap((section) =>
              buildPagedEpisodeSourceVariants(
                `合集·${title}·${section.title}`,
                upName,
                section.episodes,
                50
              )
            ),
            ...buildPagedEpisodeSourceVariants(`合集·${title}`, upName, outlineEpisodes, 50),
          ];
        } catch (error) {
          await logWarn(`Load UP season failed mid=${mid}, season=${seasonId}: ${error.message}`);
          return [];
        }
      })
    );

    const seriesSources = await Promise.all(
      (collections?.series || []).map(async (item) => {
        const seriesId = String(item?.meta?.series_id || "");
        if (!seriesId) return [];

        try {
          const seriesData = await fetchSeriesArchives(mid, seriesId);
          const title = stripHtml(
            item?.meta?.title || item?.meta?.name || seriesData?.title || ""
          );
          if (!title || !seriesData?.episodes?.length) {
            return [];
          }

          return buildPagedEpisodeSourceVariants(`系列·${title}`, upName, seriesData.episodes, 50);
        } catch (error) {
          await logWarn(`Load UP series failed mid=${mid}, series=${seriesId}: ${error.message}`);
          return [];
        }
      })
    );

    vodPlaySources.push(...seasonSources.flat(), ...seriesSources.flat());

    const officialTitle = stripHtml(info?.official?.title || "");
    const liveRoomUrl = String(info?.live_room?.url || "");
    const contentParts = [stripHtml(info?.sign || "")];
    if (officialTitle) {
      contentParts.push(officialTitle);
    }
    if (liveRoomUrl) {
      contentParts.push(`直播间：${liveRoomUrl}`);
    }

    const result = {
      list: [
        {
          vod_id: `up:${mid}`,
          vod_name: upName,
          vod_pic: fixCover(info?.face || ""),
          vod_remarks: officialTitle || "UP主页",
          vod_content: contentParts.filter(Boolean).join("\n"),
          vod_play_sources: vodPlaySources,
        },
      ],
    };

    await setCacheSafe(cacheKey, result, 1800);
    return result;
  } catch (error) {
    await logError("Load UP home detail failed", error);
    return { list: [] };
  }
}

async function detailUpMenu(videoId) {
  const parsed = parseUpMenuVideoId(videoId);
  if (!parsed?.mid || !parsed?.menuType) {
    return { list: [] };
  }

  const { mid, menuType, menuKey } = parsed;
  const cacheKey = `biliall:upmenu:detail:v1:${mid}:${menuType}:${menuKey}`;

  try {
    const cached = await getCacheSafe(cacheKey);
    if (cached?.list?.length) {
      return cached;
    }

    const info = await fetchUpInfo(mid).catch(() => ({}));
    const upName = stripHtml(info?.name || mid);
    let title = "";
    let episodes = [];

    if (menuType === "featured" || menuType === "latest") {
      const upWorks = await fetchUpAllVideosV2(mid).catch(() => []);
      const sourceWorks =
        menuType === "featured"
          ? [...upWorks]
              .sort(
                (a, b) =>
                  Number(b?.play || b?.stat?.view || b?.arc?.stat?.view || 0) -
                  Number(a?.play || a?.stat?.view || a?.arc?.stat?.view || 0)
              )
              .slice(0, 60)
          : upWorks;

      title = menuType === "featured" ? "代表作" : "视频";
      episodes = sourceWorks
        .map((item, index) => buildArchiveEpisode(item, index))
        .filter(Boolean);
    } else if (menuType === "season" && menuKey) {
      const seasonData = await fetchSeasonArchives(mid, menuKey);
      const sectionData = await fetchSeasonSectionSources(mid, menuKey).catch(() => []);
      title = `合集·${stripHtml(seasonData?.title || "")}`;
      episodes =
        sectionData.length > 0
          ? buildOutlineEpisodes(sectionData, seasonData?.episodes || [])
          : seasonData?.episodes || [];
    } else if (menuType === "series" && menuKey) {
      const seriesData = await fetchSeriesArchives(mid, menuKey);
      title = `系列·${stripHtml(seriesData?.title || "")}`;
      episodes = seriesData?.episodes || [];
    }

    const dedupedEpisodes = dedupeEpisodesByPlayId(episodes);
    if (!title || dedupedEpisodes.length === 0) {
      return { list: [] };
    }

    const result = {
      list: [
        {
          vod_id: videoId,
          vod_name: title,
          vod_pic: fixCover(info?.face || ""),
          vod_remarks: upName,
          vod_content: stripHtml(info?.sign || ""),
          vod_play_sources: [
            buildLineSource("哔哩原线", "@full", title, dedupedEpisodes),
            buildLineSource("哔哩兼容", "@direct", title, dedupedEpisodes),
          ].filter((source) => Array.isArray(source?.episodes) && source.episodes.length > 0),
        },
      ],
    };

    await setCacheSafe(cacheKey, result, 1800);
    return result;
  } catch (error) {
    await logError("Load UP menu detail failed", error);
    return { list: [] };
  }
}


async function detailV3(params) {
  const videoId = String(params?.videoId || "");
  if (!videoId) {
    return { list: [] };
  }

  if (isUpHomeVideoId(videoId)) {
    return detailUpHome(videoId);
  }

  if (isPgcVideoId(videoId)) {
    return detailV2(params);
  }

  const aid = videoId.replace(/^video:/, "");
  const cacheKey = `biliall:video:detail:v8:${aid}`;

  try {
    const cached = await getCacheSafe(cacheKey);
    if (cached?.list?.length) {
      return cached;
    }

    const { data } = await axios.get(
      `https://api.bilibili.com/x/web-interface/view?aid=${aid}`,
      { headers: BILI_HEADERS, timeout: 15000 }
    );

    const video = data?.data;
    if (!video) {
      return { list: [] };
    }

    const cleanTitle = stripHtml(video.title);
    const sourceFromEpisodes = (name, mode, sourceEpisodes) => ({
      name,
      episodes: dedupeEpisodesByPlayId(sourceEpisodes).map((ep) => ({
        name: ep.name,
        playId: `${ep.basePlayId}${mode}|${cleanTitle}|${ep.name}`,
      })),
    });

    let currentEpisodes = [];
    let sectionGroups = [];
    const sections = Array.isArray(video?.ugc_season?.sections) ? video.ugc_season.sections : [];
    if (sections.length > 0) {
      sectionGroups = sections
        .map((section) => {
          const sectionName = stripHtml(section?.title || "");
          const episodes = buildSectionEpisodes(section, aid);
          if (!sectionName || episodes.length === 0) return [];

          return [
            sourceFromEpisodes(sectionName, "@full", episodes),
            sourceFromEpisodes(`${sectionName}-兼容`, "@direct", episodes),
          ];
        })
        .flat()
        .filter((item) => Array.isArray(item?.episodes) ? item.episodes.length > 0 : true);

      const currentSection =
        sections.find((section) =>
          (Array.isArray(section?.episodes) ? section.episodes : []).some(
            (ep) => String(ep?.aid || ep?.arc?.aid || "") === String(aid)
          )
        ) || sections[0];

      currentEpisodes = buildSectionEpisodes(currentSection, aid);
    }

    let upWorksEpisodes = [];
    let seasonEpisodes = [];
    let seasonTitle = stripHtml(video?.ugc_season?.title || "");
    const ownerMid = String(video?.owner?.mid || "");
    if (ownerMid) {
      const upWorks = await fetchUpAllVideosV2(ownerMid);
      upWorksEpisodes = dedupeEpisodesByPlayId(
        upWorks
          .map((item, index) => buildArchiveEpisode(item, index, item?.meta?.title || ""))
          .filter(Boolean)
      );

      const seasonId = String(video?.ugc_season?.id || video?.season_id || "");
      if (seasonId) {
        try {
          const seasonData = await fetchSeasonArchives(ownerMid, seasonId);
          if (seasonData?.episodes?.length) {
            seasonEpisodes = seasonData.episodes;
            seasonTitle = stripHtml(seasonData.title || seasonTitle || "");
          }
        } catch (error) {
          await logWarn(`fetchSeasonArchives failed season=${seasonId}: ${error.message}`);
        }
      }

      if (currentEpisodes.length === 0) {
        const currentItem = upWorks.find((item) => String(item?.aid || "") === String(aid));
        const fallbackSeasonId = String(
          currentItem?.season_id || currentItem?.meta?.id || currentItem?.meta?.season_id || ""
        );
        if (fallbackSeasonId) {
          try {
            const seasonData = await fetchSeasonArchives(ownerMid, fallbackSeasonId);
            if (seasonData?.episodes?.length) {
              currentEpisodes = seasonData.episodes;
            }
          } catch (error) {
            await logWarn(`fetchSeasonArchives fallback failed season=${fallbackSeasonId}: ${error.message}`);
          }
        }
      }
    }

    if (currentEpisodes.length === 0) {
      currentEpisodes = (video.pages || []).map((p, i) => ({
        name: stripHtml(p?.part || "") || `第${i + 1}集`,
        basePlayId: `video:${aid}_${p.cid}`,
      }));
    }

    const vodPlaySources = [];

    if (seasonEpisodes.length > 0 && seasonTitle) {
      vodPlaySources.push(
        ...buildPagedEpisodeSourceVariants(seasonTitle, cleanTitle, seasonEpisodes, 50)
      );
    }

    if (upWorksEpisodes.length > 0) {
      vodPlaySources.push(sourceFromEpisodes(UP_WORKS_LINE_NAME, "@full", upWorksEpisodes));
      vodPlaySources.push(sourceFromEpisodes(UP_WORKS_COMPAT_LINE_NAME, "@direct", upWorksEpisodes));
    }

    if (sectionSources.length > 0) {
      vodPlaySources.push(...sectionSources);
    } else {
      vodPlaySources.push(sourceFromEpisodes(LINE_NAME_PRIMARY, "@full", currentEpisodes));
      vodPlaySources.push(sourceFromEpisodes(LINE_NAME_COMPAT, "@direct", currentEpisodes));
    }

    const result = {
      list: [
        {
          vod_id: `video:${String(aid)}`,
          vod_name: cleanTitle,
          vod_pic: fixCover(video.pic),
          vod_content: String(video.desc || ""),
          vod_play_sources: vodPlaySources,
        },
      ],
    };

    await setCacheSafe(cacheKey, result, 1800);
    return result;
  } catch (error) {
    await logError("Load video detail v5 failed", error);
    return detailV2(params);
  }
}

async function detailV4(params) {
  const videoId = String(params?.videoId || "");
  if (!videoId) {
    return { list: [] };
  }

  if (isUpMenuVideoId(videoId)) {
    return detailUpMenu(videoId);
  }

  if (isUpHomeVideoId(videoId)) {
    return detailUpHome(videoId);
  }

  if (isPgcVideoId(videoId)) {
    return detailV2(params);
  }

  const aid = videoId.replace(/^video:/, "");
  const cacheKey = `biliall:video:detail:v15:${aid}`;

  try {
    const cached = await getCacheSafe(cacheKey);
    if (cached?.list?.length) {
      return cached;
    }

    const { data } = await axios.get(
      `https://api.bilibili.com/x/web-interface/view?aid=${aid}`,
      { headers: BILI_HEADERS, timeout: 15000 }
    );

    const video = data?.data;
    if (!video) {
      return { list: [] };
    }

    const cleanTitle = stripHtml(video.title);
    const ownerMid = String(video?.owner?.mid || "");
    const rawSections = Array.isArray(video?.ugc_season?.sections)
      ? video.ugc_season.sections
      : [];
    const sectionGroups = rawSections
      .map((section) => {
        const title = stripHtml(section?.title || "");
        const episodes = buildSectionEpisodes(section, aid);
        if (!title || episodes.length === 0) return null;
        return { title, episodes };
      })
      .filter(Boolean);

    let currentEpisodes = [];
    const currentSection =
      rawSections.find((section) =>
        (Array.isArray(section?.episodes) ? section.episodes : []).some(
          (ep) => String(ep?.aid || ep?.arc?.aid || "") === String(aid)
        )
      ) || rawSections[0];

    if (currentSection) {
      currentEpisodes = buildSectionEpisodes(currentSection, aid);
    }

    let seasonEpisodes = [];
    if (ownerMid) {
      const seasonId = String(video?.ugc_season?.id || video?.season_id || "");
      if (seasonId) {
        try {
          const seasonData = await fetchSeasonArchives(ownerMid, seasonId);
          if (seasonData?.episodes?.length) {
            seasonEpisodes = seasonData.episodes;
          }
        } catch (error) {
          await logWarn(`detailV4 fetchSeasonArchives failed season=${seasonId}: ${error.message}`);
        }
      }
    }

    if (seasonEpisodes.length === 0 && currentEpisodes.length === 0) {
      currentEpisodes = (video.pages || []).map((p, i) => ({
        name: stripHtml(p?.part || "") || `第${i + 1}集`,
        basePlayId: `video:${aid}_${p.cid}`,
      }));
    }

    const baseEpisodes =
      sectionGroups.length > 0
        ? buildOutlineEpisodes(sectionGroups, seasonEpisodes)
        : currentEpisodes.length > 0
          ? currentEpisodes
          : seasonEpisodes.length > 0
            ? seasonEpisodes
            : applySectionLabelsToEpisodes(currentEpisodes, sectionGroups);

    const playbackEpisodes = prependCurrentEpisodeShortcut(baseEpisodes, `video:${aid}`);

    const vodPlaySources = [
      buildLineSource("哔哩原线", "@full", cleanTitle, playbackEpisodes),
      buildLineSource("哔哩兼容", "@direct", cleanTitle, playbackEpisodes),
    ].filter((source) => Array.isArray(source?.episodes) && source.episodes.length > 0);

    const result = {
      list: [
        {
          vod_id: `video:${String(aid)}`,
          vod_name: cleanTitle,
          vod_pic: fixCover(video.pic),
          vod_content: String(video.desc || ""),
          vod_play_sources: vodPlaySources,
        },
      ],
    };

    await setCacheSafe(cacheKey, result, 1800);
    return result;
  } catch (error) {
    await logError("Load video detail v15 failed", error);
    return detailV3(params);
  }
}

module.exports = {
  home,
  category,
  search,
  detail: detailV4,
  play: playV2,
};

runner.run(module.exports);
