import Category from "../model/category.model.js";
import SkillTag from "../model/skilltag.model.js";

// ---------- Categories ----------
export const getCategoriesService = async () => {
  return await Category.find({ active: true }).sort({ order: 1, name: 1 }).lean();
};

export const getCategoryByIdService = async (categoryId) => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new Error("Category not found");
  }
  return category.toObject();
};

export const createCategoryService = async (data) => {
  const category = await Category.create(data);
  return category.toObject();
};

export const updateCategoryService = async (categoryId, data) => {
  const category = await Category.findByIdAndUpdate(categoryId, data, { new: true });
  if (!category) {
    throw new Error("Category not found");
  }
  return category.toObject();
};

export const deleteCategoryService = async (categoryId) => {
  // Check if category has skills
  const skillsCount = await SkillTag.countDocuments({ category: categoryId, active: true });
  if (skillsCount > 0) {
    throw new Error("Cannot delete category with existing skills");
  }
  
  const category = await Category.findByIdAndUpdate(categoryId, { active: false }, { new: true });
  if (!category) {
    throw new Error("Category not found");
  }
  return category.toObject();
};

// ---------- Skills ----------
export const getSkillsService = async (query, categoryId = null) => {
  let filter = { active: true };
  
  // Add category filter if provided
  if (categoryId) {
    filter.category = categoryId;
  }
  
  // Add text search if query provided
  if (query) {
    filter.$text = { $search: query };
  }
  
  return await SkillTag.find(filter)
    .populate("category", "name order")
    .sort({ "category.order": 1, "category.name": 1, order: 1, name: 1 })
    .lean();
};

export const getSkillsByCategoryService = async (categoryId) => {
  return await SkillTag.find({ category: categoryId, active: true })
    .sort({ order: 1, name: 1 })
    .lean();
};

export const createSkillService = async (data) => {
  // Validate that category exists
  const category = await Category.findById(data.category);
  if (!category) {
    throw new Error("Category not found");
  }
  
  const skill = await SkillTag.create(data);
  return skill.toObject();
};

export const updateSkillService = async (skillId, data) => {
  // Validate category if being updated
  if (data.category) {
    const category = await Category.findById(data.category);
    if (!category) {
      throw new Error("Category not found");
    }
  }
  
  const skill = await SkillTag.findByIdAndUpdate(skillId, data, { new: true });
  if (!skill) {
    throw new Error("Skill not found");
  }
  
  return skill.toObject();
};

export const deleteSkillService = async (skillId) => {
  const skill = await SkillTag.findByIdAndUpdate(skillId, { active: false }, { new: true });
  if (!skill) {
    throw new Error("Skill not found");
  }
  
  return skill.toObject();
};
