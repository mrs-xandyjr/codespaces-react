import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";
import { 
  Plus, Trash2, Share2, Calendar, MapPin, Clock, X, Lock, 
  Eye, Edit3, Download, Upload, Check, AlertTriangle, ChevronRight, RefreshCw
} from 'lucide-react';

// --- Firebase Credentials ---
const firebaseConfig = {
  apiKey: "AIzaSyBY6uRgGySpqdtoZqhktEwOBv1XSrUC8oE",
  authDomain: "ymsat2027-sched.firebaseapp.com",
  projectId: "ymsat2027-sched",
  storageBucket: "ymsat2027-sched.firebasestorage.app",
  messagingSenderId: "41402422776",
  appId: "1:41402422776:web:026634e7a70a6453d0b20d",
  measurementId: "G-3NXNS2DVLS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Constants & Config ---
const START_HOUR = 6;  // 6:00 AM
const END_HOUR = 18;   // 6:00 PM
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60; // 720 minutes

const DATES = [
  '2027-01-20', '2027-01-21', '2027-01-22', '2027-01-23',
  '2027-01-24', '2027-01-25', '2027-01-26', '2027-01-27'
];

const DEFAULT_TAGS = [
  { id: 'g7', label: 'Grade 7', color: '#a7f3d0' },  // pastel green
  { id: 'g8', label: 'Grade 8', color: '#fef08a' },  // pastel yellow
  { id: 'g9', label: 'Grade 9', color: '#fca5a5' },  // pastel red
  { id: 'g10', label: 'Grade 10', color: '#93c5fd' }, // pastel blue
  { id: 'g11', label: 'Grade 11', color: '#fbcfe8' }, // pastel pink
  { id: 'g12', label: 'Grade 12', color: '#fed7aa' }  // pastel orange
];

const INITIAL_ACTIVITIES = [
  {
    id: 'opening-prog-2027',
    title: 'Opening Program',
    date: '2027-01-20',
    startMinutes: 450, // 7:30 AM (6*60 + 90)
    endMinutes: 510,   // 8:30 AM
    venue: 'Main Gymnasium',
    tags: ['g7', 'g8', 'g9', 'g10', 'g11', 'g12'],
    description: 'YMSAT 2027 Kick-off and Welcome Ceremony'
  }
];

// Helper to convert minutes from 6:00 AM into "HH:MM AM/PM"
function minutesToTimeString(mins) {
  const total = START_HOUR * 60 + mins;
  let h = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const mStr = m < 10 ? `0${m}` : m;
  return `${h}:${mStr} ${ampm}`;
}

// Side-by-side Layout Calculator for Overlapping Concurrent Events
function computeOverlappingDayLayouts(events) {
  if (!events || events.length === 0) return [];

  const sorted = [...events].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
  });

  const clusters = [];
  let currentCluster = [];
  let clusterEnd = -1;

  sorted.forEach(event => {
    if (currentCluster.length === 0) {
      currentCluster.push(event);
      clusterEnd = event.endMinutes;
    } else {
      if (event.startMinutes < clusterEnd) {
        currentCluster.push(event);
        if (event.endMinutes > clusterEnd) clusterEnd = event.endMinutes;
      } else {
        clusters.push(currentCluster);
        currentCluster = [event];
        clusterEnd = event.endMinutes;
      }
    }
  });
  if (currentCluster.length > 0) clusters.push(currentCluster);

  const layoutResults = [];
  clusters.forEach(cluster => {
    const columns = [];
    cluster.forEach(event => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        if (columns[i] <= event.startMinutes) {
          columns[i] = event.endMinutes;
          event._colIdx = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        event._colIdx = columns.length;
        columns.push(event.endMinutes);
      }
    });
    const totalCols = columns.length;
    cluster.forEach(event => {
      layoutResults.push({
        ...event,
        widthPercent: 100 / totalCols,
        leftPercent: (event._colIdx * 100) / totalCols
      });
    });
  });

  return layoutResults;
}

