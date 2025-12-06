import mongoose from "mongoose";
const { Schema } = mongoose;

const AttachmentSchema = new Schema({
  url: { type: String, required: true },
  type: { type: String },
  filename: { type: String },
  size: { type: Number }
}, { _id: false });

const MessageSchema = new Schema({
  thread: { type: Schema.Types.ObjectId, ref: "Thread", required: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  body: { type: String, maxlength: 5000 },
  attachments: { type: [AttachmentSchema], default: [] }
}, { timestamps: true });

export const Message = mongoose.model("Message", MessageSchema);
