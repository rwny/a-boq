var PROJECTS = JSON.parse(document.getElementById("projectsData").textContent);
var MASTER_ITEMS = [];
var MASTER_LOADED = false;

// Build section name map (code → name without prefix e.g. "C" → "ระบบไฟฟ้าและสื่อสาร")
function buildSecMap() {
  var m = {};
  var keys = Object.keys(PROJECTS);
  keys.forEach(function(k) {
    PROJECTS[k].sd.forEach(function(r) {
      if (!m[r[0]]) m[r[0]] = r[1].replace(/^[A-Z]+\.\s*/, '');
    });
  });
  return m;
}
var SEC_MAP = buildSecMap();

// Override long section names with short labels
var SECTION_SHORT = {
  "A": "โครงสร้าง",
  "B": "สถาปัตย์",
  "C": "ไฟฟ้า",
  "D": "A/C",
  "E": "SAN",
  "FURN": "EQUIP",
  "SPEC": "Special"
};
// Apply short names
Object.keys(SECTION_SHORT).forEach(function(k) {
  if (SEC_MAP[k]) SEC_MAP[k] = SECTION_SHORT[k];
});
// Add period info (from file scan dates)
PROJECTS["AR25"].period = "ม.ค. 2568 — ก.ย. 2568";
PROJECTS["AR25"].budgetYear = "2569";
PROJECTS["AR24"].period = "ม.ค. 2568 — ก.ย. 2568";
PROJECTS["AR24"].budgetYear = "2569";
var currentKey = "AR25";
var current = PROJECTS[currentKey];
var adminMode = false;

// === Build TopNav dynamically ===
function buildTopNav() {
  var keys = Object.keys(PROJECTS).sort();
  var h = '<a class="tn tn-active" data-proj="ALL">ภาพรวม</a>';
  h += '<a class="tn" data-proj="MASTER">📋 Master</a>';
  h += '<a class="tn-special" href="steel.html" style="color:#ffd700">🔩 เหล็ก</a>';
  h += '<a class="tn-special" href="spst.html" style="color:#ffd700">📋 สพฐ 69</a>';
  keys.forEach(function(k) {
    h += '<a class="tn" data-proj="' + k + '">' + PROJECTS[k].name + '</a>';
  });
  var nav = document.getElementById("topNav");
  nav.innerHTML = h;
  // Re-attach event listeners
  nav.querySelectorAll(".tn").forEach(function(el) {
    el.addEventListener("click", function() {
      switchProject(this.dataset.proj);
    });
  });
}

// Cache DOM refs
var $ = function(id) { return document.getElementById(id); };

// === Utility Functions ===
function nf(v) {
  if (typeof v !== "number") return "";
  if (v === 0) return "-";
  return v.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
}
function tg(s, extra, titleText) {
  return '<span class="tg t-' + s + (extra || '') + '"' + (titleText ? ' title="' + titleText + '"' : '') + '>' + s + '</span>';
}
function hlText(t, q) {
  if (!q) return t;
  var s = (t + ""), lq = q.toLowerCase(), ls = s.toLowerCase();
  var i = ls.indexOf(lq);
  if (i === -1) {
    var noSp = lq.replace(/\s+/g, '');
    i = ls.indexOf(noSp);
  }
  if (i === -1) return s;
  return s.substring(0, i) + '<mark>' + s.substring(i, i + (i === ls.indexOf(lq.replace(/\s+/g,'')) ? lq.replace(/\s+/g,'').length : q.length)) + '</mark>' + s.substring(i + (i === ls.indexOf(lq.replace(/\s+/g,'')) ? lq.replace(/\s+/g,'').length : q.length));
}
function shuffle(a) {
  var r = a.slice();
  for (var i = r.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = r[i]; r[i] = r[j]; r[j] = t;
  }
  return r;
}

