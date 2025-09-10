const SkillTagSchema = new Schema({
  name: { type: String, required: true, index: true },
  slug: { type: String, unique: true },
  category: { type: Schema.Types.ObjectId, ref: "Category" },
  synonyms: [String]
}, { timestamps: true });

SkillTagSchema.index({ name: "text", synonyms: "text" });

export default mongoose.model("SkillTag", SkillTagSchema);
