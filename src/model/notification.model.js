import mongoose from "mongoose";
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  type: { 
    type: String, 
    enum: ["NEW_MATCH","NEW_MESSAGE","EXCHANGE_STATUS","REMINDER","ADMIN_ANNOUNCEMENT","PAYMENT_EVENT"]
  },
  title: String,
  body: String,
  data: Schema.Types.Mixed,
  readAt: Date,
  channel: { type: String, enum: ["inapp","email","sms","push"], default: "inapp" }
}, { timestamps: true });

NotificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Notification", NotificationSchema);
