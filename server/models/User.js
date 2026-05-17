const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const farmProfileSchema = new mongoose.Schema({
  farmName: { type: String, default: "My Farm" },
  farmSize: { type: Number, default: 1 }, // hectares
  location: {
    lat: { type: Number },
    lng: { type: Number },
    city: { type: String },
  },
  soilType: {
    type: String,
    enum: ["black", "red", "alluvial", "sandy", "clayey", "loamy"],
    default: "alluvial",
  },
  waterAvailability: {
    type: String,
    enum: ["abundant", "moderate", "limited"],
    default: "moderate",
  },
  currentCrop: { type: String, default: "" },
  sowingDate: { type: Date, default: null },
  isNotDecided: { type: Boolean, default: true },
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6,
  },
  farmProfile: {
    type: farmProfileSchema,
    default: () => ({}),
  },
  isProfileComplete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model("User", userSchema);