// === Metrics ===
function renderMetrics(proj) {
  var sd = proj.sd, dd = proj.dd;
  var t = 0, sec = {};
  sd.forEach(function(r) { t += r[7]; sec[r[0]] = 1; });
  var ks = Object.keys(sec);
  var ms = ks.filter(function(s) { return s !== "FURN" && s !== "SPEC"; }).length;
  $("projTitle").innerHTML = (adminMode ? "[ADMIN] " : "") + proj.name + '<br><span class="proj-fullname">' + (proj.fullName || '') + '</span>';
  $("metrics").innerHTML =
    '<div class="mc"><div class="l">งบประมาณรวม</div><div class="v a">&#3647;' + nf(t) + '</div></div>' +
    '<div class="mc"><div class="l">หมวดงาน</div><div class="v g">' + ks.length + '</div></div>' +
    '<div class="mc"><div class="l">รายการละเอียด</div><div class="v o">' + dd.length + '</div></div>' +
    '<div class="mc"><div class="l">' + (proj.period ? 'ช่วงออกแบบ' : 'หมวดหลัก') + '</div><div class="v p" style="font-size:12px">' + (proj.period ? proj.period : ms) + '</div></div>';
}

// === Summary Table ===
var sCol = 1, sDir = 1;
function renderSummary(proj) {
  var sd = proj.sd, dd = proj.dd;
  var a = sd.slice(), c = sCol;
  a.sort(function(x, y) {
    if (c === 0 || c === 5 || c === 6 || c === 7) return x[c] < y[c] ? -1 : x[c] > y[c] ? 1 : 0;
    return (x[c] + "") < (y[c] + "") ? -1 : (x[c] + "") > (y[c] + "") ? 1 : 0;
  });
  if (sDir === -1) a.reverse();
  
  $("sc").textContent = a.length + " รายการ";
  var dm = {};
  dd.forEach(function(d) {
    var ds = d[3]; if (!ds) return;
    var p = parseInt(ds); if (isNaN(p)) return;
    var k = d[0] + "_" + p;
    if (!dm[k]) dm[k] = [];
    dm[k].push(d);
  });
  var h = "";
  a.forEach(function(d) {
    var k = d[0] + "_" + d[3];
    var hasD = dm[k] && dm[k].length > 0;
    h += '<tr class="exp sl-' + d[0] + '" data-sec="' + d[0] + '" data-seq="' + d[3] + '">';
    h += '<td>' + tg(d[0]) + '</td><td>' + d[3] + '</td><td>' + d[4] + '</td>';
    h += '<td class="n">' + nf(d[5]) + '</td><td class="n">' + nf(d[6]) + '</td><td class="n">' + nf(d[7]) + '</td></tr>';
    if (hasD) {
      h += '<tr class="dw" id="dx_' + k + '"><td colspan="6"><div class="di">';
      h += '<table class="dt"><thead><tr><th>ลำดับ</th><th style="min-width:160px">รายการ</th><th class="n">จำนวน</th><th>หน่วย</th><th class="n">@วัสดุ</th><th class="n">ค่าวัสดุ</th><th class="n">@แรง</th><th class="n">ค่าแรง</th><th class="n">รวม</th></tr></thead><tbody>';
      dm[k].forEach(function(dd) {
        h += '<tr><td>' + dd[3] + '</td><td>' + dd[4] + '</td><td class="n">' + (dd[5] ? nf(dd[5]) : "") + '</td><td>' + dd[6] + '</td>';
        h += '<td class="n">' + nf(dd[7]) + '</td><td class="n">' + nf(dd[8]) + '</td><td class="n">' + nf(dd[9]) + '</td><td class="n">' + nf(dd[10]) + '</td><td class="n">' + nf(dd[11]) + '</td></tr>';
      });
      h += '</tbody></table></div></td></tr>';
    }
  });
  $("st").innerHTML = h;
}

// === Chart ===
function renderChart(proj) {
  var sd = proj.sd;
  var m = {};
  sd.forEach(function(r) {
    var k = r[0]; if (!m[k]) m[k] = {v: 0, n: r[1].split(" ")[1] || k}; m[k].v += r[7];
  });
  var a = Object.keys(m).map(function(k) { return m[k]; });
  a.sort(function(x, y) { return y.v - x.v; });
  var mx = a[0] ? a[0].v : 1;
  var cs = ["#00e676","#34d399","#facc15","#818cf8","#c084fc","#f87171","#6b7280"];
  var h = "";
  a.forEach(function(s, i) {
    var p = Math.max(2, s.v / mx * 100);
    h += '<div class="br"><div class="bl">' + s.n + '</div>';
    h += '<div class="bt"><div class="bf" style="width:' + p + '%;background:' + cs[i % cs.length] + '">&#3647;' + nf(s.v) + '</div></div></div>';
  });
  $("chart").innerHTML = h;
}

// === Detail Table (Search + Random + Context) ===
var dQ = "", dZ = true, dC = 0, dD = 1;

