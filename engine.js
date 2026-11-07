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

  /* 커브 탭 기본 커브 */
  var CURVES = [
    { name: '선형',      c: EASES.lin },
    { name: '부드럽게',  c: EASES.inout },
    { name: '감속',      c: EASES.out },
    { name: '가속',      c: EASES.in },
    { name: '강한 감속', c: EASES.expo },
    { name: '오버슈트',  c: EASES.back }
  ];

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
  function charWeight(ch) {
    if (/\s/.test(ch)) return 0.35;
    if (/[ᄀ-ᇿ㄰-㆏가-힯぀-ヿ一-鿿＀-￯]/.test(ch)) return 1;
    if (/[.,'"!?:;|`·]/.test(ch)) return 0.3;
    if (/[A-Z0-9MW@#%&]/.test(ch)) return 0.66;
    return 0.55;
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
    if (area && !(ty.width > 0)) {
      L = Math.max(0, area.L - 0.5); R = Math.min(100, area.R + 0.5); width = R - L; auto = width;
    }
    return { chars: chars, weights: weights, total: total, auto: Math.round(auto), width: width, L: L, R: R, measured: !!(area && !(ty.width > 0)) };
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
    var lay = typingLayout(text, ctx, ty, area), fpc = (ty && ty.fpc) || 2;
    var keys = [[0, 100 - lay.L, 'hold']], acc = 0;
    for (var i = 0; i < lay.chars.length; i++) {
      acc += lay.weights[i];
      var right = 100 - (lay.L + (lay.R - lay.L) * acc / lay.total);
      keys.push([(i + 1) * fpc, i === lay.chars.length - 1 ? 0 : Math.max(0, right), 'hold']);
    }
    keys[keys.length - 1] = [keys[keys.length - 1][0], keys[keys.length - 1][1]];
    var spec = { tracks: {}, fx: [{ fx: 'crop', tracks: { Right: keys }, set: { Left: 0, Top: 0, Bottom: 0 } }] };
    return erase ? mirrorSpec(spec) : spec;
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
    if (opts.dur > 0) return opts.dur;
    if (preset.mode === 'span' || preset.mode === 'loop' || preset.mode === 'rate') return null;
    if (preset.zoomRate && opts.zoomRate > 0) return null;
    var spec = preset.build ? merge(preset, preset.build({ name: text || PREVIEW_TEXT }, opts, { w: 1920, h: 1080 })) : preset;
    return lastFrameOf(spec) * SPEED[(opts.speed || 3) - 1] / 30;
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
  function bakeCurve(read, curve, stepFrames, kinds, snaps, scope) {
    var fn = easeFn(curve), writes = [], tol = read.tpf / 4;
    read.clips.forEach(function (clip) {
      var step = read.tpf * (clip.speed || 1) * (stepFrames || 1);
      clip.params.forEach(function (prm) {
        if (!kinds[prm.kind] || prm.keys.length < 2 || !numeric(prm.keys[0][1])) return;
        var orig = originals(clip, prm, snaps, tol);
        if (orig.length < 2) return;
        var set = [], segs = [];
        for (var i = 0; i < orig.length; i++) {
          set.push([orig[i][0], orig[i][1]]);
          if (i === orig.length - 1) break;
          var a = orig[i], b = orig[i + 1], len = b[0] - a[0];
          if (scope === 'playhead' && !(clip.ph >= a[0] && clip.ph < b[0])) continue;
          segs.push([a[0], b[0]]);
          if (eqVal(a[1], b[1]) || len < step * 1.5) continue;
          for (var tk = a[0] + step; tk < b[0] - step * 0.5; tk += step) {
            set.push([Math.round(tk), round(lerp(a[1], b[1], fn((tk - a[0]) / len)), 6)]);
          }
        }
        if (!segs.length) return;
        var rem = removals(prm.keys, orig, tol);
        if (scope === 'playhead') rem = rem.filter(function (t) {
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
      '다운': 'down', '쓰기': 'type', '지우기': 'erase', '직선': 'straight', '곡선': 'wave', '왼→오': 'L→R', '위→아래': 'top→bottom',
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
      typingerase: ['Typewriter Erase', 'Erased one character at a time at the end'],
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
    EN: EN, setPreviewText: setPreviewText,
    EASES: EASES, CURVES: CURVES, CATS: CATS, PRESETS: PRESETS, GROUPS: GROUPS, DEFAULT_FAVS: DEFAULT_FAVS,
    SIZE: SIZE, SPEED: SPEED, FXP: FXP,
    bezier: bezier, easeFn: easeFn, getPreset: getPreset, typingLayout: typingLayout, typingText: typingText, durationOf: durationOf, FILL_COLORS: FILL_COLORS,
    secToPos: secToPos, posToSec: posToSec,
    buildPlan: buildPlan, preview: preview, bakeCurve: bakeCurve, restoreCurve: restoreCurve
  };
});
