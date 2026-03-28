const WebSocket = require('ws');
const https = require('https');

const apiKey = '0a92d2c9941d4871a6a7279cf7d25589';

// 1. Get Token
https.get(`https://streaming.assemblyai.com/v3/token?expires_in_seconds=600`, {
  headers: { 'Authorization': apiKey }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const data = JSON.parse(body);
    console.log('Token response:', data);
    if (!data.token) return;

    // 2. Connect WS
    const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&speech_model=default&token=${data.token}`;
    console.log('Connecting to:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      console.log('WS OPENED!');
      // Send some dummy audio in JSON wrapper
      // ws.send(JSON.stringify({ audio_data: dummyAudio.toString('base64') }));
    });
    
    ws.on('message', (msg) => {
      console.log('Message:', msg.toString());
    });
    
    ws.on('close', (code, reason) => {
      console.log('WS CLOSED:', code, reason.toString());
    });
    
    ws.on('error', (err) => {
      console.log('WS ERROR:', err);
    });
  });
});
