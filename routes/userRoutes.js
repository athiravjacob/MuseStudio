const express = require("express");
const userRoute = express();
const passport = require('passport')
require('../config/passportConfig')
const {authenticate,logout,userStatus} =require('../middleware/user_auth')
const fetchCategory = require('../middleware/fetchCategory')
const isLoggedIn = require('../middleware/userLoggedIn')
const {clearCache} = require('../middleware/clearCache')
const breadcrumb = require('../middleware/breadcrumb')

const userControl = require('../controllers/userController')

userRoute.set('view engine','ejs')
userRoute.set('views','./views/user')
userRoute.use(fetchCategory)
userRoute.use(isLoggedIn)
// userRoute.use(breadcrumb)

userRoute.get("/",clearCache,userControl.loadHome)
userRoute.get("/home",clearCache,userControl.loadHome)
userRoute.get("/signup",clearCache,userControl.loadSignup)
userRoute.post("/signup",userControl.postSignup)
userRoute.get("/login",clearCache,userControl.loadLogin)
userRoute.post("/login",passport.authenticate('local',{failureRedirect:('/login'),failureFlash: true,successRedirect:('/home')}))
userRoute.get("/verifyOTP",clearCache,userControl.loadverifyOTP)
userRoute.post("/verifyOTP",userControl.postVerifyOTP)
userRoute.get("/resendOTP",clearCache,userControl.resendOTP)
userRoute.get("/auth/google",clearCache,passport.authenticate('google',{scope:['profile','email']}))
userRoute.get('/auth/google/callback',passport.authenticate('google', { failureRedirect: '/login' }),
(req, res) => {
  res.redirect('/home')
});


userRoute.get("/forgotPassword",userControl.forgotPassword)
userRoute.get("/profile",userControl.profile)
userRoute.get("/profile/address",userControl.showAddress)
userRoute.patch("/profile/saveChanges/:id",userControl.saveChanges)
userRoute.patch("/profile/addNewAddress/:id",userControl.newAddress)


userRoute.get("/logout",clearCache,logout)
userRoute.get('/productDetails/:id',clearCache,userStatus,userControl.productDetails)
userRoute.get('/shop',clearCache,userStatus,userControl.shop)
userRoute.get('/shop/category/:id',userStatus,clearCache,userControl.shopByCategory)
userRoute.get('/shop/sort-low-to-high',clearCache,userControl.shopLowToHigh)
userRoute.get('/shop/sort-high-to-low',clearCache,userControl.shopHighToLow)
userRoute.get('/shop/sort-asc',clearCache,userControl.shopAscending)
userRoute.get('/shop/sort-des',clearCache,userControl.shopDescending)

userRoute.get('/cart',userControl.viewCart)
userRoute.post('/cart/addtoCart',userControl.addtoCart)
userRoute.delete('/cart/deleteCart',userControl.deleteCart)
userRoute.patch('/cart/removeItem/:id',userControl.removeItem)
userRoute.patch('/cart/changeQty/:id',userControl.changeQty)

userRoute.get('/checkout',userControl.checkout)
userRoute.patch('/checkout/changeAddress',userControl.checkoutAddress)

userRoute.post('/placeOrder',userControl.placeOrder)
userRoute.get('/confirmOrder',userControl.confirmOrder)

userRoute.get('/orders',userControl.orders)



module.exports = userRoute;
 