const express = require('express')
const adminRoute = express()
const passport = require('passport')
require('../config/passportConfig')
const upload = require('../utils/uploadImages')
const {authenticateAdmin} = require('../middleware/admin_auth')
const {clearCache} = require('../middleware/clearCache')


adminRoute.set('view engine','ejs')
adminRoute.set('views','./views/admin')


const adminController = require('../controllers/adminController')

adminRoute.get("/",adminController.loadLogin)
adminRoute.post("/",adminController.verifyAdmin)
adminRoute.get('/dashboard',authenticateAdmin,clearCache,adminController.loadDashboard)

adminRoute.get('/customers',authenticateAdmin,clearCache,adminController.loadCustomers)
adminRoute.get('/customers/unblock/:id',authenticateAdmin,clearCache,adminController.unblockCustomer)
adminRoute.get('/customers/block/:id',clearCache,authenticateAdmin,adminController.blockCustomer)

adminRoute.get('/category',authenticateAdmin,clearCache,adminController.loadCategory)
adminRoute.post('/category/addCategory',adminController.addCategory)
adminRoute.patch('/category/delete/:id',adminController.deleteRestoreCategory)
adminRoute.put('/category/edit/:id',adminController.editCategory)

adminRoute.get('/products',authenticateAdmin,clearCache,adminController.loadProducts)
adminRoute.get('/products/addProduct',authenticateAdmin,clearCache,authenticateAdmin,adminController.loadaddProduct)
adminRoute.post('/products/addProduct',upload.array('images',5),adminController.addProduct)
adminRoute.get('/products/edit/:id',authenticateAdmin,clearCache,adminController.loadeditProduct)
adminRoute.patch('/products/edit/:id',adminController.editProduct)
adminRoute.delete('/products/edit/remove-image/:id',adminController.removeImage)
adminRoute.patch('/products/edit/save-image/:id',upload.array('images',3),adminController.saveProductimage)
adminRoute.put('/products/delete/:id',adminController.deleteRestoreProduct)

adminRoute.get('/brand',authenticateAdmin,clearCache,adminController.loadBrand)
adminRoute.post('/brand/addBrand',upload.single('brand-image'),adminController.addBrand)

adminRoute.get('/logout',authenticateAdmin,clearCache,adminController.logout)


module.exports = adminRoute