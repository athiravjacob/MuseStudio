const mongoose = require('../config/dbConfig')

const addressSchema = new mongoose.Schema({
 
  address:{
    type:String,
    required:true
  },
  city:{
    type:String
  },
  state:{
    type:String
  },
  pincode :{
    type:String
  },
  isDefault :{
    type: Boolean,
    default :false

  }
})



// Define the user schema
const userSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/.+\@.+\..+/, 'Please fill a valid email address'],
    },
    phone: {
      type: String,
      
      trim: true,
      match: [/^\d{10}$/, 'Please fill a valid phone number'],
    },
    password: {
      type: String,
    },
    googleID:{
      type:String
    },
    isGoogleUser:{
      type:Boolean,
      default:false
    },
    blocked:{
      type:Boolean,
      default:false
    },
    address :[addressSchema],
    DOB: {type:Date}

  },{
    timestamps:true
  });

const UserModel = mongoose.model('User',userSchema)
module.exports = UserModel