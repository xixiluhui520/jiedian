const express = require("express");
const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { create } = require("xmlbuilder2");

let ffmpegPath = null;
try {
  ffmpegPath = require("ffmpeg-static");
} catch (_) {
  ffmpegPath = null;
}

const app = express();
const PORT = 3010;
const EMBEDDED_FFMPEG_PATH = path.join(
  __dirname,
  "vendor",
  "ffmpeg",
  "ffmpeg-8.1-essentials_build",
  "bin",
  "ffmpeg.exe"
);

// ==============================
// 配置区
// ==============================
const BILI_COOKIE =
  "SESSDATA=7a686aa6%2C1784348734%2C5ed7b%2A11CjB50S07mX66-caPqEpESTG-P6js9gOHyPxFgrDQcq5KgMUFd87q-uBy16f01pa7RJQSVnhucTFmUUgwT1hZSUJCQkdTVHgwcl83OGhFTWRZMG54UmxqVjZrbUJLenN3d29QeHpVVlVTS0tmbXhyNmhmSkhveXpicjVTbTZYamZKeE5oTmNqbXZ3IIEC;bili_jct=4b2a7e044f5a609411631a9c2fe903da;DedeUserID=696832566;DedeUserID__ckMd5=34a48ab580cec706;sid=n6quuh18";

const BILI_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DEFAULT_HEADERS = {
  "User-Agent": BILI_UA,
  Referer: "https://www.bilibili.com",
  Cookie: BILI_COOKIE,
};

const QUALITY_NAME_MAP = {
  127: "8K超高清",
  126: "杜比视界",
  125: "HDR真彩色",
  120: "4K超清",
  116: "1080P60高帧率",
  112: "1080P+高码率",
  80: "1080P高清",
  74: "720P60高帧率",
  64: "720P高清",
  32: "480P清晰",
  16: "360P流畅",
};

const DEFAULT_QN_LIST = [127, 126, 125, 120, 116, 112, 80, 74, 64, 32, 16];

// ==============================
// 简单缓存
// ==============================
const CACHE = new Map();
let CACHED_FFMPEG_RUNNER = "";

function setCache(key, value, ttlSeconds = 120) {
  CACHE.set(key, {
    expiresAt: Date.now() + ttlSeconds * 1000,
    value,
  });
}

function getCache(key) {
  const item = CACHE.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return item.value;
}

function clearExpiredCache() {
  const now = Date.now();
  for (const [key, item] of CACHE.entries()) {
    if (item.expiresAt <= now) {
      CACHE.delete(key);
    }
  }
}

setInterval(clearExpiredCache, 60 * 1000);

function ensureFfmpegRunner() {
  if (fs.existsSync(EMBEDDED_FFMPEG_PATH)) {
    return EMBEDDED_FFMPEG_PATH;
  }

  if (CACHED_FFMPEG_RUNNER && fs.existsSync(CACHED_FFMPEG_RUNNER)) {
    return CACHED_FFMPEG_RUNNER;
  }

  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    throw new Error("ffmpeg binary not found");
  }

  const targetDir = path.join(os.tmpdir(), "bili-mpd-proxy");
  fs.mkdirSync(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, "ffmpeg-runner.exe");
  fs.copyFileSync(ffmpegPath, targetPath);
  CACHED_FFMPEG_RUNNER = targetPath;
  return targetPath;
}

// ==============================
// 工具函数
// ==============================
function validatePlayId(id) {
  return /^\d+_\d+_\d+$/.test(String(id || ""));
}

function validateVideoKey(aid, cid) {
  return /^\d+$/.test(String(aid || "")) && /^\d+$/.test(String(cid || ""));
}

function parsePlayId(id) {
  const [seasonId, epId, cid] = String(id).split("_");
  return { seasonId, epId, cid };
}

function getRequestBaseUrl(req) {
  const proto =
    String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() ||
    req.protocol ||
    "http";
  const host =
    String(req.headers["x-forwarded-host"] || "").split(",")[0].trim() ||
    String(req.headers.host || "").trim();

  return host ? `${proto}://${host}` : "";
}

function escapeAmp(url) {
  return String(url || "").replace(/&/g, "&amp;");
}

function shouldUseDash(qn) {
  return Number(qn) >= 120;
}

function normalizeCandidates(acceptQuality = [], acceptDescription = []) {
  const merged = new Map();

  for (const qn of DEFAULT_QN_LIST) {
    merged.set(Number(qn), {
      qn: Number(qn),
      name: QUALITY_NAME_MAP[qn] || `画质${qn}`,
    });
  }

  for (let i = 0; i < acceptQuality.length; i++) {
    const qn = Number(acceptQuality[i]);
    if (!Number.isFinite(qn)) continue;

    merged.set(qn, {
      qn,
      name: acceptDescription[i] || QUALITY_NAME_MAP[qn] || `画质${qn}`,
    });
  }

  return [...merged.values()].sort((a, b) => b.qn - a.qn);
}

function pickBestVideo(videoList) {
  const list = Array.isArray(videoList) ? [...videoList] : [];
  if (list.length === 0) return null;

  const codecScore = (track) => {
    const codecs = String(track?.codecs || "").toLowerCase();
    if (codecs.startsWith("avc")) return 3;
    if (codecs.startsWith("hev") || codecs.startsWith("hvc")) return 2;
    if (codecs.startsWith("av01")) return 1;
    return 0;
  };

  list.sort((a, b) => {
    if ((b.id || 0) !== (a.id || 0)) return (b.id || 0) - (a.id || 0);
    const bPixels = Number(b.width || 0) * Number(b.height || 0);
    const aPixels = Number(a.width || 0) * Number(a.height || 0);
    if (bPixels !== aPixels) return bPixels - aPixels;
    if ((b.bandwidth || 0) !== (a.bandwidth || 0)) {
      return (b.bandwidth || 0) - (a.bandwidth || 0);
    }
    return codecScore(b) - codecScore(a);
  });

  return list[0] || null;
}

