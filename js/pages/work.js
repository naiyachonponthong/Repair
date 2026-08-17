/* =====================================================================
   pages/work.js — งานของช่าง + แผงปุ่มดำเนินการในหน้ารายละเอียดใบแจ้งซ่อม
   ===================================================================== */
window.SP = window.SP || {};

/* ---------------------------------------------------------------
   หน้า: งานของช่าง
   --------------------------------------------------------------- */
SP.pages.work = function (el) {
  var scope = SP._workScope || 'open';

  el.innerHTML = SP.head('งานของช่าง', 'งานที่มอบหมายให้คุณ เรียงตามความเร่งด่วน') +
    '<div class="card-x mb-3"><div class="bd d-flex gap-2 flex-wrap">' +
      btn('open', 'กำลังทำ') + btn('unassigned', 'ยังไม่มอบหมาย') + btn('done', 'เสร็จแล้ว') +
    '</div></div>' +
    '<div id="workBox">' + SP.empty('กำลังโหลด...', 'hourglass') + '</div>';

  function btn(k, label) {
    return '<button class="btn btn-sm ' + (scope === k ? 'btn-primary' : 'btn-outline-secondary') +
           '" data-scope="' + k + '">' + label + '</button>';
  }

  SP.$$('#rrPage [data-scope]').forEach(function (b) {
    b.onclick = function () { SP._workScope = b.dataset.scope; SP.render(); };
  });

  SP.loadMaster()
    .then(function () { return SP.api('work.mine', { scope: scope }); })
    .then(function (d) {
      var box = SP.$('#workBox');
      if (!d.rows.length) { box.innerHTML = '<div class="card-x"><div class="bd">' + SP.empty('ไม่มีงานในหมวดนี้', 'tools') + '</div></div>'; return; }
      box.innerHTML = '<div class="row g-3">' + d.rows.map(function (t) {
        return '<div class="col-md-6 col-xl-4"><div class="card-x h-100" style="cursor:pointer" data-id="' + SP.esc(t.id) + '">' +
          '<div class="hd d-flex justify-content-between align-items-center">' +
            '<span>' + SP.esc(t.code) + '</span>' + SP.urgencyLabel(t.urgency) + '</div>' +
          '<div class="bd">' +
            '<div style="font-weight:600;margin-bottom:6px">' + SP.esc(String(t.detail).slice(0, 70)) + '</div>' +
            '<div style="font-size:13px;color:#5A6B63">' +
              '<i class="bi bi-geo-alt"></i> ' + SP.esc([t.building, t.location, t.spot].filter(Boolean).join(' / ')) + '</div>' +
            '<div style="font-size:13px;color:#5A6B63;margin-bottom:8px">' +
              '<i class="bi bi-person"></i> ' + SP.esc(t.assignee ? t.assignee.name : 'ยังไม่มอบหมาย') + '</div>' +
            SP.statusPill(t.status) +
            (t.parts && t.parts.status === 'pending' ? ' <span class="pill pill-warn">รออนุมัติงบ</span>' : '') +
          '</div></div></div>';
      }).join('') + '</div>';

      SP.$$('#workBox [data-id]').forEach(function (c) {
        c.onclick = function () { SP.go('/tickets/' + c.dataset.id); };
      });
    })
    .catch(function (e) {
      SP.$('#workBox').innerHTML = '<div class="card-x"><div class="bd">' + SP.empty(e.message, 'exclamation-triangle') + '</div></div>';
    });
};

/* ---------------------------------------------------------------
   แผงปุ่มดำเนินการ (เรียกจาก SP.ticketDetail)
   --------------------------------------------------------------- */
