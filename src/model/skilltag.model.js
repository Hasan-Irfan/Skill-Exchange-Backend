import mongoose from "mongoose";
const { Schema } = mongoose;

const SkillTagSchema = new Schema({
  name: { type: String, required: true, index: true },
  slug: { type: String, unique: true },
  category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
  description: String,
  synonyms: [String],
  order: Number,
  active: { type: Boolean, default: true }
}, { timestamps: true });

SkillTagSchema.index({ name: "text", synonyms: "text" });

export default mongoose.model("SkillTag", SkillTagSchema);
