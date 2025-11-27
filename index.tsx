
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

// --- Icons ---
const MicIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const StopIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="6" width="12" height="12" rx="2" ry="2" />
  </svg>
);

const PlayIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const CameraIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
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
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const XIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SpeakerIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
  </svg>
);

const MiniPlayIcon = ({ className = "w-3 h-3" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
);

// --- Helpers ---
const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatTime = (date: Date) => {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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

// --- Web Speech API Types ---
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

// --- Main App ---

interface Event {
  id: string;
  time: string;
  text: string;
  alerted: boolean;
}

interface VoiceMemo {
  id: string;
  timestamp: number;
  dateStr: string;
  timeStr: string;
  durationStr: string;
  audioData: string; // Base64
}

const App = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Persistent State: Load events from localStorage on mount
  const [events, setEvents] = useState<Record<string, Event[]>>(() => {
    try {
      const saved = localStorage.getItem('calendar_events');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to load events", e);
      return {};
    }
  });

  // Load Voice Memos from localStorage
  const [voiceMemos, setVoiceMemos] = useState<VoiceMemo[]>(() => {
    try {
      const saved = localStorage.getItem('voice_memos');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load voice memos", e);
      return [];
    }
  });

  // Save events to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('calendar_events', JSON.stringify(events));
    } catch (e) {
      console.error("Failed to save events", e);
    }
  }, [events]);

  // Save voice memos to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('voice_memos', JSON.stringify(voiceMemos));
    } catch (e) {
      console.error("Failed to save voice memos", e);
    }
  }, [voiceMemos]);
  
  // UI State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isVoiceMemoModalOpen, setIsVoiceMemoModalOpen] = useState(false);

  // Event Form State
  const [newEventTime, setNewEventTime] = useState("09:00");
  const [newEventText, setNewEventText] = useState("");
  
  // Event Recording (Speech to Text) State
  const [isEventRecording, setIsEventRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Voice Memo Recorder State
  const [isMemoRecording, setIsMemoRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingMemoId, setPlayingMemoId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const memoTimerRef = useRef<number | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Alarm State
  const [alarmActive, setAlarmActive] = useState<{ text: string, time: string } | null>(null);
  
  // Swipe State
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);
  
  // Refs
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize Audio Context for Beep
  useEffect(() => {
    const audio = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");
    audio.loop = true;
    alarmAudioRef.current = audio;
  }, []);

  // --- TTS Function (Improved) ---
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
        alert("이 브라우저는 음성 안내를 지원하지 않습니다.");
        return;
    }
    
    // Cancel current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Wait a tiny bit to ensuring cancel finishes
    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
    }, 50);
  };

  const speakSchedule = (date: Date, eventList: Event[], isStartup = false) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    let text = "";
    if (isStartup) {
       text = `반갑습니다. 오늘 ${month}월 ${day}일, `;
    } else {
       text = `${month}월 ${day}일 일정을 알려드릴게요. `;
    }

    if (!eventList || eventList.length === 0) {
      if (isStartup) {
        text += "예정된 일정이 없습니다. 즐거운 하루 보내세요.";
      } else {
        text += "등록된 일정이 없습니다.";
      }
    } else {
      text += `총 ${eventList.length}개의 일정이 있습니다. `;
      eventList.forEach((e) => {
        const [h, m] = e.time.split(':');
        const minText = m === '00' ? '' : `${m}분`;
        text += `${h}시 ${minText}, ${e.text}. `;
      });
    }

    speakText(text);
  };

  // Startup Notification
  useEffect(() => {
    const today = new Date();
    const dateKey = formatDate(today);
    const todayEvents = events[dateKey] || [];
    
    // Slight delay to allow UI to render before speaking (if browser allows auto-play)
    const timer = setTimeout(() => {
        if (todayEvents.length > 0 || todayEvents.length === 0) {
           speakSchedule(today, todayEvents, true);
        }
    }, 1000);
    return () => clearTimeout(timer);
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
        alarmAudioRef.current?.play().catch(e => console.error("Audio play failed", e));
        
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
    setIsEventModalOpen(true);

    const dateKey = formatDate(newDate);
    // Auto read schedule on open
    setTimeout(() => {
        speakSchedule(newDate, events[dateKey]);
    }, 500);
  };

  const closeEventModal = () => {
    setIsEventModalOpen(false);
    if (isEventRecording) {
      stopVoiceRecognition();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
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
    alert("일정이 성공적으로 저장되었습니다!");
  };

  const handleDeleteEvent = (id: string) => {
    const dateKey = formatDate(selectedDate);
    setEvents(prev => ({
      ...prev,
      [dateKey]: prev[dateKey].filter(e => e.id !== id)
    }));
  };

  // --- Web Speech API Logic (Text) ---
  const startVoiceRecognition = () => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = true; 
    recognition.interimResults = true; 

    recognition.onstart = () => {
      setIsEventRecording(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
          setNewEventText(prev => prev + " " + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsEventRecording(false);
    };

    recognition.onend = () => {
      if (isEventRecording) setIsEventRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsEventRecording(false);
  };

  const toggleVoiceRecording = () => {
    if (isEventRecording) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition();
    }
  };

  // --- MediaRecorder Logic (Audio) ---
  const startMemoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
         mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
         mimeType = 'audio/mp4'; 
      }

      const options = {
         mimeType: mimeType,
         audioBitsPerSecond: 32000
      };
      
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const finalMimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          
          const now = new Date();
          const durationSec = recordingTime;
          const mins = Math.floor(durationSec / 60);
          const secs = durationSec % 60;
          const durationStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

          const newMemo: VoiceMemo = {
             id: Date.now().toString(),
             timestamp: now.getTime(),
             dateStr: formatDate(now),
             timeStr: formatTime(now),
             durationStr: durationStr,
             audioData: base64data
          };
          
          setVoiceMemos(prev => [newMemo, ...prev]);
          alert("음성 메모가 저장되었습니다.");
        };
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsMemoRecording(true);
      setRecordingTime(0);
      
      memoTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone", err);
      alert("마이크 접근이 허용되지 않았습니다.");
    }
  };

  const stopMemoRecording = () => {
    if (mediaRecorderRef.current && isMemoRecording) {
      mediaRecorderRef.current.stop();
      setIsMemoRecording(false);
      if (memoTimerRef.current) {
        clearInterval(memoTimerRef.current);
        memoTimerRef.current = null;
      }
    }
  };

  const playMemo = async (memo: VoiceMemo) => {
    // Stop any currently playing audio
    if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
    }
    
    // Toggle off if clicking the same one
    if (playingMemoId === memo.id) {
       setPlayingMemoId(null);
       return;
    }

    setPlayingMemoId(memo.id);
    
    try {
        const audio = new Audio(memo.audioData);
        activeAudioRef.current = audio;
        
        audio.onended = () => {
            setPlayingMemoId(null);
            activeAudioRef.current = null;
        };
        
        audio.onerror = (e) => {
            console.error("Audio Playback Error", e);
            alert("재생 중 오류가 발생했습니다. 파일 형식이 호환되지 않을 수 있습니다.");
            setPlayingMemoId(null);
        };

        await audio.play();
    } catch (e) {
        console.error("Play failed", e);
        alert("재생 실패: " + e);
        setPlayingMemoId(null);
    }
  };

  const deleteMemo = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("이 음성 메모를 삭제하시겠습니까?")) {
      setVoiceMemos(prev => prev.filter(m => m.id !== id));
      if (playingMemoId === id) {
        if(activeAudioRef.current) activeAudioRef.current.pause();
        setPlayingMemoId(null);
      }
    }
  };

  // --- Swipe Logic ---
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontal) {
      if (Math.abs(distanceX) > minSwipeDistance) {
         if (distanceX > 0) handleNextMonth(); 
         else handlePrevMonth();
      }
    } else {
      if (Math.abs(distanceY) > minSwipeDistance) {
        if (distanceY > 0) handleNextMonth();
        else handlePrevMonth();
      }
    }
  };

  // --- Render Calendar ---
  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-28 border-r border-b border-gray-100 bg-white"></div>);
    }
    
    const today = new Date();
    const isToday = (d: number) => 
      today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
      
    const isSelected = (d: number) =>
      selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = formatDate(new Date(year, month, d));
      const hasEvents = events[dateKey]?.length > 0;
      const isTodayCell = isToday(d);
      
      let containerClass = "h-28 p-1.5 cursor-pointer transition-all duration-200 flex flex-col relative border-r border-b border-gray-100 ";
      
      if (isSelected(d)) {
         containerClass += "bg-teal-50 z-10 ring-2 ring-inset ring-teal-200 shadow-inner";
      } else {
         containerClass += "hover:bg-gray-50 bg-white";
      }

      days.push(
        <div 
          key={d} 
          onClick={() => handleDateClick(d)}
          className={containerClass}
        >
          <div className="flex justify-center mb-1">
            <span 
              className={`
                text-sm w-7 h-7 flex items-center justify-center rounded-full font-semibold transition-colors
                ${isTodayCell ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'text-gray-700'}
                ${!isTodayCell && isSelected(d) ? 'text-teal-700 font-bold bg-teal-100' : ''}
              `}
            >
              {d}
            </span>
          </div>
          
          <div className="flex-1 overflow-hidden w-full flex flex-col items-center gap-1">
             {events[dateKey]?.slice(0, 3).map((ev, idx) => (
              <div 
                key={idx} 
                className={`w-full px-1.5 py-0.5 text-[10px] font-medium rounded-sm truncate border-l-2 shadow-sm
                  ${isTodayCell 
                    ? 'border-orange-400 bg-orange-50 text-orange-900 animate-pulse' 
                    : 'border-teal-300 bg-white text-teal-900'}
                `}
              >
                {ev.text}
              </div>
            ))}
            {events[dateKey]?.length > 3 && (
               <div className="text-[10px] text-gray-400 font-bold">+ {events[dateKey]?.length - 3}</div>
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

  const openVoiceMemoModal = () => {
    setIsVoiceMemoModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans pb-20 select-none">
      {/* Top Bar */}
      <header className="bg-white sticky top-0 z-50 border-b border-gray-100 shadow-sm">
        <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
             <span className="text-2xl">🗓️</span>
             <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-600">
               스마트 캘린더
             </span>
          </h1>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={openVoiceMemoModal} 
              className="p-2.5 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-orange-500 hover:border-orange-200 hover:bg-orange-50 transition-all active:scale-95 shadow-sm"
              title="음성 녹음기"
            >
              <MicIcon className="w-5 h-5" />
            </button>

            <button onClick={handleCameraClick} className="p-2.5 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-all active:scale-95 shadow-sm relative">
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
        <div 
          className="bg-white rounded-3xl shadow-xl shadow-gray-200/40 overflow-hidden ring-1 ring-gray-100"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Calendar Header */}
          <div className="p-6 flex items-center justify-between border-b border-gray-100 bg-white">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-50 rounded-full transition text-gray-400 hover:text-gray-800">
              <ChevronLeft />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              {currentDate.getFullYear()}년 {String(currentDate.getMonth() + 1).padStart(2, '0')}월
            </h2>
            <button onClick={handleNextMonth} className="p-2 hover:bg-gray-50 rounded-full transition text-gray-400 hover:text-gray-800">
              <ChevronRight />
            </button>
          </div>
          
          {/* Grid Layout */}
          <div className="grid grid-cols-7 bg-white border-l border-t border-gray-100">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
              <div key={day} className={`h-10 flex items-center justify-center text-xs font-bold border-r border-b border-gray-100 ${i===0 ? 'text-rose-500' : 'text-gray-500'}`}>
                {day}
              </div>
            ))}
            {renderCalendarDays()}
          </div>
        </div>
        
        <div className="text-center text-xs text-gray-400 font-medium">
           좌우로 밀어서 달력을 이동하세요
        </div>

      </main>

      {/* Voice Memo Modal (Recorder) */}
      {isVoiceMemoModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={() => setIsVoiceMemoModalOpen(false)}>
           <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative flex flex-col max-h-[85vh] ring-1 ring-gray-100"
            onClick={(e) => e.stopPropagation()}
           >
              <div className="bg-gray-50/80 p-5 flex justify-between items-center text-gray-800 border-b border-gray-100">
                 <h3 className="font-bold text-lg flex items-center gap-2">
                   <div className="p-1.5 bg-orange-500 rounded-lg text-white"><MicIcon className="w-4 h-4"/></div>
                   <span>음성 메모장</span>
                 </h3>
                 <button onClick={() => setIsVoiceMemoModalOpen(false)} className="text-gray-400 hover:text-gray-800 transition"><XIcon/></button>
              </div>

              {/* Recorder Controls */}
              <div className="p-8 bg-white flex flex-col items-center justify-center border-b border-gray-100">
                 <div className="text-5xl font-mono font-bold text-gray-900 mb-8 tracking-tighter">
                    {String(Math.floor(recordingTime / 60)).padStart(2,'0')}:{String(recordingTime % 60).padStart(2,'0')}
                 </div>
                 
                 <button 
                    onClick={isMemoRecording ? stopMemoRecording : startMemoRecording}
                    className={`w-20 h-20 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 duration-200 ${
                      isMemoRecording 
                      ? 'bg-white border-[6px] border-orange-500 text-orange-500' 
                      : 'bg-gradient-to-tr from-orange-400 to-rose-500 text-white shadow-orange-200'
                    }`}
                 >
                    {isMemoRecording ? <StopIcon className="w-8 h-8"/> : <MicIcon className="w-8 h-8"/>}
                 </button>
                 <p className="mt-6 text-xs font-bold uppercase tracking-widest text-gray-400">
                   {isMemoRecording ? "녹음 중입니다..." : "터치하여 녹음 시작"}
                 </p>
              </div>

              {/* File List */}
              <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
                 <div className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex justify-between">
                    <span>저장된 목록 ({voiceMemos.length})</span>
                    <span className="text-teal-600 font-normal">누르면 재생됩니다</span>
                 </div>
                 {voiceMemos.length === 0 ? (
                   <div className="text-center py-10 flex flex-col items-center">
                     <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm border border-gray-100">
                        <MicIcon className="w-6 h-6 text-gray-300" />
                     </div>
                     <div className="text-gray-400 text-sm">저장된 메모가 없습니다</div>
                   </div>
                 ) : (
                   <ul className="space-y-3">
                     {voiceMemos.map(memo => (
                       <li 
                          key={memo.id} 
                          onClick={() => playMemo(memo)}
                          className={`flex items-center justify-between p-4 rounded-2xl shadow-sm border transition-all cursor-pointer group active:scale-[0.98]
                            ${playingMemoId === memo.id 
                                ? 'bg-white border-orange-300 ring-2 ring-orange-100 shadow-md' 
                                : 'bg-white border-gray-100 hover:border-teal-300 hover:shadow-md'}
                          `}
                        >
                          <div className="flex items-center space-x-4">
                             <div className={`p-3 rounded-xl transition-colors ${playingMemoId === memo.id ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400 group-hover:bg-teal-50 group-hover:text-teal-600'}`}>
                                {playingMemoId === memo.id ? <PlayIcon className="w-5 h-5 animate-pulse"/> : <MicIcon className="w-5 h-5"/>}
                             </div>
                             <div>
                                <div className={`text-sm font-bold ${playingMemoId === memo.id ? 'text-orange-900' : 'text-gray-800'}`}>{memo.dateStr}</div>
                                <div className="text-xs text-gray-500 font-medium mt-0.5">{memo.timeStr} • <span className="text-gray-400">{memo.durationStr}</span></div>
                             </div>
                          </div>
                          <div className="flex items-center space-x-2">
                             <button 
                                onClick={(e) => deleteMemo(e, memo.id)}
                                className="p-2.5 rounded-full text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition"
                             >
                                <TrashIcon/>
                             </button>
                          </div>
                       </li>
                     ))}
                   </ul>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Event Input Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in" onClick={closeEventModal}>
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 relative ring-1 ring-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
             {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-6 flex justify-between items-center shadow-lg">
               <div>
                  <span className="text-[10px] font-bold text-teal-100 uppercase tracking-widest block mb-1">선택된 날짜</span>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                      {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
                    </h3>
                    <button 
                      onClick={() => speakSchedule(selectedDate, events[formatDate(selectedDate)])}
                      className="text-white hover:text-teal-100 transition p-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                      title="전체 듣기"
                    >
                      <SpeakerIcon className="w-5 h-5"/>
                    </button>
                  </div>
               </div>
               <button 
                  onClick={closeEventModal}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition backdrop-blur-sm"
               >
                 <XIcon />
               </button>
            </div>

            <div className="p-6">
              {/* Event List */}
              <div className="space-y-3 mb-8 max-h-[35vh] overflow-y-auto pr-1">
                {(!events[formatDate(selectedDate)] || events[formatDate(selectedDate)].length === 0) ? (
                  <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                    <p className="text-gray-500 text-sm font-bold">일정이 없습니다</p>
                    <p className="text-gray-400 text-xs mt-1">새로운 일정을 추가해보세요!</p>
                  </div>
                ) : (
                  events[formatDate(selectedDate)].map(event => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-teal-200 hover:shadow-md transition-all group">
                      <div className="flex items-center space-x-3 overflow-hidden flex-1">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${event.alerted ? 'bg-gray-100 text-gray-400' : 'bg-teal-50 text-teal-700'}`}>
                          {event.time}
                        </span>
                        <span className="text-gray-800 text-sm font-medium truncate flex-1">{event.text}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                         <button 
                           onClick={() => speakText(event.text)}
                           className="text-gray-300 hover:text-teal-500 p-1.5 rounded-full hover:bg-teal-50 transition"
                           title="듣기"
                         >
                            <MiniPlayIcon />
                         </button>
                         <button 
                           onClick={() => handleDeleteEvent(event.id)}
                           className="text-gray-300 hover:text-rose-500 p-1.5 rounded-full hover:bg-rose-50 transition"
                         >
                           <TrashIcon />
                         </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Event Form */}
              <div className="border-t border-gray-100 pt-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex justify-between items-center">
                  <span>새 일정 추가</span>
                  {/* Status */}
                  {isEventRecording && (
                    <div className="flex items-center space-x-2">
                       <span className="text-orange-500 text-xs animate-pulse font-bold">● 듣는 중...</span>
                       <div className="flex items-end space-x-0.5 h-3">
                          <div className="w-1 bg-orange-500 rounded-full animate-wave-1"></div>
                          <div className="w-1 bg-orange-500 rounded-full animate-wave-2"></div>
                          <div className="w-1 bg-orange-500 rounded-full animate-wave-3"></div>
                       </div>
                    </div>
                  )}
                </label>
                <div className="flex flex-col space-y-3 mb-4">
                  <div className="flex space-x-3">
                    <div className="relative">
                      <select 
                        value={newEventTime}
                        onChange={(e) => setNewEventTime(e.target.value)}
                        className="appearance-none bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 block p-3 pr-8 min-w-[100px]"
                      >
                        {generateTimeOptions().map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                    
                    {/* Recording Control */}
                    <button 
                      onClick={toggleVoiceRecording}
                      className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-xl font-bold transition-all ${
                        isEventRecording 
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 ring-2 ring-orange-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {isEventRecording ? (
                        <>
                           <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                           <span>중지</span>
                        </>
                      ) : (
                        <>
                           <MicIcon className="w-4 h-4" />
                           <span>말로 쓰기</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  <textarea
                    id="eventInput"
                    value={newEventText}
                    onChange={(e) => setNewEventText(e.target.value)}
                    placeholder="일정 내용을 입력하세요"
                    rows={2}
                    className={`bg-gray-50 border border-gray-200 text-gray-800 text-sm font-medium rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 block w-full p-3 transition-colors resize-none placeholder-gray-400 ${isEventRecording ? 'bg-orange-50 border-orange-200 placeholder-orange-300' : ''}`}
                  />
                </div>

                <button 
                  onClick={handleAddEvent}
                  className="w-full text-white bg-teal-600 hover:bg-teal-700 focus:ring-4 focus:ring-teal-200 font-bold rounded-xl text-sm px-5 py-4 text-center shadow-lg shadow-teal-100 transition-all transform hover:scale-[1.02] active:scale-95"
                >
                  저장하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Alarm Modal */}
      {alarmActive && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center z-[100] p-6 animate-fade-in text-center">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-rose-500 to-orange-500 animate-pulse"></div>
            
            <div className="w-32 h-32 bg-orange-100 rounded-full flex items-center justify-center mb-8 text-orange-500 animate-bounce shadow-xl ring-8 ring-orange-50">
               <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
               </svg>
            </div>
            
            <div className="space-y-2 mb-10">
               <h3 className="text-6xl font-black text-gray-900 tracking-tighter">{alarmActive.time}</h3>
               <p className="text-orange-500 uppercase text-sm font-bold tracking-[0.3em] animate-pulse">ALARM</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 max-w-sm w-full mb-10 transform hover:scale-105 transition duration-300">
               <p className="text-2xl font-bold text-gray-800 break-keep leading-snug">
                  "{alarmActive.text}"
               </p>
               <p className="text-gray-400 text-xs mt-4 font-bold uppercase tracking-wider">일정 알림</p>
            </div>

            <button 
              onClick={stopAlarm}
              className="w-full max-w-sm text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 font-bold rounded-2xl text-xl px-8 py-5 shadow-xl shadow-orange-200 transition transform hover:scale-[1.02] active:scale-95"
            >
              알람 끄기
            </button>
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
        @keyframes wave {
          0%, 100% { height: 4px; }
          50% { height: 12px; }
        }
        .animate-wave-1 { animation: wave 0.8s infinite ease-in-out; }
        .animate-wave-2 { animation: wave 0.8s infinite ease-in-out 0.1s; }
        .animate-wave-3 { animation: wave 0.8s infinite ease-in-out 0.2s; }
      `}</style>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
