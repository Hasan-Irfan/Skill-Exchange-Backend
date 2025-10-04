import { createListingService , getListingsService , getListingService , updateListingService , deleteListingService } from "../services/listingService";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createListing = async (req, res) => {
  try {
    const listing = await createListingService(req.user.id, req.body);
    res.status(201).json({ success: true, data: listing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getListings = asyncHandler(
    async (req, res) => {
  try {
    const data = await getListingsService(req.query);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export const getListing = async (req, res) => {
  try {
    const listing = await getListingService(req.params.id);
    res.json({ success: true, data: listing });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

export const updateListing = async (req, res) => {
  try {
    const updated = await updateListingService(req.user, req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteListing = async (req, res) => {
  try {
    const result = await deleteListingService(req.user, req.params.id);
    res.json({ success: true, message: result.message });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
