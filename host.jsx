/*
 * Moment_Motion Kit host script — 프리미어 프로 안에서 실행되는 ExtendScript (ES3)
 * 패널(js/main.js)이 계산한 키프레임 목록을 받아 실제 클립에 적는다.
 * 주의: ExtendScript 는 오래된 자바스크립트라 JSON, Array.indexOf 등이 없다.
 *       문자열/정규식 안의 한글은 \uXXXX 로 적는다 (파일 인코딩 문제 방지).
 */

var MK_TPS = 254016000000;                      /* 1초 = 254016000000 ticks */

/* 효과 정의: names = 효과 이름 후보, scan = 효과 목록/QE 표시 이름 찾기, ok = matchName 확인 */
var MK_SPECS = {
    tf: {   /* 변형 / 변환 */
        names: ["Transform", "\uBCC0\uD615", "\uBCC0\uD658"],
        scan: [/^transform$/i, /^\uBCC0\uD615$/, /^\uBCC0\uD658$/, /\uBCC0\uD615/],
        ok: function (m) { return m === "AE.ADBE Geometry2" || m === "AE.ADBE Geometry"; }
    },
    crop: { /* 자르기 */
        names: ["Crop", "\uC790\uB974\uAE30", "Crop (Legacy)", "\uC790\uB974\uAE30(\uB808\uAC70\uC2DC)", "\uC790\uB974\uAE30 (\uB808\uAC70\uC2DC)"],
        scan: [/crop/i, /\uC790\uB974\uAE30/, /\uD06C\uB86D/],
        not: /round|\uB465\uADFC/i,     /* 새 프리미어의 "둥근 자르기"는 다른 효과 */
        ok: function (m) { return /crop/i.test(m) && !/round/i.test(m); }
    },
    gblur: { /* 가우시안 흐림 */
        names: ["Gaussian Blur", "Gaussian Blur (Legacy)", "\uAC00\uC6B0\uC2DC\uC548 \uD750\uB9BC", "\uAC00\uC6B0\uC2DC\uC548 \uD750\uB9BC(\uB808\uAC70\uC2DC)"],
        scan: [/^gaussian blur/i, /\uAC00\uC6B0\uC2DC\uC548/],
        ok: function (m) { return /gaussian/i.test(m); }
    },
    turb: { /* 난류 변위 */
        names: ["Turbulent Displace", "\uB09C\uB958 \uBCC0\uC704"],
        scan: [/turbulent displace/i, /\uB09C\uB958/],
        ok: function (m) { return /turbulent/i.test(m); }
    },
    wwarp: { /* 물결 비틀기 — 글리치 띠 */
        names: ["Wave Warp", "\uBB3C\uACB0 \uBE44\uD2C0\uAE30", "\uD30C\uB3C4 \uBE44\uD2C0\uAE30"],
        scan: [/wave ?warp/i, /\uBB3C\uACB0 \uBE44\uD2C0/, /\uD30C\uB3C4 \uBE44\uD2C0/],
        ok: function (m) { return /wave ?warp/i.test(m); }
    },
    lwipe: { /* 선형 닦아내기 — 자르기가 없을 때 대신 */
        names: ["Linear Wipe", "\uC120\uD615 \uB2E6\uC544\uB0B4\uAE30"],
        scan: [/linear wipe/i, /\uC120\uD615 \uB2E6/],
        ok: function (m) { return /linear ?wipe/i.test(m); }
    },
    tint: { /* 색조 — 버럭 빨간 화면 */
        names: ["Tint", "\uC0C9\uC870"],
        scan: [/^tint$/i, /^\uC0C9\uC870$/],
        not: /\uCC44\uB3C4|saturation|\uBD84\uB9AC/i,
        ok: function (m) { return /tint/i.test(m); }
    },
    bc: { /* 밝기 및 대비 — 빛나며 등장 */
        names: ["Brightness & Contrast", "\uBC1D\uAE30 \uBC0F \uB300\uBE44"],
        scan: [/brightness ?& ?contrast/i, /\uBC1D\uAE30 \uBC0F \uB300\uBE44/],
        ok: function (m) { return /brightness/i.test(m); }
    },
    proc: { /* ProcAmp — 무지개 */
        names: ["ProcAmp"],
        scan: [/procamp/i],
        ok: function (m) { return /procamp/i.test(m); }
    },
    chroma: { /* VR 색수차 — RGB 분리 */
        names: ["VR Chromatic Aberrations", "VR \uC0C9\uC218\uCC28"],
        scan: [/vr chromatic aberration/i, /VR \uC0C9\uC218\uCC28/],
        not: /^chromatic aberration$/i,   /* 새 기본 "Chromatic Aberration" 은 속성이 달라서 제외 */
        ok: function (m) { return /chromatic/i.test(m); }
    },
    post: { /* 시간 포스터화 — 끊기는 프레임 */
        names: ["Posterize Time", "\uC2DC\uAC04 \uD3EC\uC2A4\uD130\uD654"],
        scan: [/posterize time/i, /\uC2DC\uAC04 \uD3EC\uC2A4\uD130/],
        ok: function (m) { return /posterize ?time/i.test(m); }
    },
    dblur: { /* 방향 흐림 */
        names: ["Directional Blur", "\uBC29\uD5A5 \uD750\uB9BC", "\uBC29\uD5A5\uC131 \uD750\uB9BC"],
        scan: [/^directional blur/i, /\uBC29\uD5A5.*\uD750\uB9BC/],
        ok: function (m) { return /motion blur|directional/i.test(m); }
    },
    ramp: { /* 경사(그레이디언트) — 곡선 차오르기의 단색 판 */
        names: ["Ramp", "\uACBD\uC0AC", "\uADF8\uB808\uC774\uB514\uC5B8\uD2B8 \uB7A8\uD504"],
        scan: [/^ramp$/i, /^\uACBD\uC0AC$/, /^\uADF8\uB808\uC774\uB514\uC5B8\uD2B8 \uB7A8\uD504$/],
        ok: function (m) { return /ramp/i.test(m); }
    },
    tmk: { /* 트랙 매트 키 — 곡선 차오르기를 글자 모양으로 */
        names: ["Track Matte Key", "\uD2B8\uB799 \uB9E4\uD2B8 \uD0A4"],
        scan: [/track matte/i, /\uD2B8\uB799 \uB9E4\uD2B8/],
        ok: function (m) { return /track ?matte/i.test(m); }
    },
    cpin: { /* 모퉁이 고정(Corner Pin) — 트래킹 탭의 화면 합성 */
        names: ["Corner Pin", "\uBAA8\uD241\uC774 \uACE0\uC815", "\uBAA8\uC11C\uB9AC \uACE0\uC815", "\uCF54\uB108 \uD540"],
        scan: [/^corner pin$/i, /^\uBAA8\uD241\uC774 \uACE0\uC815$/, /^\uBAA8\uC11C\uB9AC \uACE0\uC815$/, /^\uCF54\uB108 \uD540$/],
        ok: function (m) { return /corner ?pin/i.test(m); }
    }
};
/* 추가 효과 속성의 표시 이름 (영문 / 한글). 이름으로 먼저 찾고, 없으면 번호로 */
var MK_PNAMES = {
    crop:  { Feather: ["Edge Feather", "\uAC00\uC7A5\uC790\uB9AC \uD398\uB354", "\uAC00\uC7A5\uC790\uB9AC \uD750\uB9BC", "\uAC00\uC7A5\uC790\uB9AC \uBD80\uB4DC\uB7FD\uAC8C"], Left: ["Left", "\uC67C\uCABD"], Top: ["Top", "\uC704\uCABD", "\uC704"], Right: ["Right", "\uC624\uB978\uCABD"], Bottom: ["Bottom", "\uC544\uB798\uCABD", "\uC544\uB798"] },
    gblur: { Blurriness: ["Blurriness", "\uD750\uB9BC \uC815\uB3C4", "\uD750\uB9BC"] },
    turb:  { Amount: ["Amount", "\uC591"], Size: ["Size", "\uD06C\uAE30"], Complexity: ["Complexity", "\uBCF5\uC7A1\uC131", "\uBCF5\uC7A1\uB3C4"], Evolution: ["Evolution", "\uC9C4\uD654", "\uC804\uAC1C"] },
    dblur: { Direction: ["Direction", "\uBC29\uD5A5"], Length: ["Blur Length", "\uD750\uB9BC \uAE38\uC774"] },
    wwarp: { Type: [/wave type/i, /(\uD30C\uD615|\uBB3C\uACB0|\uD30C\uB3C4) ?\uC720\uD615/], Height: [/wave height/i, /(\uD30C\uD615|\uBB3C\uACB0|\uD30C\uB3C4) ?\uB192\uC774/],
             Width: [/wave width/i, /(\uD30C\uD615|\uBB3C\uACB0|\uD30C\uB3C4) ?(\uD3ED|\uB108\uBE44)/], Direction: [/^direction$/i, /^\uBC29\uD5A5$/],
             Speed: [/wave speed/i, /(\uD30C\uD615|\uBB3C\uACB0|\uD30C\uB3C4) ?\uC18D\uB3C4/], Phase: [/^phase$/i, /^\uC704\uC0C1$/] },
    ramp:  { StartColor: [/start color/i, /\uC2DC\uC791 \uC0C9/], EndColor: [/end color/i, /(\uB05D|\uC885\uB8CC) \uC0C9/], Blend: [/blend with original/i, /\uC6D0\uBCF8\uACFC \uD63C\uD569/] },
    tmk:   { Matte: [/^matte$/i, /^\uB9E4\uD2B8$/], Composite: [/composite/i, /\uD569\uC131/], Reverse: [/^reverse$/i, /^\uBC18\uC804$/] },
    tint:  { Black: ["Map Black To", "\uAC80\uC815\uC744 \uB2E4\uC74C\uC73C\uB85C \uB9E4\uD551", "\uAC80\uC815 \uB9E4\uD551"], White: ["Map White To", "\uD770\uC0C9\uC744 \uB2E4\uC74C\uC73C\uB85C \uB9E4\uD551", "\uD770\uC0C9 \uB9E4\uD551"], Amount: ["Amount to Tint", "\uC0C9\uC870 \uC591"] },
    bc:    { Brightness: ["Brightness", "\uBC1D\uAE30"], Contrast: ["Contrast", "\uB300\uBE44"] },
    proc:  { Brightness: ["Brightness", "\uBC1D\uAE30", "\uBA85\uB3C4"], Contrast: ["Contrast", "\uB300\uBE44"], Hue: ["Hue", "\uC0C9\uC870"], Saturation: ["Saturation", "\uCC44\uB3C4"] },
    chroma: { Red: [/red/i, /\uBE68\uAC15|\uBE68\uAC04|\uC801/], Green: [/green/i, /\uCD08\uB85D|\uB179/], Blue: [/blue/i, /\uD30C\uB791|\uD30C\uB780|\uCCAD/] },
    post:  { Rate: ["Frame Rate", "\uD504\uB808\uC784 \uC18D\uB3C4"] },
    cpin:  { UL: [/upper left/i, /\uC67C\uCABD \uC704/, /\uC88C\uCE21 \uC0C1\uB2E8/, /\uC67C\uCABD \uC0C1\uB2E8/], UR: [/upper right/i, /\uC624\uB978\uCABD \uC704/, /\uC6B0\uCE21 \uC0C1\uB2E8/, /\uC624\uB978\uCABD \uC0C1\uB2E8/],
             LL: [/lower left/i, /\uC67C\uCABD \uC544\uB798/, /\uC88C\uCE21 \uD558\uB2E8/, /\uC67C\uCABD \uD558\uB2E8/], LR: [/lower right/i, /\uC624\uB978\uCABD \uC544\uB798/, /\uC6B0\uCE21 \uD558\uB2E8/, /\uC624\uB978\uCABD \uD558\uB2E8/] },
    lwipe: { Completion: ["Transition Completion", "\uC804\uD658 \uC644\uB8CC"], Angle: ["Wipe Angle", "\uB2E6\uC544\uB0B4\uAE30 \uAC01\uB3C4"], Feather: ["Feather", "\uD398\uB354", "\uBC1D\uC544\uC9C0\uAE30"] }
};
/* 변형(Transform) 효과의 속성 순서 */
var MK_TF = { pos: 1, uni: 2, scale: 3, sh: 3, sw: 4, rot: 7, op: 8, useComp: 9, shutter: 10 };

