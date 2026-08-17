/* =====================================================================
   pages/reports.js — รายงาน SLA / หมวดงาน / หน่วยงาน / ช่าง + export CSV
   ===================================================================== */
window.SP = window.SP || {};

SP.pages.reports = function (el) {
  var today = new Date().toISOString().slice(0, 10);
  var first = today.slice(0, 8) + '01';
  var from = SP._rpFrom || first, to = SP._rpTo || today;

  el.innerHTML = SP.head('รายงาน', 'สรุปผลการซ่อมและ SLA ตามช่วงเวลา',
    '<button class="btn btn-outline-secondary" id="btnCsv"><i class="bi bi-filetype-csv"></i> ส่งออก CSV</button>') +
    '<div class="card-x mb-3"><div class="bd"><div class="row g-2 align-items-end">' +
      '<div class="col-6 col-md-3"><label class="form-label">ตั้งแต่</label>' +
        '<input type="date" class="form-control" id="rFrom" value="' + from + '"></div>' +
      '<div class="col-6 col-md-3"><label class="form-label">ถึง</label>' +
        '<input type="date" class="form-control" id="rTo" value="' + to + '"></div>' +
      '<div class="col-12 col-md-3"><button class="btn btn-primary w-100" id="rGo">ดูรายงาน</button></div>' +
      '<div class="col-12 col-md-3"><button class="btn btn-outline-secondary w-100" id="rAll">ทั้งหมด</button></div>' +
    '</div></div></div>' +
    '<div id="rpBody">' + SP.empty('กำลังโหลด...', 'hourglass') + '</div>';

  SP.$('#rGo').onclick = function () {
    SP._rpFrom = SP.$('#rFrom').value; SP._rpTo = SP.$('#rTo').value; SP.render();
  };
  SP.$('#rAll').onclick = function () { SP._rpFrom = ''; SP._rpTo = ''; SP.render(); };
  SP.$('#btnCsv').onclick = function () {
    SP.api('report.export', { from: from, to: to })
      .then(function (d) {
        SP.toast('ส่งออก ' + d.rows + ' รายการแล้ว');
        window.open(d.url, '_blank');
      })
      .catch(function (e) { SP.err(e.message); });
  };

  SP.loadMaster()
    .then(function () { return SP.api('report.summary', { from: from, to: to }); })
    .then(draw)
    .catch(function (e) {
      SP.$('#rpBody').innerHTML = '<div class="card-x"><div class="bd">' + SP.empty(e.message, 'exclamation-triangle') + '</div></div>';
    });

  function draw(d) {
    var k = d.kpi;
    SP.$('#rpBody').innerHTML =
      '<div class="row g-3 mb-3">' +
        stat('งานทั้งหมด', SP.fmt.num(k.total)) +
        stat('ค้าง / กำลังทำ', SP.fmt.num(k.open)) +
        stat('เกิน SLA', SP.fmt.num(k.overdue)) +
        stat('ทำได้ตาม SLA', k.sla_percent.toFixed(0), '%') +
      '</div>' +
      '<div class="row g-3 mb-3">' +
        stat('เวลารับงานเฉลี่ย', k.avg_response.toFixed(1), 'ชม.') +
        stat('เวลาซ่อมเฉลี่ย', k.avg_repair.toFixed(1), 'ชม.') +
        stat('ค่าใช้จ่ายรวม', SP.fmt.num(Math.round(k.cost)), 'บาท') +
        stat('คะแนนเฉลี่ย', k.rating ? k.rating.toFixed(2) : '-', k.rating ? '/ 5' : '') +
      '</div>' +

      '<div class="row g-3">' +
        '<div class="col-lg-6">' + bars('งานแยกตามประเภท', d.by_category) + '</div>' +
        '<div class="col-lg-6">' + bars('งานแยกตามหน่วยงาน', d.by_dept) + '</div>' +
        '<div class="col-lg-6">' + bars('แนวโน้มรายเดือน', d.by_month) + '</div>' +
        '<div class="col-lg-6">' + bars('จุด/เครื่องที่เสียบ่อย', d.by_asset) + '</div>' +
        '<div class="col-12">' + techTable(d.by_tech) + '</div>' +
      '</div>' +
      '<div class="mt-3" style="font-size:13px;color:#5A6B63">' +
        'เกณฑ์ SLA: เร่งด่วนมาก ' + d.sla.urgent + ' ชม. · สูง ' + d.sla.high +
        ' ชม. · ปกติ ' + d.sla.normal + ' ชม. · ต่ำ ' + d.sla.low + ' ชม.</div>';
  }

  function stat(lbl, val, unit) {
    return '<div class="col-6 col-lg-3"><div class="stat"><div class="lbl">' + SP.esc(lbl) + '</div>' +
      '<div class="val">' + val + (unit ? '<span class="unit">' + SP.esc(unit) + '</span>' : '') + '</div></div></div>';
  }

  function bars(title, list) {
    if (!list || !list.length) {
      return '<div class="card-x h-100"><div class="hd">' + SP.esc(title) + '</div><div class="bd">' +
             SP.empty('ไม่มีข้อมูลในช่วงนี้', 'bar-chart') + '</div></div>';
    }
    var max = Math.max.apply(null, list.map(function (x) { return x.n; })) || 1;
    return '<div class="card-x h-100"><div class="hd">' + SP.esc(title) + '</div><div class="bd">' +
      list.map(function (x) {
        var pct = Math.round(x.n * 100 / max);
        return '<div class="mb-2">' +
          '<div class="d-flex justify-content-between" style="font-size:13px">' +
            '<span>' + SP.esc(x.name) + '</span><b>' + SP.fmt.num(x.n) + '</b></div>' +
          '<div style="height:8px;background:#EDF1EF;border-radius:99px;overflow:hidden">' +
            '<div style="height:100%;width:' + pct + '%;background:var(--c-primary);border-radius:99px"></div>' +
          '</div></div>';
      }).join('') + '</div></div>';
  }

  function techTable(list) {
    if (!list || !list.length) {
      return '<div class="card-x"><div class="hd">ผลงานของช่าง</div><div class="bd">' +
             SP.empty('ยังไม่มีงานที่มอบหมาย', 'person-gear') + '</div></div>';
    }
    return '<div class="card-x"><div class="hd">ผลงานของช่าง</div><div class="bd p-0">' +
      '<div class="table-responsive"><table class="table-x"><thead><tr>' +
      '<th>ช่าง</th><th style="text-align:right">งานที่รับ</th><th style="text-align:right">ปิดงาน</th>' +
      '<th style="text-align:right">เวลาซ่อมเฉลี่ย</th><th style="text-align:right">คะแนน</th></tr></thead><tbody>' +
      list.map(function (x) {
        return '<tr><td>' + SP.esc(x.name) + '</td>' +
          '<td style="text-align:right">' + SP.fmt.num(x.jobs) + '</td>' +
          '<td style="text-align:right">' + SP.fmt.num(x.done) + '</td>' +
          '<td style="text-align:right">' + x.avg_hours.toFixed(1) + ' ชม.</td>' +
          '<td style="text-align:right">' + (x.rating ? x.rating.toFixed(2) : '-') + '</td></tr>';
      }).join('') + '</tbody></table></div></div></div>';
  }
};
