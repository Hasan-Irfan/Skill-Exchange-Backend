import User from "../model/user.model.js";
import Listing from "../model/listing.model.js";
import Exchange from "../model/exchange.model.js";
import Review from "../model/review.model.js";


export const getUserProfile = async (userId) => {
  const user = await User.findById(userId)
    .select("-password -__v")
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
    .select("-password -__v")
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
