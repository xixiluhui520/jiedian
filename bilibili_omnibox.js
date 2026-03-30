// @name 哔哩影视
// @version 1.2.0
// @description OmniBox 专业源 - 哔哩影视（原生高规格画质最终版）

const OmniBox = require("omnibox_sdk");
const runner = require("spider_runner");

module.exports = { home, category, detail, search, play };
runner.run(module.exports);

// ==========================================
// 配置区
// ==========================================
const BILI_COOKIE =
  "SESSDATA=7a686aa6%2C1784348734%2C5ed7b%2A11CjB50S07mX66-caPqEpESTG-P6js9gOHyPxFgrDQcq5KgMUFd87q-uBy16f01pa7RJQSVnhucTFmUUgwT1hZSUJCQkdTVHgwcl83OGhFTWRZMG54UmxqVjZrbUJLenN3d29QeHpVVlVTS0tmbXhyNmhmSkhveXpicjVTbTZYamZKeE5oTmNqbXZ3IIEC;bili_jct=4b2a7e044f5a609411631a9c2fe903da;DedeUserID=696832566;DedeUserID__ckMd5=34a48ab580cec706;sid=n6quuh18";

// 改成你自己的代理域名
const PROXY_BASE = "https://bili.haohaoxixi.cn:7777";

const BILI_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CLASSES = [
  { type_id: "1", type_name: "番剧" },
  { type_id: "4", type_name: "国创" },
  { type_id: "2", type_name: "电影" },
  { type_id: "5", type_name: "电视剧" },
  { type_id: "3", type_name: "纪录片" },
  { type_id: "7", type_name: "综艺" },
];

// ==========================================
// 工具函数
// ==========================================
function fixCover(url) {
  if (!url) return "";
  if (url.startsWith("//")) return "https:" + url;
  return url;
}

function formatCount(num) {
  const n = Number(num || 0);
  if (n > 1e8) return (n / 1e8).toFixed(2) + "亿";
  if (n > 1e4) return (n / 1e4).toFixed(2) + "万";
  return String(n);
}

function safeInt(value, fallback = 1) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeKeyword(params) {
  return String(params?.keyword || params?.wd || "").trim();
}

function validateSeasonId(videoId) {
  return /^\d+$/.test(String(videoId || ""));
}

function validatePlayId(playId) {
  return /^\d+_\d+_\d+$/.test(String(playId || ""));
}

function buildHeaders(extra = {}) {
  return {
    "User-Agent": BILI_UA,
    Referer: "https://www.bilibili.com",
    Cookie: BILI_COOKIE,
    ...extra,
  };
}

async function logInfo(message) {
  await OmniBox.log("info", `[哔哩影视] ${message}`);
}

async function logWarn(message) {
  await OmniBox.log("warn", `[哔哩影视] ${message}`);
}

async function logError(message) {
  await OmniBox.log("error", `[哔哩影视] ${message}`);
}

async function requestJSON(url, extraHeaders = {}) {
  const response = await OmniBox.request(url, {
    method: "GET",
    headers: buildHeaders(extraHeaders),
  });

  const body = response?.body || "{}";
  try {
    return JSON.parse(body);
  } catch (error) {
    const preview = String(body).slice(0, 300);
    await logError(`JSON解析失败: ${url}`);
    await logError(`响应预览: ${preview}`);
    throw error;
  }
}

async function getCachedJSON(key) {
  try {
    return await OmniBox.getCache(key);
  } catch (_) {
    return null;
  }
}

async function setCachedJSON(key, value, exSeconds) {
  try {
    await OmniBox.setCache(key, value, exSeconds);
  } catch (_) {}
}

function buildVodItem(vod) {
  const title = String(vod?.title || "").replace(/<[^>]+>/g, "").trim();
  if (!title || title.includes("预告")) return null;

  return {
    vod_id: String(vod.season_id || ""),
    vod_name: title,
    vod_pic: fixCover(vod.cover),
    type_id: String(vod.season_type || ""),
    type_name: String(vod.season_type_name || vod.type_name || ""),
    vod_remarks: vod.new_ep?.index_show || vod.index_show || "",
    vod_year: vod.pub_time ? String(vod.pub_time).slice(0, 4) : "",
    vod_subtitle: vod.desc || "",
  };
}

