import mongoose from "mongoose";
const { Schema } = mongoose;

const CategorySchema = new Schema({
  name: { type: String, unique: true, required: true },
  slug: { type: String, unique: true },
  description: String,
  icon: String,
  order: Number,
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Category", CategorySchema);
