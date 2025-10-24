const mongoose= require('mongoose')
const Work = require("../model/work");
const User = require("../model/user");
const Booking=require("../model/BookOrder")
const AdminNotification=require('../model/adminnotification')
const axios = require("axios");
const generateToken = (id) => {
  return `REQ-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`;
};

exports.createWork = async (req, res) => {
  try {
    const { 
      serviceType, 
      specialization, 
      description, 
      location, 
      technicianId, 
      lat, 
      lng 
    } = req.body;

    const clientId = req.user._id;

    if (!serviceType || !specialization || !location)
      return res.status(400).json({ message: "Missing required fields" });

    if (!lat || !lng)
      return res.status(400).json({ message: "Client coordinates (lat, lng) required" });

    // Normalize specialization
    let specs = [];
    if (typeof specialization === "string") {
      specs = specialization.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    } else if (Array.isArray(specialization)) {
      specs = specialization.map(s => s.trim().toLowerCase());
    }

    const normalizedLocation = location.trim().toLowerCase();

    //  Save client's coordinates in user document
    await User.findByIdAndUpdate(clientId, {
      coordinates: { lat, lng },
      lastLocationUpdate: new Date()
    });

    //  Create work with client coordinates
    const work = await Work.create({
      client: clientId,
      serviceType,
      specialization: specs,
      description,
      location: normalizedLocation,
      coordinates: { lat, lng },
      assignedTechnician: technicianId || null,
      status: technicianId ? "taken" : "open",
      token: `REQ-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`
    });

    //  Find matching technicians
    const technicians = await User.find({
      role: "technician",
      specialization: { $in: specs.map(s => new RegExp(s, "i")) },
      location: { $regex: new RegExp(normalizedLocation, "i") }
    }).select("name phone email experience specialization location ratings coordinates");

    //  Attach availability
    const techniciansWithStatus = [];
    for (const tech of technicians) {
      const inWork = await Work.findOne({
        assignedTechnician: tech._id,
        status: { $in: ["taken", "approved"] }
      });

      techniciansWithStatus.push({
        ...tech.toObject(),
        employeeStatus: inWork ? "in work" : "available"
      });
    }

    res.status(201).json({
      message: technicianId
        ? "Work created and assigned to technician"
        : "Work request submitted successfully",
      work,
      matchingTechnicians: techniciansWithStatus.length
        ? techniciansWithStatus
        : "No matching technicians found"
    });

  } catch (err) {
    console.error("Work Creation Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

//  Find Matching Technicians
exports.findMatchingTechnicians = async (req, res) => {
  try {
    let { specialization, location, date } = req.body;

    if (!specialization || !location || !date) {
      return res.status(400).json({ message: "Specialization, location, and date required" });
    }

    // If frontend sends string, convert to array
    if (typeof specialization === "string") {
      specialization = [specialization];
    }

    const workDate = new Date(date);
    if (isNaN(workDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    let specs = [];
    if (typeof specialization === "string") {
      specs = specialization
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
    } else if (Array.isArray(specialization)) {
      specs = specialization.map(s => s.trim().toLowerCase());
    }

    // 🧩 3. Normalize location
    const normalizedLocation = location.trim();

    //  4. Create new work document
    const work = await Work.create({
      client: clientId,
      serviceType,
      specialization: specs,
      description,
      location: normalizedLocation.toLowerCase(),
      date: workDate,
      status: "open",
      token: `REQ-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`
    });

    // 🧩 5. Find matching technicians (case-insensitive + partial location match)
    const technicians = await User.find({
      role: "technician",
      specialization: { $in: specs.map(s => new RegExp(s, "i")) },
      location: { $regex: new RegExp(normalizedLocation, "i") }
    }).select("name phone email experience specialization location ratings");

    //  6. Check technician work status
    const techniciansWithStatus = [];
    for (const tech of technicians) {
      const inWork = await Work.findOne({
        assignedTechnician: tech._id,
        date: workDate,
        status: { $in: ["taken", "approved"] }
      });

      techniciansWithStatus.push({
        ...tech.toObject(),
        employeeStatus: inWork ? "in work" : "available"
      });
    }

    //  7. Save and respond
    await work.save();

    res.status(201).json({
      message: "Work request submitted",
      work,
      matchingTechnicians: techniciansWithStatus.length
        ? techniciansWithStatus
        : "No matching technicians found"
    });

  } catch (err) {
    console.error("Technician Search Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// adjust path/name if needed


exports.bookTechnician = async (req, res) => {
  try {
    const { workId, technicianId, serviceType, description, location, date } = req.body;
    const userId = req.user._id;

    if (!technicianId || !workId) {
      return res.status(400).json({ message: "Work ID and Technician ID are required" });
    }

    const workDate = date ? new Date(date) : new Date();
    if (isNaN(workDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    //  Technician check
    const technician = await User.findById(technicianId);
    if (!technician) {
      return res.status(404).json({ message: "Technician not found" });
    }

    // 🚫 Conflict check — ensure technician is not already working
    const conflict = await Work.findOne({
      assignedTechnician: technicianId,
      status: { $in: ["taken", "dispatch", "inprogress"] }
    });
    if (conflict) {
      return res.status(400).json({ message: "Technician already assigned to another work" });
    }

    //  Create booking record
    const booking = await Booking.create({
      user: userId,
      technician: technicianId,
      serviceType,
      description,
      location,
      date: workDate,
      status: "open"
    });

    //  Assign technician to work
    const updatedWork = await Work.findByIdAndUpdate(
      workId,
      {
        assignedTechnician: technicianId,
        status: "taken"
      },
      { new: true }
    );

    if (!updatedWork) {
      return res.status(404).json({ message: "Work not found for assignment" });
    }

    //  Update technician status to dispatched (they got a new work)
    await User.findByIdAndUpdate(technicianId, {
      technicianStatus: "dispatched",
      onDuty: true,
      $inc: { totalJobs: 1 }
    });

    // 🔹 Optional: Calculate ETA if coordinates are available
    let etaMessage = null;
    if (technician.coordinates?.lat && technician.coordinates?.lng && updatedWork.coordinates?.lat && updatedWork.coordinates?.lng) {
      try {
        const { lat: techLat, lng: techLng } = technician.coordinates;
        const { lat: clientLat, lng: clientLng } = updatedWork.coordinates;

        const orsKey = process.env.ORS_KEY; //  ensure it's uppercase in .env
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${techLng},${techLat}&end=${clientLng},${clientLat}`;
        const resp = await axios.get(url);

        const seconds = resp.data.features[0].properties.summary.duration;
        const minutes = Math.round(seconds / 60);
        etaMessage = `Technician ${technician.name} will arrive in approximately ${minutes} minutes.`;
      } catch (err) {
        console.log("ETA calculation failed:", err.message);
      }
    }

    //  Response
    return res.status(201).json({
      message: "Technician assigned successfully. Awaiting technician acceptance.",
      booking,
      work: updatedWork,
      technicianStatus: "dispatched",
      eta: etaMessage || "ETA not available"
    });

  } catch (err) {
    console.error("Book Technician Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


//  Technician starts work
exports.WorkStart = async (req, res) => {
  try {
    const { workId } = req.body;
    const technicianId = req.user._id;

    
    if (!workId) {
      return res.status(400).json({ message: "Work ID is required" });
    }

    const work = await Work.findById(workId);
    if (!work) {
      return res.status(404).json({ message: "Work not found" });
    }

    if (String(work.assignedTechnician) !== String(technicianId)) {
      return res.status(403).json({ message: "You are not assigned to this work" });
    }

    //  Update work to inprogress
    work.status = "inprogress";
    work.startedAt = new Date();
    await work.save();

    //  Update technician’s personal status
    await User.findByIdAndUpdate(technicianId, {
      technicianStatus: "inprogress",
      onDuty: true,
      availability: false
    });

    //  Update booking status also
    await Booking.findOneAndUpdate(
      { technician: technicianId, user: work.client, status: { $in: ["open", "taken", "dispatch"] } },
      { status: "inprogress" }
    );

    res.status(200).json({
      message: "Technician started the work. Status set to in-progress.",
      work
    });
  } catch (err) {
    console.error("Work Start Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Technician completes work
exports.WorkComplete = async (req, res) => {
  try {
    const { workId } = req.body;
    const technicianId = req.user._id;

    if (!workId) {
      return res.status(400).json({ message: "Work ID is required" });
    }

    const work = await Work.findById(workId);
    if (!work) {
      return res.status(404).json({ message: "Work not found" });
    }

    if (String(work.assignedTechnician) !== String(technicianId)) {
      return res.status(403).json({ message: "You are not assigned to this work" });
    }

    // Update work to completed
    work.status = "completed";
    work.completedAt = new Date();
    await work.save();

    //  Update booking status to completed
    await Booking.findOneAndUpdate(
      {
        technician: technicianId,
        user: work.client,
        status: { $ne: "completed" }
      },
      { status: "completed" },
      { new: true }
    );

    //  Update technician status to available again
    await User.findByIdAndUpdate(technicianId, {
      technicianStatus: "available",
      onDuty: false,
      availability: true
    });

    res.status(200).json({
      message: "Work marked as completed successfully.",
      work
    });
  } catch (err) {
    console.error("Work Complete Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// PATCH /api/technician/update-location

exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const technicianId = req.user._id;

    if (!lat || !lng)
      return res.status(400).json({ message: "Latitude and longitude required" });

    // Update technician coordinates
    await User.findByIdAndUpdate(technicianId, {
      coordinates: { lat, lng },
      lastLocationUpdate: new Date(),
      onDuty: true
    });

    // Find assigned work with status 'taken' or 'approved' (ready to dispatch)
    const work = await Work.findOne({
      assignedTechnician: technicianId,
      status: { $in: ["taken", "approved"] }
    });

    let etaMessage = null;

    if (work) {
      // Update work status to 'dispatch' or 'inprogress'
      if (work.status === "taken" || work.status === "approved") {
        work.status = "dispatch"; // or "inprogress" based on your flow
        await work.save();
      }

      // Calculate ETA using ORS API if coordinates are available
      if (work.coordinates) {
        const orsKey = process.env.ORS_KEY;
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${lng},${lat}&end=${work.coordinates.lng},${work.coordinates.lat}`;

        try {
          const response = await axios.get(url);
          const seconds = response.data.features[0].properties.summary.duration;
          const minutes = Math.round(seconds / 60);
          etaMessage = `Technician will arrive in approximately ${minutes} minutes.`;
        } catch (err) {
          console.log("ETA calculation failed:", err.message);
        }
      }
    }

    res.status(200).json({
      message: "Location updated successfully",
      workStatus: work ? work.status : "No active work",
      eta: etaMessage || "ETA not available"
    });
  } catch (err) {
    console.error("Update Location Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// GET /api/client/track-technician/:workId

exports.trackTechnician = async (req, res) => {
  try {
    const { workId } = req.params;
    const work = await Work.findById(workId).populate("assignedTechnician");

    if (!work || !work.assignedTechnician)
      return res.status(404).json({ message: "Technician not assigned yet" });

    const technician = work.assignedTechnician;
    const client = await User.findById(work.client);

    // ✅ Use coordinates from work (client location)
    const clientLat = work.coordinates?.lat || client.coordinates?.lat;
    const clientLng = work.coordinates?.lng || client.coordinates?.lng;

    if (
      !technician.coordinates?.lat ||
      !technician.coordinates?.lng ||
      !clientLat ||
      !clientLng
    ) {
      return res.status(400).json({ message: "Missing coordinates for route calculation" });
    }

    const orsKey = process.env.ORS_KEY; // make sure env var is UPPERCASE
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${technician.coordinates.lng},${technician.coordinates.lat}&end=${clientLng},${clientLat}`;

    const response = await axios.get(url);
    const route = response.data?.features?.[0];

    if (!route) {
      return res.status(400).json({ message: "Unable to fetch route or invalid coordinates" });
    }

    const seconds = route.properties.summary.duration;
    const minutes = Math.round(seconds / 60);

    res.status(200).json({
      technician: {
        name: technician.name,
        coordinates: technician.coordinates,
        lastUpdate: technician.lastLocationUpdate,
        liveStatus: work.status
      },
      client: {
        name: client.name,
        coordinates: { lat: clientLat, lng: clientLng }
      },
      eta: `${minutes} minutes`
    });

  } catch (err) {
    console.error("Track Technician Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};




exports.getClientWorkStatus = async (req, res) => {
  try {
    const { workId } = req.params;
    const clientId = req.user._id;

    const work = await Work.findById(workId)
      .populate("assignedTechnician", "name phone email technicianStatus coordinates lastLocationUpdate")
      .populate("client", "name phone email coordinates");

    if (!work) {
      return res.status(404).json({ message: "Work not found" });
    }

    if (String(work.client._id) !== String(clientId)) {
      return res.status(403).json({ message: "Not authorized to view this work" });
    }

    // Prepare technician data
    const technician = work.assignedTechnician;
    let eta = "ETA not available";

    // 🔹 Calculate ETA if both coordinates exist
    if (technician?.coordinates?.lat && technician?.coordinates?.lng && work.coordinates?.lat && work.coordinates?.lng) {
      try {
        const orsKey = process.env.ORS_KEY;
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${technician.coordinates.lng},${technician.coordinates.lat}&end=${work.coordinates.lng},${work.coordinates.lat}`;
        const response = await axios.get(url);
        const seconds = response.data.features[0].properties.summary.duration;
        const minutes = Math.round(seconds / 60);
        eta = `${minutes} minutes`;
      } catch (err) {
        console.log("ETA calc failed:", err.message);
      }
    }

    // 🔹 Prepare response object
    const workStatus = {
      workId: work._id,
      token: work.token,
      serviceType: work.serviceType,
      specialization: work.specialization,
      description: work.description,
      location: work.location,
      status: work.status,
      createdAt: work.createdAt,
      startedAt: work.startedAt,
      completedAt: work.completedAt,
      client: {
        name: work.client.name,
        phone: work.client.phone,
        email: work.client.email,
      },
      technician: technician
        ? {
            name: technician.name,
            phone: technician.phone,
            email: technician.email,
            status: technician.technicianStatus,
            coordinates: technician.coordinates,
            lastUpdate: technician.lastLocationUpdate,
          }
        : null,
      eta,
    };

    res.status(200).json({
      message: "Work status fetched successfully",
      workStatus,
    });
  } catch (err) {
    console.error("Client Work Status Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.reportWorkIssue = async (req, res) => {
  try {
    const { workId, issueType, remarks } = req.body;
    const technicianId = req.user._id;

    if (!workId || !issueType) {
      return res.status(400).json({ message: "Work ID and issue type required" });
    }

    const work = await Work.findById(workId).populate("client");
    if (!work) return res.status(404).json({ message: "Work not found" });

    if (String(work.assignedTechnician) !== String(technicianId)) {
      return res.status(403).json({ message: "You are not assigned to this work" });
    }

    // ⚙️ Your existing switch logic (unchanged)
    switch (issueType) {
      case "need_parts":
        work.status = "onhold_parts";
        work.remarks = remarks || "Parts required for repair";
        await work.save();

        console.log(`Parts required for Work ID: ${workId}`);
        break;

      case "need_specialist":
        work.status = "escalated";
        work.remarks = remarks || "Requires senior technician";
        await work.save();

        console.log(`Escalated to supervisor for Work ID: ${workId}`);
        break;

      case "customer_unavailable":
        work.status = "rescheduled";
        work.remarks = remarks || "Customer not available at site";
        await work.save();

        console.log(`Work rescheduled due to customer unavailability`);
        break;

      default:
        return res.status(400).json({ message: "Invalid issue type" });
    }

    // ✅ 🔹 ADD ADMIN NOTIFICATION (only new part)
    try {
      await AdminNotification.create({
        type: "work_issue",
        message: `Technician ${req.user.name || technicianId} reported an issue (${issueType}) for work ${work._id}`,
        work: work._id,
        technician: technicianId,
        issueType,
        remarks: remarks || ""
      });
      console.log(`✅ Admin notified about issue ${issueType} for Work ${workId}`);
    } catch (notifErr) {
      console.error("❌ Admin notification creation failed:", notifErr.message);
    }

    // 🔹 Existing booking & technician update (unchanged)
    await Booking.findOneAndUpdate(
      { technician: technicianId, user: work.client._id },
      { status: work.status }
    );

    await User.findByIdAndUpdate(technicianId, {
      technicianStatus: "pending",
      availability: true
    });

    // 🔹 Final response (unchanged)
    return res.status(200).json({
      message: "Work issue reported successfully.",
      workStatus: work.status,
      remarks: work.remarks
    });

  } catch (err) {
    console.error("Report Work Issue Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAdminNotifications = async (req, res) => {
  
  try {
    const notifications = await AdminNotification.find()
      .sort({ createdAt: -1 })
      .populate("work", "serviceType status location")
      .populate("technician", "name email phone");

    if (!notifications.length) {
      return res.status(200).json({ message: "No notifications found", notifications: [] });
    }

    res.status(200).json({
      message: "Admin notifications fetched successfully",
      count: notifications.length,
      notifications
    });
  } catch (err) {
    console.error("Get Admin Notifications Error:", err.message);
    res.status(500).json({ message: "Server error while fetching notifications" });
  }
};
