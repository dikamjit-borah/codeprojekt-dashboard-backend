
const mongo = require('../providers/mongo');

/**
 * List transactions with optional filters and pagination.
 * Accepts an options object with:
 *  - startDate (ISO string)
 *  - endDate (ISO string)
 *  - status (string)
 *  - subStatus (string)
 *  - transactionId (string) - searches the transactionId field
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
        subStatus,
        search,
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
    if (subStatus) match.subStatus = subStatus;
    if (search) match.transactionId = { $regex: search, $options: 'i' };

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
    console.log(JSON.stringify(pipeline, null, 2));
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

async function getMonthlyAnalytics(options = {}) {
    const now = new Date();
    const providedMonth = options.month ? parseInt(options.month, 10) : null; // 1-12 if provided
    const providedYear = options.year ? parseInt(options.year, 10) : null;

    const y = !isNaN(providedYear) ? providedYear : now.getUTCFullYear();
    const mIndex = !isNaN(providedMonth) ? Math.min(12, Math.max(1, providedMonth)) - 1 : now.getUTCMonth(); // 0-11

    const startOfMonth = new Date(Date.UTC(y, mIndex, 1, 0, 0, 0, 0));
    const startOfNextMonth = new Date(Date.UTC(y, mIndex + 1, 1, 0, 0, 0, 0));
    const [monthlyFinancials, monthlyUserAnalytics] = await Promise.all([
        getMonthlyFinancials(startOfMonth, startOfNextMonth),
        getMonthlyUserAnalytics(startOfMonth, startOfNextMonth)
    ]);

    const { profile, ...userAnalyticsWithoutProfile } = monthlyUserAnalytics || {};

    return {
        monthlyFinancials,
        monthlyUserAnalytics: userAnalyticsWithoutProfile
    };

}

async function getMonthlyFinancials(startOfMonth, startOfNextMonth) {
    const pipeline = [
        {
            // Filter only required month + successful transactions
            $match: {
                status: "success",
                createdAt: {
                    $gte: startOfMonth,
                    $lt: startOfNextMonth
                }
            }
        },
        {
            // Convert string prices to numbers
            $project: {
                sellAmountInINR: {
                    $toDouble: "$paymentResponse.amount"
                },
                costAmountInSmileCoins: {
                    $toDouble: "$vendorResponse.price"
                }
            }
        },
        {
            // Aggregate
            $group: {
                _id: `${startOfMonth}`, // dummy id to get single doc,
                totalSellPriceInINR: { $sum: "$sellAmountInINR" },
                totalCostPriceInSmileCoins: { $sum: "$costAmountInSmileCoins" },
                totalSales: { $sum: 1 }
            }
        }
    ];

    const aggResult = await mongo.aggregate('transactions', pipeline);
    let monthlyFinancials
    if (aggResult && aggResult[0]) {
        const { totalSales, totalCostPriceInSmileCoins, totalSellPriceInINR } = aggResult[0];
        const totalCostPriceInBRR = totalCostPriceInSmileCoins / 10; // 1 BRR = 10 Smile Coins
        const totalCostPriceInINR = totalCostPriceInBRR * 16.6 // 1 BRR = 16.6 INR
        const netProfitOrLossInINR = totalSellPriceInINR - totalCostPriceInINR;
        monthlyFinancials = {
            totalSales,
            totalCostPriceInSmileCoins,
            totalCostPriceInBRR,
            totalCostPriceInINR,
            totalSellPriceInINR,
            netProfitOrLossInINR
        }
    }
    return monthlyFinancials;
}

async function getMonthlyUserAnalytics(startOfMonth, startOfNextMonth) {
    const pipeline = [
        {
            // Filter only required month
            $match: {
                createdAt: {
                    $gte: startOfMonth,
                    $lt: startOfNextMonth
                }
            }
        },
        {
            // Project profile field and count total documents
            $group: {
                _id: `${startOfMonth}`, // dummy id to get single doc
                profile: { $push: "$profile" },
                totalUsers: { $sum: 1 }
            }
        }
    ];

    const aggResult = await mongo.aggregate('users', pipeline);
    let monthlyUserAnalytics
    if (aggResult && aggResult[0]) {
        monthlyUserAnalytics = { ...aggResult[0] };
    }
    return monthlyUserAnalytics;
}

module.exports = {
    transactions,
    getMonthlyAnalytics,
    getMonthlyFinancials,
    getMonthlyUserAnalytics,
};