function getAllDetailData() {
  var all = [];
  if (currentKey === "ALL") {
    var keys = Object.keys(PROJECTS).sort();
    keys.forEach(function(k) {
      var p = PROJECTS[k];
      p.dd.forEach(function(d) {
        all.push({project: k, projectName: p.name, data: d});
      });
    });
  } else {
    current.dd.forEach(function(d) {
      all.push({project: currentKey, projectName: current.name, data: d});
    });
  }
  return all;
}

function renderDetail(proj) {
  var allData = getAllDetailData();
  var raw = allData.slice();
  if (dZ) raw = raw.filter(function(obj) { return obj.data[11] !== 0; });
  
  var dcEl = $("dc");
  if (!dcEl) return;
  
  var isAll = currentKey === "ALL";
  
  var q = dQ ? dQ.trim() : "";
  
  // Lock dtb height before any DOM changes to prevent scroll jump
  var dtb = $("dtb");
  if (dtb && dtb.offsetHeight > 0) dtb.style.minHeight = dtb.offsetHeight + "px";
  
  if (!q) {
    var items = shuffle(raw).slice(0, 15);
    dcEl.textContent = "สุ่ม 15 จาก " + raw.length + " รายการ";
    $("dtb").innerHTML = buildTableRows(items, "");
    return;
  }
  
  var lq = q.toLowerCase();
  var lqNoSp = lq.replace(/\s+/g, '');
  var matches = [];
  raw.forEach(function(obj, i) {
    var d = obj.data;
    var desc = (d[4] + "").toLowerCase();
    var secName = (SEC_MAP[d[0]] || "").toLowerCase();
    var hit = desc.indexOf(lq) !== -1 || desc.indexOf(lqNoSp) !== -1 ||
              (d[3] + "").indexOf(lq) !== -1 || (d[0] + "").indexOf(lq) !== -1 ||
              secName.indexOf(lq) !== -1;
    if (hit) matches.push(i);
  });
  
  if (matches.length === 0) {
    dcEl.textContent = 'ไม่พบ "' + q + '"';
    var cols = 8;
    $("dtb").innerHTML = '<tr><td colspan="' + cols + '" style="text-align:center;color:#555;padding:30px">😕 ไม่พบรายการที่ตรงกับ "' + q + '"</td></tr>';
    return;
  }
  
  var ranges = [];
  matches.forEach(function(idx) {
    var start = Math.max(0, idx - 2);
    var end = Math.min(raw.length - 1, idx + 2);
    var merged = false;
    for (var i = 0; i < ranges.length; i++) {
      if (start <= ranges[i].end + 1) {
        ranges[i].start = Math.min(ranges[i].start, start);
        ranges[i].end = Math.max(ranges[i].end, end);
        merged = true; break;
      }
    }
    if (!merged) ranges.push({start: start, end: end});
  });
  
  var matchSet = {};
  matches.forEach(function(idx) { matchSet[idx] = true; });
  var items = [];
  ranges.forEach(function(r) {
    for (var i = r.start; i <= r.end; i++) {
      items.push({item: raw[i], isMatch: !!matchSet[i]});
    }
  });
  
  dcEl.textContent = "พบ " + matches.length + " รายการ (แสดง " + items.length + " แถวรวมบริบท)" + (isAll ? " จาก " + Object.keys(PROJECTS).length + " โครงการ" : "");
  $("dtb").innerHTML = buildTableRows(items, q);
}

function buildTableRows(items, q) {
  var isAll = currentKey === "ALL";
  var h = "";
  items.forEach(function(obj) {
    var item = obj.item || obj;
    var d = item.data || item;
    var isMatch = obj.isMatch;
    var cls = "sl-" + d[0];
    if (isMatch) cls += " hl-match";
    var secName = (SEC_MAP[d[0]] || "");
    var isSec = q && secName.toLowerCase().indexOf(q.toLowerCase()) !== -1;
    h += '<tr class="' + cls + '">';
    h += '<td><span class="tg t-' + d[0] + (isSec ? ' hl-section' : '') + '">' + d[0] + ' <span class="sn">' + secName + '</span></span></td><td>' + d[3] + '</td>';
    var descPrefix = "";
    if (isAll) {
      var pc = item.project || "";
      var cn = pc.replace(/[^A-Za-z0-9]/g, '');
      descPrefix = '<span class="proj-tag pj-' + cn + '">' + (item.projectName || pc) + '</span> ';
    }
    h += '<td>' + descPrefix + hlText(d[4], q) + '</td>';
    h += '<td class="n">' + (d[5] ? nf(d[5]) : "") + '</td><td>' + (d[6] || "") + '</td>';
    h += '<td class="n">' + nf(d[7]) + '</td><td class="n">' + nf(d[8]) + '</td><td class="n">' + nf(d[9]) + '</td><td class="n">' + nf(d[10]) + '</td><td class="n">' + nf(d[11]) + '</td></tr>';
  });
  return h;
}

