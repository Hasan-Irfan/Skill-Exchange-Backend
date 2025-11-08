import { 
  getCategoriesService, 
  getCategoryByIdService,
  createCategoryService, 
  updateCategoryService,
  deleteCategoryService,
  getSkillsService, 
  getSkillsByCategoryService,
  createSkillService,
  updateSkillService,
  deleteSkillService,
  getSkillByIdService
} from "../services/categorySkillService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ---------- Category Controllers ----------
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await getCategoriesService();
  res.json({ success: true, data: categories });
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await getCategoryByIdService(id);
  res.json({ success: true, data: category });
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await createCategoryService(req.body);
  res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await updateCategoryService(id, req.body);
  res.json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await deleteCategoryService(id);
  res.json({ success: true, data: category, message: "Category deleted successfully" });
});

// ---------- Skill Controllers ----------
export const getSkills = asyncHandler(async (req, res) => {
  const { q: query, category } = req.query;
  const skills = await getSkillsService(query, category);
  res.json({ success: true, data: skills });
});

export const getSkillsByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const skills = await getSkillsByCategoryService(categoryId);
  res.json({ success: true, data: skills });
});

export const getSkillById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const skill = await getSkillByIdService(id);
  res.json({ success: true, data: skill });
});

export const createSkill = asyncHandler(async (req, res) => {
  const skill = await createSkillService(req.body);
  res.status(201).json({ success: true, data: skill });
});

export const updateSkill = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const skill = await updateSkillService(id, req.body);
  res.json({ success: true, data: skill });
});

export const deleteSkill = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const skill = await deleteSkillService(id);
  res.json({ success: true, data: skill, message: "Skill deleted successfully" });
});
