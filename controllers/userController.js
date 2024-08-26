
const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const UserModel = require('../models/userModel')
const otpModel = require('../models/otpModel')
const productModel = require('../models/productModel')
const {sendEMail}=require('../utils/mail')
const {generateOTP}= require('../utils/otpGenerator')
const wishlistModel = require('../models/wishlistModel')
const cartModel = require('../models/cartModel')
const orderModel = require('../models/orderModel')
const couponModel = require('../models/couponModel')
const { client } = require('../utils/paypal');
const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');
const walletModel = require('../models/walletModel')
require('dotenv').config()



//*****************Load HomePage
const loadHome = async(req,res)=>{
    try {
        const products = await productModel.find({status:true}).limit(9).populate('category').exec();
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

// ********************************* Shop Page
const shop = async (req, res) => {
    try {
        const currentPage = parseInt(req.query.pageNo) || 1;
        const limit = 8;
        const skip = (currentPage - 1) * limit;

        const search = req.query.search || '';
        const sortOption = req.query.sort || '';  // Get sort option from query params
        const category = req.query.category || '';  // Get category from params

        let sortCriteria = {};

        // Determine sort criteria based on the sort option
        if (sortOption === 'lowToHigh') {
            sortCriteria = { originalPrice: 1 };  // Sort by price ascending
        } else if (sortOption === 'highToLow') {
            sortCriteria = { originalPrice: -1 };  // Sort by price descending
        } else if (sortOption === 'nameAsc') {
            sortCriteria = { name: 1 };  // Sort by name ascending
        } else if (sortOption === 'nameDesc') {
            sortCriteria = { name: -1 };  // Sort by name descending
        }

        // Construct the search query
        let query = { status: true };
        if (search.trim() !== "") {
            const words = search.trim().split(/\s+/);
            query.$and = words.map(word => ({
                $or: [
                    { name: { $regex: word, $options: 'i' } },
                    { description: { $regex: word, $options: 'i' } },
                    { brand: { $regex: word, $options: 'i' } }
                ]
            }));
        }

        // Add category filter to the query if a category is selected
        if (category) {
            query.category = category;
        }

        // Count the total number of documents that match the query
        const count = await productModel.countDocuments(query);
        const totalPages = Math.ceil(count / limit);

        // Find products based on query and sort criteria with pagination
        const products = await productModel.find(query)
            .sort(sortCriteria)
            .skip(skip)
            .limit(limit)
            .populate('category');

        // Render the shop page with the products, pagination, current sort option, and search query
        res.render("shop", {
            products,
            totalPages,
            currentPage,
            sortOption,
            search,
            selectedCategory: category  // Pass the selected category to the view
        });

    } catch (error) {
        console.log(error);
        res.status(500).send("An error occurred while rendering the shop page.");
    }
};



// *************************** Shop By Category
const shopByCategory = async(req,res)=>{
    try {
        const selectedCategoryId = req.query.category
        const count = await productModel.find({category:selectedCategoryId}).countDocuments({ status: true });
        if(count <8){
            currentPage =null
            totalPages = null
            sortOption = null
        }else{
 
        }
        const products =await productModel.find({category:selectedCategoryId}).populate('category')
        res.render("shop",{products,selectedCategoryId,currentPage,totalPages,sortOption})
    } catch (error) {
        console.log(error)
    }
}

// ********************************* Sort Low to high
const shopLowToHigh = async(req,res)=>{
    try {
        
        const count = await productModel.find().countDocuments({ status: true });
        if(count <8){
            currentPage =null
            totalPages = null
        }else{

        }
        const products = await productModel.find().sort({price:1})
        res.render("shop",{products,currentPage,totalPages})
    } catch (error) {
        console.log(error)
    }
}
//************************************* Sort High to Low
const shopHighToLow = async(req,res)=>{
    try {

        const products = await productModel.find().sort({price:-1})
        res.render("shop",{products,currentPage:null,totalPages:null})
    } catch (error) {
        
    }
}

//*********************************  Sort Ascending 
const shopAscending = async(req,res)=>{
    try {
        const count = await productModel.find().countDocuments({ status: true });
        if(count <8){
            currentPage =null
            totalPages = null
        }else{

        }
        const products = await productModel.find().sort({name:1})
        res.render("shop",{products,currentPage,totalPages})
    } catch (error) {
        
    }
}

// ***********************Sort Descending
const shopDescending = async(req,res)=>{
    try {
        const count = await productModel.find().countDocuments({ status: true });
        if(count <8){
            currentPage =null
            totalPages = null
        }else{

        }
        const products = await productModel.find().sort({name:-1})
        res.render("shop",{products,currentPage,totalPages})
    } catch (error) {
        
    }
}

// **************************** View Cart

const viewCart = async(req,res)=>{
    try {
        const user = req.user
        const cart = await cartModel.findOne({userId :user.id}).populate('items.productId')
        const coupon = await couponModel.find()
        if(!coupon) coupon=null
        res.status(200).render("cart",{cart,coupon})
    } catch (error) {
        console.log(error)
    }
}

//************************************* Add to cart
const addtoCart = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            console.log("No user");
            req.flash("error_msg", "Please login to add products to cart");
            return res.status(401).json({
                redirect: true,
                redirectUrl: "/login",
                message: "Please login to add products to cart"
            });
        }

        const { productid, productQty, productPrice } = req.body;
        const product = await productModel.findById(productid);
        let quantity = Math.min(productQty, product.quantity);

        const userId = user._id;
        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            cart = new cartModel({ userId, items: [] });
        }

        const productIndex = cart.items.findIndex(item => item.productId.toString() === productid);
        if (productIndex > -1) {
                cart.items[productIndex].quantity += quantity;
                if(cart.items[productIndex].quantity > product.quantity){
                    console.log(`cart quantity ${cart.items[productIndex].quantity}`)
                    --cart.items[productIndex].quantity
                }
        } else {
            cart.items.push({
                productId: productid,
                price: productPrice,
                quantity: quantity
            });
        }

        const addedtocart = await cart.save();
        if (addedtocart) {
            res.status(200).send({ message: "Product added to cart" });
        } else {
            res.status(500).send({ message: "Error adding product to cart" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server error" });
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

// **************************************Apply Coupon
const applyCoupon = async(req,res)=>{
    try {
        const user = req.user.id
        const code = req.params.code
        let discount=0
        const coupon = await couponModel.findOne({code})
        const cart = await cartModel.findOne({userId :user})
        
        if(coupon.discountType === 'amount'){
             discount = coupon.discountAmount
        }else{
            discount = cart.totalPrice * coupon.discountPercentage /100
        }
        cart.couponDiscount = discount
        coupon.used = coupon.used++
        cart.save()
        console.log(cart)

    } catch (error) {
        console.log(error)
    }
}

// ***********************Remove Coupon
const removeCoupon = async(req,res)=>{
   try {
    const user = req.user.id
    const cart = await cartModel.findOne({userId:user})
    cart.couponDiscount = 0
    cart.save()
   } catch (error) {
console.log(error)
   }
}


// ************************* Check Out
const checkout = async(req,res)=>{
    try {
        const user = req.user
        const cart = await cartModel.findOne({userId:user.id}).populate('items.productId')
        const wallet = await walletModel.findOne({user:user})
        if(wallet) walletBalance =wallet.balance
        else walletBalance = 0
        const paypalId = process.env.PAYPAL_ID
        if(!user) return res.render("home")
        res.render("checkout",{cart,paypalId,walletBalance})
        
       
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

const createPayPalOrder = async(req,res)=>{
    const user = req.user.id
    const cart = await cartModel.findOne({userId:user})
    let billAmount = cart.shippingTotal
    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: billAmount  
        }
      }]
    });
  
    try {
      const order = await client().execute(request);
      res.status(201).json({

        id: order.result.id
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  };

 
 
const placeOrder = async(req,res)=>{
    try {
        let discount =0
        let transactionId =''
        const userId = req.user.id
        const {cartId,paymentOption,deliveryAddress} = req.body
        const cart = await cartModel.findById(cartId).populate('items.productId')

        if(paymentOption == 'paypal') {
            transactionId = req.body.transactionId 
            paymentStatus ='paid'
        }else if(paymentOption == 'wallet'){
            console.log("wallet payment")
            paymentStatus ='paid'
            const shippingTotal = cart.shippingTotal
            const wallet = await walletModel.findOneAndUpdate(
                { user: userId },
                { $inc: { balance: -shippingTotal } },  
                { new: true }  
            );
             await wallet.save()

        }
        else {
            paymentStatus = 'pending'
        }
        const products = cart.items.map(item => ({
             
            productId:item.productId._id,
            productname: item.productId.name,
            price: item.productId.isDiscounted ?item.productId.offerPrice : item.productId.originalPrice , 
            quantity: item.quantity
          }));
         
          if(cart.couponDiscount)  discount = cart.couponDiscount
          const totalPrice = cart.totalPrice
          const shippingTotal =cart.shippingTotal
          const totalQuanity =cart.totalQuantity

        
        const Order = new orderModel({
            userId,cart:products,paymentOption,paymentStatus,deliveryAddress,totalPrice,totalQuanity,shippingTotal,discount,transactionId
        })
        const orderSuccess = await Order.save()
        //Update Stock
        const updateStock = async (products) => {
            try {
                for (let product of products) {
                       
                    await productModel.findByIdAndUpdate(product.productId, { $inc: { quantity: -product.quantity} });
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
        const orders = await orderModel.find({userId :userId}).populate('userId').populate('cart.productId').sort({createdAt:-1})
        console.log(orders)
        if(orders){
           return res.render("orderHistory",{orders})
        }
        res.render("orderHistory",{message:"No orders placed yet!"})
    } catch (error) {
        console.log(error)
    }

}

//Cancel Order

const cancelOrder = async (req, res) => {
    try {
        const user = req.user.id;
        const id = req.query.orderId;
        
        const orders = await orderModel.findById(id);
        if (orders.paymentStatus === 'paid') {
            const amount = orders.shippingTotal;
            console.log(`amount: ${amount}`);
            
            const existing_wallet = await walletModel.findOne({ user: user });
            if (existing_wallet) {
                let newBalance = existing_wallet.balance + amount; 
                existing_wallet.balance = newBalance;
                console.log("new balance added");
                await existing_wallet.save();
            } else {
                console.log("new wallet created");
                const wallet = new walletModel({
                    user,
                    balance: amount
                });
                await wallet.save();
                console.log(wallet);
            }
            
            orders.paymentStatus = 'refunded';
        }
        
        orders.orderStatus = 'canceled';
        await orders.save();
        
        // You might want to render all of the user's orders here
        const userOrders = await orderModel.find({ user: user });
        res.render("orderHistory", { orders: userOrders });
        
    } catch (error) {
        console.log(error);
        res.status(500).send("An error occurred while canceling the order.");
    }
};


// wishlist
const wishlist = async(req,res)=>{
    try {
        const userid = req.user.id
        const wishlist = await wishlistModel.findOne({user:userid}).populate('products')
        if(wishlist){
            return res.render("wishlist",{wishlistItems : wishlist.products})
        }else
        res.render("wishlist",{wishlistItems:null})
        
    } catch (error) {
        console.log(error)
    }
}

// Add to wishlist

const addtoWishlist = async(req,res)=>{
    try {
        
        const productId = req.body.productId
        if(!req.user){
            console.log("No user");
            req.flash("error_msg", "Please login to wishlist");
            return res.status(401).json({
                redirect: true,
                redirectUrl: "/login",
                message: "Please login to wishlist"
            });
        } 
        const user = req.user.id
        const existing_wishlist = await wishlistModel.findOne({user:user})
        if(existing_wishlist) {
            const productexist = existing_wishlist.products.includes(productId)
            if(!productexist) {
                existing_wishlist.products.push(productId)
                await existing_wishlist.save();
            }
            
        }else{
            const wishlist = new wishlistModel({user,products:[productId]})
            await wishlist.save();
        }
        res.status(200).send({message:"added to wishlist"})

    } catch (error) {
        console.log(error)
        res.status(500).send({message:error.message})

    }
}

const removefromWishlist = async(req,res)=>{
    try{
        const user = req.user.id
        const productId = req.query.product
        const wishlist = await wishlistModel.findOne({user})
        if(wishlist){
           if(wishlist.products.includes(productId)) {
            wishlist.products.pull(productId)
            await wishlist.save()
           }
        }
        res.status(200).send({message :"removed from wishlist"})
    }catch(error){
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
    applyCoupon,
    removeCoupon,
    checkout,
    checkoutAddress,
    createPayPalOrder,
    placeOrder,
    confirmOrder,
    orders,
    cancelOrder,
    wishlist,
    addtoWishlist,
    removefromWishlist
   
}

