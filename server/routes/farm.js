const express = require("express");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/farm/profile
// @desc    Get farm profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    res.json({
      farmProfile: req.user.farmProfile,
      isProfileComplete: req.user.isProfileComplete,
    });
  } catch (error) {
    console.error("Get farm profile error:", error);
    res.status(500).json({ message: "Error fetching farm profile" });
  }
});

// @route   PUT /api/farm/profile
// @desc    Update farm profile
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const {
      farmName,
      farmSize,
      location,
      soilType,
      waterAvailability,
      currentCrop,
      sowingDate,
      isNotDecided,
    } = req.body;

    // Update farm profile
    const updateData = {
      "farmProfile.farmName": farmName,
      "farmProfile.farmSize": farmSize,
      "farmProfile.location": location,
      "farmProfile.soilType": soilType,
      "farmProfile.waterAvailability": waterAvailability,
      "farmProfile.currentCrop": currentCrop,
      "farmProfile.sowingDate": isNotDecided ? null : sowingDate,
      "farmProfile.isNotDecided": isNotDecided,
      isProfileComplete: true,
    };

    const user = await req.user.constructor.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true }
    );

    res.json({
      message: "Farm profile updated successfully",
      farmProfile: user.farmProfile,
      isProfileComplete: user.isProfileComplete,
    });
  } catch (error) {
    console.error("Update farm profile error:", error);
    res.status(500).json({ message: "Error updating farm profile" });
  }
});

module.exports = router;
