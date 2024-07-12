
const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const UserModel = require('../models/userModel')
const otpModel = require('../models/otpModel')
const productModel = require('../models/productModel')
const {sendEMail}=require('../utils/mail')
const {generateOTP}= require('../utils/otpGenerator')
const categoryModel = require('../models/categoryModel')


//*****************Load HomePage
const loadHome = async(req,res)=>{
    try {
        const products = await productModel.find().populate('category').exec();
        res.status(200).render("home",{products})
    } catch (error) {
        console.error(`Error rendering home page: ${error.message}`);    
    }
}

//*****************Load User SignUp page
const loadSignup = async (req, res) => {
    try {
            res.status(200).render('signup');
    } catch (error) {
        console.error(`Error rendering Signup Page: ${error.message}`);
    }};

//*******************Load User Login page
const loadLogin = async (req, res) => {
  try {
    res.status(200).render("login");
  } catch (error) {
    console.error(`Error rendering Login Page: ${error.message}`);
  }
};

//************* Forgot Password
const forgotPassword = async(req,res)=>{
    try {
        res.render("forgotPassword")
    } catch (error) {
        
    }
}

//********************Post Signup
const postSignup = async(req, res)=>{
    try {
        const { username, email, phone, password, confirmPassword } = req.body;
        let hashedPassword =await bcrypt.hash(password,10)
        const existingUser = await UserModel.findOne({email:email})
       
        //Checking if all fields entered
        if (!username || !email || !phone || !password || !confirmPassword) {
            req.flash('message', 'All fields are required');
            return res.redirect('/signup');
        }
        //checking if the email already used
        if(existingUser){
            req.flash('error_msg', 'Email already exist');
            return res.redirect('/signup');
        }
        //checking if phone number has 10 digit
        if(phone.length!==10){
            req.flash('error_msg', 'please give a valid mobile number');
            return res.redirect('/signup');
        }
        //Checking if password match
        if (password !== confirmPassword) {
            req.flash('error_msg', 'Password must match');
            return res.redirect('/signup');    
        }

        let otp =generateOTP()
        console.log(otp)
        //creating otp
        const newOtp = new otpModel({
            email,
            otp
        })
        await newOtp.save()

        
        //send otp to mail
        const sendEmail = await sendEMail(email, 'OTP Verification', `Your code is ${otp}`);
        if(sendEmail){
            req.flash('success_msg', 'An OTP has been sent to your email.');

        }
        //creating expiry for otp
        let otpExpires = Date.now() + 2 * 60 * 1000;
       console.log(`otpExpiresAt ${otpExpires}`)
        // temperarly storing user details to the session
        //User details will be saved to the DB only after verifying otp
        req.session.tempUser = {username,email,phone,password:hashedPassword,otp,otpExpires: otpExpires}
        res.redirect(`/verifyOTP`)
        } catch (error) {
            console.error(`Signup error: ${error.message}`);
            req.flash('error_msg', 'An unexpected error occurred during signup. Please try again later.');
            res.status(500).redirect('/signup');
        }

}

//************* Load OTP Verification page
const loadverifyOTP = async (req, res) => {
    try {
        const email = req.session.tempUser.email
        res.render('verifyOTP',{email:email});
    } catch (error) {
            console.error(`Signup error: ${error.message}`);
            req.flash('error_msg', 'Error rendering verification page.');
            res.status(500).redirect('/verifyOTP');
    }
};

