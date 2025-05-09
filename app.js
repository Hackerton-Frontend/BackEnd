const express = require('express');
const cors = require('cors');
require('dotenv').config();

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static('public'));

// 🔹 Swagger 설정
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CCTV 기반 경로 API',
      version: '1.0.0',
      description: '도보 기반 안전 경로 및 CCTV 정보 제공 API'
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./routes/*.js'], // Swagger 주석이 있는 파일 경로
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

//라우터 등록
const cctvRouter = require('./routes/cctv');
app.use('/api/cctv', cctvRouter);

const routeRouter = require('./routes/route');
app.use('/api/route', routeRouter);

// SOS 라우터 등록
const sosRouter = require('./routes/sos');
app.use('/api/sos', sosRouter);

const PORT = 3000;
app.listen(PORT, () => {
});