/* ---------- 작은 도구들 ---------- */
function mkJson(v) {
    var t = typeof v, i, out;
    if (v === null || v === undefined) return "null";
    if (t === "number") return isFinite(v) ? String(v) : "null";
    if (t === "boolean") return v ? "true" : "false";
    if (t === "string") {
        out = "";
        for (i = 0; i < v.length; i++) {
            var ch = v.charAt(i), code = v.charCodeAt(i);
            if (ch === "\"" || ch === "\\") out += "\\" + ch;
            else if (code < 32 || code > 126) { var h = code.toString(16); while (h.length < 4) h = "0" + h; out += "\\u" + h; }
            else out += ch;
        }
        return "\"" + out + "\"";
    }
    if (v instanceof Array) {
        out = [];
        for (i = 0; i < v.length; i++) out.push(mkJson(v[i]));
        return "[" + out.join(",") + "]";
    }
    out = [];
    for (var k in v) if (v.hasOwnProperty(k)) out.push(mkJson(String(k)) + ":" + mkJson(v[k]));
    return "{" + out.join(",") + "}";
}
function mkParse(s) { return eval("(" + s + ")"); }
function mkTime(ticks) { var t = new Time(); t.ticks = String(Math.round(ticks)); return t; }
function mkErr(code, msg) { return mkJson({ ok: false, err: code, msg: msg || "" }); }
function mkIn(arr, v) { for (var i = 0; i < arr.length; i++) if (arr[i] === v) return true; return false; }
function mkIsTF(m) { return MK_SPECS.tf.ok(String(m)); }
function mkSpeed(clip) { var s = 1; try { s = Math.abs(Number(clip.getSpeed())) || 1; } catch (e) { s = 1; } return s; }
function mkClipId(clip, t, c) {
    try { if (clip.nodeId) return String(clip.nodeId); } catch (e) {}
    return t + ":" + c + ":" + clip.start.ticks;
}
/* 효과 이름 쪼개기: 새 프리미어는 "색조 (Tint)", "가우시안 흐림(레거시) (Gaussian Blur (Legacy))" 처럼
 * 한글 (영문) 으로 이름을 준다 → [전체, 한글, 영문] */
function mkNameParts(n) {
    n = String(n);
    var out = [n], s = n.replace(/\s+$/, "");
    if (s.charAt(s.length - 1) === ")") {
        var depth = 0, i;
        for (i = s.length - 1; i >= 0; i--) {
            var ch = s.charAt(i);
            if (ch === ")") depth++;
            else if (ch === "(" && --depth === 0) break;
        }
        if (i > 0) {
            var a = s.substring(0, i).replace(/\s+$/, ""), b = s.substring(i + 1, s.length - 1).replace(/^\s+|\s+$/g, "");
            if (a) out.push(a);
            if (b) out.push(b);
        }
    }
    return out;
}
/* 이름이 이 효과인지: 0 = 이름이 딱 맞음, 1 = 비슷함(scan), -1 = 아님 */
function mkNameRank(spec, name) {
    var parts = mkNameParts(name), i, j, best = -1;
    for (i = 0; i < parts.length; i++) if (spec.not && spec.not.test(parts[i])) return -1;
    for (i = 0; i < parts.length; i++) {
        var low = parts[i].toLowerCase();
        for (j = 0; j < spec.names.length; j++) if (low === String(spec.names[j]).toLowerCase()) return 0;
        for (j = 0; j < spec.scan.length; j++) if (spec.scan[j].test(parts[i])) best = 1;
    }
    return best;
}
function mkScanName(spec, name) { return mkNameRank(spec, name) >= 0; }

function mkSelected(seq) {
    var out = [];
    for (var t = 0; t < seq.videoTracks.numTracks; t++) {
        var tr = seq.videoTracks[t];
        for (var c = 0; c < tr.clips.numItems; c++) {
            var cl = tr.clips[c];
            if (cl.isSelected()) out.push({ t: t, c: c, clip: cl });
        }
    }
    return out;
}

/* ---------- 1) 현재 상태 알려주기 ---------- */
function mk_context() {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        var tpf = Number(seq.timebase);
        var sel = mkSelected(seq), clips = [];
        for (var i = 0; i < sel.length; i++) {
            var cl = sel[i].clip;
            clips.push({ t: sel[i].t, c: sel[i].c, id: mkClipId(cl, sel[i].t, sel[i].c), name: String(cl.name), text: mkReadText(cl),
                below: mkFindBelow(seq, sel[i].t, cl, tpf),
                start: Number(cl.start.ticks), end: Number(cl.end.ticks), inPoint: Number(cl.inPoint.ticks), speed: mkSpeed(cl) });
        }
        return mkJson({ ok: true, fps: MK_TPS / tpf, tpf: tpf,
            w: Number(seq.frameSizeHorizontal), h: Number(seq.frameSizeVertical),
            ph: Number(seq.getPlayerPosition().ticks), clips: clips });
    } catch (e) { return mkErr("ex", String(e)); }
}

/* ---------- 효과 찾기 / 추가 ---------- */
function mkFindFx(clip, spec) {
    var idx = -1;
    for (var i = 0; i < clip.components.numItems; i++) if (mkIsSpec(clip.components[i], spec)) idx = i;
    return idx;   /* 여러 개면 맨 아래 것 */
}
function mkIsSpec(comp, spec) {
    var m = "", d = "";
    try { m = String(comp.matchName); } catch (e) {}
    try { d = String(comp.displayName); } catch (e2) {}
    if (m === "AE.ADBE Motion" || m === "AE.ADBE Opacity") return false;
    if (d && spec.not) { var dp = mkNameParts(d); for (var i = 0; i < dp.length; i++) if (spec.not.test(dp[i])) return false; }
    return spec.ok(m) || mkScanName(spec, d);
}
function mkQeTicks(it) {
    try { var v = Number(it.start.ticks); if (!isNaN(v)) return v; } catch (e) {}
    try { return Number(it.start.secs) * MK_TPS; } catch (e2) {}
    return NaN;
}
/* QE 트랙에는 빈 칸(Empty)도 섞여 있어서 시작 시간으로 같은 클립을 찾는다 */
function mkQeItem(qs, t, clip, tpf) {
    var qt = qs.getVideoTrackAt(t), target = Number(clip.start.ticks), best = null, bd = 1e30;
    for (var i = 0; i < qt.numItems; i++) {
        var it = qt.getItemAt(i);
        if (!it || it.type === "Empty") continue;
        var d = Math.abs(mkQeTicks(it) - target);
        if (it.type !== "Clip") d += tpf * 0.25;
        if (d < bd) { bd = d; best = it; }
    }
    return bd <= tpf ? best : null;
}
/* 효과 목록에서 이름 후보를 고른다: 딱 맞는 이름 → 비슷한 이름 → 기본 이름들 순 */
function mkCandidates(spec) {
    var exact = [], near = [], names = [], i;
    try {
        var list = qe.project.getVideoEffectList();
        list = (typeof list === "string") ? list.split(",") : list;
        for (i = 0; i < list.length; i++) {
            var n = String(list[i]), r = mkNameRank(spec, n);
            if (r === 0) exact.push(n); else if (r === 1) near.push(n);
        }
    } catch (e) {}
    /* 레거시가 아닌 쪽을 먼저 */
    near.sort(function (a, b) { return (/legacy|\uB808\uAC70\uC2DC/i.test(a) ? 1 : 0) - (/legacy|\uB808\uAC70\uC2DC/i.test(b) ? 1 : 0); });
    for (i = 0; i < exact.length; i++) if (!mkIn(names, exact[i])) names.push(exact[i]);
    for (i = 0; i < near.length; i++) if (!mkIn(names, near[i])) names.push(near[i]);
    for (i = 0; i < spec.names.length; i++) if (!mkIn(names, spec.names[i])) names.push(spec.names[i]);
    return names;
}
function mkMatchNames(clip) {
    var r = [];
    for (var i = 0; i < clip.components.numItems; i++) r.push(String(clip.components[i].matchName));
    return r;
}
/* 효과를 추가하고 그 컴포넌트 번호를 돌려준다 (-1 = 실패) */
function mkAddFx(seq, qs, t, c, tpf, spec) {
    var names = mkCandidates(spec);
    for (var n = 0; n < names.length && n < 8; n++) {
        var fx = null;
        try { fx = qe.project.getVideoEffectByName(names[n]); } catch (e) { fx = null; }
        if (!fx) continue;
        var clip = seq.videoTracks[t].clips[c];
        var qi = mkQeItem(qs, t, clip, tpf);
        if (!qi) return -1;
        var before = mkMatchNames(clip);
        try { qi.addVideoEffect(fx); } catch (e2) { continue; }
        clip = seq.videoTracks[t].clips[c];
        var after = mkMatchNames(clip), idx = -1;
        for (var i = 0; i < after.length; i++) {
            if (i >= before.length || after[i] !== before[i]) { idx = i; break; }
        }
        if (idx >= 0 && mkIsSpec(clip.components[idx], spec)) return idx;
        /* 이름만 같은 다른 효과였다면 다시 뺀다 */
        if (idx >= 0) { try { qi.getComponentAt(idx).remove(); } catch (e3) {} }
    }
    return -1;
}
/* 있으면 재사용, 없으면 추가. { ci, fresh } */
function mkEnsure(seq, qs, t, c, tpf, spec) {
    var clip = seq.videoTracks[t].clips[c];
    var ci = mkFindFx(clip, spec);
    if (ci >= 0) return { ci: ci, fresh: false };
    if (!qs) return { ci: -1, err: "noqe" };
    ci = mkAddFx(seq, qs, t, c, tpf, spec);
    return { ci: ci, fresh: true, err: ci < 0 ? "nofx" : "" };
}

