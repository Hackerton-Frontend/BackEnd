const axios = require('axios');
require('dotenv').config();

const CCTV_API_URL = 'https://apis.data.go.kr/6300000/openapi2022/safeCCTV/getsafeCCTV';

async function getAllCCTVs() {
  const allCCTVs = [];
  const numOfRows = 1000;
  let page = 1;
  let totalCount = Infinity;

  while ((page - 1) * numOfRows < totalCount) {
    try {
      const res = await axios.get(CCTV_API_URL, {
        params: {
          serviceKey: decodeURIComponent(process.env.CCTV_API_KEY),
          pageNo: page,
          numOfRows,
          _type: 'json',
        },
        headers: { Accept: 'application/json' }
      });

      const data = res.data;
      const response = data.response;

      if (!response || !response.body || !response.body.items) {
        console.warn(`page ${page}: 응답 구조가 예상과 다릅니다.`);
        break;
      }

      const items = response.body.items.map(item => ({
        lat: parseFloat(item.crdntY),
        lng: parseFloat(item.crdntX),
        address: item.rdnmadr || item.lnmAdres,
      }));

      allCCTVs.push(...items);
      totalCount = parseInt(response.body.totalCount);

      page++;
    } catch (error) {
      console.error(`page ${page} 호출 실패:`, error.message);
      break;
    }
  }

  console.log(`CCTV 전체 파싱 완료 (${allCCTVs.length}개)`);
  return allCCTVs;
}

module.exports = { getAllCCTVs };
