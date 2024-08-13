const mongoose = require('../config/dbConfig')
const  wallet = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    balance :{
        type:Number,
        default :0
    }
})

const walletModel = mongoose.model('wallet',wallet)
module.exports = walletModel