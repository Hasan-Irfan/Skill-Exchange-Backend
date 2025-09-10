const PaymentSchema = new Schema({
  exchange: { type: Schema.Types.ObjectId, ref: "Exchange" },
  payer: { type: Schema.Types.ObjectId, ref: "User" },
  payee: { type: Schema.Types.ObjectId, ref: "User" },
  amount: Number,
  currency: { type: String, default: "PKR" },

  type: { type: String, enum: ["deposit","escrow","final_payment","refund"] },
  status: { 
    type: String,
    enum: ["initiated","escrowed","captured","refunded","failed","disputed"],
    default: "initiated"
  },

  gateway: { type: String, enum: ["stripe","paypal","manual"] },
  gatewayRef: String,
  timeline: [{ at: Date, status: String, note: String }]
}, { timestamps: true });

export default mongoose.model("Payment", PaymentSchema);