SP.workActions = function (box, t) {
  var u = SP.user || {};
  var mine = t.assignee && t.assignee.id === u.id;
  var own  = t.reporter && t.reporter.id === u.id;
  var boss = ['admin', 'manager', 'staff', 'head'].indexOf(u.role) > -1 ||
             (u.permissions || []).indexOf('*') > -1 || (u.permissions || []).indexOf('assign') > -1;
  var b = [];

  if (boss && ['new', 'assigned', 'in_progress', 'waiting_part'].indexOf(t.status) > -1)
    b.push(['assign', t.assignee ? 'เปลี่ยนผู้รับผิดชอบ' : 'มอบหมายช่าง', 'person-check', 'btn-primary']);
  if ((mine || boss) && t.status === 'assigned')
    b.push(['start', 'เริ่มดำเนินการ', 'play-circle', 'btn-primary']);
  if ((mine || boss) && ['in_progress', 'waiting_part'].indexOf(t.status) > -1) {
    b.push(['progress', 'อัปเดตความคืบหน้า', 'pencil', 'btn-outline-secondary']);
    b.push(['photo', 'แนบรูประหว่างซ่อม', 'camera', 'btn-outline-secondary']);
    b.push(['parts', 'อะไหล่ / ค่าใช้จ่าย', 'box-seam', 'btn-outline-secondary']);
  }
  if ((mine || boss) && t.status === 'in_progress')
    b.push(['complete', 'บันทึกซ่อมเสร็จ', 'check2-circle', 'btn-primary']);
  if ((own || boss) && t.status === 'completed')
    b.push(['confirm', 'ยืนยันผลการซ่อม', 'hand-thumbs-up', 'btn-primary']);

  if (!b.length) { box.classList.add('hide'); return; }
  box.classList.remove('hide');
  box.innerHTML = '<div class="hd">การดำเนินการ</div><div class="bd d-flex gap-2 flex-wrap">' +
    b.map(function (x) {
      return '<button class="btn ' + x[3] + '" data-act="' + x[0] + '"><i class="bi bi-' + x[2] + '"></i> ' + x[1] + '</button>';
    }).join('') +
    (t.parts ? partsBox(t) : '') + '</div>';

  box.querySelectorAll('[data-act]').forEach(function (btn) {
    btn.onclick = function () { SP.workAct[btn.dataset.act](t); };
  });

  function partsBox(t) {
    var p = t.parts, cls = { pending: 'pill-warn', approved: 'pill-soft', rejected: 'pill-danger', auto: 'pill-line' }[p.status] || 'pill-line';
    var lbl = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ', auto: 'อยู่ในวงเงิน' }[p.status] || p.status;
    return '<div class="w-100 mt-2" style="font-size:13px">' +
      'ค่าใช้จ่ายรวม <b>' + SP.fmt.num(p.total) + '</b> บาท <span class="pill ' + cls + '">' + lbl + '</span></div>';
  }
};

/* ---------------------------------------------------------------
   การกระทำแต่ละอย่าง
   --------------------------------------------------------------- */
SP.workAct = {};

function done(msg) { SP.toast(msg); SP.render(); return true; }
function fail(e) { SP.err(e.message || e); return false; }

SP.workAct.assign = function (t) {
  SP.api('tech.list', {}, { silent: true }).then(function (list) {
    SP.ui.open({
      title: 'มอบหมายงาน ' + t.code,
      okText: 'มอบหมาย',
      body:
        '<div class="mb-3"><label class="form-label">ช่างผู้รับผิดชอบ *</label>' +
          '<select class="form-select" id="aTech">' + list.map(function (x) {
            return '<option value="' + SP.esc(x.id) + '"' + (t.assignee && t.assignee.id === x.id ? ' selected' : '') + '>' +
                   SP.esc(x.name) + '</option>';
          }).join('') + '</select></div>' +
        '<div class="mb-3"><label class="form-label">กำหนดเสร็จ</label>' +
          '<input type="date" class="form-control" id="aDue" value="' + SP.esc(t.due_date || '') + '"></div>' +
        '<div><label class="form-label">หมายเหตุ</label><input class="form-control" id="aNote"></div>',
      onOk: function () {
        return SP.api('work.assign', {
          ticket_id: t.id, assignee_id: SP.$('#aTech').value,
          due_date: SP.$('#aDue').value, note: SP.$('#aNote').value.trim()
        }).then(function () { return done('มอบหมายงานแล้ว'); }).catch(fail);
      }
    });
  }).catch(function (e) { SP.err(e.message); });
};

SP.workAct.start = function (t) {
  SP.api('work.progress', { ticket_id: t.id, status: 'in_progress', note: 'เริ่มดำเนินการ' })
    .then(function () { done('เริ่มงานแล้ว'); }).catch(function (e) { SP.err(e.message); });
};

SP.workAct.progress = function (t) {
  SP.ui.open({
    title: 'อัปเดตความคืบหน้า',
    okText: 'บันทึก',
    body:
      '<div class="mb-3"><label class="form-label">สถานะ</label>' +
        '<select class="form-select" id="pSt">' +
          '<option value="in_progress">กำลังดำเนินการ</option>' +
          '<option value="waiting_part"' + (t.status === 'waiting_part' ? ' selected' : '') + '>รออะไหล่</option>' +
        '</select></div>' +
      '<div><label class="form-label">บันทึกการดำเนินงาน</label>' +
        '<textarea class="form-control" id="pNote" rows="3"></textarea></div>',
    onOk: function () {
      return SP.api('work.progress', {
        ticket_id: t.id, status: SP.$('#pSt').value, note: SP.$('#pNote').value.trim()
      }).then(function () { return done('บันทึกแล้ว'); }).catch(fail);
    }
  });
};