// ==========================================
// home
// ==========================================
async function home(params, context) {
  await logInfo("进入 home");
  return {
    class: CLASSES,
    list: [],
  };
}

// ==========================================
// category
// ==========================================
async function category(params, context) {
  const categoryId = String(params?.categoryId || "");
  const page = safeInt(params?.page, 1);

  if (!categoryId) {
    return {
      page,
      pagecount: page,
      total: 0,
      list: [],
    };
  }

  const cacheKey = `bili:category:${categoryId}:${page}`;
  const cached = await getCachedJSON(cacheKey);
  if (cached?.list) {
    return cached;
  }

  let url = "";
  if (["1", "4"].includes(categoryId)) {
    url = `https://api.bilibili.com/pgc/web/rank/list?season_type=${encodeURIComponent(
      categoryId
    )}&pagesize=20&page=${page}&day=3`;
  } else {
    url = `https://api.bilibili.com/pgc/season/rank/web/list?season_type=${encodeURIComponent(
      categoryId
    )}&pagesize=20&page=${page}&day=3`;
  }

  try {
    const data = await requestJSON(url);
    const rawList = data?.result?.list || data?.data?.list || [];
    const list = rawList.map(buildVodItem).filter(Boolean);

    const result = {
      page,
      pagecount: list.length === 20 ? page + 1 : page,
      total: page * 20 + list.length,
      list,
    };

    await setCachedJSON(cacheKey, result, 300);
    return result;
  } catch (error) {
    await logError(`category失败: ${error.message}`);
    return {
      page,
      pagecount: page,
      total: 0,
      list: [],
    };
  }
}

// ==========================================
// detail
// ==========================================
async function detail(params, context) {
  const videoId = String(params?.videoId || "").trim();

  if (!validateSeasonId(videoId)) {
    await logWarn(`detail收到无效videoId: ${videoId}`);
    return { list: [] };
  }

  const cacheKey = `bili:season:${videoId}`;
  const cached = await getCachedJSON(cacheKey);
  if (cached?.list?.length) {
    return cached;
  }

  try {
    const url = `https://api.bilibili.com/pgc/view/web/season?season_id=${encodeURIComponent(
      videoId
    )}`;
    const data = await requestJSON(url);

    if (data?.code !== 0 || !data?.result) {
      await logWarn(`detail接口返回异常: season_id=${videoId}`);
      return { list: [] };
    }

    const res = data.result;
    const stat = res.stat || {};
    const episodes = Array.isArray(res.episodes)
      ? res.episodes.filter((ep) => !String(ep.title || "").includes("预告"))
      : [];

    const playSources = [
      {
        name: "哔哩影视",
        episodes: episodes.map((ep) => {
          const epTitle = `${String(ep.title || "").replace(/#/g, "-")} ${String(
            ep.long_title || ""
          ).trim()}`.trim();

          return {
            name: epTitle || `第${ep.i || ep.title || ""}集`,
            playId: `${res.season_id}_${ep.id}_${ep.cid}`,
          };
        }),
      },
    ];

    const result = {
      list: [
        {
          vod_id: String(res.season_id || videoId),
          vod_name: res.title || "",
          vod_pic: fixCover(res.cover),
          type_id: String(res.type || ""),
          type_name: res.share_sub_title || res.type_name || "",
          vod_year: res.publish?.pub_time
            ? String(res.publish.pub_time).slice(0, 4)
            : "",
          vod_area:
            Array.isArray(res.areas) && res.areas.length > 0
              ? res.areas[0]?.name || ""
              : "",
          vod_actor: `点赞:${formatCount(stat.likes)} 投币:${formatCount(stat.coins)}`,
          vod_director: res.rating?.score ? `评分:${res.rating.score}` : "暂无评分",
          vod_content: res.evaluate || res.new_ep?.desc || "",
          vod_remarks: res.new_ep?.index_show || res.subtitle || "",
          vod_play_sources: playSources,
        },
      ],
    };

    await setCachedJSON(cacheKey, result, 1800);
    return result;
  } catch (error) {
    await logError(`detail失败: ${error.message}`);
    return { list: [] };
  }
}