/* ---------- 2) 프리셋 적용 ---------- */
function mkDefault(prop) {
    if (prop === "pos") return [0.5, 0.5];
    if (prop === "rot") return 0;
    return 100;
}
function mkConv(prop, base, v) {
    if (prop === "pos") return [base[0] + v[0], base[1] + v[1]];
    if (prop === "rot") return base + v;
    return base * v / 100;            /* scale, sw, sh, op */
}
function mkSet(prm, value) {
    try { prm.setValue(value, 1); return true; } catch (e) { return false; }
}
/* 키 목록(클립 기준 프레임) 또는 고정값을 속성 하나에 쓴다 */
function mkWrite(prm, ent, conv, inP, spd, tpf) {
    if (ent.value && ent.value.color) {          /* 색상 값 [a, r, g, b] */
        var cv = ent.value.color;
        try { prm.setTimeVarying(false); } catch (e0) {}
        try { prm.setColorValue(cv[0], cv[1], cv[2], cv[3], 1); } catch (e00) {}
        return;
    }
    if (ent.value !== undefined) {
        try { prm.setTimeVarying(false); } catch (e1) {}
        mkSet(prm, conv(ent.value));
        return;
    }
    var ks = ent.keys;
    var first = inP + ks[0][0] * tpf * spd, last = inP + ks[ks.length - 1][0] * tpf * spd;
    try {
        if (prm.isTimeVarying()) prm.removeKeyRange(mkTime(first - tpf * 0.5), mkTime(last + tpf * 0.5), false);
    } catch (e2) {}
    try { prm.setTimeVarying(true); } catch (e3) {}
    for (var k = 0; k < ks.length; k++) {
        var tm = mkTime(inP + ks[k][0] * tpf * spd);
        prm.addKey(tm);
        prm.setValueAtKey(tm, conv(ks[k][1]), k === ks.length - 1 ? 1 : 0);
        /* 0 = 선형, 4 = 홀드(계단형: 타이핑/글리치/깜빡임) */
        try { prm.setInterpolationTypeAtKey(tm, ks[k][2] ? 4 : 0, 0); } catch (e4) {}
    }
}
function mkSame(v) { return v; }
function mkParamFor(props, fx, name, idx) {
    var names = (MK_PNAMES[fx] && name) ? MK_PNAMES[fx][name] : null, i;
    if (names) {
        for (i = 0; i < props.numItems; i++) {
            var dn = "";
            try { dn = String(props[i].displayName); } catch (e) { dn = ""; }
            for (var j = 0; j < names.length; j++) {
                var nmj = names[j];
                if (typeof nmj === "string" ? nmj === dn : nmj.test(dn)) return props[i];
            }
        }
    }
    return (idx !== undefined && idx < props.numItems) ? props[idx] : null;
}

function mkGetter(props, fx) {
    return function (name, idx) { return mkParamFor(props, fx, name, idx); };
}
/* 자르기 대상 찾기:
 * 1) 클립에 이미 있는 자르기 효과  2) 새 프리미어(25.2+) 모션 안의 기본 자르기  3) 자르기 효과 추가
 * 반환 { get(name, idx), via: "fx" | "motion" } 또는 null */
var MK_SIDES = {
    Left: /left|\uC67C\uCABD/i, Top: /top|\uC704\uCABD|^\uC704$/i, Right: /right|\uC624\uB978\uCABD/i, Bottom: /bottom|\uC544\uB798\uCABD|^\uC544\uB798$/i
};
function mkCropTarget(seq, qs, t, c, tpf, fxOnly) {
    var clip = seq.videoTracks[t].clips[c];
    var ci = mkFindFx(clip, MK_SPECS.crop);
    if (ci >= 0) return { get: mkGetter(clip.components[ci].properties, "crop"), via: "fx" };
    /* 모션 안의 기본 자르기 (새 프리미어) — 효과 순서가 중요할 땐(곡선 차오르기) 쓰지 않음 */
    for (var i = 0; i < clip.components.numItems && !fxOnly; i++) {
        var comp = clip.components[i];
        if (String(comp.matchName) !== "AE.ADBE Motion") continue;
        var found = {}, n = 0, zone = false;
        for (var j = 0; j < comp.properties.numItems; j++) {
            var dn = "";
            try { dn = String(comp.properties[j].displayName); } catch (e) { dn = ""; }
            if (/crop|\uC790\uB974\uAE30/i.test(dn) || /^(left|top|right|bottom|\uC67C\uCABD|\uC704\uCABD|\uC624\uB978\uCABD|\uC544\uB798\uCABD)$/i.test(dn)) zone = true;
            if (!zone) continue;
            for (var side in MK_SIDES) if (!found[side] && MK_SIDES[side].test(dn)) { found[side] = comp.properties[j]; n++; }
        }
        if (n >= 4) return { get: function (name) { return found[name] || null; }, via: "motion" };
    }
    if (!qs) return null;
    ci = mkAddFx(seq, qs, t, c, tpf, MK_SPECS.crop);
    if (ci >= 0) return { get: mkGetter(seq.videoTracks[t].clips[c].components[ci].properties, "crop"), via: "fx" };
    return null;
}
/* 자르기 키(한 방향) → 선형 닦아내기 { 완료 %, 각도 } */
function mkCropToWipe(params) {
    var ANG = { Right: 270, Left: 90, Top: 180, Bottom: 0 }, keyed = null, i;
    for (i = 0; i < params.length; i++) if (params[i].keys && ANG[params[i].n] !== undefined) { keyed = params[i]; break; }
    if (!keyed) for (i = 0; i < params.length; i++) if (params[i].value > 0 && ANG[params[i].n] !== undefined) { keyed = params[i]; break; }
    if (!keyed) return null;
    var out = [{ n: "Angle", i: 1, value: ANG[keyed.n] }, { n: "Feather", i: 2, value: 0 }];
    var cp = { n: "Completion", i: 0 };
    if (keyed.keys) cp.keys = keyed.keys; else cp.value = keyed.value;
    out.push(cp);
    return out;
}

