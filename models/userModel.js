const mongoose = require('../config/dbConfig')

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
    }

  });

const UserModel = mongoose.model('User',userSchema)
module.exports = UserModel