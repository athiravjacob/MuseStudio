const flash = function(req, res, next)  {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.message = req.flash('message');
    next();
};
module.exports = flash