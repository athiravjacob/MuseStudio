const cartModel = require('../models/cartModel');
const cart = require('../models/cartModel')
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
            // const cart = await cartModel.findOne({userId: req.user.id}).populate('items.productId')
            // console.log(cart)
            // if(cart){
            //     res.locals.cart =cart
            // }
            next();
        }
    } else {
        res.locals.userAuthenticated = false;
        res.locals.user = null;
        next();
    }
};

module.exports = isLoggedIn 