/* 텍스트(그래픽) 클립의 글자 읽기 — 버전에 따라 안 될 수 있음 (그럴 땐 빈 문자열) */
function mkReadText(clip) {
    try {
        for (var i = 0; i < clip.components.numItems; i++) {
            var comp = clip.components[i];
            for (var j = 0; j < comp.properties.numItems; j++) {
                var p = comp.properties[j], dn = "";
                try { dn = String(p.displayName); } catch (e0) { dn = ""; }
                if (!/^(source text|\uC6D0\uBCF8 \uD14D\uC2A4\uD2B8|\uC18C\uC2A4 \uD14D\uC2A4\uD2B8)$/i.test(dn)) continue;
                var v = null;
                try { v = p.getValue(); } catch (e1) { v = null; }
                if (typeof v !== "string") continue;
                var m = v.match(/"(?:mTextEditValue|textEditValue|mText)"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                if (m) { try { return String(eval("\"" + m[1] + "\"")); } catch (e2) { return m[1]; } }
            }
        }
    } catch (e) {}
    return "";
}

/* 아래 트랙에서 같은 시간에 놓인 원본(복제 전) 클립 찾기 → 트랙 번호, 없으면 -1 */
function mkFindBelow(seq, t, clip, tpf) {
    var s0 = Number(clip.start.ticks), e0 = Number(clip.end.ticks), nm = "", loose = -1;
    try { nm = String(clip.name); } catch (e) { nm = ""; }
    for (var tt = t - 1; tt >= 0; tt--) {
        var tr = seq.videoTracks[tt];
        for (var c = 0; c < tr.clips.numItems; c++) {
            var o = tr.clips[c], s1 = Number(o.start.ticks), e1 = Number(o.end.ticks);
            if (e1 <= s0 || s1 >= e0) continue;
            if (Math.abs(s1 - s0) <= tpf * 2 && Math.abs(e1 - e0) <= tpf * 2) return tt;     /* 같은 자리 복제 */
            var on = "";
            try { on = String(o.name); } catch (e2) { on = ""; }
            if (loose < 0 && nm && on === nm) loose = tt;                                     /* 길이만 다른 같은 자막 */
        }
    }
    return loose;
}
/* 트랙 매트 키: 매트 = 원본 트랙, 합성 = 매트 루마(흰 글자만, 검은 테두리는 그대로) */
function mkWriteMatte(seq, qs, t, c, tpf, bt, params) {
    var clip = seq.videoTracks[t].clips[c];
    var old = mkFindFx(clip, MK_SPECS.tmk);
    if (old >= 0 && qs) {   /* 기본값을 기준으로 번호를 맞추려고 새로 넣는다 */
        var qi = mkQeItem(qs, t, clip, tpf);
        try { if (qi) qi.getComponentAt(old).remove(); } catch (e0) {}
    }
    var en = mkEnsure(seq, qs, t, c, tpf, MK_SPECS.tmk);
    if (en.ci < 0) return false;
    var get = mkGetter(seq.videoTracks[t].clips[c].components[en.ci].properties, "tmk");
    for (var i = 0; i < params.length; i++) {
        var pr = params[i], prm = get(pr.n, pr.i);
        if (!prm) continue;
        var v0 = 0;
        try { v0 = prm.getValue(); } catch (e1) { v0 = 0; }
        if (typeof v0 !== "number") v0 = (v0 === true) ? 1 : 0;
        try { prm.setTimeVarying(false); } catch (e2) {}
        if (pr.n === "Matte") mkSet(prm, v0 + bt + 1);              /* 기본 "없음" 다음이 비디오 1, 2, … */
        else if (pr.n === "Composite") mkSet(prm, pr.value === "luma" ? v0 + 1 : v0);
        else if (pr.value !== undefined) mkSet(prm, pr.value);
    }
    return true;
}

/* plans: [{ t, c, shutter, uniform, props:{ prop:{keys}|{value} }, fx:[{ fx, params:[{ i, keys|value }] }] }] */
function mk_apply(json) {
    try {
        var plans = mkParse(json);
        var seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        var tpf = Number(seq.timebase), qs = null;
        try { app.enableQE(); qs = qe.project.getActiveSequence(); } catch (e) { qs = null; }
        var done = 0, failed = [], missing = [], written = 0, notes = [];
        for (var p = 0; p < plans.length; p++) {
            var pl = plans[p];
            if (!seq.videoTracks[pl.t].clips[pl.c]) { failed.push("clip"); continue; }
            var clip0 = seq.videoTracks[pl.t].clips[pl.c];
            var inP = Number(clip0.inPoint.ticks), spd = mkSpeed(clip0);
            /* 복제본용 효과: 아래 트랙의 원본 확인 */
            var bt = pl.below ? mkFindBelow(seq, pl.t, clip0, tpf) : -1;
            if (pl.below === "need" && bt < 0) { failed.push("nobelow"); continue; }
            if (pl.below === "check" && bt < 0 && !mkIn(notes, "nodup")) notes.push("nodup");

            /* (1) 추가 효과 먼저 — 자르기/흐림/난류/방향 흐림 */
            var fxl = pl.fx || [];
            for (var x = 0; x < fxl.length; x++) {
                var fxid = fxl[x].fx, params = fxl[x].params, getter = null;
                if (!MK_SPECS[fxid]) continue;
                if (fxid === "tmk") {
                    if (!mkWriteMatte(seq, qs, pl.t, pl.c, tpf, bt, params)) { if (!mkIn(missing, "tmk")) missing.push("tmk"); }
                    else written++;
                    continue;
                }
                if (fxid === "crop") {
                    var ct = mkCropTarget(seq, qs, pl.t, pl.c, tpf, !!fxl[x].fxOnly);
                    if (ct) { getter = ct.get; if (ct.via !== "fx" && !mkIn(notes, ct.via)) notes.push(ct.via); }
                    else {
                        /* 자르기를 못 쓰면 선형 닦아내기로 같은 움직임 */
                        var lw = mkCropToWipe(params);
                        var en0 = lw ? mkEnsure(seq, qs, pl.t, pl.c, tpf, MK_SPECS.lwipe) : { ci: -1 };
                        if (en0.ci < 0) { if (!mkIn(missing, "crop")) missing.push("crop"); continue; }
                        fxid = "lwipe"; params = lw; if (!mkIn(notes, "lwipe")) notes.push("lwipe");
                        getter = mkGetter(seq.videoTracks[pl.t].clips[pl.c].components[en0.ci].properties, "lwipe");
                    }
                } else {
                    var en = mkEnsure(seq, qs, pl.t, pl.c, tpf, MK_SPECS[fxid]);
                    if (en.ci < 0) { if (!mkIn(missing, fxid)) missing.push(fxid); continue; }
                    getter = mkGetter(seq.videoTracks[pl.t].clips[pl.c].components[en.ci].properties, fxid);
                }
                for (var q = 0; q < params.length; q++) {
                    var pr = params[q];
                    var target = getter(pr.n, pr.i);
                    if (!target) continue;
                    mkWrite(target, pr, mkSame, inP, spd, tpf);
                    written++;
                }
            }

            /* (2) 변형(Transform) 효과 — 위치/비율/회전/불투명도 */
            var needTF = false;
            for (var nm in pl.props) if (pl.props.hasOwnProperty(nm)) needTF = true;
            if (needTF) {
                var tf = mkEnsure(seq, qs, pl.t, pl.c, tpf, MK_SPECS.tf);
                if (tf.ci < 0) { failed.push(tf.err === "noqe" ? "noqe" : "notf"); continue; }
                var props = seq.videoTracks[pl.t].clips[pl.c].components[tf.ci].properties;
                if (props.numItems < 11) { failed.push("tfprops"); continue; }
                /* 기준점(확대·회전 중심): 기준점과 위치 기본값을 같은 점으로 */
                var pv = (pl.pivot && pl.pivot.length === 2) ? [pl.pivot[0], pl.pivot[1]] : [0.5, 0.5];
                try { if (!props[0].isTimeVarying()) mkSet(props[0], pv); } catch (eA) {}
                /* 위치를 안 쓰는 효과도 위치 = 기준점 으로 맞춰야 화면이 밀리지 않음 */
                if (!pl.props.pos) { try { if (!props[MK_TF.pos].isTimeVarying()) mkSet(props[MK_TF.pos], pv); } catch (eB) {} }
                mkSet(props[MK_TF.uni], pl.uniform ? true : false);
                mkSet(props[MK_TF.useComp], false);
                mkSet(props[MK_TF.shutter], pl.shutter || 0);
                for (var name in pl.props) {
                    if (!pl.props.hasOwnProperty(name) || MK_TF[name] === undefined) continue;
                    var prm = props[MK_TF[name]];
                    var base = name === "pos" ? pv : mkDefault(name);
                    if (!tf.fresh && name !== "pos") {
                        try { if (!prm.isTimeVarying()) base = prm.getValue(); } catch (e4) {}
                        if (typeof base !== "number") base = mkDefault(name);
                    }
                    (function (nm2, b2) {
                        mkWrite(prm, pl.props[nm2], function (v) { return mkConv(nm2, b2, v); }, inP, spd, tpf);
                    })(name, base);
                }
            }
            done++;
        }
        return mkJson({ ok: true, done: done, failed: failed, missing: missing, written: written, notes: notes });
    } catch (e) { return mkErr("ex", String(e)); }
}

/* ---------- 3) 커브 탭: 키프레임 읽기 / 쓰기 ---------- */
function mkKind(match, pi) {
    if (match === "AE.ADBE Motion") return pi === 0 ? "pos" : (pi === 1 || pi === 2) ? "scale" : pi === 4 ? "rot" : "other";
    if (match === "AE.ADBE Opacity") return pi === 0 ? "op" : "other";
    if (mkIsTF(match)) return pi === 1 ? "pos" : (pi === 3 || pi === 4) ? "scale" : pi === 7 ? "rot" : pi === 8 ? "op" : "other";
    return "other";
}
function mkVal(v) {
    if (typeof v === "number") return v;
    if (v instanceof Array && v.length === 2 && typeof v[0] === "number") return [v[0], v[1]];
    return null;
}
function mk_readKeys() {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        var sel = mkSelected(seq), clips = [];
        for (var s = 0; s < sel.length; s++) {
            var clip = sel[s].clip, params = [];
            for (var ci = 0; ci < clip.components.numItems; ci++) {
                var comp = clip.components[ci], match = String(comp.matchName);
                for (var pi = 0; pi < comp.properties.numItems; pi++) {
                    var prm = comp.properties[pi], tv = false;
                    try { tv = prm.isTimeVarying(); } catch (e) { tv = false; }
                    if (!tv) continue;
                    var raw = null;
                    try { raw = prm.getKeys(); } catch (e2) { raw = null; }
                    if (!raw || raw.length < 2) continue;
                    var keys = [], okv = true;
                    for (var k = 0; k < raw.length; k++) {
                        var tk = (typeof raw[k] === "object") ? Number(raw[k].ticks) : Number(raw[k]) * MK_TPS;
                        var v = null;
                        try { v = mkVal(prm.getValueAtKey(raw[k])); } catch (e3) { v = null; }
                        if (v === null) { okv = false; break; }
                        keys.push([tk, v]);
                    }
                    var cn = "", pn = "";
                    try { cn = String(comp.displayName); } catch (e5) { cn = ""; }
                    try { pn = String(prm.displayName); } catch (e6) { pn = ""; }
                    if (okv) params.push({ ci: ci, pi: pi, kind: mkKind(match, pi), keys: keys, cn: cn, pn: pn });
                }
            }
            var phSeq = Number(seq.getPlayerPosition().ticks);
            clips.push({ id: mkClipId(clip, sel[s].t, sel[s].c), t: sel[s].t, c: sel[s].c, speed: mkSpeed(clip), params: params, name: String(clip.name || ''),
                ph: Number(clip.inPoint.ticks) + (phSeq - Number(clip.start.ticks)) * mkSpeed(clip) });
        }
        return mkJson({ ok: true, tpf: Number(seq.timebase), clips: clips });
    } catch (e) { return mkErr("ex", String(e)); }
}

/* writes: [{ t, c, ci, pi, remove:[ticks], set:[[ticks, value]] }] */
function mk_writeKeys(json) {
    try {
        var writes = mkParse(json);
        var seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        var n = 0;
        for (var w = 0; w < writes.length; w++) {
            var wr = writes[w];
            var prm = seq.videoTracks[wr.t].clips[wr.c].components[wr.ci].properties[wr.pi];
            for (var r = 0; r < wr.remove.length; r++) { try { prm.removeKey(mkTime(wr.remove[r])); } catch (e) {} }
            for (var k = 0; k < wr.set.length; k++) {
                var tm = mkTime(wr.set[k][0]);
                try { prm.addKey(tm); } catch (e2) {}
                prm.setValueAtKey(tm, wr.set[k][1], k === wr.set.length - 1 ? 1 : 0);
                try { prm.setInterpolationTypeAtKey(tm, 0, 0); } catch (e3) {}
            }
            n++;
        }
        return mkJson({ ok: true, done: n });
    } catch (e) { return mkErr("ex", String(e)); }
}

/* ---------- 4) 선택 클립의 모션 효과 지우기 ----------
 * 변형은 항상 지우고, 자르기/흐림/난류/방향 흐림은 키프레임이 있는 것만 지운다
 * (직접 넣어 둔 고정 자르기 등은 남김)
 */
function mkHasKeys(comp) {
    for (var i = 0; i < comp.properties.numItems; i++) {
        try { if (comp.properties[i].isTimeVarying()) return true; } catch (e) {}
    }
    return false;
}
function mk_clear() {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        var tpf = Number(seq.timebase), qs = null;
        try { app.enableQE(); qs = qe.project.getActiveSequence(); } catch (e) { qs = null; }
        var sel = mkSelected(seq), removed = 0, reset = 0, kinds = ["tf", "crop", "gblur", "turb", "dblur", "wwarp", "lwipe", "tint", "bc", "proc", "chroma", "post", "ramp", "tmk", "cpin"],
            FILLKIND = { tint: 1, ramp: 1, tmk: 1, wwarp: 1 };
        for (var s = 0; s < sel.length; s++) {
            var clip = sel[s].clip;
            var qi = qs ? mkQeItem(qs, sel[s].t, clip, tpf) : null;
            var qnames = [];
            if (qi) { try { for (var q = 0; q < qi.numComponents; q++) qnames.push(String(qi.getComponentAt(q).name)); } catch (e2) { qnames = []; } }
            var kill = [];          /* 지울 QE 번호들 */
            /* 색 차오르기(자르기 키 + 색조/경사/매트)는 키가 없는 색 효과까지 같이 지운다 */
            var cropKeyed = false;
            for (var ck = 0; ck < clip.components.numItems; ck++)
                if (MK_SPECS.crop.ok(String(clip.components[ck].matchName)) && mkHasKeys(clip.components[ck])) cropKeyed = true;
            for (var k = 0; k < kinds.length; k++) {
                var spec = MK_SPECS[kinds[k]], dom = [], qe2 = [], i;
                for (i = 0; i < clip.components.numItems; i++) if (spec.ok(String(clip.components[i].matchName))) dom.push(i);
                if (!dom.length) continue;
                for (i = 0; i < qnames.length; i++) if (mkScanName(spec, qnames[i])) qe2.push(i);
                if (qi && qe2.length === dom.length) {
                    for (i = 0; i < dom.length; i++) {
                        if (kinds[k] === "tf" || mkHasKeys(clip.components[dom[i]]) || (cropKeyed && FILLKIND[kinds[k]])) kill.push(qe2[i]);
                    }
                } else if (kinds[k] === "tf") {
                    /* 안전하게 못 지우면 값만 기본으로 되돌린다 */
                    for (i = 0; i < dom.length; i++) {
                        var pr = clip.components[dom[i]].properties, list = ["pos", "scale", "sw", "rot", "op"];
                        for (var l = 0; l < list.length; l++) {
                            try { pr[MK_TF[list[l]]].setTimeVarying(false); } catch (e4) {}
                            mkSet(pr[MK_TF[list[l]]], mkDefault(list[l]));
                        }
                        mkSet(pr[MK_TF.uni], true);
                        mkSet(pr[MK_TF.shutter], 0);
                        reset++;
                    }
                }
            }
            kill.sort(function (a, b) { return b - a; });
            for (var x = 0; x < kill.length; x++) { try { qi.getComponentAt(kill[x]).remove(); removed++; } catch (e3) {} }
        }
        return mkJson({ ok: true, removed: removed, reset: reset, clips: sel.length });
    } catch (e) { return mkErr("ex", String(e)); }
}

