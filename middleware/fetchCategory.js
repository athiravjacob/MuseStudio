const category = require('../models/categoryModel')
const cart = require('../models/cartModel')
const wallet = require('../models/walletModel')

const fetchCategory = async (req, res, next) => {
    try {
        const userId = req.user?.id ;
        
        // Fetch categories
        res.locals.category = await category.find().lean();
        
        if (userId) {
            // Fetch cart details
            const userCart = await cart.findOne({ userId: userId });
            res.locals.totalItem = userCart?.totalQuantity || 0;  // Handle case where cart might not exist
            
            // Fetch wallet details
            const userWallet = await wallet.findOne({ user: userId });
            res.locals.walletBalance = userWallet?.balance || 0;  // Handle case where wallet might not exist
        }
        
        next(); // Proceed to the next middleware/route handler
    } catch (error) {
        console.log(error);
        res.locals.category = [];
        res.locals.totalItem = 0;
        res.locals.walletBalance = 0;
        next(); // Proceed without passing the error to avoid triggering an error page
    }
};

module.exports = fetchCategory;
