import jwt from "jsonwebtoken"
import ApiError from "../utils/ApiError.js";
import { User } from "../model/userModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const jwtVerify = asyncHandler (async (req,res,next) => { 
    
    const token  =  req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","");
    
    if(!token) {
      return res
      .status(401)
      .json({ success: false, message: "Unauthorized Request" });
    }

    try {
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      if(!decodedToken || !decodedToken._id) {
        return res
        .status(401)
        .json({ success: false, message: "Access Denied" });
      }

      const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if(!user) {
          return res
          .status(401)
          .json({ success: false, message: "Invalid Access Token" });
        }

        req.user = user;
        next();
    }
    catch(e) 
    {
      return res
          .status(401)
          .json({ success: false, message: "Invalid Access Token" });
       
    }

})