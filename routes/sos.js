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
 *     summary: SOS 요청 처리
 *     description: 사용자의 위치, 개인정보, 위급 상황 설명을 기반으로 ETA를 계산하고 로그로 저장합니다.
 *     tags:
 *       - SOS
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
 *                 example: 36.361349
 *               lng:
 *                 type: number
 *                 example: 127.344596
 *               name:
 *                 type: string
 *                 example: 양희승
 *               rrn:
 *                 type: string
 *                 example: 030331-1234567
 *               phone:
 *                 type: string
 *                 example: 010-4669-2902
 *               situation:
 *                 type: string
 *                 example: 흉기를 든 남성이 따라오고 있음
 *     responses:
 *       200:
 *         description: ETA 정보 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 duration:
 *                   type: number
 *                   example: 142
 *                 distance:
 *                   type: number
 *                   example: 931.4
 *       400:
 *         description: 필수 정보 누락
 *       500:
 *         description: 서버 오류 발생
 */
router.post('/', async (req, res) => {
  const { lat, lng, name, rrn, phone, situation } = req.body;

  if (!lat || !lng || !name || !rrn || !phone || !situation) {
    return res.status(400).json({ error: '필수 정보 누락' });
  }

  try {
    const eta = await findNearestPatrolWithEta(req.body);

    res.json(eta);

  } catch (err) {
    res.status(500).json({ error: '서버 내부 오류' });
  }
});

/**
 * @swagger
 * /api/sos:
 *   get:
 *     summary: 저장된 SOS 요청 이력 조회
 *     description: JSON 파일에 저장된 SOS 요청 목록을 반환합니다.
 *     tags:
 *       - SOS
 *     responses:
 *       200:
 *         description: SOS 로그 리스트
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   timestamp:
 *                     type: string
 *                   name:
 *                     type: string
 *                   rrn:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   situation:
 *                     type: string
 *                   location:
 *                     type: object
 *                     properties:
 *                       lat:
 *                         type: number
 *                       lng:
 *                         type: number
 *                   eta:
 *                     type: object
 *                     properties:
 *                       duration:
 *                         type: number
 *                       distance:
 *                         type: number
 */
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

module.exports = router;
