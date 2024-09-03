const userModel = require('../models/userModel')
const categoryModel = require('../models/categoryModel')
const productModel = require('../models/productModel')
const adminModel = require('../models/adminModel')
const orderModel = require('../models/orderModel')
const couponModel = require('../models/couponModel')
const PDFDocument  = require('pdfkit')
const OfferModel = require('../models/offerModel')
const moment = require('moment-timezone');

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
      return res.render("adminLogin",{"error_msg":"Invalid username"})
    }
    else{
      if(password !== admin.password){
        return res.render("adminLogin",{"error_msg":"Invalid password"})
      }
      else{
        req.session.admin = admin._id
        res.redirect("/admin/dashboard")
      }
    }
  } catch (error) {
    console.log(error)
  }
}


const generateSalesReport = async (startDate, endDate) => {
  try {
    let matchQuery = { orderStatus: { $ne: 'canceled' } };
    if (startDate && endDate) {
      matchQuery.createdAt = { $gte: startDate, $lte: endDate };
    }

    // Sales count
    const salesCount = await orderModel.find(matchQuery).countDocuments();

    // Sales Amount
    const salesAmountResult = await orderModel.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const totalSalesAmount = salesAmountResult.length > 0 ? salesAmountResult[0].total : 0;

    // Discount
    const discountResult = await orderModel.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, totalDiscount: { $sum: '$discount' } } }
    ]);
    const totDiscount = discountResult.length > 0 ? discountResult[0].totalDiscount : 0;

    // Sales report
    const sales = await orderModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalOrders: { $sum: 1 },
          grossSales: { $sum: '$totalPrice' },
          couponDiscount: { $sum: '$discount' }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          totalOrders: 1,
          grossSales: 1,
          couponDiscount: 1
        }
      }
    ]);

    return {
      salesCount,
      totalSalesAmount,
      totDiscount,
      sales
    };
  } catch (error) {
    console.log(error);
  }
};
const loadDashboard = async(req,res)=>{
  try {
      // Total Revenue
      const revenue = await orderModel.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } }
      ]);
      let totalRevenue = revenue[0].totalRevenue

      // Total Orders
      const orders = await orderModel.aggregate([
        {$match: {$nor: [{ orderStatus: "canceled" },{ orderStatus: "returned" }]}},
        {$group: {_id: null,count: { $sum: 1 }}}])             
      let totalOrders = orders[0].count

      // Total Products
      const totalProducts = await productModel.countDocuments()

       // Total Discount
       const dis = await orderModel.aggregate([
        {$match: {orderStatus :{$ne:'canceled'}}},
        {$group: {_id: null,totalDiscount: { $sum: '$discount' }}}
      ])
      const discount = dis[0].totalDiscount

      // new users
      const users = await userModel.find().sort({createdAt:-1}).limit(3)

      // Best selling Products
      const result = await orderModel.aggregate([
        { $unwind: "$cart" },
        {
            $group: {
                _id: "$cart.productId",
                totalQuantitySold: { $sum: "$cart.quantity" }
            }
        },
        { $sort: { totalQuantitySold: -1 } },
        { $limit: 5 }
    ]);
    let bestProducts = [];
    if (result.length > 0) {
        bestProducts = await Promise.all(result.map(async (product) => {
            const productDetails = await productModel.findById(product._id).select('name');
            return {
                productId: product._id,
                productName: productDetails ? productDetails.name : 'Unknown Product',
                totalQuantitySold: product.totalQuantitySold
            };
        }));
    }
    
  /***********  Sales Data for today
   
   Setting timezone to get correct hours 
   Then find starting and ending hours of current date
   Aggregate from orderModel to find matching orders placed between start and end hours
   group each orders by hours 
   
   ****************************/
  
    moment.tz.setDefault("Your/Timezone");
    const startOfDay = moment().startOf('day').toDate();
    const endOfDay = moment().endOf('day').toDate();

    const todaySales = await orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: { 
            hour: { 
              $hour: {
                $add: [
                  "$createdAt",
                  { $multiply: [1000 * 60 * 60, moment().utcOffset() / 60] }
                ]
              } 
            } 
          },
          totalSalesToday: { $sum: "$shippingTotal" }
        }
      },
      {
        $sort: { "_id.hour": 1 }
      },
      {
        $project: {
          _id: 0,
          timeRange: {
            $concat: [
              { $toString: "$_id.hour" }, ":00 - ",
              { $toString: { $add: ["$_id.hour", 1] } }, ":00"
            ]
          },
          totalSalesToday: 1
        }
      }
    ]);


    const startOfWeek = moment().startOf('week').toDate();
    const endOfWeek = moment().endOf('week').toDate();

    const weekSales = await orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek, $lte: endOfWeek }
        }
      },
      {
        $group: {
          _id: { 
            dayOfWeek: { 
              $dayOfWeek: {
                $add: [
                  "$createdAt",
                  { $multiply: [1000 * 60 * 60, moment().utcOffset() / 60] }
                ]
              } 
            }
          },
          totalSales: { $sum: "$shippingTotal" }
        }
      },
      {
        $sort: { "_id.dayOfWeek": 1 }
      },
      {
        $project: {
          _id: 0,
          day: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id.dayOfWeek", 1] }, then: "Sunday" },
                { case: { $eq: ["$_id.dayOfWeek", 2] }, then: "Monday" },
                { case: { $eq: ["$_id.dayOfWeek", 3] }, then: "Tuesday" },
                { case: { $eq: ["$_id.dayOfWeek", 4] }, then: "Wednesday" },
                { case: { $eq: ["$_id.dayOfWeek", 5] }, then: "Thursday" },
                { case: { $eq: ["$_id.dayOfWeek", 6] }, then: "Friday" },
                { case: { $eq: ["$_id.dayOfWeek", 7] }, then: "Saturday" }
              ],
              default: "Unknown"
            }
          },
          totalSales: 1
        }
      }
    ]);

    

