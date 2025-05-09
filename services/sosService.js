const fs = require('fs');
const path = require('path');

// 순찰차 위치 데이터 로딩
const patrolCars = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/patrolCars.json'), 'utf-8')
);

// SOS 로그 저장 경로
const LOG_FILE = path.join(__dirname, '../data/sosLogs.json');

// 거리 계산 함수 (Haversine)
function getDistance(lat1, lng1, lat2, lng2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000; // 지구 반지름 (m)

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const findNearestPatrolWithEta = async (sosData) => {
  const { lat, lng, name, rrn, phone, situation } = sosData;

  let minTime = Infinity;
  let bestSummary = null;
  let bestCarId = null;

  for (const car of patrolCars) {
    const distance = getDistance(car.lat, car.lng, lat, lng);


    const roadDistance = distance * 1.2; 
    const averageSpeed = 11.1 * 0.9;   
    const etaSeconds = roadDistance / averageSpeed;

    console.log(`🚓 ${car.id}: 거리=${distance.toFixed(2)}m, ETA=${etaSeconds.toFixed(2)}s`);

    if (etaSeconds < minTime) {
      minTime = etaSeconds;
      bestSummary = {
        duration: etaSeconds,
        distance
      };
      bestCarId = car.id;
    }
  }

  if (!bestSummary) {
    throw new Error('ETA 계산 실패: 유효한 순찰차 경로 없음');
  }

  const eta = {
    duration: bestSummary.duration,
    distance: bestSummary.distance
  };

  const logEntry = {
    timestamp: new Date().toISOString(),
    name,
    rrn,
    phone,
    situation,
    location: { lat, lng },
    eta
  };

  try {
    let existingLogs = [];
    if (fs.existsSync(LOG_FILE)) {
      const raw = fs.readFileSync(LOG_FILE);
      existingLogs = JSON.parse(raw);
    }

    existingLogs.push(logEntry);
    fs.writeFileSync(LOG_FILE, JSON.stringify(existingLogs, null, 2));
  } catch (logErr) {
    console.error('로그 저장 실패:', logErr.message);
  }

  return eta;
};

module.exports = { findNearestPatrolWithEta };
