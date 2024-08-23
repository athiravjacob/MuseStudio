



const authenticate = async(req,res,next)=>{
    if(req.isAuthenticated()){
        return next()
    }
    res.redirect('/login')
}

const logout = async(req,res,next)=>{
    req.logout((error)=>{
        if(error){
            return next(error)
        }
        res.redirect("/login")
    })
}

const userStatus = async (req, res, next) => {
    try {
        if(req.user && req.user.blocked){
            req.logout((error)=>{
                if(error) return next(error)
                req.flash("error_msg","your are blocked by the admin")
                return res.render("login")
            })
        }
        else next()
      

    } catch (error) {
        console.log(error)
    }
  };
  
module.exports={
    authenticate,
    logout,
    userStatus}







// const {verifyToken}=require('../utils/jwt')

// const authenticate =(req,res,next)=>{
//     const authHeader = req.headers['authorization']
//     if(!authHeader){
//         console.log("access denied")
//         return  res.status(401).send('Access denied. No token provided.');
//     }
//     const token = authHeader.split(' ')[1];
//     if (!token) return res.status(401).send('Access denied. No token provided.');

//   try {
//     const decoded = verifyToken(token)
//     req.user = decoded;
//     next();
//   } catch (error) {
//     res.status(400).send('Invalid token');
//   }
// }
// module.exports = authenticate