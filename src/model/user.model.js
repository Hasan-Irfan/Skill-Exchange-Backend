import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSchema = new Schema({
  username: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },

  avatarUrl: String,
  bio: { type: String, maxlength: 1000 },

  role: { type: String, enum: ["user", "superAdmin", "admin"], default: "user" },
  status: { type: String, enum: ["active", "blocked", "suspended"], default: "active" },
  suspension: {
    reason: String,
    suspendedBy: { type: Schema.Types.ObjectId, ref: "User" },
    suspendedAt: Date,
    suspendedUntil: Date, // null for permanent suspension
    isPermanent: { type: Boolean, default: false }
  },

  skillsOffered: [{ type: Schema.Types.ObjectId, ref: "SkillTag" }],
  skillsNeeded: [{ type: Schema.Types.ObjectId, ref: "SkillTag" }],

  location: {
    country: String,
    city: String,
  },

  availability: {
    timezone: String,
    slots: [{ dayOfWeek: Number, from: String, to: String }],
  },

  portfolioLinks: [{ label: String, url: String }],

  rating: {
    avg: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
  },

  payments: {
    totalReceived: { type: Number, default: 0 }, 
    totalPaid: { type: Number, default: 0 }, 
    receivedCount: { type: Number, default: 0 }, 
    paidCount: { type: Number, default: 0 }, 
    currency: { type: String, default: "USD" } 
  },

  wallet: {
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "USD" },
    stripeCustomerId: String, // Stripe customer ID for top-ups
    lastTopUpAt: Date,
    lastWithdrawalAt: Date
  },

  notificationPrefs: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
  },

  lastLoginAt: Date,
  isVerified: { type: Boolean, default: false },
  refreshToken: { type: String },
}, { timestamps: true });


export default mongoose.model("User", UserSchema);
