
const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const UserModel = require('../models/userModel')
const otpModel = require('../models/otpModel')
const productModel = require('../models/productModel')
const {sendEMail}=require('../utils/mail')
const {generateOTP}= require('../utils/otpGenerator')
const categoryModel = require('../models/categoryModel')
const cartModel = require('../models/cartModel')
const orderModel = require('../models/orderModel')



//*****************Load HomePage
const loadHome = async(req,res)=>{
    try {
        const products = await productModel.find({status:true}).populate('category').exec();
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

//********************* Resend OTP
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
// ************************User Profile Page
const profile = async(req,res)=>{
    try {
        const user = req.user
        res.render("profile",{user})
    } catch (error) {
        
    }
}
// ******************************Show Address
const showAddress = async(req,res) =>{
    try {
        res.render("address")
    } catch (error) {
        
    }
}
// ************************* Save changes in profile
const saveChanges = async(req,res)=>{
    try {
        const id = req.params.id
        const {username,phone,dob} =req.body
        const userProfile = await UserModel.findByIdAndUpdate({_id:id},{username,
        DOB:dob,
       phone
        })
        if(userProfile) res.status(200).send("updated")
    } catch (error) {
     console.log(error)   
    }
}
// *********************** Add new address
const newAddress = async(req,res)=>{
    try {
        const id = req.params.id
        const {address,city,state,pincode} =req.body
        const userProfile = await UserModel.findById({_id:id})
        if(userProfile.address.length>=0){
            userProfile.address.forEach(addr =>{
                if(addr.isDefault) addr.isDefault = false
            })
        }
        userProfile.address.push({ 
            address,city,state,pincode,isDefault :true
        })
        const added = await userProfile.save()
        console.log(userProfile.address)
        
        if(added) res.status(200).send("new address added")
    } catch (error) {
     console.log(error)    
    }
}

// ********************** Product Details

const productDetails = async(req,res)=>{
    try {
        let id = req.params.id
        const product = await productModel.findOne({_id:id})
        const categoryId = product.category
        const relatedProducts = await productModel.find({category :categoryId})
        res.render("productDetails",{product,relatedProducts})
    } catch (error) {
        console.log(error)
    }
}

// const accountBlocked = async (req,res)=>{
//     try {
//         res.render("blocked")
//     } catch (error) {
        
//     }
// }


// ********************************* Shop Page
const shop = async(req,res)=>{
    try {
        const search = req.query.search
        if(search && search !==" "){
            const products = await productModel.find({status:true,
                $or: [
                    {name: {$regex:search ,$options:'i'}},
                    {description: {$regex:search ,$options:'i'}},
                    {brand:{$regex:search, $options:'i'}}
                ]
            })
            res.render("shop",{products})
        }
        const products = await productModel.find({status:true}).populate('category')
        res.render("shop",{products})
    } catch (error) {
        
    }
}

// *************************** Shop By Category
const shopByCategory = async(req,res)=>{
    try {
        const id = req.params.id
        const products =await productModel.find({category:id}).populate('category')
        res.render("shop",{products})
    } catch (error) {
        console.log(error)
    }
}

// ********************************* Sort Low to high
const shopLowToHigh = async(req,res)=>{
    try {
        const products = await productModel.find().sort({price:1})
        res.render("shop",{products})
    } catch (error) {
        
    }
}
//************************************* Sort High to Low
const shopHighToLow = async(req,res)=>{
    try {
        const products = await productModel.find().sort({price:-1})
        const count = await productModel.countDocuments()
        res.render("shop",{products})
    } catch (error) {
        
    }
}

//*********************************  Sort Ascending 
const shopAscending = async(req,res)=>{
    try {
        const products = await productModel.find().sort({name:1})
        res.render("shop",{products})
    } catch (error) {
        
    }
}

// ***********************Sort Descending
const shopDescending = async(req,res)=>{
    try {
        const products = await productModel.find().sort({name:-1})
        const count = await productModel.countDocuments()
        res.render("shop",{products})
    } catch (error) {
        
    }
}

// **************************** View Cart

const viewCart = async(req,res)=>{
    try {
        const user = req.user
        const cart = await cartModel.findOne({userId :user.id}).populate('items.productId')
        console.log("fetch is working")
        res.status(200).render("cart",{cart})
    } catch (error) {
        console.log(error)
    }
}

//************************************* Add to cart
const addtoCart = async(req,res)=>{
    try {
        const user = req.user
        if(!user){
            console.log("No user")
            req.flash("error_msg","Please login to add products to cart")
            return res.status(401).json({ 
                redirect: true, 
                redirectUrl: "/login",
                message: "Please login to add products to cart"
            })
        } 
        const {productid,productQty,productPrice} = req.body

        const userId = user._id
        let cart = await cartModel.findOne({userId}) 
        if(!cart){
             cart = new cartModel({userId,items:[]})
        }

        const productIndex = cart.items.findIndex(item =>item.productId.toString() === productid)
        if(productIndex > -1){
            cart.items[productIndex].quantity +=1
        }else{
            cart.items.push({
                productId : productid,
                price:productPrice,
                quantity :productQty
            })
        }

        const addedtocart =await cart.save()
    } catch (error) {
        console.log(error)
    }
}

// ****************************** Delete Cart

const deleteCart = async(req,res)=>{
    try {
        const user = req.user
        if(!user) res.status(400).send("Please Login.NO user foung")
        const cart = await cartModel.findOne({userId : user.id})
        if(!cart){
           res.status(400).send("Error deleting cart")

        }
        const deleted = await cartModel.deleteOne({userId:user.id})
        if(deleted)
        {
            res.status(200).send("cart deleted successfully")
        }
    } catch (error) {
     console.log(error)   
    }
}
// *************************** Remove an item from cart
const removeItem = async(req,res)=>{
    try {
        const user = req.user
        const productId = req.params.id
        if(!user) res.status(400).send("No user found.Please Login")
        const cart = await cartModel.findOne({userId : user.id})
        cart.items.pull({productId})
        const removed = await cart.save()
        if(removed) res.status(200).send("item removed")
    } catch (error) {
        console.log(error)
    }
}

//* ************************ Change quantity of item
const changeQty = async(req,res)=>{
    try {
        const user =req.user
        const productId = req.params.id
        const qtyChange = req.body.qty
        console.log(qtyChange)
        if(!user) res.status(400).send("No user found.plaese login")
        const cart = await cartModel.findOne({userId :user.id})
        const productIndex = cart.items.findIndex(item => item.productId.toString() === productId)
        console.log(`product index of item ti inc :${productIndex}`)
        if(productIndex < -1) res.status(400).send("Product Not found")
        cart.items[productIndex].quantity +=qtyChange
         const qtyUpdated = await cart.save()
         if(qtyUpdated) res.status(200).send("qty increases")    
        
    } catch (error) {
        
    }
}

// ************************* Check Out
const checkout = async(req,res)=>{
    try {
        const user = req.user
        const cart = await cartModel.findOne({userId:user.id}).populate('items.productId')
        if(!user) return res.render("home")
        res.render("checkout",{cart})
        
       
    } catch (error) {
        console.log(error)
    }
}

const checkoutAddress = async(req,res)=>{
    try {
        const userId = req.user.id
        const addressId = req.body.addressId
        const user = await UserModel.findById(userId)
        user.address.forEach(addr =>{
            if(addr.isDefault) addr.isDefault = false
            if(addr._id.toString()===addressId)  addr.isDefault = true
        })
        const addrChanged = await user.save()
        if(addrChanged) res.status(200).send("adress changed")
        

    } catch (error) {
        console.log(error)
    }
}
const confirmOrder = async(req,res)=>{
    try {
        const orderDetails = await orderModel.findOne({_id:req.session.orderId})
        res.render("orderConfirm",{orderDetails})
    } catch (error) {
        
    }
}


 
 
const placeOrder = async(req,res)=>{
    try {
        const userId = req.user.id
        const {cartId,paymentOption,deliveryAddress} = req.body
        const cart = await cartModel.findById(cartId).populate('items.productId')
        const products = cart.items.map(item => ({
            productid:item.productId._id,
            productname: item.productId.name,
            price: item.productId.price,
            quantity: item.quantity
          }));
          const totalPrice = cart.totalPrice
          const totalQuanity =cart.totalQuantity

        
        const Order = new orderModel({
            userId,cart:products,paymentOption,deliveryAddress,totalPrice,totalQuanity
        })
        const orderSuccess = await Order.save()
        //Update Stock
        const updateStock = async (products) => {
            try {
                for (let product of products) {
                    await productModel.findByIdAndUpdate(product.productid, { $inc: { quantity: -product.quantity } });
                }
                console.log('Stock updated successfully');
            } catch (error) {
                console.error('Error updating stock:', error);
            }
        };
        if(orderSuccess){
            updateStock(products)
        }
        await cartModel.deleteOne({ _id: cartId });
        req.session.orderId=orderSuccess._id
        res.redirect("/confirmOrder")


           } catch (error) {
        console.log(error)
    }
}

const orders =async(req,res)=>{
    try {
        const userId = req.user.id
        const orders = await orderModel.find({userId :userId}).populate('cart').sort({createdAt:-1})
        console.log(orders)
        if(orders){
            res.render("orderHistory",{orders})
        }
        res.render("orderHistory",{message:"No orders placed yet!"})
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
    profile,
    showAddress,
    saveChanges,
    newAddress,
    productDetails,
    shop,
    shopByCategory,
    shopLowToHigh,
    shopHighToLow,
    shopAscending,
    shopDescending,
    viewCart,
    addtoCart,
    deleteCart,
    removeItem,
    changeQty,
    checkout,
    checkoutAddress,
    placeOrder,
    confirmOrder,
    orders
   
}

