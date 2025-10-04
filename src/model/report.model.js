import mongoose from "mongoose";
const { Schema } = mongoose;

const ReportSchema = new Schema({
  reporter: { type: Schema.Types.ObjectId, ref: "User" },
  againstUser: { type: Schema.Types.ObjectId, ref: "User" },
  exchange: { type: Schema.Types.ObjectId, ref: "Exchange" },
  type: { type: String, enum: ["abuse","fraud","no_show","quality","payment","other"] },
  description: String,
  status: { type: String, enum: ["open","under_review","resolved","rejected"], default: "open" },
  adminNotes: String
}, { timestamps: true });

export default mongoose.model("Report", ReportSchema);
