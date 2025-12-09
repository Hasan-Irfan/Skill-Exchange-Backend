import Listing from "../model/listing.model.js";
import User from "../model/user.model.js";
import SkillTag from "../model/skilltag.model.js";
import Exchange from "../model/exchange.model.js"; // used to prevent deleting listings with active exchanges

/**
 * Create a new listing
 */
export const createListingService = async (userId, data) => {

  const allSkillIds = [
    ...(data.skillsOffered || []),
    ...(data.skillsNeeded || [])
  ];

  if (allSkillIds.length === 0) {
    throw new Error("At least one skill (offered or needed) is required");
  }

  const skills = await SkillTag.find({
    _id: { $in: allSkillIds },
    active: true
  }).populate("category", "_id name");

  if (skills.length !== allSkillIds.length) {
    throw new Error("One or more skills are invalid or inactive");
  }

  const categoryIds = [...new Set(
    skills
      .map(skill => skill.category?._id || skill.category)
      .filter(Boolean)
      .map(cat => cat._id || cat)
  )];

  const currency = data.currency || skills?.currency || "USD";

  const listing = await Listing.create({
    ...data,
    category: categoryIds,
    owner: userId,
    currency
  });

  return listing.toObject();
};

/**
 * Get listings with optional filters (type, skill, location, search, pagination)
 */
export const getListingsService = async (query, requestingUserId = null) => {
  // If requesting user is the owner, include inactive listings
  // Otherwise, only show active listings
  const filter = {};

  // Normalize some incoming query params
  // Support both 'level' and 'experienceLevel' from the client
  const experienceLevel = query.level || query.experienceLevel;
  // Support multiple skills via repeated query params (?skills=a&skills=b) or comma-separated (?skills=a,b)
  let skillIds = [];
  if (query.skills) {
    if (Array.isArray(query.skills)) {
      skillIds = query.skills.filter(Boolean);
    } else if (typeof query.skills === 'string') {
      skillIds = query.skills.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // If owner filter is provided and matches requesting user, include inactive listings
  if (query.owner && requestingUserId && query.owner === requestingUserId.toString()) {
    // Include all listings (active and inactive) for the owner
    filter.owner = query.owner;
  } else {
    // For public searches or other users' listings, only show active
    filter.active = true;
    if (query.owner) filter.owner = query.owner;
  }

  if (query.type) filter.type = query.type; // offer / need


  if (query.category) {
    // Accept either a single id or comma-separated list
    const categoryIds = Array.isArray(query.category)
      ? query.category
      : String(query.category).split(',').map(s => s.trim()).filter(Boolean);
    // Match any of the selected categories
    filter.category = { $in: categoryIds };
  }

  // Experience level filter
  if (experienceLevel) {
    filter.experienceLevel = experienceLevel;
  }

  // Skills filter: listings that have at least one of the selected skills (either offered or needed)
  if (skillIds.length > 0) {
    filter.$or = [
      { skillsOffered: { $in: skillIds } },
      { skillsNeeded: { $in: skillIds } }
    ];
  }
  // Listing has no location; you may filter on availability.timezone
  if (query.timezone) filter["availability.timezone"] = { $regex: query.timezone, $options: "i" };

  if (query.remote === 'true') filter["availability.remote"] = true;
  if (query.onsite === 'true') filter["availability.onsite"] = true;

  // Handle search query - combine with category $or if it exists
  if (query.q) {
    const searchOr = [
      { title: { $regex: query.q, $options: "i" } },
      { description: { $regex: query.q, $options: "i" } },
    ];

    if (filter.$or) {
      // If category filter exists, combine with $and
      filter.$and = [
        { $or: filter.$or },
        { $or: searchOr }
      ];
      delete filter.$or;
    } else {
      filter.$or = searchOr;
    }
  }
  // optional filter by currency
  if (query.currency) filter.currency = query.currency;

  let sortOption = { createdAt: -1 }; // default: newest first
  if (query.sort === 'oldest') sortOption = { createdAt: 1 };
  else if (query.sort === 'hourlyRate-asc') sortOption = { hourlyRate: 1 };
  else if (query.sort === 'hourlyRate-desc') sortOption = { hourlyRate: -1 };
  else if (query.sort === 'rating') sortOption = { 'owner.rating.avg': -1 };

  const limit = parseInt(query.limit) || 20;
  const page = parseInt(query.page) || 1;
  const skip = (page - 1) * limit;

  const listings = await Listing.find(filter)
    .populate("owner", "username avatarUrl rating")
    .populate("category", "name")
    .populate("skillsOffered", "name category")
    .populate("skillsNeeded", "name category")
    .sort(sortOption)
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
    .populate("owner", "username avatarUrl bio skillsOffered")
    .populate("category", "name")
    .populate("skillsOffered", "name category")
    .populate("skillsNeeded", "name category")
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

  if (listing.owner.toString() !== user.id && user.role !== "admin" && user.role !== "superAdmin") {
    throw new Error("Not authorized to update this listing");
  }

  if (data.skillsOffered !== undefined || data.skillsNeeded !== undefined) {
    const allSkillIds = [
      ...(data.skillsOffered || listing.skillsOffered || []),
      ...(data.skillsNeeded || listing.skillsNeeded || [])
    ];

    if (allSkillIds.length > 0) {
      const skills = await SkillTag.find({
        _id: { $in: allSkillIds },
        active: true
      }).populate("category", "_id name");

      if (skills.length !== allSkillIds.length) {
        throw new Error("One or more skills are invalid or inactive");
      }

      // Extract unique category IDs from skills
      const categoryIds = [...new Set(
        skills
          .map(skill => skill.category?._id || skill.category)
          .filter(Boolean)
          .map(cat => cat._id || cat)
      )];

      data.category = categoryIds;
    }
  }

  // If attempting to change critical fields while there are active exchanges, either block or log
  const protectedFields = ["skill", "hourlyRate", "currency"];
  const isChangingProtected = protectedFields.some(f => data[f] !== undefined);
  if (isChangingProtected) {
    const activeEx = await Exchange.findOne({
      $or: [{ "request.listing": listingId }, { "offer.listing": listingId }],
      status: { $nin: ["declined", "cancelled", "completed", "resolved"] }
    }).lean();

    if (activeEx) {
      throw new Error("Cannot modify key listing fields while there are active exchanges referencing this listing");
    }
  }

  const allowedFields = [
    "title",
    "description",
    "type",
    "category",
    "skillsOffered",
    "skillsNeeded",
    "experienceLevel",
    "hourlyRate",
    "currency",
    "availability",
    "tags",
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
 * Soft delete, but prevent deletion if there are ongoing exchanges referencing it
 */
export const deleteListingService = async (user, listingId) => {
  const listing = await Listing.findById(listingId);
  if (!listing) throw new Error("Listing not found");

  if (listing.owner.toString() !== user.id && user.role !== "admin" && user.role !== "superAdmin") {
    throw new Error("Not authorized to delete this listing");
  }

  // Prevent soft-delete when there are active exchanges referencing this listing
  const activeEx = await Exchange.findOne({
    $or: [{ "request.listing": listingId }, { "offer.listing": listingId }],
    status: { $nin: ["declined", "cancelled", "completed", "resolved"] }
  }).lean();

  if (activeEx) {
    throw new Error("Cannot delete listing while there are ongoing exchanges referencing it");
  }

  // Soft delete by setting active to false
  await Listing.findByIdAndUpdate(listingId, { active: false });
  return { message: "Listing deleted successfully" };
};
