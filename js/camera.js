/* =====================================================================
   camera.js — กล้องสด + เลือกไฟล์ + ย่อรูป (ใช้ซ้ำได้ทุกหน้า)
     SP.cam.picker(containerEl, { max, stage })  -> { photos(), clear() }
     SP.cam.shoot(function(dataUrl){ ... })      -> เปิดกล้องใน modal
     SP.cam.fromFile(file)                       -> Promise<dataUrl>
   หมายเหตุ iOS: ต้องเรียกจากการกดปุ่มเท่านั้น และ video ต้องมี playsinline muted
   ===================================================================== */
window.SP = window.SP || {};
SP.cam = {};

SP.cam.MAX_W = 1280;
SP.cam.QUALITY = 0.7;

SP.cam.supported = function () {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

/** ย่อภาพจาก <img>/<video> -> dataURL */
SP.cam._shrink = function (src, w, h) {
  var sc = Math.min(1, SP.cam.MAX_W / w);
  var c = document.createElement('canvas');
  c.width = Math.round(w * sc); c.height = Math.round(h * sc);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', SP.cam.QUALITY);
};

SP.cam.fromFile = function (file) {
  return new Promise(function (resolve, reject) {
    if (!/^image\//.test(file.type)) return reject(new Error('รองรับเฉพาะไฟล์รูปภาพ'));
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () { resolve(SP.cam._shrink(img, img.naturalWidth, img.naturalHeight)); };
      img.onerror = function () { reject(new Error('อ่านไฟล์รูปไม่สำเร็จ')); };
      img.src = fr.result;
    };
    fr.onerror = function () { reject(new Error('อ่านไฟล์ไม่สำเร็จ')); };
    fr.readAsDataURL(file);
  });
};

/** เปิดกล้องสดใน modal แล้วส่ง dataURL กลับทาง callback */
SP.cam.shoot = function (onCapture) {
  if (!SP.cam.supported()) return SP.err('เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง');

  SP.ui.open({
    title: 'ถ่ายภาพ',
    size: 'lg',
    hideFoot: true,
    body:
      '<video id="shV" playsinline muted style="width:100%;border-radius:10px;background:#111;aspect-ratio:4/3;object-fit:cover"></video>' +
      '<div id="shMsg" class="mt-2 text-center" style="font-size:13px;color:#5A6B63">กำลังเปิดกล้อง...</div>' +
      '<div class="d-flex gap-2 mt-3">' +
        '<button class="btn btn-outline-secondary" id="shSwap"><i class="bi bi-arrow-repeat"></i></button>' +
        '<button class="btn btn-primary flex-fill" id="shGo" disabled><i class="bi bi-camera"></i> ถ่ายภาพ</button>' +
      '</div>',
    onShow: start
  });

  var stream = null, facing = 'environment', v;

  function stop() {
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
  }

  function start() {
    v = SP.$('#shV');
    SP.$('#shSwap').onclick = function () {
      facing = (facing === 'environment') ? 'user' : 'environment';
      stop(); start();
    };
    SP.$('#shGo').onclick = function () {
      var url = SP.cam._shrink(v, v.videoWidth, v.videoHeight);
      stop(); SP.ui.close();
      onCapture(url);
    };

    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false })
      .then(function (s) { stream = s; v.srcObject = s; return v.play(); })
      .then(function () {
        SP.$('#shGo').disabled = false;
        SP.$('#shMsg').textContent = v.videoWidth + '×' + v.videoHeight;
      })
      .catch(function (e) {
        SP.$('#shMsg').innerHTML = '<span class="pill pill-danger">' + SP.esc(e.name) + '</span> ' +
          'อนุญาตสิทธิ์กล้องในเบราว์เซอร์แล้วลองใหม่';
      });

    SP.$('#rrModal').addEventListener('hidden.bs.modal', stop, { once: true });
  }
};

/**
 * แผงแนบรูป — ใช้ในฟอร์มแจ้งซ่อม/ปิดงาน
 * คืน { photos: fn -> [dataUrl], clear: fn }
 */
SP.cam.picker = function (el, opt) {
  opt = opt || {};
  var max = opt.max || 5;
  var list = [];

  el.innerHTML =
    '<div class="d-flex gap-2 mb-2">' +
      '<button type="button" class="btn btn-outline-secondary btn-sm" data-act="shoot"><i class="bi bi-camera"></i> ถ่ายภาพ</button>' +
      '<button type="button" class="btn btn-outline-secondary btn-sm" data-act="file"><i class="bi bi-image"></i> เลือกไฟล์</button>' +
      '<input type="file" accept="image/*" capture="environment" multiple hidden data-el="file">' +
      '<span class="ms-auto align-self-center" style="font-size:12px;color:#5A6B63" data-el="cnt"></span>' +
    '</div>' +
    '<div class="d-flex flex-wrap gap-2" data-el="thumbs"></div>';

  var thumbs = el.querySelector('[data-el="thumbs"]');
  var cnt    = el.querySelector('[data-el="cnt"]');
  var input  = el.querySelector('[data-el="file"]');

  function draw() {
    cnt.textContent = list.length + '/' + max + ' รูป';
    if (!list.length) {
      thumbs.innerHTML = '<div style="font-size:13px;color:#5A6B63">ยังไม่ได้แนบรูป</div>';
      return;
    }
    thumbs.innerHTML = list.map(function (u, i) {
      return '<div style="position:relative">' +
        '<img src="' + u + '" style="width:84px;height:84px;object-fit:cover;border-radius:8px;border:1px solid #DFE5E2">' +
        '<button type="button" data-del="' + i + '" class="btn btn-sm" ' +
        'style="position:absolute;top:-6px;right:-6px;background:#B3261E;color:#fff;border-radius:50%;width:22px;height:22px;padding:0;line-height:1">&times;</button>' +
        '</div>';
    }).join('');
  }

  function add(url) {
    if (list.length >= max) return SP.toast('แนบได้สูงสุด ' + max + ' รูป', 'warn');
    list.push(url); draw();
  }

  el.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'shoot') {
      if (!SP.cam.supported()) return input.click();
      SP.cam.shoot(add);
    }
    if (b.dataset.act === 'file') input.click();
    if (b.dataset.del !== undefined) { list.splice(Number(b.dataset.del), 1); draw(); }
  });

  input.addEventListener('change', function () {
    var files = Array.prototype.slice.call(input.files || []);
    input.value = '';
    files.reduce(function (chain, f) {
      return chain.then(function () {
        return SP.cam.fromFile(f).then(add).catch(function (e) { SP.err(e.message); });
      });
    }, Promise.resolve());
  });

  draw();
  return {
    photos: function () { return list.slice(); },
    clear:  function () { list = []; draw(); }
  };
};

/** อัปโหลดรูปทั้งชุดขึ้น Drive ทีละใบ (เลี่ยง payload ก้อนใหญ่) */
SP.cam.upload = function (ticketId, photos, stage) {
  return photos.reduce(function (chain, url, i) {
    return chain.then(function () {
      return SP.api('file.upload', {
        ticket_id: ticketId,
        stage: stage || 'report',
        filename: 'RR-' + ticketId.slice(0, 6) + '-' + (stage || 'report') + '-' + (i + 1) + '.jpg',
        mime: 'image/jpeg',
        data: url.split(',')[1]
      }, { silent: true });
    });
  }, Promise.resolve());
};