/**
 * Sales This month
 * 
 */


// Get the start and end of the current month
const startMonth = moment().subtract(1, 'months').startOf('month').toDate();
const endMonth = moment().subtract(1, 'months').endOf('month').toDate();

const monthSales = await orderModel.aggregate([
  
  {
    $group: {
      _id: { 
        week: { 
          $floor: {
            $divide: [
              { $subtract: [
                { $dayOfMonth: {
                  $add: [
                    "$createdAt",
                    { $multiply: [1000 * 60 * 60, moment().utcOffset() / 60] }
                  ]
                }},
                1
              ]},
              7
            ]
          }
        }
      },
      totalSales: { $sum: "$shippingTotal" }
    }
  },
  {
    $sort: { "_id.week": 1 }
  },
  {
    $project: {
      _id: 0,
      week: { $add: ["$_id.week", 1] },
      totalSales: 1
    }
  }
]);

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const chartData = {
  today: {
    labels: todaySales.map(sale => `${sale.timeRange}:00`),
    data: todaySales.map(sale => sale.totalSalesToday)
  },
  week: {
    labels: weekDays,
    data: weekDays.map(day => {
      const sale = weekSales.find(s => s.day === day);
      return sale ? sale.totalSales : 0;
    })
  },
  month: {
    labels: monthSales.map(sale => `Week ${sale.week}`),
    data: monthSales.map(sale => sale.totalSales)
  }
};


   //place copied sales chart here
    // Sales Data Chart
    const startOfMonth = moment().startOf('month').toDate();
    const endOfMonth = moment().endOf('month').toDate();

    // sales Count
    const salesCount = await orderModel.aggregate([
        {
            $group: {
                _id: {
                    week: { $week: "$createdAt" }
                },
                totalOrders: { $sum: 1 }
            }
        },
        {
            $sort: { "_id.week": 1 } // Sort by week number
        }
    ]);
    // Paid Count
    const weeklypaidOrders = await orderModel.aggregate([
      {
          $match: {
             
              paymentStatus : 'paid'
          }
      },
      {
          $group: {
              _id: {
                  week: { $week: "$createdAt" }
              },
              totalOrders: { $sum: 1 }
          }
      },
      {
          $sort: { "_id.week": 1 } // Sort by week number
      }
  ]);
      // Payment pending Count
      const pendingOrders = await orderModel.aggregate([
        {
            $match: {
                
                paymentStatus : 'pending'
            }
        },
        {
            $group: {
                _id: {
                    week: { $week: "$createdAt" }
                },
                totalOrders: { $sum: 1 }
            }
        },
        {
            $sort: { "_id.week": 1 } // Sort by week number
        }
    ]);
    console.log(chartData)

      res.render("dashboard",{
        revenue:totalRevenue,
        totalProducts,
        totalOrders,
        discount,users,
        bestProducts,
        salesCount,
        weeklypaidOrders,
        pendingOrders,
        chartData
        
      })
  } catch (error) {
    console.log(error)
  }
}