function pickCompatVideo(videoList, targetQn = 0) {
  const list = Array.isArray(videoList) ? [...videoList] : [];
  if (list.length === 0) return null;

  const normalizedTarget = Number(targetQn || 0);
  const pickFrom = (tracks) => pickNearestVideo(tracks, normalizedTarget);

  const avcTracks = list.filter(
    (track) => Number(track?.codecid || 0) === 7 || String(track?.codecs || "").toLowerCase().startsWith("avc")
  );
  if (avcTracks.length > 0) {
    return pickFrom(avcTracks);
  }

  return pickFrom(list);
}

function pickNearestVideo(videoList, targetQn = 0) {
  const list = Array.isArray(videoList) ? [...videoList] : [];
  if (list.length === 0) return null;

  const normalizedTarget = Number(targetQn || 0);
  list.sort((a, b) => {
    const aId = Number(a?.id || 0);
    const bId = Number(b?.id || 0);
    const aDistance =
      normalizedTarget > 0
        ? Math.abs(
            (aId > normalizedTarget ? 10000 : 0) +
              (normalizedTarget - Math.min(aId, normalizedTarget))
          )
        : 0;
    const bDistance =
      normalizedTarget > 0
        ? Math.abs(
            (bId > normalizedTarget ? 10000 : 0) +
              (normalizedTarget - Math.min(bId, normalizedTarget))
          )
        : 0;

    if (aDistance !== bDistance) return aDistance - bDistance;
    if (bId !== aId) return bId - aId;

    const bPixels = Number(b?.width || 0) * Number(b?.height || 0);
    const aPixels = Number(a?.width || 0) * Number(a?.height || 0);
    if (bPixels !== aPixels) return bPixels - aPixels;

    return Number(b?.bandwidth || 0) - Number(a?.bandwidth || 0);
  });

  return list[0] || null;
}

function pickBestAudio(audioList) {
  const list = Array.isArray(audioList) ? [...audioList] : [];
  if (list.length === 0) return null;

  const codecScore = (track) => {
    const codecs = String(track?.codecs || "").toLowerCase();
    if (codecs.startsWith("mp4a")) return 3;
    if (codecs.includes("aac")) return 2;
    if (codecs.includes("flac")) return 1;
    return 0;
  };

  list.sort((a, b) => {
    const codecDiff = codecScore(b) - codecScore(a);
    if (codecDiff !== 0) return codecDiff;
    if ((b.bandwidth || 0) !== (a.bandwidth || 0)) {
      return (b.bandwidth || 0) - (a.bandwidth || 0);
    }
    return (b.id || 0) - (a.id || 0);
  });

  return list[0] || null;
}

function parseRange(rangeText) {
  const match = String(rangeText || "").match(/^(\d+)-(\d+)$/);
  if (!match) return null;

  const start = Number(match[1]);
  const end = Number(match[2]);
  return {
    start,
    end,
    length: end >= start ? end - start + 1 : 0,
  };
}

function normalizeTrack(track) {
  if (!track) return null;

  return {
    id: track.id || "",
    url: track.baseUrl || track.base_url || "",
    codecs: track.codecs || "",
    bandwidth: Number(track.bandwidth || 0),
    width: Number(track.width || 0),
    height: Number(track.height || 0),
    frameRate: track.frame_rate || "",
    mimeType: track.mimeType || "",
    initRange: parseRange(track?.SegmentBase?.Initialization),
    indexRange: parseRange(track?.SegmentBase?.indexRange),
  };
}

function parseSidx(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (buf.length < 8) return null;

  let offset = 0;
  let size = buf.readUInt32BE(offset);
  offset += 4;
  const type = buf.toString("ascii", offset, offset + 4);
  offset += 4;
  if (type !== "sidx") {
    return null;
  }

  if (size === 1) {
    if (buf.length < 16) return null;
    size = Number(buf.readBigUInt64BE(offset));
    offset += 8;
  }

  if (buf.length < size) {
    return null;
  }

  const version = buf.readUInt8(offset);
  offset += 1;
  offset += 3; // flags

  offset += 4; // reference_ID
  const timescale = buf.readUInt32BE(offset);
  offset += 4;

  let earliestPresentationTime = 0;
  let firstOffset = 0;
  if (version === 0) {
    earliestPresentationTime = buf.readUInt32BE(offset);
    offset += 4;
    firstOffset = buf.readUInt32BE(offset);
    offset += 4;
  } else {
    earliestPresentationTime = Number(buf.readBigUInt64BE(offset));
    offset += 8;
    firstOffset = Number(buf.readBigUInt64BE(offset));
    offset += 8;
  }

  offset += 2; // reserved
  const referenceCount = buf.readUInt16BE(offset);
  offset += 2;

  const references = [];
  for (let i = 0; i < referenceCount; i += 1) {
    if (offset + 12 > buf.length) break;

    const refTypeAndSize = buf.readUInt32BE(offset);
    offset += 4;
    const subsegmentDuration = buf.readUInt32BE(offset);
    offset += 4;
    const sap = buf.readUInt32BE(offset);
    offset += 4;

    references.push({
      referenceType: refTypeAndSize >>> 31,
      referencedSize: refTypeAndSize & 0x7fffffff,
      duration: timescale > 0 ? subsegmentDuration / timescale : 0,
      startsWithSAP: sap >>> 31,
      sapType: (sap >>> 28) & 0x7,
      sapDeltaTime: sap & 0x0fffffff,
    });
  }

  return {
    size,
    timescale,
    earliestPresentationTime,
    firstOffset,
    references,
  };
}

