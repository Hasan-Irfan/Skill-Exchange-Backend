import { 
  createListingService, 
  getListingsService, 
  getListingService, 
  updateListingService, 
  deleteListingService 
} from "../services/listingService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createListing = asyncHandler(async (req, res) => {
  const listing = await createListingService(req.user.id, req.body);
  res.status(201).json({ success: true, data: listing });
});

export const getListings = asyncHandler(async (req, res) => {
  const data = await getListingsService(req.query);
  res.json({ success: true, data });
});

export const getListing = asyncHandler(async (req, res) => {
  const listing = await getListingService(req.params.id);
  res.json({ success: true, data: listing });
});

export const updateListing = asyncHandler(async (req, res) => {
  const updated = await updateListingService(req.user, req.params.id, req.body);
  res.json({ success: true, data: updated });
});

export const deleteListing = asyncHandler(async (req, res) => {
  const result = await deleteListingService(req.user, req.params.id);
  res.json({ success: true, message: result.message });
});