// === Full Re-render ===
function renderAll() {
  renderMetrics(current);
  renderSummary(current);
  renderChart(current);
  renderDetail(current);
  if (adminMode) {
    var dws = document.querySelectorAll(".dw");
    var exps = document.querySelectorAll(".exp");
    dws.forEach(function(el) { el.classList.add("o"); });
    exps.forEach(function(el) {
      if (document.getElementById("dx_" + el.dataset.sec + "_" + el.dataset.seq)) {
        el.classList.add("o");
      }
    });
  }
  if (typeof lucide !== "undefined") lucide.createIcons();
}

// === Switch Project ===
function switchProject(key) {
  setNavActive(key);
  if (key === "ALL") {
    $("overview").style.display = "";
    $("projectView").style.display = "none";
    document.querySelector(".search-section").style.display = "";
    currentKey = "ALL";
    dQ = ""; dC = 0; dD = 1;
    $("searchBox").value = "";
    renderOverview();
    renderDetail(null);
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }
  if (key === "MASTER") {
    $("overview").style.display = "none";
    $("projectView").style.display = "";
    document.querySelector(".search-section").style.display = "none";
    currentKey = "MASTER";
    dQ = ""; dC = 0; dD = 1;
    $("searchBox").value = "";
    loadMasterData();
    if (typeof lucide !== "undefined") lucide.createIcons();
    return;
  }
  currentKey = key;
  current = PROJECTS[key];
  document.querySelector(".search-section").style.display = "";
  sCol = 1; sDir = 1;
  dQ = ""; dC = 0; dD = 1;
  $("searchBox").value = "";
  $("overview").style.display = "none";
  $("projectView").style.display = "";
  renderAll();
}

// === Update Nav Active ===
function setNavActive(key) {
  document.querySelectorAll("#topNav .tn").forEach(function(el) {
    el.classList.toggle("tn-active", el.dataset.proj === key);
  });
}

// === Overview Render ===
function renderOverview() {
  $("overview").style.display = "";
  $("projectView").style.display = "none";
  
  var keys = Object.keys(PROJECTS).sort();
  var totalBudget = 0, totalItems = 0;
  var rows = "";
  keys.forEach(function(k) {
    var p = PROJECTS[k];
    var b = 0;
    p.sd.forEach(function(r) { b += r[7]; });
    totalBudget += b;
    totalItems += p.dd.length;
    
    var mat = 0, lab = 0;
    p.sd.forEach(function(r) { mat += r[5]; lab += r[6]; });
    rows += '<tr class="sl-' + k + '">';
    rows += '<td><strong>' + p.name + '</strong><br><span class="proj-fullname">' + (p.fullName || '') + '</span></td>';
    rows += '<td>' + (p.period || '—') + '</td>';
    rows += '<td class="n">' + nf(b) + '</td>';
    rows += '<td class="n">' + nf(mat) + '</td>';
    rows += '<td class="n">' + nf(lab) + '</td>';
    rows += '<td class="n">' + p.sd.length + '</td>';
    rows += '<td class="n">' + p.dd.length + '</td></tr>';
  });
  
  $("projTitle").textContent = (adminMode ? "[ADMIN] " : "") + "ภาพรวม — " + keys.length + " โครงการ";
  $("metrics").innerHTML =
    '<div class="mc"><div class="l">จำนวนโครงการ</div><div class="v a">' + keys.length + '</div></div>' +
    '<div class="mc"><div class="l">งบรวมทุกโครงการ</div><div class="v g">&#3647;' + nf(totalBudget) + '</div></div>';
  
  $("overview").innerHTML =
    '<div class="card"><div class="card-title"><i data-lucide="table" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"></i> เปรียบเทียบแต่ละโครงการ</div>' +
    '<table><thead><tr><th>โครงการ</th><th>ช่วงออกแบบ</th><th class="n">งบรวม</th><th class="n">ค่าวัสดุ</th><th class="n">ค่าแรง</th><th class="n">รายการสรุป</th><th class="n">รายการละเอียด</th></tr></thead><tbody>' +
    rows +
    '</tbody></table></div>' +
    '<div class="card"><div class="card-title"><i data-lucide="bar-chart-3" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"></i> สัดส่วนงบประมาณแต่ละโครงการ</div><div id="overviewChart" class="bc"></div></div>';
  
  // Overview chart
  var mx = 0;
  keys.forEach(function(k) { var b = 0; PROJECTS[k].sd.forEach(function(r) { b += r[7]; }); if (b > mx) mx = b; });
  var cs = ["#00e676","#34d399","#facc15"];
  var ch = "";
  keys.forEach(function(k, i) {
    var b = 0; PROJECTS[k].sd.forEach(function(r) { b += r[7]; });
    var p = Math.max(2, b / mx * 100);
    ch += '<div class="br"><div class="bl">' + PROJECTS[k].name + '</div>';
    ch += '<div class="bt"><div class="bf" style="width:' + p + '%;background:' + cs[i % cs.length] + '">&#3647;' + nf(b) + '</div></div></div>';
  });
  $("overviewChart").innerHTML = ch;
  if (typeof lucide !== "undefined") lucide.createIcons();
}