async function fetchArrayBuffer(url, rangeHeader = "") {
  const response = await axios.get(url, {
    headers: {
      ...DEFAULT_HEADERS,
      Accept: "*/*",
      ...(rangeHeader ? { Range: rangeHeader } : {}),
    },
    responseType: "arraybuffer",
    timeout: 30000,
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  return Buffer.from(response.data);
}

async function buildTrackSegments(track) {
  if (!track?.url || !track?.indexRange) {
    return [];
  }

  const rangeHeader = `bytes=${track.indexRange.start}-${track.indexRange.end}`;
  const sidxBuffer = await fetchArrayBuffer(track.url, rangeHeader);
  const sidx = parseSidx(sidxBuffer);
  if (!sidx?.references?.length) {
    return [];
  }

  let nextOffset = Number(track.indexRange.end) + 1 + Number(sidx.firstOffset || 0);
  const segments = [];

  for (let i = 0; i < sidx.references.length; i += 1) {
    const ref = sidx.references[i];
    if (ref.referenceType !== 0 || !ref.referencedSize) {
      continue;
    }

    segments.push({
      index: segments.length,
      start: nextOffset,
      end: nextOffset + ref.referencedSize - 1,
      length: ref.referencedSize,
      duration: Math.max(0.001, Number(ref.duration || 0)),
    });

    nextOffset += ref.referencedSize;
  }

  return segments;
}

function buildPgcHlsEntry(dash, targetQn = 0, options = {}) {
  const preferCompatVideo = options?.preferCompatVideo !== false;
  const selectedVideo = preferCompatVideo
    ? pickCompatVideo(dash?.video, targetQn)
    : pickNearestVideo(dash?.video, targetQn);
  const video = normalizeTrack(selectedVideo);
  const audio = normalizeTrack(pickBestAudio(dash?.audio));

  if (!video?.url || !video?.initRange || !video?.indexRange) {
    return null;
  }

  const mediaStart = Number(video.indexRange.end) + 1;
  if (!Number.isFinite(mediaStart)) {
    return null;
  }

  const entry = {
    duration: Number(dash?.duration || 0),
    video: {
      ...video,
      mediaStart,
      segments: [],
    },
    audio: null,
  };

  if (audio?.url && audio?.initRange && audio?.indexRange) {
    const audioMediaStart = Number(audio.indexRange.end) + 1;
    if (Number.isFinite(audioMediaStart)) {
      entry.audio = {
        ...audio,
        mediaStart: audioMediaStart,
        segments: [],
      };
    }
  }

  return entry;
}

function buildHlsMasterPlaylist(id, qn, entry, baseUrl = "") {
  const prefix = String(baseUrl || "");
  const lines = [
    "#EXTM3U",
    "#EXT-X-VERSION:7",
    "#EXT-X-INDEPENDENT-SEGMENTS",
  ];

  if (entry?.audio?.url) {
    lines.push(
      `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="default",DEFAULT=YES,AUTOSELECT=YES,URI="${prefix}/bili/hls/audio.m3u8?id=${encodeURIComponent(
        id
      )}&qn=${encodeURIComponent(qn)}"`
    );
  }

  const streamParts = [`BANDWIDTH=${Math.max(1, Number(entry?.video?.bandwidth || 0) + Number(entry?.audio?.bandwidth || 0))}`];
  if (entry?.video?.width && entry?.video?.height) {
    streamParts.push(`RESOLUTION=${entry.video.width}x${entry.video.height}`);
  }

  const codecs = [entry?.video?.codecs, entry?.audio?.codecs].filter(Boolean).join(",");
  if (codecs) {
    streamParts.push(`CODECS="${codecs}"`);
  }
  if (entry?.audio?.url) {
    streamParts.push('AUDIO="audio"');
  }

  lines.push(`#EXT-X-STREAM-INF:${streamParts.join(",")}`);
  lines.push(`${prefix}/bili/hls/video.m3u8?id=${encodeURIComponent(id)}&qn=${encodeURIComponent(qn)}`);
  lines.push("");

  return lines.join("\n");
}

function buildHlsTrackPlaylist(id, qn, trackType, entry, baseUrl = "") {
  const prefix = String(baseUrl || "");
  const track = trackType === "audio" ? entry?.audio : entry?.video;
  if (!track?.url) return "";

  const segments = Array.isArray(track.segments) && track.segments.length > 0
    ? track.segments
    : [
        {
          index: 0,
          duration: Number(entry?.duration || 0),
        },
      ];

  const targetDuration = Math.max(
    1,
    Math.ceil(
      segments.reduce((max, segment) => Math.max(max, Number(segment.duration || 0)), 0)
    )
  );

  const lines = [
    "#EXTM3U",
    "#EXT-X-VERSION:7",
    "#EXT-X-PLAYLIST-TYPE:VOD",
    `#EXT-X-TARGETDURATION:${targetDuration}`,
    `#EXT-X-MAP:URI="${prefix}/bili/hls/chunk?id=${encodeURIComponent(id)}&qn=${encodeURIComponent(
        qn
    )}&track=${trackType}&part=init"`,
  ];

  segments.forEach((segment) => {
    lines.push(`#EXTINF:${Number(segment.duration || 0).toFixed(3)},`);
    lines.push(
      `${prefix}/bili/hls/chunk?id=${encodeURIComponent(id)}&qn=${encodeURIComponent(
        qn
      )}&track=${trackType}&part=seg&index=${encodeURIComponent(segment.index)}`
    );
  });

  lines.push("#EXT-X-ENDLIST");
  lines.push("");

  return lines.join("\n");
}

async function fetchStream(url, rangeHeader = "") {
  return axios.get(url, {
    headers: {
      ...DEFAULT_HEADERS,
      Accept: "*/*",
      ...(rangeHeader ? { Range: rangeHeader } : {}),
    },
    responseType: "stream",
    timeout: 30000,
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 400,
  });
}

async function pipeRemoteStream(res, url, rangeHeader, contentType) {
  const response = await fetchStream(url, rangeHeader);
  res.status(response.status === 206 ? 206 : 200);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=120");
  res.setHeader("Content-Type", contentType);

  const contentLength = response.headers["content-length"];
  if (contentLength) {
    res.setHeader("Content-Length", contentLength);
  }

  const contentRange = response.headers["content-range"];
  if (contentRange) {
    res.setHeader("Content-Range", contentRange);
  }

  return new Promise((resolve, reject) => {
    response.data.on("error", reject);
    response.data.on("end", resolve);
    response.data.pipe(res);
  });
}

function pipeFfmpegOutput(ffmpeg, res) {
  return new Promise((resolve, reject) => {
    ffmpeg.stdout.on("error", reject);
    ffmpeg.stdout.on("end", resolve);
    ffmpeg.stdout.pipe(res);
  });
}

function spawnCompatTransmux(videoUrl, audioUrl) {
  const ffmpegRunner = ensureFfmpegRunner();
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-user_agent",
    BILI_UA,
    "-referer",
    "https://www.bilibili.com",
    "-cookies",
    BILI_COOKIE,
    "-i",
    videoUrl,
    "-user_agent",
    BILI_UA,
    "-referer",
    "https://www.bilibili.com",
    "-cookies",
    BILI_COOKIE,
    "-i",
    audioUrl,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "copy",
    "-bsf:v",
    "h264_mp4toannexb",
    "-muxpreload",
    "0",
    "-muxdelay",
    "0",
    "-mpegts_flags",
    "+resend_headers",
    "-f",
    "mpegts",
    "pipe:1",
  ];

  return spawn(ffmpegRunner, args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

async function resolvePgcHlsEntry(id, qn, options = {}) {
  const preferCompatVideo = options?.preferCompatVideo !== false;
  const modeKey = preferCompatVideo ? "compat" : "exact";
  const cacheKey = `pgc:hls:${modeKey}:${id}:${qn}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const { epId, cid } = parsePlayId(id);
  const json = await fetchPgcPlayurl({
    epId,
    cid,
    qn,
    fnval: 4048,
    fourk: 1,
  });

  const result = json?.result || json?.data;
  if (json?.code !== 0 || !result?.dash) {
    return null;
  }

  const entry = buildPgcHlsEntry(result.dash, qn, { preferCompatVideo });
  if (!entry) {
    return null;
  }

  const [videoSegments, audioSegments] = await Promise.all([
    buildTrackSegments(entry.video),
    entry.audio?.url ? buildTrackSegments(entry.audio) : Promise.resolve([]),
  ]);

  entry.video.segments = videoSegments;
  if (entry.audio) {
    entry.audio.segments = audioSegments;
  }

  setCache(cacheKey, entry, 120);
  return entry;
}

async function resolveVideoHlsEntry(aid, cid, qn, options = {}) {
  const preferCompatVideo = options?.preferCompatVideo !== false;
  const modeKey = preferCompatVideo ? "compat" : "exact";
  const cacheKey = `video:hls:${modeKey}:${aid}:${cid}:${qn}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const json = await fetchVideoPlayurl({
    aid,
    cid,
    qn,
    fnval: 4048,
    fourk: 1,
  });

  const result = json?.data || json?.result;
  if (json?.code !== 0 || !result?.dash) {
    return null;
  }

  const entry = buildPgcHlsEntry(result.dash, qn, { preferCompatVideo });
  if (!entry) {
    return null;
  }

  const [videoSegments, audioSegments] = await Promise.all([
    buildTrackSegments(entry.video),
    entry.audio?.url ? buildTrackSegments(entry.audio) : Promise.resolve([]),
  ]);

  entry.video.segments = videoSegments;
  if (entry.audio) {
    entry.audio.segments = audioSegments;
  }

  setCache(cacheKey, entry, 120);
  return entry;
}

function buildMpd(dash, isEscape = false, options = {}) {
  const root = create({ version: "1.0", encoding: "UTF-8" })
    .ele("MPD", {
      xmlns: "urn:mpeg:dash:schema:mpd:2011",
      profiles: "urn:mpeg:dash:profile:isoff-on-demand:2011",
      type: "static",
      minBufferTime: "PT1.5S",
      mediaPresentationDuration: `PT${dash.duration || 0}S`,
    })
    .ele("Period");

  const bestVideo = options?.preferCompatVideo
    ? pickCompatVideo(dash?.video, options?.targetQn || 0)
    : pickBestVideo(dash?.video);
  const audioList = Array.isArray(dash.audio) ? [...dash.audio] : [];

  if (bestVideo) {
    const adaptationSet = root.ele("AdaptationSet", {
      mimeType: "video/mp4",
      contentType: "video",
      subsegmentAlignment: "true",
      subsegmentStartsWithSAP: "1",
    });

    const representation = adaptationSet.ele("Representation", {
      id: bestVideo.id || "video",
      codecs: bestVideo.codecs || "avc1.64001E",
      bandwidth: bestVideo.bandwidth || 0,
      width: bestVideo.width || 0,
      height: bestVideo.height || 0,
      frameRate: bestVideo.frame_rate || "24",
    });

    const videoBaseUrl = bestVideo.baseUrl || bestVideo.base_url || "";
    if (isEscape) {
      representation.ele("BaseURL").dat(escapeAmp(videoBaseUrl)).up();
    } else {
      representation.ele("BaseURL").txt(videoBaseUrl).up();
    }

    if (bestVideo.SegmentBase?.Initialization) {
      representation
        .ele("SegmentBase", {
          indexRange: bestVideo.SegmentBase.indexRange,
        })
        .ele("Initialization", {
          range: bestVideo.SegmentBase.Initialization,
        })
        .up()
        .up();
    }
  }

  if (audioList.length > 0) {
    const adaptationSet = root.ele("AdaptationSet", {
      mimeType: "audio/mp4",
      contentType: "audio",
      subsegmentAlignment: "true",
      subsegmentStartsWithSAP: "1",
    });

    audioList.forEach((audio, index) => {
      const representation = adaptationSet.ele("Representation", {
        id: audio.id || `audio_${index}`,
        codecs: audio.codecs || "mp4a.40.2",
        bandwidth: audio.bandwidth || 0,
      });

      const audioBaseUrl = audio.baseUrl || audio.base_url || "";
      if (isEscape) {
        representation.ele("BaseURL").dat(escapeAmp(audioBaseUrl)).up();
      } else {
        representation.ele("BaseURL").txt(audioBaseUrl).up();
      }

      if (audio.SegmentBase?.Initialization) {
        representation
          .ele("SegmentBase", {
            indexRange: audio.SegmentBase.indexRange,
          })
          .ele("Initialization", {
            range: audio.SegmentBase.Initialization,
          })
          .up()
          .up();
      }
    });
  }

  return root.end({ prettyPrint: true });
}

// ==============================
// B站接口
// ==============================
async function fetchPgcPlayurl({ epId, cid, qn, fnval = 4048, fourk = 1 }) {
  const url =
    `https://api.bilibili.com/pgc/player/web/playurl` +
    `?ep_id=${encodeURIComponent(epId)}` +
    `&cid=${encodeURIComponent(cid)}` +
    `&qn=${encodeURIComponent(qn)}` +
    `&fnval=${encodeURIComponent(fnval)}` +
    `&fnver=0` +
    `&fourk=${encodeURIComponent(fourk)}` +
    `&from_client=BROWSER` +
    `&drm_tech_type=2`;

  console.log(`[fetchPgcPlayurl] qn=${qn} epId=${epId} cid=${cid}`);

  const resp = await axios.get(url, {
    headers: DEFAULT_HEADERS,
    timeout: 15000,
  });

  return resp.data;
}

async function fetchVideoPlayurl({ aid, cid, qn, fnval = 4048, fourk = 1 }) {
  const url = "https://api.bilibili.com/x/player/playurl";

  console.log(`[fetchVideoPlayurl] qn=${qn} aid=${aid} cid=${cid}`);

  const resp = await axios.get(url, {
    headers: {
      ...DEFAULT_HEADERS,
      Referer: `https://www.bilibili.com/video/av${aid}`,
      Origin: "https://www.bilibili.com",
    },
    params: {
      avid: aid,
      cid,
      qn,
      fnval,
      fnver: 0,
      fourk,
    },
    timeout: 15000,
  });

  return resp.data;
}

// ==============================
// 公共响应头
// ==============================
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Referer, User-Agent");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  next();
});

// ==============================
// 路由
// ==============================
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "bili-mpd-proxy",
    cacheSize: CACHE.size,
    time: Date.now(),
  });
});

