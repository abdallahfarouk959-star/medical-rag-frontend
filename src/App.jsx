import { useState, useRef } from 'react';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Welcome to the Medical RAG System! Please upload a clinical guideline PDF to get started.' }
  ]);
  const [input, setInput] = useState('');
  const [evidence, setEvidence] = useState([]);

  const [isUploading, setIsUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // 🟢 حالة تحميل للإجابة
  const fileInputRef = useRef(null);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file only.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:8000/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Success! "${file.name}" has been uploaded and processed into ${data.chunks_created} chunks. You can now ask questions.`
        }]);
      } else {
        alert(`Error: ${data.detail}`);
      }
    } catch (error) {
      alert('Failed to connect to the server. Is the backend running?');
      console.error(error);
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  // 🟢 دالة إرسال السؤال واستقبال الإجابة والأدلة
  const handleSend = async () => {
    if (!input.trim()) return;

    const userQuery = input;
    // إضافة رسالة اليوزر وتفريغ المربع
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setInput('');
    setIsTyping(true);

    try {
      // إرسال الطلب للـ API
      const response = await fetch('http://127.0.0.1:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuery, top_k: 3 })
      });

      const data = await response.json();

      if (response.ok) {
        // إضافة رد الـ AI للشات
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.recommendation
        }]);

        // تحديث لوحة الأدلة بالـ Chunks اللي رجعت
        if (data.evidence_panel) {
          setEvidence(data.evidence_panel);
        } else {
          setEvidence([]); // تفريغ اللوحة لو مفيش أدلة (زي في حالة الرفض)
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.detail}` }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Failed to reach the server.' }]);
    } finally {
      setIsTyping(false);
    }
  };
  const handleClearDB = async () => {
    if (!window.confirm("Are you sure you want to delete all stored documents?")) return;
    try {
      const response = await fetch('http://127.0.0.1:8000/clear', { method: 'POST' });
      if (response.ok) {
        setMessages([{ role: 'assistant', content: '🗑️ Database cleared! You can upload a fresh PDF now.' }]);
        setEvidence([]);
      }
    } catch (error) {
      alert('Failed to clear database.');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-slate-50 text-gray-900'
      }`}>

      {/* 1. Header */}
      <header className={`shadow-sm border-b p-4 flex justify-between items-center z-10 transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
        <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-900'
          }`}>
          🩺 Medical RAG System
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full text-xl transition ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            title="Toggle Dark/Light Mode"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>

          <input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className={`px-5 py-2 rounded-md shadow transition font-medium flex items-center gap-2 ${isUploading
                ? 'bg-gray-500 cursor-not-allowed text-gray-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
          >
            {isUploading ? '⏳ Uploading...' : '📁 Upload PDF'}
          </button>
          <button
            onClick={handleClearDB}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition font-medium"
          >
            Clear DB
          </button>
        </div>
      </header>

      {/* 2. Main Layout (Chat & Evidence) */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 flex flex-col lg:flex-row gap-6 overflow-hidden">

        {/* === الجانب الأيسر: Chat Area === */}
        <div className={`flex-1 flex flex-col border rounded-xl shadow-sm overflow-hidden lg:w-3/5 transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-100 rounded-bl-none'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {/* 🟢 مؤشر التحميل */}
            {isTyping && (
              <div className="flex justify-start">
                <div className={`max-w-[80%] rounded-2xl p-4 rounded-bl-none animate-pulse ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                  }`}>
                  Synthesizing medical evidence...
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className={`border-t p-4 transition-colors duration-300 ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-100 bg-gray-50'
            }`}>
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSend()}
                placeholder="Ask a medical question based on the guidelines..."
                disabled={isTyping}
                className={`flex-1 border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isDarkMode
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } ${isTyping ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <button
                onClick={handleSend}
                disabled={isTyping}
                className={`px-6 py-3 rounded-lg font-medium transition ${isTyping
                    ? 'bg-blue-400 cursor-not-allowed text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* === الجانب الأيمن: Evidence Panel === */}
        <div className={`w-full lg:w-2/5 border rounded-xl shadow-sm flex flex-col overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <div className={`border-b p-4 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-100 border-gray-200'
            }`}>
            <h2 className={`font-semibold flex items-center gap-2 ${isDarkMode ? 'text-gray-100' : 'text-slate-700'
              }`}>
              📑 Evidence Panel & Citations
            </h2>
          </div>

          {/* 🟢 Evidence List Mapping */}
          <div className={`flex-1 overflow-y-auto p-4 transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-slate-50'
            }`}>
            {evidence.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-center p-4">
                <p>No evidence loaded yet.<br />Ask a question to see retrieved chunks here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {evidence.map((chunk, index) => (
                  <div key={index} className={`p-4 rounded-lg border shadow-sm transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                    }`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'
                        }`}>
                        Page: {chunk.metadata?.page_number || 'N/A'}
                      </span>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        ID: {chunk.metadata?.chunk_id || 'N/A'}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                      "{chunk.text}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;