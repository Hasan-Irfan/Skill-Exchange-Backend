const ListingSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["offer", "need"], required: true },
  skill: { type: Schema.Types.ObjectId, ref: "SkillTag", required: true },
  title: String,
  description: String,
  experienceLevel: { type: String, enum: ["beginner","intermediate","expert"] },
  hourlyRate: Number,
  availability: {
    remote: Boolean,
    onsite: Boolean,
    timezone: String,
  },
  location: {
    type: { type: String, enum: ["Point"] },
    coordinates: [Number],
  },
  tags: [String],
  active: { type: Boolean, default: true }
}, { timestamps: true });

ListingSchema.index({ location: "2dsphere" });
ListingSchema.index({ title: "text", description: "text", tags: "text" });

export default mongoose.model("Listing", ListingSchema);