// ************************Sales Report
const salesReport = async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
      const endDate = req.query.endDate ? new Date(req.query.endDate + 'T23:59:59.999Z') : null;
      const {search} = req.query
      let options = { year: 'numeric', month: 'short', day: 'numeric' };
      let heading = "Sales Report"
      if(search == 'week') heading = "Sales Report For This Week"
      if(search == 'today') heading = "Sales Report For Today"
      if(search == 'month') heading = "Sales Report For This Month"
      if(search ==  '' && startDate && endDate){
        heading = `Sales Report from ${startDate.toLocaleDateString('en-US', options)} to ${endDate.toLocaleDateString('en-US', options)}`
      }

      const {salesCount,totalSalesAmount,totDiscount,sales} =await generateSalesReport(startDate,endDate)

         
      if (salesCount === 0) {
        // No orders found for the given period
        return res.render("report", {
          salesCount: 0,
          totalSalesAmount: 0,
          totDiscount: 0,
          sales: [],
          heading,
          noOrders: true,
          message: "No orders found for the selected period."
        });
      }

     
      console.log(sales)

      res.render("report",{
        salesCount,
        totalSalesAmount,
        totDiscount,
        sales, heading
      })


        } catch (error) {
          req.flash("error_msg","Error loading report")
          console.log(error.message);
        }
      }





  // ************************** View Customers
  const loadCustomers = async (req, res) => {
    try {
      const count = await userModel.countDocuments();
        const currentPage = req.query.pageno || 1
        const limit = 8
        const skip = (currentPage - 1) * limit
        const totalPages = Math.ceil(count/limit)

        const customer = await userModel.find().skip(skip).limit(limit)
      res.render("customers",{customer,totalPages,currentPage});
    } catch (error) {
      console.log(error);
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
    const count = await categoryModel.countDocuments();
    const currentPage = req.query.pageno || 1
    const limit = 8
    const skip = (currentPage - 1) * limit
    const totalPages = Math.ceil(count/limit)
    const category = await categoryModel.find().skip(skip).limit(limit)
    res.render('categories',{category,currentPage,totalPages})
    
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

// ********************************************************************* Delete and restore Category
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

// *********************************************************** load Products
const loadProducts = async(req,res)=>{
  try {
    const count = await productModel.countDocuments();
    const currentPage = req.query.pageno || 1
    const limit = 8
    const skip = (currentPage - 1) * limit
    const totalPages = Math.ceil(count/limit)
    const product = await productModel.find().skip(skip).limit(limit)
    if(product){
      res.render('product',{product,totalPages,currentPage})
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


// ************************************************************* Add new Product

const addProduct = async(req,res)=>{
  try {
    const{name,description,brand,category,material,price,quantity} = req.body
    const categoryId = await categoryModel.find({name:category}).select('_id')
    const imagePath = req.files.map(file =>file.path.replace(/\\/g, '/'))
   

    let product = new productModel({
      name,
      description,
      brand,
      material,
      category:categoryId,
      originalPrice:price,
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

// ************************************************************ View Edit Product page

const loadeditProduct = async(req,res)=>{
  try {
    const id = req.params.id
    const product = await productModel.findById(id).populate('category')
    res.render("editProduct",{product})
  } catch (error) {
    
  }
}
// *********************************************************** Edit Product Details
const editProduct = async(req,res)=>{
  try {
    const id = req.params.id
    const {name,description,category,brand,material,price,quantity} = req.body
   
     if(price <=0 ){
      req.flash('error_msg',"Price should be greater than 0")
       return res.redirect(`/admin/products/edit/${id}`)
    }else if(quantity <0){
      req.flash('error_msg',"Quantity cannot be less than 0")
      return res.redirect(`/admin/products/edit/${id}`)

    }
   
    const product = await productModel.findById(id)
   if(product){
    console.log("inside edit")
    const update = await productModel.findByIdAndUpdate(id,
      {name,
        description,
        category,
        brand,
        material,
        originalPrice:price,
        quantity},
        {new:true})
     if(update) {
      req.flash("success_msg","Product details updated")
      console.log("product updated");
      return  res.redirect(`/admin/products`)
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
//********************************************************************* Remove Image in edit product
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
 // ***************************************************************** add new image in edit product
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

//*************************************************************************  Delete restore product
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
      res.redirect("/admin");
    } catch (error) {
      console.log(error.message);
    }
}

// View Orders
const viewOrders = async(req,res)=>{
  try {
    
      const count = await orderModel.countDocuments();
      const currentPage = req.query.pageno || 1
      const limit = 8
      const skip = (currentPage - 1) * limit
      const totalPages = Math.ceil(count/limit)
    const orders = await orderModel.find().populate('userId').skip(skip).limit(limit).sort({createdAt:-1})
    res.render("orders",{orders,currentPage,totalPages})
  } catch (error) {
    console.log(error)
  }
}
//Edit Order Status
const editOrderStatus = async(req,res)=>{
  try {
    const {id,status} = req.query
    if(status == 'delivered'){
      const paymentUpdate =await orderModel.findByIdAndUpdate(id,{paymentStatus:'paid'})
    }
    const edit = await orderModel.findByIdAndUpdate(id,{orderStatus:status})
    if(edit){
      console.log("status changed")
      res.status(200).json({success:true})
    }
  } catch (error) {
    console.log(error)
  }
}


//Offer
const viewOffers = async(req,res)=>{
  try {
    const offers = await OfferModel.find().populate('applicableProducts').populate('applicableCategories')
    res.render("offers",{offers})
  } catch (error) {
    console.log(error)
  }
}



const viewAddOffer = async(req,res)=>{
  try {
    const products = await productModel.find()
    const category = await categoryModel.find({status:true})

    res.render("addOffer",{products,category})
  } catch (error) {
    
  }
}

const addOffer = async (req, res) => {
  try {
    const { offerName, offerType, discountPercentage, startDate, endDate, applicableProducts, applicableCategories } = req.body;

    const offer = new OfferModel({
      offerName,
      offerType,
      discountPercentage,
      startDate,
      endDate,
      applicableProducts,
      applicableCategories,
    });

    const offerAdded = await offer.save();
    const percentage = offerAdded.discountPercentage;
    if (offerAdded.offerType === 'product') {
      for (const product of offerAdded.applicableProducts) {
        let productOffer = await productModel.findById(product);
        if (productOffer) {
          productOffer.isDiscounted = true;
          productOffer.offerId = offerAdded._id;
          productOffer.offerPercentage = percentage;
          await productOffer.save(); 
        }
      }
    } else {
      for (const category of offerAdded.applicableCategories) {
        let categoryProducts = await productModel.find({ category });
        for (const productOffer of categoryProducts) {
          productOffer.isDiscounted = true;
          productOffer.offerId = offerAdded._id;
          productOffer.offerPercentage = percentage;
          await productOffer.save(); 
        }
      }
    }
    
    if (offerAdded) res.redirect("/admin/offers");
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred while adding the offer.");
  }
};

//Change status of offer

const changeStatus = async(req,res)=>{
  try {
    const offerId =req.query.id
    const changeto = req.query.changeto === 'true'
    const offer = await OfferModel.findByIdAndUpdate(offerId,{isActive:changeto})
    const products = await productModel.find({offerId})
    for (let product of products) {
      product.isDiscounted = !product.isDiscounted
      await product.save();  
    }
    if(offer)  res.status(200).send({ message: "Status updated successfully" }); 

  } catch (error) {
    console.log(error)
  }
}


//Coupons List
const coupon = async(req,res)=>{
  try {
    const coupons = await couponModel.find()
    res.render("coupon",{coupons})
  } catch (error) {
    
  }
}

// Add Coupon Page
const viewAddCoupon = async(req,res)=>{
  try {
    res.render("addCoupon")
  } catch (error) {
    
  }
}
//Add coupon
const addCoupon = async(req,res)=>{
  console.log(req.body)
  try {
    let {
      code,discountType,discountAmount,discountPercentage,expiresAt,useageLimit,
      min_purchase_amount,max_discount,description } = req.body


    const coupon = new couponModel({
      code,
      discountType,
      discountAmount,
      discountPercentage,
      expiresAt,
      useageLimit,
      min_purchase_amount,
      max_discount,
      description
    })

    const saved =await coupon.save()
    if(saved) res.redirect("/admin/coupons")
  } catch (error) {
   console.log(error) 
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

  logout,

  viewOrders,
  editOrderStatus,

  viewOffers,
  viewAddOffer,
  addOffer,
  changeStatus,

  coupon,
  viewAddCoupon,
  addCoupon,
  salesReport
}