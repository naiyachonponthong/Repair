/* =====================================================================
   pages/qr.js — จุด QR ประจำเครื่อง/สถานที่ + สแกน + พิมพ์ป้าย + ลิงก์แจ้งซ่อม
   เส้นทาง: #/qr  #/scan  #/report/<code>
   ===================================================================== */
window.SP = window.SP || {};

SP.qrUrl = function (code) {
  return location.origin + location.pathname + '#/report/' + code;
};

/* ---------------------------------------------------------------
   จัดการจุด QR
   --------------------------------------------------------------- */
SP.pages.qr = function (el) {
  el.innerHTML = SP.head('ป้าย QR ประจำจุด', 'ติดที่เครื่องหรือหน้าห้อง สแกนแล้วแจ้งซ่อมได้ทันที',
    '<button class="btn btn-outline-secondary" onclick="SP.go(\'/scan\')"><i class="bi bi-qr-code-scan"></i> สแกน</button>' +
    '<button class="btn btn-outline-secondary" id="btnPrint"><i class="bi bi-printer"></i> พิมพ์ป้าย</button>' +
    '<button class="btn btn-primary" id="btnAdd"><i class="bi bi-plus-lg"></i> เพิ่มจุด</button>') +
    '<div class="card-x"><div class="bd p-0" id="qrBox">' + SP.empty('กำลังโหลด...', 'hourglass') + '</div></div>';

  var rows = [];
  SP.$('#btnAdd').onclick = function () { form(null); };
  SP.$('#btnPrint').onclick = function () { printLabels(rows); };

  SP.loadMaster().then(function () { return SP.api('qr.list'); }).then(function (d) {
    rows = d.rows;
    var box = SP.$('#qrBox');
    if (!rows.length) { box.innerHTML = SP.empty('ยังไม่มีจุด QR', 'qr-code'); return; }
    box.innerHTML = '<div class="table-responsive"><table class="table-x"><thead><tr>' +
      '<th>รหัส</th><th>เครื่อง / จุด</th><th>สถานที่</th><th>ประเภท</th><th></th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td><b>' + SP.esc(r.code) + '</b></td>' +
          '<td>' + SP.esc(r.asset || '-') + '<div style="font-size:12px;color:#5A6B63">' + SP.esc(r.spot || '') + '</div></td>' +
          '<td>' + SP.esc([r.building, r.location].filter(Boolean).join(' / ')) + '</td>' +
          '<td>' + SP.esc(r.category || '-') + '</td>' +
          '<td style="text-align:right;white-space:nowrap">' +
            '<button class="btn btn-sm btn-outline-secondary" data-edit="' + SP.esc(r.id) + '"><i class="bi bi-pencil"></i></button> ' +
            '<button class="btn btn-sm btn-outline-secondary" data-del="' + SP.esc(r.id) + '"><i class="bi bi-trash"></i></button>' +
          '</td></tr>';
      }).join('') + '</tbody></table></div>';

    SP.$$('#qrBox [data-edit]').forEach(function (b) {
      b.onclick = function () { form(rows.filter(function (x) { return x.id === b.dataset.edit; })[0]); };
    });
    SP.$$('#qrBox [data-del]').forEach(function (b) {
      b.onclick = function () {
        SP.ui.confirm('ลบจุดนี้ออกจากระบบ', function () {
          return SP.api('qr.delete', { id: b.dataset.del })
            .then(function () { SP.toast('ลบแล้ว'); SP.render(); return true; })
            .catch(function (e) { SP.err(e.message); return false; });
        });
      };
    });
  }).catch(function (e) {
    SP.$('#qrBox').innerHTML = SP.empty(e.message, 'exclamation-triangle');
  });

  function form(rec) {
    var m = SP.master;
    var buildings = [];
    m.locations.forEach(function (l) { if (buildings.indexOf(l.building) === -1) buildings.push(l.building); });
    rec = rec || {};

    SP.ui.open({
      title: rec.id ? 'แก้ไขจุด ' + rec.code : 'เพิ่มจุด QR',
      okText: 'บันทึก',
      body:
        '<div class="row g-3">' +
          '<div class="col-12"><label class="form-label">ชื่อเครื่อง / จุด *</label>' +
            '<input class="form-control" id="qAsset" value="' + SP.esc(rec.asset || '') + '" placeholder="เช่น Machine A-01 / แอร์ห้องประชุม"></div>' +
          '<div class="col-md-6"><label class="form-label">อาคาร</label>' +
            '<select class="form-select" id="qBld">' + sel(buildings, rec.building) + '</select></div>' +
          '<div class="col-md-6"><label class="form-label">ชั้น / บริเวณ</label>' +
            '<select class="form-select" id="qLoc"></select></div>' +
          '<div class="col-md-6"><label class="form-label">ห้อง / ตำแหน่ง</label>' +
            '<input class="form-control" id="qSpot" value="' + SP.esc(rec.spot || '') + '"></div>' +
          '<div class="col-md-6"><label class="form-label">ประเภทงานซ่อมเริ่มต้น</label>' +
            '<select class="form-select" id="qCat">' + sel(m.categories.map(function (c) { return c.name; }), rec.category) + '</select></div>' +
        '</div>',
      onShow: function () { fill(); SP.$('#qBld').onchange = fill; },
      onOk: function () {
        var asset = SP.$('#qAsset').value.trim();
        if (!asset) { SP.err('กรอกชื่อเครื่อง / จุด'); return false; }
        return SP.api('qr.save', {
          id: rec.id, asset: asset,
          building: SP.$('#qBld').value, location: SP.$('#qLoc').value,
          spot: SP.$('#qSpot').value.trim(), category: SP.$('#qCat').value
        }).then(function (d) { SP.toast('บันทึกจุด ' + d.point.code + ' แล้ว'); SP.render(); return true; })
          .catch(function (e) { SP.err(e.message); return false; });
      }
    });

    function fill() {
      var b = SP.$('#qBld').value;
      var ls = m.locations.filter(function (l) { return l.building === b; }).map(function (l) { return l.location; });
      SP.$('#qLoc').innerHTML = sel(ls.length ? ls : ['-'], rec.location);
    }
    function sel(arr, v) {
      return arr.map(function (x) {
        return '<option value="' + SP.esc(x) + '"' + (x === v ? ' selected' : '') + '>' + SP.esc(x) + '</option>';
      }).join('');
    }
  }

  function printLabels(list) {
    if (!list.length) return SP.err('ยังไม่มีจุดให้พิมพ์');
    var area = SP.$('#printArea');
    area.innerHTML = '<div class="qr-sheet">' + list.map(function (r) {
      return '<div class="qr-label">' +
        '<div class="qr-img" data-url="' + SP.esc(SP.qrUrl(r.code)) + '"></div>' +
        '<div class="qr-code">' + SP.esc(r.code) + '</div>' +
        '<div class="qr-asset">' + SP.esc(r.asset || '') + '</div>' +
        '<div class="qr-loc">' + SP.esc([r.building, r.location, r.spot].filter(Boolean).join(' / ')) + '</div>' +
        '<div class="qr-hint">สแกนเพื่อแจ้งซ่อม</div>' +
      '</div>';
    }).join('') + '</div>';

    SP.$$('#printArea .qr-img').forEach(function (d) {
      new QRCode(d, { text: d.dataset.url, width: 108, height: 108, correctLevel: QRCode.CorrectLevel.M });
    });
    setTimeout(function () { window.print(); }, 350);
  }
};

