import mongoose from "mongoose";
const { Schema } = mongoose;

const ThreadSchema = new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
  exchange: { type: Schema.Types.ObjectId, ref: "Exchange" },
  lastMessageAt: Date,
  unreadBy: [{ type: Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

export const Thread = mongoose.model("Thread", ThreadSchema);