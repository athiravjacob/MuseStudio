const clearCache = (req, res, next) => {
    try {
        res.set(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, private'
        );
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        next();
    } catch (error) {
        console.log(error.message);
        next(error);
    }
};

module.exports = { clearCache };