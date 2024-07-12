const express = require("express");
const userRoute = express();
const passport = require('passport')
require('../config/passportConfig')
const {authenticate,logout,userStatus} =require('../middleware/user_auth')
const fetchCategory = require('../middleware/fetchCategory')
const isLoggedIn = require('../middleware/userLoggedIn')
const {clearCache} = require('../middleware/clearCache')

const userControl = require('../controllers/userController')

userRoute.set('view engine','ejs')
userRoute.set('views','./views/user')
userRoute.use(fetchCategory)
userRoute.use(isLoggedIn)

userRoute.get("/",clearCache,userControl.loadHome)
userRoute.get("/home",clearCache,userStatus,userControl.loadHome)

userRoute.get("/signup",clearCache,userControl.loadSignup)
userRoute.post("/signup",userControl.postSignup)
userRoute.get("/login",clearCache,userControl.loadLogin)
userRoute.post("/login",passport.authenticate('local',{failureRedirect:('/login'),failureFlash: true}),
(req,res)=>{
  
  res.redirect('/home')
})
userRoute.get("/verifyOTP",clearCache,userControl.loadverifyOTP)
userRoute.post("/verifyOTP",userControl.postVerifyOTP)
userRoute.get("/resendOTP",clearCache,userControl.resendOTP)
userRoute.get("/auth/google",clearCache,passport.authenticate('google',{scope:['profile','email']}))
userRoute.get('/auth/google/callback',passport.authenticate('google', { failureRedirect: '/login' }),
(req, res) => {
  res.redirect('/home')
});
userRoute.get("/forgotPassword",userControl.forgotPassword)
userRoute.get("/logout",clearCache,logout)
userRoute.get('/productDetails/:id',clearCache,userStatus,userControl.productDetails)
userRoute.get('/shop',clearCache,userStatus,userControl.shop)
userRoute.get('/shop/category/:id',userStatus,clearCache,userControl.shopByCategory)



module.exports = userRoute;
 