/* ---------- 타이핑 영역 보기: 프로그램 모니터에서 글자 범위를 확인 ----------
 * json: { L: 왼쪽 경계 %, R: 오른쪽 경계 %, on: true/false }
 * 켜면 범위 밖을 잘라서 보여주고, 끄면 자르기를 0 으로 되돌린다.
 */
function mk_typingFrame(json) {
    try {
        var o = mkParse(json);
        var seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        var tpf = Number(seq.timebase), qs = null;
        try { app.enableQE(); qs = qe.project.getActiveSequence(); } catch (e) { qs = null; }
        var sel = mkSelected(seq), n = 0, nofx = 0;
        for (var s = 0; s < sel.length; s++) {
            var ct = mkCropTarget(seq, o.on ? qs : null, sel[s].t, sel[s].c, tpf);
            if (!ct) { if (o.on) nofx++; continue; }
            var vals = o.on ? { Left: o.L, Right: 100 - o.R, Top: 0, Bottom: 0 } : { Left: 0, Right: 0 };
            for (var k in vals) {
                var prm = ct.get(k, { Left: 0, Top: 1, Right: 2, Bottom: 3 }[k]);
                if (!prm) continue;
                try { prm.setTimeVarying(false); } catch (e2) {}
                mkSet(prm, vals[k]);
            }
            n++;
        }
        return mkJson({ ok: true, done: n, clips: sel.length, nofx: nofx });
    } catch (e) { return mkErr("ex", String(e)); }
}

/* ---------- 기준점 바꾸기: 이미 넣은 모션에도 바로 반영 ----------
 * json: { pivot: [x, y] (0~1) }  변형 효과의 기준점을 옮기고, 위치도 같은 만큼 옮겨서 화면이 튀지 않게 한다.
 */
function mk_setPivot(json) {
    try {
        var o = mkParse(json), pv = o.pivot;
        var seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        var sel = mkSelected(seq), n = 0;
        for (var s = 0; s < sel.length; s++) {
            var clip = sel[s].clip, ci = mkFindFx(clip, MK_SPECS.tf);
            if (ci < 0) continue;
            var props = clip.components[ci].properties;
            if (props.numItems < 11) continue;
            var an = props[0], pos = props[MK_TF.pos], old = null;
            try { if (!an.isTimeVarying()) old = an.getValue(); } catch (e0) { old = null; }
            if (!(old instanceof Array) || old.length < 2) continue;
            var dx = pv[0] - old[0], dy = pv[1] - old[1];
            if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) { n++; continue; }
            mkSet(an, [pv[0], pv[1]]);
            var tv = false;
            try { tv = pos.isTimeVarying(); } catch (e1) { tv = false; }
            if (tv) {
                var keys = null;
                try { keys = pos.getKeys(); } catch (e2) { keys = null; }
                for (var k = 0; keys && k < keys.length; k++) {
                    try {
                        var v = pos.getValueAtKey(keys[k]);
                        pos.setValueAtKey(keys[k], [v[0] + dx, v[1] + dy], k === keys.length - 1 ? 1 : 0);
                    } catch (e3) {}
                }
            } else {
                try { var pv0 = pos.getValue(); mkSet(pos, [pv0[0] + dx, pv0[1] + dy]); } catch (e4) {}
            }
            n++;
        }
        return mkJson({ ok: true, done: n, clips: sel.length });
    } catch (e) { return mkErr("ex", String(e)); }
}

/* ---------- 모션블러 (Super Pad 방식): 모션(Motion) 애니메이션을 변형(Transform) 효과로 옮기고 셔터 180° ----------
 * 이미 변형 효과로 움직이는 클립은 셔터만 켠다. 영상 크기가 시퀀스와 다르면(축소·확대한 소스) 옮기면 화면이 달라져서 하지 않는다.
 */
function mkKeysOf(prm) {
    var out = [], raw = null;
    try { if (!prm.isTimeVarying()) return null; raw = prm.getKeys(); } catch (e) { return null; }
    for (var k = 0; raw && k < raw.length; k++) {
        var v = null;
        try { v = prm.getValueAtKey(raw[k]); } catch (e2) { v = null; }
        out.push([raw[k], v]);
    }
    return out;
}
function mkNear(a, b, tol) {
    if (a && typeof a === "object" && a.length !== undefined) return b && typeof b === "object" && Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol;
    return Math.abs(Number(a) - Number(b)) <= tol;
}
function mk_motionBlur(json) {
    try {
        var o = json ? mkParse(json) : {}, shutter = o.shutter || 180;
        var seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        var tpf = Number(seq.timebase), qs = null;
        try { app.enableQE(); qs = qe.project.getActiveSequence(); } catch (e0) { qs = null; }
        var sel = mkSelected(seq), moved = 0, blurred = 0, skipped = [];
        for (var s = 0; s < sel.length; s++) {
            var clip = sel[s].clip, mo = mkMotionComp(clip);
            /* 모션 키 모으기: 위치0 비율1 폭2 균일3 회전4 기준점5 */
            var MAP = [[0, 1, "pos"], [1, 3, "scale"], [2, 4, "sw"], [4, 7, "rot"], [5, 0, "anchor"]], keyed = [], i;
            if (mo) for (i = 0; i < MAP.length; i++) { var ks = mkKeysOf(mo.properties[MAP[i][0]]); if (ks && ks.length) keyed.push({ m: MAP[i], keys: ks }); }
            var tfi = mkFindFx(clip, MK_SPECS.tf), tfKeyed = false;
            if (tfi >= 0) { var tp = clip.components[tfi].properties; for (i = 0; i < tp.numItems; i++) { try { if (tp[i].isTimeVarying()) tfKeyed = true; } catch (e1) {} } }
            if (!keyed.length) {
                if (tfi >= 0 && tfKeyed) {     /* 이미 변형 효과로 움직임 → 셔터만 */
                    var pr0 = clip.components[tfi].properties;
                    mkSet(pr0[MK_TF.useComp], false); mkSet(pr0[MK_TF.shutter], shutter); blurred++;
                } else skipped.push("nokeys");
                continue;
            }
            if (tfKeyed) { skipped.push("hastf"); continue; }
            var lay = mkLayerSize(clip, seq);
            if (lay.src === "meta" && (Math.abs(lay.w - Number(seq.frameSizeHorizontal)) > 1 || Math.abs(lay.h - Number(seq.frameSizeVertical)) > 1)) { skipped.push("size"); continue; }
            /* 키가 없는 모션 값이 기본값이 아니면(위치를 옮겨 둔 클립 등) 옮기지 않는다 */
            var DEF = [[0, [0.5, 0.5]], [1, 100], [4, 0], [5, [0.5, 0.5]]], bad = false;
            for (i = 0; i < DEF.length; i++) {
                var pp = mo.properties[DEF[i][0]], tv = false;
                try { tv = pp.isTimeVarying(); } catch (e2) { tv = false; }
                if (tv) continue;
                var cur = null;
                try { cur = pp.getValue(); } catch (e3) { cur = null; }
                if (cur !== null && !mkNear(cur, DEF[i][1], 0.002)) bad = true;
            }
            if (bad) { skipped.push("static"); continue; }
            var en = mkEnsure(seq, qs, sel[s].t, sel[s].c, tpf, MK_SPECS.tf);
            if (en.ci < 0) { skipped.push("notf"); continue; }
            clip = seq.videoTracks[sel[s].t].clips[sel[s].c];
            mo = mkMotionComp(clip);
            var tf = clip.components[en.ci].properties, uni = true;
            try { uni = mo.properties[3].getValue() ? true : false; } catch (e4) { uni = true; }
            mkSet(tf[0], [0.5, 0.5]); mkSet(tf[MK_TF.pos], [0.5, 0.5]); mkSet(tf[MK_TF.uni], uni);
            for (i = 0; i < keyed.length; i++) {
                var dst = tf[keyed[i].m[1]], kk = keyed[i].keys;
                try { dst.setTimeVarying(true); } catch (e5) {}
                for (var k = 0; k < kk.length; k++) {
                    try { dst.addKey(kk[k][0]); } catch (e6) {}
                    try { dst.setValueAtKey(kk[k][0], kk[k][1], k === kk.length - 1 ? 1 : 0); } catch (e7) {}
                    try { dst.setInterpolationTypeAtKey(kk[k][0], 0, 0); } catch (e8) {}
                }
                /* 모션 쪽은 키를 지우고 기본값으로 */
                var src = mo.properties[keyed[i].m[0]];
                try { src.setTimeVarying(false); } catch (e9) {}
                mkSet(src, keyed[i].m[2] === "pos" || keyed[i].m[2] === "anchor" ? [0.5, 0.5] : keyed[i].m[2] === "rot" ? 0 : 100);
            }
            mkSet(tf[MK_TF.useComp], false); mkSet(tf[MK_TF.shutter], shutter);
            moved++;
        }
        return mkJson({ ok: true, moved: moved, blurred: blurred, skipped: skipped, clips: sel.length });
    } catch (e) { return mkErr("ex", String(e)); }
}

/* ---------- 조정 레이어 / 검은 화면 넣기 ----------
 * json: { kind: "adjust" | "black", png: 검은 화면 그림 경로, dur: 선택이 없을 때 길이(초) }
 * 선택한 클립마다 그 시작~끝 그대로, 그 구간에 아무것도 없는 위쪽 트랙에 넣는다 (없으면 트랙 추가).
 * 선택이 없으면 재생헤드부터 dur 초.
 */
