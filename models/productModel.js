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
    originalPrice:Number,
    offerPrice :Number,
    offerPercentage: Number,
    quantity:{
        type:Number
    },
    images:[{type:String}],
    status:{
        type:Boolean,
        default:true
    },offerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'offer',
        default: null
    },
    isDiscounted: {
        type: Boolean,
        default: false
    }
})
productSchema.pre('save', function(next) {
    if (this.offerId ) {
        this.offerPrice =this.originalPrice-(this.originalPrice * this.offerPercentage/100)
    } else {
        this.offerPrice = 0;
    }
    next();
});
const productModel = mongoose.model('product',productSchema)
module.exports=productModel