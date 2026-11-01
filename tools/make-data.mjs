// 生成「记忆银河」数据：从 QQ 桥接记忆库读出全部条目，按长期/短期分层 + 螺旋臂排布
// 用法: node make-data.mjs [输出路径]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const QB = process.env.QB_DIR || path.join(HERE, '..', '..', 'qq-bridge');
const OUT = process.argv[2] || path.join(HERE, 'data', 'galaxy.json');

const TAU = {
  soul: 36500, user: 36500, person: 400, preference: 300, fact: 300, plan: 240,
  lesson: 400, topic: 300, event: 45, misc: 60, feeling: 150,
  digest_day: 999, digest_week: 999, digest_month: 999, impression: 300,
};

const KIND = {
  soul: 'identity', user: 'identity', person: 'fact', preference: 'fact', fact: 'fact',
  plan: 'plan', lesson: 'conclusion', topic: 'conclusion',
  digest_day: 'conclusion', digest_week: 'conclusion', digest_month: 'conclusion', impression: 'conclusion',
  event: 'event', misc: 'event', feeling: 'feeling', diary: 'diary',
};

const R = 1000;          // 银河半径
const ARMS = 4;          // 旋臂数（四条主旋臂）
const now = Date.now();

function hash(str) {
  return crypto.createHash('sha1').update(str).digest();
}
function u01(buf, i) { return buf[i % buf.length] / 255; }
function gauss(buf, i) {
  const a = u01(buf, i) || 0.5, b = u01(buf, i + 7) || 0.5;
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b) * 0.5;
}

function readIndex() {
  const p = path.join(QB, 'state', 'memory', 'index.json');
  if (!fs.existsSync(p)) return [];
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  return Array.isArray(raw) ? raw : (raw.entries ?? []);
}

function readDiaries() {
  const dir = path.join(QB, 'diary');
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const day = f.replace(/\.md$/, '');
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const chunk of text.split(/\n(?=## )/)) {
      const head = (chunk.match(/^## (.+)$/m) || [])[1] || day;
      const body = chunk.replace(/^## .+$/m, '').replace(/^# .+$/m, '').trim();
      if (body.length < 8) continue;
      out.push({
        source: 'diary',
        id: `diary-${day}-${hash(head).toString('hex').slice(0, 6)}`,
        kind: 'diary', title: head.slice(0, 40), text: body.slice(0, 400),
        weight: 2, at: new Date(`${day}T20:00:00+08:00`).getTime() || now, lastHitAt: 0, pin: false,
      });
    }
  }
  return out;
}

const entries = readIndex().filter((e) => e && (e.summary || e.title));
const diaries = readDiaries();

const stars = [];
for (const e of [...entries, ...diaries]) {
  const raw = String(e.kind || 'fact');
  const kind = KIND[raw] || 'fact';
  const weight = Math.max(1, Math.min(4, Number(e.weight) || 1));
  const at = Number(e.at || e.createdAt) || now;
  const lastHit = Number(e.lastHitAt) || 0;
  const tau = TAU[raw] ?? 240;
  const ageDays = Math.max(0, (now - at) / 86400000);
  const hitDays = lastHit ? Math.max(0, (now - lastHit) / 86400000) : null;
  // 记住强度：权重^1.5 × e^(-年龄/τ)，被回忆过则按最近一次命中算，强度更高
  const effAge = hitDays === null ? ageDays : Math.min(ageDays, hitDays * 0.55);
  const strength = Math.pow(weight, 1.5) * Math.exp(-effAge / tau);
  const text = String(e.summary || e.text || e.title || '').replace(/\s+/g, ' ').trim();
  stars.push({
    id: String(e.id || `x-${at}`), rawKind: raw, kind, weight, pin: !!e.pin,
    title: String(e.title || text).slice(0, 60), text: text.slice(0, 420),
    tags: Array.isArray(e.tags) ? e.tags.slice(0, 6) : [],
    at, lastHitAt: lastHit, tau, ageDays: +ageDays.toFixed(2), hitDays: hitDays === null ? null : +hitDays.toFixed(2),
    strength, state: 'vivid',
    source: kind === 'diary' ? 'diary' : 'memory',
  });
}

// 本地钉住覆盖（界面上双击钉的，不动桥接原始库）
const pinsFile = path.join(HERE, 'data', 'pins.json');
if (fs.existsSync(pinsFile)) {
  try {
    const pins = JSON.parse(fs.readFileSync(pinsFile, 'utf8'));
    for (const s of stars) if (pins[s.id] === true) s.pin = true;
  } catch { /* 忽略坏文件 */ }
}

// —— 旋臂星尘：沿四条主旋臂铺细碎光点，蓝白为主、少量粉红结 ——
function buildDust(count = 9000) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const rr = 0.16 + Math.pow(t, 0.85) * 0.88;
    const spread = 0.13 + 0.07 * rr;
    let g = 0;
    for (let k = 0; k < 6; k++) g += Math.random();
    g = (g - 3) / 3;
    const arm = Math.floor(Math.random() * ARMS);
    const theta = (arm / ARMS) * Math.PI * 2 - 2.6 * Math.log(rr * 6 + 1) + g * spread;
    const rad = R * rr * (1 + (Math.random() - 0.5) * 0.05);
    const y = (Math.random() - 0.5) * 26 * (1 - rr * 0.5);
    const roll = Math.random();
    const color = roll < 0.70 ? [150, 185, 255] : roll < 0.90 ? [255, 185, 215] : [255, 236, 210];
    out.push({
      x: +(Math.cos(theta) * rad).toFixed(1),
      y: +y.toFixed(1),
      z: +(Math.sin(theta) * rad).toFixed(1),
      c: color,
      s: +(0.5 + Math.random() * 1.5).toFixed(2),
    });
  }
  return out;
}

// —— 分层 + 螺旋臂排布 ——
// 分层用「强度排名」而不是绝对值：保证内盘—外缘都有星，形成旋臂的厚度梯度
function assignShells(list) {
  const core = list.filter((s) => s.pin || s.kind === 'identity');
  const rest = list.filter((s) => !(s.pin || s.kind === 'identity')).sort((a, b) => b.strength - a.strength);
  for (const s of core) s.shell = 0;
  rest.forEach((s, i) => {
    const f = i / Math.max(1, rest.length - 1);
    s.shell = f < 0.55 ? 1 : f < 0.85 ? 2 : 3;                        // 内盘 / 中盘 / 外缘
  });
}

const SHELL_R = [[0.02, 0.11], [0.14, 0.44], [0.44, 0.72], [0.72, 1.0]];

stars.sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));
assignShells(stars);
for (const [i, s] of stars.entries()) {
  const h = hash(s.id + '|' + i);
  const shell = s.shell;
  const [r0, r1] = SHELL_R[shell];
  // 同一层内按强度分配半径：强的靠内
  const frac = 0.5 + 0.5 * u01(h, 3) + (shell === 0 ? 0 : 0.25 * (1 - Math.min(1, s.strength / 4)));
  const rr = Math.min(r1, r0 + (r1 - r0) * Math.min(1, frac * 0.85));
  const arm = Math.floor(u01(h, 5) * ARMS) % ARMS;
  const swirl = -2.6 * Math.log(rr * 6 + 1) + (u01(h, 9) - 0.5) * 1.30;
  const theta = (arm / ARMS) * Math.PI * 2 + swirl;
  const jitter = shell === 0 ? 0.12 : 0.26;
  const radius = R * rr * (1 + (u01(h, 11) - 0.5) * jitter);
  const yScale = shell === 0 ? 0.20 : 0.055;
  s.arm = arm;
  s.shell = shell;
  s.r = +(radius / R).toFixed(4);
  s.x = +(Math.cos(theta) * radius).toFixed(2);
  s.z = +(Math.sin(theta) * radius).toFixed(2);
  s.y = +(gauss(h, 13) * R * yScale * Math.exp(-rr * 1.1) + (shell === 0 ? gauss(h, 17) * R * 0.05 : 0)).toFixed(2);
}

