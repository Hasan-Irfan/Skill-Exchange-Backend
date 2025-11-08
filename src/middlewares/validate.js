export const validateRequest = (schema, source = "body") => {
  return (req, res, next) => {
    const data = source === "query" ? req.query : req.body;
    const { error } = schema.validate(data);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(", ");
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errorMessage
      });
    }
    
    next();
  };
};