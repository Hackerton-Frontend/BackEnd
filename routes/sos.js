const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { findNearestPatrolWithEta } = require('../services/sosService');

// 로그 파일 경로
const LOG_FILE = path.join(__dirname, '../data/sosLogs.json');

// POST 요청 - SOS 등록
router.post('/', async (req, res) => {
  const { lat, lng, name, rrn, phone, situation } = req.body;

  if (!lat || !lng || !name || !rrn || !phone || !situation) {
    return res.status(400).json({ error: '필수 정보 누락' });
  }

  try {
    const eta = await findNearestPatrolWithEta(req.body);
    const newLog = {
      timestamp: new Date().toISOString(),
      name,
      rrn,
      phone,
      situation,
      location: { lat, lng },
      eta,
      status: '처리중', // 🔹 추가된 필드
    };

    const logs = fs.existsSync(LOG_FILE)
      ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'))
      : [];

    logs.push(newLog);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));

    res.json(eta);
  } catch (err) {
    res.status(500).json({ error: '서버 내부 오류' });
  }
});

// GET 요청 - 모든 SOS 로그 조회
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return res.json([]);
    }

    const raw = fs.readFileSync(LOG_FILE);
    const logs = JSON.parse(raw);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: '서버 내부 오류' });
  }
});

// DELETE 요청 - 특정 로그 삭제
router.delete('/:timestamp', (req, res) => {
  const { timestamp } = req.params;

  try {
    if (!fs.existsSync(LOG_FILE)) {
      return res.status(404).json({ error: '로그 파일이 없습니다.' });
    }

    const raw = fs.readFileSync(LOG_FILE, 'utf-8');
    let logs = JSON.parse(raw);

    const originalLength = logs.length;
    logs = logs.filter(entry => entry.timestamp !== timestamp);

    if (logs.length === originalLength) {
      return res.status(404).json({ error: '해당 로그를 찾을 수 없습니다.' });
    }

    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
    res.json({ message: '삭제 완료' });
  } catch (err) {
    console.error('삭제 중 오류 발생:', err);
    res.status(500).json({ error: '서버 내부 오류' });
  }
});

// PATCH 요청 - 상태 변경 (처리중 → 처리완료)
router.patch('/:timestamp/status', (req, res) => {
  const { timestamp } = req.params;

  try {
    if (!fs.existsSync(LOG_FILE)) {
      return res.status(404).json({ error: '로그 파일이 없습니다.' });
    }

    const raw = fs.readFileSync(LOG_FILE, 'utf-8');
    const logs = JSON.parse(raw);

    const target = logs.find(entry => entry.timestamp === timestamp);
    if (!target) {
      return res.status(404).json({ error: '해당 로그를 찾을 수 없습니다.' });
    }

    target.status = '처리완료';
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
    res.json({ message: '상태 변경 완료' });
  } catch (err) {
    console.error('상태 변경 중 오류 발생:', err);
    res.status(500).json({ error: '서버 내부 오류' });
  }
});

module.exports = router;
