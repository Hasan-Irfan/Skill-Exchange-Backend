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
  // Check if category name already exists
  const existingCategory = await Category.findOne({ 
    name: { $regex: new RegExp(`^${data.name}$`, 'i') },
    active: true 
  });
  
  if (existingCategory) {
    throw new Error("Category with this name already exists");
  }

  // Generate slug if not provided
  if (!data.slug) {
    data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // Check if slug already exists
  const existingSlug = await Category.findOne({ 
    slug: data.slug,
    active: true 
  });
  
  if (existingSlug) {
    throw new Error("Category with this slug already exists");
  }

  const category = await Category.create(data);
  return category.toObject();
};

export const updateCategoryService = async (categoryId, data) => {
  // Check if category exists
  const existingCategory = await Category.findById(categoryId);
  if (!existingCategory) {
    throw new Error("Category not found");
  }

  // Check if name is being updated and if it already exists
  if (data.name && data.name !== existingCategory.name) {
    const duplicateCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${data.name}$`, 'i') },
      _id: { $ne: categoryId },
      active: true 
    });
    
    if (duplicateCategory) {
      throw new Error("Category with this name already exists");
    }
  }

  // Generate slug if name is updated and slug not provided
  if (data.name && !data.slug) {
    data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // Check if slug is being updated and if it already exists
  if (data.slug && data.slug !== existingCategory.slug) {
    const duplicateSlug = await Category.findOne({ 
      slug: data.slug,
      _id: { $ne: categoryId },
      active: true 
    });
    
    if (duplicateSlug) {
      throw new Error("Category with this slug already exists");
    }
  }

  const category = await Category.findByIdAndUpdate(categoryId, data, { new: true });
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
  // Validate that category exists and is active
  const category = await Category.findOne({ _id: data.category, active: true });
  if (!category) {
    throw new Error("Category not found or inactive");
  }

  // Check if skill name already exists in the same category
  const existingSkill = await SkillTag.findOne({ 
    name: { $regex: new RegExp(`^${data.name}$`, 'i') },
    category: data.category,
    active: true 
  });
  
  if (existingSkill) {
    throw new Error("Skill with this name already exists in this category");
  }

  // Generate slug if not provided
  if (!data.slug) {
    data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // Check if slug already exists globally
  const existingSlug = await SkillTag.findOne({ 
    slug: data.slug,
    active: true 
  });
  
  if (existingSlug) {
    throw new Error("Skill with this slug already exists");
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
