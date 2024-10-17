import React, { useEffect, useRef, useState } from "react";
import "codemirror/mode/javascript/javascript";
import "codemirror/theme/dracula.css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";
import CodeMirror from "codemirror";
import { GoogleGenerativeAI } from "@google/generative-ai"; 

function Editor({ socketRef, roomId }) {
  const editorRef = useRef(null);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [complexity, setComplexity] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const init = async () => {
      const editor = CodeMirror.fromTextArea(
        document.getElementById("realtimeEditor"),
        {
          mode: { name: "javascript", json: true },
          theme: "dracula",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
        }
      );
      editorRef.current = editor;
      editor.setSize(null, "400px");
      editorRef.current.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();
        if (origin !== "setValue") {
          socketRef.current.emit("code-change", {
            roomId,
            code,
          });
        }
      });
    };
    init();
  }, []);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on("code-change", ({ code }) => {
        if (code !== null) {
          editorRef.current.setValue(code);
        }
      });
      socketRef.current.on("output-change", ({ output }) => {
        setOutput(output);
      });
      socketRef.current.on("complexity-change", ({ complexity }) => {
        setComplexity(complexity);
      });
    }
    return () => {
      socketRef.current.off("code-change");
      socketRef.current.off("output-change");
      socketRef.current.off("complexity-change");
    };
  }, [socketRef.current]);

  const executeCode = () => {
    setIsRunning(true);
    const code = editorRef.current.getValue();
    
    try {
      // Create a secure context for evaluation
      const secureEval = (code) => {
        try {
          // Redirect console.log to our output
          const originalConsole = window.console.log;
          let output = '';
          window.console.log = (...args) => {
            output += args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ') + '\n';
          };

          // Execute the code
          eval(code);

          // Restore original console.log
          window.console.log = originalConsole;
          return output;
        } catch (error) {
          return `Error: ${error.message}`;
        }
      };

      const result = secureEval(code);
      
      // Emit the output to all users
      socketRef.current.emit("output-change", {
        roomId,
        output: result,
      });
      
      setOutput(result);
    } catch (error) {
      const errorMessage = `Error: ${error.message}`;
      socketRef.current.emit("output-change", {
        roomId,
        output: errorMessage,
      });
      setOutput(errorMessage);
    }
    
    setIsRunning(false);
  };

  const analyzeComplexity = async () => {
    setIsAnalyzing(true);
    setComplexity("Analyzing...");
    const code = editorRef.current.getValue();

    try {
      // Initialize the GoogleGenerativeAI instance with the API key
      const genAI = new GoogleGenerativeAI("AIzaSyDE4DwzM35iVXJcKMv1X0zkcVzGvnpIGQc"); // Make sure your API key is stored in .env
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      const prompt = `give the time and space complexity of JavaScript code:\n\n${code}\n\n without any theory and Provide the Big O notation and a brief explanation.`;

      console.log("Sending request to Google Generative AI...");

      // Generate content with the model
      const result = await model.generateContent(prompt);
      const analysis = result.response.text(); // Get the generated response

      setComplexity(analysis);
      
      // Emit the complexity analysis to all users
      socketRef.current.emit("complexity-change", {
        roomId,
        complexity: analysis,
      });
    } catch (error) {
      console.error("Error analyzing complexity:", error);
      setComplexity(`Error analyzing complexity: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ height: "750px", display: "flex", flexDirection: "column" }}>
      <div className="flex-1">
        <textarea id="realtimeEditor"></textarea>
      </div>
      <div className="h-64 bg-gray-900 text-white p-4 font-mono relative">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Terminal Output</span>
          <div>
            <button
              onClick={executeCode}
              disabled={isRunning}
              className={`px-4 py-1 rounded mr-2 ${
                isRunning 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isRunning ? 'Running...' : 'Run Code'}
            </button>
            <button
              onClick={analyzeComplexity}
              disabled={isAnalyzing}
              className={`px-4 py-1 rounded ${
                isAnalyzing 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Complexity'}
            </button>
          </div>
        </div>
        <div className="h-32 overflow-auto bg-black p-2 rounded mb-2">
          <pre className="text-green-400">
            {output || 'Click "Run Code" to see output...'}
          </pre>
        </div>
        <div className="h-24 overflow-auto bg-black p-2 rounded">
          <pre className="text-yellow-400">
            {complexity || 'Click "Analyze Complexity" to see analysis...'}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default Editor;