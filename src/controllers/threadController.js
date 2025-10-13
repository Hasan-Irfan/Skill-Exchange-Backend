import { asyncHandler } from "../utils/asyncHandler.js";
import { listMyThreads } from "../services/threadService.js";

export const getThreads = asyncHandler(async (req, res) => {
  const { limit, page } = req.query;
  const threads = await listMyThreads(req.user.id, { limit: Number(limit) || 20, page: Number(page) || 1 });
  res.json({ success: true, data: threads });
});


