const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pino = require('pino');
const pinoHttp = require('pino-http');

const app = express();

// Logger
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors());
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // limit each IP to 120 requests per windowMs
});
app.use(limiter);

// body parser with size limit
app.use(express.json({ limit: '100kb' }));

const v1Router = express.Router();
// const applyAuth = require("./middlewares/auth");

app.get("/health", (req, res) => {
  res.json({ status: 'healthy' });
});

app.use("/v1", v1Router);
app.use('/transactions', require('./routes/transactions'));

// Error handler — keep this last
app.use((err, req, res, next) => {
  req.log && req.log.error ? req.log.error(err) : console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

app.listen(8001, () => {
  logger.info(`Server listening on port ${8001}`);
});