// === Master BOQ Render ===
function loadMasterData() {
  if (MASTER_LOADED) {
    renderMaster();
    return;
  }
  $("projectView").innerHTML = '<div style="text-align:center;padding:40px;color:#555">⏳ กำลังโหลด Master BOQ...</div>';
  fetch('master_boq.json')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      MASTER_ITEMS = d;
      MASTER_LOADED = true;
      renderMaster();
    })
    .catch(function() {
      $("projectView").innerHTML = '<div style="text-align:center;padding:40px;color:#555">⚠️ ไม่สามารถโหลด Master BOQ ได้</div>';
    });
}

function renderMaster() {
  $("projTitle").textContent = "📋 Master BOQ — " + MASTER_ITEMS.length + " รายการไม่ซ้ำ";
  
  var totalVal = 0, secCount = {};
  MASTER_ITEMS.forEach(function(m) {
    totalVal += m.total_value;
    if (!secCount[m.section]) secCount[m.section] = 0;
    secCount[m.section]++;
  });
  
  var secNames = {A:'โครงสร้าง',B:'สถาปัตย์',C:'ไฟฟ้า',D:'A/C',E:'SAN',FURN:'EQUIP',SPEC:'SPECIAL'};
  $("metrics").innerHTML =
    '<div class="mc"><div class="l">รวมรายการ</div><div class="v a">' + MASTER_ITEMS.length + '</div></div>' +
    '<div class="mc"><div class="l">มูลค่ารวม</div><div class="v g">&#3647;' + nf(totalVal) + '</div></div>' +
    '<div class="mc"><div class="l">หมวดงาน</div><div class="v o">' + Object.keys(secCount).length + '</div></div>' +
    '<div class="mc"><div class="l">จากโปรเจค</div><div class="v p">9 โครงการ</div></div>';
  
  // Section summary
  var secH = '<div class="card"><div class="card-title">📊 สรุปตามหมวด</div><table><thead><tr><th>หมวด</th><th class="n">จำนวน</th><th class="n">มูลค่ารวม</th><th class="n">เฉลี่ย/รายการ</th></tr></thead><tbody>';
  ['A','B','C','D','E','FURN','SPEC'].forEach(function(k) {
    if (!secCount[k]) return;
    var sItems = MASTER_ITEMS.filter(function(m) { return m.section === k; });
    var sTotal = sItems.reduce(function(a, m) { return a + m.total_value; }, 0);
    var sAvg = sTotal / sItems.length;
    secH += '<tr><td><span class="tg t-' + k + '">' + k + ' ' + (secNames[k]||k) + '</span></td>'
      + '<td class="n">' + sItems.length + '</td>'
      + '<td class="n">' + nf(sTotal) + '</td>'
      + '<td class="n">' + nf(sAvg) + '</td></tr>';
  });
  secH += '</tbody></table></div>';
  
  // Table with all items
  var tabH = '<div class="card"><div class="card-title">📋 รายการทั้งหมด</div>';
  tabH += '<input type="text" id="masterSearch" class="big-search" placeholder="🔍 ค้นหาใน Master BOQ..." oninput="filterMaster()">';
  tabH += '<table id="masterTable"><thead><tr>'
    + '<th onclick="sortMaster(0)">#</th><th onclick="sortMaster(1)" style="min-width:180px">รายการ</th>'
    + '<th onclick="sortMaster(2)" class="c">หมวด</th><th onclick="sortMaster(3)" class="n">@วัสดุ</th>'
    + '<th onclick="sortMaster(4)" class="n">@แรง</th><th onclick="sortMaster(5)" class="n">มูลค่ารวม</th>'
    + '<th onclick="sortMaster(6)" class="c">โปรเจค</th></tr></thead><tbody id="masterBody"></tbody></table></div>';
  
  $("overview").style.display = "none";
  $("projectView").style.display = "";
  $("projectView").innerHTML = secH + tabH;
  
  window._masterSortCol = 0;
  window._masterSortDir = 1;
  window._masterQ = "";
  
  renderMasterTable();
}