export default function App() {
  const [scheduleName, setScheduleName] = useState('YMSAT Schedule');
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [tags, setTags] = useState(DEFAULT_TAGS);
  
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Syncing with Cloud...');
  
  // UI Selection & Modals
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchMode, setBatchMode] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [isNewActivity, setIsNewActivity] = useState(false);

  // Dragging & Resizing State
  const [dragInfo, setDragInfo] = useState(null);
  const gridRef = useRef(null);

  // --- Read URL Parameters & Cloud Listeners ---
  useEffect(() => {
    // Check mode parameter from hash or query
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const urlParams = new URLSearchParams(window.location.search);
    
    const mode = hashParams.get('mode') || urlParams.get('mode');
    if (mode === 'view') {
      setIsReadOnly(true);
    }

    // Subscribe to Firestore Document (Method 3)
    const docRef = doc(db, "schedules", "ymsat2027");
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.scheduleName) setScheduleName(data.scheduleName);
        if (data.activities) setActivities(data.activities);
        if (data.tags) setTags(data.tags);
        setSyncStatus('Live Cloud Synced');
      } else {
        // First run: save default state
        saveToCloud(scheduleName, INITIAL_ACTIVITIES, DEFAULT_TAGS);
        setSyncStatus('Initialized Cloud DB');
      }
    }, (error) => {
      console.error("Firestore error:", error);
      setSyncStatus('Offline / Local Storage Mode');
    });

    return () => unsubscribe();
  }, []);

  // Save changes to Firebase Firestore
  const saveToCloud = async (name, newActivities, newTags) => {
    try {
      await setDoc(doc(db, "schedules", "ymsat2027"), {
        scheduleName: name,
        activities: newActivities,
        tags: newTags,
        lastUpdated: new Date().toISOString()
      });
      setSyncStatus('Live Cloud Synced');
    } catch (err) {
      console.error("Failed to sync to cloud:", err);
      setSyncStatus('Sync Error');
    }
  };

  const updateActivitiesState = (newActivities) => {
    setActivities(newActivities);
    if (!isReadOnly) {
      saveToCloud(scheduleName, newActivities, tags);
    }
  };

  // --- Drag and Drop / Resize Logic ---
  const handleMouseDown = (e, activity, mode) => {
    if (isReadOnly) return;
    e.stopPropagation();

    const gridRect = gridRef.current ? gridRef.current.getBoundingClientRect() : null;
    setDragInfo({
      activity,
      mode, // 'move' or 'resize'
      startY: e.clientY,
      initialStartMins: activity.startMinutes,
      initialEndMins: activity.endMinutes,
      gridRect
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragInfo) return;

      const { activity, mode, startY, initialStartMins, initialEndMins, gridRect } = dragInfo;
      const deltaY = e.clientY - startY;

      // 720 minutes mapped to grid height
      const pxPerMinute = gridRect ? gridRect.height / TOTAL_MINUTES : 1;
      let deltaMinutes = Math.round((deltaY / pxPerMinute) / 5) * 5; // Snap to 5 mins

      let updated = { ...activity };

      if (mode === 'move') {
        const duration = initialEndMins - initialStartMins;
        let newStart = Math.max(0, Math.min(TOTAL_MINUTES - duration, initialStartMins + deltaMinutes));
        updated.startMinutes = newStart;
        updated.endMinutes = newStart + duration;
      } else if (mode === 'resize') {
        let newEnd = Math.max(initialStartMins + 15, Math.min(TOTAL_MINUTES, initialEndMins + deltaMinutes));
        updated.endMinutes = newEnd;
      }

      setActivities(prev => prev.map(a => a.id === updated.id ? updated : a));
    };

    const handleMouseUp = () => {
      if (dragInfo) {
        saveToCloud(scheduleName, activities, tags);
        setDragInfo(null);
      }
    };

    if (dragInfo) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragInfo, activities, scheduleName, tags]);

  // --- Conflict Detection Engine ---
  const checkConflicts = (event, dayEvents) => {
    let tagConflict = false;
    let venueConflict = false;

    dayEvents.forEach(other => {
      if (other.id === event.id) return;
      
      // Time overlap check
      const overlaps = Math.max(event.startMinutes, other.startMinutes) < Math.min(event.endMinutes, other.endMinutes);
      if (overlaps) {
        // Tag overlap check
        if (event.tags.some(t => other.tags.includes(t))) {
          tagConflict = true;
        }
        // Venue match check (case-insensitive)
        if (event.venue && other.venue && event.venue.trim().toLowerCase() === other.venue.trim().toLowerCase()) {
          venueConflict = true;
        }
      }
    });

    return { tagConflict, venueConflict };
  };

  // Generate Tag Stripe Background
  const getEventBackgroundStyle = (event, tagConflict, venueConflict) => {
    if (tagConflict && venueConflict) {
      return { background: 'repeating-linear-gradient(45deg, #000, #000 10px, #fff 10px, #fff 20px)', color: '#000' };
    }
    if (tagConflict) {
      return { backgroundColor: '#000000', color: '#ffffff' };
    }
    if (venueConflict) {
      return { backgroundColor: '#ffffff', color: '#000000', border: '2px solid #2563eb' };
    }

    const assignedTags = tags.filter(t => event.tags.includes(t.id));
    if (assignedTags.length === 0) return { backgroundColor: '#e2e8f0', color: '#1e293b' };
    if (assignedTags.length === 1) return { backgroundColor: assignedTags[0].color, color: '#1e293b' };

    // Striped Pattern for multi-tags
    const step = 100 / assignedTags.length;
    const gradients = assignedTags.map((t, idx) => `${t.color} ${idx * step}% ${(idx + 1) * step}%`).join(', ');
    return {
      background: `repeating-linear-gradient(135deg, ${gradients})`,
      color: '#1e293b'
    };
  };

  // --- Batch Operations & Handlers ---
  const handleSelectActivity = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBatchDelete = () => {
    if (window.confirm(`Delete ${selectedIds.length} selected activities?`)) {
      const remaining = activities.filter(a => !selectedIds.includes(a.id));
      updateActivitiesState(remaining);
      setSelectedIds([]);
      setBatchMode(false);
    }
  };

  const handleSaveActivity = (e) => {
    e.preventDefault();
    if (isNewActivity) {
      updateActivitiesState([...activities, editingActivity]);
    } else {
      updateActivitiesState(activities.map(a => a.id === editingActivity.id ? editingActivity : a));
    }
    setEditingActivity(null);
  };

  // --- Share Links (Method 2) ---
  const generateShareURL = (mode) => {
    const encoded = encodeURIComponent(JSON.stringify({ scheduleName, activities, tags }));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#mode=${mode}&data=${encoded}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Read-Only Top Alert Banner */}
      {isReadOnly && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 font-medium flex justify-between items-center text-sm shadow-md">
          <span className="flex items-center gap-2">
            <Eye className="w-4 h-4" /> 👁️ READ-ONLY MODE — Viewing schedule. Editing features are locked.
          </span>
          <button 
            onClick={() => setIsReadOnly(false)}
            className="bg-slate-900 text-white px-3 py-1 rounded text-xs hover:bg-slate-800 transition"
          >
            Make Editable Copy
          </button>
        </div>
      )}

      {/* Main Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-4 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-400" />
            {scheduleName}
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>Jan 20 – Jan 27, 2027</span> • 
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> {syncStatus}
            </span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {!isReadOnly && (
            <>
              <button
                onClick={() => {
                  setEditingActivity({
                    id: 'evt-' + Date.now(),
                    title: 'New Activity',
                    date: '2027-01-20',
                    startMinutes: 480,
                    endMinutes: 540,
                    venue: '',
                    tags: ['g7'],
                    description: ''
                  });
                  setIsNewActivity(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> Add Activity
              </button>

              <button
                onClick={() => setBatchMode(!batchMode)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-1.5 transition ${
                  batchMode ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Trash2 className="w-4 h-4" /> {batchMode ? 'Cancel Select' : 'Batch Delete'}
              </button>
            </>
          )}

          <button
            onClick={() => setShowShareModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </header>

      {/* Batch Mode Deletion Sub-bar */}
      {batchMode && (
        <div className="bg-amber-100 border-b border-amber-300 px-6 py-2.5 flex justify-between items-center text-amber-900 text-sm">
          <span>Click activities on the calendar to select for batch deletion. ({selectedIds.length} selected)</span>
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs font-semibold"
            >
              Delete Selected
            </button>
          )}
        </div>
      )}

      {/* Tags Legend */}
      <div className="bg-white border-b px-6 py-2.5 flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold text-slate-500 uppercase tracking-wider">Grade Tags:</span>
        {tags.map(tag => (
          <span 
            key={tag.id} 
            className="px-2.5 py-1 rounded-full border text-slate-800 font-medium" 
            style={{ backgroundColor: tag.color, borderColor: 'rgba(0,0,0,0.1)' }}
          >
            {tag.label}
          </span>
        ))}
      </div>

      {/* Main Schedule Grid */}
      <main className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-xl shadow-md border overflow-hidden flex flex-col min-w-[1000px]">
          
          {/* Calendar Header Dates */}
          <div className="grid grid-cols-9 border-b bg-slate-100 text-center text-xs font-semibold text-slate-600">
            <div className="py-3 border-r bg-slate-200">Time</div>
            {DATES.map(dateStr => {
              const d = new Date(dateStr + 'T00:00:00');
              const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = d.getDate();
              return (
                <div 
                  key={dateStr} 
                  onClick={() => setExpandedDay(dateStr)}
                  className="py-3 border-r hover:bg-slate-200 cursor-pointer transition flex flex-col items-center justify-center group"
                >
                  <span className="text-slate-400 font-normal">{dayName}</span>
                  <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600">Jan {dayNum}</span>
                </div>
              );
            })}
          </div>

          {/* Time & Events Grid Container */}
          <div ref={gridRef} className="relative grid grid-cols-9 h-[720px] bg-slate-50 select-none">
            
            {/* Time Slot Labels (6 AM - 6 PM) */}
            <div className="border-r bg-white text-slate-400 text-[10px] font-mono">
              {Array.from({ length: 13 }).map((_, i) => (
                <div key={i} className="h-[60px] border-b px-2 py-0.5 border-slate-100">
                  {minutesToTimeString(i * 60)}
                </div>
              ))}
            </div>

            {/* Date Columns */}
            {DATES.map(dateStr => {
              const dayEvents = activities.filter(a => a.date === dateStr);
              const layoutEvents = computeOverlappingDayLayouts(dayEvents);

              return (
                <div key={dateStr} className="relative border-r border-slate-200/80 h-full">
                  {/* Hourly background grid lines */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-[60px] border-b border-slate-100" />
                  ))}

                  {/* Render Day Activities */}
                  {layoutEvents.map(event => {
                    const topPx = (event.startMinutes / TOTAL_MINUTES) * 720;
                    const heightPx = ((event.endMinutes - event.startMinutes) / TOTAL_MINUTES) * 720;
                    const { tagConflict, venueConflict } = checkConflicts(event, dayEvents);
                    const bgStyle = getEventBackgroundStyle(event, tagConflict, venueConflict);
                    const isSelected = selectedIds.includes(event.id);

                    return (
                      <div
                        key={event.id}
                        onMouseDown={(e) => handleMouseDown(e, event, 'move')}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (batchMode) {
                            handleSelectActivity(event.id);
                          } else {
                            setEditingActivity(event);
                            setIsNewActivity(false);
                          }
                        }}
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                          left: `${event.leftPercent}%`,
                          width: `${event.widthPercent}%`,
                          ...bgStyle
                        }}
                        className={`absolute p-2 rounded-md shadow-sm border text-xs font-sans overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                          isSelected ? 'ring-4 ring-amber-400 z-30' : 'z-10'
                        }`}
                      >
                        {/* Event Title */}
                        <div className="font-bold leading-tight truncate">{event.title}</div>
                        
                        {/* Time & Venue */}
                        <div className="text-[10px] opacity-90 flex items-center gap-1 mt-0.5 truncate">
                          <Clock className="w-3 h-3 inline" />
                          {minutesToTimeString(event.startMinutes)} – {minutesToTimeString(event.endMinutes)}
                        </div>

                        {event.venue && (
                          <div className="text-[10px] opacity-90 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 inline" />
                            {event.venue}
                          </div>
                        )}

                        {/* Conflict Badges */}
                        {tagConflict && (
                          <span className="mt-1 inline-block bg-red-600 text-white text-[9px] font-bold px-1 rounded">
                            ⚠️ TAG CONFLICT
                          </span>
                        )}
                        {venueConflict && (
                          <span className="mt-1 inline-block bg-blue-600 text-white text-[9px] font-bold px-1 rounded">
                            ⚠️ VENUE CONFLICT
                          </span>
                        )}

                        {/* Resize Bottom Handle */}
                        {!isReadOnly && !batchMode && (
                          <div
                            onMouseDown={(e) => handleMouseDown(e, event, 'resize')}
                            className="absolute bottom-0 left-0 right-0 h-2 bg-slate-900/20 hover:bg-slate-900/40 cursor-ns-resize flex justify-center items-center"
                          >
                            <div className="w-4 h-0.5 bg-white/60 rounded" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modal 1: Edit / Create Activity */}
      {editingActivity && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveActivity} className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {isReadOnly ? 'Activity Details' : isNewActivity ? 'Add New Activity' : 'Edit Activity'}
              </h3>
              <button type="button" onClick={() => setEditingActivity(null)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Title</label>
                <input
                  disabled={isReadOnly}
                  type="text"
                  required
                  value={editingActivity.title}
                  onChange={e => setEditingActivity({ ...editingActivity, title: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Date</label>
                  <select
                    disabled={isReadOnly}
                    value={editingActivity.date}
                    onChange={e => setEditingActivity({ ...editingActivity, date: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm"
                  >
                    {DATES.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Venue</label>
                  <input
                    disabled={isReadOnly}
                    type="text"
                    placeholder="e.g. Gymnasium"
                    value={editingActivity.venue || ''}
                    onChange={e => setEditingActivity({ ...editingActivity, venue: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
              </div>

              {/* Time Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Start Time</label>
                  <input
                    disabled={isReadOnly}
                    type="time"
                    value={minutesToTimeString(editingActivity.startMinutes).replace(/ [AP]M/, '')}
                    onChange={e => {
                      const [h, m] = e.target.value.split(':').map(Number);
                      const startMins = Math.max(0, (h - START_HOUR) * 60 + m);
                      setEditingActivity({ ...editingActivity, startMinutes: startMins });
                    }}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">End Time</label>
                  <input
                    disabled={isReadOnly}
                    type="time"
                    value={minutesToTimeString(editingActivity.endMinutes).replace(/ [AP]M/, '')}
                    onChange={e => {
                      const [h, m] = e.target.value.split(':').map(Number);
                      const endMins = (h - START_HOUR) * 60 + m;
                      setEditingActivity({ ...editingActivity, endMinutes: endMins });
                    }}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                </div>
              </div>

              {/* Tag Selection */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Grade Tags</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => {
                    const checked = editingActivity.tags.includes(tag.id);
                    return (
                      <button
                        type="button"
                        key={tag.id}
                        disabled={isReadOnly}
                        onClick={() => {
                          const newTags = checked 
                            ? editingActivity.tags.filter(t => t !== tag.id)
                            : [...editingActivity.tags, tag.id];
                          setEditingActivity({ ...editingActivity, tags: newTags });
                        }}
                        className={`px-3 py-1 rounded-full text-xs border font-medium transition ${
                          checked ? 'ring-2 ring-slate-800' : 'opacity-50'
                        }`}
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              {!isReadOnly && !isNewActivity && (
                <button
                  type="button"
                  onClick={() => {
                    updateActivitiesState(activities.filter(a => a.id !== editingActivity.id));
                    setEditingActivity(null);
                  }}
                  className="mr-auto text-red-600 hover:text-red-700 text-xs font-semibold"
                >
                  Delete Activity
                </button>
              )}

              <button
                type="button"
                onClick={() => setEditingActivity(null)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600"
              >
                Close
              </button>

              {!isReadOnly && (
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500"
                >
                  Save Activity
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Expanded Single Day View */}
      {expandedDay && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col p-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-bold text-slate-800">
                Expanded View — {expandedDay}
              </h3>
              <button onClick={() => setExpandedDay(null)}>
                <X className="w-6 h-6 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="flex-1 overflow-auto mt-4 border rounded-lg p-4 bg-slate-50 relative">
              {computeOverlappingDayLayouts(activities.filter(a => a.date === expandedDay)).map(event => {
                const topPx = (event.startMinutes / TOTAL_MINUTES) * 600;
                const heightPx = ((event.endMinutes - event.startMinutes) / TOTAL_MINUTES) * 600;
                const bgStyle = getEventBackgroundStyle(event, false, false);

                return (
                  <div
                    key={event.id}
                    style={{
                      top: `${topPx}px`,
                      height: `${heightPx}px`,
                      left: `${event.leftPercent}%`,
                      width: `${event.widthPercent}%`,
                      ...bgStyle
                    }}
                    className="absolute p-3 rounded-lg shadow-sm border text-xs font-sans"
                  >
                    <div className="font-bold text-sm">{event.title}</div>
                    <div>{minutesToTimeString(event.startMinutes)} – {minutesToTimeString(event.endMinutes)}</div>
                    {event.venue && <div>📍 {event.venue}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Share Links */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">Share YMSAT Schedule</h3>
              <button onClick={() => setShowShareModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">👁️ Read-Only View Link (Method 2)</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    type="text"
                    value={generateShareURL('view')}
                    className="w-full border rounded p-2 text-slate-600 bg-slate-50 font-mono text-[10px]"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(generateShareURL('view'))}
                    className="bg-slate-800 text-white px-3 rounded hover:bg-slate-700 font-semibold"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">✏️ Editable Copy Link</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    type="text"
                    value={generateShareURL('edit')}
                    className="w-full border rounded p-2 text-slate-600 bg-slate-50 font-mono text-[10px]"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(generateShareURL('edit'))}
                    className="bg-blue-600 text-white px-3 rounded hover:bg-blue-500 font-semibold"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}