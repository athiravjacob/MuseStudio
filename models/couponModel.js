const mongoose = require('../config/dbConfig')

const couponSchema = new mongoose.Schema({
    code:{
        type:String,
        required:true
    },
    discountType:{
        type:String,
        enum:['amount','percentage'],
        required:true
    },
    discountAmount:{
        type:Number,
    },
    discountPercentage :{
        type:Number,
    },
    expiresAt:Date,
    useageLimit : {
        type:Number,
        default:1
    },
    used:{
        type:Number,
        default:0
    },
    min_purchase_amount : Number,
    max_discount : Number,
    isActive:{
        type:Boolean,
        default:true

    },
    description :String},
    {
        timestamps :true
    
    }
)

const couponModel = mongoose.model('coupon',couponSchema)
module.exports = couponModel