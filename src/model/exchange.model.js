import mongoose from "mongoose";
const { Schema } = mongoose;

const SkillSnapshotSchema = new Schema({
  skillId: { type: Schema.Types.ObjectId, ref: "Skill" },
  name: String,
  level: { type: String, enum: ["beginner","intermediate","expert"], default: "intermediate" },
  hourlyRate: Number,
  currency: { type: String, default: "PKR" },
  details: String
}, { _id: false });

const ListingSnapshotSchema = new Schema({
  title: String,
  skillId: { type: Schema.Types.ObjectId, ref: "SkillTag" },
  price: Number,
  currency: String,
  ownerId: { type: Schema.Types.ObjectId, ref: "User" },
  visibility: String,
  version: Number
}, { _id: false });

const DisputeSchema = new Schema({
  raisedBy: { type: Schema.Types.ObjectId, ref: "User" },
  reason: String,
  date: Date,
  adminResolution: {
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: Date,
    paymentAction: { type: String, enum: ["release", "refund", "split", "none"] },
    note: String
  }
}, { _id: false });

const ExchangeSchema = new Schema({
  initiator: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver:  { type: Schema.Types.ObjectId, ref: "User", required: true },

  offer: {
    listing: { type: Schema.Types.ObjectId, ref: "Listing" },
    notes: String,
    skillSnapshot: SkillSnapshotSchema
  },

  request: {
    listing: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    notes: String,
    listingSnapshot: ListingSnapshotSchema
  },

  type: { type: String, enum: ["barter","monetary","hybrid"] },
  monetary: {
    currency: { type: String, default: "PKR" },
    totalAmount: Number, // Full payment amount (no deposit system)
    escrowPaymentId: { type: Schema.Types.ObjectId, ref: "Payment" }
  },

  agreement: {
    terms: [String],
    signedBy: [{ type: Schema.Types.ObjectId, ref: "User" }]
  },

  status: {
    type: String,
    enum: [
      "proposed","accepted_initial","agreement_signed","escrow_funded",
      "in_progress","completed","declined","cancelled","disputed","resolved"
    ],
    default: "proposed"
  },

  thread: { type: Schema.Types.ObjectId, ref: "Thread" },

  confirmations: {
    initiator: { type: Boolean, default: false },
    receiver:  { type: Boolean, default: false }
  },

  dispute: DisputeSchema,

  audit: [{ at: Date, by: Schema.Types.ObjectId, action: String }]
}, { timestamps: true });

ExchangeSchema.index({ initiator: 1, receiver: 1, createdAt: -1 });
ExchangeSchema.index({ status: 1, createdAt: -1 });
ExchangeSchema.index({ "monetary.escrowPaymentId": 1 });

export default mongoose.model("Exchange", ExchangeSchema)