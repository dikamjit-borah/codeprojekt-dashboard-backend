const transactionsService = require('../services/transactionsService');

async function transactions(req, res, next) {
    try {
        const { startDate, endDate, status, substatus, page, limit } = req.query;

        const transactions = await transactionsService.transactions({
            startDate,
            endDate,
            status,
            substatus,
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

module.exports = {
    transactions,
};
