/* =====================================================================
   pages/settings.js — ตั้งค่าเมนูเดียว 10 แท็บ
   ทั่วไป / หน่วยงาน / สถานที่ / หมวดงาน / ผู้ใช้ / ขั้นอนุมัติ /
   Telegram / LINE / QR / เครื่องมือ
   ===================================================================== */
window.SP = window.SP || {};

SP.TABS = [
  ['general',  'ทั่วไป',      'gear'],
  ['depts',    'หน่วยงาน',    'building'],
  ['loc',      'สถานที่',     'geo-alt'],
  ['cat',      'หมวดงาน',     'tags'],
  ['users',    'ผู้ใช้',      'people'],
  ['approve',  'ขั้นอนุมัติ',  'check2-square'],
  ['telegram', 'Telegram',    'send'],
  ['line',     'LINE',        'chat-dots'],
  ['qr',       'QR',          'qr-code'],
  ['tools',    'เครื่องมือ',  'wrench']
];

SP.pages.settings = function (el) {
  var tab = SP._setTab || 'general';
  var S = null;

  el.innerHTML = SP.head('ตั้งค่า', 'การตั้งค่าทั้งหมดของระบบรวมอยู่ที่นี่ที่เดียว') +
    '<div class="card-x mb-3"><div class="bd d-flex gap-2 flex-wrap" id="setTabs">' +
      SP.TABS.map(function (t) {
        return '<button class="btn btn-sm ' + (tab === t[0] ? 'btn-primary' : 'btn-outline-secondary') +
               '" data-tab="' + t[0] + '"><i class="bi bi-' + t[2] + '"></i> ' + t[1] + '</button>';
      }).join('') +
    '</div></div>' +
    '<div id="setBody">' + SP.empty('กำลังโหลด...', 'hourglass') + '</div>';

  SP.$$('#setTabs [data-tab]').forEach(function (b) {
    b.onclick = function () { SP._setTab = b.dataset.tab; SP.render(); };
  });

  SP.api('settings.get').then(function (d) { S = d; paint(); })
    .catch(function (e) {
      SP.$('#setBody').innerHTML = '<div class="card-x"><div class="bd">' + SP.empty(e.message, 'shield-lock') + '</div></div>';
    });

  /* ---------- ตัวช่วย ---------- */
  function box(title, inner, foot) {
    return '<div class="card-x"><div class="hd">' + SP.esc(title) + '</div><div class="bd">' + inner +
           (foot === false ? '' : '<div class="mt-3"><button class="btn btn-primary" id="setSave">บันทึกการตั้งค่า</button></div>') +
           '</div></div>';
  }
  function fld(label, id, val, type, hint) {
    return '<div class="col-md-6"><label class="form-label">' + SP.esc(label) + '</label>' +
      '<input class="form-control" id="' + id + '" type="' + (type || 'text') + '" value="' + SP.esc(val === undefined ? '' : val) + '">' +
      (hint ? '<div style="font-size:12px;color:#5A6B63;margin-top:3px">' + SP.esc(hint) + '</div>' : '') + '</div>';
  }
  function save(patch, msg) {
    return SP.api('settings.save', { config: patch })
      .then(function (d) { S = d; SP.toast(msg || 'บันทึกแล้ว'); SP.render(); })
      .catch(function (e) { SP.err(e.message); });
  }
  function v(id) { return SP.$('#' + id).value.trim(); }

  function masterTable(kind, rows, cols, addLabel) {
    return '<div class="d-flex mb-2"><button class="btn btn-sm btn-primary ms-auto" data-madd="' + kind + '">' +
        '<i class="bi bi-plus-lg"></i> ' + addLabel + '</button></div>' +
      (rows.length
        ? '<div class="table-responsive"><table class="table-x"><thead><tr>' +
          cols.map(function (c) { return '<th>' + c[1] + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr>' + cols.map(function (c) { return '<td>' + SP.esc(r[c[0]] || '-') + '</td>'; }).join('') +
              '<td style="text-align:right;white-space:nowrap">' +
                '<button class="btn btn-sm btn-outline-secondary" data-medit="' + kind + '" data-id="' + SP.esc(r.id) + '"><i class="bi bi-pencil"></i></button> ' +
                '<button class="btn btn-sm btn-outline-secondary" data-mdel="' + kind + '" data-id="' + SP.esc(r.id) + '"><i class="bi bi-trash"></i></button>' +
              '</td></tr>';
          }).join('') + '</tbody></table></div>'
        : SP.empty('ยังไม่มีข้อมูล', 'inbox'));
  }

  function bindMaster(kind, rows) {
    SP.$$('[data-madd="' + kind + '"]').forEach(function (b) { b.onclick = function () { mForm(kind, null); }; });
    SP.$$('[data-medit="' + kind + '"]').forEach(function (b) {
      b.onclick = function () { mForm(kind, rows.filter(function (x) { return x.id === b.dataset.id; })[0]); };
    });
    SP.$$('[data-mdel="' + kind + '"]').forEach(function (b) {
      b.onclick = function () {
        SP.ui.confirm('ลบรายการนี้', function () {
          return SP.api('master.delete', { kind: kind, id: b.dataset.id })
            .then(function () { SP.toast('ลบแล้ว'); SP.render(); return true; })
            .catch(function (e) { SP.err(e.message); return false; });
        });
      };
    });
  }

  function mForm(kind, rec) {
    rec = rec || {};
    var body = (kind === 'locations')
      ? '<div class="mb-3"><label class="form-label">อาคาร *</label><input class="form-control" id="mB" value="' + SP.esc(rec.building || '') + '"></div>' +
        '<div><label class="form-label">ชั้น / บริเวณ</label><input class="form-control" id="mL" value="' + SP.esc(rec.location || '') + '"></div>'
      : '<div><label class="form-label">ชื่อ *</label><input class="form-control" id="mN" value="' + SP.esc(rec.name || '') + '"></div>';

    SP.ui.open({
      title: rec.id ? 'แก้ไข' : 'เพิ่มรายการ',
      body: body,
      okText: 'บันทึก',
      onOk: function () {
        var p = { kind: kind, id: rec.id };
        if (kind === 'locations') { p.building = v('mB'); p.location = v('mL'); }
        else p.name = v('mN');
        return SP.api('master.save', p)
          .then(function () { SP.toast('บันทึกแล้ว'); SP.master = null; SP.render(); return true; })
          .catch(function (e) { SP.err(e.message); return false; });
      }
    });
  }

  /* ---------- แต่ละแท็บ ---------- */
  function paint() {
    var c = S.config, m = S.master, body = SP.$('#setBody');

    if (tab === 'general') {
      body.innerHTML = box('ข้อมูลทั่วไป',
        '<div class="row g-3">' +
          fld('ชื่อระบบ', 'gApp', c.app_name) +
          fld('ชื่อหน่วยงาน', 'gOrg', c.org_name) +
          fld('โฟลเดอร์ Drive (folder_id)', 'gFolder', c.folder_id, 'text', 'เว้นว่าง = ระบบสร้างโฟลเดอร์ให้เอง') +
          fld('อายุเซสชัน (ชั่วโมง)', 'gSess', c.session_hours, 'number') +
          fld('เวลาทำการ', 'gHours', c.work_hours || '08:00-17:00') +
          '<div class="col-md-6"><label class="form-label">โลโก้</label>' +
            '<input type="file" accept="image/*" class="form-control" id="gLogo"></div>' +
          '<div class="col-12 form-check ms-2">' +
            '<input class="form-check-input" type="checkbox" id="gMaint"' + (c.maintenance_mode ? ' checked' : '') + '>' +
            '<label class="form-check-label" for="gMaint">โหมดปิดปรับปรุงระบบ</label></div>' +
        '</div>');
      SP.$('#gLogo').onchange = function () {
        var f = this.files[0]; if (!f) return;
        SP.cam.fromFile(f).then(function (url) {
          return SP.api('settings.logo', { filename: f.name, mime: 'image/jpeg', data: url.split(',')[1] });
        }).then(function () { SP.toast('อัปโหลดโลโก้แล้ว'); SP.auth.loadInfo(); SP.render(); })
          .catch(function (e) { SP.err(e.message); });
      };
      SP.$('#setSave').onclick = function () {
        save({
          app_name: v('gApp'), org_name: v('gOrg'), folder_id: v('gFolder'),
          session_hours: Number(v('gSess') || 8), work_hours: v('gHours'),
          maintenance_mode: SP.$('#gMaint').checked
        }).then(function () { SP.auth.loadInfo(); });
      };
    }

    else if (tab === 'depts') {
      body.innerHTML = '<div class="card-x"><div class="hd">หน่วยงาน / แผนก</div><div class="bd">' +
        masterTable('depts', m.depts, [['name', 'ชื่อหน่วยงาน']], 'เพิ่มหน่วยงาน') + '</div></div>';
      bindMaster('depts', m.depts);
    }

    else if (tab === 'loc') {
      body.innerHTML = '<div class="card-x"><div class="hd">อาคารและสถานที่</div><div class="bd">' +
        masterTable('locations', m.locations, [['building', 'อาคาร'], ['location', 'ชั้น / บริเวณ']], 'เพิ่มสถานที่') + '</div></div>';
      bindMaster('locations', m.locations);
    }

    else if (tab === 'cat') {
      body.innerHTML = '<div class="card-x"><div class="hd">หมวดงานซ่อม</div><div class="bd">' +
        masterTable('categories', m.categories, [['name', 'ชื่อหมวดงาน']], 'เพิ่มหมวดงาน') + '</div></div>';
      bindMaster('categories', m.categories);
    }

    else if (tab === 'users') {
      body.innerHTML = '<div class="card-x"><div class="hd">ผู้ใช้งาน</div><div class="bd" id="uBox">' +
        SP.empty('กำลังโหลด...', 'hourglass') + '</div></div>';
      SP.api('user.list', {}, { silent: true }).then(function (d) {
        SP.$('#uBox').innerHTML =
          '<div class="d-flex mb-2"><button class="btn btn-sm btn-primary ms-auto" id="uAdd">' +
            '<i class="bi bi-plus-lg"></i> เพิ่มผู้ใช้</button></div>' +
          '<div class="table-responsive"><table class="table-x"><thead><tr>' +
          '<th>ชื่อผู้ใช้</th><th>ชื่อ-สกุล</th><th>บทบาท</th><th>เข้าล่าสุด</th><th></th></tr></thead><tbody>' +
          d.rows.map(function (x) {
            var role = (d.roles.filter(function (r) { return r.key === x.role; })[0] || {}).label || x.role;
            return '<tr' + (x.active ? '' : ' style="opacity:.5"') + '>' +
              '<td><b>' + SP.esc(x.username) + '</b></td><td>' + SP.esc(x.name) + '</td>' +
              '<td>' + SP.esc(role) + (x.active ? '' : ' <span class="pill pill-line">ปิดใช้งาน</span>') + '</td>' +
              '<td>' + (x.last_login ? SP.fmt.datetime(x.last_login) : '-') + '</td>' +
              '<td style="text-align:right;white-space:nowrap">' +
                '<button class="btn btn-sm btn-outline-secondary" data-uedit="' + SP.esc(x.id) + '"><i class="bi bi-pencil"></i></button> ' +
                '<button class="btn btn-sm btn-outline-secondary" data-udel="' + SP.esc(x.id) + '"><i class="bi bi-person-x"></i></button>' +
              '</td></tr>';
          }).join('') + '</tbody></table></div>';

        SP.$('#uAdd').onclick = function () { uForm(null, d.roles); };
        SP.$$('#uBox [data-uedit]').forEach(function (b) {
          b.onclick = function () { uForm(d.rows.filter(function (x) { return x.id === b.dataset.uedit; })[0], d.roles); };
        });
        SP.$$('#uBox [data-udel]').forEach(function (b) {
          b.onclick = function () {
            SP.ui.confirm('ปิดใช้งานบัญชีนี้', function () {
              return SP.api('user.delete', { id: b.dataset.udel })
                .then(function () { SP.toast('ปิดใช้งานแล้ว'); SP.render(); return true; })
                .catch(function (e) { SP.err(e.message); return false; });
            });
          };
        });
      }).catch(function (e) { SP.$('#uBox').innerHTML = SP.empty(e.message, 'shield-lock'); });
    }

    else if (tab === 'approve') {
      var s = c.sla_hours || {};
      body.innerHTML = box('เงื่อนไขการอนุมัติและ SLA',
        '<div class="row g-3">' +
          fld('วงเงินที่ช่างเบิกได้เอง (บาท)', 'aLimit', c.parts_approve_limit, 'number', 'เกินกว่านี้จึงเข้าคิวขออนุมัติ') +
          '<div class="col-12"><hr class="my-2"></div>' +
          fld('SLA เร่งด่วนมาก (ชม.)', 'aU', s.urgent || 4, 'number') +
          fld('SLA สูง (ชม.)', 'aH', s.high || 8, 'number') +
          fld('SLA ปกติ (ชม.)', 'aN', s.normal || 24, 'number') +
          fld('SLA ต่ำ (ชม.)', 'aL', s.low || 72, 'number') +
        '</div>');
      SP.$('#setSave').onclick = function () {
        save({
          parts_approve_limit: Number(v('aLimit') || 0),
          sla_hours: { urgent: Number(v('aU')), high: Number(v('aH')), normal: Number(v('aN')), low: Number(v('aL')) }
        });
      };
    }

    else if (tab === 'telegram') {
      body.innerHTML = box('Telegram',
        '<div class="row g-3">' +
          fld('Bot Token', 'tTok', c.telegram_bot_token, 'text', 'เว้นค่าที่เป็นจุดไว้ = ไม่เปลี่ยนของเดิม') +
          fld('Chat ID กลุ่มช่าง', 'tChat', c.telegram_chat_id) +
          '<div class="col-12 form-check ms-2">' +
            '<input class="form-check-input" type="checkbox" id="tOn"' + (c.notification_enabled !== false ? ' checked' : '') + '>' +
            '<label class="form-check-label" for="tOn">เปิดการแจ้งเตือน</label></div>' +
          fld('Webhook secret (?s=)', 'tSec', c.telegram_secret, 'text', 'ตั้งใน setWebhook: <API_URL>?s=ค่านี้') +
          '<div class="col-12 d-flex gap-2 flex-wrap">' +
            '<button class="btn btn-outline-secondary" id="tTest">ส่งข้อความทดสอบ</button>' +
            '<button class="btn btn-outline-secondary" id="tLink">ขอรหัสผูกบัญชีของฉัน</button>' +
          '</div>' +
          '<div class="col-12" id="tLinkOut"></div>' +
        '</div>');
      SP.$('#tLink').onclick = function () {
        SP.api('notify.linkcode').then(function (d) {
          SP.$('#tLinkOut').innerHTML =
            '<div class="stat"><div class="lbl">พิมพ์ในแชทบอท: <code>/link ' + d.code + '</code></div>' +
            '<div class="val">' + d.code + '<span class="unit">หมดอายุใน ' + d.expires_min + ' นาที</span></div></div>';
        }).catch(function (e) { SP.err(e.message); });
      };
      SP.$('#tTest').onclick = function () {
        SP.api('notify.test', { channel: 'telegram' })
          .then(function (r) { SP.toast('Telegram: ' + (r.telegram || '-')); })
          .catch(function (e) { SP.err(e.message); });
      };
      SP.$('#setSave').onclick = function () {
        save({
          telegram_bot_token: v('tTok'), telegram_chat_id: v('tChat'),
          telegram_secret: v('tSec'), notification_enabled: SP.$('#tOn').checked
        });
      };
    }

    else if (tab === 'line') {
      body.innerHTML = box('LINE Messaging API',
        '<div class="row g-3">' +
          fld('Channel Access Token', 'lTok', c.line_channel_token) +
          fld('Channel Secret', 'lSec', c.line_channel_secret) +
          fld('LIFF ID', 'lLiff', c.liff_id, 'text', 'ใช้กับหน้า liff.html') +
          '<div class="col-md-6"><label class="form-label">ช่องทางแจ้งเตือนหลัก</label>' +
            '<select class="form-select" id="lCh">' +
              ['telegram', 'line', 'both'].map(function (x) {
                return '<option value="' + x + '"' + (c.notify_channel === x ? ' selected' : '') + '>' + x + '</option>';
              }).join('') + '</select></div>' +
          '<div class="col-12"><button class="btn btn-outline-secondary" id="lTest">ส่งข้อความทดสอบ</button></div>' +
        '</div>');
      SP.$('#lTest').onclick = function () {
        SP.api('notify.test', { channel: 'line' })
          .then(function (r) { SP.toast('LINE: ' + (r.line || '-')); })
          .catch(function (e) { SP.err(e.message); });
      };
      SP.$('#setSave').onclick = function () {
        save({
          line_channel_token: v('lTok'), line_channel_secret: v('lSec'),
          liff_id: v('lLiff'), notify_channel: SP.$('#lCh').value
        });
      };
    }

    else if (tab === 'qr') {
      body.innerHTML = '<div class="card-x"><div class="hd">ป้าย QR ประจำจุด</div><div class="bd">' +
        '<div class="mb-3" style="font-size:14px">ลิงก์ที่ฝังในป้าย QR:<br>' +
          '<code>' + SP.esc(SP.qrUrl('P-0001')) + '</code></div>' +
        '<div class="mb-3" style="font-size:13px;color:#5A6B63">' +
          'ถ้าย้าย repo หรือเปลี่ยนโดเมน ต้องพิมพ์ป้ายใหม่ทั้งชุด เพราะลิงก์เปลี่ยน</div>' +
        '<button class="btn btn-primary" onclick="SP.go(\'/qr\')">ไปหน้าจัดการจุด QR</button> ' +
        '<button class="btn btn-outline-secondary" onclick="SP.go(\'/scan\')">ทดสอบสแกน</button>' +
      '</div></div>';
    }

    else if (tab === 'tools') {
      body.innerHTML = '<div class="card-x"><div class="hd">เครื่องมือระบบ</div><div class="bd">' +
        '<div class="row g-2">' +
          tool('seed_master', 'สร้างข้อมูลพื้นฐาน', 'เพิ่มสถานที่/หมวดงาน/หน่วยงานตัวอย่าง ถ้ายังว่าง') +
          tool('setup_triggers', 'ตั้ง trigger อัตโนมัติ', 'ส่งคิวแจ้งเตือน 5 นาที / เตือนงานค้างรายชั่วโมง / ล้าง session รายวัน') +
          tool('flush_outbox', 'ส่งคิวแจ้งเตือนทันที', 'ไม่ต้องรอรอบ 5 นาที ใช้ตอนทดสอบ') +
          tool('clean_sessions', 'ล้าง session หมดอายุ', 'ลดขนาดชีต Sessions') +
          tool('backup', 'สำรองข้อมูล', 'คัดลอกสเปรดชีตทั้งไฟล์') +
          tool('purge_old', 'ล้างงานเก่าที่ปิดแล้ว', 'ลบงานที่ปิดเกิน 365 วัน') +
          tool('rotate_key', 'สร้าง APP_KEY ใหม่', 'ต้องแก้ js/config.js ทุกเครื่องหลังทำ') +
        '</div>' +
        '<div class="mt-3" style="font-size:13px;color:#5A6B63">APP_KEY ปัจจุบัน: ' + SP.esc(c.app_key_hint || '-') + '</div>' +
      '</div></div>';
      SP.$$('#setBody [data-tool]').forEach(function (b) {
        b.onclick = function () {
          SP.ui.confirm('ยืนยันทำรายการ "' + b.dataset.label + '"', function () {
            return SP.api('sys.tool', { tool: b.dataset.tool })
              .then(function (r) {
                SP.toast(r.message || 'ทำรายการแล้ว');
                if (r.data && r.data.url) window.open(r.data.url, '_blank');
                SP.master = null;
                return true;
              })
              .catch(function (e) { SP.err(e.message); return false; });
          });
        };
      });
    }

    function tool(key, label, hint) {
      return '<div class="col-md-6"><div style="border:1px solid var(--c-line);border-radius:10px;padding:12px">' +
        '<div style="font-weight:600">' + SP.esc(label) + '</div>' +
        '<div style="font-size:12px;color:#5A6B63;margin-bottom:8px">' + SP.esc(hint) + '</div>' +
        '<button class="btn btn-sm btn-outline-secondary" data-tool="' + key + '" data-label="' + SP.esc(label) + '">ทำรายการ</button>' +
      '</div></div>';
    }

    function uForm(rec, roles) {
      rec = rec || {};
      SP.ui.open({
        title: rec.id ? 'แก้ไขผู้ใช้ ' + rec.username : 'เพิ่มผู้ใช้',
        okText: 'บันทึก',
        body:
          '<div class="row g-3">' +
            '<div class="col-md-6"><label class="form-label">ชื่อผู้ใช้ *</label>' +
              '<input class="form-control" id="uU" value="' + SP.esc(rec.username || '') + '" autocapitalize="off"></div>' +
            '<div class="col-md-6"><label class="form-label">ชื่อ-สกุล</label>' +
              '<input class="form-control" id="uN" value="' + SP.esc(rec.name || '') + '"></div>' +
            '<div class="col-md-6"><label class="form-label">บทบาท</label>' +
              '<select class="form-select" id="uR">' + roles.map(function (r) {
                return '<option value="' + r.key + '"' + (rec.role === r.key ? ' selected' : '') + '>' + SP.esc(r.label) + '</option>';
              }).join('') + '</select></div>' +
            '<div class="col-md-6"><label class="form-label">รหัสผ่าน' + (rec.id ? ' (เว้นว่าง = ไม่เปลี่ยน)' : ' *') + '</label>' +
              '<input class="form-control" id="uP" type="text"></div>' +
            '<div class="col-12 form-check ms-2">' +
              '<input class="form-check-input" type="checkbox" id="uA"' + (rec.active !== false ? ' checked' : '') + '>' +
              '<label class="form-check-label" for="uA">เปิดใช้งาน</label></div>' +
          '</div>',
        onOk: function () {
          return SP.api('user.save', {
            id: rec.id, username: v('uU'), name: v('uN'),
            role: SP.$('#uR').value, password: v('uP'), active: SP.$('#uA').checked
          }).then(function () { SP.toast('บันทึกผู้ใช้แล้ว'); SP.render(); return true; })
            .catch(function (e) { SP.err(e.message); return false; });
        }
      });
    }
  }
};
