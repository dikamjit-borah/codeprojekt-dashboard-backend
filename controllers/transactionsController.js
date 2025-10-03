const transactionsService = require('../services/transactionsService');

async function listTransactions(req, res, next) {
    try {
        const items = await transactionsService.list();
        res.json(items);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    listTransactions,
};
