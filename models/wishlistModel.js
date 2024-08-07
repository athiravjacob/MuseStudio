const mongoose = require('../config/dbConfig')
const  wishList = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    products:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'product'

    }]
})

const wishlistModel = mongoose.model('wishlist',wishList)
module.exports = wishlistModel