// ========== 不夜兼容：proxy ==========
app.get("/proxy", async (req, res) => {
  try {
    const ac = String(req.query.ac || "").toLowerCase();
    const type = String(req.query.type || "mpd").toLowerCase();
    const id = String(req.query.ids || "");
    const qn = Number(req.query.qn || 127);
    const isEscape = String(req.query.isEscape || "false") === "true";

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Referer, User-Agent");

    if (ac && ac !== "proxy") {
      return res.status(400).send("invalid ac");
    }

    if (!validatePlayId(id)) {
      return res.status(400).send("invalid ids");
    }

    const cacheKey = `pgc:proxy:${id}:${type}:${qn}:${isEscape}`;
    const cached = getCache(cacheKey);
    if (cached) {
      if (cached.kind === "xml") {
        res.setHeader("Content-Type", "application/dash+xml; charset=utf-8");
        return res.send(cached.body);
      }
      if (cached.kind === "redirect") {
        return res.redirect(cached.body);
      }
    }

    const { epId, cid } = parsePlayId(id);
    const json = await fetchPgcPlayurl({
      epId,
      cid,
      qn,
      fnval: 4048,
      fourk: 1,
    });

    const result = json?.result || json?.data;
    if (json?.code !== 0 || !result) {
      console.error("[/proxy] bili api error:", json);
      return res.status(500).send(`bili api error: ${json?.message || "unknown"}`);
    }

    if (type === "mpd" && result.dash) {
      const xml = buildMpd(result.dash, isEscape, {
        preferCompatVideo: true,
        targetQn: qn,
      });
      setCache(cacheKey, { kind: "xml", body: xml }, 120);
      res.setHeader("Content-Type", "application/dash+xml; charset=utf-8");
      return res.send(xml);
    }

    if (Array.isArray(result.durl) && result.durl[0]?.url) {
      setCache(cacheKey, { kind: "redirect", body: result.durl[0].url }, 120);
      return res.redirect(result.durl[0].url);
    }

    if (result.dash) {
      const xml = buildMpd(result.dash, isEscape, {
        preferCompatVideo: true,
        targetQn: qn,
      });
      setCache(cacheKey, { kind: "xml", body: xml }, 120);
      res.setHeader("Content-Type", "application/dash+xml; charset=utf-8");
      return res.send(xml);
    }

    return res.status(500).send("no dash or durl");
  } catch (error) {
    console.error("[/proxy] server error:", error.message);
    return res.status(500).send(`server error: ${error.message}`);
  }
});

