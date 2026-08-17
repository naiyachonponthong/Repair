/* =====================================================================
   api.js — ตัวเรียก GAS Web App
   กฎเหล็ก 3 ข้อ (ผิดข้อใดข้อหนึ่ง = CORS error ทันที)
     1) Content-Type ต้องเป็น text/plain เท่านั้น  (application/json = preflight)
     2) ห้ามใส่ custom header ใด ๆ เช่น Authorization  (token ส่งใน body)
     3) ต้อง redirect:'follow'  เพราะ GAS เด้งไป googleusercontent.com เสมอ
   ===================================================================== */
window.SP = window.SP || {};

SP.token = {
  get: function () { return localStorage.getItem(SP.cfg.TOKEN_KEY) || ''; },
  set: function (t) { localStorage.setItem(SP.cfg.TOKEN_KEY, t || ''); },
  clear: function () {
    localStorage.removeItem(SP.cfg.TOKEN_KEY);
    localStorage.removeItem(SP.cfg.USER_KEY);
  }
};

SP.user = null;

/**
 * SP.api('ticket.create', {...})  ->  Promise<data>
 * opt.silent = true เพื่อไม่ขึ้น busy overlay
 */
SP.api = function (action, payload, opt) {
  opt = opt || {};
  if (!SP.cfg.API_URL || SP.cfg.API_URL.indexOf('XXXX') > -1) {
    return Promise.reject(new Error('ยังไม่ได้ตั้งค่า API_URL ใน js/config.js'));
  }
  if (!opt.silent) SP.busy(true);

  return fetch(SP.cfg.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    redirect: 'follow',
    body: JSON.stringify({
      action: action,
      payload: payload || {},
      key: SP.cfg.APP_KEY,
      token: SP.token.get()
    })
  })
  .then(function (res) {
    if (!res.ok) throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ (' + res.status + ')');
    return res.text();
  })
  .then(function (txt) {
    var json;
    try { json = JSON.parse(txt); }
    catch (e) {
      // มักเกิดตอน deployment ยังไม่ได้อัปเวอร์ชัน หรือสิทธิ์ยังไม่ใช่ Anyone
      throw new Error('เซิร์ฟเวอร์ตอบกลับผิดรูปแบบ — ตรวจสอบว่า deploy เป็น "Anyone" และอัปเวอร์ชันแล้ว');
    }
    if (!json.ok) {
      var e = String(json.error || '');
      if (e.indexOf('SESSION_') === 0) {
        SP.token.clear();
        SP.toast('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'warn');
        SP.auth.showLogin();
        throw new Error('SESSION');
      }
      if (e === 'BAD_KEY') throw new Error('APP_KEY ไม่ตรงกับเซิร์ฟเวอร์ — ตรวจสอบ js/config.js');
      throw new Error(json.message || e || 'เกิดข้อผิดพลาด');
    }
    return json.data;
  })
  .catch(function (err) {
    if (err && /Failed to fetch|NetworkError/i.test(err.message || '')) {
      throw new Error('เรียก API ไม่สำเร็จ — ตรวจสอบ URL /exec และสิทธิ์การเข้าถึงแบบ Anyone');
    }
    throw err;
  })
  .finally(function () { if (!opt.silent) SP.busy(false); });
};
