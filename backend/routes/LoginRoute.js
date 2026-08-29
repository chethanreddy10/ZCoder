const express = require("express");
const router = express.Router();
require("dotenv").config();
const bcrypt = require("bcrypt");
const User = require("../models/UserModel");
const auth = require("../middleware/auth");
const { signToken } = require("../config/auth");

router.post("/register/", async (request, response) => {
  try {
    const username = request.body.username?.trim();
    const password = request.body.password;
    const email = request.body.email?.trim().toLowerCase();
    if (!username || !email || typeof password !== "string" || password.length < 8) {
      return response.status(400).json({ error: "Username, email, and a password of at least 8 characters are required" });
    }
    const existingUser = await User.exists({ $or: [{ Username: username }, { email }] });
    if (existingUser) return response.status(409).json({ error: "Username or email already exists" });
    const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = new User({
        Username: username,
        HashedPassword: hashedPassword,
        email: email,
        codeforcesHandle: "",
        name: '',
        phoneNumber: '',
        profilePicture: 'https://static.vecteezy.com/system/resources/thumbnails/019/879/186/small_2x/user-icon-on-transparent-background-free-png.png',
        programmingLanguages: [],
        skills: [],
        role: '',
        location: '',
        degrees: [],
        experience: [],
        languages: [],
      });
    await newUser.save();
    return response.status(201).json({ message: "User created successfully" });
  } catch (err) {
    if (err?.code === 11000) return response.status(409).json({ error: "Username or email already exists" });
    console.error("Registration error:", err);
    return response.status(500).json({ error: "Unable to register user" });
  }
});

router.post("/login/", async (req, res) => {
  const { username, password } = req.body;
  if (typeof username !== "string" || typeof password !== "string") return res.status(400).json({ error: "Invalid credentials" });
  const dbuser = await User.findOne({ Username: username.trim() }).select("+HashedPassword");
  
  if (!dbuser) {
    return res.status(400).json({ error: "Invalid user" }); // Return JSON response
  }

  const checkPw = await bcrypt.compare(password, dbuser.HashedPassword);
  if (checkPw) {
    const payload = {
      username: username,
      user_id: dbuser._id.toString(), // Corrected to use dbuser._id
    };
    const jwtoken = signToken(payload);
    return res.json({ token: jwtoken }); // Return as JSON
  } else {
    return res.status(400).json({ error: "Invalid password" }); // Return JSON response
  }
});

router.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.user_id);
    // console.log(req.user.user_id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