// 消息星点：主库全部原始聊天（同会话相邻消息连线）
const messages = [];
const links = [];
const archDir = path.join(QB, 'state', 'memory', 'archive');
if (fs.existsSync(archDir)) {
  for (const f of fs.readdirSync(archDir).filter((x) => x.endsWith('.jsonl'))) {
    const key = f.replace(/[.]jsonl$/, '');
    const rows = fs.readFileSync(path.join(archDir, f), 'utf8').split(String.fromCharCode(10)).filter(Boolean);
    let prev = -1;
    for (const line of rows) {
      let raw; try { raw = JSON.parse(line); } catch { continue; }
      const at = Number(raw.at || raw.time || 0) || now;
      const h = hash(key + ":" + at + ":" + messages.length);
      const ageDays = Math.max(0, (now - at) / 86400000);
      const rr = 0.30 + Math.pow(u01(h, 2), 0.55) * 0.76;
      const arm = Math.floor(u01(h, 5) * ARMS) % ARMS;
      const theta = (arm / ARMS) * Math.PI * 2 - 2.6 * Math.log(rr * 6 + 1) + (u01(h, 9) - 0.5) * 1.35;
      const radius = R * rr;
      messages.push({
        id: "m" + messages.length, key, at, self: !!raw.isSelf, source: 'message',
        text: String(raw.text || '').replace(/\s+/g, ' ').slice(0, 48),
        x: +(Math.cos(theta) * radius).toFixed(1),
        y: +(gauss(h, 13) * R * 0.075).toFixed(1),
        z: +(Math.sin(theta) * radius).toFixed(1),
        tau: +(24 + u01(h, 15) * 12).toFixed(1),
        ageDays: +ageDays.toFixed(2),
      });
      if (prev >= 0) links.push([prev, messages.length - 1]);
      prev = messages.length - 1;
    }
  }
}
const counts = {};
for (const s of stars) counts[s.kind] = (counts[s.kind] || 0) + 1;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const payload = {
  meta: {
    generatedAt: now, radius: R, arms: ARMS,
    total: stars.length, pinned: stars.filter((s) => s.pin).length,
    messages: messages.length, links: links.length, counts,
    sources: { memory: stars.filter((s) => s.source === 'memory').length, diary: stars.filter((s) => s.source === 'diary').length, message: messages.length },
    avgStrength: +(stars.reduce((a, s) => a + s.strength, 0) / Math.max(1, stars.length)).toFixed(3),
  },
  stars, dust: buildDust(), messages, links,
};
fs.writeFileSync(OUT, JSON.stringify(payload));
console.log(`galaxy ok: ${stars.length} stars (pinned ${payload.meta.pinned}), messages ${messages.length}, links ${links.length} -> ${OUT}`);