// ========== PGC：hls ==========
app.get(["/bili/hls/master", "/bili/hls/master.m3u8"], async (req, res) => {
  try {
    const id = String(req.query.id || "");
    const qn = Number(req.query.qn || 120);

    if (!validatePlayId(id)) {
      return res.status(400).send("invalid id");
    }

    const entry = await resolvePgcHlsEntry(id, qn, { preferCompatVideo: false });
    if (!entry?.video?.url) {
      return res.status(500).send("no hls entry");
    }
    const baseUrl = getRequestBaseUrl(req);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=120");
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
    return res.send(buildHlsMasterPlaylist(id, qn, entry, baseUrl));
  } catch (error) {
    console.error("[/bili/hls/master] server error:", error.message);
    return res.status(500).send(`server error: ${error.message}`);
  }
});

app.get(["/bili/hls/video", "/bili/hls/video.m3u8"], async (req, res) => {
  try {
    const id = String(req.query.id || "");
    const qn = Number(req.query.qn || 120);

    if (!validatePlayId(id)) {
      return res.status(400).send("invalid id");
    }

    const entry = await resolvePgcHlsEntry(id, qn, { preferCompatVideo: false });
    if (!entry?.video?.url) {
      return res.status(500).send("no video track");
    }
    const baseUrl = getRequestBaseUrl(req);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=120");
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
    return res.send(buildHlsTrackPlaylist(id, qn, "video", entry, baseUrl));
  } catch (error) {
    console.error("[/bili/hls/video] server error:", error.message);
    return res.status(500).send(`server error: ${error.message}`);
  }
});

app.get(["/bili/hls/audio", "/bili/hls/audio.m3u8"], async (req, res) => {
  try {
    const id = String(req.query.id || "");
    const qn = Number(req.query.qn || 120);

    if (!validatePlayId(id)) {
      return res.status(400).send("invalid id");
    }

    const entry = await resolvePgcHlsEntry(id, qn, { preferCompatVideo: false });
    if (!entry?.audio?.url) {
      return res.status(404).send("no audio track");
    }
    const baseUrl = getRequestBaseUrl(req);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=120");
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
    return res.send(buildHlsTrackPlaylist(id, qn, "audio", entry, baseUrl));
  } catch (error) {
    console.error("[/bili/hls/audio] server error:", error.message);
    return res.status(500).send(`server error: ${error.message}`);
  }
});

