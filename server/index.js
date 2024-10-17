require('dotenv').config();
const express = require("express");
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());  // Middleware to parse JSON bodies

const tempDir = path.join(__dirname, 'temp');

// Ensure temp directory exists
fs.mkdir(tempDir, { recursive: true });

const LANGUAGE_CONFIGS = {
  javascript: { extension: 'js' },
  python: { extension: 'py' },
  java: { extension: 'java' },
  cpp: { extension: 'cpp' }
};

const userSocketMap = {};
const getAllConnectedClients = (roomId) => {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
      (socketId) => {
        return {
          socketId,
          username: userSocketMap[socketId],
        };
      }
    );
};

const compileAndRun = async (code, language) => {
  const fileName = `temp_${Date.now()}.${LANGUAGE_CONFIGS[language].extension}`;
  const filePath = path.join(tempDir, fileName);

  try {
    await fs.writeFile(filePath, code);

    switch (language) {
      case 'javascript':
        return new Promise((resolve, reject) => {
          exec(`node ${filePath}`, (error, stdout, stderr) => {
            if (error) return reject(stderr || error.message);
            resolve(stdout);
          });
        });

      case 'python':
        return new Promise((resolve, reject) => {
          exec(`python ${filePath}`, (error, stdout, stderr) => {
            if (error) return reject(stderr || error.message);
            resolve(stdout);
          });
        });

      case 'java':
        return new Promise((resolve, reject) => {
          exec(`javac ${filePath} && java -cp ${tempDir} Main`, (error, stdout, stderr) => {
            if (error) return reject(stderr || error.message);
            resolve(stdout);
          });
        });

      case 'cpp':
        const outputPath = path.join(tempDir, 'output');
        return new Promise((resolve, reject) => {
          exec(`g++ ${filePath} -o ${outputPath} && ${outputPath}`, (error, stdout, stderr) => {
            if (error) return reject(stderr || error.message);
            resolve(stdout);
          });
        });

      default:
        throw new Error('Unsupported language');
    }
  } finally {
    try {
      await fs.unlink(filePath);  // Clean up temporary file
    } catch (e) {
      console.error('Cleanup failed:', e);
    }
  }
};

io.on("connection", (socket) => {
  socket.on('JOIN', ({ roomId, username }) => {
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
    socket.in(roomId).emit("code-change", { code, language });
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

app.post('/api/compile', async (req, res) => {
  const { code, language } = req.body;

  try {
    const output = await compileAndRun(code, language);
    res.json({ success: true, output });
  } catch (error) {
    console.error('Compilation Error:', error.message); // Log the error for debugging
    res.json({ success: false, output: error.message });
  }
});

app.post('/api/analyze-complexity', async (req, res) => {
  const { code, language } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Analyze the following ${language} code for time and space complexity. Provide the Big O notation for both and a brief explanation:

${code}

Format the response as JSON with keys: timeComplexity, spaceComplexity, and explanation.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const analysisText = response.text();
    
    // Attempt to parse the JSON response
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
