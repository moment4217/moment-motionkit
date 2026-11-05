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
        ok: function (m) { return /crop/i.test(m); }
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
        names: ["Wave Warp", "\uBB3C\uACB0 \uBE44\uD2C0\uAE30"],
        scan: [/wave ?warp/i, /\uBB3C\uACB0/],
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
        scan: [/chromatic aberration/i, /\uC0C9\uC218\uCC28/],
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
    }
};
/* 추가 효과 속성의 표시 이름 (영문 / 한글). 이름으로 먼저 찾고, 없으면 번호로 */
var MK_PNAMES = {
    crop:  { Feather: ["Edge Feather", "\uAC00\uC7A5\uC790\uB9AC \uD398\uB354", "\uAC00\uC7A5\uC790\uB9AC \uD750\uB9BC", "\uAC00\uC7A5\uC790\uB9AC \uBD80\uB4DC\uB7FD\uAC8C"], Left: ["Left", "\uC67C\uCABD"], Top: ["Top", "\uC704\uCABD", "\uC704"], Right: ["Right", "\uC624\uB978\uCABD"], Bottom: ["Bottom", "\uC544\uB798\uCABD", "\uC544\uB798"] },
    gblur: { Blurriness: ["Blurriness", "\uD750\uB9BC \uC815\uB3C4", "\uD750\uB9BC"] },
    turb:  { Amount: ["Amount", "\uC591"], Size: ["Size", "\uD06C\uAE30"], Complexity: ["Complexity", "\uBCF5\uC7A1\uC131", "\uBCF5\uC7A1\uB3C4"], Evolution: ["Evolution", "\uC9C4\uD654", "\uC804\uAC1C"] },
    dblur: { Direction: ["Direction", "\uBC29\uD5A5"], Length: ["Blur Length", "\uD750\uB9BC \uAE38\uC774"] },
    wwarp: { Type: ["Wave Type", "\uD30C\uD615 \uC720\uD615", "\uBB3C\uACB0 \uC720\uD615"], Height: ["Wave Height", "\uD30C\uD615 \uB192\uC774", "\uBB3C\uACB0 \uB192\uC774"],
             Width: ["Wave Width", "\uD30C\uD615 \uD3ED", "\uBB3C\uACB0 \uD3ED", "\uD30C\uD615 \uB108\uBE44"], Direction: ["Direction", "\uBC29\uD5A5"],
             Speed: ["Wave Speed", "\uD30C\uD615 \uC18D\uB3C4", "\uBB3C\uACB0 \uC18D\uB3C4"], Phase: ["Phase", "\uC704\uC0C1"] },
    tint:  { Black: ["Map Black To", "\uAC80\uC815\uC744 \uB2E4\uC74C\uC73C\uB85C \uB9E4\uD551", "\uAC80\uC815 \uB9E4\uD551"], White: ["Map White To", "\uD770\uC0C9\uC744 \uB2E4\uC74C\uC73C\uB85C \uB9E4\uD551", "\uD770\uC0C9 \uB9E4\uD551"], Amount: ["Amount to Tint", "\uC0C9\uC870 \uC591"] },
    bc:    { Brightness: ["Brightness", "\uBC1D\uAE30"], Contrast: ["Contrast", "\uB300\uBE44"] },
    proc:  { Brightness: ["Brightness", "\uBC1D\uAE30", "\uBA85\uB3C4"], Contrast: ["Contrast", "\uB300\uBE44"], Hue: ["Hue", "\uC0C9\uC870"], Saturation: ["Saturation", "\uCC44\uB3C4"] },
    chroma: { Red: [/red/i, /\uBE68\uAC15|\uBE68\uAC04|\uC801/], Green: [/green/i, /\uCD08\uB85D|\uB179/], Blue: [/blue/i, /\uD30C\uB791|\uD30C\uB780|\uCCAD/] },
    post:  { Rate: ["Frame Rate", "\uD504\uB808\uC784 \uC18D\uB3C4"] },
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
function mkScanName(spec, name) {
    for (var j = 0; j < spec.scan.length; j++) if (spec.scan[j].test(name)) return true;
    return false;
}

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
function mkCandidates(spec) {
    var names = [], i, j;
    for (i = 0; i < spec.names.length; i++) names.push(spec.names[i]);
    try {
        var list = qe.project.getVideoEffectList();
        list = (typeof list === "string") ? list.split(",") : list;
        for (i = 0; i < spec.scan.length; i++)
            for (j = 0; j < list.length; j++) {
                var n = String(list[j]);
                if (spec.scan[i].test(n) && !/^VR /.test(n) && !mkIn(names, n)) names.push(n);
            }
    } catch (e) {}
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
function mkCropTarget(seq, qs, t, c, tpf) {
    var clip = seq.videoTracks[t].clips[c];
    var ci = mkFindFx(clip, MK_SPECS.crop);
    if (ci >= 0) return { get: mkGetter(clip.components[ci].properties, "crop"), via: "fx" };
    /* 모션 안의 기본 자르기 (새 프리미어) */
    for (var i = 0; i < clip.components.numItems; i++) {
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

            /* (1) 추가 효과 먼저 — 자르기/흐림/난류/방향 흐림 */
            var fxl = pl.fx || [];
            for (var x = 0; x < fxl.length; x++) {
                var fxid = fxl[x].fx, params = fxl[x].params, getter = null;
                if (!MK_SPECS[fxid]) continue;
                if (fxid === "crop") {
                    var ct = mkCropTarget(seq, qs, pl.t, pl.c, tpf);
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
                    if (okv) params.push({ ci: ci, pi: pi, kind: mkKind(match, pi), keys: keys });
                }
            }
            var phSeq = Number(seq.getPlayerPosition().ticks);
            clips.push({ id: mkClipId(clip, sel[s].t, sel[s].c), t: sel[s].t, c: sel[s].c, speed: mkSpeed(clip), params: params,
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
        var sel = mkSelected(seq), removed = 0, reset = 0, kinds = ["tf", "crop", "gblur", "turb", "dblur", "wwarp", "lwipe", "tint", "bc", "proc", "chroma", "post"];
        for (var s = 0; s < sel.length; s++) {
            var clip = sel[s].clip;
            var qi = qs ? mkQeItem(qs, sel[s].t, clip, tpf) : null;
            var qnames = [];
            if (qi) { try { for (var q = 0; q < qi.numComponents; q++) qnames.push(String(qi.getComponentAt(q).name)); } catch (e2) { qnames = []; } }
            var kill = [];          /* 지울 QE 번호들 */
            for (var k = 0; k < kinds.length; k++) {
                var spec = MK_SPECS[kinds[k]], dom = [], qe2 = [], i;
                for (i = 0; i < clip.components.numItems; i++) if (spec.ok(String(clip.components[i].matchName))) dom.push(i);
                if (!dom.length) continue;
                for (i = 0; i < qnames.length; i++) if (mkScanName(spec, qnames[i])) qe2.push(i);
                if (qi && qe2.length === dom.length) {
                    for (i = 0; i < dom.length; i++) {
                        if (kinds[k] === "tf" || mkHasKeys(clip.components[dom[i]])) kill.push(qe2[i]);
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
        var dir = Folder.temp.fsName.replace(/\\/g, "/");
        var path = dir + "/mmk_frame_" + (new Date().getTime()) + ".png";
        qs = qe.project.getActiveSequence();
        qs.exportFramePNG(qs.CTI.timecode, path);
        var f = new File(path), waited = 0;
        while (!f.exists && waited < 4000) { $.sleep(100); waited += 100; f = new File(path); }
        $.sleep(150);
        return mkJson({ ok: f.exists, path: path, err: f.exists ? "" : "noframe" });
    } catch (e) {
        return mkErr("ex", String(e));
    } finally {
        try { for (var m = 0; m < muted.length; m++) seq.videoTracks[muted[m]].setMute(0); } catch (e2) {}
        try { if (oldPh !== null) seq.setPlayerPosition(String(oldPh)); } catch (e3) {}
    }
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