app.get("/bili/hls/chunk", async (req, res) => {
  try {
    const id = String(req.query.id || "");
    const qn = Number(req.query.qn || 120);
    const trackType = String(req.query.track || "video").toLowerCase();
    const part = String(req.query.part || "media").toLowerCase();

    if (!validatePlayId(id)) {
      return res.status(400).send("invalid id");
    }

    if (!["video", "audio"].includes(trackType)) {
      return res.status(400).send("invalid track");
    }

    if (!["init", "media", "seg"].includes(part)) {
      return res.status(400).send("invalid part");
    }

    const entry = await resolvePgcHlsEntry(id, qn, { preferCompatVideo: false });
    const track = trackType === "audio" ? entry?.audio : entry?.video;
    if (!track?.url) {
      return res.status(404).send("track not found");
    }

    let rangeHeader = "";
    if (part === "init") {
      if (!track.initRange) {
        return res.status(500).send("missing init range");
      }
      rangeHeader = `bytes=${track.initRange.start}-${track.initRange.end}`;
    } else if (part === "media") {
      if (!Number.isFinite(track.mediaStart)) {
        return res.status(500).send("missing media range");
      }
      rangeHeader = `bytes=${track.mediaStart}-`;
    } else {
      const index = Number(req.query.index || 0);
      const segments = Array.isArray(track.segments) ? track.segments : [];
      const segment = segments.find((item) => Number(item.index) === index);
      if (!segment) {
        return res.status(404).send("segment not found");
      }
      rangeHeader = `bytes=${segment.start}-${segment.end}`;
    }

    const contentType = trackType === "audio" ? "audio/mp4" : "video/mp4";
    await pipeRemoteStream(res, track.url, rangeHeader, contentType);
  } catch (error) {
    console.error("[/bili/hls/chunk] server error:", error.message);
    if (!res.headersSent) {
      return res.status(500).send(`server error: ${error.message}`);
    }
    res.end();
  }
});

// ========== PGC：compat transmux ==========
app.get("/bili/compat/stream.ts", async (req, res) => {
  try {
    const id = String(req.query.id || "");
    const qn = Number(req.query.qn || 120);

    if (!validatePlayId(id)) {
      return res.status(400).send("invalid id");
    }

    const entry = await resolvePgcHlsEntry(id, qn);
    const videoUrl = String(entry?.video?.url || "");
    const audioUrl = String(entry?.audio?.url || "");

    if (!videoUrl || !audioUrl) {
      return res.status(500).send("missing compat av tracks");
    }

    const ffmpeg = spawnCompatTransmux(videoUrl, audioUrl);

    let stderr = "";
    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    res.status(200);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "video/mp2t");
    res.setHeader("Transfer-Encoding", "chunked");

    const cleanup = () => {
      if (!ffmpeg.killed) {
        ffmpeg.kill("SIGKILL");
      }
    };

    req.on("close", cleanup);
    res.on("close", cleanup);

    ffmpeg.once("error", (error) => {
      if (!res.headersSent) {
        res.status(500).send(`ffmpeg error: ${error.message}`);
        return;
      }
      res.end();
    });

    ffmpeg.once("close", (code) => {
      req.off("close", cleanup);
      res.off("close", cleanup);

      if (code && !res.writableEnded) {
        console.error("[/bili/compat/stream.ts] ffmpeg close:", code, stderr.trim());
        res.end();
      }
    });

    await pipeFfmpegOutput(ffmpeg, res);
  } catch (error) {
    console.error("[/bili/compat/stream.ts] server error:", error.message);
    return res.status(500).send(`server error: ${error.message}`);
  }
});