SP.workAct.photo = function (t) {
  var pk;
  SP.ui.open({
    title: 'แนบรูประหว่างซ่อม',
    okText: 'อัปโหลด',
    body: '<div class="mb-2"><label class="form-label">ประเภทรูป</label>' +
            '<select class="form-select" id="phStage">' +
              '<option value="before">ก่อนซ่อม</option>' +
              '<option value="after">หลังซ่อม</option>' +
            '</select></div><div id="phBox"></div>',
    onShow: function () { pk = SP.cam.picker(SP.$('#phBox'), { max: 5 }); },
    onOk: function () {
      var ph = pk ? pk.photos() : [];
      if (!ph.length) { SP.err('ยังไม่ได้เลือกรูป'); return false; }
      SP.busy(true);
      return SP.cam.upload(t.id, ph, SP.$('#phStage').value)
        .then(function () { SP.busy(false); return done('อัปโหลดรูปแล้ว'); })
        .catch(function (e) { SP.busy(false); return fail(e); });
    }
  });
};

SP.workAct.parts = function (t) {
  var items = (t.parts && t.parts.items) ? t.parts.items.slice() : [];
  if (!items.length) items = [{ name: '', qty: 1, price: 0 }];

  SP.ui.open({
    title: 'อะไหล่และค่าใช้จ่าย',
    size: 'lg',
    okText: 'บันทึก',
    body:
      '<div id="ptRows"></div>' +
      '<button type="button" class="btn btn-sm btn-outline-secondary mt-2" id="ptAdd">' +
        '<i class="bi bi-plus-lg"></i> เพิ่มรายการ</button>' +
      '<div class="row g-3 mt-1">' +
        '<div class="col-md-6"><label class="form-label">ค่าแรง (บาท)</label>' +
          '<input type="number" class="form-control" id="ptLabor" value="' + ((t.parts && t.parts.labor_cost) || 0) + '"></div>' +
        '<div class="col-md-6"><label class="form-label">รวมทั้งสิ้น</label>' +
          '<div class="form-control" style="background:#F2F6F4" id="ptTotal">0</div></div>' +
        '<div class="col-12"><label class="form-label">หมายเหตุ</label>' +
          '<input class="form-control" id="ptNote" value="' + SP.esc((t.parts && t.parts.note) || '') + '"></div>' +
      '</div>' +
      '<div class="mt-2" style="font-size:13px;color:#5A6B63">เกินวงเงินที่ตั้งไว้จะถูกส่งเข้าคิวขออนุมัติอัตโนมัติ</div>',
    onShow: draw,
    onOk: function () {
      return SP.api('work.parts', {
        ticket_id: t.id, items: read(),
        labor_cost: Number(SP.$('#ptLabor').value || 0),
        note: SP.$('#ptNote').value.trim()
      }).then(function (d) {
        return done(d.need_approve
          ? 'ส่งขออนุมัติค่าใช้จ่าย ' + SP.fmt.num(d.total) + ' บาท'
          : 'บันทึกค่าใช้จ่ายแล้ว');
      }).catch(fail);
    }
  });

  function draw() {
    SP.$('#ptRows').innerHTML = items.map(function (it, i) {
      return '<div class="row g-2 mb-2 align-items-end" data-i="' + i + '">' +
        '<div class="col-5"><label class="form-label' + (i ? ' d-none' : '') + '">รายการอะไหล่</label>' +
          '<input class="form-control" data-f="name" value="' + SP.esc(it.name) + '"></div>' +
        '<div class="col-3"><label class="form-label' + (i ? ' d-none' : '') + '">จำนวน</label>' +
          '<input type="number" class="form-control" data-f="qty" value="' + Number(it.qty) + '"></div>' +
        '<div class="col-3"><label class="form-label' + (i ? ' d-none' : '') + '">ราคา/หน่วย</label>' +
          '<input type="number" class="form-control" data-f="price" value="' + Number(it.price) + '"></div>' +
        '<div class="col-1"><button type="button" class="btn btn-outline-secondary w-100" data-del="' + i + '">&times;</button></div>' +
      '</div>';
    }).join('');
    SP.$('#ptRows').oninput = sum;
    SP.$('#ptLabor').oninput = sum;
    SP.$('#ptAdd').onclick = function () { items = read(); items.push({ name: '', qty: 1, price: 0 }); draw(); };
    SP.$$('#ptRows [data-del]').forEach(function (b) {
      b.onclick = function () { items = read(); items.splice(Number(b.dataset.del), 1); if (!items.length) items = [{ name: '', qty: 1, price: 0 }]; draw(); };
    });
    sum();
  }
  function read() {
    return SP.$$('#ptRows [data-i]').map(function (r) {
      return {
        name: r.querySelector('[data-f="name"]').value.trim(),
        qty: Number(r.querySelector('[data-f="qty"]').value || 0),
        price: Number(r.querySelector('[data-f="price"]').value || 0)
      };
    });
  }
  function sum() {
    var tot = read().reduce(function (s, x) { return s + x.qty * x.price; }, 0) + Number(SP.$('#ptLabor').value || 0);
    SP.$('#ptTotal').textContent = SP.fmt.num(tot) + ' บาท';
  }
};

