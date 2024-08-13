const mongoose = require('../config/dbConfig')

// Define the user schema
const productSchema = new mongoose.Schema({
    name: {
        type:String,
        required:true
    },
    description:{
        type:String
    },
    brand:{
        type:String
    },
    category:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:'category'
    }],
    material:{
        type:String
    },
    price:{
        type:Number
    },
    quantity:{
        type:Number
    },
    images:[{type:String}],
    status:{
        type:Boolean,
        default:true
    }
})
productSchema.pre('save', function(next) {
    if (this.quantity < 0) {
        this.quantity = 0;
    }
    next();
});
const productModel = mongoose.model('product',productSchema)
module.exports=productModel