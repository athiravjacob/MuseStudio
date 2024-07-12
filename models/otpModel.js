const mongoose = require('../config/dbConfig')

const otpSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true
    },
    otp:{
        type:String
    },
   createdAt:{
        type:Date,
        default:Date.now,
        
    }
})

const OtpModel = mongoose.model('Otp',otpSchema)
module.exports = OtpModel