//******************* Post OTP Verification
const postVerifyOTP = async(req, res)=>{
    try {
        const {otpCode1,otpCode2,otpCode3,otpCode4} = req.body
        const enteredOTP =`${otpCode1}${otpCode2}${otpCode3}${otpCode4}`
        
        if(!req.session.tempUser){
            req.flash("error_msg","Session Expired .Signup again")
            return res.redirect('/signup')
        }
        // console.log(`otp expires: ${req.session.tempUser.otpExpires}`)
        const {otpExpires} =req.session.tempUser
        const otpExpiresDate = new Date(otpExpires);
        const now = new Date();
        console.log(now)
        console.log(otpExpiresDate)
        if(otpExpiresDate < now){
            console.log("inside expiry")
            req.flash("error_msg","OOPS! Code is valid only for 2 mins.Try resending the code")
            return res.redirect('/verifyOTP')
            
        }

        // checking enered otp and otp stored in session match
        if(req.session.tempUser.otp !== enteredOTP){
            req.flash('error_msg',"Invalid email or otp")
            return res.redirect('/verifyOTP');            
        }
        else{
            req.flash('success_msg',"OTP verified")
            const {username,email,phone,password}= req.session.tempUser
            //Saving user to Database
            const newUser = new UserModel({
                        username,
                        email,
                        phone,
                        password
                    });
                    let userSaved = await newUser.save()
                    if (userSaved) {
                        // Clear temp user data from session
                        delete req.session.tempUser;
                        req.flash('success_msg', "Signup successful");
                        return res.redirect('/login'); 
                      } else {
                        req.flash('error_msg', "Error saving user to database");
                        return res.redirect('/verifyOTP');
                      }}
    } catch (error) {
        console.error(`OTP verification error: ${error.message}`);
        req.flash('error_msg', 'An error occurred during OTP verification. Please try again later.');
        res.status(500).redirect('/verifyOTP');
    }
}

//*********************Resend OTP
const resendOTP = async(req,res)=>{
    try {
        if(!req.session.tempUser){
            req.flash("error_msg","Session time out .please signup again")
            res.render("signup")
        }
        let otp = generateOTP()
        console.log(`resend otp ${otp}`)
        //Update OTP
        await otpModel.findOneAndUpdate(
            {email:req.session.tempUser.email},
            {otp:otp,
            createdAt:Date.now()})

        await sendEMail(req.session.tempUser.email, 'OTP Verification', `Your new OTP code is ${otp}`);
        req.session.tempUser.otp = otp
        req.session.tempUser.otpExpires = Date.now() + 2 * 60 * 1000;
        console.log(" NEW EXPIRY TIME"+req.session.tempUser.otpExpires)
        req.flash('success_msg', 'A new OTP has been sent to your email.');
        res.redirect('/verifyOTP');

    } catch (error) {
        console.error(`Error resending OTP: ${error.message}`);
        req.flash('error_msg', 'An error occurred while resending the OTP. Please try again later.');
        res.status(500).redirect('/verifyOTP');
   
    }

}

const productDetails = async(req,res)=>{
    try {
        let id = req.params.id
        const product = await productModel.findOne({_id:id})
        const categoryId = product.category
        const relatedProducts = await productModel.find({category :categoryId})
        res.render("productDetails",{product,relatedProducts})
    } catch (error) {
        
    }
}

// const accountBlocked = async (req,res)=>{
//     try {
//         res.render("blocked")
//     } catch (error) {
        
//     }
// }

const shop = async(req,res)=>{
    try {
        const search = req.query.search
        if(search && search !==" "){
            const products = await productModel.find({
                $or: [
                    {name: {$regex:search ,$options:'i'}},
                    {description: {$regex:search ,$options:'i'}},
                    {brand:{$regex:search, $options:'i'}}
                ]
            })
            res.render("shop",{products})
        }
        const products = await productModel.find().populate('category')
        res.render("shop",{products})
    } catch (error) {
        
    }
}
const shopByCategory = async(req,res)=>{
    try {
        const id = req.params.id

        const products =await productModel.find({category:id}).populate('category')
        res.render("shop",{products})
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    loadHome,
    loadSignup,
    loadLogin,
    forgotPassword,
    postSignup,
    loadverifyOTP,
    postVerifyOTP,
    resendOTP,
    productDetails,
    // accountBlocked,
    shop,
    shopByCategory
   
}

