const PageSchema = new Schema({
  slug: { type: String, unique: true },
  title: String,
  content: String,
  published: { type: Boolean, default: true }
}, { timestamps: true });

const FAQSchema = new Schema({
  question: String,
  answer: String,
  category: String,
  order: Number,
  published: { type: Boolean, default: true }
}, { timestamps: true });

const TestimonialSchema = new Schema({
  authorName: String,
  roleOrCompany: String,
  quote: String,
  published: { type: Boolean, default: true }
}, { timestamps: true });

const HelpTicketSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  subject: String,
  body: String,
  status: { type: String, enum: ["open","agent_reply","user_reply","closed"], default: "open" },
  messages: [{ by: String, at: Date, body: String }]
}, { timestamps: true });

export const Page = mongoose.model("Page", PageSchema);
export const FAQ = mongoose.model("FAQ", FAQSchema);
export const Testimonial = mongoose.model("Testimonial", TestimonialSchema);
export const HelpTicket = mongoose.model("HelpTicket", HelpTicketSchema);
