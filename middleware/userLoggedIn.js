
const isLoggedIn = async(req,res,next)=>{
    if (req.isAuthenticated()) {
        if (req.user.blocked) {
            req.logout((err) => {
                if (err) {
                    return next(err);
                }
                return res.redirect('/login'); 
            });
        } else {
            res.locals.userAuthenticated = true;
            res.locals.user = req.user;
            next();
        }
    } else {
        res.locals.userAuthenticated = false;
        res.locals.user = null;
        next();
    }
};

module.exports = isLoggedIn