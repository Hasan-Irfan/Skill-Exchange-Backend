/**
 * ONE-TIME SETUP SCRIPT
 * Creates the Gemini system user in MongoDB
 * 
 * Usage:
 *   node scripts/createGeminiUser.js
 * 
 * After running, copy the generated _id and add to .env:
 *   GEMINI_USER_ID=<the_object_id_here>
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import User from "../src/model/user.model.js";

dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/skill-exchange";

async function createGeminiUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Check if Gemini user already exists
    const existing = await User.findOne({ 
      $or: [
        { username: "gemini" },
        { email: "gemini@system.local" }
      ]
    });

    if (existing) {
      console.log("\n✅ Gemini user already exists!");
      console.log(`   User ID: ${existing._id}`);
      console.log(`   Username: ${existing.username}`);
      console.log(`   Email: ${existing.email}`);
      console.log("\n📝 Add this to your .env file:");
      console.log(`   GEMINI_USER_ID=${existing._id}`);
      await mongoose.disconnect();
      return;
    }

    // Generate random password hash (never used, but required by schema)
    const randomPassword = Math.random().toString(36).slice(-16);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Create Gemini system user
    const geminiUser = await User.create({
      username: "gemini",
      email: "gemini@system.local",
      password: hashedPassword,
      role: "user",
      status: "active",
      isVerified: true, // System user is always verified
      bio: "AI Assistant powered by Google Gemini",
      avatarUrl: null, // Can add AI avatar URL later
    });

    console.log("\n✅ Gemini system user created successfully!");
    console.log(`   User ID: ${geminiUser._id}`);
    console.log(`   Username: ${geminiUser.username}`);
    console.log(`   Email: ${geminiUser.email}`);
    console.log("\n📝 Add this to your .env file:");
    console.log(`   GEMINI_USER_ID=${geminiUser._id}`);
    console.log("\n⚠️  IMPORTANT: Never delete this user or change its _id!");

    await mongoose.disconnect();
    console.log("\n✅ Done!");
  } catch (error) {
    console.error("\n❌ Error creating Gemini user:", error.message);
    if (error.code === 11000) {
      console.error("   User with this username or email already exists.");
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

createGeminiUser();

