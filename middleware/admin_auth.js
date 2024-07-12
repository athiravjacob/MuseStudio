require('../models/adminModel')
const authenticateAdmin = async(req,res,next)=>{
    if(req.session.admin){
        next()
    }
    else {
        req.flash("error_msg","Please Login")
        res.redirect("/admin")
   }
}

module.exports ={ authenticateAdmin}
   