// ==========================================
// search
// ==========================================
async function search(params, context) {
  const keyword = normalizeKeyword(params);
  const page = safeInt(params?.page, 1);

  if (!keyword) {
    return {
      page: 1,
      pagecount: 0,
      total: 0,
      list: [],
    };
  }

  const cacheKey = `bili:search:${keyword}:${page}`;
  const cached = await getCachedJSON(cacheKey);
  if (cached?.list) {
    return cached;
  }

  const encodedKeyword = encodeURIComponent(keyword);
  const searchTypes = ["media_bangumi", "media_ft"];
  const allVideos = [];
  const seen = new Set();

  try {
    for (const type of searchTypes) {
      const url = `https://api.bilibili.com/x/web-interface/wbi/search/type?search_type=${type}&keyword=${encodedKeyword}&page=${page}`;
      const data = await requestJSON(url);

      if (data?.code === 0 && Array.isArray(data?.data?.result)) {
        for (const vod of data.data.result) {
          const item = buildVodItem(vod);
          if (!item?.vod_id) continue;
          if (seen.has(item.vod_id)) continue;
          seen.add(item.vod_id);
          allVideos.push(item);
        }
      }
    }

    const result = {
      page,
      pagecount: allVideos.length > 0 ? page + 1 : page,
      total: allVideos.length > 0 ? page * 20 + allVideos.length : 0,
      list: allVideos,
    };

    await setCachedJSON(cacheKey, result, 600);
    return result;
  } catch (error) {
    await logError(`search失败: ${error.message}`);
    return {
      page,
      pagecount: page,
      total: 0,
      list: [],
    };
  }
}

// ==========================================
// play
// ==========================================
async function play(params, context) {
  const playId = String(params?.playId || "").trim();
  const flag = String(params?.flag || "play");
  const from = String(context?.from || "web");

  if (!validatePlayId(playId)) {
    throw new Error("playId 格式错误，应为 seasonId_epId_cid");
  }

  const cacheKey = `bili:play:${playId}`;
  const cached = await getCachedJSON(cacheKey);
  if (cached?.urls?.length) {
    return cached;
  }

  try {
    const probeUrl = `${PROXY_BASE}/bili/play?id=${encodeURIComponent(playId)}`;
    const data = await requestJSON(probeUrl, {
      Referer: PROXY_BASE,
    });

    if (data?.code !== 0) {
      throw new Error(`代理返回异常: code=${data?.code ?? "unknown"}`);
    }

    if (!Array.isArray(data?.list) || data.list.length === 0) {
      throw new Error("代理未返回可用线路");
    }

    const urls = data.list
      .map((item) => {
        if (!item?.name || !item?.url) return null;

        let finalUrl = String(item.url);
        if (finalUrl.startsWith("/")) {
          finalUrl = `${PROXY_BASE}${finalUrl}`;
        }

        return {
          name: String(item.name),
          url: finalUrl,
        };
      })
      .filter(Boolean);

    if (urls.length === 0) {
      throw new Error("代理返回线路为空");
    }

    const result = {
      urls,
      flag,
      header: {
        "User-Agent": BILI_UA,
        Referer: "https://www.bilibili.com",
        Accept: "*/*",
        "Accept-Encoding": "identity",
      },
      parse: 0,
    };

    await setCachedJSON(cacheKey, result, 120);
    await logInfo(`play成功: ${playId}, 线路数=${urls.length}, 来源=${from}`);
    return result;
  } catch (error) {
    await logError(`play失败: ${playId}, ${error.message}`);
    throw error;
  }
}