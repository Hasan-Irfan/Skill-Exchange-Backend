const ActivityLogSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: "User" },
  action: String,
  entity: { type: String, enum: ["User","Listing","Exchange","Payment","Message","Review"] },
  entityId: Schema.Types.ObjectId,
  meta: Schema.Types.Mixed
}, { timestamps: true });

ActivityLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model("ActivityLog", ActivityLogSchema);
