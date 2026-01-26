const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/transactions', dashboardController.transactions);
router.get('/monthly-analytics', dashboardController.monthlyAnalytics);
router.get('/users', dashboardController.getUsers);

module.exports = router;
