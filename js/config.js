/* =====================================================================
   config.js — แก้ไฟล์นี้ไฟล์เดียวหลัง deploy GAS
   ค่า APP_KEY อ่านได้จาก view-source ตั้งใจให้เป็นแค่ตัวกันบอทสุ่มยิง
   ความปลอดภัยจริงอยู่ที่ token + การตรวจสิทธิ์ฝั่ง server
   ===================================================================== */
window.SP = window.SP || {};

SP.cfg = {
  API_URL : 'https://script.google.com/macros/s/AKfycbzKk0wq2YnELY6rYKvZ_KUgubIyXB9dZIPwJ2ifqM5APjTBql6NOuoYUEmzlFOle886cg/exec',
  APP_KEY : 'PASTE_APP_KEY_FROM_setupApiLayer',
  VERSION : '0.1.0',
  APP_NAME: 'ระบบแจ้งซ่อม',
  TOKEN_KEY: 'rr_token',
  USER_KEY : 'rr_user'
};
