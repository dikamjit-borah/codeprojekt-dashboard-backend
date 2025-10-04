require("dotenv").config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require("./utils/logger");
const { requestIdMiddleware, responseFormatter } = require("./middlewares/requestHandler");

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

// Request tracking and response formatting middleware
app.use(requestIdMiddleware);
app.use(responseFormatter);

const v1Router = express.Router();
// const applyAuth = require("./middlewares/auth");

app.get("/health", (req, res) => {
  res.json({ status: 'healthy' });
});

app.use("/v1", v1Router);
v1Router.use('/transactions', require('./routes/transactions'));

// Error handler — keep this last
// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.message ?? "Internal Server Error",
    {
      requestId: req.requestId,
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    },

  );

  res.error(err.status || 500, err.message || "Internal Server Error")
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