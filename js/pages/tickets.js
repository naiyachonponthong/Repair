/* =====================================================================
   pages/tickets.js — รายการใบแจ้งซ่อม / แจ้งซ่อมใหม่ / รายละเอียด
   เส้นทาง: #/tickets   และ  #/tickets/<id>
   ===================================================================== */
window.SP = window.SP || {};
SP.master = null;

SP.loadMaster = function () {
  if (SP.master) return Promise.resolve(SP.master);
  return SP.api('master.list', {}, { silent: true }).then(function (d) { SP.master = d; return d; });
};

SP.statusPill = function (key) {
  var s = (SP.master && SP.master.statuses || []).filter(function (x) { return x.key === key; })[0];
  if (!s) return '<span class="pill pill-line">' + SP.esc(key || '-') + '</span>';
  return '<span class="pill ' + s.pill + '">' + SP.esc(s.label) + '</span>';
};

SP.urgencyLabel = function (key) {
  var u = (SP.master && SP.master.urgency || []).filter(function (x) { return x.key === key; })[0];
  var cls = key === 'urgent' ? 'pill-danger' : key === 'high' ? 'pill-warn' : 'pill-line';
  return '<span class="pill ' + cls + '">' + SP.esc(u ? u.label : key) + '</span>';
};

/* ---------------------------------------------------------------
   หน้ารายการ
   --------------------------------------------------------------- */
SP.pages.tickets = function (el, param) {
  if (param) return SP.ticketDetail(el, param);

  el.innerHTML = SP.head('ใบแจ้งซ่อม', 'รายการแจ้งซ่อมทั้งหมดที่คุณเข้าถึงได้',
    '<button class="btn btn-primary" id="btnNew"><i class="bi bi-plus-lg"></i> แจ้งซ่อมใหม่</button>') +
    '<div class="card-x mb-3"><div class="bd">' +
      '<div class="row g-2 align-items-end">' +
        '<div class="col-12 col-md-5"><label class="form-label">ค้นหา</label>' +
          '<input class="form-control" id="fq" placeholder="รหัส / รายละเอียด / สถานที่"></div>' +
        '<div class="col-8 col-md-4"><label class="form-label">สถานะ</label>' +
          '<select class="form-select" id="fs"></select></div>' +
        '<div class="col-4 col-md-3"><button class="btn btn-outline-secondary w-100" id="btnFind">' +
          '<i class="bi bi-search"></i> ค้นหา</button></div>' +
      '</div>' +
    '</div></div>' +
    '<div class="card-x"><div class="hd" id="listHd">รายการ</div><div class="bd p-0" id="listBox"></div></div>';

  SP.$('#btnNew').onclick = function () { SP.ticketForm(); };

  SP.loadMaster().then(function (m) {
    SP.$('#fs').innerHTML = '<option value="all">ทั้งหมด</option>' +
      m.statuses.map(function (s) { return '<option value="' + s.key + '">' + SP.esc(s.label) + '</option>'; }).join('');
    load();
  }).catch(function (e) { SP.err(e.message); });

  function load() {
    SP.api('ticket.list', { q: SP.$('#fq').value.trim(), status: SP.$('#fs').value })
      .then(render).catch(function (e) { SP.err(e.message); });
  }
  SP.$('#btnFind').onclick = load;
  SP.$('#fq').addEventListener('keydown', function (e) { if (e.key === 'Enter') load(); });
  SP.$('#fs').addEventListener('change', load);
  SP._reload = load;

  function render(d) {
    SP.$('#listHd').textContent = 'รายการ (' + SP.fmt.num(d.total) + ')';
    var box = SP.$('#listBox');
    if (!d.rows.length) { box.innerHTML = SP.empty('ยังไม่มีใบแจ้งซ่อม', 'clipboard'); return; }

    box.innerHTML = '<div class="table-responsive"><table class="table-x"><thead><tr>' +
      '<th>รหัส</th><th>เรื่อง</th><th>สถานที่</th><th>ความเร่งด่วน</th><th>สถานะ</th><th>แจ้งเมื่อ</th>' +
      '</tr></thead><tbody>' +
      d.rows.map(function (t) {
        return '<tr style="cursor:pointer" data-id="' + SP.esc(t.id) + '">' +
          '<td><b>' + SP.esc(t.code) + '</b><div style="font-size:12px;color:#5A6B63">' + SP.esc(t.category) + '</div></td>' +
          '<td>' + SP.esc(String(t.detail).slice(0, 60)) + (String(t.detail).length > 60 ? '...' : '') +
            '<div style="font-size:12px;color:#5A6B63">' + SP.esc((t.reporter && t.reporter.name) || '') + '</div></td>' +
          '<td>' + SP.esc(t.building) + '<div style="font-size:12px;color:#5A6B63">' + SP.esc(t.location || '') + ' ' + SP.esc(t.spot || '') + '</div></td>' +
          '<td>' + SP.urgencyLabel(t.urgency) + '</td>' +
          '<td>' + SP.statusPill(t.status) + '</td>' +
          '<td style="white-space:nowrap">' + SP.fmt.datetime(t.created_at) + '</td>' +
          '</tr>';
      }).join('') + '</tbody></table></div>';

    SP.$$('#listBox tr[data-id]').forEach(function (tr) {
      tr.onclick = function () { SP.go('/tickets/' + tr.dataset.id); };
    });
  }
};