// ========== PGC：mpd ==========
app.get("/bili/mpd", async (req, res) => {
  try {
    const id = String(req.query.id || "");
    const qn = Number(req.query.qn || 120);
    const isEscape = String(req.query.isEscape || "false") === "true";

    if (!validatePlayId(id)) {
      return res.status(400).send("invalid id");
    }

    const cacheKey = `pgc:mpd:${id}:${qn}:${isEscape}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.setHeader("Content-Type", "application/dash+xml; charset=utf-8");
      return res.send(cached);
    }

    const { epId, cid } = parsePlayId(id);
    const json = await fetchPgcPlayurl({
      epId,
      cid,
      qn,
      fnval: 4048,
      fourk: 1,
    });

    const result = json?.result || json?.data;

    if (json?.code !== 0 || !result) {
      console.error("[/bili/mpd] bili api error:", json);
      return res.status(500).send(`bili api error: ${json?.message || "unknown"}`);
    }

    if (result.dash) {
      const xml = buildMpd(result.dash, isEscape);
      setCache(cacheKey, xml, 120);
      res.setHeader("Content-Type", "application/dash+xml; charset=utf-8");
      return res.send(xml);
    }

    if (Array.isArray(result.durl) && result.durl[0]?.url) {
      return res.redirect(result.durl[0].url);
    }

    return res.status(500).send("no dash or durl");
  } catch (error) {
    console.error("[/bili/mpd] server error:", error.message);
    return res.status(500).send(`server error: ${error.message}`);
  }
});

// ========== PGC：play ==========
app.get("/bili/play", async (req, res) => {
  try {
    const id = String(req.query.id || "");
    if (!validatePlayId(id)) {
      return res.status(400).json({ code: 400, message: "invalid id" });
    }

    const cacheKey = `pgc:play:${id}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const { epId, cid } = parsePlayId(id);

    const probe = await fetchPgcPlayurl({
      epId,
      cid,
      qn: 127,
      fnval: 4048,
      fourk: 1,
    });

    const probeResult = probe?.result || probe?.data;
    if (probe?.code !== 0 || !probeResult) {
      console.error("[/bili/play] probe failed:", probe);
      return res.status(500).json({
        code: 500,
        message: probe?.message || "probe failed",
      });
    }

    const acceptQuality = Array.isArray(probeResult.accept_quality)
      ? probeResult.accept_quality
      : [];
    const acceptDescription = Array.isArray(probeResult.accept_description)
      ? probeResult.accept_description
      : [];

    const candidates = normalizeCandidates(acceptQuality, acceptDescription);

    const probeResults = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          const qn = Number(candidate.qn);
          const useDash = shouldUseDash(qn);

          const json = await fetchPgcPlayurl({
            epId,
            cid,
            qn,
            fnval: useDash ? 4048 : 1,
            fourk: qn >= 120 ? 1 : 0,
          });

          const result = json?.result || json?.data;
          if (json?.code !== 0 || !result) return null;

          const actualQn = Number(result.quality || qn);
          const lineName =
            QUALITY_NAME_MAP[actualQn] || candidate.name || `画质${actualQn}`;

          if (result.dash && actualQn >= 120) {
            return {
              qn: actualQn,
              name: lineName,
              type: "mpd",
              url: `/bili/mpd?id=${encodeURIComponent(id)}&qn=${actualQn}`,
            };
          }

          if (Array.isArray(result.durl) && result.durl[0]?.url) {
            return {
              qn: actualQn,
              name: lineName,
              type: "direct",
              url: result.durl[0].url,
            };
          }

          if (result.dash) {
            return {
              qn: actualQn,
              name: lineName,
              type: "mpd",
              url: `/bili/mpd?id=${encodeURIComponent(id)}&qn=${actualQn}`,
            };
          }

          return null;
        } catch {
          return null;
        }
      })
    );

    const dedupMap = new Map();
    for (const item of probeResults.filter(Boolean)) {
      const qn = Number(item.qn);
      if (!Number.isFinite(qn)) continue;
      if (!dedupMap.has(qn)) {
        dedupMap.set(qn, item);
        continue;
      }
      const oldItem = dedupMap.get(qn);
      if (oldItem.type !== "mpd" && item.type === "mpd") {
        dedupMap.set(qn, item);
      }
    }

    const list = [...dedupMap.values()].sort((a, b) => b.qn - a.qn);
    const payload = { code: 0, list };

    setCache(cacheKey, payload, 120);
    return res.json(payload);
  } catch (error) {
    console.error("[/bili/play] server error:", error.message);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

// ========== 普通视频：mpd ==========
app.get("/bili/video/mpd", async (req, res) => {
  try {
    const aid = String(req.query.aid || "");
    const cid = String(req.query.cid || "");
    const qn = Number(req.query.qn || 120);
    const isEscape = String(req.query.isEscape || "false") === "true";
    const compat = String(req.query.compat || "false") === "true";

    if (!validateVideoKey(aid, cid)) {
      return res.status(400).send("invalid aid or cid");
    }

    const cacheKey = `video:mpd:${aid}:${cid}:${qn}:${isEscape}:${compat}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.setHeader("Content-Type", "application/dash+xml; charset=utf-8");
      return res.send(cached);
    }

    const json = await fetchVideoPlayurl({
      aid,
      cid,
      qn,
      fnval: 4048,
      fourk: 1,
    });

    const result = json?.data || json?.result;
    if (json?.code !== 0 || !result) {
      console.error("[/bili/video/mpd] bili api error:", json);
      return res.status(500).send(`bili api error: ${json?.message || "unknown"}`);
    }

    if (result.dash) {
      const xml = buildMpd(result.dash, isEscape, {
        preferCompatVideo: compat,
        targetQn: qn,
      });
      setCache(cacheKey, xml, 120);
      res.setHeader("Content-Type", "application/dash+xml; charset=utf-8");
      return res.send(xml);
    }

    if (Array.isArray(result.durl) && result.durl[0]?.url) {
      return res.redirect(result.durl[0].url);
    }

    return res.status(500).send("no dash or durl");
  } catch (error) {
    console.error("[/bili/video/mpd] server error:", error.message);
    return res.status(500).send(`server error: ${error.message}`);
  }
});

// ========== 普通视频：play ==========
app.get("/bili/video/play", async (req, res) => {
  try {
    const aid = String(req.query.aid || "");
    const cid = String(req.query.cid || "");

    if (!validateVideoKey(aid, cid)) {
      return res.status(400).json({ code: 400, message: "invalid aid or cid" });
    }

    const cacheKey = `video:play:${aid}:${cid}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const probe = await fetchVideoPlayurl({
      aid,
      cid,
      qn: 127,
      fnval: 4048,
      fourk: 1,
    });

    const probeResult = probe?.data || probe?.result;
    if (probe?.code !== 0 || !probeResult) {
      console.error("[/bili/video/play] probe failed:", probe);
      return res.status(500).json({
        code: 500,
        message: probe?.message || "probe failed",
      });
    }

    const acceptQuality = Array.isArray(probeResult.accept_quality)
      ? probeResult.accept_quality
      : [];
    const acceptDescription = Array.isArray(probeResult.accept_description)
      ? probeResult.accept_description
      : [];

    const candidates = normalizeCandidates(acceptQuality, acceptDescription);

    const probeResults = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          const qn = Number(candidate.qn);
          const useDash = shouldUseDash(qn);

          const json = await fetchVideoPlayurl({
            aid,
            cid,
            qn,
            fnval: useDash ? 4048 : 1,
            fourk: qn >= 120 ? 1 : 0,
          });

          const result = json?.data || json?.result;
          if (json?.code !== 0 || !result) return null;

          const actualQn = Number(result.quality || qn);
          const lineName =
            QUALITY_NAME_MAP[actualQn] || candidate.name || `画质${actualQn}`;

          if (result.dash && actualQn >= 120) {
            return {
              qn: actualQn,
              name: lineName,
              type: "mpd",
              url: `/bili/video/mpd?aid=${encodeURIComponent(aid)}&cid=${encodeURIComponent(
                cid
              )}&qn=${actualQn}`,
            };
          }

          if (Array.isArray(result.durl) && result.durl[0]?.url) {
            return {
              qn: actualQn,
              name: lineName,
              type: "direct",
              url: result.durl[0].url,
            };
          }

          if (result.dash) {
            return {
              qn: actualQn,
              name: lineName,
              type: "mpd",
              url: `/bili/video/mpd?aid=${encodeURIComponent(aid)}&cid=${encodeURIComponent(
                cid
              )}&qn=${actualQn}`,
            };
          }

          return null;
        } catch {
          return null;
        }
      })
    );

    const dedupMap = new Map();
    for (const item of probeResults.filter(Boolean)) {
      const qn = Number(item.qn);
      if (!Number.isFinite(qn)) continue;
      if (!dedupMap.has(qn)) {
        dedupMap.set(qn, item);
        continue;
      }
      const oldItem = dedupMap.get(qn);
      if (oldItem.type !== "mpd" && item.type === "mpd") {
        dedupMap.set(qn, item);
      }
    }

    const list = [...dedupMap.values()].sort((a, b) => b.qn - a.qn);
    const payload = { code: 0, list };

    setCache(cacheKey, payload, 120);
    return res.json(payload);
  } catch (error) {
    console.error("[/bili/video/play] server error:", error.message);
    return res.status(500).json({
      code: 500,
      message: error.message,
    });
  }
});

