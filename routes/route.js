const express = require('express');
const router = express.Router();
const { getFastAndSafeRoutes } = require('../services/routeService');

/**
 * @swagger
 * /api/route:
 *   get:
 *     summary: 빠른 경로와 CCTV 기반 안전 경로 제공
 *     description: 출발지와 도착지 좌표를 기준으로 빠른 도보 경로와 CCTV가 더 많은 경로(안전 경로)를 계산하여 반환합니다. CCTV 개수뿐만 아니라 각 경로 주변의 CCTV 위치 좌표도 함께 제공됩니다.
 *     tags:
 *       - Route
 *     parameters:
 *       - in: query
 *         name: startLat
 *         required: true
 *         schema:
 *           type: number
 *         description: 출발지 위도
 *         example: 36.355
 *       - in: query
 *         name: startLng
 *         required: true
 *         schema:
 *           type: number
 *         description: 출발지 경도
 *         example: 127.298
 *       - in: query
 *         name: endLat
 *         required: true
 *         schema:
 *           type: number
 *         description: 도착지 위도
 *         example: 36.368
 *       - in: query
 *         name: endLng
 *         required: true
 *         schema:
 *           type: number
 *         description: 도착지 경도
 *         example: 127.333
 *     responses:
 *       200:
 *         description: 빠른 경로와 안전 경로 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fastRoute:
 *                   type: object
 *                   properties:
 *                     path:
 *                       type: array
 *                       items:
 *                         type: array
 *                         items:
 *                           type: number
 *                     distance:
 *                       type: number
 *                     cctvInfo:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                         cctvLoc:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               lat:
 *                                 type: number
 *                               lng:
 *                                 type: number
 *                 safeRoute:
 *                   type: object
 *                   properties:
 *                     path:
 *                       type: array
 *                       items:
 *                         type: array
 *                         items:
 *                           type: number
 *                     distance:
 *                       type: number
 *                     cctvInfo:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                         cctvLoc:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               lat:
 *                                 type: number
 *                               lng:
 *                                 type: number
 *       400:
 *         description: 좌표 정보가 부족합니다.
 *       500:
 *         description: 서버 오류가 발생했습니다.
 */

// 중복 CCTV 좌표 제거 함수
function removeDuplicateCCTVs(cctvLoc) {
  const seen = new Set();
  return cctvLoc.filter(({ lat, lng }) => {
    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

router.get('/', async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng } = req.query;

    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({ error: '좌표 정보가 부족합니다.' });
    }

    const start = [parseFloat(startLng), parseFloat(startLat)];
    const end = [parseFloat(endLng), parseFloat(endLat)];

    const result = await getFastAndSafeRoutes(start, end);

    // CCTV 중복 제거 적용
    const uniqueFastCCTVs = removeDuplicateCCTVs(result.fastRoute.cctvInfo.cctvLoc);
    const uniqueSafeCCTVs = removeDuplicateCCTVs(result.safeRoute.cctvInfo.cctvLoc);

    result.fastRoute.cctvInfo.cctvLoc = uniqueFastCCTVs;
    result.fastRoute.cctvInfo.count = uniqueFastCCTVs.length;

    result.safeRoute.cctvInfo.cctvLoc = uniqueSafeCCTVs;
    result.safeRoute.cctvInfo.count = uniqueSafeCCTVs.length;

    res.json(result);
  } catch (error) {
    console.error('경로 계산 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
