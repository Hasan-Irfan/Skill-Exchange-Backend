import Category from "../model/category.model.js";
import SkillTag from "../model/skilltag.model.js";

// ---------- Categories ----------
export const getCategoriesService = async () => {
  return await Category.find({ active: true }).sort({ order: 1, name: 1 }).lean();
};

export const createCategoryService = async (data) => {
  const category = await Category.create(data);
  return category.toObject();
};

// ---------- Skills ----------
export const getSkillsService = async (query) => {
  if (query) {
    return await SkillTag.find({ $text: { $search: query } })
      .populate("category", "name")
      .lean();
  }
  return await SkillTag.find().populate("category", "name").lean();
};

export const createSkillService = async (data) => {
  const skill = await SkillTag.create(data);
  return skill.toObject();
};
