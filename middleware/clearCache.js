const clearCache = async(req,res,next)=>{
    try {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        next()
        
    } catch (error) {
        console.log(error.message)
    }
}
module.exports = {clearCache}