/* ---------------------------------------------------------------
   ฟอร์มแจ้งซ่อมใหม่ (modal)
   --------------------------------------------------------------- */
SP.ticketForm = function (preset) {
  preset = preset || {};
  SP.loadMaster().then(function (m) {
    var buildings = [];
    m.locations.forEach(function (l) { if (buildings.indexOf(l.building) === -1) buildings.push(l.building); });

    SP.ui.open({
      title: 'แจ้งซ่อมใหม่',
      size: 'lg',
      okText: 'ส่งใบแจ้งซ่อม',
      body:
        '<div class="row g-3">' +
          '<div class="col-md-6"><label class="form-label">ประเภทงานซ่อม *</label>' +
            '<select class="form-select" id="tCat">' + opts(m.categories.map(nameOf), preset.category) + '</select></div>' +
          '<div class="col-md-6"><label class="form-label">ระดับความเร่งด่วน *</label>' +
            '<select class="form-select" id="tUrg">' +
            m.urgency.map(function (u) {
              return '<option value="' + u.key + '"' + (u.key === 'normal' ? ' selected' : '') + '>' + SP.esc(u.label) + '</option>';
            }).join('') + '</select></div>' +
          '<div class="col-md-6"><label class="form-label">อาคาร / สถานที่ *</label>' +
            '<select class="form-select" id="tBld">' + opts(buildings, preset.building) + '</select></div>' +
          '<div class="col-md-6"><label class="form-label">ชั้น / บริเวณ</label>' +
            '<select class="form-select" id="tLoc"></select></div>' +
          '<div class="col-md-6"><label class="form-label">จุด / ห้อง / เครื่อง</label>' +
            '<input class="form-control" id="tSpot" value="' + SP.esc(preset.spot || '') + '" placeholder="เช่น ห้อง 201 / Machine A-01"></div>' +
          '<div class="col-md-6"><label class="form-label">หน่วยงานผู้แจ้ง</label>' +
            '<select class="form-select" id="tDept">' + opts([''].concat(m.depts.map(nameOf))) + '</select></div>' +
          '<div class="col-12"><label class="form-label">รายละเอียดปัญหา *</label>' +
            '<textarea class="form-control" id="tDetail" rows="3" placeholder="อธิบายอาการที่พบ"></textarea></div>' +
          '<div class="col-md-6"><label class="form-label">เบอร์ติดต่อกลับ</label>' +
            '<input class="form-control" id="tContact" inputmode="tel"></div>' +
          '<div class="col-12"><label class="form-label">รูปภาพประกอบ</label>' +
            '<div id="tPhotos"></div></div>' +
        '</div>',
      onShow: function () {
        var picker = SP.cam.picker(SP.$('#tPhotos'), { max: 5 });
        SP._picker = picker;
        fillLoc();
        SP.$('#tBld').onchange = fillLoc;
      },
      onOk: submit
    });

    function fillLoc() {
      var b = SP.$('#tBld').value;
      var ls = m.locations.filter(function (l) { return l.building === b; }).map(function (l) { return l.location; });
      SP.$('#tLoc').innerHTML = opts(ls.length ? ls : ['-'], preset.location);
    }

    function submit() {
      var payload = {
        category: SP.$('#tCat').value,
        urgency:  SP.$('#tUrg').value,
        building: SP.$('#tBld').value,
        location: SP.$('#tLoc').value,
        spot:     SP.$('#tSpot').value.trim(),
        dept:     SP.$('#tDept').value,
        detail:   SP.$('#tDetail').value.trim(),
        contact:  SP.$('#tContact').value.trim()
      };
      if (!payload.detail) { SP.err('กรุณากรอกรายละเอียดปัญหา'); return false; }

      var photos = SP._picker ? SP._picker.photos() : [];
      return SP.api('ticket.create', payload)
        .then(function (d) {
          if (!photos.length) return d;
          SP.busy(true);
          return SP.cam.upload(d.ticket.id, photos, 'report')
            .then(function () { SP.busy(false); return d; })
            .catch(function (e) { SP.busy(false); SP.toast('ส่งใบแจ้งซ่อมแล้ว แต่อัปโหลดรูปไม่สำเร็จ: ' + e.message, 'warn'); return d; });
        })
        .then(function (d) {
          SP.toast('ส่งใบแจ้งซ่อม ' + d.ticket.code + ' เรียบร้อย');
          SP.go('/tickets/' + d.ticket.id);
          return true;
        })
        .catch(function (e) { SP.err(e.message); return false; });
    }
  }).catch(function (e) { SP.err(e.message); });

  function nameOf(x) { return x.name || x.label || x; }
  function opts(arr, sel) {
    return arr.map(function (v) {
      return '<option value="' + SP.esc(v) + '"' + (v === sel ? ' selected' : '') + '>' + SP.esc(v || '- ไม่ระบุ -') + '</option>';
    }).join('');
  }
};