/* ---------------------------------------------------------------
   สแกน QR ด้วยกล้อง
   --------------------------------------------------------------- */
SP.pages.scan = function (el) {
  el.innerHTML = SP.head('สแกน QR', 'หันกล้องไปที่ป้าย QR ที่ติดอยู่กับเครื่องหรือหน้าห้อง',
    '<button class="btn btn-outline-secondary" onclick="SP.go(\'/qr\')">จัดการจุด</button>') +
    '<div class="row g-3"><div class="col-lg-7"><div class="card-x"><div class="bd">' +
      '<div id="reader" style="width:100%"></div>' +
      '<div class="mt-2" id="scMsg" style="font-size:13px;color:#5A6B63">กำลังเปิดกล้อง...</div>' +
    '</div></div></div>' +
    '<div class="col-lg-5"><div class="card-x"><div class="hd">กรอกรหัสเอง</div><div class="bd">' +
      '<div class="input-group"><input class="form-control" id="scCode" placeholder="P-0001">' +
      '<button class="btn btn-primary" id="scGo">ไป</button></div>' +
      '<div class="mt-2" style="font-size:13px;color:#5A6B63">ใช้เมื่อป้ายเสียหายหรือกล้องใช้ไม่ได้</div>' +
    '</div></div></div></div>';

  SP.$('#scGo').onclick = function () {
    var c = SP.$('#scCode').value.trim();
    if (c) SP.go('/report/' + c.toUpperCase());
  };

  if (typeof Html5Qrcode === 'undefined') {
    SP.$('#scMsg').textContent = 'โหลดตัวสแกนไม่สำเร็จ — ใช้ช่องกรอกรหัสแทนได้';
    return;
  }
  var scanner = new Html5Qrcode('reader');
  SP._leave = function () { try { scanner.stop().then(function () { scanner.clear(); }); } catch (e) {} };

  scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } },
    function (text) {
      var code = String(text).split('#/report/').pop().trim().toUpperCase();
      SP._leave();
      SP.go('/report/' + code);
    },
    function () { /* ไม่ต้องแจ้งทุกเฟรมที่อ่านไม่ออก */ }
  ).then(function () { SP.$('#scMsg').innerHTML = '<span class="pill pill-soft">พร้อมสแกน</span>'; })
   .catch(function (e) {
     SP.$('#scMsg').innerHTML = '<span class="pill pill-danger">' + SP.esc(e.name || e) + '</span> ' +
       'อนุญาตสิทธิ์กล้องแล้วลองใหม่ หรือกรอกรหัสเอง';
   });
};

