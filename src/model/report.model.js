import mongoose from "mongoose";
const { Schema } = mongoose;

const ReportSchema = new Schema({
  reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
  againstUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
  exchange: { type: Schema.Types.ObjectId, ref: "Exchange" },
  type: { type: String, enum: ["abuse","fraud","no_show","quality","payment","other"], required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ["open","under_review","resolved","rejected","escalated"], default: "open" },
  priority: { type: String, enum: ["low","medium","high","urgent"], default: "medium" },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User" }, // Admin assignment
  evidence: [{ type: String }], // File URLs/paths
  adminNotes: String,
  resolution: String,
  actionTaken: { type: String, enum: ["none","warning","suspend","block","refund","chargeback"] },
  audit: [{ at: Date, by: Schema.Types.ObjectId, action: String, note: String }]
}, { timestamps: true });

export default mongoose.model("Report", ReportSchema);
