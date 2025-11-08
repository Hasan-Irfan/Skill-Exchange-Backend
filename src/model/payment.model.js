import mongoose from "mongoose";
const { Schema } = mongoose;

const PaymentSchema = new Schema({
  exchange: { type: Schema.Types.ObjectId, ref: "Exchange", required: true },
  payer: { type: Schema.Types.ObjectId, ref: "User", required: true },
  payee: { type: Schema.Types.ObjectId, ref: "User" },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "PKR" },
  type: { type: String, enum: ["deposit","escrow","final_payment","refund"], default: "escrow" },
  status: { 
    type: String,
    enum: ["initiated","escrowed","captured","refunded","failed","disputed"],
    default: "initiated"
  },
  gateway: { type: String, enum: ["stripe","paypal","manual"] },
  gatewayRef: String,
  timeline: [{ at: Date, status: String, note: String }]
}, { timestamps: true });

// Indexes for performance
PaymentSchema.index({ exchange: 1, createdAt: -1 });
PaymentSchema.index({ payer: 1, createdAt: -1 });
PaymentSchema.index({ payee: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

// Compound unique index for gatewayRef per gateway to avoid duplicates
PaymentSchema.index({ gateway: 1, gatewayRef: 1 }, { 
  unique: true, 
  sparse: true, // Only create index entry if both fields exist
  partialFilterExpression: { gateway: { $exists: true }, gatewayRef: { $exists: true } }
});

export default mongoose.model("Payment", PaymentSchema);