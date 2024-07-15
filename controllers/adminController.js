const userModel = require('../models/userModel')
const categoryModel = require('../models/categoryModel')
const productModel = require('../models/productModel')
const adminModel = require('../models/adminModel')
require('dotenv').config()


// **********************Load Login page
const loadLogin = async (req,res)=>{
  try {
    res.render('adminLogin')
  } catch (error) {
    req.flash("error_msg","Error loading login page")
    console.log(error)
  }

}
//****************** Verify Admin
const verifyAdmin = async (req, res)=>{
  try {
    const {adminId ,password} = req.body
    const admin = await adminModel.findOne({adminId})
    if(!admin){
      return res.render("/admin",{"error_msg":"Invalid username"})
    }
    else{
      if(password !== admin.password){
        return res.render("/admin",{"error_msg":"Invalid password"})
      }
      else{
        req.session.admin = admin._id
        res.render("dashboard")
      }
    }
  } catch (error) {
    console.log(error)
  }
}
// ************************Dashboard
const loadDashboard = async (req, res) => {
    try {
      res.render("dashboard");
    } catch (error) {
      req.flash("error_msg","Error loading Dashboard")
      console.log(error.message);
    }
  };
  // ************************** View Customers
  const loadCustomers = async (req, res) => {
    try {
      const customer = await userModel.find()
      res.render("customers",{customer:customer});
    } catch (error) {
      console.log(error.message);
    }
  };
  // ************************** Block Customer
const blockCustomer = async(req,res) =>{
  try {
    const id = req.params.id
    await userModel.findByIdAndUpdate(id,{blocked:true},{new:true})
    res.redirect('/admin/customers')
  } catch (error) {
    
  }
}
//  ************************** Unblock Customer
const unblockCustomer = async(req,res) =>{
  try {
    const id = req.params.id
    console.log(id)
    await userModel.findByIdAndUpdate(id,{blocked:false},{new:true})
    res.redirect('/admin/customers')
    
  } catch (error) {
    
  }
}

// ******************** Category
const loadCategory = async(req,res)=>{
  try {
    const category = await categoryModel.find()
    res.render('categories',{category:category})
    
  } catch (error) {
    console.log(error)
  }
}

// *************************** Add Category
const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if the category already exists
    const existingCategory = await categoryModel.findOne({ name });
    if (existingCategory) {
      req.flash("error_msg", "Category already exists");
      console.log("Category already exists");
      return res.redirect('/admin/category')
    }

    // Create a new category
    const newCategory = new categoryModel({ name, description });
    const categoryAdded = await newCategory.save();

    if (categoryAdded) {
      req.flash("success_msg", "New Category added");
      return res.redirect('/admin/category')

    } else {
      req.flash("error_msg", "Unable to save new category");
      console.log("Unable to save new category");
    }
  } catch (error) {
    req.flash("error_msg", "Oops! Error while creating new category");
    console.log(error.message);
  }
}
// ********************* Edit Category
const editCategory = async(req,res)=>{
  try {
   const {name,description }= req.body
   const id = req.params.id

   const category = await categoryModel.findByIdAndUpdate(id,{name,description},{new:true})
   if (category) {
    req.flash("success_msg","Category updated successfully")
    res.status(200).json({ success: true, data: category });
  } else {
    req.flash("error_msg","There was some error ")
    res.status(404).json({ success: false, message: 'Category not found' });
  }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Network error while updating category' });

  }
}

// ********************* Delete and restore Category
const deleteRestoreCategory = async(req,res)=>{
  try {
    const id = req.params.id
    const category = await categoryModel.findById(id)
    console.log()
    if(category.status){
      const deleteCat=await categoryModel.findByIdAndUpdate(id,{status:false},{new:true}) 
      if(deleteCat){
        res.status(200).send({ message: 'Category deleted' });
      }
      else{
        res.status(404).send({ message: 'Category not found' });
  
      }  
    }
    else{
      const restoreCat = await categoryModel.findByIdAndUpdate(id,{status:true},{new:true})
      if(restoreCat){
        res.status(200).send({message:'Category Restored'})
      }else{
        res.status(404).send({message:'category not found'})
      }
    }
    

  } catch (error) {
    req.flash("error_msg", "Oops! Error while deleting category");
    console.log(error.message);
  }

}

const loadBrand = async(req,res)=>{
  try {
    res.render('brand')
  } catch (error) {
    
  }
}
const addBrand= async(req,res)=>{
  try {
    console.log(req.body)
    console.log(req.file.filename)
  } catch (error) {
    
  }
}

