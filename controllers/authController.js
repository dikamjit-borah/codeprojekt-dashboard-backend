async function login(req, res, next) {
    const { email, password } = req.body || {};
    const expectedEmail = process.env.LOGIN_EMAIL;
    const expectedPassword = process.env.LOGIN_PASSWORD;
    if (!expectedEmail || !expectedPassword) return res.error(500, 'LOGIN_EMAIL or LOGIN_PASSWORD not configured');
    const canLogin = Boolean(email && password && email === expectedEmail && password === expectedPassword);
    if (canLogin) {
        return res.success(200, 'OK');
    }
    return res.error(401, 'Unauthorized');
}

module.exports = {
    login,
};
