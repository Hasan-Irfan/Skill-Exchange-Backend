const ExchangeSchema = new Schema({
  initiator: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },

  offer: { listing: { type: Schema.Types.ObjectId, ref: "Listing" }, notes: String },
  request: { listing: { type: Schema.Types.ObjectId, ref: "Listing" }, notes: String },

  type: { type: String, enum: ["barter","monetary","hybrid"], default: "barter" },
  monetary: {
    currency: { type: String, default: "PKR" },
    totalAmount: Number,
    depositPercent: { type: Number, default: 10 },
    depositAmount: Number,
    escrowPaymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
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
    receiver: { type: Boolean, default: false }
  },

  audit: [{ at: Date, by: Schema.Types.ObjectId, action: String }]
}, { timestamps: true });

ExchangeSchema.index({ initiator: 1, receiver: 1, createdAt: -1 });

export default mongoose.model("Exchange", ExchangeSchema);