// *********************** load Products
const loadProducts = async(req,res)=>{
  try {
    const product = await productModel.find()
    if(product){
      res.render('product',{product:product})
    }
    else{
      console.log("error loading product list")
    }
  } catch (error) {
    console.log(error)
  }
}

// Add Product page
const loadaddProduct = async(req,res)=>{
  try {
    const category = await categoryModel.find()
    res.render('addProduct',{category:category})
  } catch (error) {
    console.log(error)
  }
}

// ******************* Add new Product
const addProduct = async(req,res)=>{
  try {
    console.log(req.body)
    const{name,description,brand,category,material,price,quantity} = req.body
    const categoryId = await categoryModel.find({name:category}).select('_id')
    const imagePath = req.files.map(file =>file.path.replace(/\\/g, '/'))
    console.log(imagePath)
    let product = new productModel({
      name,
      description,
      brand,
      material,
      category:categoryId,
      price,
      quantity,
      images:imagePath
    })
    let productSave = await product.save()
    if(productSave){
      console.log("product saved")
      res.status(200).json({ success: true});
    }
    else{
      res.status(400).json({ success: false});
    }

  } catch (error) {
    res.status(500).json({ success: false });
  }
}
// ******************* View Edit Product page
const loadeditProduct = async(req,res)=>{
  try {
    const id = req.params.id
    const product = await productModel.findById(id).populate('category')
    res.render("editProduct",{product})
  } catch (error) {
    
  }
}
// *************************** Edit Product Details
const editProduct = async(req,res)=>{
  try {
    const id = req.params.id
    const {name,description,category,brand,material,price,quantity} = req.body
    const product = await productModel.findById(id)
   if(product){
    console.log("inside edit")
    const update = await productModel.findByIdAndUpdate(id,{name,description,category,brand,material,price,quantity},{new:true})
     if(update) {
      req.flash("success_msg","Product details updated")
      console.log("product updated");
      res.status(200)
      } 
    else{
      req.flash("error_msg","Error updating")
      res.status(400).send({message:"Error updating"})  

    }  
   }
  } catch (error) {
    console.log(error);
    res.status(500).send({message:"network error"})
  }
}
//*************************** Remove Image in edit product
const removeImage = async(req,res)=>{
  try {
    const id = req.params.id
    const image = req.body.image
    console.log(`remove image ${image}`)
    const product = await productModel.findOne({_id:id})
    if(!product) res.status(404).json({message:"Product not found"})
    product.images = product.images.filter(img => img !== image);
    await product.save();
    res.status(200).json({ message: 'Image removed successfully', product });

  } catch (error) {
    console.log(error)
  }
}
 // *************************** add new image in edit product
const saveProductimage = async(req,res)=>{
  try {
    const id = req.params.id
    console.log("save image")
    const imagePaths = req.files.map(file => file.path);
    const product = await productModel.findByIdAndUpdate(id,{
      $push :{images:{$each:imagePaths}}
    },{new:true})
    if(!product){
      res.status(400).json({message:"No Product available"})
    }else{
      res.status(200).json({message: "Image uploaded"})
    }
  } catch (error) {
    console.log(error)
  }
}

//*******************************  Delete restore product
const deleteRestoreProduct = async(req,res)=>{
  try {
    const id = req.params.id
    console.log(id)
  const product = await productModel.findOne({_id:id})
  if(product.status){
    console.log("product found")
    const deleteProduct = await productModel.findByIdAndUpdate(id,{status:false},{new:true})
    if(deleteProduct ){
      res.status(200).json({success:true})
    }else{
      res.status(400).json({success:false})
    }
  }
  
  else{
    const restoreProduct = await productModel.findByIdAndUpdate(id,{status:true},{new:true})
    if(restoreProduct ){
      console.log("restore product")
      res.status(200).json({success:true})
    }else{
      res.status(400).json({success:false})
    }
  }
  } catch (error) {
    console.log(error)
    res.status(500).json({success:false},{message:"Error dur to some network issue "})
  }
 
}
// Admin logout
const logout = async(req,res)=>{
  try {
      req.session.destroy();
      res.redirect("/admin/");
    } catch (error) {
      console.log(error.message);
    }
}

module.exports ={
  loadLogin,
  verifyAdmin,
  loadDashboard,
  loadCustomers,
  blockCustomer,
  unblockCustomer,
  loadCategory,
  addCategory,
  editCategory,
  deleteRestoreCategory,
  loadBrand,
  addBrand,
  loadProducts,
  loadaddProduct,
  addProduct,
  loadeditProduct,
  editProduct,
  removeImage,
  saveProductimage,
  deleteRestoreProduct,
  logout
}