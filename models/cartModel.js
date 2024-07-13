const mongoose = require('../config/dbConfig')

const itemSchema = new mongoose.Schema({
    productId : {
        type: mongoose.Schema.Types.ObjectId,
        ref :'product',
        required:true
    },
    price : {
        type: Number,
        required : true
    },
    quantity :{ 
        type : Number,
        required:  true,
        default:1,
        min:1,
        max:5
    }
    
})

const cartSchema = new mongoose.Schema({
    userId :{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required :true
    },
    items : [itemSchema],
    totalPrice :{
        type :Number,
        default :0
    },
    totalQuantity : {
        type : Number,
        default :0
        }

})

cartSchema.pre('save', function(next){
    this.totalPrice = this.items.reduce((acc,item)=> acc + item.price * item.quantity ,0)
    this.totalQuantity = this.items.reduce((acc,item)=> acc + item.quantity ,0)
    next()
})
const cartModel = mongoose.model('cart',cartSchema)
module.exports = cartModel