function mkItemsDeep(item, out) {
    out = out || [];
    try {
        for (var i = 0; i < item.children.numItems; i++) {
            var it = item.children[i];
            out.push(it);
            if (it.type === 2 /* BIN */) mkItemsDeep(it, out);
        }
    } catch (e) {}
    return out;
}
function mkIsAdjust(it) {
    try { if (it.isAdjustmentLayer && it.isAdjustmentLayer()) return true; } catch (e) {}
    var n = "";
    try { n = String(it.name); } catch (e2) { n = ""; }
    return it.type === 1 && /^(adjustment layer|\uC870\uC815 \uB808\uC774\uC5B4)(\s*\d*)?$/i.test(n);
}
function mkBin(name) {
    var root = app.project.rootItem;
    for (var i = 0; i < root.children.numItems; i++) if (root.children[i].type === 2 && String(root.children[i].name) === name) return root.children[i];
    try { var b = root.createBin(name); if (b) return b; } catch (e) {}
    for (var j = 0; j < root.children.numItems; j++) if (root.children[j].type === 2 && String(root.children[j].name) === name) return root.children[j];
    return root;
}
function mkFree(tr, s0, e0) {
    for (var c = 0; c < tr.clips.numItems; c++) {
        var cl = tr.clips[c];
        if (Number(cl.end.ticks) > s0 && Number(cl.start.ticks) < e0) return false;
    }
    return true;
}
/* 구간 위에서 비어 있는 트랙: 그 구간에 클립이 있는 가장 위 트랙보다 위쪽에서 찾는다 */
function mkFreeTrackAbove(seq, s0, e0, minT) {
    var top = minT - 1, t;
    for (t = 0; t < seq.videoTracks.numTracks; t++) if (!mkFree(seq.videoTracks[t], s0, e0)) top = Math.max(top, t);
    for (t = top + 1; t < seq.videoTracks.numTracks; t++) if (mkFree(seq.videoTracks[t], s0, e0)) return t;
    /* 빈 트랙이 없으면 맨 위에 하나 추가 */
    var n0 = seq.videoTracks.numTracks;
    try { app.enableQE(); qe.project.getActiveSequence().addTracks(1, n0, 0); } catch (e) {}
    seq = app.project.activeSequence;
    return seq.videoTracks.numTracks > n0 ? seq.videoTracks.numTracks - 1 : -1;
}
function mk_insertLayer(json) {
    try {
        var o = mkParse(json);
        var seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        var tpf = Number(seq.timebase), item = null, i;
        if (o.kind === "adjust") {
            var all = mkItemsDeep(app.project.rootItem);
            for (i = 0; i < all.length && !item; i++) if (mkIsAdjust(all[i])) item = all[i];
            if (!item) {   /* 새로 만들 수 있는 버전이면 만든다 */
                try { if (app.project.createNewAdjustmentLayer) item = app.project.createNewAdjustmentLayer(); } catch (eA) { item = null; }
                if (!item) { all = mkItemsDeep(app.project.rootItem); for (i = 0; i < all.length && !item; i++) if (mkIsAdjust(all[i])) item = all[i]; }
            }
            if (!item) return mkErr("noadjust");
        } else {
            var name = String(o.png || "").replace(/^.*[\\\/]/, "");
            var all2 = mkItemsDeep(app.project.rootItem);
            for (i = 0; i < all2.length && !item; i++) { try { if (String(all2[i].name) === name) item = all2[i]; } catch (eN) {} }
            if (!item) {
                var bin = mkBin("Moment_Motion Kit");
                try { app.project.importFiles([String(o.png)], true, bin, false); } catch (eI) { return mkErr("import", String(eI)); }
                var inBin = mkItemsDeep(bin);
                for (i = 0; i < inBin.length && !item; i++) { try { if (String(inBin[i].name) === name) item = inBin[i]; } catch (eM) {} }
                if (!item) { all2 = mkItemsDeep(app.project.rootItem); for (i = 0; i < all2.length && !item; i++) { try { if (String(all2[i].name) === name) item = all2[i]; } catch (eM2) {} } }
            }
            if (!item) return mkErr("import");
        }
        /* 넣을 구간들 */
        var sel = mkSelected(seq), ranges = [], minT = 0;
        for (i = 0; i < sel.length; i++) { ranges.push([Number(sel[i].clip.start.ticks), Number(sel[i].clip.end.ticks)]); minT = Math.max(minT, sel[i].t + 1); }
        if (!ranges.length) { var ph = Number(seq.getPlayerPosition().ticks); ranges.push([ph, ph + Math.round((o.dur || 5) * MK_TPS / tpf) * tpf]); }
        ranges.sort(function (a, b) { return a[0] - b[0]; });
        var merged = [];
        for (i = 0; i < ranges.length; i++) {
            var last = merged[merged.length - 1];
            if (last && ranges[i][0] <= last[1] + tpf * 0.5) last[1] = Math.max(last[1], ranges[i][1]); else merged.push([ranges[i][0], ranges[i][1]]);
        }
        var done = 0, where = [], fails = [];
        for (i = 0; i < merged.length; i++) {
            var s0 = merged[i][0], e0 = merged[i][1];
            var t = mkFreeTrackAbove(seq, s0, e0, minT);
            seq = app.project.activeSequence;
            if (t < 0) { fails.push("notrack"); continue; }
            var tr = seq.videoTracks[t], n0 = tr.clips.numItems;
            try { tr.overwriteClip(item, mkTime(s0)); } catch (eO) { try { tr.overwriteClip(item, s0 / MK_TPS); } catch (eO2) { fails.push("insert"); continue; } }
            tr = app.project.activeSequence.videoTracks[t];
            var nc = null;
            for (var c = 0; c < tr.clips.numItems; c++) if (Math.abs(Number(tr.clips[c].start.ticks) - s0) <= tpf * 0.5) nc = tr.clips[c];
            if (!nc) { fails.push("find"); continue; }
            try { nc.end = mkTime(e0); } catch (eE) {}
            if (Math.abs(Number(nc.end.ticks) - e0) > tpf * 0.5) { try { nc.end = e0 / MK_TPS; } catch (eE2) {} }
            done++; where.push(t + 1);
        }
        return mkJson({ ok: true, done: done, tracks: where, fails: fails, ranges: merged.length });
    } catch (e) { return mkErr("ex", String(e)); }
}
/* 패널이 검은 화면 그림을 저장할 폴더 */
function mk_paths() {
    try {
        var f = new Folder(Folder.userData.fsName + "/Moment_MotionKit");
        if (!f.exists) f.create();
        var seq = app.project.activeSequence;
        return mkJson({ ok: true, dir: String(f.fsName), w: seq ? Number(seq.frameSizeHorizontal) : 1920, h: seq ? Number(seq.frameSizeVertical) : 1080 });
    } catch (e) { return mkErr("ex", String(e)); }
}

/* ---------- 선택한 클립 수 ---------- */
function mk_selCount() {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return mkJson({ ok: true, v: 0, a: 0, seq: false });
        return mkJson({ ok: true, v: mkSelected(seq).length, a: mkSelectedAudio(seq).length, seq: true });
    } catch (e) { return mkErr("ex", String(e)); }
}

/* ---------- 화면 캡처 (기준점 지정 / 자막 영역 측정) ----------
 * json: { t, c, isolate: 그 트랙만 보이게, at: 캡처할 시간(ticks) }
 * 프로그램 모니터 화면을 PNG 로 저장하고 경로를 돌려준다. 다른 트랙 숨김과 재생헤드는 바로 원래대로.
 */
function mk_grabFrame(json) {
    var seq = null, oldPh = null, muted = [];
    try {
        var o = mkParse(json);
        seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        app.enableQE();
        var qs = qe.project.getActiveSequence();
        if (!qs || !qs.exportFramePNG) return mkErr("noexport");
        oldPh = seq.getPlayerPosition().ticks;
        if (o.isolate) {
            for (var t = 0; t < seq.videoTracks.numTracks; t++) {
                if (t === o.t) continue;
                var tr = seq.videoTracks[t];
                try { if (!tr.isMuted()) { tr.setMute(1); muted.push(t); } } catch (e1) {}
            }
        }
        if (o.at !== undefined && o.at !== null) seq.setPlayerPosition(String(Math.round(o.at)));
        var got = mkExportFrame();
        if (!got.path) return mkJson({ ok: false, err: "noframe", msg: got.errs.join(" / ") });
        return mkJson({ ok: true, path: got.path, how: got.how });
    } catch (e) {
        return mkErr("ex", String(e));
    } finally {
        try { for (var m = 0; m < muted.length; m++) seq.videoTracks[muted[m]].setMute(0); } catch (e2) {}
        try { if (oldPh !== null) seq.setPlayerPosition(String(oldPh)); } catch (e3) {}
    }
}
/* 프로그램 모니터 화면을 PNG 로 저장. 프리미어는 확장자 없는 경로를 받아 .png 를 붙이고,
 * 버전에 따라 경로 모양(슬래시/확장자)이 다르면 예외를 내서 여러 방법을 차례로 시도한다. → { path, how, errs } */
/* 파일이 다 써질 때까지: 크기가 두 번 연속 같으면 끝난 것으로 본다 (최대 0.6초) */
function mkWaitStable(path) {
    var last = -1, waited = 0;
    while (waited < 600) {
        var len = 0;
        try { len = Number(new File(path).length); } catch (e) { len = 0; }
        if (len > 0 && len === last) return;
        last = len; $.sleep(20); waited += 20;
    }
}
var MK_FRAME_N = 0, MK_FRAME_I = -1;   /* MK_FRAME_I = 지난번에 성공한 방법 번호 */
function mkExportFrame(fast) {
    var errs = [], sep = /win/i.test(String($.os)) ? "\\" : "/";
    var natDir = String(Folder.temp.fsName), slash = natDir.replace(/\\/g, "/");
    MK_FRAME_N = (MK_FRAME_N + 1) % 1000;
    var base = "mmk_frame_" + (new Date().getTime()) + "_" + MK_FRAME_N;
    var tries = [
        { dir: natDir, s: sep, ext: "", how: "native" },
        { dir: natDir, s: sep, ext: ".png", how: "native.png" },
        { dir: slash, s: "/", ext: ".png", how: "slash.png" },
        { dir: slash, s: "/", ext: "", how: "slash" }
    ];
    var order = [0, 1, 2, 3];
    if (fast && MK_FRAME_I > 0) order = [MK_FRAME_I].concat(MK_FRAME_I === 1 ? [0, 2, 3] : MK_FRAME_I === 2 ? [0, 1, 3] : [0, 1, 2]);
    for (var oi = 0; oi < order.length; oi++) {
        var i = order[oi];
        var tr = tries[i], stem = tr.dir + tr.s + base + "_" + i, arg = stem + tr.ext;
        var qs = null, tc = null;
        try { qs = qe.project.getActiveSequence(); tc = qs.CTI.timecode; } catch (e0) { errs.push("cti: " + e0); continue; }
        try { qs.exportFramePNG(tc, arg); } catch (e1) { errs.push(tr.how + ": " + e1); continue; }
        var cands = [stem + ".png", arg, arg + ".png"], waited = 0, limit = oi === 0 ? 4000 : 2500, nap = fast ? 20 : 100;
        while (waited < limit) {
            for (var k = 0; k < cands.length; k++) {
                var f = new File(cands[k]);
                if (f.exists && /\.png$/i.test(cands[k])) { if (fast) mkWaitStable(cands[k]); else $.sleep(150); MK_FRAME_I = i; return { path: String(f.fsName), how: tr.how, errs: errs }; }
            }
            $.sleep(nap); waited += nap;
        }
        errs.push(tr.how + ": no file");
    }
    return { path: "", how: "", errs: errs };
}
/* 쓴 캡처 한 장 지우기 (임시 폴더의 mmk_frame_ 파일만) */
function mk_delFrame(json) {
    try {
        var o = mkParse(json), p = String(o.path || "");
        if (!/mmk_frame_[^\\\/]*$/.test(p)) return mkErr("badpath");
        var f = new File(p), ok = false;
        if (f.exists) { try { ok = f.remove(); } catch (e1) { ok = false; } }
        return mkJson({ ok: true, removed: ok ? 1 : 0 });
    } catch (e) { return mkErr("ex", String(e)); }
}
/* 캡처 임시 파일 정리 */
function mk_cleanTmp() {
    try {
        var fs = Folder.temp.getFiles("mmk_frame_*.png"), n = 0;
        for (var i = 0; i < fs.length; i++) { try { if (fs[i].remove()) n++; } catch (e) {} }
        return mkJson({ ok: true, removed: n });
    } catch (e) { return mkErr("ex", String(e)); }
}

