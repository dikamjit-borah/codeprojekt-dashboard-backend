require("dotenv").config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require("./utils/logger");

const app = express();

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
v1Router.use('/transactions', require('./routes/transactions'));

// Error handler — keep this last
app.use((err, req, res, next) => {
  req.log && req.log.error ? req.log.error(err) : console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 8001;
async function initializeApp() {
  try {
    const db = require("./providers/mongo");
    await db.connect();
    return true;
  } catch (error) {
    logger.error(`Failed to initialize application: ${error.message}`);
    return false;
  }
}

(async () => {
  const server = app.listen(PORT, async () => {
    const initialized = await initializeApp();
    if (!initialized) {
      logger.error("Application initialization failed. Shutting down server.");
      server.close(() => {
        process.exit(1);
      });
    } else {
      logger.info(
        `Server running on port ${PORT}, Environment: ${process.env.NODE_ENV}`
      );
      const config = require(`./config/${process.env.NODE_ENV}.js`);

      logger.info("Loaded application configuration", config);

    }
  });
})();