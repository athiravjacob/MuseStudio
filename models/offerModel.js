const mongoose = require('../config/dbConfig');

const offerSchema = new mongoose.Schema({
  offerName: { type: String, required: true },
  offerType: { type: String, required: true, enum: ['product', 'category'] },
  discountPercentage: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'product' }],
  applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'category' }],
  isActive: { type: Boolean, default: true }
},{timestamps:true});

const OfferModel = mongoose.model('Offer', offerSchema);

module.exports = OfferModel;
