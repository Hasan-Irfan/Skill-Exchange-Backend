import mongoose from "mongoose";
const { Schema } = mongoose;

const ListingSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["offer", "need"], required: true },
  category: [{ type: Schema.Types.ObjectId, ref: "Category" }],
  title: String,
  description: String,
  experienceLevel: { type: String, enum: ["beginner","intermediate","expert"] },
  hourlyRate: Number,
  skillsOffered: [{ type: Schema.Types.ObjectId, ref: "SkillTag" }],
  skillsNeeded: [{ type: Schema.Types.ObjectId, ref: "SkillTag" }],
  availability: {
    remote: Boolean,
    onsite: Boolean,
    timezone: String,
  },
  tags: [String],
  active: { type: Boolean, default: true }
}, { timestamps: true });

ListingSchema.index({ title: "text", description: "text", tags: "text" });

export default mongoose.model("Listing", ListingSchema);