/* ---------------------------------------------------------------
   หน้ารายละเอียด
   --------------------------------------------------------------- */
SP.ticketDetail = function (el, id) {
  el.innerHTML = '<div class="card-x"><div class="bd">' + SP.empty('กำลังโหลด...', 'hourglass') + '</div></div>';

  SP.loadMaster()
    .then(function () { return SP.api('ticket.get', { id: id }); })
    .then(draw)
    .catch(function (e) {
      el.innerHTML = SP.head('ใบแจ้งซ่อม') + '<div class="card-x"><div class="bd">' +
        SP.empty(e.message, 'exclamation-triangle') + '</div></div>';
    });

  function draw(d) {
    var t = d.ticket;
    var canCancel = ['closed', 'cancelled'].indexOf(t.status) === -1;

    el.innerHTML =
      SP.head(t.code, t.category + ' · แจ้งเมื่อ ' + SP.fmt.datetime(t.created_at),
        '<button class="btn btn-outline-secondary" onclick="SP.go(\'/tickets\')">' +
        '<i class="bi bi-arrow-left"></i> กลับ</button>' +
        (canCancel ? '<button class="btn btn-outline-secondary" id="btnCancel">ยกเลิกใบนี้</button>' : '')) +

      '<div class="row g-3">' +
        '<div class="col-lg-8">' +
          '<div class="card-x mb-3"><div class="hd">รายละเอียดงาน</div><div class="bd">' +
            row('สถานะ', SP.statusPill(t.status) + ' ' + SP.urgencyLabel(t.urgency)) +
            row('สถานที่', SP.esc([t.building, t.location, t.spot].filter(Boolean).join(' / '))) +
            row('รายละเอียดปัญหา', '<div style="white-space:pre-wrap">' + SP.esc(t.detail) + '</div>') +
            row('ผู้แจ้ง', SP.esc((t.reporter && t.reporter.name) || '-') +
                (t.dept ? ' · ' + SP.esc(t.dept) : '') + (t.contact ? ' · ' + SP.esc(t.contact) : '')) +
            row('ผู้รับผิดชอบ', t.assignee ? SP.esc(t.assignee.name) : '<span class="text-muted-2">ยังไม่มอบหมาย</span>') +
            (t.result ? row('ผลการซ่อม',
              '<div style="white-space:pre-wrap">สาเหตุ: ' + SP.esc(t.result.cause) +
              '\nวิธีแก้ไข: ' + SP.esc(t.result.fix) +
              (t.result.hours ? '\nเวลาที่ใช้: ' + t.result.hours + ' ชม.' : '') + '</div>') : '') +
            (t.review ? row('ผลตรวจรับ',
              '★'.repeat(t.review.rating) + ' (' + t.review.rating + ')' +
              (t.review.comment ? ' — ' + SP.esc(t.review.comment) : '')) : '') +
          '</div></div>' +

          '<div class="card-x mb-3 hide" id="tActBox"></div>' +

          '<div class="card-x"><div class="hd">รูปภาพ (' + d.files.length + ')</div><div class="bd">' +
            (d.files.length
              ? '<div class="d-flex flex-wrap gap-2">' + d.files.map(function (f) {
                  return '<a href="https://drive.google.com/file/d/' + SP.esc(f.file_id) + '/view" target="_blank" rel="noopener">' +
                    '<img src="' + SP.esc(f.url) + '" title="' + SP.esc(f.stage) + '" ' +
                    'style="width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #DFE5E2"></a>';
                }).join('') + '</div>'
              : SP.empty('ยังไม่มีรูปภาพ', 'image')) +
          '</div></div>' +
        '</div>' +

        '<div class="col-lg-4"><div class="card-x"><div class="hd">ประวัติการดำเนินการ</div><div class="bd">' +
          (d.timeline.length
            ? d.timeline.map(function (x) {
                return '<div style="border-left:2px solid #DFE5E2;padding:0 0 14px 12px;margin-left:4px">' +
                  '<div style="font-size:13px;font-weight:600">' + SP.esc(actionLabel(x.action)) + '</div>' +
                  (x.note ? '<div style="font-size:13px">' + SP.esc(x.note) + '</div>' : '') +
                  '<div style="font-size:12px;color:#5A6B63">' + SP.fmt.datetime(x.created_at) +
                  ((x.by && x.by.name) ? ' · ' + SP.esc(x.by.name) : '') + '</div></div>';
              }).join('')
            : SP.empty('ยังไม่มีประวัติ', 'clock-history')) +
        '</div></div></div>' +
      '</div>';

    if (SP.workActions) SP.workActions(SP.$('#tActBox'), t);

    if (canCancel) SP.$('#btnCancel').onclick = function () {
      SP.ui.open({
        title: 'ยกเลิกใบแจ้งซ่อม',
        okText: 'ยืนยันยกเลิก',
        body: '<label class="form-label">เหตุผล</label><input class="form-control" id="cReason">',
        onOk: function () {
          return SP.api('ticket.cancel', { id: t.id, reason: SP.$('#cReason').value.trim() })
            .then(function () { SP.toast('ยกเลิกใบแจ้งซ่อมแล้ว'); SP.render(); return true; })
            .catch(function (e) { SP.err(e.message); return false; });
        }
      });
    };
  }

  function row(k, v) {
    return '<div class="mb-3"><div style="font-size:12px;color:#5A6B63">' + SP.esc(k) + '</div>' +
           '<div>' + v + '</div></div>';
  }
  function actionLabel(a) {
    return { create: 'แจ้งซ่อม', cancel: 'ยกเลิกงาน', assign: 'มอบหมายงาน',
             progress: 'อัปเดตความคืบหน้า', close: 'ปิดงาน' }[a] || a;
  }
};