/* ---------------------------------------------------------------
   ปลายทางของ QR — เปิดฟอร์มแจ้งซ่อมพร้อมเติมข้อมูลจุดให้
   --------------------------------------------------------------- */
SP.pages.report = function (el, code) {
  el.innerHTML = SP.head('แจ้งซ่อมจากป้าย QR', code || '') +
    '<div class="card-x"><div class="bd" id="rpBox">' + SP.empty('กำลังอ่านข้อมูลจุด...', 'qr-code') + '</div></div>';

  if (!code) { SP.$('#rpBox').innerHTML = SP.empty('ไม่พบรหัสจุดในลิงก์', 'exclamation-triangle'); return; }

  SP.loadMaster()
    .then(function () { return SP.api('qr.point', { code: code }); })
    .then(function (d) {
      var p = d.point;
      SP.$('#rpBox').innerHTML =
        '<div class="mb-2"><span class="pill pill-solid">' + SP.esc(p.code) + '</span></div>' +
        '<div style="font-size:18px;font-weight:700">' + SP.esc(p.asset || '-') + '</div>' +
        '<div style="color:#5A6B63" class="mb-3">' + SP.esc([p.building, p.location, p.spot].filter(Boolean).join(' / ')) + '</div>' +
        '<button class="btn btn-primary" id="rpGo"><i class="bi bi-plus-lg"></i> แจ้งซ่อมจุดนี้</button>';
      SP.$('#rpGo').onclick = open;
      open();

      function open() {
        SP.ticketForm({
          category: p.category, building: p.building, location: p.location,
          spot: p.spot || p.asset
        });
      }
    })
    .catch(function (e) { SP.$('#rpBox').innerHTML = SP.empty(e.message, 'exclamation-triangle'); });
};
