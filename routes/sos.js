const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { findNearestPatrolWithEta } = require('../services/sosService');

// 로그 파일 경로
const LOG_FILE = path.join(__dirname, '../data/sosLogs.json');

/**
 * @swagger
 * /api/sos:
 *   post:
 *     summary: SOS 요청 등록
 *     description: 사용자의 위치 및 개인정보로 ETA를 계산하고 로그를 저장합니다.
 *     tags: [SOS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lat
 *               - lng
 *               - name
 *               - rrn
 *               - phone
 *               - situation
 *             properties:
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *               name:
 *                 type: string
 *               rrn:
 *                 type: string
 *               phone:
 *                 type: string
 *               situation:
 *                 type: string
 *     responses:
 *       200:
 *         description: ETA 반환 및 로그 저장
 *       400:
 *         description: 필수 값 누락
 *       500:
 *         description: 서버 오류
 */
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
      status: '처리중', // ✅ 기본 상태
    };

    const logs = fs.existsSync(LOG_FILE)
      ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'))
      : [];

    logs.push(newLog);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));

    res.json(eta);
  } catch (err) {
    console.error('등록 오류:', err);
    res.status(500).json({ error: '서버 내부 오류' });
  }
});

/**
 * @swagger
 * /api/sos:
 *   get:
 *     summary: SOS 로그 전체 조회
 *     tags: [SOS]
 *     responses:
 *       200:
 *         description: 전체 로그 목록 반환
 */
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return res.json([]);
    }

    const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: '서버 내부 오류' });
  }
});

/**
 * @swagger
 * /api/sos/{timestamp}:
 *   delete:
 *     summary: 특정 SOS 로그 삭제
 *     tags: [SOS]
 *     parameters:
 *       - in: path
 *         name: timestamp
 *         required: true
 *         schema:
 *           type: string
 *         description: 삭제할 로그의 timestamp
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       404:
 *         description: 로그를 찾을 수 없음
 */
router.delete('/:timestamp', (req, res) => {
  const { timestamp } = req.params;

  try {
    if (!fs.existsSync(LOG_FILE)) {
      return res.status(404).json({ error: '로그 파일이 없습니다.' });
    }

    let logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));

    const originalLength = logs.length;
    logs = logs.filter(entry => entry.timestamp !== timestamp);

    if (logs.length === originalLength) {
      return res.status(404).json({ error: '해당 로그를 찾을 수 없습니다.' });
    }

    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
    res.json({ message: '삭제 완료' });
  } catch (err) {
    res.status(500).json({ error: '서버 내부 오류' });
  }
});

/**
 * @swagger
 * /api/sos/{timestamp}/status:
 *   patch:
 *     summary: SOS 처리 상태 변경 (처리중 → 처리완료)
 *     tags: [SOS]
 *     parameters:
 *       - in: path
 *         name: timestamp
 *         required: true
 *         schema:
 *           type: string
 *         description: 상태를 변경할 로그의 timestamp
 *     responses:
 *       200:
 *         description: 상태 변경 완료
 *       404:
 *         description: 로그를 찾을 수 없음
 */
router.patch('/:timestamp/status', (req, res) => {
  const { timestamp } = req.params;

  try {
    if (!fs.existsSync(LOG_FILE)) {
      return res.status(404).json({ error: '로그 파일이 없습니다.' });
    }

    const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    const target = logs.find(entry => entry.timestamp === timestamp);

    if (!target) {
      return res.status(404).json({ error: '해당 로그를 찾을 수 없습니다.' });
    }

    target.status = '처리완료'; // ✅ 상태 변경
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));

    res.json({ message: '상태 변경 완료' });
  } catch (err) {
    res.status(500).json({ error: '서버 내부 오류' });
  }
});

module.exports = router;
