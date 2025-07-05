const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { User } = require("../models/UserModel");

const router = express.Router();


router.get("/", (req, res) => {
    res.send("user")
})

const otpStore = {}; // { email: { otp, expiresAt } }

router.post("/send-otp", async (req, res) => {
    const { name, email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000, // expires in 5 min
    };
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SENDER_EMAIL,
            pass: process.env.SENDER_PASSWORD,
        },
    });
    // const mailOptions = {
    //     from: process.env.SENDER_EMAIL,
    //     to: email,
    //     subject: 'Welcome to AI Interviewer - Verify Your Email',
    //     text: `
    //         Hello ${name},

    //         Welcome to **AI Interviewer** – your smart assistant for mastering technical interviews!

    //         To get started, please verify your email using the OTP below:

    //         🔐 OTP: ${otp}

    //         This code is valid for **5 minutes**.

    //         If you didn’t request this, feel free to ignore this message. No action will be taken.

    //         Best of luck with your interview journey!

    //         Cheers,  
    //         The AI Interviewer Team
    //         `
    // };

    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: 'Welcome to AI Interviewer - Verify Your Email',
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #4A90E2;">Welcome to AI Interviewer, ${name} 👋</h2>
              <p style="font-size: 16px; color: #333333;">
                We're excited to have you on board! AI Interviewer helps you practice real interview questions, receive smart feedback, and boost your confidence.
              </p>
              <p style="font-size: 16px; color: #333333;">To continue, please verify your email using the OTP below:</p>
              <div style="margin: 20px 0; text-align: center;">
                <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; background: #f0f0f0; padding: 12px 24px; border-radius: 8px; display: inline-block; color: #222222;">
                  ${otp}
                </span>
              </div>
              <p style="font-size: 14px; color: #666666;">
                🔒 This OTP is valid for <strong>5 minutes</strong>.
              </p>
              <p style="font-size: 14px; color: #999999; margin-top: 30px;">
                If you didn’t request this email, you can safely ignore it.
              </p>
              <p style="font-size: 14px; color: #333333; margin-top: 40px;">Cheers,</p>
              <p style="font-size: 14px; color: #4A90E2; font-weight: bold;">The AI Interviewer Team</p>
            </div>
          </div>
        `
    };


    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'OTP sent successfully!' });
});

// SIGNUP API
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "User already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });

        await newUser.save();

        return res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// LOGIN API (OTP-Based Login with Password Verification)
router.post('/login', async (req, res) => {
    try {
        const { email, password, otp } = req.body;

        const otpRecord = otpStore[email];

        if (!otpRecord) {
            return res.status(400).json({ message: "OTP not requested" });
        }

        if (Date.now() > otpRecord.expiresAt) {
            delete otpStore[email];
            return res.status(400).json({ message: "OTP has expired" });
        }

        if (otp !== otpRecord.otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: "Incorrect password" });
        }

        delete otpStore[email]; // clear OTP after successful login

        const token = jwt.sign(
            { id: user._id, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = { router }
