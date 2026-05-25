// Run this once: node src/utils/drop-email-index.js
require("dotenv").config();
const mongoose = require("mongoose");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected");
  try {
    await mongoose.connection.collection("users").dropIndex("email_1");
    console.log("✅ email_1 index dropped");
  } catch (e) {
    console.log("Index may not exist:", e.message);
  }
  await mongoose.disconnect();
  process.exit(0);
}

run();