function renderMasterTable() {
  var items = MASTER_ITEMS;
  var q = (window._masterQ || "").toLowerCase();
  if (q) {
    items = items.filter(function(m) {
      return m.desc.toLowerCase().indexOf(q) !== -1 || (m.section||"").toLowerCase().indexOf(q) !== -1;
    });
  }
  
  // Sort
  var col = window._masterSortCol || 0;
  var dir = window._masterSortDir || 1;
  items = items.slice().sort(function(a, b) {
    var va, vb;
    switch(col) {
      case 0: va = a.id; vb = b.id; break;
      case 1: va = a.desc; vb = b.desc; break;
      case 2: va = a.section; vb = b.section; break;
      case 3: va = a.avg_mat_rate; vb = b.avg_mat_rate; break;
      case 4: va = a.avg_lab_rate; vb = b.avg_lab_rate; break;
      case 5: va = a.total_value; vb = b.total_value; break;
      case 6: va = (a.projects||[]).length; vb = (b.projects||[]).length; break;
      default: va = a.id; vb = b.id;
    }
    if (typeof va === "string") return dir * va.localeCompare(vb);
    return dir * (va - vb);
  });
  
  var h = "";
  items.forEach(function(m) {
    var projs = (m.projects || []).join(", ");
    h += '<tr onclick="showMasterDetail(' + m.id + ')" style="cursor:pointer">'
      + '<td>' + m.id + '</td>'
      + '<td>' + m.desc + '</td>'
      + '<td class="c"><span class="tg t-' + m.section + '">' + m.section + '</span></td>'
      + '<td class="n">' + nf(m.avg_mat_rate) + '</td>'
      + '<td class="n">' + nf(m.avg_lab_rate) + '</td>'
      + '<td class="n">' + nf(m.total_value) + '</td>'
      + '<td class="c" style="font-size:11px">' + projs + '</td></tr>';
  });
  
  var body = document.getElementById("masterBody");
  if (body) body.innerHTML = h;
}

function filterMaster() {
  var el = document.getElementById("masterSearch");
  if (el) {
    window._masterQ = el.value;
    renderMasterTable();
  }
}

function sortMaster(col) {
  if (window._masterSortCol === col) window._masterSortDir *= -1;
  else { window._masterSortCol = col; window._masterSortDir = 1; }
  renderMasterTable();
}

var SECTION_SHORT2 = {A:'โครงสร้าง',B:'สถาปัตย์',C:'ไฟฟ้า',D:'A/C',E:'SAN',FURN:'EQUIP',SPEC:'SPECIAL'};

