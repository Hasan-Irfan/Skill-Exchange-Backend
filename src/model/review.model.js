const ReviewSchema = new Schema({
  exchange: { type: Schema.Types.ObjectId, ref: "Exchange", required: true },
  reviewer: { type: Schema.Types.ObjectId, ref: "User", required: true },
  reviewee: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, maxlength: 2000 }
}, { timestamps: true });

ReviewSchema.index({ reviewee: 1, createdAt: -1 });

export default mongoose.model("Review", ReviewSchema);
