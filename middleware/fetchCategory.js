const category = require('../models/categoryModel')
const cart = require('../models/cartModel')

const fetchCategory = async(req,res,next)=>{
    try {
        res.locals.category = await category.find().lean()
        next()
    } catch (error) {
        console.log(error)
        res.locals.category =[]
        next(error)
    }
}

module.exports = fetchCategory