const express = require('express');
const router = express.Router();
const { getAllCCTVs } = require('../services/cctvService');

/**
 * @swagger
 * /api/cctv:
 *   get:
 *     summary: 모든 CCTV 좌표 조회
 *     description: 대전광역시에 설치된 방범용 CCTV들의 위도, 경도, 주소 정보를 반환합니다.
 *     tags:
 *       - CCTV
 *     responses:
 *       200:
 *         description: CCTV 위치 데이터 배열 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 2985
 *                 cctvs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       lat:
 *                         type: number
 *                         example: 36.355
 *                       lng:
 *                         type: number
 *                         example: 127.298
 *                       address:
 *                         type: string
 *                         example: 대전광역시 유성구 궁동 123
 */

router.get('/', async (req, res) => {
  const cctvs = await getAllCCTVs();
  res.json({ count: cctvs.length, cctvs });
});

module.exports = router;
