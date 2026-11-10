/*
 * Moment_Motion Kit engine — 프리셋 정의 + 키프레임 계산 (패널 쪽, 순수 함수)
 * 프리미어와 직접 대화하지 않고, "몇 번째 프레임에 어떤 값" 목록만 만든다.
 * 실제 키프레임 쓰기는 jsx/host.jsx 가 맡는다.
 *
 * 단위 약속
 *  - 프리셋의 프레임 숫자는 30fps 기준. 시퀀스 fps 에 맞춰 자동 환산.
 *  - scale / sw / sh / op : 퍼센트 (100 = 원래 크기)
 *  - rot : 도(degree)
 *  - pos : posUnit 'px'    → 1080p 기준 픽셀 (해상도에 맞춰 환산)
 *          posUnit 'frame' → 화면 폭/높이 대비 비율 (1 = 화면 한 장)
 *  - fx  : 프리미어 기본 효과 (자르기 crop / 가우시안 흐림 gblur / 난류 변위 turb / 방향 흐림 dblur)
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MK = api;
})(this, function () {
  'use strict';

  /* ---------------- 이징 ---------------- */
  var EASES = {
    lin:   [0, 0, 1, 1],
    out:   [0.22, 1, 0.36, 1],
    in:    [0.64, 0, 0.78, 0],
    inout: [0.6, 0, 0.4, 1],
    expo:  [0.12, 0.9, 0.25, 1],
    back:  [0.3, 1.5, 0.6, 1]
  };

  /* 커브 탭 기본 커브 — 배열 = 베지어 [x1,y1,x2,y2], 객체 = 모양이 정해진 곡선 { f: 'spring'|'elastic'|'bounce', rev } */
  var CURVES = [
    { id: 'lin',     name: '선형',         en: 'Linear',      c: EASES.lin,              desc: '일정한 속도' },
    { id: 'smooth',  name: '부드럽게 멈춤', en: 'Smooth stop', c: EASES.out,              desc: '빠르게 출발해 부드럽게 멈춤' },
    { id: 'spring',  name: '튕기며 멈춤',   en: 'Spring stop', c: { f: 'spring' },        desc: '빠르게 출발해 튕기듯 멈춤' },
    { id: 'balance', name: '균형',         en: 'Balanced',    c: [0.65, 0, 0.35, 1],     desc: '천천히 출발 → 빨라졌다 → 부드럽게 멈춤' },
    { id: 'slow',    name: '천천히 출발',   en: 'Slow start',  c: EASES.in,               desc: '천천히 출발해 점점 빨라짐' },
    { id: 'soft',    name: '부드럽게',      en: 'Ease in-out', c: EASES.inout,            desc: '양쪽 다 부드럽게' },
    { id: 'expo',    name: '강한 감속',     en: 'Strong ease', c: EASES.expo,             desc: '확 나갔다가 길게 멈춤' },
    { id: 'back',    name: '오버슈트',      en: 'Overshoot',   c: EASES.back,             desc: '살짝 지나쳤다 돌아옴' },
    { id: 'elastic', name: '탄성',         en: 'Elastic',     c: { f: 'elastic' },       desc: '고무줄처럼 여러 번 출렁이며 멈춤' },
    { id: 'bounce',  name: '통통',         en: 'Bounce',      c: { f: 'bounce' },        desc: '바닥에 튕기듯 통통 멈춤' }
  ];
  /* 모양이 정해진 곡선 (0→1) */
  var SHAPES = {
    spring: function (x) { var k = 1 - Math.exp(-6) * Math.cos(12); return (1 - Math.exp(-6 * x) * Math.cos(12 * x)) / k; },
    elastic: function (x) { if (x <= 0) return 0; if (x >= 1) return 1; return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1; },
    bounce: function (x) {
      var n1 = 7.5625, d1 = 2.75;
      if (x < 1 / d1) return n1 * x * x;
      if (x < 2 / d1) { x -= 1.5 / d1; return n1 * x * x + 0.75; }
      if (x < 2.5 / d1) { x -= 2.25 / d1; return n1 * x * x + 0.9375; }
      x -= 2.625 / d1; return n1 * x * x + 0.984375;
    }
  };
  function isShape(c) { return !!(c && !Array.isArray(c) && typeof c === 'object' && SHAPES[c.f]); }
  /* 곡선 뒤집기 (끝 → 시작) */
  function reverseCurve(c) {
    if (isShape(c)) return { f: c.f, rev: !c.rev };
    return [Math.round((1 - c[2]) * 100) / 100, Math.round((1 - c[3]) * 100) / 100, Math.round((1 - c[0]) * 100) / 100, Math.round((1 - c[1]) * 100) / 100];
  }
  function sameCurve(a, b) {
    if (isShape(a) || isShape(b)) return isShape(a) && isShape(b) && a.f === b.f && !!a.rev === !!b.rev;
    if (!a || !b) return false;
    for (var i = 0; i < 4; i++) if (Math.abs(a[i] - b[i]) > 0.005) return false;
    return true;
  }
  function isLinear(c) { return Array.isArray(c) && sameCurve(c, EASES.lin); }
  /* 그림용: 곡선을 n 칸으로 */
  function curveSamples(c, n) { var f = easeFn(c), out = []; for (var i = 0; i <= n; i++) out.push([i / n, f(i / n)]); return out; }

  function bezier(x1, y1, x2, y2) {
    if (x1 === y1 && x2 === y2) return function (x) { return x; };
    function bx(t) { var u = 1 - t; return 3 * x1 * t * u * u + 3 * x2 * t * t * u + t * t * t; }
    function by(t) { var u = 1 - t; return 3 * y1 * t * u * u + 3 * y2 * t * t * u + t * t * t; }
    function dx(t) { var u = 1 - t; return 3 * x1 * u * u + 6 * (x2 - x1) * t * u + 3 * (1 - x2) * t * t; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x, i;
      for (i = 0; i < 8; i++) {                 // 뉴턴법
        var e = bx(t) - x;
        if (Math.abs(e) < 1e-6 && t >= 0 && t <= 1) return by(t);
        var d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      var lo = 0, hi = 1; t = x;                // 실패하면 이분법
      for (i = 0; i < 50; i++) {
        var v = bx(t);
        if (Math.abs(v - x) < 1e-7) break;
        if (v < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return by(t);
    };
  }
  var easeCache = {};
  function easeFn(e) {
    if (isShape(e)) { var sh = SHAPES[e.f]; return e.rev ? function (x) { return 1 - sh(1 - x); } : sh; }
    if (Array.isArray(e)) return bezier(e[0], e[1], e[2], e[3]);
    if (!easeCache[e]) { var c = EASES[e] || EASES.lin; easeCache[e] = bezier(c[0], c[1], c[2], c[3]); }
    return easeCache[e];
  }

  /* ---------------- 생성기 ---------------- */
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* frames 동안 점점 잦아드는 흔들림 */
  function shake(frames, amp, rotAmp, seed, decay) {
    var r = rng(seed), pos = [], rot = [], sx = 1, sy = -1;
    for (var f = 0; f < frames; f++) {
      var a = Math.pow(1 - f / frames, decay == null ? 1.4 : decay);
      sx = -sx; if (r() < 0.3) sy = -sy;
      pos.push([f, [sx * amp * a * (0.55 + 0.45 * r()), sy * amp * 0.75 * a * (0.4 + 0.6 * r())], 'lin']);
      if (rotAmp) rot.push([f, (r() * 2 - 1) * rotAmp * a, 'lin']);
    }
    pos.push([frames, [0, 0]]);
    if (rotAmp) rot.push([frames, 0]);
    var out = { pos: pos };
    if (rotAmp) out.rot = rot;
    return out;
  }
  /* 처음과 끝이 0 인 반복용 패턴 */
  function jitterLoop(period, amp, seed) {
    var r = rng(seed), pos = [[0, [0, 0], 'lin']];
    for (var f = 1; f < period; f++) pos.push([f, [(r() * 2 - 1) * amp, (r() * 2 - 1) * amp], 'lin']);
    pos.push([period, [0, 0]]);
    return pos;
  }
  /* 등장 애니메이션을 거꾸로 (퇴장용) */
  function mirror(track) {
    var F = track[track.length - 1][0];
    var out = track.map(function (k) { return [F - k[0], k[1], 'hold']; }).reverse();
    out[out.length - 1] = [out[out.length - 1][0], out[out.length - 1][1]];
    return out;
  }
  function mirrorSpec(spec) {
    var t = {}, p;
    for (p in spec.tracks) t[p] = mirror(spec.tracks[p]);
    return { tracks: t, fx: (spec.fx || []).map(function (e) {
      var tr = {}; for (var q in e.tracks) tr[q] = mirror(e.tracks[q]);
      return { fx: e.fx, tracks: tr, set: e.set };
    }) };
  }
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  function offsetTrack(track, by) {
    return track.map(function (k) { return [k[0] + by, k[1], k[2]]; });
  }

  /* ---------------- 타이핑 ----------------
   * 프리미어 스크립트로는 글자(Source Text)를 키프레임할 수 없어서
   * "자르기(Crop) 오른쪽" 값을 글자 폭만큼 한 칸씩 줄이며 왼쪽부터 드러낸다.
   * 글자 영역(중심·폭)은 자동 추정 — 안 맞으면 패널의 타이핑 설정에서 조정.
   */
  /* 글자 폭 (글자 크기 대비, 굵은 고딕 기준 대략) */
  var NARROW = /[iIl!|.,:;'`]/, SEMI = /[fjrt\-()\[\]"]/, WIDE = /[mwMW@%]/;
  function charWeight(ch) {
    if (/\s/.test(ch)) return 0.3;
    if (/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u3040-\u30FF\u4E00-\u9FFF]/.test(ch)) return 0.92;
    if (/[\uFF00-\uFFEF]/.test(ch)) return 0.92;
    if (NARROW.test(ch)) return 0.28;
    if (SEMI.test(ch)) return 0.38;
    if (WIDE.test(ch)) return 0.88;
    if (/[A-Z]/.test(ch)) return 0.7;
    if (/[0-9]/.test(ch)) return 0.56;
    if (/[?·~]/.test(ch)) return 0.55;
    return 0.58;
  }
  /* 캡처한 글자 영역의 "세로 줄별 글자 양"(ink)으로 글자 사이 경계를 찾는다.
   * 후보 = 글자 양이 주변보다 적은 곳(빈 틈이면 가장 좋음). 예상 글자 폭과 가장 잘 맞는 조합을 고른다(동적 계획법).
   * exp = 글자(띄어쓰기는 다음 글자에 포함)마다 예상 폭(%), 반환 = 경계 위치들(%) (마지막 = R) */
  var MK_WC = 2, MK_WI = 6;
  function fitBounds(ink, L, R, exp) {
    var m = exp.length, out = [], k;
    if (m <= 1 || !ink || !ink.v || !ink.v.length) { var acc = 0; for (k = 0; k < m; k++) { acc += exp[k]; out.push(L + acc); } out[m - 1] = R; return out; }
    var v = ink.v, n = v.length, a = Math.max(1, Math.floor(L / 100 * n)), b = Math.min(n - 2, Math.ceil(R / 100 * n)), mx = 1, j;
    for (j = a; j <= b; j++) if (v[j] > mx) mx = v[j];
    /* 후보: 글자 양이 낮은 구간(평평한 골짜기)의 가운데 */
    var cand = [], st = -1;
    for (j = a; j <= b; j++) {
      var isMin = v[j] <= v[j - 1] && v[j] <= v[j + 1];
      if (isMin && st < 0) st = j;
      if ((!isMin || j === b) && st >= 0) {
        var e = isMin ? j : j - 1, lo = Infinity;
        for (var q = st; q <= e; q++) if (v[q] < lo) lo = v[q];
        cand.push({ x: (st + e + 1) / 2 / n * 100, c: lo / mx });
        st = -1;
      }
    }
    var C = cand.length; if (!C) return fitBounds(null, L, R, exp);
    /* best[k][i] = 앞의 k+1 글자를 후보 i 에서 끊을 때 최소 비용 */
    var W = MK_WI, WC = MK_WC, best = [], from = [], i, i2;
    function wcost(len, e) { var d = (len - e) / Math.max(e, 0.3); return WC * d * d; }
    for (k = 0; k < m - 1; k++) {
      best.push([]); from.push([]);
      for (i = 0; i < C; i++) {
        var x = cand[i].x, bc = Infinity, bf = -1;
        if (k === 0) bc = wcost(x - L, exp[0]);
        else for (i2 = 0; i2 < i; i2++) { var pc = best[k - 1][i2]; if (pc === Infinity) continue; var cc = pc + wcost(x - cand[i2].x, exp[k]); if (cc < bc) { bc = cc; bf = i2; } }
        best[k].push(bc === Infinity ? Infinity : bc + W * cand[i].c); from[k].push(bf);
      }
    }
    var end = Infinity, ei = -1;
    for (i = 0; i < C; i++) { var tc = best[m - 2][i]; if (tc === Infinity) continue; tc += wcost(R - cand[i].x, exp[m - 1]); if (tc < end) { end = tc; ei = i; } }
    if (ei < 0) return fitBounds(null, L, R, exp);
    var idx = [ei]; for (k = m - 2; k > 0; k--) idx.unshift(from[k][idx[0]]);
    out = idx.map(function (q) { return cand[q].x; }); out.push(R);
    return out;
  }
  function typingLayout(text, ctx, ty, area) {
    ty = ty || {};
    var chars = Array.from(String(text || '').trim());
    if (!chars.length) chars = Array.from('가나다라마바');
    var weights = chars.map(charWeight), total = weights.reduce(function (a, b) { return a + b; }, 0);
    var charPct = 0.065 * Math.min(ctx.w, ctx.h) / ctx.w * 100;     // 한글 한 글자 ≈ 화면 폭의 몇 %
    var auto = Math.min(98, total * charPct + 3);
    var width = ty.width > 0 ? Math.min(100, ty.width) : auto;
    var center = ty.center == null || ty.center === '' ? 50 : Number(ty.center);
    var L = Math.max(0, center - width / 2), R = Math.min(100, center + width / 2);
    /* 자동 측정한 글자 범위가 있으면 그걸 우선 (수동 폭을 넣었으면 수동 우선) */
    var measured = !!(area && !(ty.width > 0));
    if (measured) { L = Math.max(0, area.L - 0.3); R = Math.min(100, area.R + 0.3); width = R - L; auto = width; }
    /* 글자마다 끝나는 위치(화면 %) — 측정값이 있으면 실제 글자 사이 틈에 맞춘다 */
    var vis = [], exp = [], pend = 0, i;
    for (i = 0; i < chars.length; i++) {
      pend += weights[i];
      if (!/\s/.test(chars[i])) { vis.push(i); exp.push((R - L) * pend / total); pend = 0; }
    }
    if (pend && exp.length) exp[exp.length - 1] += (R - L) * pend / total;
    var cuts = fitBounds(measured ? area.ink : null, L, R, exp), bounds = [], snapped = measured && area.ink ? Math.max(0, cuts.length - 1) : 0, vk = 0, last = L;
    for (i = 0; i < chars.length; i++) {
      if (vk < vis.length && vis[vk] === i) { last = cuts[vk]; vk++; }
      bounds.push(last);
    }
    return { chars: chars, weights: weights, total: total, auto: Math.round(auto), width: width, L: L, R: R, measured: measured,
      bounds: bounds, snapped: snapped };
  }
  /* 실제로 한 칸씩 나타나는 글자 (띄어쓰기는 다음 글자와 같이 → 박자가 일정) */
  function typingSteps(lay) {
    var out = [];
    for (var i = 0; i < lay.chars.length; i++) if (!/\s/.test(lay.chars[i])) out.push(i);
    return out.length ? out : [lay.chars.length - 1];
  }
  /* 타이핑할 문장: 직접 입력 > 자막에서 읽은 글자 > 클립 이름 */
  var DEFAULT_NAMES = /^(graphic|graphics|text|title|\uADF8\uB798\uD53D|\uD14D\uC2A4\uD2B8|\uC81C\uBAA9|\uC0C8 \uD14D\uC2A4\uD2B8 \uB808\uC774\uC5B4|shape)\s*\d*$/i;
  function typingText(clip, ty) {
    if (ty && ty.text && String(ty.text).trim()) return { text: String(ty.text).trim(), from: 'input' };
    if (clip.text && String(clip.text).trim()) return { text: String(clip.text).trim(), from: 'source' };
    var nm = String(clip.name || '').trim();
    return { text: nm, from: DEFAULT_NAMES.test(nm) || !nm ? 'guess' : 'name' };
  }
  function typingSpec(src, ctx, ty, erase, area) {
    var text = src && src.text !== undefined ? src.text : src;
    var lay = typingLayout(text, ctx, ty, area), fpc = (ty && ty.fpc) || 4, steps = typingSteps(lay);
    var keys = [[0, 100 - lay.L, 'hold']];
    steps.forEach(function (ci, k) {
      var last = k === steps.length - 1;
      keys.push([(k + 1) * fpc, last ? 0 : Math.max(0, 100 - lay.bounds[ci]), last ? undefined : 'hold']);
    });
    keys[keys.length - 1] = [keys[keys.length - 1][0], keys[keys.length - 1][1]];
    var spec = { tracks: {}, fx: [{ fx: 'crop', tracks: { Right: keys }, set: { Left: 0, Top: 0, Bottom: 0 } }] };
    return erase ? mirrorSpec(spec) : spec;
  }
  /* 타이핑 커서 (복제 트랙용): 복제본을 흰 막대로 만들어 글자 끝을 따라가고, 다 쓰면 깜빡이다 사라짐 */
  function cursorSpec(src, ctx, ty, area) {
    var text = src && src.text !== undefined ? src.text : src;
    var lay = typingLayout(text, ctx, ty, area), fpc = (ty && ty.fpc) || 4, steps = typingSteps(lay);
    var bw = Math.max(0.35, 5 / ((ctx && ctx.w) || 1920) * 100), gap = 0.25;
    var T = area ? Math.max(0, area.T - 0.8) : 42, B = area ? Math.min(100, area.B + 0.8) : 58;
    var xs = [lay.L].concat(steps.map(function (ci) { return lay.bounds[ci]; }));
    var Lk = [], Rk = [];
    xs.forEach(function (x, k) {
      var l = Math.min(100 - bw, x + gap);
      Lk.push([k * fpc, l, 'hold']); Rk.push([k * fpc, Math.max(0, 100 - l - bw), 'hold']);
    });
    var end = steps.length * fpc, op = [[0, 100, 'hold']];
    for (var b = 0; b < 4; b++) { op.push([end + 8 + b * 16, 0, 'hold']); op.push([end + 16 + b * 16, b === 3 ? 0 : 100, 'hold']); }
    op[op.length - 1] = [op[op.length - 1][0], 0];
    return { below: 'need', tracks: { op: op }, fx: [
      { fx: 'ramp', set: { StartColor: { color: [255, 255, 255, 255] }, EndColor: { color: [255, 255, 255, 255] }, Blend: 0 } },
      { fx: 'crop', fxOnly: true, tracks: { Left: Lk, Right: Rk }, set: { Top: T, Bottom: 100 - B } }
    ] };
  }

  /* ---------------- 프리셋 ----------------
   * mode
   *  in   : 시작점(재생헤드 또는 클립 시작)부터 재생
   *  out  : 클립 끝에 맞춰 끝나도록 재생
   *  span : 시작점~클립 끝 전체에 늘려서 (프레임 0~1 비율)
   *  loop : 시작점~클립 끝까지 period 프레임 패턴 반복
   * blur : 모션블러 셔터 각도 (0 = 없음)
   * tracks : 변형(Transform) 효과 속성들   각 키: [프레임, 값, 다음 키까지의 이징]
   * fx     : 추가 효과 [{ fx, tracks:{ 속성: 키들 }, set:{ 속성: 고정값 } }]
   * build  : 클립마다 동적으로 만드는 프리셋 (타이핑)
   */
  /* ---------------- 색 차오르기 (복제 레이어용) ----------------
   * 원본 자막을 위 트랙에 복제하고, 위 복제본에만 쓴다. (0202 방식: 색조 + 자르기, 자막 위치에 맞춰 차오름)
   *  직선: 색조(흰 글자 → 고른 색, 검은 테두리는 그대로) + 자르기로 한 방향씩 드러냄
   *  곡선: 경사(단색 판) + 자르기 + 파도 비틀기(물결치는 수면) + 트랙 매트 키(원본 글자의 밝은 부분만)
   * area = 자동 측정한 글자 범위 {L,R,T,B} (%), 없으면 화면 전체
   */
  var FILL_COLORS = { yellow: [255, 255, 214, 0], red: [255, 255, 60, 60], sky: [255, 70, 190, 255], pink: [255, 255, 110, 190],
    green: [255, 60, 220, 120], white: [255, 255, 255, 255], black: [255, 20, 20, 20] };
  var FILL_N = 80;          // 0202 와 같은 길이 (30fps 기준 약 2.7초) · 길이 슬라이더로 바뀜
  var DARK = [255, 0, 0, 0];
  function fillSpec(dir, area, color, ctx) {
    var a = area || { L: 0, R: 100, T: 0, B: 100 }, col = color || FILL_COLORS.yellow, N = FILL_N, tr = {}, st = { Left: 0, Top: 0, Right: 0, Bottom: 0 };
    if (dir === 'wave') {
      var H = (ctx && ctx.h) || 1080, W = (ctx && ctx.w) || 1920;
      var hPct = Math.max(1, Math.min(4, (a.B - a.T) * 0.1));            // 물결 높이 = 글자 높이의 10% (화면 %)
      var hPx = Math.round(hPct / 100 * H), wPx = Math.max(40, Math.round((a.R - a.L) / 100 * W * 0.22));
      tr.Top = [[0, Math.min(100, a.B + hPct + 0.5), 'inout'], [N, Math.max(0, a.T - hPct - 1), 'lin'], [N + 1, 0]];
      delete st.Top;
      return { below: 'need', tracks: {}, fx: [
        { fx: 'ramp', set: { StartColor: { color: col }, EndColor: { color: col }, Blend: 0 } },
        { fx: 'crop', fxOnly: true, tracks: tr, set: st },
        { fx: 'wwarp', set: { Height: hPx, Width: wPx, Direction: 90, Speed: 1.2 } },
        { fx: 'tmk', set: { Matte: 'below', Composite: 'luma' } }
      ] };
    }
    if (dir === 'up') { tr.Top = [[0, a.B + 0.5, 'inout'], [N, Math.max(0, a.T - 0.5), 'lin'], [N + 1, 0]]; delete st.Top; }
    else if (dir === 'down') { tr.Bottom = [[0, 100 - a.T + 0.5, 'inout'], [N, Math.max(0, 100 - a.B - 0.5), 'lin'], [N + 1, 0]]; delete st.Bottom; }
    else { tr.Right = [[0, 100 - a.L + 0.5, 'inout'], [N, Math.max(0, 100 - a.R - 0.5), 'lin'], [N + 1, 0]]; delete st.Right; }
    return { below: 'check', tracks: {}, fx: [
      { fx: 'tint', set: { Black: { color: col === FILL_COLORS.black ? col : DARK }, White: { color: col }, Amount: 100 } },
      { fx: 'crop', tracks: tr, set: st }
    ] };
  }
  /* ---------------- 프레임 밖에서 꽂기 ----------------
   * 화면을 가득 넘는 크기(420%)에서 4프레임 만에 팍 들어와 원래 동작으로 이어진다.
   */
  function outsideSpec(spec) {
    var t = spec.tracks || {}, sc = t.scale, E = 4, p;
    if (!sc) return spec;
    var drop = sc[0][1] < 90 ? 1 : 0;
    var shift = drop ? E - sc[1][0] : E;
    var ns = [[0, 420, 'in']].concat(sc.slice(drop).map(function (k) { return [k[0] + shift, k[1], k[2]]; }));
    var out = { scale: ns, op: [[0, 0, 'lin'], [1, 100]] };
    for (p in t) if (p !== 'scale' && p !== 'op') out[p] = offsetTrack(t[p], shift);
    return merge(spec, { tracks: out, blur: 360 });
  }

  var CATS = [
    { id: 'basic',   label: '기본' },
    { id: 'dissolve', label: '디졸브' },
    { id: 'impact',  label: '임팩트' },
    { id: 'text',    label: '자막' },
    { id: 'caption', label: '모션자막' },
    { id: 'fun',     label: '예능' }
  ];

  /* 한 카드에 묶이는 변형들. layout 'dpad' = 십자 방향 버튼, 'row' = 가로 버튼 */
  var GROUPS = {
    zoom:     { name: '천천히 줌', en: 'Slow Zoom', desc: '클립 끝까지 서서히', layout: 'row' },
    quick:    { name: '퀵줌', en: 'Quick Zoom', desc: '순간 확 당기기', layout: 'row' },
    punch:    { name: '펀치컷', en: 'Punch Cut', desc: '툭 확대해서 유지', layout: 'row' },
    whip:     { name: '휙 줌', en: 'Whip Zoom', desc: '크게 날아들고 날아감 (블러 선택)', layout: 'row' },
    sslide:   { name: '옆에서 쓱', en: 'Side Slide', desc: '옆에서 미끄러져 착', layout: 'row' },
    drama:    { name: '드라마 줌', en: 'Drama Zoom', desc: '급확대 + 덜컹', layout: 'row' },
    d_soft:   { name: '부드러운 디졸브', en: 'Soft Dissolve', desc: '스르륵 나타나고 사라짐', layout: 'row' },
    d_blur:   { name: '블러 디졸브', en: 'Blur Dissolve', desc: '흐릿하게 녹아들기', layout: 'row' },
    d_zoom:   { name: '줌 디졸브', en: 'Zoom Dissolve', desc: '살짝 줌하며 녹아들기', layout: 'row' },
    d_white:  { name: '하얗게 디졸브', en: 'Flash Dissolve', desc: '하얗게 번쩍이며 전환', layout: 'row' },
    d_black:  { name: '검게 디졸브', en: 'Dip Dissolve', desc: '어둡게 가라앉으며 전환', layout: 'row' },
    d_dir:    { name: '방향 블러 디졸브', en: 'Motion Dissolve', desc: '옆으로 흐르며 녹아들기', layout: 'row' },
    d_feather:{ name: '페더 와이프', en: 'Feather Wipe', desc: '경계가 부드러운 와이프', layout: 'row' },
    d_chroma: { name: '색수차 디졸브', en: 'Chroma Dissolve', desc: 'RGB가 갈라졌다 모이며 전환', layout: 'row' },
    fill:     { name: '색 차오르기', en: 'Color Fill', desc: '글자에 색이 차오름 · 복제 트랙용', layout: 'row' },
    slidein:  { name: '슬라이드 IN', en: 'Slide In', desc: '화면 밖에서 들어옴', layout: 'dpad', center: 'in' },
    slideout: { name: '슬라이드 OUT', en: 'Slide Out', desc: '끝에서 화면 밖으로', layout: 'dpad', center: 'out' },
    cropin:   { name: '크롭 IN', en: 'Crop Wipe In', desc: '잘린 채로 쓱 열림', layout: 'dpad' },
    cropout:  { name: '크롭 OUT', en: 'Crop Wipe Out', desc: '끝에서 쓱 닫힘', layout: 'dpad' },
    pop:      { name: '팝', en: 'Pop', desc: '톡 튀어나오고 들어감', layout: 'row' },
    chewy:    { name: '쫀득', en: 'Chewy', desc: '늘어났다 쫀득하게 착', layout: 'row' },
    slam:     { name: '쾅', en: 'Slam', desc: '크게 날아와 박힘', layout: 'row' },
    bounce:   { name: '바운스', en: 'Bounce', desc: '튕기며 복귀', layout: 'row' },
    shake:    { name: '흔들림', en: 'Shake', desc: '덜컹 흔들림', layout: 'row' },
    fade:     { name: '페이드', en: 'Fade', desc: '살짝 움직이며 나타남/사라짐', layout: 'row' },
    typing:   { name: '타이핑', en: 'Typewriter', desc: '한 글자씩 써지고 지워짐', layout: 'row' },
    blur:     { name: '블러', en: 'Blur', desc: '흐릿 ↔ 선명', layout: 'row' },
    flow:     { name: '귓등으로 듣는', en: 'Ear Flow', desc: '화면을 가로질러 흘러감', layout: 'row' },
    glow:     { name: '빛나며 등장', en: 'Glow In', desc: '번쩍 밝았다 선명', layout: 'row' },
    blink:    { name: '깜빡깜빡', en: 'Blink', desc: '점멸', layout: 'row' },
    heart:    { name: '두근두근', en: 'Heartbeat', desc: '콩닥 커졌다 복귀', layout: 'row' },
    tilt:     { name: '갸우뚱', en: 'Tilt', desc: '기우뚱 기울기', layout: 'row' }
  };

  var thudShake = shake(10, 14, 0.8, 7, 1.6);
  var stampShake = shake(8, 10, 0.8, 41, 1.5);
  var rageShake = shake(18, 34, 2.2, 61, 1.1);
  /* 좌우로 덜덜 떨며 잦아드는 등장 */
  var shakeInPos = (function () {
    var t = [];
    for (var f = 0; f < 14; f++) t.push([f, [(f % 2 ? -1 : 1) * 16 * Math.pow(1 - f / 14, 1.2), 0], 'lin']);
    t.push([14, [0, 0]]);
    return t;
  })();
  function blinks(n) {
    var t = [[0, 100, 'hold']];
    for (var i = 0; i < n; i++) { t.push([i * 6 + 3, 0, 'hold']); t.push([i * 6 + 6, 100, 'hold']); }
    t[t.length - 1] = [t[t.length - 1][0], 100];
    return t;
  }
  function cropIn(side, other) { var tr = {}, st = {}; tr[side] = [[0, 100, 'out'], [12, 0]]; st[other] = 0; return [{ fx: 'crop', tracks: tr, set: st }]; }
  function cropOut(side, other) { var tr = {}, st = {}; tr[side] = [[0, 0, 'in'], [10, 100]]; st[other] = 0; return [{ fx: 'crop', tracks: tr, set: st }]; }

  var PRESETS = [
    /* ===== 기본 ===== */
    { id: 'slowin',  cat: 'basic', group: 'zoom', v: 'in', name: '천천히 줌 인',  desc: '클립 끝까지 서서히 확대', mode: 'span', zoomRate: 1,
      tracks: { scale: [[0, 100, 'lin'], [1, 108]] } },
    { id: 'slowout', cat: 'basic', group: 'zoom', v: 'out', name: '천천히 줌 아웃', desc: '클립 끝까지 서서히 축소', mode: 'span', zoomRate: -1,
      tracks: { scale: [[0, 108, 'lin'], [1, 100]] } },
    { id: 'snapin',  cat: 'basic', group: 'quick', v: 'in', name: '스냅 줌 인', desc: '100→118 · 6f', mode: 'in', blur: 180,
      tracks: { scale: [[0, 100, 'expo'], [6, 118]] } },
    { id: 'snapout', cat: 'basic', group: 'quick', v: 'out', name: '스냅 줌 아웃', desc: '118→100 · 6f', mode: 'in', blur: 180,
      tracks: { scale: [[0, 118, 'expo'], [6, 100]] } },
    { id: 'punch',   cat: 'basic', group: 'punch', v: '1단', name: '펀치 줌', desc: '시작점에서 툭 112%', mode: 'in',
      tracks: { scale: [[-1, 100, 'lin'], [0, 112]] } },
    { id: 'punch2',  cat: 'basic', group: 'punch', v: '2단', name: '펀치 줌 2단', desc: '112% → 0.5초 뒤 124%', mode: 'in',
      tracks: { scale: [[-1, 100, 'lin'], [0, 112, 'hold'], [15, 124]] } },
    { id: 'whoosh',  cat: 'basic', group: 'whip', v: 'in', name: '휙 줌 인', desc: '크게 날아들며 등장', mode: 'in', blur: 360,
      tracks: { scale: [[0, 220, 'expo'], [7, 100]], op: [[0, 0, 'lin'], [2, 100]] } },
    { id: 'zoomblur', cat: 'basic', group: 'whip', v: '블러 in', name: '줌 블러 인', desc: '크게 흐릿 → 착 선명', mode: 'in',
      tracks: { scale: [[0, 160, 'expo'], [9, 100]], op: [[0, 0, 'lin'], [3, 100]] },
      fx: [{ fx: 'gblur', tracks: { Blurriness: [[0, 28, 'out'], [9, 0]] } }] },
    { id: 'whooshout', cat: 'basic', group: 'whip', v: 'out', name: '휙 줌 아웃', desc: '끝에서 크게 날아감', mode: 'out', blur: 360,
      tracks: { scale: [[0, 100, 'in'], [7, 220]], op: [[5, 100, 'lin'], [7, 0]] } },

    { id: 'sl_in_u', cat: 'basic', group: 'slidein', dir: 'u', v: '↓', name: '슬라이드 IN 위', desc: '위에서 들어옴', mode: 'in', blur: 180, posUnit: 'frame',
      tracks: { pos: [[0, [0, -1.05], 'expo'], [9, [0, 0]]] } },
    { id: 'sl_in_l', cat: 'basic', group: 'slidein', dir: 'l', v: '→', name: '슬라이드 IN 왼쪽', desc: '왼쪽에서 들어옴', mode: 'in', blur: 180, posUnit: 'frame',
      tracks: { pos: [[0, [-1.05, 0], 'expo'], [9, [0, 0]]] } },
    { id: 'sl_in_r', cat: 'basic', group: 'slidein', dir: 'r', v: '←', name: '슬라이드 IN 오른쪽', desc: '오른쪽에서 들어옴', mode: 'in', blur: 180, posUnit: 'frame',
      tracks: { pos: [[0, [1.05, 0], 'expo'], [9, [0, 0]]] } },
    { id: 'sl_in_d', cat: 'basic', group: 'slidein', dir: 'd', v: '↑', name: '슬라이드 IN 아래', desc: '아래에서 들어옴', mode: 'in', blur: 180, posUnit: 'frame',
      tracks: { pos: [[0, [0, 1.05], 'expo'], [9, [0, 0]]] } },
    { id: 'sl_out_u', cat: 'basic', group: 'slideout', dir: 'u', v: '↑', name: '슬라이드 OUT 위', desc: '끝에서 위로 나감', mode: 'out', blur: 180, posUnit: 'frame',
      tracks: { pos: [[0, [0, 0], 'in'], [8, [0, -1.05]]] } },
    { id: 'sl_out_l', cat: 'basic', group: 'slideout', dir: 'l', v: '←', name: '슬라이드 OUT 왼쪽', desc: '끝에서 왼쪽으로 나감', mode: 'out', blur: 180, posUnit: 'frame',
      tracks: { pos: [[0, [0, 0], 'in'], [8, [-1.05, 0]]] } },
    { id: 'sl_out_r', cat: 'basic', group: 'slideout', dir: 'r', v: '→', name: '슬라이드 OUT 오른쪽', desc: '끝에서 오른쪽으로 나감', mode: 'out', blur: 180, posUnit: 'frame',
      tracks: { pos: [[0, [0, 0], 'in'], [8, [1.05, 0]]] } },
    { id: 'sl_out_d', cat: 'basic', group: 'slideout', dir: 'd', v: '↓', name: '슬라이드 OUT 아래', desc: '끝에서 아래로 나감', mode: 'out', blur: 180, posUnit: 'frame',
      tracks: { pos: [[0, [0, 0], 'in'], [8, [0, 1.05]]] } },

    { id: 'wipe_d', cat: 'basic', group: 'cropin', dir: 'u', v: '↓', name: '크롭 IN 위→아래', desc: '위부터 드러남', mode: 'in', fx: cropIn('Bottom', 'Top') },
    { id: 'wipe_r', cat: 'basic', group: 'cropin', dir: 'l', v: '→', name: '크롭 IN 좌→우', desc: '왼쪽부터 드러남', mode: 'in', fx: cropIn('Right', 'Left') },
    { id: 'wipe_c', cat: 'basic', group: 'cropin', dir: 'c', v: '↔', name: '크롭 IN 가운데', desc: '가운데서 양옆으로 열림', mode: 'in',
      fx: [{ fx: 'crop', tracks: { Left: [[0, 50, 'out'], [12, 0]], Right: [[0, 50, 'out'], [12, 0]] }, set: { Top: 0, Bottom: 0 } }] },
    { id: 'wipe_l', cat: 'basic', group: 'cropin', dir: 'r', v: '←', name: '크롭 IN 우→좌', desc: '오른쪽부터 드러남', mode: 'in', fx: cropIn('Left', 'Right') },
    { id: 'wipe_u', cat: 'basic', group: 'cropin', dir: 'd', v: '↑', name: '크롭 IN 아래→위', desc: '아래부터 드러남', mode: 'in', fx: cropIn('Top', 'Bottom') },
    { id: 'wipeo_u', cat: 'basic', group: 'cropout', dir: 'u', v: '↑', name: '크롭 OUT 위로', desc: '끝에서 위로 닫힘', mode: 'out', fx: cropOut('Bottom', 'Top') },
    { id: 'wipeo_l', cat: 'basic', group: 'cropout', dir: 'l', v: '←', name: '크롭 OUT 왼쪽으로', desc: '끝에서 왼쪽으로 닫힘', mode: 'out', fx: cropOut('Right', 'Left') },
    { id: 'wipeo_c', cat: 'basic', group: 'cropout', dir: 'c', v: '→←', name: '크롭 OUT 가운데로', desc: '끝에서 가운데로 닫힘', mode: 'out',
      fx: [{ fx: 'crop', tracks: { Left: [[0, 0, 'in'], [10, 50]], Right: [[0, 0, 'in'], [10, 50]] }, set: { Top: 0, Bottom: 0 } }] },
    { id: 'wipeo_r', cat: 'basic', group: 'cropout', dir: 'r', v: '→', name: '크롭 OUT 오른쪽으로', desc: '끝에서 오른쪽으로 닫힘', mode: 'out', fx: cropOut('Left', 'Right') },
    { id: 'wipeo_d', cat: 'basic', group: 'cropout', dir: 'd', v: '↓', name: '크롭 OUT 아래로', desc: '끝에서 아래로 닫힘', mode: 'out', fx: cropOut('Top', 'Bottom') },

    /* ===== 디졸브 ===== */
    { id: 'd_soft_in', cat: 'dissolve', group: 'd_soft', v: 'in', name: '부드러운 디졸브 인', desc: '스르륵 나타남', mode: 'in',
      tracks: { op: [[0, 0, 'inout'], [15, 100]] } },
    { id: 'd_soft_out', cat: 'dissolve', group: 'd_soft', v: 'out', name: '부드러운 디졸브 아웃', desc: '끝에서 스르륵 사라짐', mode: 'out',
      tracks: { op: [[0, 100, 'inout'], [15, 0]] } },
    { id: 'd_blur_in', cat: 'dissolve', group: 'd_blur', v: 'in', name: '블러 디졸브 인', desc: '흐릿하게 녹아들며 나타남', mode: 'in',
      tracks: { op: [[0, 0, 'out'], [12, 100]] }, fx: [{ fx: 'gblur', tracks: { Blurriness: [[0, 40, 'out'], [15, 0]] } }] },
    { id: 'd_blur_out', cat: 'dissolve', group: 'd_blur', v: 'out', name: '블러 디졸브 아웃', desc: '흐릿하게 녹으며 사라짐', mode: 'out',
      tracks: { op: [[3, 100, 'in'], [15, 0]] }, fx: [{ fx: 'gblur', tracks: { Blurriness: [[0, 0, 'in'], [15, 40]] } }] },
    { id: 'd_zoom_in', cat: 'dissolve', group: 'd_zoom', v: 'in', name: '줌 디졸브 인', desc: '살짝 작아지며 나타남', mode: 'in',
      tracks: { op: [[0, 0, 'out'], [12, 100]], scale: [[0, 112, 'out'], [15, 100]] } },
    { id: 'd_zoom_out', cat: 'dissolve', group: 'd_zoom', v: 'out', name: '줌 디졸브 아웃', desc: '살짝 커지며 사라짐', mode: 'out',
      tracks: { op: [[3, 100, 'in'], [15, 0]], scale: [[0, 100, 'in'], [15, 112]] } },
    { id: 'd_white_in', cat: 'dissolve', group: 'd_white', v: 'in', name: '하얗게 디졸브 인', desc: '하얀 빛에서 선명해짐', mode: 'in',
      tracks: { op: [[0, 0, 'out'], [6, 100]] },
      fx: [{ fx: 'bc', tracks: { Brightness: [[0, 100, 'out'], [15, 0]] } }, { fx: 'gblur', tracks: { Blurriness: [[0, 16, 'out'], [12, 0]] } }] },
    { id: 'd_white_out', cat: 'dissolve', group: 'd_white', v: 'out', name: '하얗게 디졸브 아웃', desc: '하얗게 번쩍이며 사라짐', mode: 'out',
      tracks: { op: [[9, 100, 'in'], [15, 0]] },
      fx: [{ fx: 'bc', tracks: { Brightness: [[0, 0, 'in'], [15, 100]] } }, { fx: 'gblur', tracks: { Blurriness: [[3, 0, 'in'], [15, 16]] } }] },
    { id: 'd_black_in', cat: 'dissolve', group: 'd_black', v: 'in', name: '검게 디졸브 인', desc: '어둠에서 밝아짐', mode: 'in',
      tracks: { op: [[0, 0, 'out'], [8, 100]] }, fx: [{ fx: 'bc', tracks: { Brightness: [[0, -100, 'out'], [15, 0]] } }] },
    { id: 'd_black_out', cat: 'dissolve', group: 'd_black', v: 'out', name: '검게 디졸브 아웃', desc: '어둡게 가라앉으며 사라짐', mode: 'out',
      tracks: { op: [[7, 100, 'in'], [15, 0]] }, fx: [{ fx: 'bc', tracks: { Brightness: [[0, 0, 'in'], [15, -100]] } }] },
    { id: 'd_dir_in', cat: 'dissolve', group: 'd_dir', v: 'in', name: '방향 블러 디졸브 인', desc: '옆으로 흐르며 나타남', mode: 'in',
      tracks: { op: [[0, 0, 'out'], [10, 100]], pos: [[0, [-60, 0], 'out'], [15, [0, 0]]] },
      fx: [{ fx: 'dblur', tracks: { Length: [[0, 80, 'out'], [15, 0]] }, set: { Direction: 90 } }] },
    { id: 'd_dir_out', cat: 'dissolve', group: 'd_dir', v: 'out', name: '방향 블러 디졸브 아웃', desc: '옆으로 흐르며 사라짐', mode: 'out',
      tracks: { op: [[5, 100, 'in'], [15, 0]], pos: [[0, [0, 0], 'in'], [15, [60, 0]]] },
      fx: [{ fx: 'dblur', tracks: { Length: [[0, 0, 'in'], [15, 80]] }, set: { Direction: 90 } }] },
    { id: 'd_feather_in', cat: 'dissolve', group: 'd_feather', v: 'in →', name: '페더 와이프 인', desc: '부드러운 경계로 왼쪽부터 열림', mode: 'in',
      fx: [{ fx: 'crop', tracks: { Right: [[0, 100, 'inout'], [18, 0]] }, set: { Left: 0, Top: 0, Bottom: 0, Feather: 40 } }] },
    { id: 'd_feather_out', cat: 'dissolve', group: 'd_feather', v: 'out →', name: '페더 와이프 아웃', desc: '부드러운 경계로 오른쪽으로 닫힘', mode: 'out',
      fx: [{ fx: 'crop', tracks: { Left: [[0, 0, 'inout'], [18, 100]] }, set: { Right: 0, Top: 0, Bottom: 0, Feather: 40 } }] },
    { id: 'd_chroma_in', cat: 'dissolve', group: 'd_chroma', v: 'in', name: '색수차 디졸브 인', desc: 'RGB가 모이며 나타남', mode: 'in',
      tracks: { op: [[0, 0, 'out'], [8, 100]] }, fx: [{ fx: 'chroma', tracks: { Red: [[0, 40, 'out'], [14, 0]], Blue: [[0, 40, 'out'], [14, 0]] } }] },
    { id: 'd_chroma_out', cat: 'dissolve', group: 'd_chroma', v: 'out', name: '색수차 디졸브 아웃', desc: 'RGB가 갈라지며 사라짐', mode: 'out',
      tracks: { op: [[6, 100, 'in'], [14, 0]] }, fx: [{ fx: 'chroma', tracks: { Red: [[0, 0, 'in'], [14, 40]], Blue: [[0, 0, 'in'], [14, 40]] } }] },

    /* ===== 임팩트 ===== */
    { id: 'popup', cat: 'impact', group: 'pop', v: 'in', name: '팝업', desc: '0 → 114 → 100', mode: 'in', slamOK: true,
      tracks: { scale: [[0, 0, 'out'], [5, 114, 'inout'], [9, 97, 'inout'], [12, 100]], op: [[0, 0, 'lin'], [2, 100]] } },
    { id: 'boing', cat: 'impact', group: 'pop', v: '또잉', name: '팝 또잉', desc: '여러 번 출렁이며 등장', mode: 'in', slamOK: true,
      tracks: { scale: [[0, 0, 'out'], [3, 122, 'inout'], [6, 88, 'inout'], [9, 110, 'inout'], [12, 95, 'inout'], [15, 102, 'inout'], [17, 100]],
                op: [[0, 0, 'lin'], [1, 100]] } },
    { id: 'popout', cat: 'impact', group: 'pop', v: 'out', name: '팝 아웃', desc: '끝에서 톡 사라짐', mode: 'out',
      tracks: { scale: [[0, 100, 'out'], [3, 110, 'in'], [7, 0]], op: [[4, 100, 'lin'], [7, 0]] } },
    { id: 'chewside', cat: 'impact', group: 'chewy', v: '옆', name: '쫀득 옆으로', desc: '가로로 늘었다 착', mode: 'in',
      tracks: { sw: [[0, 145, 'out'], [5, 88, 'inout'], [9, 106, 'inout'], [12, 100]], sh: [[0, 72, 'out'], [5, 110, 'inout'], [9, 96, 'inout'], [12, 100]],
                op: [[0, 0, 'lin'], [2, 100]] } },
    { id: 'chewup', cat: 'impact', group: 'chewy', v: '위', name: '쫀득 위로', desc: '위로 쭉 늘었다 착', mode: 'in',
      tracks: { sh: [[0, 55, 'out'], [4, 150, 'inout'], [8, 90, 'inout'], [11, 104, 'inout'], [14, 100]], sw: [[0, 130, 'out'], [4, 82, 'inout'], [8, 106, 'inout'], [11, 98, 'inout'], [14, 100]],
                op: [[0, 0, 'lin'], [2, 100]] } },
    { id: 'shakein', cat: 'impact', name: '흔들리며 등장', en: 'Shake In', desc: '좌우로 덜덜 떨며 나타남', mode: 'in',
      tracks: { pos: shakeInPos, op: [[0, 0, 'lin'], [3, 100]] } },
    { id: 'thud', cat: 'impact', group: 'slam', v: '박힘', name: '쾅 박힘', desc: '크게 날아와 쿵', mode: 'in', slamOK: true, blur: 180,
      tracks: { scale: [[0, 170, 'in'], [5, 96, 'out'], [8, 100]], op: [[0, 0, 'lin'], [2, 100]] } },
    { id: 'thudshake', cat: 'impact', group: 'slam', v: '+흔들', name: '쾅 + 흔들림', desc: '박힌 뒤 화면 흔들림', mode: 'in', slamOK: true, blur: 180,
      tracks: merge({ scale: [[0, 170, 'in'], [5, 96, 'out'], [8, 100]], op: [[0, 0, 'lin'], [2, 100]] },
        { pos: [[0, [0, 0], 'lin']].concat(offsetTrack(thudShake.pos, 5)), rot: [[0, 0, 'lin']].concat(offsetTrack(thudShake.rot, 5)) }) },
    { id: 'stamp', cat: 'impact', group: 'slam', v: '도장', name: '도장 쾅', desc: '크게 찍히며 덜컹', mode: 'in', blur: 180, slamOK: true,
      tracks: { scale: [[0, 180, 'in'], [4, 92, 'out'], [7, 100]], op: [[0, 0, 'lin'], [2, 100]],
                pos: [[0, [0, 0], 'lin']].concat(offsetTrack(stampShake.pos, 4)), rot: [[0, 0, 'lin']].concat(offsetTrack(stampShake.rot, 4)) } },
    { id: 'bouncepop', cat: 'impact', group: 'bounce', v: '확대', name: '바운스 확대', desc: '커졌다 통통 복귀', mode: 'in', slamOK: true, blur: 180,
      tracks: { scale: [[0, 100, 'out'], [4, 116, 'inout'], [8, 96, 'inout'], [11, 101, 'inout'], [13, 100]] } },
    { id: 'bounceshrink', cat: 'impact', group: 'bounce', v: '축소', name: '바운스 축소', desc: '작아졌다 통통 복귀', mode: 'in', slamOK: true,
      tracks: { scale: [[0, 100, 'out'], [4, 84, 'inout'], [8, 104, 'inout'], [11, 99, 'inout'], [13, 100]] } },
    { id: 'shake', cat: 'impact', group: 'shake', v: '짧게', name: '흔들림', desc: '짧게 덜컹 · 12f', mode: 'in',
      tracks: shake(12, 22, 0, 3) },
    { id: 'shakebig', cat: 'impact', group: 'shake', v: '강하게', name: '강한 흔들림', desc: '크게 흔들리며 회전 · 20f', mode: 'in', blur: 180,
      tracks: shake(20, 42, 2.5, 11, 1.2) },
    { id: 'shock', cat: 'impact', group: 'drama', v: '1단', name: '충격 줌', desc: '확 커지며 덜컹', mode: 'in', blur: 180, slamOK: true,
      tracks: merge({ scale: [[0, 100, 'expo'], [2, 128, 'out'], [12, 120]] }, shake(12, 24, 1.5, 33, 1.3)) },
    { id: 'dramazoom', cat: 'impact', group: 'drama', v: '2단', name: '드라마 줌', desc: '2단 급확대 + 흔들림', mode: 'in', slamOK: true, blur: 180,
      tracks: merge({ scale: [[0, 100, 'expo'], [3, 122, 'lin'], [10, 122, 'expo'], [13, 140]] },
        (function () { var s = shake(10, 16, 0.6, 21, 1.5);
          return { pos: [[0, [0, 0], 'lin']].concat(offsetTrack(s.pos, 13)), rot: [[0, 0, 'lin']].concat(offsetTrack(s.rot, 13)) }; })()) },
    { id: 'chromahit', cat: 'impact', name: '색수차 펑', en: 'RGB Split', desc: 'RGB가 확 갈라졌다 모임', mode: 'in',
      tracks: { scale: [[0, 104, 'out'], [10, 100]] }, fx: [{ fx: 'chroma', tracks: { Red: [[0, 45, 'out'], [10, 0]], Blue: [[0, 45, 'out'], [10, 0]] } }] },

    /* ===== 자막 ===== */
    { id: 'rise', cat: 'text', name: '튀어오르는 자막', en: 'Jump Up', desc: '아래에서 톡 튀어올라 착', mode: 'in',
      tracks: { pos: [[0, [0, 90], 'out'], [6, [0, -12], 'inout'], [10, [0, 0]]], op: [[0, 0, 'lin'], [3, 100]] } },
    { id: 'dropbounce', cat: 'text', name: '톡 떨어짐', en: 'Drop', desc: '위에서 떨어져 통통 튐', mode: 'in',
      tracks: { pos: [[0, [0, -180], 'in'], [6, [0, 0], 'out'], [9, [0, -26], 'in'], [12, [0, 0], 'out'], [14, [0, -8], 'in'], [16, [0, 0]]],
                op: [[0, 0, 'lin'], [2, 100]] } },
    { id: 'sideslide', cat: 'text', group: 'sslide', v: '기본', name: '옆에서 쓱', desc: '왼쪽에서 미끄러져 들어옴', mode: 'in', blur: 180,
      tracks: { pos: [[0, [-160, 0], 'expo'], [10, [0, 0]]], op: [[0, 0, 'lin'], [4, 100]] } },
    { id: 'slideblur', cat: 'text', group: 'sslide', v: '블러', name: '옆에서 쓱 (블러)', desc: '잔상 남기며 옆에서 착', mode: 'in',
      tracks: { pos: [[0, [-240, 0], 'expo'], [10, [0, 0]]], op: [[0, 0, 'lin'], [3, 100]] },
      fx: [{ fx: 'dblur', tracks: { Length: [[0, 90, 'out'], [10, 0]] }, set: { Direction: 90 } }] },
    { id: 'fadeup', cat: 'text', group: 'fade', v: '업', name: '페이드 업', desc: '살짝 올라오며 나타남', mode: 'in',
      tracks: { pos: [[0, [0, 40], 'out'], [12, [0, 0]]], op: [[0, 0, 'out'], [10, 100]] } },
    { id: 'fadedown', cat: 'text', group: 'fade', v: '다운', name: '페이드 다운', desc: '끝에서 내려가며 사라짐', mode: 'out',
      tracks: { pos: [[0, [0, 0], 'in'], [10, [0, 40]]], op: [[0, 100, 'in'], [10, 0]] } },
    { id: 'rotpop', cat: 'text', name: '회전 팝', en: 'Spin Pop', desc: '돌면서 톡 튀어나옴', mode: 'in', slamOK: true,
      tracks: { rot: [[0, -18, 'back'], [10, 0]], scale: [[0, 60, 'back'], [10, 100]], op: [[0, 0, 'lin'], [3, 100]] } },
    { id: 'swing', cat: 'text', name: '흔들 등장', en: 'Swing', desc: '좌우로 흔들리며 자리잡음', mode: 'in',
      tracks: { rot: [[0, 12, 'inout'], [5, -8, 'inout'], [10, 5, 'inout'], [14, -2, 'inout'], [18, 0]], op: [[0, 0, 'lin'], [3, 100]] } },

    /* ===== 모션자막 ===== */
    { id: 'typing', cat: 'caption', group: 'typing', v: '쓰기', name: '타이핑', desc: '한 글자씩 타닥타닥', mode: 'in', typing: true, needsArea: true,
      build: function (clip, opts, ctx) { var ty = opts.typing || {}; return typingSpec(typingText(clip, ty), ctx, ty, false, clip.area); } },
    { id: 'typingerase', cat: 'caption', group: 'typing', v: '지우기', name: '타이핑 지우기', desc: '끝에서 한 글자씩 지워짐', mode: 'out', typing: true, needsArea: true,
      build: function (clip, opts, ctx) { var ty = opts.typing || {}; return typingSpec(typingText(clip, ty), ctx, ty, true, clip.area); } },
    { id: 'typingcursor', cat: 'caption', group: 'typing', v: '커서', name: '타이핑 커서', desc: '복제 트랙용 · 글자 끝을 따라가는 깜빡이 커서', mode: 'in', typing: true, needsArea: true, dup: true,
      build: function (clip, opts, ctx) { var ty = opts.typing || {}; return cursorSpec(typingText(clip, ty), ctx, ty, clip.area); } },
    { id: 'fill_up', cat: 'caption', group: 'fill', v: '직선', name: '색 차오르기 (직선)', desc: '아래에서 위로 색이 차오름 · 복제 트랙용', mode: 'in', dup: true, needsArea: true,
      build: function (clip, opts, ctx) { return fillSpec('up', opts.autoArea === false ? null : clip.area, FILL_COLORS[opts.fillColor] || FILL_COLORS.yellow, ctx); } },
    { id: 'fill_wave', cat: 'caption', group: 'fill', v: '곡선', name: '색 차오르기 (곡선)', desc: '물결치며 색이 차오름 · 복제 트랙용', mode: 'in', dup: true, needsArea: true,
      build: function (clip, opts, ctx) { return fillSpec('wave', opts.autoArea === false ? null : clip.area, FILL_COLORS[opts.fillColor] || FILL_COLORS.yellow, ctx); } },
    { id: 'fill_lr', cat: 'caption', group: 'fill', v: '왼→오', name: '색 차오르기 (왼→오)', desc: '왼쪽에서 오른쪽으로 색이 참 · 복제 트랙용', mode: 'in', dup: true, needsArea: true,
      build: function (clip, opts, ctx) { return fillSpec('lr', opts.autoArea === false ? null : clip.area, FILL_COLORS[opts.fillColor] || FILL_COLORS.yellow, ctx); } },
    { id: 'fill_down', cat: 'caption', group: 'fill', v: '위→아래', name: '색 차오르기 (위→아래)', desc: '위에서 아래로 색이 내려옴 · 복제 트랙용', mode: 'in', dup: true, needsArea: true,
      build: function (clip, opts, ctx) { return fillSpec('down', opts.autoArea === false ? null : clip.area, FILL_COLORS[opts.fillColor] || FILL_COLORS.yellow, ctx); } },
    { id: 'blurin', cat: 'caption', group: 'blur', v: 'in', name: '블러 인', desc: '흐릿하게 나타나며 선명', mode: 'in',
      tracks: { op: [[0, 0, 'out'], [8, 100]], scale: [[0, 106, 'out'], [12, 100]] },
      fx: [{ fx: 'gblur', tracks: { Blurriness: [[0, 36, 'out'], [12, 0]] } }] },
    { id: 'blurout', cat: 'caption', group: 'blur', v: 'out', name: '블러 아웃', desc: '끝에서 흐려지며 사라짐', mode: 'out',
      tracks: { op: [[2, 100, 'in'], [10, 0]], scale: [[0, 100, 'in'], [10, 106]] },
      fx: [{ fx: 'gblur', tracks: { Blurriness: [[0, 0, 'in'], [10, 36]] } }] },
    { id: 'widein', cat: 'caption', name: '와이드 인', en: 'Wide In', desc: '가로로 넓게 퍼졌다 모임', mode: 'in',
      tracks: { sw: [[0, 150, 'expo'], [12, 100]], sh: [[0, 100, 'lin'], [12, 100]], op: [[0, 0, 'out'], [8, 100]] },
      fx: [{ fx: 'gblur', tracks: { Blurriness: [[0, 10, 'out'], [10, 0]] } }] },
    { id: 'flicker', cat: 'caption', name: '깜빡 등장', en: 'Flicker', desc: '형광등처럼 깜빡이며 켜짐', mode: 'in',
      tracks: { op: [[0, 0, 'hold'], [1, 100, 'hold'], [2, 0, 'hold'], [4, 100, 'hold'], [5, 20, 'hold'], [6, 100, 'hold'], [8, 40, 'hold'], [9, 100]] } },

    /* ===== 예능 · 지속 (클립 끝까지) ===== */
    { id: 'wave', cat: 'fun', sub: '지속', name: '울렁울렁', en: 'Wave', desc: '물결처럼 울렁 · 클립 끝까지', mode: 'span',
      pre: { 'wwarp.Height': 0 },
      fx: [{ fx: 'wwarp', tracks: { Height: [[0, 10, 'lin'], [1, 10]] }, set: { Type: 1, Width: 90, Direction: 90, Speed: 1.2, Phase: 0 } }] },
    { id: 'jitter', cat: 'fun', sub: '지속', name: '찌글', en: 'Jitter', desc: '지글지글 손그림 느낌', mode: 'loop', period: 6,
      pre: { 'turb.Amount': 0 },
      fx: [{ fx: 'turb', tracks: { Amount: [[0, 22, 'lin'], [6, 22]], Evolution: [[0, 0, 'hold'], [2, 130, 'hold'], [4, 250, 'hold'], [6, 0]] },
             set: { Size: 7, Complexity: 1 } }] },
    { id: 'tremble', cat: 'fun', sub: '지속', name: '동공지진', en: 'Eye Quake', desc: '클립 끝까지 잘게 덜덜', mode: 'loop', period: 12,
      tracks: { pos: jitterLoop(12, 6, 5) } },
    { id: 'float', cat: 'fun', sub: '지속', name: '둥실둥실', en: 'Float', desc: '2초 주기로 떠다님', mode: 'loop', period: 60,
      tracks: { pos: [[0, [0, 0], 'inout'], [30, [0, -14], 'inout'], [60, [0, 0]]],
                rot: [[0, -1, 'inout'], [30, 1, 'inout'], [60, -1]] } },
    { id: 'rainbow', cat: 'fun', sub: '지속', name: '무지개', en: 'Rainbow', desc: '색이 무지개로 빠르게 바뀜', mode: 'rate',
      pre: { 'proc.Hue': 0, 'proc.Saturation': 100 },
      fx: [{ fx: 'proc', tracks: { Hue: { from: 0, rate: 540, wrap: true }, Saturation: { from: 140, rate: 0 } } }] },
    { id: 'flow_rl', cat: 'fun', sub: '지속', group: 'flow', v: '우→좌', name: '귓등으로 듣는 (우→좌)', desc: '오른쪽에서 왼쪽으로 흘러감', mode: 'span', posUnit: 'frame',
      tracks: { pos: [[0, [1.05, 0], 'lin'], [1, [-1.05, 0]]] } },
    { id: 'flow_lr', cat: 'fun', sub: '지속', group: 'flow', v: '좌→우', name: '귓등으로 듣는 (좌→우)', desc: '왼쪽에서 오른쪽으로 흘러감', mode: 'span', posUnit: 'frame',
      tracks: { pos: [[0, [-1.05, 0], 'lin'], [1, [1.05, 0]]] } },
    { id: 'posterize', cat: 'fun', sub: '지속', name: '뚝뚝 끊기는 프레임', en: 'Posterize Time', desc: '초당 8장처럼 끊김 · 클립 끝까지', mode: 'span',
      pre: { 'post.Rate': 60 }, fx: [{ fx: 'post', tracks: { Rate: [[0, 8, 'lin'], [1, 8]] } }] },
    { id: 'glowback', cat: 'fun', sub: '지속', name: '뒤에서 빛 반짝', en: 'Back Glow', desc: '원본 아래 트랙의 복제 클립용 · 뒤에서 빛이 반짝반짝', mode: 'loop', period: 24, dup: 'below',
      tracks: { op: [[0, 35, 'inout'], [12, 100, 'inout'], [24, 35]] },
      fx: [{ fx: 'tint', set: { Black: { color: [255, 255, 246, 200] }, White: { color: [255, 255, 246, 200] }, Amount: 100 } },
           { fx: 'gblur', set: { Blurriness: 28 } }, { fx: 'bc', set: { Brightness: 35 } }] },

    /* ===== 예능 · 순간 ===== */
    { id: 'soulout', cat: 'fun', sub: '순간', name: '영혼 가출', en: 'Soul Out', desc: '흐물흐물 위로 빠져나감 · 복제 트랙용', mode: 'in', dup: true,
      tracks: { scale: [[0, 100, 'out'], [24, 112]], pos: [[0, [0, 0], 'out'], [24, [0, -160]]], op: [[0, 65, 'in'], [24, 0]] },
      fx: [{ fx: 'gblur', tracks: { Blurriness: [[0, 0, 'lin'], [24, 8]] } }] },
    { id: 'heartghost', cat: 'fun', sub: '순간', name: '심쿵 잔상', en: 'Heart Ghost', desc: '커지며 사라지는 잔상 · 복제 트랙용', mode: 'in', dup: true, blur: 360,
      tracks: { scale: [[0, 100, 'out'], [10, 138]], op: [[0, 70, 'in'], [10, 0]] } },
    { id: 'glow', cat: 'fun', sub: '순간', group: 'glow', v: '기본', name: '빛나며 등장', desc: '번쩍 밝았다 선명해짐', mode: 'in',
      tracks: { op: [[0, 0, 'out'], [5, 100]] },
      fx: [{ fx: 'bc', tracks: { Brightness: [[0, 80, 'out'], [10, 0]] } }, { fx: 'gblur', tracks: { Blurriness: [[0, 14, 'out'], [8, 0]] } }] },
    { id: 'glow_lr', cat: 'fun', sub: '순간', group: 'glow', v: '좌→우', name: '빛나며 등장 (좌→우)', desc: '왼쪽에서 빛나며 들어옴', mode: 'in',
      tracks: { op: [[0, 0, 'out'], [5, 100]], pos: [[0, [-70, 0], 'out'], [10, [0, 0]]] },
      fx: [{ fx: 'bc', tracks: { Brightness: [[0, 80, 'out'], [10, 0]] } }, { fx: 'gblur', tracks: { Blurriness: [[0, 14, 'out'], [8, 0]] } }] },
    { id: 'glow_rl', cat: 'fun', sub: '순간', group: 'glow', v: '우→좌', name: '빛나며 등장 (우→좌)', desc: '오른쪽에서 빛나며 들어옴', mode: 'in',
      tracks: { op: [[0, 0, 'out'], [5, 100]], pos: [[0, [70, 0], 'out'], [10, [0, 0]]] },
      fx: [{ fx: 'bc', tracks: { Brightness: [[0, 80, 'out'], [10, 0]] } }, { fx: 'gblur', tracks: { Blurriness: [[0, 14, 'out'], [8, 0]] } }] },
    { id: 'blink1', cat: 'fun', sub: '순간', group: 'blink', v: '1번', name: '깜빡 1번', desc: '한 번 점멸', mode: 'in', tracks: { op: blinks(1) } },
    { id: 'blink2', cat: 'fun', sub: '순간', group: 'blink', v: '2번', name: '깜빡 2번', desc: '두 번 점멸', mode: 'in', tracks: { op: blinks(2) } },
    { id: 'blink', cat: 'fun', sub: '순간', group: 'blink', v: '3번', name: '깜빡 3번', desc: '세 번 점멸', mode: 'in', tracks: { op: blinks(3) } },
    { id: 'pulse', cat: 'fun', sub: '순간', group: 'heart', v: '1번', name: '두근', desc: '살짝 커졌다 복귀', mode: 'in',
      tracks: { scale: [[0, 100, 'out'], [3, 108, 'inout'], [10, 100]] } },
    { id: 'heartbeat', cat: 'fun', sub: '순간', group: 'heart', v: '2번', name: '두근두근', desc: '두 번 콩닥 커졌다 복귀', mode: 'in',
      tracks: { scale: [[0, 100, 'out'], [3, 108, 'inout'], [6, 100, 'out'], [9, 111, 'inout'], [15, 100]] } },
    { id: 'tilt', cat: 'fun', sub: '순간', group: 'tilt', v: '유지', name: '갸우뚱', desc: '7° 기울고 유지', mode: 'in',
      tracks: { rot: [[0, 0, 'back'], [7, -7]] } },
    { id: 'tiltback', cat: 'fun', sub: '순간', group: 'tilt', v: '복귀', name: '갸우뚱 복귀', desc: '기울었다 돌아옴', mode: 'in',
      tracks: { rot: [[0, 0, 'back'], [7, -7, 'hold'], [18, -7, 'inout'], [25, 0]] } },
    { id: 'despair', cat: 'fun', sub: '순간', name: '좌절', en: 'Despair', desc: '위에서 쿵 떨어져 찌그러짐', mode: 'in', blur: 180, posUnit: 'frame',
      tracks: { pos: [[0, [0, -1.05], 'in'], [5, [0, 0], 'out'], [7, [0, -0.012], 'in'], [9, [0, 0]]],
                sh: [[0, 100, 'lin'], [5, 100, 'out'], [6, 76, 'inout'], [9, 106, 'inout'], [12, 100]],
                sw: [[0, 100, 'lin'], [5, 100, 'out'], [6, 118, 'inout'], [9, 96, 'inout'], [12, 100]] } },
    { id: 'rage', cat: 'fun', sub: '순간', name: '버럭', en: 'Rage', desc: '강한 흔들림 + 빨간 화면', mode: 'in', blur: 180,
      tracks: rageShake,
      fx: [{ fx: 'tint', tracks: { Amount: [[0, 0, 'out'], [2, 60, 'hold'], [9, 60, 'in'], [18, 0]] }, set: { White: { color: [255, 255, 50, 40] } } }] },
  ];

  var DEFAULT_FAVS = ['punch', 'snapin', 'sl_in_l', 'shake', 'popup', 'typing', 'blurin', 'stamp'];
  var SIZE = [0.6, 0.8, 1, 1.3, 1.6];        // 강도 1~5
  var SPEED = [1.5, 1.25, 1, 0.8, 0.65];     // 속도 1~5 (길이 배율, 작을수록 빠름)

  /* 추가 효과의 속성 번호 (프리미어 효과 컨트롤 순서) */
  var FXP = {
    crop:  { Left: 0, Top: 1, Right: 2, Bottom: 3, Feather: 5 },
    gblur: { Blurriness: 0 },
    turb:  { Amount: 1, Size: 2, Complexity: 4, Evolution: 5 },
    dblur: { Direction: 0, Length: 1 },
    wwarp: { Type: 0, Height: 1, Width: 2, Direction: 3, Speed: 4, Phase: 6 },
    tint:  { Black: 0, White: 1, Amount: 2 },
    bc:    { Brightness: 0, Contrast: 1 },
    proc:  { Brightness: 0, Contrast: 1, Hue: 2, Saturation: 3 },
    chroma: { Red: 1, Green: 2, Blue: 3 },
    post:  { Rate: 0 },
    ramp:  { StartColor: 1, EndColor: 3, Blend: 6 },
    tmk:   { Matte: 0, Composite: 1, Reverse: 2 }
  };
  var FX_SCALED = { 'gblur.Blurriness': 1, 'turb.Amount': 1, 'dblur.Length': 1, 'wwarp.Height': 1, 'bc.Brightness': 2, 'tint.Amount': 1, 'chroma.Red': 1, 'chroma.Blue': 1 };   // 강도에 비례 (1 = 0 이상, 2 = 음수 허용)

  function getPreset(id) { for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i]; return null; }

  /* ---------------- 키 계산 ---------------- */
  function lerp(a, b, t) {
    if (Array.isArray(a)) return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    return a + (b - a) * t;
  }
  function round(v, d) {
    var m = Math.pow(10, d);
    if (Array.isArray(v)) return [Math.round(v[0] * m) / m, Math.round(v[1] * m) / m];
    return Math.round(v * m) / m;
  }

  /* 트랙 하나 → [[프레임(실수), 값]] (이징 구간은 1프레임마다 굽기) */
  function bakeTrack(track, tm, vf) {
    var out = [];
    for (var i = 0; i < track.length; i++) {
      var k = track[i], f0 = k[0] * tm, v0 = vf(k[1]), e = k[2] || 'lin';
      out.push(e === 'hold' && i < track.length - 1 ? [f0, v0, 1] : [f0, v0]);
      if (i === track.length - 1) break;
      var n = track[i + 1], f1 = n[0] * tm, v1 = vf(n[1]);
      var span = f1 - f0;
      if (e === 'hold') { if (span > 1.5) out.push([f1 - 1, v0, 1]); continue; }
      if (e === 'lin') continue;
      var fn = easeFn(e);
      for (var s = 1; s < span - 0.5; s++) out.push([f0 + s, lerp(v0, v1, fn(s / span))]);
    }
    return out;
  }

  /* 정수 프레임으로 맞추고 같은 프레임은 마지막 값만 */
  function settle(keys) {
    var out = [];
    for (var i = 0; i < keys.length; i++) {
      var f = Math.round(keys[i][0]), k = keys[i][2] ? [f, keys[i][1], 1] : [f, keys[i][1]];
      if (out.length && out[out.length - 1][0] === f) out[out.length - 1] = k;
      else out.push(k);
    }
    return out;
  }

  function valueFn(prop, spec, k, ctx) {
    if (prop === 'scale' || prop === 'sw' || prop === 'sh') {
      return function (v) { return v === 0 ? 0 : Math.max(0, 100 + (v - 100) * k); };
    }
    if (prop === 'rot') return function (v) { return v * k; };
    if (prop === 'op') return function (v) { return v; };
    if (prop === 'pos') {
      if (spec.posUnit === 'frame') return function (v) { return [v[0], v[1]]; };
      var px = Math.min(ctx.w, ctx.h) / 1080;
      return function (v) { return [v[0] * k * px / ctx.w, v[1] * k * px / ctx.h]; };
    }
    return function (v) { return v; };
  }
  function fxValueFn(fx, name, k) {
    var sc = FX_SCALED[fx + '.' + name];
    if (sc === 2) return function (v) { return Math.max(-100, Math.min(100, v * k)); };
    if (sc) return function (v) { return Math.max(0, v * k); };
    return function (v) { return v; };
  }

  function lastFrameOf(spec) {
    var m = 0, p;
    function scan(tracks) { for (p in tracks) { var t = tracks[p]; if (t.length) m = Math.max(m, t[t.length - 1][0]); } }
    scan(spec.tracks || {});
    (spec.fx || []).forEach(function (e) { scan(e.tracks || {}); });
    return m;
  }

  /* 트랙 → 클립 기준 정수 프레임 키 */
  function placeTrack(track, vf, mode, base, tm, last, period, digits, loopEnd) {
    var keys;
    if (mode === 'loop') {
      var P = period * tm, avail = (loopEnd == null ? last : loopEnd) - base, reps = Math.ceil(avail / P) + 1;
      var one = bakeTrack(track, tm, vf);
      keys = [];
      for (var r = 0; r < reps; r++) {
        for (var j = 0; j < one.length; j++) {
          if (r > 0 && j === 0) continue;
          var f = one[j][0] + r * P;
          if (f > avail + 0.5) break;
          keys.push(one[j][2] ? [f, one[j][1], 1] : [f, one[j][1]]);
        }
      }
    } else {
      keys = bakeTrack(track, tm, vf);
    }
    keys = keys.map(function (kk) { return kk[2] ? [kk[0] + base, kk[1], 1] : [kk[0] + base, kk[1]]; })
               .filter(function (kk) { return kk[0] > -0.5 && kk[0] < last + 0.5; });
    keys = settle(keys).map(function (kk) { return kk[2] ? [kk[0], round(kk[1], digits), 1] : [kk[0], round(kk[1], digits)]; });
    if (keys.length) keys[keys.length - 1] = keys[keys.length - 1].slice(0, 2);   // 마지막 키는 홀드 불필요
    if (!keys.length) return null;
    return keys.length === 1 ? { value: keys[0][1] } : { keys: keys };
  }

  /* 일정 속도 트랙 { from | to, rate(초당), wrap(각도 -180~180 반복) } */
  function placeRate(o, base, endF, fps, digits) {
    if (Array.isArray(o)) return null;
    var secs = Math.max(0, (endF - base) / fps), keys = [];
    if (o.wrap) {
      var step = endF - base > 600 ? 2 : 1;
      for (var f = base; f <= endF; f += step) {
        var v = (((o.from || 0) + o.rate * (f - base) / fps) % 360 + 540) % 360 - 180;
        keys.push([f, round(v, 2), 1]);
      }
      keys[keys.length - 1] = keys[keys.length - 1].slice(0, 2);
    } else {
      var v0 = o.from !== undefined ? o.from : o.to - o.rate * secs;
      keys = [[base, round(v0, digits)], [endF, round(v0 + o.rate * secs, digits)]];
    }
    return keys.length > 1 ? { keys: keys } : { value: keys[0][1] };
  }
  /* 시작점 앞은 원래 값(pre)으로: 클립 중간부터 시작하는 지속 효과용 */
  function withPre(en, pv) {
    if (!en || pv === undefined) return en;
    if (en.keys) {
      if (en.keys[0][0] >= 1) en.keys.unshift([en.keys[0][0] - 1, pv]);
      return en;
    }
    return en;
  }

  /*
   * ctx  : { fps, tpf, w, h, ph, clips:[{t,c,id,name,start,end,inPoint,speed}] }  (시간 = ticks)
   * opts : { size:1~5, speed:1~5, anchor:'playhead'|'start', blur:bool, typing:{text,fpc,width,center} }
   * 반환 : 클립별 { t, c, shutter, uniform, props:{ prop: {keys}|{value} }, fx:[{ fx, params:[{ i, keys|value }] }] }
   *        frame 은 "클립 시작 기준 시퀀스 프레임"
   */
  function buildPlan(preset, opts, ctx) {
    var k = SIZE[(opts.size || 3) - 1], d = SPEED[(opts.speed || 3) - 1];
    var fpsK = ctx.fps / 30;
    var plans = [];
    for (var ci = 0; ci < ctx.clips.length; ci++) {
      var clip = ctx.clips[ci];
      var spec = preset.build ? merge(preset, preset.build(clip, opts, ctx)) : preset;
      /* 프레임 밖에서 꽂기 */
      if (opts.outside && spec.slamOK) spec = outsideSpec(spec);
      /* 천천히 줌 '일정 속도' 옵션: 클립 길이와 상관없이 초당 n% */
      if (spec.zoomRate && opts.zoomRate > 0) {
        spec = merge(spec, { mode: 'rate', tracks: { scale: spec.zoomRate > 0 ? { from: 100, rate: opts.zoomRate } : { to: 100, rate: -opts.zoomRate } } });
      }
      var nFrames = Math.max(1, Math.round((clip.end - clip.start) / ctx.tpf));
      var last = nFrames - 1;
      var anchor = 0;
      if (opts.anchor === 'playhead' && ctx.ph >= clip.start && ctx.ph < clip.end) {
        anchor = Math.round((ctx.ph - clip.start) / ctx.tpf);
      }
      var mode = spec.mode, tm, base, L = lastFrameOf(spec), loopEnd = null;
      /* 지속 시간: opts.dur(초)이 있으면 그 길이에 맞춰 늘이고 줄인다. 없으면 프리셋 기본 길이 × 속도 */
      var durF = opts.dur > 0 ? opts.dur * ctx.fps : 0;
      var stretch = durF && L > 0 ? durF / L : d * fpsK;
      /* 타이핑은 "글자당 프레임"이 속도를 정함 (전체 길이/속도 설정으로 다시 줄이거나 늘이지 않음) */
      if (spec.typing) stretch = fpsK;
      var rateEnd = last;
      if (mode === 'rate') {
        base = anchor; tm = 1; rateEnd = durF ? Math.min(last, Math.round(base + durF)) : last;
      } else if (mode === 'span') {
        base = anchor; tm = Math.max(1, durF ? Math.min(durF, last - anchor) : last - anchor);
      } else if (mode === 'out') {
        tm = stretch;
        if (L * tm > last) tm = last / Math.max(L, 1);
        base = last - L * tm;
      } else {                       // in, loop
        tm = mode === 'loop' ? d * fpsK : stretch; base = anchor;
        if (mode === 'loop' && durF) {
          var P0 = (spec.period || L) * tm;
          loopEnd = Math.min(last, base + Math.max(1, Math.round(durF / P0)) * P0);
        }
        if (mode === 'in' && base + L * tm > last) {
          if (L * tm > last) { base = 0; tm = last / Math.max(L, 1); }
          else base = last - L * tm;   // 끝에 걸리면 앞으로 당김
        }
      }
      var period = spec.period || L;

      var pre = spec.pre || {};
      function place(track, vf, digits, preKey) {
        var en = mode === 'rate' ? placeRate(track, base, rateEnd, ctx.fps, digits)
                                 : placeTrack(track, vf, mode, base, tm, last, period, digits, loopEnd);
        return withPre(en, pre[preKey]);
      }
      var props = {}, prop;
      for (prop in (spec.tracks || {})) {
        var ent = place(spec.tracks[prop], valueFn(prop, spec, k, ctx), prop === 'pos' ? 5 : 3, prop);
        if (ent) props[prop] = ent;
      }
      var fx = (spec.fx || []).map(function (e) {
        var params = [], name, map = FXP[e.fx];
        for (name in (e.set || {})) params.push({ i: map[name], n: name, value: e.set[name] });
        for (name in (e.tracks || {})) {
          var en = place(e.tracks[name], fxValueFn(e.fx, name, k), 3, e.fx + '.' + name);
          if (en) { en.i = map[name]; en.n = name; params.push(en); }
        }
        var fo = { fx: e.fx, params: params };
        if (e.fxOnly) fo.fxOnly = true;
        return fo;
      });
      var tr = spec.tracks || {};
      plans.push({
        t: clip.t, c: clip.c, id: clip.id,
        shutter: opts.blur && spec.blur ? spec.blur : 0,
        uniform: !(tr.sw || tr.sh),
        pivot: opts.pivot && opts.pivot.length === 2 ? [opts.pivot[0], opts.pivot[1]] : [0.5, 0.5],
        below: spec.below || '',
        props: props,
        fx: fx
      });
    }
    return plans;
  }

  /* ---------------- 지속 시간 ---------------- */
  /* 카드에 보여줄 길이(초). null = 클립 끝까지 */
  function durationOf(preset, opts, text) {
    if (opts.dur > 0 && !preset.typing) return opts.dur;
    if (preset.mode === 'span' || preset.mode === 'loop' || preset.mode === 'rate') return null;
    if (preset.zoomRate && opts.zoomRate > 0) return null;
    var spec = preset.build ? merge(preset, preset.build({ name: text || PREVIEW_TEXT }, opts, { w: 1920, h: 1080 })) : preset;
    return lastFrameOf(spec) * (preset.typing ? 1 : SPEED[(opts.speed || 3) - 1]) / 30;
  }
  /* 슬라이더 위치(0~1000) ↔ 초 (0.1초~5초, 짧은 쪽을 넓게) */
  var DMIN = 0.1, DMAX = 5;
  function posToSec(p) { return Math.round(DMIN * Math.pow(DMAX / DMIN, p / 1000) * 100) / 100; }
  function secToPos(s) { return Math.round(1000 * Math.log(Math.max(DMIN, Math.min(DMAX, s)) / DMIN) / Math.log(DMAX / DMIN)); }

  /* ---------------- 미리보기 ---------------- */
  function valueAt(entry, f, neutral) {
    if (!entry) return neutral;
    if (entry.value !== undefined) return entry.value;
    var ks = entry.keys;
    if (f <= ks[0][0]) return ks[0][1];
    for (var i = 1; i < ks.length; i++) {
      if (f <= ks[i][0]) {
        var a = ks[i - 1], b = ks[i];
        return lerp(a[1], b[1], (f - a[0]) / (b[0] - a[0]));
      }
    }
    return ks[ks.length - 1][1];
  }
  function fxParam(plan, fx, i) {
    for (var a = 0; a < plan.fx.length; a++) if (plan.fx[a].fx === fx)
      for (var b = 0; b < plan.fx[a].params.length; b++) if (plan.fx[a].params[b].i === i) return plan.fx[a].params[b];
    return null;
  }
  var PREVIEW_TEXT = '모먼트 모션킷';
  /* 가상 1920x1080 / 30fps 클립에 적용했을 때 프레임별 상태 */
  function preview(preset, opts) {
    var spec = preset.build ? merge(preset, preset.build({ name: PREVIEW_TEXT }, merge(opts, { typing: merge(opts.typing || {}, { text: PREVIEW_TEXT }) }), { w: 1920, h: 1080 })) : preset;
    var L = lastFrameOf(spec), d = SPEED[(opts.speed || 3) - 1];
    var lead = spec.mode === 'out' ? 8 : 6;
    var D = opts.dur > 0 ? opts.dur * 30 : 0;
    var n = spec.mode === 'span' || spec.mode === 'loop' || spec.mode === 'rate' ? (D ? Math.round(D) + lead + 10 : 72) : Math.round(D || L * d) + lead + 14;
    var tpf = 1000, ctx = { fps: 30, tpf: tpf, w: 1920, h: 1080, ph: lead * tpf,
      clips: [{ t: 0, c: 0, name: PREVIEW_TEXT, start: 0, end: n * tpf, inPoint: 0, speed: 1 }] };
    var o2 = merge(opts, { anchor: 'playhead', blur: false, typing: merge(opts.typing || {}, { text: PREVIEW_TEXT }) });
    var plan = buildPlan(preset, o2, ctx)[0];
    var p = plan.props, frames = [];
    var cl = fxParam(plan, 'crop', 0), ct = fxParam(plan, 'crop', 1), cr = fxParam(plan, 'crop', 2), cb = fxParam(plan, 'crop', 3);
    var gb = fxParam(plan, 'gblur', 0), db = fxParam(plan, 'dblur', 1), tb = fxParam(plan, 'wwarp', 1) || fxParam(plan, 'turb', 1);
    var tn = fxParam(plan, 'tint', 2) || (fxParam(plan, 'ramp', 1) ? { value: 100 } : null), br = fxParam(plan, 'bc', 0), hu = fxParam(plan, 'proc', 2), sa = fxParam(plan, 'proc', 3);
    for (var f = 0; f < n; f++) {
      var s = valueAt(p.scale, f, 100);
      frames.push({
        pos: valueAt(p.pos, f, [0, 0]),
        sw: plan.uniform ? s : valueAt(p.sw, f, 100),
        sh: plan.uniform ? s : valueAt(p.sh, f, 100),
        rot: valueAt(p.rot, f, 0),
        op: valueAt(p.op, f, 100),
        crop: [valueAt(cl, f, 0), valueAt(ct, f, 0), valueAt(cr, f, 0), valueAt(cb, f, 0)],
        blur: valueAt(gb, f, 0), dblur: valueAt(db, f, 0), turb: valueAt(tb, f, 0),
        tint: valueAt(tn, f, 0), bright: valueAt(br, f, 0), hue: valueAt(hu, f, 0), sat: valueAt(sa, f, 100)
      });
    }
    return { frames: frames, text: !!preset.typing && PREVIEW_TEXT };
  }

  /* ---------------- 커브 탭: 기존 키프레임 사이를 커브로 채우기 ----------------
   * read : host 의 mk_readKeys() 결과
   *   { tpf, clips:[{ id, t, c, speed, params:[{ ci, pi, kind, keys:[[ticks, value]] }] }] }
   * kinds: { pos:true, scale:true, rot:true, op:true, other:false }
   * snaps: 원래 키프레임 저장소 (패널 메모리) — 같은 객체를 계속 넘겨야 복원/교체가 된다
   * 반환 : [{ t, c, ci, pi, remove:[ticks], set:[[ticks, value]] }]
   */
  function sameTick(a, b, tol) { return Math.abs(a - b) <= tol; }
  function hasAll(cur, orig, tol) {
    for (var i = 0; i < orig.length; i++) {
      var ok = false;
      for (var j = 0; j < cur.length; j++) if (sameTick(cur[j][0], orig[i][0], tol)) { ok = true; break; }
      if (!ok) return false;
    }
    return true;
  }
  function numeric(v) {
    if (typeof v === 'number') return isFinite(v);
    return Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
  }
  function eqVal(a, b) {
    if (Array.isArray(a)) return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
    return Math.abs(a - b) < 1e-9;
  }
  function originals(clip, prm, snaps, tol) {
    var key = clip.id + '|' + prm.ci + '|' + prm.pi;
    var s = snaps[key];
    if (!s || !hasAll(prm.keys, s, tol)) {
      s = prm.keys.map(function (k) { return [k[0], k[1]]; });
      snaps[key] = s;
    }
    return s;
  }
  function removals(cur, orig, tol) {
    var out = [];
    for (var i = 0; i < cur.length; i++) {
      var keep = false;
      for (var j = 0; j < orig.length; j++) if (sameTick(cur[i][0], orig[j][0], tol)) { keep = true; break; }
      if (!keep) out.push(cur[i][0]);
    }
    return out;
  }

  /* scope: 'all' = 모든 구간 / 'playhead' = 재생헤드가 있는 구간만 */
  /* pick: { 'clipId|ci|pi': [구간 번호...] } — 있으면 그 구간만 (Super Pad 의 "All 끄기") */
  function bakeCurve(read, curve, stepFrames, kinds, snaps, scope, pick) {
    var fn = easeFn(curve), writes = [], tol = read.tpf / 4, lin = isLinear(curve);
    read.clips.forEach(function (clip) {
      var step = read.tpf * (clip.speed || 1) * (stepFrames || 1);
      clip.params.forEach(function (prm) {
        var pk = pick ? pick[clip.id + '|' + prm.ci + '|' + prm.pi] : null;
        if (pick && !pk) return;
        if (!pick && kinds && !kinds[prm.kind]) return;
        if (prm.keys.length < 2 || !numeric(prm.keys[0][1])) return;
        var orig = originals(clip, prm, snaps, tol);
        if (orig.length < 2) return;
        var set = [], segs = [];
        for (var i = 0; i < orig.length; i++) {
          set.push([orig[i][0], orig[i][1]]);
          if (i === orig.length - 1) break;
          var a = orig[i], b = orig[i + 1], len = b[0] - a[0];
          if (pk && pk.indexOf(i) < 0) continue;
          if (!pk && scope === 'playhead' && !(clip.ph >= a[0] && clip.ph < b[0])) continue;
          segs.push([a[0], b[0]]);
          if (lin || eqVal(a[1], b[1]) || len < step * 1.5) continue;
          for (var tk = a[0] + step; tk < b[0] - step * 0.5; tk += step) {
            set.push([Math.round(tk), round(lerp(a[1], b[1], fn((tk - a[0]) / len)), 6)]);
          }
        }
        if (!segs.length) return;
        var rem = removals(prm.keys, orig, tol);
        if (scope === 'playhead' || pk) rem = rem.filter(function (t) {
          return segs.some(function (g) { return t > g[0] && t < g[1]; });
        });
        writes.push({ t: clip.t, c: clip.c, ci: prm.ci, pi: prm.pi, remove: rem, set: set });
      });
    });
    return writes;
  }

  function restoreCurve(read, snaps) {
    var writes = [], tol = read.tpf / 4;
    read.clips.forEach(function (clip) {
      clip.params.forEach(function (prm) {
        var s = snaps[clip.id + '|' + prm.ci + '|' + prm.pi];
        if (!s || !hasAll(prm.keys, s, tol)) return;
        writes.push({ t: clip.t, c: clip.c, ci: prm.ci, pi: prm.pi,
          remove: removals(prm.keys, s, tol), set: s.map(function (k) { return [k[0], k[1]]; }) });
      });
    });
    return writes;
  }

  /* ---------------- 영문 표시 (언어 버튼 English) ---------------- */
  var EN = {
    CAT: { basic: 'Basic', dissolve: 'Dissolve', impact: 'Impact', text: 'Caption', caption: 'Motion text', fun: 'Fun' },
    CAT_DESC: { basic: 'Basic moves that fit any footage', impact: 'Punchy · short and strong', text: 'Moves that suit captions',
      caption: 'Motion captions: typing, blur, wipes', fun: 'Situations · emotions', dissolve: 'Fades and transitions' },
    SUB: { '지속': 'Ongoing', '순간': 'Moment' },
    V: { '1단': '1-step', '2단': '2-step', '블러 in': 'blur in', '또잉': 'boing', '옆': 'side', '위': 'up', '박힘': 'hit', '+흔들': '+shake',
      '도장': 'stamp', '확대': 'grow', '축소': 'shrink', '짧게': 'short', '강하게': 'strong', '기본': 'normal', '블러': 'blur', '업': 'up',
      '다운': 'down', '쓰기': 'type', '지우기': 'erase', '커서': 'cursor', '직선': 'straight', '곡선': 'wave', '왼→오': 'L→R', '위→아래': 'top→bottom',
      '우→좌': 'R→L', '좌→우': 'L→R', '1번': '1x', '2번': '2x', '3번': '3x', '유지': 'hold', '복귀': 'return' },
    G: { zoom: 'Slowly to clip end', quick: 'A sudden pull', punch: 'Pops in and holds', whip: 'Flies in and out big (blur option)',
      sslide: 'Slides in from the side', drama: 'Sudden zoom + jolt', d_soft: 'Fades in and out softly', d_blur: 'Melts through blur',
      d_zoom: 'Melts with a slight zoom', d_white: 'Transitions with a white flash', d_black: 'Transitions through black',
      d_dir: 'Melts flowing sideways', d_feather: 'Wipe with a soft edge', d_chroma: 'RGB splits and rejoins',
      fill: 'Color fills the text · duplicate track', slidein: 'Comes in from off-screen', slideout: 'Leaves off-screen at the end',
      cropin: 'Opens while cropped', cropout: 'Closes at the end', pop: 'Pops out and back in', chewy: 'Stretches, then snaps',
      slam: 'Flies in big and hits', bounce: 'Bounces back', shake: 'Jolting shake', fade: 'Appears/disappears with slight motion',
      typing: 'Typed and erased one character at a time', blur: 'Blurry ↔ sharp', flow: 'Flows across the screen',
      glow: 'Flashes bright, then sharp', blink: 'Blinks', heart: 'Thumps bigger and back', tilt: 'Tilts' },
    P: {
      slowin: ['Slow Zoom In', 'Slowly zooms in to clip end'], slowout: ['Slow Zoom Out', 'Slowly zooms out to clip end'],
      snapin: ['Snap Zoom In', '100→118 · 6f'], snapout: ['Snap Zoom Out', '118→100 · 6f'],
      punch: ['Punch Zoom', 'Pops to 112% at the start point'], punch2: ['Punch Zoom 2-step', '112% → 124% after 0.5s'],
      whoosh: ['Whip Zoom In', 'Flies in big'], zoomblur: ['Zoom Blur In', 'Big and blurry → sharp'], whooshout: ['Whip Zoom Out', 'Flies out big at the end'],
      sl_in_u: ['Slide In from Top', 'Comes in from the top'], sl_in_l: ['Slide In from Left', 'Comes in from the left'],
      sl_in_r: ['Slide In from Right', 'Comes in from the right'], sl_in_d: ['Slide In from Bottom', 'Comes in from the bottom'],
      sl_out_u: ['Slide Out Up', 'Leaves upward at the end'], sl_out_l: ['Slide Out Left', 'Leaves to the left at the end'],
      sl_out_r: ['Slide Out Right', 'Leaves to the right at the end'], sl_out_d: ['Slide Out Down', 'Leaves downward at the end'],
      wipe_d: ['Crop In Top→Bottom', 'Revealed from the top'], wipe_r: ['Crop In Left→Right', 'Revealed from the left'],
      wipe_c: ['Crop In Center', 'Opens from the center outward'], wipe_l: ['Crop In Right→Left', 'Revealed from the right'],
      wipe_u: ['Crop In Bottom→Top', 'Revealed from the bottom'],
      wipeo_u: ['Crop Out Up', 'Closes upward at the end'], wipeo_l: ['Crop Out Left', 'Closes to the left at the end'],
      wipeo_c: ['Crop Out to Center', 'Closes to the center at the end'], wipeo_r: ['Crop Out Right', 'Closes to the right at the end'],
      wipeo_d: ['Crop Out Down', 'Closes downward at the end'],
      d_soft_in: ['Soft Dissolve In', 'Fades in softly'], d_soft_out: ['Soft Dissolve Out', 'Fades out softly at the end'],
      d_blur_in: ['Blur Dissolve In', 'Melts in from blur'], d_blur_out: ['Blur Dissolve Out', 'Melts away into blur'],
      d_zoom_in: ['Zoom Dissolve In', 'Appears while shrinking slightly'], d_zoom_out: ['Zoom Dissolve Out', 'Disappears while growing slightly'],
      d_white_in: ['Flash Dissolve In', 'Sharpens out of white light'], d_white_out: ['Flash Dissolve Out', 'Flashes white and disappears'],
      d_black_in: ['Dip Dissolve In', 'Brightens out of black'], d_black_out: ['Dip Dissolve Out', 'Sinks into black'],
      d_dir_in: ['Motion Dissolve In', 'Appears flowing sideways'], d_dir_out: ['Motion Dissolve Out', 'Disappears flowing sideways'],
      d_feather_in: ['Feather Wipe In', 'Opens from the left with a soft edge'], d_feather_out: ['Feather Wipe Out', 'Closes to the right with a soft edge'],
      d_chroma_in: ['Chroma Dissolve In', 'RGB comes together'], d_chroma_out: ['Chroma Dissolve Out', 'RGB splits apart'],
      popup: ['Pop Up', '0 → 114 → 100'], boing: ['Pop Boing', 'Wobbles in several times'], popout: ['Pop Out', 'Pops away at the end'],
      chewside: ['Chewy Side', 'Stretches sideways, then snaps'], chewup: ['Chewy Up', 'Stretches up, then snaps'],
      shakein: ['Shake In', 'Appears trembling side to side'],
      thud: ['Slam Hit', 'Flies in big and thuds'], thudshake: ['Slam + Shake', 'Screen shakes after the hit'], stamp: ['Stamp', 'Stamped in big with a jolt'],
      bouncepop: ['Bounce Grow', 'Grows, then bounces back'], bounceshrink: ['Bounce Shrink', 'Shrinks, then bounces back'],
      shake: ['Shake', 'Short jolt · 12f'], shakebig: ['Strong Shake', 'Big shake with rotation · 20f'],
      shock: ['Shock Zoom', 'Sudden grow with a jolt'], dramazoom: ['Drama Zoom', '2-step sudden zoom + shake'],
      chromahit: ['RGB Split', 'RGB splits and snaps back'], rise: ['Jump Up', 'Pops up from below and lands'],
      dropbounce: ['Drop', 'Falls from above and bounces'], sideslide: ['Side Slide', 'Slides in from the left'],
      slideblur: ['Side Slide (Blur)', 'Lands from the side with a trail'], fadeup: ['Fade Up', 'Rises slightly while appearing'],
      fadedown: ['Fade Down', 'Sinks while disappearing at the end'], rotpop: ['Spin Pop', 'Spins and pops out'],
      swing: ['Swing', 'Swings side to side and settles'], typing: ['Typewriter', 'One character at a time'],
      typingerase: ['Typewriter Erase', 'Erased one character at a time at the end'], typingcursor: ['Typing Cursor', 'For a duplicate track · blinking cursor that follows the text'],
      fill_up: ['Color Fill (Straight)', 'Color rises from bottom to top · duplicate track'], fill_wave: ['Color Fill (Wave)', 'Color rises in waves · duplicate track'],
      fill_lr: ['Color Fill (L→R)', 'Color fills from left to right · duplicate track'], fill_down: ['Color Fill (Top→Bottom)', 'Color pours down from the top · duplicate track'],
      blurin: ['Blur In', 'Appears from blur to sharp'], blurout: ['Blur Out', 'Blurs away at the end'],
      widein: ['Wide In', 'Spreads wide, then gathers'], flicker: ['Flicker', 'Flickers on like a fluorescent light'],
      wave: ['Wave', 'Wavy wobble · to clip end'], jitter: ['Jitter', 'Wiggly hand-drawn feel'], tremble: ['Eye Quake', 'Fine trembling to clip end'],
      float: ['Float', 'Floats on a 2-second cycle'], rainbow: ['Rainbow', 'Colors cycle quickly'],
      flow_rl: ['Ear Flow (R→L)', 'Flows from right to left'], flow_lr: ['Ear Flow (L→R)', 'Flows from left to right'],
      posterize: ['Posterize Time', 'Choppy like 8 fps · to clip end'], glowback: ['Back Glow', 'For a copy on the track below · glows behind the original'],
      soulout: ['Soul Out', 'Wobbles up and out · duplicate track'], heartghost: ['Heart Ghost', 'Ghost that grows and fades · duplicate track'],
      glow: ['Glow In', 'Flashes bright, then sharp'], glow_lr: ['Glow In (L→R)', 'Glows in from the left'], glow_rl: ['Glow In (R→L)', 'Glows in from the right'],
      blink1: ['Blink 1x', 'Blinks once'], blink2: ['Blink 2x', 'Blinks twice'], blink: ['Blink 3x', 'Blinks three times'],
      pulse: ['Pulse', 'Grows slightly and returns'], heartbeat: ['Heartbeat', 'Two beats, grows and returns'],
      tilt: ['Tilt', 'Tilts 7° and holds'], tiltback: ['Tilt Back', 'Tilts and comes back'],
      despair: ['Despair', 'Thuds down from above and squashes'], rage: ['Rage', 'Hard shake + red screen']
    }
  };
  function setPreviewText(t) { PREVIEW_TEXT = t || '모먼트 모션킷'; }

  return {
    EN: EN, setPreviewText: setPreviewText, _tune: function (wc, wi) { MK_WC = wc; MK_WI = wi; },
    EASES: EASES, CURVES: CURVES, CATS: CATS, PRESETS: PRESETS, GROUPS: GROUPS, DEFAULT_FAVS: DEFAULT_FAVS,
    SIZE: SIZE, SPEED: SPEED, FXP: FXP,
    bezier: bezier, easeFn: easeFn, reverseCurve: reverseCurve, sameCurve: sameCurve, isShape: isShape, isLinear: isLinear, curveSamples: curveSamples, getPreset: getPreset, typingLayout: typingLayout, typingSteps: typingSteps, fitBounds: fitBounds, typingText: typingText, durationOf: durationOf, FILL_COLORS: FILL_COLORS,
    secToPos: secToPos, posToSec: posToSec,
    buildPlan: buildPlan, preview: preview, bakeCurve: bakeCurve, restoreCurve: restoreCurve
  };
});
/* Moment_Motion Kit — 추적 엔진 (track-engine.js)
 * 화면의 한 영역을 프레임마다 직접 따라가서
 *   - 위치만 (translation)
 *   - 위치·비율·회전 (similarity)
 *   - 네 모서리 원근 (homography)
 * 를 구합니다. 외부 라이브러리 없음. 브라우저(CEP 패널) / Node 양쪽에서 동작.
 *
 * 방식: 영역 안에서 무늬가 뚜렷한 점들을 고르고(Shi-Tomasi),
 *       피라미드 Lucas-Kanade 로 다음 프레임에서 찾은 뒤(앞뒤 검증),
 *       튀는 점을 걸러내며(RANSAC) 기준 프레임 → 현재 프레임 변환을 맞춥니다.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MKTrack = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ───────────────────────── 이미지 ─────────────────────────
  function grayFromRGBA(rgba, w, h) {
    var g = new Float32Array(w * h);
    for (var i = 0, j = 0; i < g.length; i++, j += 4) {
      g[i] = 0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2];
    }
    return { w: w, h: h, d: g };
  }

  function downsample(img) {
    var w = img.w, h = img.h, s = img.d;
    var tmp = new Float32Array(w * h);
    var x, y, i;
    // 가로 [1 4 6 4 1]/16
    for (y = 0; y < h; y++) {
      var o = y * w;
      for (x = 0; x < w; x++) {
        var x0 = x - 2 < 0 ? 0 : x - 2, x1 = x - 1 < 0 ? 0 : x - 1;
        var x3 = x + 1 >= w ? w - 1 : x + 1, x4 = x + 2 >= w ? w - 1 : x + 2;
        tmp[o + x] = (s[o + x0] + 4 * s[o + x1] + 6 * s[o + x] + 4 * s[o + x3] + s[o + x4]) * 0.0625;
      }
    }
    var nw = (w + 1) >> 1, nh = (h + 1) >> 1;
    var out = new Float32Array(nw * nh);
    for (y = 0; y < nh; y++) {
      var yy = y * 2;
      var y0 = yy - 2 < 0 ? 0 : yy - 2, y1 = yy - 1 < 0 ? 0 : yy - 1;
      var y3 = yy + 1 >= h ? h - 1 : yy + 1, y4 = yy + 2 >= h ? h - 1 : yy + 2;
      for (x = 0; x < nw; x++) {
        var xx = x * 2;
        out[y * nw + x] = (tmp[y0 * w + xx] + 4 * tmp[y1 * w + xx] + 6 * tmp[yy * w + xx] +
          4 * tmp[y3 * w + xx] + tmp[y4 * w + xx]) * 0.0625;
      }
    }
    return { w: nw, h: nh, d: out };
  }

  function buildPyramid(img, levels) {
    var pyr = [img];
    for (var i = 1; i < levels; i++) {
      var p = pyr[i - 1];
      if (p.w < 32 || p.h < 32) break;
      pyr.push(downsample(p));
    }
    return pyr;
  }

  function sample(img, x, y) {
    var w = img.w, h = img.h;
    if (x < 0) x = 0; else if (x > w - 1.001) x = w - 1.001;
    if (y < 0) y = 0; else if (y > h - 1.001) y = h - 1.001;
    var xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi;
    var i = yi * w + xi, d = img.d;
    return (d[i] * (1 - fx) + d[i + 1] * fx) * (1 - fy) + (d[i + w] * (1 - fx) + d[i + w + 1] * fx) * fy;
  }

  // ───────────────────────── 점 고르기 (Shi-Tomasi) ─────────────────────────
  function pointInPoly(x, y, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function polyBounds(poly, w, h, pad) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (var i = 0; i < poly.length; i++) {
      if (poly[i][0] < x0) x0 = poly[i][0];
      if (poly[i][0] > x1) x1 = poly[i][0];
      if (poly[i][1] < y0) y0 = poly[i][1];
      if (poly[i][1] > y1) y1 = poly[i][1];
    }
    return {
      x0: Math.max(pad, Math.floor(x0)), y0: Math.max(pad, Math.floor(y0)),
      x1: Math.min(w - 1 - pad, Math.ceil(x1)), y1: Math.min(h - 1 - pad, Math.ceil(y1))
    };
  }

  /** poly 안에서 무늬가 뚜렷한 점을 최대 maxN 개. existing 과 minDist 이상 떨어진 것만. */
  function detectFeatures(img, poly, maxN, minDist, existing) {
    var w = img.w, h = img.h, d = img.d, R = 3;
    var b = polyBounds(poly, w, h, R + 2);
    var bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
    if (bw < 3 || bh < 3) return [];
    var ew = bw + 2 * R, eh = bh + 2 * R; // 창 합을 위해 여유
    var gxx = new Float32Array(ew * eh), gyy = new Float32Array(ew * eh), gxy = new Float32Array(ew * eh);
    var x, y, i;
    for (y = 0; y < eh; y++) {
      var sy = b.y0 - R + y;
      for (x = 0; x < ew; x++) {
        var sx = b.x0 - R + x, p = sy * w + sx;
        var ix = (d[p + 1] - d[p - 1]) * 0.5, iy = (d[p + w] - d[p - w]) * 0.5;
        i = y * ew + x;
        gxx[i] = ix * ix; gyy[i] = iy * iy; gxy[i] = ix * iy;
      }
    }
    // 적분 이미지로 (2R+1)^2 창 합
    function integral(src) {
      var W = ew + 1, I = new Float64Array(W * (eh + 1));
      for (var yy = 0; yy < eh; yy++) {
        var row = 0;
        for (var xx = 0; xx < ew; xx++) {
          row += src[yy * ew + xx];
          I[(yy + 1) * W + xx + 1] = I[yy * W + xx + 1] + row;
        }
      }
      return I;
    }
    var Ixx = integral(gxx), Iyy = integral(gyy), Ixy = integral(gxy), W = ew + 1;
    function boxSum(I, cx, cy) {
      var ax = cx - R, ay = cy - R, bx = cx + R + 1, by = cy + R + 1;
      return I[by * W + bx] - I[ay * W + bx] - I[by * W + ax] + I[ay * W + ax];
    }
    var score = new Float32Array(bw * bh), maxS = 0;
    for (y = 0; y < bh; y++) {
      for (x = 0; x < bw; x++) {
        var a = boxSum(Ixx, x + R, y + R), c = boxSum(Iyy, x + R, y + R), bb = boxSum(Ixy, x + R, y + R);
        var tr = a + c, det = Math.sqrt((a - c) * (a - c) + 4 * bb * bb);
        var s = 0.5 * (tr - det); // 작은 고유값
        score[y * bw + x] = s;
        if (s > maxS) maxS = s;
      }
    }
    if (maxS <= 0) return [];
    var thr = Math.max(maxS * 0.01, 4);
    var cand = [];
    for (y = 1; y < bh - 1; y++) {
      for (x = 1; x < bw - 1; x++) {
        i = y * bw + x; var v = score[i];
        if (v < thr) continue;
        if (v < score[i - 1] || v < score[i + 1] || v < score[i - bw] || v < score[i + bw] ||
            v < score[i - bw - 1] || v < score[i - bw + 1] || v < score[i + bw - 1] || v < score[i + bw + 1]) continue;
        var px = x + b.x0, py = y + b.y0;
        if (!pointInPoly(px, py, poly)) continue;
        cand.push([px, py, v]);
      }
    }
    cand.sort(function (p, q) { return q[2] - p[2]; });
    // 최소 거리 유지 (격자)
    var cell = Math.max(2, minDist), gw = Math.ceil(w / cell) + 1, gh = Math.ceil(h / cell) + 1;
    var grid = {};
    function key(cx, cy) { return cy * gw + cx; }
    function near(px, py) {
      var cx = (px / cell) | 0, cy = (py / cell) | 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var arr = grid[key(cx + dx, cy + dy)];
        if (!arr) continue;
        for (var k = 0; k < arr.length; k++) {
          var ex = arr[k][0] - px, ey = arr[k][1] - py;
          if (ex * ex + ey * ey < minDist * minDist) return true;
        }
      }
      return false;
    }
    function put(px, py) {
      var k = key((px / cell) | 0, (py / cell) | 0);
      (grid[k] || (grid[k] = [])).push([px, py]);
    }
    if (existing) for (i = 0; i < existing.length; i++) put(existing[i][0], existing[i][1]);
    var out = [];
    for (i = 0; i < cand.length && out.length < maxN; i++) {
      if (near(cand[i][0], cand[i][1])) continue;
      put(cand[i][0], cand[i][1]);
      out.push([cand[i][0], cand[i][1]]);
    }
    return out;
  }

  // ───────────────────────── 피라미드 Lucas-Kanade ─────────────────────────
  var LK_HALF = 7, LK_N = (2 * LK_HALF + 1) * (2 * LK_HALF + 1);
  var _T = new Float32Array(LK_N), _Gx = new Float32Array(LK_N), _Gy = new Float32Array(LK_N);

  /** prev 피라미드의 (px,py) 를 cur 피라미드에서 찾기. 반환 [x, y, 잔차] 또는 null */
  function lkTrack(pyrA, pyrB, px, py, gx, gy) {
    var L = Math.min(pyrA.length, pyrB.length);
    var ux = 0, uy = 0; // 최상위 레벨에서의 변위 추정
    if (gx !== undefined) { var sc0 = 1 / (1 << (L - 1)); ux = (gx - px) * sc0; uy = (gy - py) * sc0; }
    var resid = 0;
    for (var lv = L - 1; lv >= 0; lv--) {
      var A = pyrA[lv], B = pyrB[lv], sc = 1 / (1 << lv);
      var cx = px * sc, cy = py * sc;
      if (cx < 1 || cy < 1 || cx > A.w - 2 || cy > A.h - 2) return null;
      var a = 0, b = 0, c = 0, k = 0, dx, dy;
      for (dy = -LK_HALF; dy <= LK_HALF; dy++) {
        for (dx = -LK_HALF; dx <= LK_HALF; dx++) {
          var sx = cx + dx, sy = cy + dy;
          var t = sample(A, sx, sy);
          var ix = (sample(A, sx + 1, sy) - sample(A, sx - 1, sy)) * 0.5;
          var iy = (sample(A, sx, sy + 1) - sample(A, sx, sy - 1)) * 0.5;
          _T[k] = t; _Gx[k] = ix; _Gy[k] = iy; k++;
          a += ix * ix; b += ix * iy; c += iy * iy;
        }
      }
      var det = a * c - b * b;
      if (det < 1e-3 * LK_N) { if (lv === 0) return null; ux *= 2; uy *= 2; continue; }
      var inv = 1 / det;
      for (var it = 0; it < 20; it++) {
        var e1 = 0, e2 = 0; k = 0; resid = 0;
        var bx = cx + ux, by = cy + uy;
        if (bx < -LK_HALF || by < -LK_HALF || bx > B.w + LK_HALF || by > B.h + LK_HALF) return null;
        for (dy = -LK_HALF; dy <= LK_HALF; dy++) {
          for (dx = -LK_HALF; dx <= LK_HALF; dx++) {
            var df = _T[k] - sample(B, bx + dx, by + dy);
            e1 += df * _Gx[k]; e2 += df * _Gy[k]; resid += df < 0 ? -df : df; k++;
          }
        }
        var sxp = (c * e1 - b * e2) * inv, syp = (a * e2 - b * e1) * inv;
        ux += sxp; uy += syp;
        if (sxp * sxp + syp * syp < 0.0009) break;
      }
      if (lv > 0) { ux *= 2; uy *= 2; }
    }
    var nx = px + ux, ny = py + uy, w0 = pyrB[0].w, h0 = pyrB[0].h;
    if (nx < 2 || ny < 2 || nx > w0 - 3 || ny > h0 - 3) return null;
    return [nx, ny, resid / LK_N];
  }

  // ───────────────────────── 변환 맞추기 ─────────────────────────
  // 3x3 행렬은 길이 9 배열 (행 우선)
  function apply(H, x, y) {
    var z = H[6] * x + H[7] * y + H[8];
    return [(H[0] * x + H[1] * y + H[2]) / z, (H[3] * x + H[4] * y + H[5]) / z];
  }
  function invert(H) {
    var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7], i = H[8];
    var A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    var det = a * A + b * B + c * C;
    if (Math.abs(det) < 1e-12) return null;
    var s = 1 / det;
    return [A * s, (c * h - b * i) * s, (b * f - c * e) * s,
            B * s, (a * i - c * g) * s, (c * d - a * f) * s,
            C * s, (b * g - a * h) * s, (a * e - b * d) * s];
  }
  function identity() { return [1, 0, 0, 0, 1, 0, 0, 0, 1]; }

  function fitTranslation(P, Q, idx) {
    var sx = 0, sy = 0, n = idx.length;
    for (var k = 0; k < n; k++) { var i = idx[k]; sx += Q[i][0] - P[i][0]; sy += Q[i][1] - P[i][1]; }
    return [1, 0, sx / n, 0, 1, sy / n, 0, 0, 1];
  }
  function fitSimilarity(P, Q, idx) {
    var n = idx.length, k, i, mx = 0, my = 0, nx = 0, ny = 0;
    for (k = 0; k < n; k++) { i = idx[k]; mx += P[i][0]; my += P[i][1]; nx += Q[i][0]; ny += Q[i][1]; }
    mx /= n; my /= n; nx /= n; ny /= n;
    var sa = 0, sb = 0, sp = 0;
    for (k = 0; k < n; k++) {
      i = idx[k];
      var px = P[i][0] - mx, py = P[i][1] - my, qx = Q[i][0] - nx, qy = Q[i][1] - ny;
      sa += px * qx + py * qy; sb += px * qy - py * qx; sp += px * px + py * py;
    }
    if (sp < 1e-9) return null;
    var a = sa / sp, b = sb / sp;
    return [a, -b, nx - a * mx + b * my, b, a, ny - b * mx - a * my, 0, 0, 1];
  }
  function solve(A, b, n) { // 가우스 소거 (부분 피벗)
    for (var c = 0; c < n; c++) {
      var p = c, r;
      for (r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-12) return null;
      var t = A[c]; A[c] = A[p]; A[p] = t; var tb = b[c]; b[c] = b[p]; b[p] = tb;
      for (r = c + 1; r < n; r++) {
        var f = A[r][c] / A[c][c];
        if (!f) continue;
        for (var k = c; k < n; k++) A[r][k] -= f * A[c][k];
        b[r] -= f * b[c];
      }
    }
    var x = new Array(n);
    for (var i = n - 1; i >= 0; i--) {
      var s = b[i];
      for (var j = i + 1; j < n; j++) s -= A[i][j] * x[j];
      x[i] = s / A[i][i];
    }
    return x;
  }
  function normPts(P, idx) {
    var n = idx.length, mx = 0, my = 0, k, d = 0;
    for (k = 0; k < n; k++) { mx += P[idx[k]][0]; my += P[idx[k]][1]; }
    mx /= n; my /= n;
    for (k = 0; k < n; k++) { var x = P[idx[k]][0] - mx, y = P[idx[k]][1] - my; d += Math.sqrt(x * x + y * y); }
    d /= n; var s = d > 1e-9 ? Math.SQRT2 / d : 1;
    return { s: s, mx: mx, my: my };
  }
  function mul(A, B) {
    var o = new Array(9);
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++)
      o[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
    return o;
  }
  function fitHomography(P, Q, idx) {
    var n = idx.length;
    if (n < 4) return null;
    var np = normPts(P, idx), nq = normPts(Q, idx);
    var AtA = [], Atb = [], r, c;
    for (r = 0; r < 8; r++) { AtA.push([0, 0, 0, 0, 0, 0, 0, 0]); Atb.push(0); }
    for (var k = 0; k < n; k++) {
      var i = idx[k];
      var x = (P[i][0] - np.mx) * np.s, y = (P[i][1] - np.my) * np.s;
      var u = (Q[i][0] - nq.mx) * nq.s, v = (Q[i][1] - nq.my) * nq.s;
      var r1 = [x, y, 1, 0, 0, 0, -u * x, -u * y], r2 = [0, 0, 0, x, y, 1, -v * x, -v * y];
      for (r = 0; r < 8; r++) {
        for (c = 0; c < 8; c++) AtA[r][c] += r1[r] * r1[c] + r2[r] * r2[c];
        Atb[r] += r1[r] * u + r2[r] * v;
      }
    }
    var hh = solve(AtA, Atb, 8);
    if (!hh) return null;
    var Hn = [hh[0], hh[1], hh[2], hh[3], hh[4], hh[5], hh[6], hh[7], 1];
    var Tp = [np.s, 0, -np.s * np.mx, 0, np.s, -np.s * np.my, 0, 0, 1];
    var Tqi = [1 / nq.s, 0, nq.mx, 0, 1 / nq.s, nq.my, 0, 0, 1];
    var H = mul(Tqi, mul(Hn, Tp));
    if (Math.abs(H[8]) < 1e-12) return null;
    for (r = 0; r < 9; r++) H[r] /= H[8];
    return H;
  }

  var MODELS = {
    translation: { min: 1, fit: fitTranslation },
    similarity: { min: 2, fit: fitSimilarity },
    homography: { min: 4, fit: fitHomography }
  };

  // 고정 시드 난수 (같은 입력 → 같은 결과)
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  /** RANSAC 으로 P→Q 변환. 반환 { H, inliers:[index], err } 또는 null */
  function robustFit(P, Q, modelName, thr, seed) {
    var m = MODELS[modelName], n = P.length;
    if (n < m.min) return null;
    var all = []; for (var i = 0; i < n; i++) all.push(i);
    var thr2 = thr * thr, best = null, bestCount = -1, rand = rng(seed || 12345);
    var iters = m.min === 1 ? Math.min(n, 60) : (m.min === 2 ? 150 : 300);
    function count(H) {
      var inl = [];
      for (var k = 0; k < n; k++) {
        var q = apply(H, P[k][0], P[k][1]);
        var dx = q[0] - Q[k][0], dy = q[1] - Q[k][1];
        if (dx * dx + dy * dy <= thr2) inl.push(k);
      }
      return inl;
    }
    for (var it = 0; it < iters; it++) {
      var pick = [];
      if (m.min === 1) pick = [it % n];
      else {
        var guard = 0;
        while (pick.length < m.min && guard++ < 50) {
          var r = (rand() * n) | 0;
          if (pick.indexOf(r) < 0) pick.push(r);
        }
        if (pick.length < m.min) continue;
      }
      var H = m.fit(P, Q, pick);
      if (!H) continue;
      var inl = count(H);
      if (inl.length > bestCount) { bestCount = inl.length; best = inl; if (bestCount === n) break; }
    }
    if (!best || best.length < m.min) return null;
    // 인라이어로 다시 맞추기 (2번)
    var Hf = null;
    for (var pass = 0; pass < 2; pass++) {
      var Ht = m.fit(P, Q, best);
      if (!Ht) break;
      Hf = Ht;
      var again = count(Ht);
      if (again.length < m.min) break;
      best = again;
    }
    if (!Hf) return null;
    var err = 0;
    for (var k2 = 0; k2 < best.length; k2++) {
      var q2 = apply(Hf, P[best[k2]][0], P[best[k2]][1]);
      err += Math.sqrt(Math.pow(q2[0] - Q[best[k2]][0], 2) + Math.pow(q2[1] - Q[best[k2]][1], 2));
    }
    return { H: Hf, inliers: best, err: err / best.length };
  }

  // ───────────────────────── 추적기 ─────────────────────────
  /**
   * opts: { model: 'translation'|'similarity'|'homography', maxPoints, levels }
   * poly: 기준 프레임에서의 영역 꼭짓점 [[x,y],...] (분석 이미지 좌표)
   */
  function Tracker(refGray, poly, opts) {
    opts = opts || {};
    this.model = opts.model || 'similarity';
    this.maxPoints = opts.maxPoints || 140;
    this.levels = opts.levels || 4;
    this.poly = poly.map(function (p) { return [p[0], p[1]]; });
    var b = polyBounds(poly, refGray.w, refGray.h, 0);
    var size = Math.sqrt(Math.max(1, (b.x1 - b.x0) * (b.y1 - b.y0)));
    this.minDist = Math.max(3, Math.min(12, size / 14));
    this.thr = Math.max(1.5, Math.min(4, size / 60));
    this.pyr = buildPyramid(refGray, this.levels);
    this.H = identity();
    this.ref = detectFeatures(refGray, this.poly, this.maxPoints, this.minDist, null);
    this.cur = this.ref.map(function (p) { return [p[0], p[1]]; });
    this.initial = this.ref.length;
    this.frame = 0;
    this.lost = false;
  }

  Tracker.prototype.minNeeded = function () { return this.model === 'homography' ? 8 : (this.model === 'similarity' ? 4 : 2); };

  /** 다음 프레임. 반환 { ok, H, conf, points, center, scale, rotation, corners } */
  Tracker.prototype.step = function (gray) {
    this.frame++;
    var pyr = buildPyramid(gray, this.levels);
    var need = this.minNeeded();
    if (this.lost || this.cur.length < need) { this.lost = true; this.pyr = pyr; return this.result(false, 0); }
    var P = [], Q = [], i;
    for (i = 0; i < this.cur.length; i++) {
      var c = this.cur[i];
      var f = lkTrack(this.pyr, pyr, c[0], c[1]);
      if (!f || f[2] > 28) continue;
      var bk = lkTrack(pyr, this.pyr, f[0], f[1], c[0], c[1]);
      if (!bk) continue;
      var ex = bk[0] - c[0], ey = bk[1] - c[1];
      if (ex * ex + ey * ey > 1.0) continue; // 앞뒤 검증
      P.push(this.ref[i]); Q.push([f[0], f[1]]);
    }
    var tracked = P.length;
    var fit = tracked >= need ? robustFit(P, Q, this.model, this.thr, 1000 + this.frame) : null;
    if (!fit || fit.inliers.length < need) {
      this.lost = true; this.pyr = pyr;
      return this.result(false, 0);
    }
    var nref = [], ncur = [];
    for (i = 0; i < fit.inliers.length; i++) { nref.push(P[fit.inliers[i]]); ncur.push(Q[fit.inliers[i]]); }
    this.H = fit.H; this.ref = nref; this.cur = ncur; this.pyr = pyr;

    // 점이 줄었으면 지금 영역에서 새로 보충
    if (this.cur.length < this.maxPoints * 0.6) {
      var Hi = invert(this.H);
      if (Hi) {
        var H = this.H;
        var polyNow = this.poly.map(function (p) { return apply(H, p[0], p[1]); });
        var add = detectFeatures(gray, polyNow, this.maxPoints - this.cur.length, this.minDist, this.cur);
        for (i = 0; i < add.length; i++) {
          var rp = apply(Hi, add[i][0], add[i][1]);
          if (isFinite(rp[0]) && isFinite(rp[1])) { this.ref.push(rp); this.cur.push(add[i]); }
        }
      }
    }
    var conf = Math.min(1, fit.inliers.length / Math.max(need * 3, Math.min(this.initial, 30))) *
               Math.min(1, fit.inliers.length / Math.max(1, tracked) + 0.2);
    return this.result(true, conf);
  };

  Tracker.prototype.result = function (ok, conf) {
    var H = this.H, poly = this.poly, cx = 0, cy = 0, i;
    for (i = 0; i < poly.length; i++) { cx += poly[i][0]; cy += poly[i][1]; }
    cx /= poly.length; cy /= poly.length;
    var dec = decompose(H, cx, cy);
    return {
      ok: ok, conf: conf, H: H.slice(), points: this.cur.length,
      center: dec.center, scale: dec.scale, rotation: dec.rotation,
      corners: poly.map(function (p) { return apply(H, p[0], p[1]); })
    };
  };

  /** (cx,cy) 근처에서 H 의 이동·비율·회전(도) */
  function decompose(H, cx, cy) {
    var c = apply(H, cx, cy), e = 1;
    var px = apply(H, cx + e, cy), mx = apply(H, cx - e, cy), py = apply(H, cx, cy + e), my = apply(H, cx, cy - e);
    var a = (px[0] - mx[0]) / 2, b = (py[0] - my[0]) / 2, d = (px[1] - mx[1]) / 2, f = (py[1] - my[1]) / 2;
    var det = a * f - b * d;
    return {
      center: c,
      scale: Math.sqrt(Math.abs(det)),
      rotation: Math.atan2(d - b, a + f) * 180 / Math.PI
    };
  }

  // ───────────────────────── 후처리 ─────────────────────────
  /** 가우시안으로 부드럽게 (앞뒤 대칭이라 밀림 없음). sigma = 프레임 수 */
  function smooth(arr, sigma) {
    var n = arr.length;
    if (!(sigma > 0.05) || n < 3) return arr.slice();
    var r = Math.max(1, Math.ceil(sigma * 3)), k = [], i, j, s = 0;
    for (i = -r; i <= r; i++) { var v = Math.exp(-i * i / (2 * sigma * sigma)); k.push(v); s += v; }
    var out = new Array(n);
    for (i = 0; i < n; i++) {
      var acc = 0;
      for (j = -r; j <= r; j++) {
        var t = i + j;
        // 끝에서는 기울기를 유지하도록 점대칭 반사
        var val;
        if (t < 0) val = 2 * arr[0] - arr[Math.min(n - 1, -t)];
        else if (t > n - 1) val = 2 * arr[n - 1] - arr[Math.max(0, 2 * (n - 1) - t)];
        else val = arr[t];
        acc += val * k[j + r];
      }
      out[i] = acc / s;
    }
    return out;
  }
  function unwrapDeg(arr) {
    var out = arr.slice();
    for (var i = 1; i < out.length; i++) {
      var d = out[i] - out[i - 1];
      while (d > 180) { out[i] -= 360; d -= 360; }
      while (d < -180) { out[i] += 360; d += 360; }
    }
    return out;
  }
  /** 부드럽게 강도 0~100 → 프레임 단위 sigma */
  function sigmaFromStrength(strength) { return Math.max(0, strength) / 100 * 5; }

  /** 추적 결과 배열(프레임 순서) → 부드럽게 한 트랙. 못 찾은 프레임은 앞뒤 값으로 메움 */
  function buildTracks(results, strength) {
    var n = results.length, i, k;
    var okIdx = [];
    for (i = 0; i < n; i++) if (results[i] && results[i].ok) okIdx.push(i);
    if (!okIdx.length) return null;
    function series(get) {
      var a = new Array(n);
      for (var q = 0; q < okIdx.length; q++) a[okIdx[q]] = get(results[okIdx[q]]);
      // 빈 곳 선형 보간 / 양끝은 유지
      var prev = -1;
      for (var t = 0; t < n; t++) {
        if (a[t] !== undefined) {
          if (prev < 0) for (var u = 0; u < t; u++) a[u] = a[t];
          else for (var u2 = prev + 1; u2 < t; u2++) a[u2] = a[prev] + (a[t] - a[prev]) * (u2 - prev) / (t - prev);
          prev = t;
        }
      }
      for (var u3 = prev + 1; u3 < n; u3++) a[u3] = a[prev];
      return a;
    }
    var sg = sigmaFromStrength(strength || 0);
    var x = smooth(series(function (r) { return r.center[0]; }), sg);
    var y = smooth(series(function (r) { return r.center[1]; }), sg);
    var ls = smooth(series(function (r) { return Math.log(r.scale); }), sg);
    var rot = smooth(unwrapDeg(series(function (r) { return r.rotation; })), sg);
    var nc = results[okIdx[0]].corners.length, corners = [];
    for (k = 0; k < nc; k++) {
      (function (kk) {
        corners.push({
          x: smooth(series(function (r) { return r.corners[kk][0]; }), sg),
          y: smooth(series(function (r) { return r.corners[kk][1]; }), sg)
        });
      })(k);
    }
    var scale = ls.map(function (v) { return Math.exp(v); });
    var okFlags = results.map(function (r) { return !!(r && r.ok); });
    return { n: n, x: x, y: y, scale: scale, rotation: rot, corners: corners, ok: okFlags };
  }

  /**
   * 따라가기: 기준 프레임에서 (p0x,p0y)·scale0·rot0 에 있던 대상이 추적 대상을 따라가도록.
   * tracks 좌표계와 p0 좌표계는 같아야 함(예: 시퀀스 픽셀). use = { pos, scale, rot }
   */
  function followKeys(tracks, refIndex, p0, use) {
    var cx0 = tracks.x[refIndex], cy0 = tracks.y[refIndex];
    var s0 = tracks.scale[refIndex], r0 = tracks.rotation[refIndex];
    var out = [];
    for (var i = 0; i < tracks.n; i++) {
      var s = use.scale ? tracks.scale[i] / s0 : 1;
      var th = use.rot ? (tracks.rotation[i] - r0) : 0;
      var c = Math.cos(th * Math.PI / 180), sn = Math.sin(th * Math.PI / 180);
      var ox = p0.x - cx0, oy = p0.y - cy0;
      var x = p0.x, y = p0.y;
      if (use.pos) {
        x = tracks.x[i] + s * (c * ox - sn * oy);
        y = tracks.y[i] + s * (sn * ox + c * oy);
      }
      out.push({ x: x, y: y, scale: s, rotation: th });
    }
    return out;
  }

  /**
   * 역추적 안정화: 변형(Transform) 효과에 넣을 값.
   * 기준점(anchor) = 그 프레임의 추적 위치, 위치 = 기준 프레임의 추적 위치(고정),
   * 비율 = 1/s, 회전 = -θ  →  대상이 화면에 고정됨.
   */
  function stabilizeKeys(tracks, refIndex, use) {
    var s0 = tracks.scale[refIndex], r0 = tracks.rotation[refIndex];
    var out = [];
    for (var i = 0; i < tracks.n; i++) {
      out.push({
        anchorX: tracks.x[i], anchorY: tracks.y[i],
        x: tracks.x[refIndex], y: tracks.y[refIndex],
        scale: use.scale ? s0 / tracks.scale[i] : 1,
        rotation: use.rot ? -(tracks.rotation[i] - r0) : 0
      });
    }
    return out;
  }

  return {
    grayFromRGBA: grayFromRGBA, buildPyramid: buildPyramid, detectFeatures: detectFeatures,
    lkTrack: lkTrack, robustFit: robustFit, apply: apply, invert: invert, decompose: decompose,
    Tracker: Tracker, smooth: smooth, buildTracks: buildTracks,
    followKeys: followKeys, stabilizeKeys: stabilizeKeys, sigmaFromStrength: sigmaFromStrength
  };
});
