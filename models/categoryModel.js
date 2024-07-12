const mongoose = require('../config/dbConfig')
const  categorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true

    },
    description:{
        type:String,
        trim:true
    },
    status:{
        type:Boolean,
        default:true
    }
})

const categoryModel = mongoose.model('category',categorySchema)
module.exports = categoryModel