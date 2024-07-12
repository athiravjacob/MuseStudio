const mongoose = require('../config/dbConfig')
const  brandSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true

    },
    image:{
        type:String,
    },
    status:{
        type:Boolean,
        default:true
    },
    slug:{
        type:String
    }
})

const brandModel = mongoose.model('brand',brandSchema)
module.exports = brandModel