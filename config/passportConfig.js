const LocalStrategy = require('passport-local').Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy
const passport = require('passport')
const bcrypt = require('bcrypt')
const userModel = require('../models/userModel')
const adminModel = require('../models/adminModel')
require('dotenv').config()

module.exports = function(passport){
    passport.use(new LocalStrategy({usernameField:'email'},async(email,password,done)=>{
        try {
            console.log("from passport")
            const user = await userModel.findOne({email})
            if(!user) return done(null, false, {message:"You have entered an invalid email"})
            if(user.blocked) return done(null,false,{message:"OOps!You have been blocked by the admin"})
            const passMatch = await bcrypt.compare(password,user.password)
            if(user){
                if(!passMatch) return done(null , false,{message:"Please check your password"})
            }
            
            return done(null, user)
        } catch (error) {
            return done(error)
            
        }
    }))



    passport.use(new GoogleStrategy({
        clientID:process.env.CLIENT_ID,
        clientSecret:process.env.CLIENT_SECRET,
        callbackURL:"/auth/google/callback"
    },async(token,tokenSecret,profile,done)=>{
        try {
            let user = await userModel.findOne({googleID:profile.id})
            const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
            if(!user){
                user = await UserModel.create({
                    username:profile.displayName,
                    googleID:profile.id,
                    isGoogleUser:true,
                    email:email
                })
            }
            return done(null,user)
        } catch (error) {
            console.log(error)
            return done(error)
        }

    }
    
    ))


    passport.serializeUser((user,done)=>{
        done(null,user.id)
    })

    passport.deserializeUser(async(id,done)=>{
        try {
            const user = await userModel.findById(id)
            done(null,user)
        } catch (error) {
            done(error)
        }
    })
}