function showMasterDetail(id) {
  var item = MASTER_ITEMS.find(function(m) { return m.id === id; });
  if (!item) return;
  
  var prev = document.querySelector(".master-detail");
  if (prev) prev.remove();
  
  var projs = (item.projects || []).join(", ");
  var h = '<div class="master-detail card" style="margin-bottom:16px"><div class="card-title">#'
    + item.id + ' ' + item.desc + '</div>'
    + '<div class="stats" style="margin-bottom:8px">'
    + '<div class="stat-card"><div class="label">หมวด</div><div class="value"><span class="tg t-' + item.section + '">' + item.section + ' ' + (SECTION_SHORT2[item.section]||'') + '</span></div></div>'
    + '<div class="stat-card"><div class="label">@วัสดุ</div><div class="value accent">' + nf(item.avg_mat_rate) + '</div></div>'
    + '<div class="stat-card"><div class="label">@แรง</div><div class="value accent">' + nf(item.avg_lab_rate) + '</div></div>'
    + '<div class="stat-card"><div class="label">มูลค่ารวม</div><div class="value green">' + nf(item.total_value) + '</div></div>'
    + '<div class="stat-card"><div class="label">หน่วย</div><div class="value">' + item.unit + '</div></div>'
    + '<div class="stat-card"><div class="label">ปรากฏ</div><div class="value">' + item.occurrences + ' ครั้ง</div></div>'
    + '</div>'
    + '<div style="font-size:12px;color:var(--dim)">📁 โปรเจค: ' + projs + '</div>'
    + '<button class="btn" style="margin-top:8px" onclick="this.parentElement.remove()">ปิด</button></div>';
  
  var tn = document.querySelector("#projectView .card");
  if (tn) tn.insertAdjacentHTML("afterbegin", h);
}

// === Event Listeners ===

// Nav click — handled by buildTopNav()

// Detail sort — account for extra "โครงการ" column when ALL
document.querySelectorAll("#detTable th[data-s]").forEach(function(t) {
  t.addEventListener("click", function() {
    var isAll = currentKey === "ALL";
    var cols = isAll ? ["section","seq","proj","desc","","qty","unit","mat_rate","material","lab_rate","labor","total"]
                     : ["section","seq","desc","","qty","unit","mat_rate","material","lab_rate","labor","total"];
    var ci = cols.indexOf(t.dataset.s);
    if (ci < 0) ci = 0;
    dD = dC === ci ? dD * -1 : 1;
    dC = ci;
    renderDetail(current);
  });
});

// Summary sort
$("sumTable").addEventListener("click", function(e) {
  var r = e.target.closest("tr.exp"); if (!r) return;
  var dr = document.getElementById("dx_" + r.dataset.sec + "_" + r.dataset.seq); if (!dr) return;
  dr.classList.toggle("o"); r.classList.toggle("o");
});
document.querySelectorAll("#sumTable th[data-s]").forEach(function(t) {
  t.addEventListener("click", function() {
    var ci = ["section", "seq", "desc", "", "material", "labor", "total"].indexOf(t.dataset.s);
    if (ci < 0) ci = 1; sDir = sCol === ci ? sDir * -1 : 1; sCol = ci; renderSummary(current);
  });
});

// Search
$("searchBox").addEventListener("input", function() { 
  dQ = this.value; 
  renderDetail(current); 
});
$("searchBox").addEventListener("focus", function() {
  var ss = document.querySelector(".search-section");
  if (!ss) return;
  var top = ss.getBoundingClientRect().top;
  // Scroll only if search section is not already at/near viewport top (user scrolled far down)
  if (top > 100) {
    var absTop = ss.getBoundingClientRect().top + window.scrollY - 8;
    window.scrollTo({ top: absTop, behavior: "auto" });
  }
});
$("hide0").addEventListener("change", function() { dZ = this.checked; renderDetail(current); });

// === Admin Mode (Shift+T) ===
function toggleAdmin() {
  adminMode = !adminMode;
  var dws = document.querySelectorAll(".dw");
  var exps = document.querySelectorAll(".exp");
  if (adminMode) {
    dws.forEach(function(el) { el.classList.add("o"); });
    exps.forEach(function(el) {
      var dr = document.getElementById("dx_" + el.dataset.sec + "_" + el.dataset.seq);
      if (dr) el.classList.add("o");
    });
    $("projTitle").textContent = $("projTitle").textContent.replace(/\[ADMIN\]/g,"").trim();
    $("projTitle").textContent = "[ADMIN] " + $("projTitle").textContent;
    $("projTitle").style.color = "#00e676";
  } else {
    dws.forEach(function(el) { el.classList.remove("o"); });
    exps.forEach(function(el) { el.classList.remove("o"); });
    $("projTitle").textContent = $("projTitle").textContent.replace(/\[ADMIN\]\s*/g,"");
    $("projTitle").style.color = "";
  }
}

document.addEventListener("keydown", function(e) {
  if (e.shiftKey && e.key.toLowerCase() === "t") {
    e.preventDefault();
    toggleAdmin();
  }
});

// Init
buildTopNav();
switchProject("ALL");
// Apply Lucide icons after render
if (typeof lucide !== "undefined") lucide.createIcons();
