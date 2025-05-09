const axios = require('axios');
const { getAllCCTVs } = require('./cctvService');
require('dotenv').config();

const ORS_URL = 'https://api.openrouteservice.org/v2/directions/foot-walking';

// 거리 기반 CCTV 근접 판단 (반경 50m 이내)
function countNearbyCCTVs(routeCoords, cctvs, radius = 50) {
  const toRad = deg => (deg * Math.PI) / 180;

  const isClose = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c <= radius;
  };

  let count = 0;
  let cctvLoc = [];
  for (const cctv of cctvs) {
    if (routeCoords.some(([lng, lat]) => isClose(lat, lng, cctv.lat, cctv.lng))) {
      count++;
      cctvLoc.push(cctv);
    }
  }
  return {count,cctvLoc};
}

const polyline = require('@mapbox/polyline');

async function getRoutesWithAlternatives(start, end) {
  try {
    const { data } = await axios.post(ORS_URL, {
      coordinates: [start, end],
      alternative_routes: {
        target_count: 3,
        share_factor: 0.6,
        weight_factor: 1.4
      }
    }, {
      headers: {
        Authorization: process.env.ORS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    return data.routes.map((r, idx) => {
      if (!r.geometry) {
        console.warn(`geometry 누락 - routes[${idx}]`);
        return null;
      }

      const decoded = polyline.decode(r.geometry);
      const reversed = decoded.map(([lat, lng]) => [lng, lat]); 

      return {
        coordinates: reversed,
        distance: r.summary.distance
      };
    }).filter(Boolean);
  } catch (err) {
    console.error("ORS 대체 경로 요청 실패:", err.message);
    return [];
  }
}


async function getFastAndSafeRoutes(start, end) {
  const cctvs = await getAllCCTVs();
  const routes = await getRoutesWithAlternatives(start, end);

  if (!routes.length) {
    console.warn("경로 없음");
    return {
      fastRoute: { path: [], cctvInfo: { count: 0, cctvLoc: [] }, distance: 0 },
      safeRoute: { path: [], cctvInfo: { count: 0, cctvLoc: [] }, distance: 0 }
    };
  }

  const analyzed = routes.map(r => {
    const cctvInfo = countNearbyCCTVs(r.coordinates, cctvs);
    return {
      path: r.coordinates,
      distance: r.distance,
      cctvInfo // { count, cctvLoc }
    };
  });

  const fast = analyzed.reduce((a, b) => a.distance < b.distance ? a : b);
  const safe = analyzed.reduce((a, b) => a.cctvInfo.count > b.cctvInfo.count ? a : b);

  return {
    fastRoute: {
      path: fast.path,
      distance: fast.distance,
      cctvInfo: fast.cctvInfo
    },
    safeRoute: {
      path: safe.path,
      distance: safe.distance,
      cctvInfo: safe.cctvInfo
    }
  };
}


module.exports = { getFastAndSafeRoutes };
