/* =====================================================================
   app.js — namespace, เมนู, router, boot
   หมายเหตุ: บน GitHub Pages ใช้ hash router ได้ตามปกติ
   (ข้อห้าม hashchange ใช้กับ HtmlService เท่านั้น เพราะ <base target="_top">)
   ===================================================================== */
window.SP = window.SP || {};
SP.pages   = SP.pages || {};
SP.pageKey = 'dashboard';
SP.param   = '';

/* ---------- เมนู ---------- */
SP.MENU = [
  { group: 'งานประจำวัน', items: [
    { key: 'dashboard', label: 'ภาพรวม',        icon: 'speedometer2' },
    { key: 'tickets',   label: 'ใบแจ้งซ่อม',     icon: 'clipboard-plus' },
    { key: 'scan',      label: 'สแกน QR แจ้งซ่อม', icon: 'qr-code-scan' },
    { key: 'approval',  label: 'รออนุมัติ',      icon: 'check2-square' },
    { key: 'work',      label: 'งานของช่าง',     icon: 'tools' }
  ]},
  { group: 'ข้อมูลและรายงาน', items: [
    { key: 'reports',   label: 'รายงาน',         icon: 'graph-up' },
    { key: 'qr',        label: 'ป้าย QR ประจำจุด', icon: 'qr-code' }
  ]},
  { group: 'ระบบ', items: [
    { key: 'camera',    label: 'ทดสอบกล้อง',     icon: 'camera' },
    { key: 'settings',  label: 'ตั้งค่า',        icon: 'gear' }
  ]}
];

SP.buildNav = function () {
  var h = '';
  SP.MENU.forEach(function (g) {
    h += '<div class="rr-navgroup">' + SP.esc(g.group) + '</div>';
    g.items.forEach(function (it) {
      h += '<a href="#/' + it.key + '" data-key="' + it.key + '">' +
           '<span class="ico"><i class="bi bi-' + it.icon + '"></i></span>' +
           SP.esc(it.label) + '</a>';
    });
  });
  SP.$('#sbNav').innerHTML = h;
};

SP.markNav = function () {
  SP.$$('#sbNav a').forEach(function (a) {
    a.classList.toggle('active', a.getAttribute('data-key') === SP.pageKey);
  });
};

/* ---------- router ---------- */
SP.go = function (path) { location.hash = path.charAt(0) === '#' ? path.slice(1) : path; };

