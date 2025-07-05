const express = require("express");
const cors = require("cors")
const multer = require('multer');
const pdfParse = require('pdf-parse');
const axios = require("axios");
const { router } = require("./router/User");

require("dotenv").config()

const app = express();

app.use(cors());
app.use(express.json())
app.use('/user',router);


const upload = multer({ storage: multer.memoryStorage() });

const otpStore = {}; // { email: { otp, expiresAt } }

app.post("/send-otp", async (req, res) => {
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

app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    const record = otpStore[email];

    if (!record) return res.status(400).json({ error: "OTP not requested" });

    if (Date.now() > record.expiresAt) {
        delete otpStore[email];
        return res.status(400).json({ error: "OTP expired" });
    }

    if (otp !== record.otp) {
        return res.status(400).json({ error: "Invalid OTP" });
    }

    delete otpStore[email]; // clear after successful login
    res.json({ message: "OTP verified successfully" });
});


app.get("/", (req, res) => {
    try {
        res.status(201).json({ "msg": "working" })
    } catch (error) {
        res.status(404).json({ error })
    }
})

app.post('/upload-resume', upload.single('file'), async (req, res) => {
    try {
        const resumeBuffer = req.file.buffer;
        const parsed = await pdfParse(resumeBuffer);
        res.json({ text: parsed.text });
    } catch (err) {
        res.status(500).json({ error: 'Resume parsing failed' });
    }
});


app.post('/ask-question', async (req, res) => {
    const { resumeText, userAnswer } = req.body;

    const prompt = `
        You are a mock interviewer for a resume-based AI assessment tool.
        
        Candidate's Resume:
        ---
        ${resumeText}
        ---
        
        Your task:
        - Generate **10 technical interview questions** for this candidate.
        - The questions must be **strictly based on the resume** provided above.
        - The **first 2 questions** should focus on **easy-level Data Structures & Algorithms (DSA)**.
        - The **remaining 8 questions** should focus on the **candidate's technical skills, tools, libraries, and experience** as mentioned in the resume.
        
        Important rules:
        - Do NOT repeat any question.
        - Do NOT include any answer, explanation, or score.
        - Make sure all questions are diverse and relevant to the candidate's resume.
        
        Respond ONLY in this exact JSON array format:
        [
          { "Question": "..." },
          { "Question": "..." },
          ...
        ]
        Do not include any extra text or formatting outside the JSON.
        `;


    try {
        const result = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'mistralai/mistral-7b-instruct:free',
                messages: [{ role: 'user', content: prompt }],
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const content = result.data.choices[0].message.content;

        // Extract just the question
        console.log("question", content)
        res.json({ questions: content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'AI interview failed' });
    }
});

app.post('/clear-session', (req, res) => {
    const { sessionId } = req.body;
    delete sessionQA[sessionId];
    res.json({ msg: "Session cleared" });
});

app.listen(8000, () => {
    console.log("server is running on 8000")
})