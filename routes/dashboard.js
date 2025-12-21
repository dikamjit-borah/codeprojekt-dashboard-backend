const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactionsController');

router.get('/transactions', transactionsController.transactions);

module.exports = router;
