const nodemailer = require('nodemailer')
require('dotenv').config()

const transporter = nodemailer.createTransport({
    service:"Gmail",
    auth:{
        user:process.env.EMAIL,
        pass:process.env.EMAIL_PASSWORD
    }
})

const sendEMail = async (to,subject,text)=>{
    try {
        await transporter.sendMail ({
            from:process.env.EMAIL,
            to,
            subject,
            text
        })
    } catch (error) {
        console.log(error)
    }
}


module.exports = {sendEMail}