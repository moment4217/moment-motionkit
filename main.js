/* Moment_Motion Kit panel — 화면 동작 + 프리미어(host.jsx) 호출 */
(function () {
  'use strict';
  var MK = window.MK;
  var cep = window.__adobe_cep__;
  var FORCE_MINI = !!window.MK_FORCE_MINI;          // mini.html (별도 미니 패널)
  var MAIN_ID = 'com.moment.motionkit.main';
  var RUN = window.MK_RUNNING || { v: '1.6.2', src: 'bundled' };
  var VERSION = 'v' + RUN.v;
  var SRCNAME = { online: '방금 자동 업데이트됨', cache: '저장된 업데이트', bundled: '설치본' };

  /* ---------- 프리미어 호출 ---------- */
  function parse(r) {
    try { return JSON.parse(r); } catch (e) { return { ok: false, err: 'parse', msg: String(r) }; }
  }
  function host(script) {
    return new Promise(function (resolve) {
      if (cep) cep.evalScript(script, function (r) { resolve(parse(r)); });
      else if (window.MK_MOCK) resolve(parse(window.MK_MOCK(script)));
      else resolve({ ok: false, err: 'nocep' });
    });
  }
  /* 한글이 섞여도 안전하도록 \uXXXX 로 바꿔서 넘긴다 */
  function call(fn, data) {
    if (data === undefined) return host(fn + '()');
    var arg = JSON.stringify(JSON.stringify(data)).replace(/[\u0080-￿]/g, function (c) {
      return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
    return host(fn + '(' + arg + ')');
  }
  var ERR = {
    noseq: '시퀀스를 먼저 열어주세요',
    notf: '변형(Transform) 효과를 추가하지 못했어요',
    noqe: '효과를 추가할 수 없어요 (QE 사용 불가)',
    nocep: '프리미어 프로 안에서 열어주세요',
    parse: '프리미어 응답을 읽지 못했어요',
    nobelow: '아래 트랙에 원본 자막이 없어요'
  };
  var FXNAME = { chroma: 'VR 색수차', post: '시간 포스터화', tint: '색조', bc: '밝기 및 대비', proc: 'ProcAmp', crop: '자르기', gblur: '가우시안 흐림', turb: '난류 변위', dblur: '방향 흐림', wwarp: '파도 비틀기', lwipe: '선형 닦아내기', ramp: '경사(Ramp)', tmk: '트랙 매트 키' };
  var NOTES = { motion: '모션의 기본 자르기 사용', lwipe: '자르기 대신 선형 닦아내기 사용', nodup: '' };
  var DUP_HOW = '자막을 Alt 를 누른 채 바로 위 트랙으로 끌어서 같은 위치에 복제 → 위쪽 복제본을 선택하고 다시 누르세요';
  function errText(r) { return ERR[r.err] || ('오류: ' + (r.msg || r.err)); }

  /* ---------- 상태 표시 ---------- */
  var statusEl = document.getElementById('status'), miniStatusEl = document.getElementById('miniStatus');
  function status(msg, cls) {
    statusEl.textContent = msg; statusEl.className = cls || '';
    miniStatusEl.textContent = msg; miniStatusEl.className = 'miniStatus ' + (cls || '');
    miniStatusEl.title = msg;
  }

  /* ---------- 설정 (전체 패널 ↔ 미니 패널 공유) ----------
   * 두 패널이 같은 설정 파일을 씀. 저장할 때는 "내가 바꾼 항목만" 최신 파일에 덮어써서
   * 다른 패널에서 바꾼 내용을 지우지 않는다(3-way 병합). 저장 후 다른 패널에 바로 알림.
   */
  var DEF = {
    opts: { size: 3, speed: 3, dur: 0, zoomRate: 0, anchor: 'playhead', blur: true, cat: 'all', step: 1, mini: false, scope: 'all',
      kinds: { pos: true, scale: true, rot: true, op: true, other: false },
      typing: { text: '', fpc: 2, width: '', center: '' }, outside: false, pivot: [0.5, 0.5], autoArea: true, fillColor: 'yellow' },
    tipOff: false,
    favs: MK.DEFAULT_FAVS.slice(),
    fxFavs: [],
    curve: MK.EASES.out.slice(),
    mine: []
  };
  var LOCAL = { 'opts.mini': 1 };                    // 패널마다 따로 (접힘 상태)
  var INSTANCE = (FORCE_MINI ? 'mini' : 'main') + Math.random().toString(36).slice(2, 8);
  function fill(dst, def) {
    for (var k in def) {
      if (dst[k] === undefined || dst[k] === null) dst[k] = JSON.parse(JSON.stringify(def[k]));
      else if (typeof def[k] === 'object' && !Array.isArray(def[k])) fill(dst[k], def[k]);
    }
    return dst;
  }
  function flat(o, pre, out) {
    out = out || {};
    for (var k in o) {
      var v = o[k], p = pre ? pre + '.' + k : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, p, out); else out[p] = JSON.stringify(v);
    }
    return out;
  }
  function setPath(o, path, v) {
    var ks = path.split('.');
    for (var i = 0; i < ks.length - 1; i++) { if (typeof o[ks[i]] !== 'object' || o[ks[i]] === null) o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = v;
  }
  function parseSettings(txt) {
    try {
      var v = txt ? JSON.parse(txt) : null;
      if (typeof v === 'string') v = JSON.parse(v);          // 예전 버전이 두 번 감싸 저장한 파일도 읽기
      return v && typeof v === 'object' ? fill(v, DEF) : null;
    } catch (e) { return null; }
  }
  var S = parseSettings((function () { try { return localStorage.getItem('mmk.settings'); } catch (e) { return null; } })()) || fill({}, DEF);
  try { S.opts.mini = !FORCE_MINI && localStorage.getItem('mmk.collapsed') === '1'; } catch (e) { S.opts.mini = false; }
  var opts = S.opts, base = flat(S), saveTimer = 0, flushing = false, flushAgain = false;
  function persistLocal() {
    try { localStorage.setItem('mmk.settings', JSON.stringify(S)); if (!FORCE_MINI) localStorage.setItem('mmk.collapsed', opts.mini ? '1' : '0'); } catch (e) {}
  }
  /* 다른 패널이 바꾼 항목을 내 설정에 반영 (내가 안 바꾼 항목만) */
  function pull(remote) {
    var rf = flat(remote), cur = flat(S), got = false;
    for (var k in rf) {
      if (LOCAL[k] || rf[k] === base[k]) continue;
      if (cur[k] === base[k] || cur[k] === undefined) { setPath(S, k, JSON.parse(rf[k])); got = true; }
      base[k] = rf[k];
    }
    return got;
  }
  function save() { persistLocal(); clearTimeout(saveTimer); saveTimer = setTimeout(flush, 200); }
  async function flush() {
    if (flushing) { flushAgain = true; return; }
    flushing = true;
    try {
      var cur = flat(S), changed = [];
      for (var k in cur) if (!LOCAL[k] && cur[k] !== base[k]) changed.push(k);
      if (!changed.length) return;
      var r = await call('mk_loadSettings');
      var remote = (r.ok && parseSettings(r.data)) || JSON.parse(JSON.stringify(S));
      var got = pull(remote);
      changed.forEach(function (k) { setPath(remote, k, JSON.parse(cur[k])); });
      delete remote.opts.mini;
      var w = await call('mk_saveSettings', remote);   // 객체 그대로 (문자열로 두 번 감싸지 않게)
      if (w.ok) {
        var nb = flat(remote); for (var q in nb) base[q] = nb[q];
        broadcast();
      }
      persistLocal();
      if (got) refreshAll();
    } finally {
      flushing = false;
      if (flushAgain) { flushAgain = false; flush(); }
    }
  }
  var lastSync = 0;
  function sync(force) {
    var now = Date.now();
    if (flushing || (!force && now - lastSync < 800)) return;
    lastSync = now;
    call('mk_loadSettings').then(function (r) {
      var remote = r.ok && parseSettings(r.data);
      if (!remote || flushing) return;
      if (pull(remote)) { persistLocal(); refreshAll(); }
    });
  }
  /* 패널 사이 즉시 알림 (CEP 이벤트) + 혹시 못 받을 때를 위한 주기 확인 */
  var EVT = 'com.moment.motionkit.sync';
  function broadcast() {
    try { if (cep && cep.dispatchEvent) cep.dispatchEvent({ type: EVT, scope: 'APPLICATION', appId: '', extensionId: '', data: INSTANCE }); } catch (e) {}
  }
  try { if (cep && cep.addEventListener) cep.addEventListener(EVT, function (ev) { if (!ev || String(ev.data) !== INSTANCE) sync(true); }); } catch (e) {}
  window.addEventListener('focus', function () { sync(); });
  document.documentElement.addEventListener('mouseenter', function () { sync(); });
  setInterval(function () { if (!document.hidden) sync(true); }, 3000);

  /* ---------- 탭 ---------- */
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.toggle('on', x === b); });
      document.querySelectorAll('.pane').forEach(function (p) { p.classList.toggle('on', p.id === 'tab-' + b.dataset.tab); });
      if (b.dataset.tab === 'curve') drawCurve();
      if (b.dataset.tab === 'fx') openFxTab();
    });
  });

  /* ---------- 작게 접기 / 미니 ---------- */
  var btnMini = document.getElementById('btnMini');
  function isMini() { return FORCE_MINI || opts.mini || window.innerWidth < 200 || window.innerHeight < 230; }
  var wasMini = null;
  function layout() {
    var m = isMini();
    document.body.classList.toggle('mini', m);
    document.body.classList.toggle('tiny', window.innerWidth < 120);
    document.body.classList.toggle('narrow', window.innerWidth < 170);
    if (FORCE_MINI) { btnMini.textContent = '⤢'; btnMini.title = '전체 패널 열기'; }
    else { btnMini.textContent = m ? '⤢' : '▁'; btnMini.title = m ? '크게 펼치기' : '작게 접기 (즐겨찾기만 보기)'; }
    var sh = m && window.innerHeight < 160;          // 가로 툴바처럼 납작하면 머리줄 숨김
    document.body.classList.toggle('short', sh);
    var key = m + '|' + sh;
    if (key !== wasMini) { wasMini = key; if (m) renderMini(); }
  }
  function expandClick() {
    if (FORCE_MINI) {
      if (cep && cep.requestOpenExtension) cep.requestOpenExtension(MAIN_ID, '');
      else status('창 > 확장 프로그램 > Moment_Motion Kit 을 여세요', 'warn');
      return;
    }
    if (isMini() && !opts.mini) { status('패널 창을 조금 더 크게 늘리면 펼쳐져요', 'warn'); return; }
    opts.mini = !opts.mini; save(); layout();
  }
  btnMini.addEventListener('click', expandClick);
  window.addEventListener('resize', layout);

  /* ---------- 세그먼트 버튼 ---------- */
  var segs = [];
  function seg(el, values, labels, get, set) {
    if (values) {
      el.innerHTML = '';
      values.forEach(function (v, i) {
        var b = document.createElement('button'); b.dataset.v = v; b.textContent = labels ? labels[i] : v; el.appendChild(b);
      });
    }
    function paint() { el.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', String(get()) === b.dataset.v); }); }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      set(b.dataset.v); paint(); save();
    });
    segs.push(paint); paint();
  }
  seg(document.getElementById('optSize'), ['1', '2', '3', '4', '5'], null,
    function () { return opts.size; }, function (v) { opts.size = +v; renderGrid(); renderMini(); });
  seg(document.getElementById('optSpeed'), ['1', '2', '3', '4', '5'], ['느림', '2', '3', '4', '빠름'],
    function () { return opts.speed; }, function (v) { opts.speed = +v; renderGrid(); renderMini(); });
  seg(document.getElementById('optAnchor'), null, null,
    function () { return opts.anchor; }, function (v) { opts.anchor = v; });
  var zoomRow = document.getElementById('zoomRow');
  seg(document.getElementById('optZoomRate'), ['0', '1', '2', '3', '5'], ['클립에 맞춤', '1%/s', '2%/s', '3%/s', '5%/s'],
    function () { return opts.zoomRate || 0; }, function (v) { opts.zoomRate = +v; renderGrid(); renderMini(); });
  seg(document.getElementById('optScope'), null, null,
    function () { return opts.scope; }, function (v) { opts.scope = v; });
  seg(document.getElementById('optStep'), null, null,
    function () { return opts.step; }, function (v) { opts.step = +v; });
  seg(document.getElementById('optFpc'), ['1', '2', '3', '4'], ['1f', '2f', '3f', '4f'],
    function () { return opts.typing.fpc; }, function (v) { opts.typing.fpc = +v; renderGrid(); });

  var blurBtn = document.getElementById('optBlur');
  function paintBlur() { blurBtn.classList.toggle('on', !!opts.blur); }
  blurBtn.addEventListener('click', function () { opts.blur = !opts.blur; paintBlur(); save(); });

  /* ---------- 지속 시간 (드래그 슬라이더) ---------- */
  var durCtls = [], lastFps = 30, lastManual = 0.5, speedRow = document.getElementById('speedRow');
  function fmtSec(v) { return (v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : v.toFixed(0)) + '초'; }
  function durLabel(v) { return fmtSec(v) + ' · ' + Math.round(v * lastFps) + 'f'; }
  function durCtl(holder, compact) {
    var wrap = document.createElement('div'); wrap.className = 'durCtl';
    var auto = document.createElement('button'); auto.className = 'chipA'; auto.textContent = '자동';
    auto.title = '자동: 프리셋 기본 길이 × 속도';
    var track = document.createElement('div'); track.className = 'durTrack';
    var range = document.createElement('input'); range.type = 'range'; range.min = 0; range.max = 1000; range.step = 1;
    var bubble = document.createElement('output'); bubble.className = 'bubble';
    track.appendChild(range); track.appendChild(bubble);
    if (!compact) {
      var ticks = document.createElement('div'); ticks.className = 'ticks';
      [0.2, 0.5, 1, 2, 5].forEach(function (t) {
        var sp = document.createElement('span'); sp.textContent = t < 1 ? String(t).replace('0.', '.') : t + 's';
        sp.style.left = (MK.secToPos(t) / 10) + '%'; ticks.appendChild(sp);
      });
      track.appendChild(ticks);
    }
    var val = document.createElement('input'); val.className = 'durVal'; val.title = '직접 입력도 돼요 (초)';
    wrap.appendChild(auto); wrap.appendChild(track); wrap.appendChild(val);
    holder.innerHTML = ''; holder.appendChild(wrap);
    function place() {
      var p = +range.value;
      bubble.style.left = 'calc(' + (p / 10) + '% + ' + (7 - p / 1000 * 14) + 'px)';
    }
    function paint() {
      var a = !(opts.dur > 0);
      wrap.classList.toggle('auto', a); auto.classList.toggle('on', a);
      if (!track.classList.contains('drag')) range.value = MK.secToPos(a ? lastManual : opts.dur);
      if (document.activeElement !== val) val.value = a ? '자동' : fmtSec(opts.dur);
      place();
    }
    range.addEventListener('pointerdown', function () { track.classList.add('drag'); });
    range.addEventListener('input', function () {
      track.classList.add('drag');
      opts.dur = lastManual = MK.posToSec(+range.value);
      bubble.textContent = durLabel(opts.dur);
      paintDur();
    });
    function end() {
      if (!track.classList.contains('drag')) return;
      track.classList.remove('drag'); save(); renderGrid(); renderMini();
    }
    range.addEventListener('change', end);
    range.addEventListener('pointerup', end);
    auto.addEventListener('click', function () {
      opts.dur = opts.dur > 0 ? 0 : lastManual;
      paintDur(); save(); renderGrid(); renderMini();
      status(opts.dur > 0 ? '길이 ' + durLabel(opts.dur) + ' 로 지정' : '길이 자동 (프리셋 기본 × 속도)', 'ok');
    });
    val.addEventListener('focus', function () { val.select(); });
    val.addEventListener('change', function () {
      var v = parseFloat(String(val.value).replace(/[^\d.]/g, ''));
      opts.dur = v > 0 ? Math.max(0.05, Math.min(10, v)) : 0;
      if (opts.dur) lastManual = opts.dur;
      val.blur(); paintDur(); save(); renderGrid(); renderMini();
    });
    durCtls.push(paint);
  }
  function paintDur() {
    durCtls.forEach(function (p) { p(); });
    speedRow.style.display = opts.dur > 0 ? 'none' : '';
  }
  durCtl(document.getElementById('fullDur'), false);
  durCtl(document.getElementById('miniDur'), true);

  /* ---------- 타이핑 설정 ---------- */
  var tyText = document.getElementById('tyText'), tyW = document.getElementById('tyWidth'), tyC = document.getElementById('tyCenter'),
      tyWAuto = document.getElementById('tyWAuto'), tyWVal = document.getElementById('tyWVal'), tyCVal = document.getElementById('tyCVal'),
      tyFrameBtn = document.getElementById('tyFrame'), tyAuto = document.getElementById('typingAuto'),
      typingBox = document.getElementById('typingOpts');
  var frameOn = false, autoW = 0;
  var SRC = { input: '직접 입력한 문장', source: '자막 글자 읽음', name: '클립 이름 사용', guess: '자막 글자를 못 읽음' };
  function centerVal() { var c = opts.typing.center; return c === '' || c == null ? 50 : +c; }
  function paintTyping() {
    if (document.activeElement !== tyText) tyText.value = opts.typing.text || '';
    var wAuto = !(opts.typing.width > 0);
    typingBox.classList.toggle('wauto', wAuto); tyWAuto.classList.toggle('on', wAuto);
    tyW.value = wAuto ? (autoW || 34) : opts.typing.width;
    tyWVal.textContent = wAuto ? (autoW ? autoW + '%' : '자동') : Math.round(opts.typing.width) + '%';
    tyC.value = centerVal(); tyCVal.textContent = centerVal() + '%';
    tyFrameBtn.classList.toggle('on', frameOn); tyFrameBtn.textContent = frameOn ? '영역 보기 끄기' : '영역 보기';
    if (opts.typing.text) {
      var lay = MK.typingLayout(opts.typing.text, { w: 1920, h: 1080 }, {});
      tyAuto.textContent = lay.chars.length + '글자 · 자동 폭 ≈ ' + lay.auto + '% (16:9)';
    } else tyAuto.textContent = '자동: 자막 글자 → 클립 이름 순으로 읽음';
  }
  var ctxCache = null, ctxTime = 0;
  async function getCtx(fresh) {
    if (!fresh && ctxCache && Date.now() - ctxTime < 2500) return ctxCache;
    var c = await call('mk_context');
    if (c.ok) { ctxCache = c; ctxTime = Date.now(); lastFps = c.fps; }
    return c;
  }
  var frameBusy = false, frameAgain = false;
  async function pushFrame() {
    if (!frameOn) return;
    if (frameBusy) { frameAgain = true; return; }
    frameBusy = true;
    try {
      var c = await getCtx();
      if (!c.ok) { status(errText(c), 'err'); return; }
      if (!c.clips.length) { status('자막 클립을 먼저 선택하세요', 'warn'); return; }
      var src = MK.typingText(c.clips[0], opts.typing), lay = MK.typingLayout(src.text, c, opts.typing);
      autoW = lay.auto;
      var r = await call('mk_typingFrame', { on: true, L: lay.L, R: lay.R });
      if (!r.ok) { status(errText(r), 'err'); return; }
      if (r.nofx) { status('자르기 효과를 쓸 수 없어서 영역 보기가 안 돼요 → 아래 "진단 정보 복사"를 눌러 알려주세요', 'err'); return; }
      status('영역 보기 ' + Math.round(lay.L) + '% ~ ' + Math.round(lay.R) + '% · "' + src.text.slice(0, 12) + '" (' + SRC[src.from] + ')',
        src.from === 'guess' ? 'warn' : 'ok');
      paintTyping();
    } finally {
      frameBusy = false;
      if (frameAgain) { frameAgain = false; pushFrame(); }
    }
  }
  tyText.addEventListener('input', function () { opts.typing.text = tyText.value; paintTyping(); save(); pushFrame(); });
  tyW.addEventListener('input', function () { opts.typing.width = +tyW.value; paintTyping(); pushFrame(); });
  tyW.addEventListener('change', function () { save(); renderGrid(); });
  tyC.addEventListener('input', function () { opts.typing.center = +tyC.value; paintTyping(); pushFrame(); });
  tyC.addEventListener('change', function () { save(); });
  tyWAuto.addEventListener('click', function () {
    opts.typing.width = opts.typing.width > 0 ? '' : (autoW || +tyW.value || 34);
    paintTyping(); save(); pushFrame();
  });
  tyFrameBtn.addEventListener('click', async function () {
    frameOn = !frameOn; paintTyping();
    if (frameOn) { ctxCache = null; pushFrame(); }
    else {
      var r = await call('mk_typingFrame', { on: false });
      status(r.ok ? '영역 보기를 껐어요' : errText(r), r.ok ? 'ok' : 'err');
    }
  });

  /* ---------- 등장: 프레임 밖에서 꽂기 ---------- */
  seg(document.getElementById('optOutside'), null, null,
    function () { return opts.outside ? '1' : '0'; }, function (v) { opts.outside = v === '1'; renderGrid(); renderMini(); });

  /* ---------- 기준점 (확대·회전 중심) ---------- */
  var pivGrid = document.getElementById('pivGrid'), pivLabel = document.getElementById('pivLabel');
  var PIV = [[0.25, 0.25, '왼쪽 위'], [0.5, 0.25, '위'], [0.75, 0.25, '오른쪽 위'], [0.25, 0.5, '왼쪽'], [0.5, 0.5, '가운데'], [0.75, 0.5, '오른쪽'],
    [0.25, 0.75, '왼쪽 아래'], [0.5, 0.75, '아래'], [0.75, 0.75, '오른쪽 아래']];
  PIV.forEach(function (p) {
    var b = document.createElement('button'); b.title = p[2];
    b.addEventListener('click', function () { opts.pivot = [p[0], p[1]]; paintPivot(); save(); applyPivot(); });
    pivGrid.appendChild(b);
  });
  function samePt(a, b) { return Math.abs(a[0] - b[0]) < 0.005 && Math.abs(a[1] - b[1]) < 0.005; }
  function paintPivot() {
    var pv = opts.pivot || [0.5, 0.5], hit = null;
    pivGrid.querySelectorAll('button').forEach(function (b, i) { var on = samePt(PIV[i], pv); b.classList.toggle('on', on); if (on) hit = PIV[i][2]; });
    pivLabel.textContent = hit || ('직접 지정 (' + Math.round(pv[0] * 100) + '%, ' + Math.round(pv[1] * 100) + '%)');
  }
  /* 화면 캡처 → 클릭으로 지정 */
  var pickBox = document.getElementById('pickBox'), pickImg = document.getElementById('pickImg'), pickPic = document.getElementById('pickPic'), pickDot = document.getElementById('pickDot');
  function loadFrame(path) {
    return new Promise(function (res) {
      var src = null;
      try {
        var CF = window.cep;   /* CEP 파일 읽기 (변수 cep 는 __adobe_cep__ 라서 window.cep 를 씀) */
        if (CF && CF.fs && CF.fs.readFile) {
          var rr = CF.fs.readFile(path, CF.encoding ? CF.encoding.Base64 : 'Base64');
          if (rr && rr.err === 0 && rr.data) src = 'data:image/png;base64,' + rr.data;
        }
      } catch (e) {}
      if (!src) src = 'file:///' + String(path).replace(/\\/g, '/').replace(/^\/+/, '');
      var im = new Image();
      im.onload = function () { res(im); }; im.onerror = function () { res(null); };
      im.src = src;
    });
  }
  function pct(v) { return Math.round(v * 100); }
  var pickRead = document.getElementById('pickRead'), pickGv = document.getElementById('pickGv'), pickGh = document.getElementById('pickGh');
  var snapX = false, snapY = false;
  function placeDot() {
    var pv = opts.pivot || [0.5, 0.5];
    pickDot.style.left = pickGv.style.left = (pv[0] * 100) + '%';
    pickDot.style.top = pickGh.style.top = (pv[1] * 100) + '%';
    pickGv.classList.toggle('snap', snapX); pickGh.classList.toggle('snap', snapY);
    pickRead.textContent = '가로 ' + pct(pv[0]) + '% · 세로 ' + pct(pv[1]) + '%' + (snapX || snapY ? ' · 맞춤' : '');
  }
  /* 기준점을 이미 모션이 들어간 선택 클립에도 바로 반영 */
  var pivTimer = null;
  function applyPivot(quiet) {
    clearTimeout(pivTimer);
    pivTimer = setTimeout(async function () {
      var pv = opts.pivot || [0.5, 0.5];
      var r = await call('mk_setPivot', { pivot: pv });
      if (quiet) return;
      var head = '기준점 가로 ' + pct(pv[0]) + '% · 세로 ' + pct(pv[1]) + '%';
      if (!r.ok) return status(head + ' · 다음에 넣는 효과부터 적용돼요', 'ok');
      status(head + (r.done ? ' · 선택 클립 ' + r.done + '개에 바로 반영' : ' · 이제 넣는 효과가 이 점을 중심으로 움직여요'), 'ok');
    }, 120);
  }
  /* 화면 캡처 → 점을 끌거나 클릭해서 지정 (가운데·3분할 선에 살짝 붙음, Shift = 안 붙음) */
  var SNAPS = [1 / 3, 0.5, 2 / 3], SNAP_D = 0.018;
  function snapTo(v, free) {
    if (!free) for (var i = 0; i < SNAPS.length; i++) if (Math.abs(v - SNAPS[i]) < SNAP_D) return { v: SNAPS[i], hit: true };
    return { v: v, hit: false };
  }
  function pickAt(e) {
    var rc = pickImg.getBoundingClientRect();
    var x = Math.max(0, Math.min(1, (e.clientX - rc.left) / rc.width)), y = Math.max(0, Math.min(1, (e.clientY - rc.top) / rc.height));
    var sx = snapTo(x, e.shiftKey), sy = snapTo(y, e.shiftKey);
    snapX = sx.hit; snapY = sy.hit;
    opts.pivot = [Math.round(sx.v * 1000) / 1000, Math.round(sy.v * 1000) / 1000];
    placeDot(); paintPivot();
  }
  var picking = false;
  pickImg.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    e.preventDefault(); picking = true; pickImg.classList.add('drag'); pickAt(e);
  });
  document.addEventListener('mousemove', function (e) { if (picking) pickAt(e); });
  document.addEventListener('mouseup', function () {
    if (!picking) return;
    picking = false; pickImg.classList.remove('drag');
    save(); applyPivot();
  });
  /* 캡처가 안 될 때도 점은 옮길 수 있게: 시퀀스 비율의 빈 화면 + 3분할 선 */
  function blankFrame(w, h) {
    var W = 480, H = Math.max(120, Math.round(W * (h || 1080) / (w || 1920)));
    if (H > 860) { W = Math.round(W * 860 / H); H = 860; }
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'); g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1;
    [1 / 3, 2 / 3].forEach(function (k) { g.beginPath(); g.moveTo(W * k, 0); g.lineTo(W * k, H); g.moveTo(0, H * k); g.lineTo(W, H * k); g.stroke(); });
    g.fillStyle = 'rgba(255,255,255,.35)'; g.font = '13px sans-serif'; g.textAlign = 'center';
    g.fillText('화면 캡처를 못 해서 빈 화면이에요', W / 2, H / 2 + 28);
    return c.toDataURL('image/png');
  }
  var picking0 = false;
  document.getElementById('btnPick').addEventListener('click', async function () {
    if (picking0) return;
    picking0 = true;
    try {
      status('화면을 캡처하는 중…');
      var r = await call('mk_grabFrame', {});
      var im = r.ok ? await loadFrame(r.path) : null, src;
      if (im) src = im.src;
      else {
        var c = await getCtx(false);
        src = blankFrame(c && c.w, c && c.h);
        lastGrabErr = r.ok ? 'load' : (r.err + (r.msg ? ' (' + r.msg + ')' : ''));
      }
      pickPic.src = src; snapX = snapY = false; pickBox.classList.add('show'); placeDot();
      pickBox.scrollIntoView({ block: 'nearest' });
      status(im ? '점을 드래그하거나 클릭하세요 · 놓는 순간 선택 클립에 반영돼요'
                : '화면 캡처가 안 돼서 빈 화면에 표시했어요 · 점은 그대로 옮길 수 있어요 (진단 정보 복사로 알려주세요)', im ? 'ok' : 'warn');
    } finally { picking0 = false; }
  });
  document.getElementById('pickCenter').addEventListener('click', function () { opts.pivot = [0.5, 0.5]; snapX = snapY = true; placeDot(); paintPivot(); save(); applyPivot(); });
  document.getElementById('pickDone').addEventListener('click', function () { pickBox.classList.remove('show'); call('mk_cleanTmp'); status('✓ 기준점: ' + pivLabel.textContent, 'ok'); });

  /* ---------- 글자 영역 자동 측정 ---------- */
  var areaCache = {}, lastGrabErr = '';
  var autoAreaBtn = document.getElementById('optAutoArea');
  function paintAutoArea() { autoAreaBtn.classList.toggle('on', opts.autoArea !== false); }
  autoAreaBtn.addEventListener('click', function () { opts.autoArea = opts.autoArea === false; paintAutoArea(); save(); });
  /* 클립만 보이게 캡처해서 밝은 픽셀이 있는 범위를 % 로 */
  async function measureArea(clip, useBelow) {
    var tt = useBelow && clip.below >= 0 ? clip.below : clip.t;   /* 복제본용: 효과가 안 들어간 아래 원본을 잰다 */
    var key = clip.id + '|' + tt + '|' + (clip.text || clip.name) + '|' + clip.start + '|' + clip.end;
    if (areaCache[key]) return areaCache[key];
    var r = await call('mk_grabFrame', { t: tt, c: clip.c, isolate: true, at: clip.start + (clip.end - clip.start) * 0.8 });
    if (!r.ok) lastGrabErr = r.err + (r.msg ? ' (' + r.msg + ')' : '');
    var area = null;
    if (r.ok) {
      var im = await loadFrame(r.path);
      if (im) area = bboxOf(im);
    }
    areaCache[key] = area;
    return area;
  }
  function bboxOf(im) {
    try {
      var W = 384, H = Math.max(1, Math.round(im.height * W / im.width));
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var g = c.getContext('2d'); g.drawImage(im, 0, 0, W, H);
      var d = g.getImageData(0, 0, W, H).data, x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0;
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var i = (y * W + x) * 4;
        if (Math.max(d[i], d[i + 1], d[i + 2]) > 60 && d[i + 3] > 0) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (n < 15) return null;
      return { L: x0 / W * 100, R: (x1 + 1) / W * 100, T: y0 / H * 100, B: (y1 + 1) / H * 100 };
    } catch (e) { return null; }
  }
  function areaText(a) { return a ? '가로 ' + Math.round(a.L) + '~' + Math.round(a.R) + '% · 세로 ' + Math.round(a.T) + '~' + Math.round(a.B) + '%' : '못 찾음'; }
  document.getElementById('btnMeasure').addEventListener('click', async function () {
    var c = await getCtx(true);
    if (!c.ok) return status(errText(c), 'err');
    if (!c.clips.length) return status('자막 클립을 먼저 선택하세요', 'warn');
    status('글자 영역을 재는 중…');
    var cl = c.clips[0]; delete areaCache[cl.id + '|' + (cl.text || cl.name) + '|' + cl.start + '|' + cl.end];
    var a = await measureArea(cl);
    call('mk_cleanTmp');
    status(a ? '✓ 글자 영역: ' + areaText(a) : '글자 영역을 못 찾았어요 (어두운 글자거나 캡처 불가) → 글자 폭/중심을 직접 맞춰주세요', a ? 'ok' : 'warn');
  });

  /* ---------- 차오를 색 ---------- */
  var colorsEl = document.getElementById('fillColors');
  var CNAME = { yellow: '노랑', red: '빨강', sky: '하늘', pink: '핑크', green: '초록', white: '흰색', black: '검정' };
  Object.keys(MK.FILL_COLORS).forEach(function (k) {
    var c = MK.FILL_COLORS[k], b = document.createElement('button'); b.title = CNAME[k] || k; b.dataset.v = k;
    b.style.background = 'rgb(' + c[1] + ',' + c[2] + ',' + c[3] + ')';
    b.addEventListener('click', function () { opts.fillColor = k; paintColors(); save(); });
    colorsEl.appendChild(b);
  });
  function paintColors() { colorsEl.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === (opts.fillColor || 'yellow')); }); }

  /* ---------- 사용법 팁 ---------- */
  var tipBox = document.getElementById('tipBox');
  function paintTip() { tipBox.classList.toggle('show', !S.tipOff); }
  document.getElementById('tipOff').addEventListener('click', function () { S.tipOff = true; paintTip(); save(); });

  /* ---------- 선택한 클립 수 (실시간) ---------- */
  var selChip = document.getElementById('selChip');
  async function pollSel() {
    if (document.hidden || isMini()) return;
    var r = await call('mk_selCount');
    if (!r.ok) return;
    selChip.textContent = !r.seq ? '시퀀스 없음' : '선택 ' + r.v + '개' + (r.a ? ' · 오디오 ' + r.a : '');
    selChip.classList.toggle('has', r.v + r.a > 0);
  }
  setInterval(pollSel, 1200);

  /* ---------- 미리보기 그리기 ---------- */
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  /* 화면(시퀀스 프레임)은 캔버스의 가운데 60% 영역 */
  function drawContent(g, st, kind, text) {
    var W = g.canvas.width, H = g.canvas.height, w = W * 0.6, h = H * 0.6;
    if (kind === 'typing') {
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      var fs = h * 0.3; g.font = '700 ' + fs + 'px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
      var tw = g.measureText(text).width; if (tw > w * 0.8) { fs *= w * 0.8 / tw; g.font = '700 ' + fs + 'px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'; }
      g.fillText(text, 0, 0);
    } else if (kind === 'text') {
      g.fillStyle = '#f2f2f2';
      roundRect(g, -w * 0.46, -h * 0.18, w * 0.92, h * 0.36, Math.max(2, W * 0.03)); g.fill();
      g.fillStyle = '#222'; g.fillRect(-w * 0.32, -h * 0.04, w * 0.64, h * 0.08);
    } else {
      var gr = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      gr.addColorStop(0, '#3b6fd6'); gr.addColorStop(1, '#8a5bd6');
      g.fillStyle = gr; g.fillRect(-w / 2, -h / 2, w, h);
      g.fillStyle = 'rgba(255,255,255,.85)';
      g.beginPath(); g.arc(-w * 0.14, -h * 0.06, h * 0.17, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-w / 2, h * 0.22, w, h * 0.28);
    }
  }
  function drawFrame(g, st, kind, text, alpha, fi) {
    var W = g.canvas.width, H = g.canvas.height, sw = W * 0.6, sh = H * 0.6, x0 = W * 0.2, y0 = H * 0.2;
    g.save();
    /* 자르기: 화면 기준 % */
    var c = st.crop;
    if (c[0] || c[1] || c[2] || c[3]) {
      g.beginPath();
      g.rect(x0 + sw * c[0] / 100, y0 + sh * c[1] / 100, sw * (1 - (c[0] + c[2]) / 100), sh * (1 - (c[1] + c[3]) / 100));
      g.clip();
    }
    var bl = (st.blur + st.dblur * 0.4) * sw / 1920, flt = [];
    if (bl > 0.15) flt.push('blur(' + bl.toFixed(2) + 'px)');
    if (st.bright) flt.push('brightness(' + (1 + st.bright / 60).toFixed(2) + ')');
    if (st.hue) flt.push('hue-rotate(' + Math.round(st.hue) + 'deg)');
    if (st.sat !== 100) flt.push('saturate(' + (st.sat / 100).toFixed(2) + ')');
    if (flt.length) g.filter = flt.join(' ');
    g.globalAlpha = alpha * Math.max(0, Math.min(1, st.op / 100));
    function place() {
      g.translate(W / 2 + st.pos[0] * sw, H / 2 + st.pos[1] * sh);
      g.rotate(st.rot * Math.PI / 180);
      g.scale(st.sw / 100, st.sh / 100);
    }
    if (st.turb > 1) {
      /* 난류 변위 흉내: 가로 띠마다 조금씩 어긋나게 */
      var bands = 6, amt = st.turb / 120 * sw * 0.08;
      for (var b = 0; b < bands; b++) {
        g.save();
        g.beginPath(); g.rect(0, H * b / bands, W, H / bands + 0.5); g.clip();
        g.translate(Math.sin((fi || 0) * 2.3 + b * 1.7) * amt, 0);
        place(); drawContent(g, st, kind, text);
        g.restore();
      }
    } else { place(); drawContent(g, st, kind, text); }
    g.restore();
    if (st.tint > 1) {      /* 색조(빨간 화면) 흉내 */
      g.save(); g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(255,40,30,' + (st.tint / 100 * 0.75).toFixed(2) + ')'; g.fillRect(0, 0, W, H);
      g.restore();
    }
  }
  function drawScreen(g) {
    var W = g.canvas.width, H = g.canvas.height;
    g.strokeStyle = '#3a3a3a'; g.lineWidth = 1; g.setLineDash([3, 3]);
    g.strokeRect(W * 0.2 + 0.5, H * 0.2 + 0.5, W * 0.6 - 1, H * 0.6 - 1);
    g.setLineDash([]);
  }
  function kindOf(preset, pv) { return pv.text ? 'typing' : (preset.cat === 'text' || preset.cat === 'caption') ? 'text' : 'video'; }
  function changed(a, b) {
    return a.pos[0] !== b.pos[0] || a.pos[1] !== b.pos[1] || a.sw !== b.sw || a.sh !== b.sh || a.rot !== b.rot || a.op !== b.op ||
      a.blur !== b.blur || a.dblur !== b.dblur || a.turb !== b.turb || a.crop.join() !== b.crop.join() ||
      a.tint !== b.tint || a.bright !== b.bright || a.hue !== b.hue;
  }
  /* 정지 상태: 움직임 구간을 겹쳐 그린 잔상 */
  function drawStill(cv, pv, kind) {
    var g = cv.getContext('2d'), frames = pv.frames, n = frames.length;
    g.clearRect(0, 0, cv.width, cv.height); drawScreen(g);
    var moving = [];
    for (var i = 1; i < n; i++) if (changed(frames[i - 1], frames[i])) moving.push(i);
    if (!moving.length) { drawFrame(g, frames[n - 1], kind, pv.text, 1, n - 1); return; }
    if (kind === 'typing' || moving.length > 0 && frames.some(function (f) { return f.turb > 1; })) {
      var mid = moving[Math.floor(moving.length * 0.6)];
      drawFrame(g, frames[mid], kind, pv.text, 1, mid); return;
    }
    var s = Math.max(0, moving[0] - 1), e = moving[moving.length - 1];
    for (var k = 0; k < 5; k++) {
      var idx = Math.round(s + (e - s) * k / 4);
      drawFrame(g, frames[idx], kind, pv.text, k === 4 ? 1 : 0.12 + k * 0.1, idx);
    }
  }
  var playing = null;
  function play(cv, pv, kind) {
    stop();
    var i = 0, g = cv.getContext('2d'), last = 0, hold = 0, frames = pv.frames;
    playing = { cv: cv, pv: pv, kind: kind, raf: 0 };
    function tick(ts) {
      if (!playing || playing.cv !== cv) return;
      if (ts - last >= 33) {
        last = ts;
        g.clearRect(0, 0, cv.width, cv.height); drawScreen(g); drawFrame(g, frames[i], kind, pv.text, 1, i);
        if (i < frames.length - 1) i++; else if (++hold > 12) { i = 0; hold = 0; }
      }
      playing.raf = requestAnimationFrame(tick);
    }
    playing.raf = requestAnimationFrame(tick);
  }
  function stop() {
    if (!playing) return;
    cancelAnimationFrame(playing.raf);
    drawStill(playing.cv, playing.pv, playing.kind);
    playing = null;
  }

  /* ---------- 즐겨찾기 ---------- */
  function isFav(id) { return S.favs.indexOf(id) >= 0; }
  function toggleFav(id) {
    if (isFav(id)) S.favs = S.favs.filter(function (x) { return x !== id; }); else S.favs.push(id);
    save(); renderGrid(); renderMini();
  }

  /* ---------- 카테고리 + 프리셋 카드 ---------- */
  var catsEl = document.getElementById('cats'), gridEl = document.getElementById('grid'), typingOpts = document.getElementById('typingOpts');
  function renderCats() {
    catsEl.innerHTML = '';
    [{ id: 'fav', label: '★' }, { id: 'all', label: '전체' }].concat(MK.CATS).forEach(function (c) {
      var b = document.createElement('button'); b.textContent = c.label; b.dataset.v = c.id;
      if (c.id === 'fav') b.title = '즐겨찾기';
      b.classList.toggle('on', opts.cat === c.id);
      b.addEventListener('click', function () { opts.cat = c.id; save(); renderCats(); renderGrid(); });
      catsEl.appendChild(b);
    });
    typingOpts.classList.toggle('show', opts.cat === 'caption');
  }

  function durText(p) {
    var dv = MK.durationOf(p, opts);
    return dv === null ? '끝까지' : dv < 0.02 ? '즉시' : fmtSec(dv);
  }
  /* 카드 하나: 단일 효과 = 카드 전체 클릭 / 묶음 = 변형 버튼(가로 또는 십자) */
  function card(preset, members) {
    var g = members ? MK.GROUPS[preset.group] : null;
    var el = document.createElement(members ? 'div' : 'button');
    el.className = 'cardP' + (g && g.layout === 'dpad' ? ' dpad' : '');
    var cv = document.createElement('canvas'); cv.width = 160; cv.height = 90;
    var hd = document.createElement('div'); hd.className = 'hd';
    var nm = document.createElement('span'); nm.className = 'nm';
    var en = document.createElement('span'); en.className = 'en';
    var ds = document.createElement('div'); ds.className = 'ds';
    var bd = document.createElement('span'); bd.className = 'badge';
    hd.appendChild(nm); hd.appendChild(en);
    el.appendChild(cv); el.appendChild(bd); el.appendChild(hd); el.appendChild(ds);
    var first = members ? members[0] : preset;
    var pv = MK.preview(first, opts), kind = kindOf(first, pv);
    drawStill(cv, pv, kind);
    bd.textContent = durText(first) + (first.dup ? ' · 복제용' : '');
    if (members) {
      nm.textContent = g.name; en.textContent = g.en || ''; ds.textContent = g.desc || '';
      var box = document.createElement('div'); box.className = g.layout === 'dpad' ? 'pad' : 'vars';
      function vbtn(p) {
        var b = document.createElement('button'); b.className = 'vb' + (isFav(p.id) ? ' fav' : '');
        b.textContent = p.v || p.name; b.title = p.name + ' — ' + p.desc + '\n우클릭: 즐겨찾기' + (isFav(p.id) ? ' (★)' : '');
        var f = null;
        b.addEventListener('mouseenter', function () {
          f = f || MK.preview(p, opts); play(cv, f, kind);
          ds.textContent = p.desc; bd.textContent = durText(p) + (p.dup ? ' · 복제용' : '');
        });
        b.addEventListener('click', function () { apply(p, el); });
        b.addEventListener('contextmenu', function (e) { e.preventDefault(); toggleFav(p.id); });
        return b;
      }
      if (g.layout === 'dpad') {
        ['', 'u', '', 'l', 'c', 'r', '', 'd', ''].forEach(function (pos, i) {
          var p = pos && members.filter(function (m) { return m.dir === pos; })[0];
          if (p) box.appendChild(vbtn(p));
          else {
            var sp = document.createElement('span'); sp.className = 'padc';
            if (i === 4 && g.center) sp.textContent = g.center;
            box.appendChild(sp);
          }
        });
      } else members.forEach(function (p) { box.appendChild(vbtn(p)); });
      el.appendChild(box);
      el.addEventListener('mouseleave', function () { stop(); ds.textContent = g.desc || ''; bd.textContent = durText(first) + (first.dup ? ' · 복제용' : ''); });
    } else {
      nm.textContent = preset.name; en.textContent = opts.cat === 'fav' ? '' : (preset.en || ''); ds.textContent = preset.desc; el.title = preset.desc;
      var star = document.createElement('span'); star.className = 'star' + (isFav(preset.id) ? ' on' : '');
      star.textContent = isFav(preset.id) ? '★' : '☆'; star.title = '즐겨찾기';
      star.addEventListener('click', function (e) { e.stopPropagation(); toggleFav(preset.id); });
      el.appendChild(star);
      el.addEventListener('mouseenter', function () { play(cv, pv, kind); });
      el.addEventListener('mouseleave', stop);
      el.addEventListener('click', function () { apply(preset, el); });
      el.addEventListener('contextmenu', function (e) { e.preventDefault(); toggleFav(preset.id); });
    }
    return el;
  }
  var CAT_DESC = { basic: '어떤 영상에나 쓰기 좋은 기본 모션', impact: '타격감 · 짧고 센 한 방', text: '자막에 잘 어울리는 움직임',
    caption: '타이핑 · 블러 · 와이프 같은 모션자막', fun: '상황 · 감정 연출' };
  function heading(text, small, cls) {
    var h = document.createElement('div'); h.className = cls || 'sechead';
    h.textContent = text;
    if (small) { var sm = document.createElement('small'); sm.textContent = small; h.appendChild(sm); }
    gridEl.appendChild(h);
  }
  function renderGrid() {
    stop();
    gridEl.innerHTML = '';
    zoomRow.style.display = ['basic', 'all', 'fav'].indexOf(opts.cat) >= 0 ? '' : 'none';
    if (opts.cat === 'fav') {
      var favs = S.favs.map(MK.getPreset).filter(Boolean);
      if (!favs.length) { gridEl.innerHTML = '<p class="note">☆ 를 누르거나 변형 버튼을 우클릭해서 즐겨찾기를 추가하세요</p>'; return; }
      favs.forEach(function (p) { gridEl.appendChild(card(p)); });
      return;
    }
    var done = {}, lastCat = '', lastSub = '';
    MK.PRESETS.forEach(function (p) {
      if (opts.cat !== 'all' && p.cat !== opts.cat) return;
      if (opts.cat === 'all' && p.cat !== lastCat) {
        lastCat = p.cat; lastSub = '';
        heading(MK.CATS.filter(function (c) { return c.id === p.cat; })[0].label, CAT_DESC[p.cat]);
      }
      if (p.sub && p.sub !== lastSub) { lastSub = p.sub; heading('• ' + p.sub, '', 'subhead'); }
      if (p.group) {
        if (done[p.group]) return;
        done[p.group] = true;
        gridEl.appendChild(card(p, MK.PRESETS.filter(function (x) { return x.group === p.group; })));
      } else gridEl.appendChild(card(p));
    });
  }

  /* ---------- 미니 도구창 ---------- */
  var miniGrid = document.getElementById('miniGrid');
  function renderMini() {
    if (!isMini()) return;
    stop();
    miniGrid.innerHTML = '';
    var list = S.favs.map(MK.getPreset).filter(Boolean);
    if (!list.length) {
      var p = document.createElement('div'); p.className = 'miniEmpty';
      p.textContent = '즐겨찾기가 없어요. 전체 패널에서 ☆ 를 눌러 추가하세요.';
      miniGrid.appendChild(p);
    }
    list.forEach(function (preset) {
      var t = document.createElement('button'); t.className = 'tile'; t.title = preset.name + ' — ' + preset.desc;
      var cv = document.createElement('canvas'); cv.width = 64; cv.height = 36;
      var lb = document.createElement('span'); lb.textContent = preset.name;
      t.appendChild(cv); t.appendChild(lb);
      var pv = MK.preview(preset, opts), kind = kindOf(preset, pv);
      drawStill(cv, pv, kind);
      t.addEventListener('mouseenter', function () { play(cv, pv, kind); });
      t.addEventListener('mouseleave', stop);
      t.addEventListener('click', function () { apply(preset, t); });
      dragTile(t, 'm:' + preset.id);
      miniGrid.appendChild(t);
    });
    S.fxFavs.forEach(function (f) {
      var t = document.createElement('button'); t.className = 'tile fxTile' + (f.a ? ' audio' : ''); t.title = (f.a ? '오디오 효과: ' : '효과: ') + f.n;
      t.innerHTML = '<b>' + (f.a ? '♪ FX' : 'FX') + '</b><span></span>'; t.querySelector('span').textContent = f.n;
      t.addEventListener('click', function () { addFx(f.n, !!f.a, t); });
      dragTile(t, 'f:' + (f.a ? 1 : 0) + ':' + f.n);
      miniGrid.appendChild(t);
    });
    var clr = document.createElement('button'); clr.className = 'tile clear'; clr.title = '선택 클립의 모션 효과 지우기';
    clr.innerHTML = '<b>⌫</b><span>효과 지우기</span>';
    clr.addEventListener('click', doClear);
    miniGrid.appendChild(clr);
    if (document.body.classList.contains('short')) {
      var more = document.createElement('button'); more.className = 'tile more'; more.textContent = '⤢';
      more.title = FORCE_MINI ? '전체 패널 열기' : '크게 펼치기';
      more.addEventListener('click', expandClick);
      miniGrid.appendChild(more);
    }
  }

  /* ---------- 미니 창: 끌어서 순서 바꾸기 ---------- */
  var dragKey = null;
  function dragTile(t, key) {
    t.draggable = true; t.dataset.k = key;
    t.addEventListener('dragstart', function (e) {
      dragKey = key; t.classList.add('dragging'); stop();
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', key); } catch (x) {}
    });
    t.addEventListener('dragend', function () {
      dragKey = null; t.classList.remove('dragging');
      miniGrid.querySelectorAll('.over').forEach(function (o) { o.classList.remove('over'); });
    });
    t.addEventListener('dragover', function (e) {
      if (!dragKey || dragKey === key || dragKey[0] !== key[0]) return;
      e.preventDefault(); t.classList.add('over');
    });
    t.addEventListener('dragleave', function () { t.classList.remove('over'); });
    t.addEventListener('drop', function (e) {
      e.preventDefault(); t.classList.remove('over');
      if (dragKey && dragKey !== key && dragKey[0] === key[0]) moveFav(dragKey, key);
    });
  }
  function moveFav(from, to) {
    var arr, idOf;
    if (from[0] === 'm') { arr = S.favs; idOf = function (x) { return 'm:' + x; }; }
    else { arr = S.fxFavs; idOf = function (x) { return 'f:' + (x.a ? 1 : 0) + ':' + x.n; }; }
    var a = -1, b = -1;
    arr.forEach(function (x, i) { if (idOf(x) === from) a = i; if (idOf(x) === to) b = i; });
    if (a < 0 || b < 0) return;
    var item = arr.splice(a, 1)[0];
    arr.splice(b, 0, item);
    if (from[0] === 'm') S.favs = arr.slice(); else S.fxFavs = arr.slice();
    save(); renderMini(); renderGrid(); renderFxFavs();
    status('✓ 순서를 바꿨어요', 'ok');
  }

  /* ---------- 프리셋 적용 ---------- */
  var busy = false;
  async function apply(preset, el) {
    if (busy) return;
    busy = true; el.classList.add('busy'); status('적용 중…');
    try {
      var ctx = await getCtx(true);
      if (!ctx.ok) return status(errText(ctx), 'err');
      if (!ctx.clips.length) return status('타임라인에서 클립을 먼저 선택하세요', 'warn');
      if (preset.typing && frameOn) { frameOn = false; paintTyping(); }
      var measured = 0;
      if (preset.needsArea && opts.autoArea !== false && !(preset.typing && opts.typing.width > 0)) {
        status('글자 영역을 재는 중…');
        for (var ci = 0; ci < ctx.clips.length; ci++) { var a = await measureArea(ctx.clips[ci], !!preset.dup && preset.dup !== 'below'); ctx.clips[ci].area = a; if (a) measured++; }
        call('mk_cleanTmp');
      }
      var plan = MK.buildPlan(preset, opts, ctx);
      var r = await call('mk_apply', plan);
      if (!r.ok) return status(errText(r), 'err');
      var extra = opts.dur > 0 ? ' · ' + fmtSec(opts.dur) : '';
      if (preset.typing && !(r.missing && r.missing.length)) {
        var src = MK.typingText(ctx.clips[0], opts.typing), lay = MK.typingLayout(src.text, ctx, opts.typing, ctx.clips[0].area);
        autoW = lay.auto; paintTyping();
        if (src.from === 'guess') {
          busy = false;
          return status(preset.name + ' 적용 · 자막 글자를 못 읽어서 "' + src.text + '"(' + lay.chars.length + '글자) 기준이에요 → 타이핑 설정 "문장"에 자막 내용을 넣어주세요', 'warn');
        }
        extra += ' · ' + lay.chars.length + '글자(' + SRC[src.from] + '), 폭 ' + Math.round(lay.width) + '%' + (lay.measured ? '(자동 측정)' : '');
      }
      if (r.failed && r.failed.length && r.failed[0] === 'nobelow' && !r.done) {
        status(preset.name + ' 은 원본 위에 복제본이 있어야 해요 → ' + DUP_HOW, 'warn');
      } else if (r.failed && r.failed.length) {
        status(preset.name + ' · ' + r.done + '개 완료, ' + r.failed.length + '개 실패 (' + (ERR[r.failed[0]] || r.failed[0]) + ')', 'warn');
      } else if (r.missing && r.missing.length) {
        status(preset.name + ' · ' + r.missing.map(function (m) { return FXNAME[m] || m; }).join(', ') + ' 효과를 못 찾았어요 → "진단 정보 복사"를 눌러 알려주세요', 'warn');
      } else if (r.notes && r.notes.indexOf('nodup') >= 0) {
        status('✓ ' + preset.name + ' 적용 · 그런데 아래에 원본이 없어서 글자가 색으로만 나타나요 → 원본이 남아 있게 하려면 ' + DUP_HOW, 'warn');
      } else {
        if (r.notes && r.notes.length) extra += ' · ' + r.notes.map(function (n) { return NOTES[n] || n; }).filter(Boolean).join(', ');
        if (preset.needsArea && !preset.typing && opts.autoArea !== false) extra += measured ? ' · 글자 영역 자동 측정' : ' · 글자 영역을 못 찾아 화면 전체 기준';
        if (preset.dup === 'below') extra += ' — 원본을 Alt+드래그로 아래 트랙에 복사한 뒤, 아래 클립에 쓰는 효과예요';
        else if (preset.group === 'fill') extra += ' · 아래 원본 위에 색이 차올라요';
        else if (preset.dup) extra += ' — 원본을 Alt+드래그로 위 트랙에 복사한 뒤, 위 클립에 쓰는 효과예요';
        status('✓ ' + preset.name + ' 적용 · 클립 ' + r.done + '개' + extra, 'ok');
      }
    } finally { busy = false; el.classList.remove('busy'); }
  }

  document.getElementById('btnClear').addEventListener('click', doClear);

  /* ---------- 효과 탭 ---------- */
  var fxData = null, fxKind = 'video', fxLoading = false;
  var fxListEl = document.getElementById('fxList'), fxFavsEl = document.getElementById('fxFavs'),
      fxSearch = document.getElementById('fxSearch'), fxCount = document.getElementById('fxCount');
  function uniqSort(a) {
    var seen = {}, out = [];
    (a || []).forEach(function (n) { n = String(n).trim(); if (n && !seen[n]) { seen[n] = 1; out.push(n); } });
    return out.sort(function (x, y) { return x.localeCompare(y, 'ko'); });
  }
  async function loadFx(force) {
    if (fxData && !force) return fxData;
    if (fxLoading) return null;
    fxLoading = true;
    try {
      var r = await call('mk_fxList');
      if (!r.ok) { status(errText(r), 'err'); return null; }
      fxData = { video: uniqSort(r.video), audio: uniqSort(r.audio) };
      return fxData;
    } finally { fxLoading = false; }
  }
  function isFxFav(n, a) { return S.fxFavs.some(function (f) { return f.n === n && !!f.a === !!a; }); }
  function toggleFxFav(n, a) {
    if (isFxFav(n, a)) S.fxFavs = S.fxFavs.filter(function (f) { return !(f.n === n && !!f.a === !!a); });
    else S.fxFavs.push({ n: n, a: !!a });
    save(); renderFxFavs(); renderFxList(); renderMini();
  }
  function renderFxFavs() {
    fxFavsEl.innerHTML = '';
    if (!S.fxFavs.length) { fxFavsEl.innerHTML = '<span class="empty">아래 목록에서 ☆ 를 눌러 추가하세요</span>'; return; }
    S.fxFavs.forEach(function (f) {
      var b = document.createElement('button'); b.className = 'fxChip' + (f.a ? ' audio' : ''); b.textContent = f.n;
      b.title = (f.a ? '오디오 효과 · ' : '') + '클릭: 추가 / 우클릭: 즐겨찾기 빼기';
      b.addEventListener('click', function () { addFx(f.n, !!f.a, b); });
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); toggleFxFav(f.n, f.a); });
      fxFavsEl.appendChild(b);
    });
  }
  function renderFxList() {
    if (!fxData) return;
    var q = fxSearch.value.trim().toLowerCase(), all = fxData[fxKind], audio = fxKind === 'audio';
    var list = all.filter(function (n) { return !q || n.toLowerCase().indexOf(q) >= 0; });
    fxCount.textContent = list.length + ' / ' + all.length + '개';
    fxListEl.innerHTML = '';
    if (!list.length) { fxListEl.innerHTML = '<p class="note">찾는 효과가 없어요</p>'; return; }
    list.slice(0, 400).forEach(function (n) {
      var row = document.createElement('div'); row.className = 'fxRow';
      var st = document.createElement('button'); st.className = 'st' + (isFxFav(n, audio) ? ' on' : ''); st.textContent = isFxFav(n, audio) ? '★' : '☆';
      st.title = '즐겨찾기'; st.addEventListener('click', function () { toggleFxFav(n, audio); });
      var nm = document.createElement('button'); nm.className = 'nm'; nm.textContent = n; nm.title = '선택한 ' + (audio ? '오디오 ' : '') + '클립에 추가';
      nm.addEventListener('click', function () { addFx(n, audio, nm); });
      row.appendChild(st); row.appendChild(nm); fxListEl.appendChild(row);
    });
  }
  async function openFxTab() {
    renderFxFavs();
    if (!fxData) { fxListEl.innerHTML = '<p class="note">목록을 불러오는 중…</p>'; await loadFx(); }
    renderFxList();
  }
  fxSearch.addEventListener('input', renderFxList);
  seg(document.getElementById('fxKind'), null, null, function () { return fxKind; }, function (v) { fxKind = v; renderFxList(); });
  async function addFx(name, audio, el) {
    if (el) el.classList.add('busy');
    try {
      var r = await call('mk_addEffect', { name: name, audio: !!audio });
      if (!r.ok) return status(r.err === 'nofx' ? '"' + name + '" 효과를 찾지 못했어요' : errText(r), 'err');
      if (!r.clips) return status('타임라인에서 ' + (audio ? '오디오 ' : '') + '클립을 먼저 선택하세요', 'warn');
      status(r.done ? '✓ ' + name + ' 추가 · 클립 ' + r.done + '개' : name + ' 을(를) 추가하지 못했어요', r.done ? 'ok' : 'warn');
    } finally { if (el) el.classList.remove('busy'); }
  }

  /* ---------- 새로고침 ---------- */
  document.getElementById('btnReload').addEventListener('click', function () { flush(); setTimeout(function () { location.reload(); }, 300); });

  /* ---------- 진단 정보 복사 ---------- */
  var diagBox = document.getElementById('diagBox'), diagText = document.getElementById('diagText');
  document.getElementById('btnDiag').addEventListener('click', async function () {
    status('진단 중…');
    var r = await call('mk_diag');
    var head = 'Moment_Motion Kit ' + VERSION + (lastGrabErr ? '\nlast capture error: ' + lastGrabErr : '') + '\n';
    diagText.value = head + (r.ok ? r.text : '진단 실패: ' + errText(r));
    diagBox.classList.add('show');
    diagText.focus(); diagText.select();
    var copied = false;
    try { copied = document.execCommand('copy'); } catch (e) {}
    status(copied ? '✓ 진단 정보를 복사했어요. 채팅에 붙여넣어 주세요' : '아래 내용을 전체 선택(Ctrl+A) 후 복사해 주세요', copied ? 'ok' : 'warn');
  });
  document.getElementById('diagClose').addEventListener('click', function () { diagBox.classList.remove('show'); });
  async function doClear() {
    if (frameOn) { frameOn = false; paintTyping(); }
    var r = await call('mk_clear');
    if (!r.ok) return status(errText(r), 'err');
    if (!r.clips) return status('타임라인에서 클립을 먼저 선택하세요', 'warn');
    if (!r.removed && !r.reset) return status('선택한 클립에 지울 모션 효과가 없어요', 'warn');
    status(r.removed ? '✓ 모션 효과 ' + r.removed + '개 삭제' : '✓ 변형 효과 값을 초기화했어요', 'ok');
  }

  /* ---------- 커브 편집기 ---------- */
  var cv = document.getElementById('cv'), g = cv.getContext('2d');
  var readout = document.getElementById('readout'), ball = document.getElementById('ball');
  var BOX = { x: 60, y: 90, w: 480, h: 240 };       // 0~1 영역 (위아래로 오버슈트 여유)
  function toPx(x, y) { return [BOX.x + x * BOX.w, BOX.y + (1 - y) * BOX.h]; }
  function fromPx(px, py) { return [(px - BOX.x) / BOX.w, 1 - (py - BOX.y) / BOX.h]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function drawCurve() {
    var curve = S.curve;
    g.clearRect(0, 0, cv.width, cv.height);
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var a = toPx(i / 4, 0), b = toPx(i / 4, 1), c = toPx(0, i / 4), d = toPx(1, i / 4);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.moveTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.stroke();
    }
    var p0 = toPx(0, 0), p3 = toPx(1, 1), p1 = toPx(curve[0], curve[1]), p2 = toPx(curve[2], curve[3]);
    g.strokeStyle = '#555'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.moveTo(p3[0], p3[1]); g.lineTo(p2[0], p2[1]); g.stroke();
    g.strokeStyle = '#4f9cff'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]); g.stroke();
    [p1, p2].forEach(function (p) { g.fillStyle = '#fff'; g.beginPath(); g.arc(p[0], p[1], 11, 0, Math.PI * 2); g.fill(); });
    [p0, p3].forEach(function (p) { g.fillStyle = '#4f9cff'; g.beginPath(); g.arc(p[0], p[1], 6, 0, Math.PI * 2); g.fill(); });
    readout.textContent = 'cubic-bezier(' + curve.map(function (v) { return v.toFixed(2); }).join(', ') + ')';
    paintCurveChips();
  }
  var drag = -1;
  function evtPos(e) {
    var r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height];
  }
  cv.addEventListener('pointerdown', function (e) {
    var curve = S.curve, p = evtPos(e), h1 = toPx(curve[0], curve[1]), h2 = toPx(curve[2], curve[3]);
    var d1 = Math.hypot(p[0] - h1[0], p[1] - h1[1]), d2 = Math.hypot(p[0] - h2[0], p[1] - h2[1]);
    drag = d1 < d2 ? 0 : 2;
    if (Math.min(d1, d2) > 60) { drag = -1; return; }
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', function (e) {
    if (drag < 0) return;
    var v = fromPx.apply(null, evtPos(e));
    S.curve[drag] = Math.round(clamp(v[0], 0, 1) * 100) / 100;
    S.curve[drag + 1] = Math.round(clamp(v[1], -0.35, 1.35) * 100) / 100;
    drawCurve();
  });
  cv.addEventListener('pointerup', function () { if (drag >= 0) { drag = -1; save(); } });

  /* 공 미리보기 */
  var t0 = 0;
  function anim(ts) {
    if (!t0) t0 = ts;
    if (document.getElementById('tab-curve').classList.contains('on') && !isMini()) {
      var cyc = ((ts - t0) % 1600) / 1000, x = Math.min(1, cyc / 0.9);
      var y = MK.bezier(S.curve[0], S.curve[1], S.curve[2], S.curve[3])(x);
      var track = ball.parentNode.clientWidth - 14;
      ball.style.transform = 'translateX(' + (y * track) + 'px)';
    }
    requestAnimationFrame(anim);
  }
  requestAnimationFrame(anim);

  var listEl = document.getElementById('curveList');
  function same(a, b) { for (var i = 0; i < 4; i++) if (Math.abs(a[i] - b[i]) > 0.005) return false; return true; }
  function renderCurveChips() {
    listEl.innerHTML = '';
    MK.CURVES.map(function (c) { return { name: c.name, c: c.c }; })
      .concat(S.mine.map(function (m, i) { return { name: m.name, c: m.c, mine: i }; }))
      .forEach(function (c) {
        var b = document.createElement('button'); b.textContent = c.name;
        b._c = c.c; if (c.mine !== undefined) b.classList.add('mine');
        b.addEventListener('click', function () { S.curve = c.c.slice(); save(); drawCurve(); });
        if (c.mine !== undefined) b.addEventListener('contextmenu', function (e) {
          e.preventDefault(); S.mine.splice(c.mine, 1); save(); renderCurveChips(); paintCurveChips();
        });
        listEl.appendChild(b);
      });
  }
  function paintCurveChips() { listEl.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', same(b._c, S.curve)); }); }
  document.getElementById('btnSave').addEventListener('click', function () {
    var inp = document.getElementById('saveName'), name = inp.value.trim();
    if (!name) { inp.focus(); return status('커브 이름을 입력하세요', 'warn'); }
    S.mine.push({ name: name, c: S.curve.slice() }); save();
    inp.value = ''; renderCurveChips(); paintCurveChips(); status('✓ 커브 "' + name + '" 저장', 'ok');
  });

  /* 대상 칩 */
  var kindsEl = document.getElementById('kinds');
  function paintKinds() { kindsEl.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', !!opts.kinds[b.dataset.v]); }); }
  kindsEl.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    opts.kinds[b.dataset.v] = !opts.kinds[b.dataset.v]; paintKinds(); save();
  });

  /* 커브 적용 / 복원 — 원래 키프레임은 패널이 열려 있는 동안 기억 */
  var snaps = {};
  document.getElementById('btnCurve').addEventListener('click', async function () {
    var read = await call('mk_readKeys');
    if (!read.ok) return status(errText(read), 'err');
    if (!read.clips.length) return status('타임라인에서 클립을 먼저 선택하세요', 'warn');
    var writes = MK.bakeCurve(read, S.curve, opts.step, opts.kinds, snaps, opts.scope);
    if (!writes.length && opts.scope === 'playhead') return status('재생헤드가 키프레임 두 개 사이에 있어야 해요', 'warn');
    if (!writes.length) return status('선택한 대상에 키프레임이 2개 이상인 속성이 없어요', 'warn');
    status('커브 적용 중…');
    var r = await call('mk_writeKeys', writes);
    if (!r.ok) return status(errText(r), 'err');
    status('✓ 커브 적용 · 속성 ' + r.done + '개', 'ok');
  });
  document.getElementById('btnRestore').addEventListener('click', async function () {
    var read = await call('mk_readKeys');
    if (!read.ok) return status(errText(read), 'err');
    var writes = MK.restoreCurve(read, snaps);
    if (!writes.length) return status('복원할 기록이 없어요 (패널을 다시 열면 기록이 사라져요)', 'warn');
    var r = await call('mk_writeKeys', writes);
    if (!r.ok) return status(errText(r), 'err');
    status('✓ 원래 키프레임으로 복원 · 속성 ' + r.done + '개', 'ok');
  });

  /* ---------- 시작 ---------- */
  function refreshAll() {
    segs.forEach(function (p) { p(); });
    paintBlur(); paintTyping(); paintKinds(); paintDur(); paintPivot(); paintAutoArea(); paintColors(); paintTip();
    renderCats(); renderGrid(); renderCurveChips(); drawCurve(); renderFxFavs(); renderFxList();
    wasMini = null; layout();
  }
  refreshAll();
  sync(true);
  /* 연결 확인: 하단에 준비 상태 표시 */
  call('mk_ping').then(function (r) {
    if (r.ok) status((RUN.src === 'online' ? '✓ 새 버전으로 자동 업데이트됐어요 · ' : '준비 완료 · ') + 'Moment_Motion Kit ' + VERSION + ' (' + (SRCNAME[RUN.src] || RUN.src) + ')' + (r.version ? ' · Premiere ' + r.version : ''), 'ok');
    else if (cep) status('프리미어와 연결되지 않았어요 — 프리미어를 재시작해 보세요 (' + VERSION + ')', 'err');
  });
  if (!cep && !window.MK_MOCK) status('미리보기 모드 — 프리미어 안에서 열면 적용돼요', 'warn');
})();
