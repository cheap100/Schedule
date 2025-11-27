import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";

// --- Icons ---
const MicIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const StopIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" ry="2" strokeWidth={2} />
  </svg>
);

const CameraIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ChevronLeft = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRight = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const XIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// --- Helpers ---
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const generateTimeOptions = () => {
  const times = [];
  for (let i = 0; i < 24; i++) {
    const hour = String(i).padStart(2, '0');
    times.push(`${hour}:00`);
    times.push(`${hour}:30`);
  }
  return times;
};

// --- Main App ---

interface Event {
  id: string;
  time: string;
  text: string;
  alerted: boolean;
}

const App = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Record<string, Event[]>>({});
  
  // UI State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // Event Form State
  const [newEventTime, setNewEventTime] = useState("09:00");
  const [newEventText, setNewEventText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  
  // Alarm State
  const [alarmActive, setAlarmActive] = useState<{ text: string, time: string } | null>(null);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordingMimeTypeRef = useRef<string>("");

  // Initialize Audio Context for Beep
  useEffect(() => {
    const audio = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");
    audio.loop = true;
    alarmAudioRef.current = audio;
  }, []);

  // Alarm Check Loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dateString = formatDate(now);
      
      const daysEvents = events[dateString] || [];
      
      const triggeringEventIndex = daysEvents.findIndex(e => e.time === timeString && !e.alerted);
      
      if (triggeringEventIndex !== -1) {
        const event = daysEvents[triggeringEventIndex];
        
        // Trigger Alarm
        setAlarmActive({ text: event.text, time: event.time });
        alarmAudioRef.current?.play().catch(e => console.error("Audio play failed (interaction required)", e));
        
        // Mark as alerted
        const updatedEvents = [...daysEvents];
        updatedEvents[triggeringEventIndex] = { ...event, alerted: true };
        setEvents(prev => ({ ...prev, [dateString]: updatedEvents }));
      }
    }, 1000); 

    return () => clearInterval(interval);
  }, [events]);

  const stopAlarm = () => {
    setAlarmActive(null);
    alarmAudioRef.current?.pause();
    if (alarmAudioRef.current) alarmAudioRef.current.currentTime = 0;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
    setNewEventText("");
    setIsEventModalOpen(true); // Open modal immediately
  };

  const closeEventModal = () => {
    setIsEventModalOpen(false);
    if (isRecording) {
      stopRecording();
    }
  };

  const handleAddEvent = () => {
    if (!newEventText.trim()) return;
    
    const dateKey = formatDate(selectedDate);
    const newEvent: Event = {
      id: Date.now().toString(),
      time: newEventTime,
      text: newEventText,
      alerted: false
    };
    
    setEvents(prev => {
      const current = prev[dateKey] || [];
      const updated = [...current, newEvent].sort((a, b) => a.time.localeCompare(b.time));
      return { ...prev, [dateKey]: updated };
    });
    
    setNewEventText("");
  };

  const handleDeleteEvent = (id: string) => {
    const dateKey = formatDate(selectedDate);
    setEvents(prev => ({
      ...prev,
      [dateKey]: prev[dateKey].filter(e => e.id !== id)
    }));
  };

  // --- Voice Logic ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check supported MIME types
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
      
      recordingMimeTypeRef.current = mimeType;
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const capturedMimeType = recordingMimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: capturedMimeType });
        
        if (audioBlob.size > 0) {
            await transcribeAudio(audioBlob, capturedMimeType);
        } else {
            console.warn("Audio blob is empty");
            alert("녹음된 소리가 없습니다. 다시 시도해주세요.");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("마이크 권한이 필요합니다. 브라우저 설정에서 권한을 확인해주세요.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const transcribeAudio = async (audioBlob: Blob, mimeType: string) => {
    setTranscribing(true);
    try {
      const base64Audio = await blobToBase64(audioBlob);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Clean up mimeType for API (remove codecs)
      const cleanMimeType = mimeType.split(';')[0]; 
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: cleanMimeType, data: base64Audio } },
            { text: "사용자가 말한 내용을 정확한 한국어 텍스트로 받아쓰기해줘. 다른 설명은 하지 말고 텍스트만 출력해." }
          ]
        }
      });

      const text = response.text;
      if (text) {
          setNewEventText(prev => (prev ? prev + " " + text : text));
      }
    } catch (error) {
      console.error("Transcription error:", error);
      alert(`음성 인식 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
    } finally {
      setTranscribing(false);
    }
  };

  // --- Render Calendar ---
  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 border border-gray-100"></div>);
    }
    
    const today = new Date();
    const isToday = (d: number) => 
      today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
      
    const isSelected = (d: number) =>
      selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = formatDate(new Date(year, month, d));
      const hasEvents = events[dateKey]?.length > 0;
      
      let containerClass = "h-24 p-1 border border-gray-100 cursor-pointer transition-all flex flex-col relative ";
      
      // Styling logic
      if (isSelected(d)) {
         // Selected: Distinct Yellow background, Stronger border
         containerClass += "bg-yellow-50 border-yellow-400 ring-2 ring-yellow-300 ring-inset z-10 shadow-md";
      } else if (isToday(d)) {
         // Today: Distinct Blue background
         containerClass += "bg-blue-50 border-blue-300";
      } else {
         // Normal
         containerClass += "bg-white hover:bg-gray-50";
      }

      days.push(
        <div 
          key={d} 
          onClick={() => handleDateClick(d)}
          className={containerClass}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`text-sm rounded-full w-6 h-6 flex items-center justify-center font-bold ${isToday(d) ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
              {d}
            </span>
            {hasEvents && (
               <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
            )}
          </div>
          
          <div className="flex-1 overflow-hidden w-full space-y-0.5">
            {events[dateKey]?.slice(0, 4).map((ev, idx) => (
              <div key={idx} className="px-1.5 py-0.5 text-[9px] font-medium bg-indigo-50 text-indigo-700 rounded-md truncate border border-indigo-100">
                {ev.text}
              </div>
            ))}
            {events[dateKey]?.length > 4 && (
               <div className="text-[9px] text-gray-400 pl-1">+더보기</div>
            )}
          </div>
        </div>
      );
    }
    return days;
  };

  const handleCameraClick = () => {
    document.getElementById('cameraInput')?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert("사진이 촬영되었습니다.");
    }
  };

  const openGlobalMic = () => {
    // If not on a date, default to today
    if (!isEventModalOpen) {
       setSelectedDate(new Date());
       setIsEventModalOpen(true);
       // Small timeout to let modal open then start recording could be added, 
       // but user probably wants to see the UI first.
       setTimeout(() => {
          document.getElementById('eventInput')?.focus();
       }, 100);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20">
      {/* Top Bar */}
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-blue-600 tracking-tight flex items-center">
             📅 마이캘린더
          </h1>
          
          <div className="flex items-center space-x-3">
             {/* Global Voice: Opens modal for today */}
            <button onClick={openGlobalMic} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:text-blue-500 hover:bg-blue-50 transition shadow-sm">
              <MicIcon className="w-5 h-5" />
            </button>

            {/* Camera */}
            <button onClick={handleCameraClick} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:text-blue-500 hover:bg-blue-50 transition shadow-sm relative">
              <CameraIcon className="w-5 h-5" />
              <input 
                type="file" 
                id="cameraInput" 
                accept="image/*" 
                capture="environment" 
                className="hidden"
                onChange={handleFileChange}
              />
            </button>
            
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Calendar Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="p-4 flex items-center justify-between bg-white border-b border-gray-100">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
              <ChevronLeft />
            </button>
            <h2 className="text-xl font-bold text-gray-800">
              {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
            </h2>
            <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
              <ChevronRight />
            </button>
          </div>
          
          <div className="grid grid-cols-7 bg-white">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
              <div key={day} className={`h-8 flex items-center justify-center text-xs font-bold ${i===0 ? 'text-red-500' : 'text-gray-500'}`}>
                {day}
              </div>
            ))}
            {renderCalendarDays()}
          </div>
        </div>

      </main>

      {/* Event Input Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeEventModal}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
             {/* Modal Header */}
            <div className="bg-blue-600 px-5 py-4 flex justify-between items-center shadow-md">
               <div>
                  <span className="text-xs font-medium text-blue-100 uppercase tracking-wider block mb-0.5">선택된 날짜</span>
                  <h3 className="text-xl font-bold text-white">
                    {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
                  </h3>
               </div>
               <button 
                  onClick={closeEventModal}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition"
               >
                 <XIcon />
               </button>
            </div>

            <div className="p-5">
              {/* Event List */}
              <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto">
                {(!events[formatDate(selectedDate)] || events[formatDate(selectedDate)].length === 0) ? (
                  <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-gray-400 text-sm">등록된 일정이 없습니다.</p>
                    <p className="text-gray-300 text-xs mt-1">새로운 일정을 추가해보세요!</p>
                  </div>
                ) : (
                  events[formatDate(selectedDate)].map(event => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 transition-colors group">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${event.alerted ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
                          {event.time}
                        </span>
                        <span className="text-gray-700 text-sm truncate">{event.text}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-gray-300 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Event Form */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-xs font-bold text-gray-500 mb-2">
                  새 일정 추가
                </label>
                <div className="flex space-x-2 mb-3">
                  <select 
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 min-w-[90px]"
                  >
                    {generateTimeOptions().map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  
                  <div className="flex-1 relative">
                    <input
                      id="eventInput"
                      type="text"
                      value={newEventText}
                      onChange={(e) => setNewEventText(e.target.value)}
                      placeholder={isRecording ? "듣고 있습니다..." : "내용 입력"}
                      className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pr-10"
                      autoFocus
                    />
                    {/* Inline Mic Button */}
                    <button 
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={transcribing}
                      className={`absolute right-1 top-1 p-1.5 rounded-md transition-all ${
                        isRecording 
                          ? 'bg-red-500 text-white animate-pulse shadow-md' 
                          : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      {isRecording ? <StopIcon className="w-4 h-4" /> : <MicIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                {transcribing && (
                   <div className="flex items-center space-x-2 mb-2 text-xs text-blue-600 font-medium animate-pulse">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                      <span>음성 변환 중...</span>
                   </div>
                )}

                <button 
                  onClick={handleAddEvent}
                  className="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-bold rounded-lg text-sm px-5 py-3 text-center shadow-md transition-all active:scale-[0.98]"
                >
                  일정 저장 + 알람 설정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alarm Modal */}
      {alarmActive && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center relative overflow-hidden">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 animate-bounce">
               <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
               </svg>
            </div>
            <h3 className="text-3xl font-extrabold text-gray-900 mb-2">{alarmActive.time}</h3>
            <p className="text-gray-500 uppercase text-xs font-bold tracking-widest mb-4">ALARM</p>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
               <p className="text-xl font-medium text-gray-800 break-keep leading-relaxed">
                  "{alarmActive.text}"
               </p>
            </div>
            <button 
              onClick={stopAlarm}
              className="w-full text-white bg-red-500 hover:bg-red-600 font-bold rounded-xl text-lg px-5 py-4 shadow-lg shadow-red-200 transition transform hover:scale-[1.02] active:scale-95"
            >
              알람 끄기
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);