/* ---------- 연결 확인 (패널 하단 "준비 완료" 표시) ---------- */
function mk_ping() {
    var v = "";
    try { v = String(app.version); } catch (e) {}
    return mkJson({ ok: true, version: v });
}

/* ---------- 효과 탭: 프리미어 효과 목록 / 선택 클립에 바로 추가 ---------- */
function mkList(v) {
    if (!v) return [];
    if (typeof v === "string") return v.split(",");
    var r = [];
    for (var i = 0; i < v.length; i++) r.push(String(v[i]));
    return r;
}
function mk_fxList() {
    try {
        app.enableQE();
        var vid = [], aud = [];
        try { vid = mkList(qe.project.getVideoEffectList()); } catch (e) {}
        try { aud = mkList(qe.project.getAudioEffectList()); } catch (e2) {}
        return mkJson({ ok: true, video: vid, audio: aud });
    } catch (e) { return mkErr("ex", String(e)); }
}
function mkSelectedAudio(seq) {
    var out = [];
    for (var t = 0; t < seq.audioTracks.numTracks; t++) {
        var tr = seq.audioTracks[t];
        for (var c = 0; c < tr.clips.numItems; c++) if (tr.clips[c].isSelected()) out.push({ t: t, c: c, clip: tr.clips[c] });
    }
    return out;
}
function mkQeFind(qt, clip, tpf) {
    var target = Number(clip.start.ticks), best = null, bd = 1e30;
    for (var i = 0; i < qt.numItems; i++) {
        var it = qt.getItemAt(i);
        if (!it || it.type === "Empty") continue;
        var d = Math.abs(mkQeTicks(it) - target);
        if (it.type !== "Clip") d += tpf * 0.25;
        if (d < bd) { bd = d; best = it; }
    }
    return bd <= tpf ? best : null;
}
/* json: { name, audio: true/false } */
function mk_addEffect(json) {
    try {
        var o = mkParse(json);
        var seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        var tpf = Number(seq.timebase), qs = null;
        try { app.enableQE(); qs = qe.project.getActiveSequence(); } catch (e) { qs = null; }
        if (!qs) return mkErr("noqe");
        var fx = null, sel, n = 0, i;
        if (o.audio) {
            try { fx = qe.project.getAudioEffectByName(o.name); } catch (e1) { fx = null; }
            if (!fx) return mkErr("nofx", o.name);
            sel = mkSelectedAudio(seq);
            for (i = 0; i < sel.length; i++) {
                var qa = mkQeFind(qs.getAudioTrackAt(sel[i].t), sel[i].clip, tpf);
                if (qa) { try { qa.addAudioEffect(fx); n++; } catch (e2) {} }
            }
        } else {
            try { fx = qe.project.getVideoEffectByName(o.name); } catch (e3) { fx = null; }
            if (!fx) return mkErr("nofx", o.name);
            sel = mkSelected(seq);
            for (i = 0; i < sel.length; i++) {
                var qv = mkQeFind(qs.getVideoTrackAt(sel[i].t), sel[i].clip, tpf);
                if (qv) { try { qv.addVideoEffect(fx); n++; } catch (e4) {} }
            }
        }
        return mkJson({ ok: true, done: n, clips: sel.length });
    } catch (e) { return mkErr("ex", String(e)); }
}

/* ---------- 진단: 문제가 생기면 이 내용을 복사해서 알려주세요 ---------- */
function mk_diag() {
    var L = [];
    try { L.push("Premiere " + app.version + " (build " + app.build + ")"); } catch (e) { L.push("Premiere ?"); }
    try { L.push("OS " + $.os); } catch (e0) {}
    var qeok = false;
    try { app.enableQE(); qeok = !!qe.project.getActiveSequence(); } catch (e1) {}
    L.push("QE " + (qeok ? "OK" : "X"));
    try {
        var list = qe.project.getVideoEffectList();
        list = (typeof list === "string") ? list.split(",") : list;
        L.push("effects " + list.length);
        var hit = [];
        for (var i = 0; i < list.length; i++) {
            var n = String(list[i]);
            if (/crop|\uC790\uB974|\uD06C\uB86D|wipe|\uB2E6\uC544|wave|\uBB3C\uACB0|glitch|\uAE00\uB9AC\uCE58|aberr|\uC0C9\uC218\uCC28|transform|\uBCC0\uD615|\uBCC0\uD658|gaussian|\uAC00\uC6B0\uC2DC\uC548|directional|\uBC29\uD5A5/i.test(n)) hit.push(n);
        }
        L.push("match: " + hit.join(" | "));
        var tests = ["Crop", "\uC790\uB974\uAE30", "Wave Warp", "\uBB3C\uACB0 \uBE44\uD2C0\uAE30", "Linear Wipe", "\uC120\uD615 \uB2E6\uC544\uB0B4\uAE30"], tr = [];
        for (var k = 0; k < tests.length; k++) {
            var got = null;
            try { got = qe.project.getVideoEffectByName(tests[k]); } catch (e3) { got = null; }
            tr.push(tests[k] + "=" + (got ? "O" : "X"));
        }
        L.push("byName: " + tr.join(" "));
    } catch (e2) { L.push("effect list error " + e2); }
    try {   /* 화면 캡처 시험 */
        var ex = mkExportFrame();
        L.push("capture: " + (ex.path ? "OK " + ex.how : "FAIL") + (ex.errs.length ? " [" + ex.errs.join(" / ") + "]" : ""));
        if (ex.path) { try { new File(ex.path).remove(); } catch (e5) {} }
    } catch (e4) { L.push("capture error " + e4); }
    try {
        var seq = app.project.activeSequence;
        if (!seq) L.push("no sequence");
        else {
            var sel = mkSelected(seq);
            L.push("selected " + sel.length + " / seq " + seq.frameSizeHorizontal + "x" + seq.frameSizeVertical);
            for (var s = 0; s < sel.length && s < 2; s++) {
                var cl = sel[s].clip;
                L.push("[V" + (sel[s].t + 1) + "] " + cl.name + " text=\"" + mkReadText(cl) + "\"");
                for (var c = 0; c < cl.components.numItems; c++) {
                    var comp = cl.components[c], pn = [];
                    for (var j = 0; j < comp.properties.numItems && j < 16; j++) {
                        try { pn.push(String(comp.properties[j].displayName)); } catch (e4) { pn.push("?"); }
                    }
                    L.push("  " + c + ". " + comp.displayName + " <" + comp.matchName + "> " + pn.join(", "));
                }
            }
        }
    } catch (e5) { L.push("clip error " + e5); }
    return mkJson({ ok: true, text: L.join("\n") });
}

/* ---------- 5) 설정 저장 (전체 패널 ↔ 미니 패널 공유) ---------- */
function mkSettingsFile() {
    var dir = new Folder(Folder.userData.fsName + "/MomentMotionKit");
    if (!dir.exists) dir.create();
    return new File(dir.fsName + "/settings.json");
}
function mk_loadSettings() {
    try {
        var f = mkSettingsFile();
        if (!f.exists) return mkJson({ ok: true, data: null });
        f.encoding = "UTF-8";
        f.open("r"); var s = f.read(); f.close();
        return mkJson({ ok: true, data: s });
    } catch (e) { return mkErr("ex", String(e)); }
}
function mk_saveSettings(json) {
    try {
        var f = mkSettingsFile();
        f.encoding = "UTF-8";
        f.open("w"); f.write(json); f.close();
        return mkJson({ ok: true });
    } catch (e) { return mkErr("ex", String(e)); }
}

/* ====================== 6) 트래킹 탭 ======================
 * 패널이 화면을 프레임마다 받아서 직접 추적하고, 계산한 키프레임을 여기서 클립에 적는다.
 *   mk_trackTarget  선택 클립 정보(모션 값, 원본 크기, 인·아웃)
 *   mk_trackBegin   추적하는 동안 위쪽 트랙을 잠깐 숨김   mk_trackGrab  한 프레임 캡처   mk_trackEnd  원래대로
 *   mk_trackApply   키프레임 쓰기 (모션 / 변형 / 모퉁이 고정)  mk_trackClear  추적 키프레임 지우기
 */
var MK_TRK = { muted: [], ph: null, on: false };

/* 클립 원본의 가로·세로 (효과 좌표의 기준). 못 읽으면 시퀀스 크기 */
function mkLayerSize(clip, seq) {
    var w = Number(seq.frameSizeHorizontal), h = Number(seq.frameSizeVertical), src = "seq";
    try {
        var pi = clip.projectItem;
        if (pi) {
            var md = String(pi.getProjectMetadata());
            var m = /Column\.Intrinsic\.VideoInfo>\s*(\d+)\s*x\s*(\d+)/.exec(md);
            if (m && Number(m[1]) > 0 && Number(m[2]) > 0) { w = Number(m[1]); h = Number(m[2]); src = "meta"; }
        }
    } catch (e) {}
    return { w: w, h: h, src: src };
}
function mkValAt(prm, ticks) {
    var v = null, tv = false;
    try { tv = prm.isTimeVarying(); } catch (e0) { tv = false; }
    if (tv) { try { v = prm.getValueAtTime(mkTime(ticks)); } catch (e) { v = null; } }
    if (v === null || v === undefined) { try { v = prm.getValue(); } catch (e2) { v = null; } }
    return v;
}
function mkMotionComp(clip) {
    for (var i = 0; i < clip.components.numItems; i++) {
        var m = "";
        try { m = String(clip.components[i].matchName); } catch (e) { m = ""; }
        if (m === "AE.ADBE Motion") return clip.components[i];
    }
    return null;
}
function mkPt(v, dx, dy) {
    if (v instanceof Array && v.length >= 2 && typeof v[0] === "number" && typeof v[1] === "number") return [v[0], v[1]];
    return [dx, dy];
}
function mkNum(v, d) { return (typeof v === "number" && isFinite(v)) ? v : d; }

