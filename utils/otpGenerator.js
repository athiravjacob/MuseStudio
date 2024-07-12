const otpGenerator = require('otp-generator')

const generateOTP = () => {
    return otpGenerator.generate(4, { lowerCaseAlphabetsCaseAlphabets: false, specialChars: false });
    
};
 
module.exports = {generateOTP}