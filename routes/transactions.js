const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactionsController');

// GET /transactions
router.get('/', transactionsController.listTransactions);

module.exports = router;