SP.route = function () {
  var raw = (location.hash || '#/dashboard').replace(/^#\/?/, '');
  var seg = raw.split('/');
  SP.pageKey = seg[0] || 'dashboard';
  SP.param   = seg[1] || '';
  SP.render();
};

SP.render = function () {
  var el = SP.$('#rrPage');
  var fn = SP.pages[SP.pageKey];
  SP.markNav();
  document.body.classList.remove('nav-open');
  if (SP._leave) { try { SP._leave(); } catch (e) {} SP._leave = null; }

  if (!fn) {
    el.innerHTML = '<div class="card-x"><div class="bd">' +
      SP.empty('หน้านี้จะเปิดใช้งานหลังย้ายข้อมูลส่วนที่เกี่ยวข้อง', 'hourglass-split') +
      '</div></div>';
    return;
  }
  try { fn(el, SP.param); }
  catch (e) { SP.err('แสดงหน้าไม่สำเร็จ: ' + (e.message || e)); }
};

SP.head = function (title, sub, actions) {
  return '<div class="page-head"><div><h2>' + SP.esc(title) + '</h2>' +
         (sub ? '<div class="sub">' + SP.esc(sub) + '</div>' : '') +
         '</div>' + (actions ? '<div class="act">' + actions + '</div>' : '') + '</div>';
};

/* ---------- หน้า: ภาพรวม ---------- */
SP.pages.dashboard = function (el) {
  var u = SP.user || {};
  el.innerHTML =
    SP.head('ภาพรวม', 'สวัสดี ' + (u.name || u.username || ''),
      '<button class="btn btn-primary" onclick="SP.ticketForm()"><i class="bi bi-plus-lg"></i> แจ้งซ่อมใหม่</button>') +
    '<div class="row g-3 mb-3" id="dashStat">' +
      [['งานทั้งหมด', 'total'], ['กำลังดำเนินการ', 'working'], ['รอรับเรื่อง', 'waiting_approve'], ['เสร็จ/ปิดงาน', 'done']]
      .map(function (s) {
        return '<div class="col-6 col-lg-3"><div class="stat"><div class="lbl">' + s[0] +
               '</div><div class="val" data-k="' + s[1] + '">-</div></div></div>';
      }).join('') +
    '</div>' +
    '<div class="card-x"><div class="hd">แจ้งซ่อมล่าสุด</div><div class="bd p-0" id="dashLatest">' +
      SP.empty('กำลังโหลด...', 'hourglass') + '</div></div>';

  SP.loadMaster()
    .then(function () { return SP.api('dash.summary', {}, { silent: true }); })
    .then(function (d) {
      SP.$$('#dashStat .val').forEach(function (v) { v.textContent = SP.fmt.num(d[v.dataset.k]); });
      var box = SP.$('#dashLatest');
      if (!d.latest.length) { box.innerHTML = SP.empty('ยังไม่มีใบแจ้งซ่อม', 'clipboard'); return; }
      box.innerHTML = '<div class="table-responsive"><table class="table-x"><thead><tr>' +
        '<th>รหัส</th><th>เรื่อง</th><th>สถานะ</th><th>แจ้งเมื่อ</th></tr></thead><tbody>' +
        d.latest.map(function (t) {
          return '<tr style="cursor:pointer" data-id="' + SP.esc(t.id) + '">' +
            '<td><b>' + SP.esc(t.code) + '</b></td>' +
            '<td>' + SP.esc(String(t.detail).slice(0, 48)) + '</td>' +
            '<td>' + SP.statusPill(t.status) + '</td>' +
            '<td style="white-space:nowrap">' + SP.fmt.datetime(t.created_at) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      SP.$$('#dashLatest tr[data-id]').forEach(function (tr) {
        tr.onclick = function () { SP.go('/tickets/' + tr.dataset.id); };
      });
    })
    .catch(function (e) { SP.$('#dashLatest').innerHTML = SP.empty(e.message, 'exclamation-triangle'); });
};

/* ---------- หน้า: ทดสอบกล้อง (พิสูจน์ว่าการย้ายได้ผล) ---------- */
SP.pages.camera = function (el) {
  el.innerHTML =
    SP.head('ทดสอบกล้อง', 'ตรวจว่าเบราว์เซอร์เปิดกล้องสดได้จริงบนโดเมนนี้') +
    '<div class="row g-3"><div class="col-lg-7"><div class="card-x"><div class="hd">กล้อง</div><div class="bd">' +
      '<video id="camV" playsinline muted style="width:100%;border-radius:10px;background:#111;aspect-ratio:4/3;object-fit:cover"></video>' +
      '<div class="d-flex gap-2 mt-3">' +
        '<button class="btn btn-primary" id="camStart"><i class="bi bi-camera-video"></i> เปิดกล้อง</button>' +
        '<button class="btn btn-primary" id="camShot" disabled><i class="bi bi-camera"></i> ถ่ายภาพ</button>' +
        '<button class="btn btn-outline-secondary" id="camStop" disabled>ปิด</button>' +
      '</div>' +
      '<div class="mt-3" style="font-size:13px" id="camMsg"></div>' +
    '</div></div></div>' +
    '<div class="col-lg-5"><div class="card-x"><div class="hd">ภาพที่ได้ (ย่อแล้ว)</div><div class="bd">' +
      '<div id="camOut">' + SP.empty('ยังไม่ได้ถ่ายภาพ', 'image') + '</div>' +
    '</div></div></div></div>';

  var v = SP.$('#camV'), stream = null;

  function stop() {
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    SP.$('#camShot').disabled = true; SP.$('#camStop').disabled = true;
  }
  SP._leave = stop;   // กันไฟกล้องค้างเมื่อเปลี่ยนหน้า

  SP.$('#camStart').onclick = function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return SP.err('เบราว์เซอร์นี้ไม่รองรับ getUserMedia');
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(function (s) {
        stream = s; v.srcObject = s; return v.play();
      })
      .then(function () {
        SP.$('#camShot').disabled = false; SP.$('#camStop').disabled = false;
        SP.$('#camMsg').innerHTML = '<span class="pill pill-soft">พร้อมใช้งาน</span> ' +
          SP.esc(v.videoWidth + '×' + v.videoHeight);
      })
      .catch(function (e) {
        SP.err('เปิดกล้องไม่สำเร็จ: ' + e.name);
        SP.$('#camMsg').innerHTML = '<span class="pill pill-danger">' + SP.esc(e.name) + '</span> ' +
          'ตรวจสอบว่าเป็น https และอนุญาตสิทธิ์กล้องแล้ว';
      });
  };

  SP.$('#camStop').onclick = stop;

  SP.$('#camShot').onclick = function () {
    var maxW = 1280, sc = Math.min(1, maxW / v.videoWidth);
    var c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * sc); c.height = Math.round(v.videoHeight * sc);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    var url = c.toDataURL('image/jpeg', 0.7);
    var kb = Math.round(url.length * 0.75 / 1024);
    SP.$('#camOut').innerHTML =
      '<img src="' + url + '" style="width:100%;border-radius:10px">' +
      '<div class="mt-2" style="font-size:13px">ขนาด ~' + kb + ' KB (' + c.width + '×' + c.height + ')</div>';
    SP.toast('ถ่ายภาพสำเร็จ');
  };
};

/* ---------- boot ---------- */
window.onerror = function (msg) { SP.err('ข้อผิดพลาด: ' + msg); };
window.addEventListener('unhandledrejection', function (e) {
  var m = (e.reason && e.reason.message) || '';
  if (m && m !== 'SESSION') SP.err(m);
});
window.addEventListener('hashchange', function () { if (SP.user) SP.route(); });

document.addEventListener('DOMContentLoaded', function () {
  SP.$('#btnLogin').onclick = SP.auth.login;
  SP.$('#btnEye').onclick = function () {
    var i = SP.$('#inPass');
    i.type = i.type === 'password' ? 'text' : 'password';
    this.innerHTML = '<i class="bi bi-eye' + (i.type === 'text' ? '-slash' : '') + '"></i>';
  };
  ['#inUser', '#inPass'].forEach(function (s) {
    SP.$(s).addEventListener('keydown', function (e) { if (e.key === 'Enter') SP.auth.login(); });
  });

  SP.auth.loadInfo().then(SP.auth.restore).then(function (ok) {
    if (ok) SP.auth.showApp(); else SP.auth.showLogin();
  });
});
