
const mongo = require('../providers/mongo');

/**
 * List transactions with optional filters and pagination.
 * Accepts an options object with:
 *  - startDate (ISO string)
 *  - endDate (ISO string)
 *  - status (string)
 *  - substatus (string)
 *  - page (number, defaults to 1)
 *  - limit (number, defaults to 20)
 *
 * Returns: { data: Array, page, limit, total }
 *
 */
async function transactions(options = {}) {
    const {
        startDate,
        endDate,
        status,
        substatus,
        page = 1,
        limit = 10,
    } = options;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * pageLimit;

    const match = {};

    // Use createdAt as the date field by default. Change if needed.
    const dateField = 'createdAt';

    if (startDate || endDate) {
        match[dateField] = {};
        if (startDate) {
            const sd = new Date(startDate);
            if (!isNaN(sd)) match[dateField].$gte = sd;
        }
        if (endDate) {
            const ed = new Date(endDate);
            if (!isNaN(ed)) match[dateField].$lte = ed;
        }
        // If createdAt ended up empty (invalid dates) remove it
        if (Object.keys(match[dateField]).length === 0) delete match[dateField];
    }

    if (status) match.status = status;
    if (substatus) match.substatus = substatus;

    const pipeline = [];
    if (Object.keys(match).length > 0) pipeline.push({ $match: match });

    // sort newest first by dateField when available
    pipeline.push({ $sort: { [dateField]: -1 } });

    // Facet to get paginated data and total count in one round-trip
    pipeline.push({
        $facet: {
            data: [
                { $skip: skip },
                { $limit: pageLimit },
                //projections here
            ],
            totalCount: [
                { $count: 'count' },
            ],
        },
    });

    const aggResult = await mongo.aggregate('transactions', pipeline);

    const facet = (aggResult && aggResult[0]) || { data: [], totalCount: [] };
    const data = facet.data || [];
    const total = (facet.totalCount && facet.totalCount[0] && facet.totalCount[0].count) || 0;

    return {
        data,
        page: pageNum,
        limit: pageLimit,
        total,
    };
}

module.exports = {
    transactions,
};
