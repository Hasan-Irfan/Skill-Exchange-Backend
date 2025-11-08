import Listing from "../model/listing.model.js";
import User from "../model/user.model.js";
import SkillTag from "../model/skilltag.model.js";
import Exchange from "../model/exchange.model.js"; // used to prevent deleting listings with active exchanges

/**
 * Create a new listing
 */
export const createListingService = async (userId, data) => {
  // Validate that skill exists and is active
  const skill = await SkillTag.findOne({ _id: data.skill, active: true })
    .populate("category", "name");
  
  if (!skill) {
    throw new Error("Invalid or inactive skill ID");
  }

  // Choose currency, prefer provided value, fall back to skill or PKR
  const currency = data.currency || skill?.currency || "PKR";

  const listing = await Listing.create({
    ...data,
    owner: userId,
    currency
  });

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
  // Listing has no location; you may filter on availability.timezone
  if (query.timezone) filter["availability.timezone"] = { $regex: query.timezone, $options: "i" };
  if (query.q)
    filter.$or = [
      { title: { $regex: query.q, $options: "i" } },
      { description: { $regex: query.q, $options: "i" } },
    ];

  // optional filter by currency
  if (query.currency) filter.currency = query.currency;

  const limit = parseInt(query.limit) || 20;
  const page = parseInt(query.page) || 1;
  const skip = (page - 1) * limit;

  const listings = await Listing.find(filter)
    .populate("owner", "username avatarUrl")
    .populate("skill", "name category")
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
    .populate("owner", "username avatarUrl bio skillsOffered skillsNeeded")
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

  if (listing.owner.toString() !== user.id && !user.roles?.includes("admin")) {
    throw new Error("Not authorized to update this listing");
  }

  // Validate skill if being updated
  if (data.skill) {
    const skill = await SkillTag.findOne({ _id: data.skill, active: true });
    if (!skill) {
      throw new Error("Invalid or inactive skill ID");
    }
  }

  // If attempting to change critical fields while there are active exchanges, either block or log
  const protectedFields = ["skill", "hourlyRate", "currency"];
  const isChangingProtected = protectedFields.some(f => data[f] !== undefined);
  if (isChangingProtected) {
    const activeEx = await Exchange.findOne({
      $or: [{ "request.listing": listingId }, { "offer.listing": listingId }],
      status: { $nin: ["declined","cancelled","completed","resolved"] }
    }).lean();

    if (activeEx) {
      throw new Error("Cannot modify key listing fields while there are active exchanges referencing this listing");
    }
  }

  const allowedFields = [
    "title",
    "description",
    "type",
    "skill",
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

  if (listing.owner.toString() !== user.id && !user.roles?.includes("admin")) {
    throw new Error("Not authorized to delete this listing");
  }

  // Prevent soft-delete when there are active exchanges referencing this listing
  const activeEx = await Exchange.findOne({
    $or: [{ "request.listing": listingId }, { "offer.listing": listingId }],
    status: { $nin: ["declined","cancelled","completed","resolved"] }
  }).lean();

  if (activeEx) {
    throw new Error("Cannot delete listing while there are ongoing exchanges referencing it");
  }

  // Soft delete by setting active to false
  await Listing.findByIdAndUpdate(listingId, { active: false });
  return { message: "Listing deleted successfully" };
};
