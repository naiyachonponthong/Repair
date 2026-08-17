/* =====================================================================
   pages/approval.js — คิวอนุมัติค่าอะไหล่/ค่าใช้จ่ายที่เกินวงเงิน
   ===================================================================== */
window.SP = window.SP || {};

SP.pages.approval = function (el) {
  el.innerHTML = SP.head('รออนุมัติ', 'รายการค่าใช้จ่ายที่เกินวงเงินและรอการพิจารณา') +
    '<div id="apBox">' + SP.empty('กำลังโหลด...', 'hourglass') + '</div>';

  SP.loadMaster()
    .then(function () { return SP.api('approval.queue'); })
    .then(function (d) {
      var box = SP.$('#apBox');
      if (!d.rows.length) {
        box.innerHTML = '<div class="card-x"><div class="bd">' + SP.empty('ไม่มีรายการรออนุมัติ', 'check2-all') + '</div></div>';
        return;
      }
      box.innerHTML =
        '<div class="mb-3" style="font-size:13px;color:#5A6B63">วงเงินที่อนุมัติได้เอง ' +
          SP.fmt.num(d.limit) + ' บาท</div>' +
        d.rows.map(card).join('');

      SP.$$('#apBox [data-go]').forEach(function (b) {
        b.onclick = function () { SP.go('/tickets/' + b.dataset.go); };
      });
      SP.$$('#apBox [data-decide]').forEach(function (b) {
        b.onclick = function () { decide(b.dataset.decide, b.dataset.id, b.dataset.code, b.dataset.total); };
      });
    })
    .catch(function (e) {
      SP.$('#apBox').innerHTML = '<div class="card-x"><div class="bd">' + SP.empty(e.message, 'exclamation-triangle') + '</div></div>';
    });

  function card(t) {
    var p = t.parts;
    return '<div class="card-x mb-3">' +
      '<div class="hd d-flex justify-content-between align-items-center">' +
        '<span>' + SP.esc(t.code) + ' · ' + SP.esc(t.category) + '</span>' + SP.urgencyLabel(t.urgency) + '</div>' +
      '<div class="bd">' +
        '<div class="mb-2">' + SP.esc(t.detail) + '</div>' +
        '<div style="font-size:13px;color:#5A6B63" class="mb-3">' +
          SP.esc([t.building, t.location, t.spot].filter(Boolean).join(' / ')) +
          ' · ช่าง ' + SP.esc(t.assignee ? t.assignee.name : '-') +
          ' · เสนอเมื่อ ' + SP.fmt.datetime(p.submitted_at) + '</div>' +
        '<div class="table-responsive mb-2"><table class="table-x">' +
          '<thead><tr><th>รายการ</th><th style="text-align:right">จำนวน</th>' +
          '<th style="text-align:right">ราคา/หน่วย</th><th style="text-align:right">รวม</th></tr></thead><tbody>' +
          p.items.map(function (i) {
            return '<tr><td>' + SP.esc(i.name) + '</td>' +
              '<td style="text-align:right">' + SP.fmt.num(i.qty) + '</td>' +
              '<td style="text-align:right">' + SP.fmt.num(i.price) + '</td>' +
              '<td style="text-align:right">' + SP.fmt.num(i.total) + '</td></tr>';
          }).join('') +
          (p.labor_cost ? '<tr><td colspan="3">ค่าแรง</td><td style="text-align:right">' + SP.fmt.num(p.labor_cost) + '</td></tr>' : '') +
          '<tr><td colspan="3"><b>รวมทั้งสิ้น</b></td><td style="text-align:right"><b>' + SP.fmt.num(p.total) + '</b></td></tr>' +
        '</tbody></table></div>' +
        (p.note ? '<div class="mb-2" style="font-size:13px">หมายเหตุ: ' + SP.esc(p.note) + '</div>' : '') +
        '<div class="d-flex gap-2 flex-wrap">' +
          '<button class="btn btn-primary" data-decide="approve" data-id="' + SP.esc(t.id) + '" data-code="' + SP.esc(t.code) + '" data-total="' + p.total + '">' +
            '<i class="bi bi-check2"></i> อนุมัติ</button>' +
          '<button class="btn btn-outline-secondary" data-decide="reject" data-id="' + SP.esc(t.id) + '" data-code="' + SP.esc(t.code) + '" data-total="' + p.total + '">ไม่อนุมัติ</button>' +
          '<button class="btn btn-outline-secondary ms-auto" data-go="' + SP.esc(t.id) + '">ดูใบแจ้งซ่อม</button>' +
        '</div>' +
      '</div></div>';
  }

  function decide(kind, id, code, total) {
    var ok = kind === 'approve';
    SP.ui.open({
      title: (ok ? 'อนุมัติ' : 'ไม่อนุมัติ') + ' ' + code,
      okText: ok ? 'อนุมัติ' : 'ไม่อนุมัติ',
      body: '<div class="mb-3">ค่าใช้จ่ายรวม <b>' + SP.fmt.num(total) + '</b> บาท</div>' +
            '<label class="form-label">หมายเหตุ' + (ok ? '' : ' (เหตุผล)') + '</label>' +
            '<input class="form-control" id="apNote">',
      onOk: function () {
        var note = SP.$('#apNote').value.trim();
        if (!ok && !note) { SP.err('กรุณาระบุเหตุผล'); return false; }
        return SP.api('approval.decide', { ticket_id: id, decision: kind, note: note })
          .then(function () { SP.toast(ok ? 'อนุมัติแล้ว' : 'บันทึกการไม่อนุมัติแล้ว'); SP.render(); return true; })
          .catch(function (e) { SP.err(e.message); return false; });
      }
    });
  }
};
