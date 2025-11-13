import Category from "../model/category.model.js";
import SkillTag from "../model/skilltag.model.js";

// ---------- Helper Validators ----------
const validateName = (name, field = "Name") => {
  if (!name || !name.trim()) {
    throw new Error(`${field} cannot be empty or whitespace`);
  }
  return name.trim();
};

const validateOrder = (order, allowNull = true) => {
  if (order == null && allowNull) return; // skip if not provided
  if (!Number.isInteger(order) || order < 0 || order > 10000) {
    throw new Error("Order must be an integer between 0 and 10,000");
  }
};

// ---------- Categories ----------
export const getCategoriesService = async () => {
  return await Category.find({ active: true })
    .sort({ order: 1, name: 1 })
    .lean();
};

export const getCategoryByIdService = async (categoryId) => {
  const category = await Category.findById(categoryId);
  if (!category) throw new Error("Category not found");
  return category.toObject();
};

export const createCategoryService = async (data) => {
  // Validate name
  data.name = validateName(data.name, "Category name");

  // Auto-assign order if not provided
  if (data.order == null) {
    const maxOrderCat = await Category.findOne().sort({ order: -1 }).select("order");
    data.order = maxOrderCat ? maxOrderCat.order + 1 : 0;
  } else {
    validateOrder(data.order, false);
  }

  // Check if category name already exists
  const existingCategory = await Category.findOne({
    name: { $regex: new RegExp(`^${data.name}$`, "i") },
    active: true,
  });
  if (existingCategory) throw new Error("Category with this name already exists");

  // Generate slug if not provided
  if (!data.slug) {
    data.slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  // Check if slug already exists
  const existingSlug = await Category.findOne({
    slug: data.slug,
    active: true,
  });
  if (existingSlug) throw new Error("Category with this slug already exists");

  const category = await Category.create(data);
  return category.toObject();
};

export const updateCategoryService = async (categoryId, data) => {
  // Check if category exists
  const existingCategory = await Category.findById(categoryId);
  if (!existingCategory) throw new Error("Category not found");
  if (!existingCategory.active)
    throw new Error("Cannot update a deleted category");

  // Validate name if provided
  if (data.name) {
    data.name = validateName(data.name, "Category name");

    // Check duplicate name
    const duplicateCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${data.name}$`, "i") },
      _id: { $ne: categoryId },
      active: true,
    });
    if (duplicateCategory)
      throw new Error("Category with this name already exists");
  }

  // Validate order if provided
  validateOrder(data.order);

  // Generate slug if name updated and slug not provided
  if (data.name && !data.slug) {
    data.slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  // Check duplicate slug
  if (data.slug && data.slug !== existingCategory.slug) {
    const duplicateSlug = await Category.findOne({
      slug: data.slug,
      _id: { $ne: categoryId },
      active: true,
    });
    if (duplicateSlug)
      throw new Error("Category with this slug already exists");
  }

  const category = await Category.findByIdAndUpdate(categoryId, data, {
    new: true,
  });
  return category.toObject();
};

export const deleteCategoryService = async (categoryId) => {
  const category = await Category.findById(categoryId);
  if (!category) throw new Error("Category not found");

  if (!category.active) throw new Error("Category already deleted");

  // Check if category has active skills
  const skillsCount = await SkillTag.countDocuments({
    category: categoryId,
    active: true,
  });
  if (skillsCount > 0)
    throw new Error("Cannot delete category with existing skills");

  category.active = false;
  await category.save();
  return category.toObject();
};

// ---------- Skills ----------
export const getSkillsService = async (query = null, categoryId = null) => {
  let filter = { active: true };

  if (categoryId) filter.category = categoryId;

  if (query) {

    if (mongoose.Types.ObjectId.isValid(query)) {
      filter._id = query;
    } else {
      const trimmedQuery = query.trim();
      const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedQuery, "i");
      const matchedCategories = await Category.find({
        name: searchRegex,
      }).select("_id");

      const matchedCategoryIds = matchedCategories.map((cat) => cat._id);
      filter.$or = [
        { name: searchRegex },
        { synonyms: searchRegex },
        { category: { $in: matchedCategoryIds } }, 
      ];
    }
  }

  const skills = await SkillTag.find(filter)
    .populate("category", "name order")
    .sort({ "category.order": 1, "category.name": 1, order: 1, name: 1 })
    .lean();

  return skills;
};

export const getSkillsByCategoryService = async (categoryId, skillId = null) => {
  return await SkillTag.find({ category: categoryId, active: true })
    .sort({ order: 1, name: 1 })
    .lean();
};

export const getSkillByIdService = async (skillId) => {
  const skill = await SkillTag.findById(skillId);
  if (!skill) throw new Error("Skill not found");
  return skill.toObject();
};

export const createSkillService = async (data) => {
  // Validate name
  data.name = validateName(data.name, "Skill name");

  // Validate category
  const category = await Category.findOne({
    _id: data.category,
    active: true,
  });
  if (!category) throw new Error("Category not found or inactive");

  // Validate order (admin provides)
  validateOrder(data.order);

  // Check if skill name already exists in same category
  const existingSkill = await SkillTag.findOne({
    name: { $regex: new RegExp(`^${data.name}$`, "i") },
    category: data.category,
    active: true,
  });
  if (existingSkill)
    throw new Error("Skill with this name already exists in this category");

  // Generate slug if not provided
  if (!data.slug) {
    data.slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  // Check if slug already exists globally
  const existingSlug = await SkillTag.findOne({
    slug: data.slug,
    active: true,
  });
  if (existingSlug) throw new Error("Skill with this slug already exists");

  const skill = await SkillTag.create(data);
  return skill.toObject();
};

export const updateSkillService = async (skillId, data) => {
  const skill = await SkillTag.findById(skillId);
  if (!skill) throw new Error("Skill not found");
  if (!skill.active) throw new Error("Cannot update a deleted skill");

  // Validate name if provided
  if (data.name) data.name = validateName(data.name, "Skill name");

  // Validate order if provided
  validateOrder(data.order);

  // Validate category if being updated
  if (data.category) {
    const category = await Category.findById(data.category);
    if (!category) throw new Error("Category not found");
  }

  const updated = await SkillTag.findByIdAndUpdate(skillId, data, { new: true });
  return updated.toObject();
};

export const deleteSkillService = async (skillId) => {
  const skill = await SkillTag.findById(skillId);
  if (!skill) throw new Error("Skill not found");
  if (!skill.active) throw new Error("Skill already deleted");

  skill.active = false;
  await skill.save();
  return skill.toObject();
};