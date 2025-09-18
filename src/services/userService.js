import User from "../models/User.js";
import Listing from "../models/Listing.js";
import Exchange from "../models/Exchange.js";
import Review from "../models/Review.js";

export const getUserProfile = async (userId) => {
  const user = await User.findById(userId)
    .select("-passwordHash -__v")
    .lean();

  if (!user) throw new Error("User not found");

  // Fetch user’s listings
  const listings = await Listing.find({ owner: userId, active: true })
    .populate("skill", "name")
    .lean();

  // Fetch reviews summary
  const reviews = await Review.find({ reviewee: userId }).lean();

  return {
    ...user,
    listings,
    reviews: {
      avg: reviews.length
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0,
      count: reviews.length,
    },
  };
};

export const updateUserProfile = async (userId, data) => {
  const allowedFields = [
    "name",
    "bio",
    "avatarUrl",
    "skillsOffered",
    "skillsNeeded",
    "location",
    "availability",
    "portfolioLinks",
    "notificationPrefs",
  ];

  const updateData = {};
  allowedFields.forEach((f) => {
    if (data[f] !== undefined) updateData[f] = data[f];
  });

  const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
  })
    .select("-passwordHash -__v")
    .lean();

  if (!updatedUser) throw new Error("User not found");

  return updatedUser;
};

export const getUserDashboard = async (userId) => {
  // Fetch active and past exchanges
  const exchanges = await Exchange.find({
    $or: [{ initiator: userId }, { receiver: userId }],
  })
    .populate("offer.listing request.listing", "title type")
    .lean();

  // Reviews summary
  const reviews = await Review.find({ reviewee: userId }).lean();

  return {
    exchanges,
    reviews: {
      avg: reviews.length
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0,
      count: reviews.length,
    },
  };
};
