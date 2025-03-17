import WebSocket from 'ws';
// https://ya-gage-we-fee.trycloudflare.com/
const url = 'ws://wherever-lb-any-toward.trycloudflare.com/ws?clientId=4a5e6393fd5e4425ae0ce27c08d8c5ad';

// สร้าง WebSocket client
const ws = new WebSocket(url);

// เมื่อเชื่อมต่อ WebSocket สำเร็จ
ws.on('open', () => {
  console.log('WebSocket connection established');
  // ส่งข้อความหลังจากเชื่อมต่อ
  // ws.send('Your message here');
});

// เมื่อได้รับข้อความจาก server
ws.on('message', (data) => {
  console.log('Received message:', data.toString());
});

// ถ้าเกิดข้อผิดพลาด
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// เมื่อการเชื่อมต่อปิด
ws.on('close', () => {
  console.log('WebSocket connection closed');
});
