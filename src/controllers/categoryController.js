import { getCategoriesService , createCategoryService , getSkillsService , createSkillService } from "../services/categorySkillService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getCategories = asyncHandler(async (req, res) => {
try {
    const categories = await getCategoriesService();
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export const createCategory = asyncHandler(async (req, res) => {
try {
    const category = await createCategoryService(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export const getSkills = asyncHandler(
    async (req, res) => {
  try {
    const skills = await getSkillsService(req.query.q);
    res.json({ success: true, data: skills });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export const createSkill = asyncHandler(async (req, res) => {
  try {
    const skill = await createSkillService(req.body);
    res.status(201).json({ success: true, data: skill });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});
