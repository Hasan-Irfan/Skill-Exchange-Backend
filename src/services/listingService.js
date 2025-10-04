import Listing from "../model/listing.model.js";
import User from "../model/user.model.js";
import SkillTag from "../model/skilltag.model.js";

/**
 * Create a new listing
 */
export const createListingService = async (userId, data) => {
  const skillExists = await SkillTag.findById(data.skill);
  if (!skillExists) throw new Error("Invalid skill ID");

  const listing = await Listing.create({
    ...data,
    owner: userId,
  });

  // Optionally add listing ID to user's listings if you track them there
  await User.findByIdAndUpdate(userId, { $push: { listings: listing._id } });

  return listing.toObject();
};

/**
 * Get listings with optional filters (type, skill, location, search, pagination)
 */
export const getListingsService = async (query) => {
  const filter = { active: true };

  if (query.type) filter.type = query.type; // offer / need
  if (query.skill) filter.skill = query.skill;
  if (query.owner) filter.owner = query.owner;
  if (query.city) filter["location.city"] = { $regex: query.city, $options: "i" };
  if (query.q)
    filter.$or = [
      { title: { $regex: query.q, $options: "i" } },
      { description: { $regex: query.q, $options: "i" } },
    ];

  const limit = parseInt(query.limit) || 20;
  const page = parseInt(query.page) || 1;
  const skip = (page - 1) * limit;

  const listings = await Listing.find(filter)
    .populate("owner", "name avatarUrl")
    .populate("skill", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Listing.countDocuments(filter);

  return {
    listings,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

/**
 * Get single listing details
 */
export const getListingService = async (listingId) => {
  const listing = await Listing.findById(listingId)
    .populate("owner", "name avatarUrl bio skillsOffered")
    .populate("skill", "name category")
    .lean();

  if (!listing) throw new Error("Listing not found");
  return listing;
};

/**
 * Update a listing (only owner or admin)
 */
export const updateListingService = async (user, listingId, data) => {
  const listing = await Listing.findById(listingId);
  if (!listing) throw new Error("Listing not found");

  if (listing.owner.toString() !== user.id && user.role !== "admin") {
    throw new Error("Not authorized to update this listing");
  }

  const allowedFields = [
    "title",
    "description",
    "type",
    "skill",
    "priceRange",
    "availability",
    "location",
    "attachments",
    "active",
  ];

  allowedFields.forEach((key) => {
    if (data[key] !== undefined) listing[key] = data[key];
  });

  await listing.save();
  return listing.toObject();
};

/**
 * Delete a listing (only owner or admin)
 */
export const deleteListingService = async (user, listingId) => {
  const listing = await Listing.findById(listingId);
  if (!listing) throw new Error("Listing not found");

  if (listing.owner.toString() !== user.id && user.role !== "admin") {
    throw new Error("Not authorized to delete this listing");
  }

  await Listing.findByIdAndDelete(listingId);
  return { message: "Listing deleted successfully" };
};
