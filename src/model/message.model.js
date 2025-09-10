const MessageSchema = new Schema({
  thread: { type: Schema.Types.ObjectId, ref: "Thread", required: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  body: { type: String, maxlength: 5000 },
  attachments: [{ url: String, type: String }]
}, { timestamps: true });

export const Message = mongoose.model("Message", MessageSchema);