import mongoose from "mongoose";
const { Schema } = mongoose;

const ReportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    againstUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
    exchange: { type: Schema.Types.ObjectId, ref: "Exchange" },

    type: {
      type: String,
      enum: ["abuse", "fraud", "no_show", "quality", "payment", "other"],
      required: true,
    },

    description: { type: String, required: true },

    // Keep it simple, four states is still clear
    status: {
      type: String,
      enum: ["open", "under_review", "resolved", "rejected"],
      default: "open",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    // Just evidence urls
    evidence: [{ type: String }],

    // Admin side fields
    adminNotes: String,
    resolution: String,
    actionTaken: {
      type: String,
      enum: ["none", "warning", "suspend", "block", "refund", "chargeback"],
      default: "none",
    },

    audit: [
      {
        at: Date,
        by: { type: Schema.Types.ObjectId, ref: "User" },
        action: String,
        note: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Report", ReportSchema);
