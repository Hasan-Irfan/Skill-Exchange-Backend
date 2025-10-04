import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSchema = new Schema({
  username: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },

  avatarUrl: String,
  bio: { type: String, maxlength: 1000 },

  roles: [{ type: String, enum: ["user", "admin"], default: "user" }],
  status: { type: String, enum: ["active", "blocked"], default: "active" },

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