/* json: { at: 기준 시간(시퀀스 ticks, 없으면 재생헤드) } */
function mk_trackTarget(json) {
    try {
        var o = json ? mkParse(json) : {};
        var seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        var tpf = Number(seq.timebase), ph = Number(seq.getPlayerPosition().ticks);
        var at = (o.at === undefined || o.at === null) ? ph : Number(o.at);
        var sel = mkSelected(seq), clips = [];
        for (var i = 0; i < sel.length; i++) {
            var cl = sel[i].clip, st = Number(cl.start.ticks), en = Number(cl.end.ticks), inP = Number(cl.inPoint.ticks), spd = mkSpeed(cl);
            var rel = Math.max(0, Math.min(en - st, at - st)), ct = inP + rel * spd;
            var mo = mkMotionComp(cl), motion = null;
            if (mo && mo.properties.numItems >= 6) {
                var pr = mo.properties, uni = true;
                try { uni = pr[3].getValue() ? true : false; } catch (e1) { uni = true; }
                var sc = mkNum(mkValAt(pr[1], ct), 100);
                motion = { pos: mkPt(mkValAt(pr[0], ct), 0.5, 0.5), scale: sc, scaleW: mkNum(mkValAt(pr[2], ct), sc), uni: uni,
                           rot: mkNum(mkValAt(pr[4], ct), 0), anchor: mkPt(mkValAt(pr[5], ct), 0.5, 0.5) };
            }
            clips.push({ t: sel[i].t, c: sel[i].c, id: mkClipId(cl, sel[i].t, sel[i].c), name: String(cl.name),
                start: st, end: en, inPoint: inP, speed: spd, motion: motion, layer: mkLayerSize(cl, seq) });
        }
        var inS = -1, outS = -1;
        try { inS = Number(seq.getInPoint()); outS = Number(seq.getOutPoint()); } catch (e2) { inS = -1; outS = -1; }
        return mkJson({ ok: true, fps: MK_TPS / tpf, tpf: tpf, w: Number(seq.frameSizeHorizontal), h: Number(seq.frameSizeVertical),
            ph: ph, tracks: seq.videoTracks.numTracks, inPt: (isNaN(inS) ? -1 : inS * MK_TPS), outPt: (isNaN(outS) ? -1 : outS * MK_TPS), clips: clips });
    } catch (e) { return mkErr("ex", String(e)); }
}

function mkTrackRestore() {
    var seq = null;
    try { seq = app.project.activeSequence; } catch (e) { seq = null; }
    if (seq) {
        try { for (var m = 0; m < MK_TRK.muted.length; m++) seq.videoTracks[MK_TRK.muted[m]].setMute(0); } catch (e2) {}
        try { if (MK_TRK.ph !== null) seq.setPlayerPosition(String(MK_TRK.ph)); } catch (e3) {}
    }
    MK_TRK.muted = []; MK_TRK.ph = null; MK_TRK.on = false;
}
/* json: { from: 이 번호 이상의 비디오 트랙을 숨김 (붙일 대상이 화면에 찍히지 않게) } */
function mk_trackBegin(json) {
    try {
        var o = mkParse(json);
        mkTrackRestore();
        var seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        app.enableQE();
        var qs = qe.project.getActiveSequence();
        if (!qs || !qs.exportFramePNG) return mkErr("noexport");
        MK_TRK.ph = seq.getPlayerPosition().ticks; MK_TRK.on = true;
        var from = Number(o.from);
        if (!isNaN(from)) {
            for (var t = Math.max(0, from); t < seq.videoTracks.numTracks; t++) {
                var tr = seq.videoTracks[t];
                try { if (!tr.isMuted()) { tr.setMute(1); MK_TRK.muted.push(t); } } catch (e1) {}
            }
        }
        return mkJson({ ok: true, muted: MK_TRK.muted.length });
    } catch (e) { mkTrackRestore(); return mkErr("ex", String(e)); }
}
/* json: { at: 시퀀스 ticks, del: 지울 이전 캡처 경로 } */
function mk_trackGrab(json) {
    try {
        var o = mkParse(json);
        var seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        if (o.del && /mmk_frame_[^\\\/]*$/.test(String(o.del))) { try { var old = new File(String(o.del)); if (old.exists) old.remove(); } catch (e0) {} }
        seq.setPlayerPosition(String(Math.round(o.at)));
        var got = mkExportFrame(true);
        if (!got.path) return mkJson({ ok: false, err: "noframe", msg: got.errs.join(" / ") });
        return mkJson({ ok: true, path: got.path });
    } catch (e) { return mkErr("ex", String(e)); }
}
function mk_trackEnd(json) {
    try {
        var o = json ? mkParse(json) : {};
        if (o.del && /mmk_frame_[^\\\/]*$/.test(String(o.del))) { try { var old = new File(String(o.del)); if (old.exists) old.remove(); } catch (e0) {} }
        var had = MK_TRK.on;
        mkTrackRestore();
        return mkJson({ ok: true, restored: had ? 1 : 0 });
    } catch (e) { return mkErr("ex", String(e)); }
}

/* plans: [{ t, c, target: "motion" | "tf" | "cpin", shutter, params: [{ i, n, keys: [[클립 기준 프레임, 값]] | value }] }] */
function mk_trackApply(json) {
    try {
        var plans = mkParse(json);
        var seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        var tpf = Number(seq.timebase), qs = null;
        try { app.enableQE(); qs = qe.project.getActiveSequence(); } catch (e) { qs = null; }
        var done = 0, failed = [], written = 0;
        for (var p = 0; p < plans.length; p++) {
            var pl = plans[p];
            if (!seq.videoTracks[pl.t] || !seq.videoTracks[pl.t].clips[pl.c]) { failed.push("clip"); continue; }
            var clip = seq.videoTracks[pl.t].clips[pl.c];
            var inP = Number(clip.inPoint.ticks), spd = mkSpeed(clip), getter = null;
            if (pl.target === "motion") {
                var mo = mkMotionComp(clip);
                if (!mo) { failed.push("nomotion"); continue; }
                getter = mkGetter(mo.properties, "motion");
            } else if (pl.target === "tf") {
                var tf = mkEnsure(seq, qs, pl.t, pl.c, tpf, MK_SPECS.tf);
                if (tf.ci < 0) { failed.push(tf.err === "noqe" ? "noqe" : "notf"); continue; }
                var props = seq.videoTracks[pl.t].clips[pl.c].components[tf.ci].properties;
                if (props.numItems < 11) { failed.push("tfprops"); continue; }
                mkSet(props[MK_TF.uni], true);
                mkSet(props[MK_TF.useComp], false);
                mkSet(props[MK_TF.shutter], pl.shutter || 0);
                getter = mkGetter(props, "tf");
            } else if (pl.target === "cpin") {
                var cp = mkEnsure(seq, qs, pl.t, pl.c, tpf, MK_SPECS.cpin);
                if (cp.ci < 0) { failed.push(cp.err === "noqe" ? "noqe" : "nocpin"); continue; }
                getter = mkGetter(seq.videoTracks[pl.t].clips[pl.c].components[cp.ci].properties, "cpin");
            } else { failed.push("target"); continue; }
            var wrote = 0;
            for (var q = 0; q < pl.params.length; q++) {
                var pr = pl.params[q], target = getter(pr.n, pr.i);
                if (!target) continue;
                mkWrite(target, pr, mkSame, inP, spd, tpf);
                wrote++;
            }
            written += wrote;
            if (wrote) done++; else failed.push("noparam");
        }
        return mkJson({ ok: true, done: done, failed: failed, written: written });
    } catch (e) { return mkErr("ex", String(e)); }
}

/* 선택 클립의 추적 키프레임 지우기: 모션의 위치·비율·회전 키프레임을 지금(재생헤드) 값으로 고정하고, 모퉁이 고정 효과를 뺀다.
 * 변형(Transform) 효과는 "선택 클립의 모션 효과 지우기"가 지운다. */
function mk_trackClear() {
    try {
        var seq = app.project.activeSequence;
        if (!seq) return mkErr("noseq");
        var tpf = Number(seq.timebase), qs = null, ph = Number(seq.getPlayerPosition().ticks);
        try { app.enableQE(); qs = qe.project.getActiveSequence(); } catch (e) { qs = null; }
        var sel = mkSelected(seq), fixed = 0, removed = 0, tfLeft = 0;
        for (var s = 0; s < sel.length; s++) {
            var clip = sel[s].clip, st = Number(clip.start.ticks), en = Number(clip.end.ticks);
            var ct = Number(clip.inPoint.ticks) + Math.max(0, Math.min(en - st, ph - st)) * mkSpeed(clip);
            var mo = mkMotionComp(clip), list = [0, 1, 2, 4];
            if (mo) {
                for (var l = 0; l < list.length; l++) {
                    var prm = mo.properties[list[l]], tv = false;
                    try { tv = prm.isTimeVarying(); } catch (e1) { tv = false; }
                    if (!tv) continue;
                    var v = mkValAt(prm, ct);
                    try { prm.setTimeVarying(false); } catch (e2) {}
                    if (v !== null && v !== undefined) mkSet(prm, v);
                    fixed++;
                }
            }
            if (mkFindFx(clip, MK_SPECS.tf) >= 0) tfLeft++;
            var qi = qs ? mkQeItem(qs, sel[s].t, clip, tpf) : null, dom = 0, kill = [], i;
            for (i = 0; i < clip.components.numItems; i++) if (MK_SPECS.cpin.ok(String(clip.components[i].matchName))) dom++;
            if (qi && dom) {
                try { for (i = 0; i < qi.numComponents; i++) if (mkScanName(MK_SPECS.cpin, String(qi.getComponentAt(i).name))) kill.push(i); } catch (e3) { kill = []; }
                if (kill.length === dom) {
                    kill.sort(function (a, b) { return b - a; });
                    for (i = 0; i < kill.length; i++) { try { qi.getComponentAt(kill[i]).remove(); removed++; } catch (e4) {} }
                }
            }
        }
        return mkJson({ ok: true, clips: sel.length, fixed: fixed, removed: removed, tf: tfLeft });
    } catch (e) { return mkErr("ex", String(e)); }
}
