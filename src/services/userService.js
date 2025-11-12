import User from "../model/user.model.js";
import Listing from "../model/listing.model.js";
import Exchange from "../model/exchange.model.js";
import Review from "../model/review.model.js";


export const getUserProfile = async (userId) => {
  const user = await User.findById(userId)
    .select("-password -__v")
    .populate("skillsOffered", "name category synonyms")
    .populate("skillsNeeded", "name category synonyms")
    .lean();

  if (!user) throw new Error("User not found");

  // Fetch user's listings
  const listings = await Listing.find({ owner: userId, active: true })
    .populate("category", "name")
    .populate("skillsOffered", "name category")
    .populate("skillsNeeded", "name category")
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
  
  // Process each allowed field
  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      // Handle arrays - check if it's a JSON string or already an array
      if (field === 'skillsOffered' || field === 'skillsNeeded') {
        if (typeof data[field] === 'string') {
          try {
            updateData[field] = JSON.parse(data[field]);
          } catch (e) {
            // If parsing fails, try to extract from FormData array format
            const keys = Object.keys(data).filter(key => key.startsWith(`${field}[`));
            if (keys.length > 0) {
              updateData[field] = keys
                .sort()
                .map(key => data[key])
                .filter(val => val);
            } else {
              updateData[field] = [];
            }
          }
        } else if (Array.isArray(data[field])) {
          updateData[field] = data[field];
        }
      }
      // Handle nested objects - check if it's a JSON string
      else if (field === 'location' || field === 'availability' || field === 'portfolioLinks' || field === 'notificationPrefs') {
        if (typeof data[field] === 'string') {
          try {
            updateData[field] = JSON.parse(data[field]);
          } catch (e) {
            // Keep as is if parsing fails
            updateData[field] = data[field];
          }
        } else {
          updateData[field] = data[field];
        }
      }
      // Handle simple fields
      else {
        updateData[field] = data[field];
      }
    }
  });

  const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
  })
    .select("-password -__v")
    .populate("skillsOffered", "name category synonyms")
    .populate("skillsNeeded", "name category synonyms")
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