SP.workAct.complete = function (t) {
  var pk;
  SP.ui.open({
    title: 'บันทึกผลการซ่อม ' + t.code,
    size: 'lg',
    okText: 'บันทึกซ่อมเสร็จ',
    body:
      '<div class="row g-3">' +
        '<div class="col-md-6"><label class="form-label">สาเหตุของปัญหา *</label>' +
          '<input class="form-control" id="cCause"></div>' +
        '<div class="col-md-6"><label class="form-label">เวลาที่ใช้ (ชั่วโมง)</label>' +
          '<input type="number" step="0.5" class="form-control" id="cHours" value="1"></div>' +
        '<div class="col-12"><label class="form-label">วิธีการแก้ไข *</label>' +
          '<textarea class="form-control" id="cFix" rows="3"></textarea></div>' +
        '<div class="col-12"><label class="form-label">รูปหลังซ่อม</label><div id="cPhotos"></div></div>' +
      '</div>',
    onShow: function () { pk = SP.cam.picker(SP.$('#cPhotos'), { max: 5 }); },
    onOk: function () {
      var cause = SP.$('#cCause').value.trim(), fix = SP.$('#cFix').value.trim();
      if (!cause || !fix) { SP.err('กรอกสาเหตุและวิธีแก้ไขให้ครบ'); return false; }
      var ph = pk ? pk.photos() : [];
      return SP.api('work.complete', {
        ticket_id: t.id, cause: cause, fix: fix, hours: Number(SP.$('#cHours').value || 0)
      })
      .then(function () {
        if (!ph.length) return;
        SP.busy(true);
        return SP.cam.upload(t.id, ph, 'after').then(function () { SP.busy(false); })
          .catch(function (e) { SP.busy(false); SP.toast('บันทึกแล้ว แต่อัปโหลดรูปไม่สำเร็จ', 'warn'); });
      })
      .then(function () { return done('บันทึกซ่อมเสร็จแล้ว รอผู้แจ้งยืนยันผล'); })
      .catch(fail);
    }
  });
};

SP.workAct.confirm = function (t) {
  SP.ui.open({
    title: 'ยืนยันผลการซ่อม ' + t.code,
    okText: 'ส่งผลตรวจสอบ',
    body:
      '<div class="mb-3"><label class="form-label">ผลการตรวจสอบ</label>' +
        '<select class="form-select" id="fSat">' +
          '<option value="yes">พอใจ — ปิดงาน</option>' +
          '<option value="rework">ต้องแก้ไขเพิ่มเติม</option>' +
        '</select></div>' +
      '<div class="mb-3" id="fRateBox"><label class="form-label">ให้คะแนน</label>' +
        '<select class="form-select" id="fRate">' +
          [5, 4, 3, 2, 1].map(function (n) {
            return '<option value="' + n + '">' + '★'.repeat(n) + ' (' + n + ')</option>';
          }).join('') + '</select></div>' +
      '<div><label class="form-label">ความคิดเห็นเพิ่มเติม</label>' +
        '<textarea class="form-control" id="fCmt" rows="2"></textarea></div>',
    onShow: function () {
      SP.$('#fSat').onchange = function () {
        SP.$('#fRateBox').classList.toggle('hide', this.value !== 'yes');
      };
    },
    onOk: function () {
      return SP.api('work.confirm', {
        ticket_id: t.id,
        satisfied: SP.$('#fSat').value,
        rating: Number(SP.$('#fRate').value || 0),
        comment: SP.$('#fCmt').value.trim()
      }).then(function (d) {
        return done(d.ticket.status === 'closed' ? 'ปิดงานเรียบร้อย ขอบคุณครับ' : 'ส่งเรื่องให้ช่างแก้ไขเพิ่มเติมแล้ว');
      }).catch(fail);
    }
  });
};