app.get(["/bili/video/hls/master", "/bili/video/hls/master.m3u8"], async (req, res) => {
  try {
    const combinedId = String(req.query.id || "");
    const [aidFromId = "", cidFromId = ""] = combinedId.split("_");
    const aid = String(req.query.aid || aidFromId || "");
    const cid = String(req.query.cid || cidFromId || "");
    const qn = Number(req.query.qn || 120);

    if (!validateVideoKey(aid, cid)) {
      return res.status(400).send("invalid aid or cid");
    }

    const entry = await resolveVideoHlsEntry(aid, cid, qn, { preferCompatVideo: true });
    if (!entry?.video?.url) {
      return res.status(500).send("no hls entry");
    }
    const baseUrl = getRequestBaseUrl(req);
    const id = `${aid}_${cid}`;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=120");
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
    return res.send(buildHlsMasterPlaylist(id, qn, entry, baseUrl).replaceAll("/bili/hls/", "/bili/video/hls/"));
  } catch (error) {
    console.error("[/bili/video/hls/master] server error:", error.message);
    return res.status(500).send(`server error: ${error.message}`);
  }
});

app.get(["/bili/video/hls/video", "/bili/video/hls/video.m3u8"], async (req, res) => {
  try {
    const combinedId = String(req.query.id || "");
    const [aidFromId = "", cidFromId = ""] = combinedId.split("_");
    const aid = String(req.query.aid || aidFromId || "");
    const cid = String(req.query.cid || cidFromId || "");
    const qn = Number(req.query.qn || 120);

    if (!validateVideoKey(aid, cid)) {
      return res.status(400).send("invalid aid or cid");
    }

    const entry = await resolveVideoHlsEntry(aid, cid, qn, { preferCompatVideo: true });
    if (!entry?.video?.url) {
      return res.status(500).send("no video track");
    }
    const baseUrl = getRequestBaseUrl(req);
    const id = `${aid}_${cid}`;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=120");
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
    return res.send(buildHlsTrackPlaylist(id, qn, "video", entry, baseUrl).replaceAll("/bili/hls/", "/bili/video/hls/"));
  } catch (error) {
    console.error("[/bili/video/hls/video] server error:", error.message);
    return res.status(500).send(`server error: ${error.message}`);
  }
});

app.get(["/bili/video/hls/audio", "/bili/video/hls/audio.m3u8"], async (req, res) => {
  try {
    const combinedId = String(req.query.id || "");
    const [aidFromId = "", cidFromId = ""] = combinedId.split("_");
    const aid = String(req.query.aid || aidFromId || "");
    const cid = String(req.query.cid || cidFromId || "");
    const qn = Number(req.query.qn || 120);

    if (!validateVideoKey(aid, cid)) {
      return res.status(400).send("invalid aid or cid");
    }

    const entry = await resolveVideoHlsEntry(aid, cid, qn, { preferCompatVideo: true });
    if (!entry?.audio?.url) {
      return res.status(404).send("no audio track");
    }
    const baseUrl = getRequestBaseUrl(req);
    const id = `${aid}_${cid}`;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=120");
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
    return res.send(buildHlsTrackPlaylist(id, qn, "audio", entry, baseUrl).replaceAll("/bili/hls/", "/bili/video/hls/"));
  } catch (error) {
    console.error("[/bili/video/hls/audio] server error:", error.message);
    return res.status(500).send(`server error: ${error.message}`);
  }
});

app.get("/bili/video/hls/chunk", async (req, res) => {
  try {
    const combinedId = String(req.query.id || "");
    const [aidFromId = "", cidFromId = ""] = combinedId.split("_");
    const aid = String(req.query.aid || aidFromId || "");
    const cid = String(req.query.cid || cidFromId || "");
    const qn = Number(req.query.qn || 120);
    const trackType = String(req.query.track || "video").toLowerCase();
    const part = String(req.query.part || "media").toLowerCase();

    if (!validateVideoKey(aid, cid)) {
      return res.status(400).send("invalid aid or cid");
    }

    if (!["video", "audio"].includes(trackType)) {
      return res.status(400).send("invalid track");
    }

    if (!["init", "media", "seg"].includes(part)) {
      return res.status(400).send("invalid part");
    }

    const entry = await resolveVideoHlsEntry(aid, cid, qn, { preferCompatVideo: true });
    const track = trackType === "audio" ? entry?.audio : entry?.video;
    if (!track?.url) {
      return res.status(404).send("track not found");
    }

    let rangeHeader = "";
    if (part === "init") {
      if (!track.initRange) {
        return res.status(500).send("missing init range");
      }
      rangeHeader = `bytes=${track.initRange.start}-${track.initRange.end}`;
    } else if (part === "media") {
      if (!Number.isFinite(track.mediaStart)) {
        return res.status(500).send("missing media range");
      }
      rangeHeader = `bytes=${track.mediaStart}-`;
    } else {
      const index = Number(req.query.index || 0);
      const segments = Array.isArray(track.segments) ? track.segments : [];
      const segment = segments.find((item) => Number(item.index) === index);
      if (!segment) {
        return res.status(404).send("segment not found");
      }
      rangeHeader = `bytes=${segment.start}-${segment.end}`;
    }

    const contentType = trackType === "audio" ? "audio/mp4" : "video/mp4";
    await pipeRemoteStream(res, track.url, rangeHeader, contentType);
  } catch (error) {
    console.error("[/bili/video/hls/chunk] server error:", error.message);
    if (!res.headersSent) {
      return res.status(500).send(`server error: ${error.message}`);
    }
    res.end();
  }
});

// ==============================
// 启动
// ==============================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`bili-mpd-proxy listening on :${PORT}`);
});
