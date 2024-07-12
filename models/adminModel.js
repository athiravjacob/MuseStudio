const mongoose = require('../config/dbConfig')

const adminSchema =new mongoose.Schema ({
    adminId:{
        type:String
    },
    password:{
        type:String
    }
})

const adminModel = mongoose.model('admin',adminSchema)
module.exports = adminModel