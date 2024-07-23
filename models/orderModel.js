const mongoose = require('../config/dbConfig')

const orderSchema = new mongoose.Schema({
    userId :{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required:true
    },
    cart :[{
        productId :mongoose.Schema.Types.ObjectId,
        productname: String,
        price:Number,
        quantity:Number 
    }
    ],
    paymentOption:{
        type:String
    },
    paymentStatus :{
        type:String,
        enum :['pending','paid','refunded'],
        default :'pending'
    },
    orderStatus :{
        type:String,
        enum :['processing','canceled','delivered'],
        default:'processing'  
      },
      totalPrice:Number,
      totalQuanity:Number,
      
    deliveryAddress:{
        type:String,
        required:true
    }},
    {timestamps :true}

)

const orderModel = mongoose.model('order',orderSchema)
module.exports = orderModel