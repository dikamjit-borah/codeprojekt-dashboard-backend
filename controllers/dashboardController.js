const dashboardService = require('../services/dashboardService');

async function transactions(req, res, next) {
    try {
        const { startDate, endDate, status, subStatus, transactionId, page, limit } = req.query;

        const transactions = await dashboardService.transactions({
            startDate,
            endDate,
            status,
            subStatus,
            transactionId,
            page,
            limit,
        });

        res.success(200, "Transactions fetched successfully", {
            page: transactions.page,
            limit: transactions.limit,
            total: transactions.total,
            transactions: transactions.data,
        });

    } catch (err) {
        next(err);
    }
}

async function monthlyAnalytics(req, res, next) {
    try {
        const { month, year } = req.query;

        const now = new Date();
        const y = year ? parseInt(year, 10) : now.getUTCFullYear();
        const m = month ? parseInt(month, 10) : (now.getUTCMonth() + 1); // 1-12

        const monthlyAnalytics = await dashboardService.getMonthlyAnalytics({ month: m, year: y });

        res.success(200, "Monthly analytics fetched successfully", {
            month: m,
            year: y,
            monthlyAnalytics
        });

    } catch (err) {
        next(err);
    }
}

module.exports = {
    transactions,
    monthlyAnalytics,
};
