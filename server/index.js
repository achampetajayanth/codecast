require('dotenv').config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { exec } = require("child_process");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Enable CORS
app.use(cors());
app.use(express.json());

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Temporary Directory for code execution
const tempDir = path.join(__dirname, "temp");
fs.mkdir(tempDir, { recursive: true }).catch(console.error);

const LANGUAGE_CONFIGS = {
  javascript: { extension: "js" },
  python: { extension: "py" },
  java: { extension: "java" },
  cpp: { extension: "cpp" }
};

const userSocketMap = {};

// Function to get connected clients in a room
const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => ({
      socketId,
      username: userSocketMap[socketId],
    })
  );
};

// Function to compile and run code
const compileAndRun = async (code, language) => {
  const fileName = `temp_${Date.now()}.${LANGUAGE_CONFIGS[language].extension}`;
  const filePath = path.join(tempDir, fileName);

  try {
    await fs.writeFile(filePath, code);

    switch (language) {
      case "javascript":
        return new Promise((resolve, reject) => {
          exec(`node ${filePath}`, (error, stdout, stderr) => {
            if (error) return reject(stderr || error.message);
            resolve(stdout);
          });
        });

      case "python":
        return new Promise((resolve, reject) => {
          exec(`python ${filePath}`, (error, stdout, stderr) => {
            if (error) return reject(stderr || error.message);
            resolve(stdout);
          });
        });

      case "java":
        return new Promise((resolve, reject) => {
          exec(`javac ${filePath} && java -cp ${tempDir} Main`, (error, stdout, stderr) => {
            if (error) return reject(stderr || error.message);
            resolve(stdout);
          });
        });

      case "cpp":
        const outputPath = path.join(tempDir, "output");
        return new Promise((resolve, reject) => {
          exec(`g++ ${filePath} -o ${outputPath} && ${outputPath}`, (error, stdout, stderr) => {
            if (error) return reject(stderr || error.message);
            resolve(stdout);
          });
        });

      default:
        throw new Error("Unsupported language");
    }
  } finally {
    try {
      await fs.unlink(filePath);
    } catch (e) {
      console.error("Cleanup failed:", e);
    }
  }
};

// WebSocket Events
io.on("connection", (socket) => {
  socket.on("JOIN", ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit("JOINED", {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on("code-change", ({ roomId, code, language }) => {
    socket.broadcast.to(roomId).emit("code-change", { code, language });
  });

  socket.on("output-change", ({ roomId, output }) => {
    socket.to(roomId).emit("output-change", { output });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit("DISCONNECTED", {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
});

// API Endpoint for Code Compilation
app.post("/api/compile", async (req, res) => {
  const { code, language } = req.body;

  try {
    const output = await compileAndRun(code, language);
    res.json({ success: true, output });
  } catch (error) {
    console.error("Compilation Error:", error.message);
    res.json({ success: false, output: error.message });
  }
});

// API Endpoint for Complexity Analysis
app.post("/api/analyze-complexity", async (req, res) => {
  const { code, language } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Analyze the following ${language} code for time and space complexity. Provide the Big O notation for both and a brief explanation:

${code}

Format the response as JSON with keys: timeComplexity, spaceComplexity, and explanation.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const analysisText = response.text();

    try {
      const analysis = JSON.parse(analysisText);
      console.log("Parsed Analysis:", analysis);
      res.json(analysis);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      res.status(500).json({ error: "Failed to parse AI response" });
    }

  } catch (error) {
    console.error("Error analyzing complexity:", error);
    res.status(500).json({ error: "Failed to analyze complexity" });
  }
});

// Start the server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
