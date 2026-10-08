import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";
import {
  Calendar, Clock, MapPin, Plus, Trash2, Edit3, Share2, Download, Upload,
  Sun, Moon, Search, Filter, CheckSquare, Square, X, AlertTriangle, Maximize2,
  Eye, Copy, RefreshCw, Tag, Info, Check, ShieldAlert, Zap, Layers, Sparkles
} from 'lucide-react';

// Firebase credentials provided for Method 3 Cloud Synchronization
const firebaseConfig = {
  apiKey: "AIzaSyBY6uRgGySpqdtoZqhktEwOBv1XSrUC8oE",
  authDomain: "ymsat2027-sched.firebaseapp.com",
  projectId: "ymsat2027-sched",
  storageBucket: "ymsat2027-sched.firebasestorage.app",
  messagingSenderId: "41402422776",
  appId: "1:41402422776:web:026634e7a70a6453d0b20d",
  measurementId: "G-3NXNS2DVLS"
};

// Initialize Firebase App & Firestore single instance
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const FIREBASE_DOC_PATH = "ymsat2027";

// Schedule dates from January 20 to January 27, 2027 (8 Days)
const EVENT_DATES = [
  { id: '2027-01-20', label: 'Jan 20, 2027', dayName: 'Wednesday' },
  { id: '2027-01-21', label: 'Jan 21, 2027', dayName: 'Thursday' },
  { id: '2027-01-22', label: 'Jan 22, 2027', dayName: 'Friday' },
  { id: '2027-01-23', label: 'Jan 23, 2027', dayName: 'Saturday' },
  { id: '2027-01-24', label: 'Jan 24, 2027', dayName: 'Sunday' },
  { id: '2027-01-25', label: 'Jan 25, 2027', dayName: 'Monday' },
  { id: '2027-01-26', label: 'Jan 26, 2027', dayName: 'Tuesday' },
  { id: '2027-01-27', label: 'Jan 27, 2027', dayName: 'Wednesday' },
];

const GRID_START_MINS = 360;  // 6:00 AM
const GRID_END_MINS = 1080;   // 6:00 PM
const TOTAL_GRID_MINS = GRID_END_MINS - GRID_START_MINS; // 720 minutes (12 hours)

// Preset Pastel Grade Level Tags
const DEFAULT_TAGS = [
  { id: 'tag-g7', name: 'Grade 7', color: '#a7f3d0' },  // pastel green
  { id: 'tag-g8', name: 'Grade 8', color: '#fef08a' },  // pastel yellow
  { id: 'tag-g9', name: 'Grade 9', color: '#fca5a5' },  // pastel red
  { id: 'tag-g10', name: 'Grade 10', color: '#93c5fd' }, // pastel blue
  { id: 'tag-g11', name: 'Grade 11', color: '#fbcfe8' }, // pastel pink
  { id: 'tag-g12', name: 'Grade 12', color: '#fed7aa' }, // pastel orange
];

// Initial default Opening Program activity covering all grades
const DEFAULT_INITIAL_ACTIVITIES = [
  {
    id: 'act-opening-program',
    title: 'Opening Program',
    date: '2027-01-20',
    startTime: '07:30',
    endTime: '08:30',
    venue: 'Gymnasium / Main Stage',
    description: 'YMSAT 2027 Grand Opening Ceremony and Keynote Addresses',
    tags: ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
  }
];

// Convert "HH:MM" string to minutes from midnight
function timeToMins(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Convert minutes from midnight back to "HH:MM" string
function minsToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Format "HH:MM" 24h string into 12h AM/PM display string
function format12H(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

// Snap a minute value to nearest 5-minute increment
function snapTo5Mins(mins) {
  return Math.round(mins / 5) * 5;
}

/**
 * Detects Tag Conflicts (shared tags on time overlap) and Venue Conflicts (shared venue on time overlap)
 */
function detectConflicts(activities) {
  const conflictMap = new Map();
  activities.forEach(act => conflictMap.set(act.id, { tagConflict: false, venueConflict: false }));

  for (let i = 0; i < activities.length; i++) {
    for (let j = i + 1; j < activities.length; j++) {
      const a = activities[i];
      const b = activities[j];

      // Conflicts can only occur on the same day
      if (a.date !== b.date) continue;

      const aStart = timeToMins(a.startTime);
      const aEnd = timeToMins(a.endTime);
      const bStart = timeToMins(b.startTime);
      const bEnd = timeToMins(b.endTime);

      // Check time overlap condition
      if (aStart < bEnd && bStart < aEnd) {
        // Tag Conflict Check: share at least 1 common tag
        const sharedTags = a.tags.filter(t => b.tags.includes(t));
        if (sharedTags.length > 0) {
          conflictMap.get(a.id).tagConflict = true;
          conflictMap.get(b.id).tagConflict = true;
        }

        // Venue Conflict Check: share exact same venue name (case-insensitive, non-empty)
        if (
          a.venue && b.venue &&
          a.venue.trim().length > 0 &&
          a.venue.trim().toLowerCase() === b.venue.trim().toLowerCase()
        ) {
          conflictMap.get(a.id).venueConflict = true;
          conflictMap.get(b.id).venueConflict = true;
        }
      }
    }
  }
  return conflictMap;
}

/**
 * Computes side-by-side layout metrics for overlapping concurrent activities on a single date
 */
function computeOverlappingDayLayouts(dayActivities) {
  if (!dayActivities || dayActivities.length === 0) return [];

  // Sort activities by start time, then by duration descending
  const sorted = [...dayActivities].sort((a, b) => {
    const aStart = timeToMins(a.startTime);
    const bStart = timeToMins(b.startTime);
    if (aStart !== bStart) return aStart - bStart;
    const aDur = timeToMins(a.endTime) - aStart;
    const bDur = timeToMins(b.endTime) - bStart;
    return bDur - aDur;
  });

  // Group into overlapping clusters
  const clusters = [];
  let currentCluster = [];
  let maxClusterEnd = -1;

  sorted.forEach(act => {
    const start = timeToMins(act.startTime);
    const end = timeToMins(act.endTime);

    if (currentCluster.length === 0 || start < maxClusterEnd) {
      currentCluster.push(act);
      if (end > maxClusterEnd) maxClusterEnd = end;
    } else {
      clusters.push(currentCluster);
      currentCluster = [act];
      maxClusterEnd = end;
    }
  });
  if (currentCluster.length > 0) clusters.push(currentCluster);

  // Assign column slots for side-by-side rendering
  const layoutResults = [];

  clusters.forEach(cluster => {
    const columns = [];
    const actColumnMap = new Map();

    cluster.forEach(act => {
      const actStart = timeToMins(act.startTime);
      const actEnd = timeToMins(act.endTime);

      let assignedCol = -1;
      for (let c = 0; c < columns.length; c++) {
        if (columns[c] <= actStart) {
          assignedCol = c;
          columns[c] = actEnd;
          break;
        }
      }

      if (assignedCol === -1) {
        assignedCol = columns.length;
        columns.push(actEnd);
      }

      actColumnMap.set(act.id, assignedCol);
    });

    const totalCols = columns.length;

    cluster.forEach(act => {
      const colIdx = actColumnMap.get(act.id);
      const width = 100 / totalCols;
      const left = colIdx * width;
      layoutResults.push({
        ...act,
        colIdx,
        totalCols,
        width,
        left
      });
    });
  });

  return layoutResults;
}

// Compute multi-tag linear gradient style for activity cards
function getMultiTagBackground(actTags, allTags) {
  if (!actTags || actTags.length === 0) return '#e5e7eb';
  const tagColors = actTags.map(tName => {
    const found = allTags.find(t => t.name === tName);
    return found ? found.color : '#cbd5e1';
  });

  if (tagColors.length === 1) return tagColors[0];

  // Stripe step percentage
  const step = 100 / tagColors.length;
  const stops = tagColors.map((c, i) => `${c} ${i * step}%, ${c} ${(i + 1) * step}%`).join(', ');
  return `linear-gradient(135deg, ${stops})`;
}

export default function App() {
  // Core Data States
  const [activities, setActivities] = useState([]);
  const [tags, setTags] = useState(DEFAULT_TAGS);

  // Ref to access current activities inside global window event listeners
  const activitiesRef = useRef(activities);
  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  // Sync & Sharing States
  const [syncStatus, setSyncStatus] = useState('connecting'); // 'connecting', 'synced', 'local', 'error'
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [readOnlyBanner, setReadOnlyBanner] = useState(false);

  // UI Navigation & View States
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilters, setSelectedTagFilters] = useState([]);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedActIds, setSelectedActIds] = useState(new Set());

  // Modals & Dialogs
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null); // '2027-01-20' or null
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm }
  const [shareToast, setShareToast] = useState(false);

  // Form State for Activity Add/Edit
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('2027-01-20');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('09:00');
  const [formVenue, setFormVenue] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTags, setFormTags] = useState([]);

  // Dragging and Resizing state tracking
  const [draggingAct, setDraggingAct] = useState(null); // { actId, initialStartMins, initialEndMins, isResize, grabOffsetMins }

  // Effect 1: Parse Hash Link for Read-Only Snapshot Sharing (Method 2)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.includes('mode=view') || hash.includes('mode=readonly')) {
        setIsReadOnly(true);
        setReadOnlyBanner(true);
        const match = hash.match(/data=([^&]+)/);
        if (match && match[1]) {
          try {
            const decoded = JSON.parse(decodeURIComponent(atob(match[1])));
            if (Array.isArray(decoded.activities)) {
              setActivities(decoded.activities);
            }
            if (Array.isArray(decoded.tags)) {
              setTags(decoded.tags);
            }
          } catch (err) {
            console.error("Failed to parse shared snapshot link:", err);
          }
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Effect 2: Real-time Firestore Synchronization (Method 3)
  useEffect(() => {
    if (isReadOnly) return; // Skip cloud sync if explicitly in shared read-only mode

    const docRef = doc(db, "schedules", FIREBASE_DOC_PATH);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.activities)) {
            setActivities(data.activities);
          }
          if (Array.isArray(data.tags)) {
            setTags(data.tags);
          }
          setSyncStatus('synced');
        } else {
          // Initialize document if first time creation
          const initialData = {
            activities: DEFAULT_INITIAL_ACTIVITIES,
            tags: DEFAULT_TAGS,
            createdAt: new Date().toISOString()
          };
          setDoc(docRef, initialData)
            .then(() => {
              setActivities(DEFAULT_INITIAL_ACTIVITIES);
              setSyncStatus('synced');
            })
            .catch(() => setSyncStatus('local'));
        }
      },
      (error) => {
        console.warn("Firestore subscription fallback to local cache:", error);
        setSyncStatus('local');
        // Fallback to localStorage
        const localData = localStorage.getItem('ymsat_2027_schedule');
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            setActivities(parsed.activities || DEFAULT_INITIAL_ACTIVITIES);
            setTags(parsed.tags || DEFAULT_TAGS);
          } catch (e) {
            setActivities(DEFAULT_INITIAL_ACTIVITIES);
          }
        } else {
          setActivities(DEFAULT_INITIAL_ACTIVITIES);
        }
      }
    );

    return () => unsubscribe();
  }, [isReadOnly]);

  // Effect 3: Local Storage Auto-backup
  useEffect(() => {
    if (activities.length > 0) {
      localStorage.setItem('ymsat_2027_schedule', JSON.stringify({ activities, tags }));
    }
  }, [activities, tags]);

  // Push updates to Firestore
  const saveToCloud = async (newActivities, newTags = tags) => {
    if (isReadOnly) return;
    setActivities(newActivities);
    setTags(newTags);

    try {
      const docRef = doc(db, "schedules", FIREBASE_DOC_PATH);
      await setDoc(docRef, {
        activities: newActivities,
        tags: newTags,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setSyncStatus('synced');
    } catch (err) {
      console.warn("Failed saving to Firestore, local state preserved:", err);
      setSyncStatus('local');
    }
  };

  // Effect 4: Global Mouse Event Listener for Cross-Date and Cross-Time Drag & Resize
  useEffect(() => {
    if (!draggingAct || isReadOnly) return;

    const handleGlobalMouseMove = (e) => {
      // Find the day column element directly under cursor
      const columnEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-day-column="true"]');
      if (!columnEl) return;

      const dayId = columnEl.getAttribute('data-day-id');
      const rect = columnEl.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const percentage = Math.max(0, Math.min(1, offsetY / rect.height));

      // Current pointer time in minutes
      const currentMins = snapTo5Mins(GRID_START_MINS + percentage * TOTAL_GRID_MINS);

      if (draggingAct.isResize) {
        // Resizing bottom duration edge
        const newEndMins = Math.max(draggingAct.initialStartMins + 15, Math.min(GRID_END_MINS, currentMins));
        const newEndTime = minsToTime(newEndMins);

        setActivities(prev => prev.map(a => a.id === draggingAct.actId ? { ...a, endTime: newEndTime } : a));
      } else {
        // Dragging activity block across date and/or time
        const duration = draggingAct.initialEndMins - draggingAct.initialStartMins;
        let newStartMins = snapTo5Mins(currentMins - draggingAct.grabOffsetMins);

        // Clamping within grid boundaries (6:00 AM – 6:00 PM)
        if (newStartMins < GRID_START_MINS) newStartMins = GRID_START_MINS;
        if (newStartMins + duration > GRID_END_MINS) newStartMins = GRID_END_MINS - duration;

        const newEndMins = newStartMins + duration;

        setActivities(prev => prev.map(a => a.id === draggingAct.actId ? {
          ...a,
          date: dayId,
          startTime: minsToTime(newStartMins),
          endTime: minsToTime(newEndMins)
        } : a));
      }
    };

    const handleGlobalMouseUp = () => {
      setDraggingAct(null);
      saveToCloud(activitiesRef.current);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingAct, isReadOnly]);

  const openAddActivityModal = (defaultDate = '2027-01-20', defaultStart = '08:00') => {
    setEditingActivity(null);
    setFormTitle('');
    setFormDate(defaultDate);
    setFormStartTime(defaultStart);
    // Default 1 hour duration
    const endMins = Math.min(timeToMins(defaultStart) + 60, GRID_END_MINS);
    setFormEndTime(minsToTime(endMins));
    setFormVenue('');
    setFormDescription('');
    setFormTags([]);
    setIsActivityModalOpen(true);
  };

  const openEditActivityModal = (act) => {
    setEditingActivity(act);
    setFormTitle(act.title);
    setFormDate(act.date);
    setFormStartTime(act.startTime);
    setFormEndTime(act.endTime);
    setFormVenue(act.venue || '');
    setFormDescription(act.description || '');
    setFormTags(act.tags || []);
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const startMins = timeToMins(formStartTime);
    const endMins = timeToMins(formEndTime);

    if (endMins <= startMins) {
      alert("End time must be after start time.");
      return;
    }

    const newAct = {
      id: editingActivity ? editingActivity.id : `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: formTitle.trim(),
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      venue: formVenue.trim(),
      description: formDescription.trim(),
      tags: formTags
    };

    let updatedList;
    if (editingActivity) {
      updatedList = activities.map(a => a.id === editingActivity.id ? newAct : a);
    } else {
      updatedList = [...activities, newAct];
    }

    saveToCloud(updatedList);
    setIsActivityModalOpen(false);
  };

  const handleDeleteActivity = (actId) => {
    setConfirmDialog({
      title: "Delete Activity",
      message: "Are you sure you want to delete this activity? This action will sync across all connected clients.",
      onConfirm: () => {
        const updated = activities.filter(a => a.id !== actId);
        saveToCloud(updated);
        setConfirmDialog(null);
      }
    });
  };

  // Batch delete selected activities
  const handleBatchDelete = () => {
    if (selectedActIds.size === 0) return;
    setConfirmDialog({
      title: `Delete ${selectedActIds.size} Selected Activities`,
      message: `Are you sure you want to delete ${selectedActIds.size} activities in bulk?`,
      onConfirm: () => {
        const updated = activities.filter(a => !selectedActIds.has(a.id));
        saveToCloud(updated);
        setSelectedActIds(new Set());
        setBatchMode(false);
        setConfirmDialog(null);
      }
    });
  };

  // Convert Read-Only Snapshot into Editable Live Sync copy
  const handleMakeEditableCopy = () => {
    window.location.hash = '';
    setIsReadOnly(false);
    setReadOnlyBanner(false);
    saveToCloud(activities, tags);
  };

  // Generate Read-Only Share Link (Method 2)
  const handleShareReadOnlyLink = () => {
    const payload = { activities, tags };
    const encoded = btoa(JSON.stringify(payload));
    const shareUrl = `${window.location.origin}${window.location.pathname}#mode=view&data=${encodeURIComponent(encoded)}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 3000);
    });
  };

  // Initiate Mouse Drag or Resize
  const handleMouseDown = (e, act, isResize = false) => {
    if (isReadOnly || batchMode) return;
    e.stopPropagation();

    const columnEl = e.currentTarget.closest('[data-day-column="true"]');
    let grabOffsetMins = 0;

    if (columnEl && !isResize) {
      const rect = columnEl.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const pointerMins = GRID_START_MINS + (offsetY / rect.height) * TOTAL_GRID_MINS;
      const actStartMins = timeToMins(act.startTime);
      grabOffsetMins = pointerMins - actStartMins;
    }

    setDraggingAct({
      actId: act.id,
      initialStartMins: timeToMins(act.startTime),
      initialEndMins: timeToMins(act.endTime),
      isResize,
      grabOffsetMins: Math.max(0, grabOffsetMins)
    });
  };

  // Filter activities based on Search query & selected Tag filters
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      // Search title, venue, or description
      const matchesSearch = !searchQuery ||
        act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (act.venue && act.venue.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (act.description && act.description.toLowerCase().includes(searchQuery.toLowerCase()));

      // Tag Filter: if tags selected, activity must have at least 1 selected tag
      const matchesTag = selectedTagFilters.length === 0 ||
        act.tags.some(t => selectedTagFilters.includes(t));

      return matchesSearch && matchesTag;
    });
  }, [activities, searchQuery, selectedTagFilters]);

  // Conflict evaluation map
  const conflictMap = useMemo(() => {
    return detectConflicts(activities);
  }, [activities]);

  // Active conflict count summary
  const conflictSummary = useMemo(() => {
    let tagConflicts = 0;
    let venueConflicts = 0;
    conflictMap.forEach(v => {
      if (v.tagConflict) tagConflicts++;
      if (v.venueConflict) venueConflicts++;
    });
    return { tagConflicts, venueConflicts, total: tagConflicts + venueConflicts };
  }, [conflictMap]);

  // Venue list history for auto-complete/suggestions
  const existingVenues = useMemo(() => {
    const set = new Set();
    activities.forEach(a => { if (a.venue) set.add(a.venue); });
    return Array.from(set);
  }, [activities]);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>

      {/* Read-Only Mode Amber Alert Banner */}
      {readOnlyBanner && (
        <div className="bg-amber-500 text-slate-950 font-semibold px-4 py-2.5 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 animate-pulse" />
            <span>👁️ <strong>Read-Only Shared View</strong> — You are viewing a read-only snapshot. Editing is currently locked.</span>
          </div>
          <button
            onClick={handleMakeEditableCopy}
            className="bg-slate-900 text-amber-400 hover:bg-slate-800 px-3 py-1 rounded-md text-xs font-bold transition flex items-center space-x-1"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Make Editable Copy & Live Sync</span>
          </button>
        </div>
      )}

      {/* Main App Navigation Header */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'} px-4 py-3 shadow-sm`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">

          {/* Logo & Live Sync Indicator */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl text-white shadow-md">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                YMSAT Schedule Planner
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Jan 20 – Jan 27, 2027 • 6:00 AM – 6:00 PM</p>
            </div>

            {/* Cloud Sync Status Badge */}
            <div className="ml-2">
              {syncStatus === 'synced' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <span className="w-2 h-2 mr-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  🟢 Live Cloud Sync Active
                </span>
              )}
              {syncStatus === 'local' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300">
                  <span className="w-2 h-2 mr-1.5 rounded-full bg-amber-500"></span>
                  🟡 Local Cache
                </span>
              )}
              {syncStatus === 'connecting' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Syncing...
                </span>
              )}
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center space-x-2">
            {!isReadOnly && (
              <button
                onClick={() => openAddActivityModal()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-sm font-medium shadow-sm transition flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Activity</span>
              </button>
            )}

            <button
              onClick={handleShareReadOnlyLink}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition flex items-center space-x-1.5 ${darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'}`}
              title="Copy Read-Only Share Link"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Link</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-lg border transition ${darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-300 bg-white hover:bg-slate-50'}`}
              title="Settings & JSON Backup"
            >
              <Layers className="w-4 h-4" />
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg border transition ${darkMode ? 'border-slate-700 bg-slate-800 text-yellow-400' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Share Link Toast Notification */}
      {shareToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-bounce">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">Read-Only Link copied to clipboard!</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-4">

        {/* Toolbar Bar */}
        <div className={`p-3.5 rounded-xl border shadow-sm flex flex-wrap items-center justify-between gap-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search activity, venue, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'}`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tag Filter Selector */}
          <div className="flex items-center space-x-1.5 flex-wrap gap-1">
            <Filter className="w-4 h-4 text-slate-400 mr-1" />
            {tags.map(tag => {
              const isSelected = selectedTagFilters.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedTagFilters(selectedTagFilters.filter(t => t !== tag.name));
                    } else {
                      setSelectedTagFilters([...selectedTagFilters, tag.name]);
                    }
                  }}
                  style={{ backgroundColor: isSelected ? tag.color : 'transparent', borderColor: tag.color }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${isSelected ? 'text-slate-900 shadow-sm font-semibold' : darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {tag.name}
                </button>
              );
            })}
            {selectedTagFilters.length > 0 && (
              <button
                onClick={() => setSelectedTagFilters([])}
                className="text-xs text-blue-500 hover:underline px-1 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Batch Mode Toggle */}
          {!isReadOnly && (
            <div className="flex items-center space-x-2 border-l pl-3 border-slate-300 dark:border-slate-700">
              <button
                onClick={() => {
                  setBatchMode(!batchMode);
                  setSelectedActIds(new Set());
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center space-x-1.5 ${batchMode ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : darkMode ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-300 bg-white text-slate-700'}`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{batchMode ? 'Exit Batch Mode' : 'Batch Select'}</span>
              </button>

              {batchMode && selectedActIds.size > 0 && (
                <button
                  onClick={handleBatchDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedActIds.size})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Conflict Warning Summary Banner (if conflicts exist) */}
        {conflictSummary.total > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs text-rose-700 dark:text-rose-300 gap-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>
                <strong>Scheduling Conflicts Detected:</strong> {conflictSummary.tagConflicts > 0 && `${conflictSummary.tagConflicts} Tag Overlap(s)`} {conflictSummary.venueConflicts > 0 && `${conflictSummary.venueConflicts} Venue Double-Booking(s)`}. Affected items are highlighted below.
              </span>
            </div>
            <span className="font-mono text-[10px] bg-rose-200 dark:bg-rose-900/50 px-2 py-0.5 rounded">
              ⚠️ Conflict Rules Enforced
            </span>
          </div>
        )}

        <div className={`rounded-xl border shadow-sm overflow-x-auto ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="min-w-[1100px]">

            {/* Date Header Row */}
            <div className={`grid grid-cols-[80px_repeat(8,1fr)] border-b text-center text-xs font-semibold ${darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
              <div className="p-3 flex items-center justify-center border-r border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-400">
                Time
              </div>
              {EVENT_DATES.map((d) => {
                const dayActCount = filteredActivities.filter(a => a.date === d.id).length;
                return (
                  <div key={d.id} className="p-2.5 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-between group">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{d.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">{d.dayName}</div>
                    </div>
                    <div className="mt-1 flex items-center justify-between w-full px-1">
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-600 dark:text-slate-400 font-mono">
                        {dayActCount} {dayActCount === 1 ? 'act' : 'acts'}
                      </span>
                      <button
                        onClick={() => setExpandedDay(d.id)}
                        className="text-blue-500 hover:text-blue-600 p-0.5 rounded hover:bg-blue-50 dark:hover:bg-slate-800 transition"
                        title="Expand Single Day View"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Grid Layout Body */}
            <div className="relative grid grid-cols-[80px_repeat(8,1fr)] h-[720px] select-none">

              {/* Left Time Markers Column */}
              <div className="border-r border-slate-200 dark:border-slate-800 relative font-mono text-[11px] text-slate-400">
                {Array.from({ length: 13 }).map((_, idx) => {
                  const mins = GRID_START_MINS + idx * 60;
                  const topPercent = (idx / 12) * 100;
                  return (
                    <div
                      key={mins}
                      style={{ top: `${topPercent}%` }}
                      className="absolute left-0 right-0 -translate-y-1/2 text-center pr-2 font-medium"
                    >
                      {format12H(minsToTime(mins))}
                    </div>
                  );
                })}
              </div>

              {/* 8 Day Event Columns */}
              {EVENT_DATES.map((d) => {
                const dayActivities = filteredActivities.filter(a => a.date === d.id);
                const layoutedActivities = computeOverlappingDayLayouts(dayActivities);

                return (
                  <div
                    key={d.id}
                    data-day-column="true"
                    data-day-id={d.id}
                    className="relative border-r border-slate-200 dark:border-slate-800 h-full group/col"
                  >
                    {/* Hourly Horizontal Grid Lines */}
                    {Array.from({ length: 12 }).map((_, idx) => (
                      <div
                        key={idx}
                        style={{ top: `${(idx / 12) * 100}%` }}
                        className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800/60 pointer-events-none"
                      />
                    ))}

                    {/* Quick Add Hover Trigger */}
                    {!isReadOnly && !batchMode && !draggingAct && (
                      <div
                        onClick={() => openAddActivityModal(d.id, '09:00')}
                        className="absolute inset-0 bg-blue-500/0 hover:bg-blue-500/5 transition cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100"
                      >
                        <span className="bg-blue-600 text-white text-[11px] px-2 py-1 rounded shadow font-medium flex items-center space-x-1">
                          <Plus className="w-3 h-3" />
                          <span>Add to {d.label}</span>
                        </span>
                      </div>
                    )}

                    {/* Render Activity Event Cards */}
                    {layoutedActivities.map((act) => {
                      const startMins = timeToMins(act.startTime);
                      const endMins = timeToMins(act.endTime);

                      const topPercent = ((startMins - GRID_START_MINS) / TOTAL_GRID_MINS) * 100;
                      const heightPercent = ((endMins - startMins) / TOTAL_GRID_MINS) * 100;

                      const conflicts = conflictMap.get(act.id) || { tagConflict: false, venueConflict: false };
                      const isTagConf = conflicts.tagConflict;
                      const isVenueConf = conflicts.venueConflict;
                      const isSelected = selectedActIds.has(act.id);
                      const isBeingDragged = draggingAct?.actId === act.id;

                      // Style Determination: Tag conflict = Solid BLACK; Venue conflict = Solid WHITE with blue border; Combined = Zebra
                      let cardStyle = {};
                      let cardClasses = "absolute rounded-md p-1.5 shadow-sm border transition-all text-xs overflow-hidden flex flex-col justify-between group/card select-none ";

                      if (!isReadOnly && !batchMode) {
                        cardClasses += "cursor-grab active:cursor-grabbing ";
                      }

                      if (isBeingDragged) {
                        cardClasses += "z-30 opacity-90 ring-2 ring-blue-500 shadow-xl scale-[1.02] ";
                      }

                      if (isTagConf && isVenueConf) {
                        // Combined Conflict: Zebra striped pattern
                        cardClasses += "bg-slate-950 text-white border-2 border-blue-500 ring-2 ring-rose-500 ";
                        cardStyle = {
                          backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 10px, #fff 10px, #fff 20px)',
                          color: '#000'
                        };
                      } else if (isTagConf) {
                        // Tag Conflict: Solid BLACK background, white text
                        cardClasses += "bg-slate-950 text-white border-slate-900 font-medium ";
                      } else if (isVenueConf) {
                        // Venue Conflict: Solid WHITE background, heavy blue border
                        cardClasses += "bg-white text-slate-950 border-[3px] border-blue-600 font-medium shadow-md ";
                      } else {
                        // Normal Activity Style with multi-tag linear gradient
                        const multiBg = getMultiTagBackground(act.tags, tags);
                        cardStyle = { background: multiBg };
                        cardClasses += "border-slate-300/70 dark:border-slate-700/70 text-slate-900 font-medium hover:shadow-md ";
                      }

                      return (
                        <div
                          key={act.id}
                          style={{
                            top: `${topPercent}%`,
                            height: `${heightPercent}%`,
                            left: `${act.left}%`,
                            width: `${act.width}%`,
                            ...cardStyle
                          }}
                          onMouseDown={(e) => handleMouseDown(e, act, false)}
                          onClick={(e) => {
                            if (batchMode) {
                              e.stopPropagation();
                              const newSet = new Set(selectedActIds);
                              if (newSet.has(act.id)) newSet.delete(act.id);
                              else newSet.add(act.id);
                              setSelectedActIds(newSet);
                            }
                          }}
                          className={cardClasses}
                        >
                          {/* Card Content Top */}
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <div className="font-bold truncate text-[11px] leading-tight">
                                {act.title}
                              </div>

                              {/* Batch Selection Checkbox */}
                              {batchMode && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => { }}
                                  className="rounded border-slate-400 text-blue-600 focus:ring-0"
                                />
                              )}
                            </div>

                            {/* Time & Venue Info */}
                            <div className="text-[10px] opacity-90 flex items-center space-x-1 mt-0.5 font-mono">
                              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                              <span>{format12H(act.startTime)} - {format12H(act.endTime)}</span>
                            </div>

                            {act.venue && (
                              <div className="text-[10px] font-semibold flex items-center space-x-1 mt-0.5 truncate">
                                <MapPin className="w-2.5 h-2.5 flex-shrink-0 text-rose-600" />
                                <span className="truncate">{act.venue}</span>
                              </div>
                            )}
                          </div>

                          {/* Conflict Badges & Tags Footer */}
                          <div>
                            {isTagConf && (
                              <div className="bg-red-600 text-white font-bold text-[9px] px-1 py-0.5 rounded mt-1 inline-flex items-center space-x-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>⚠️ TAG CONFLICT</span>
                              </div>
                            )}

                            {isVenueConf && (
                              <div className="bg-blue-600 text-white font-bold text-[9px] px-1 py-0.5 rounded mt-1 inline-flex items-center space-x-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                <span>⚠️ VENUE CONFLICT</span>
                              </div>
                            )}

                            {!isTagConf && !isVenueConf && act.tags && act.tags.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 mt-1">
                                {act.tags.map(t => (
                                  <span key={t} className="bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 text-[9px] px-1 py-0.2 rounded font-semibold border border-slate-300 dark:border-slate-700">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action Hover Controls (Edit / Delete) */}
                          {!isReadOnly && !batchMode && (
                            <div className="absolute top-1 right-1 opacity-0 group-hover/card:opacity-100 flex items-center space-x-0.5 bg-slate-900/80 text-white rounded p-0.5 transition">
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditActivityModal(act); }}
                                className="p-0.5 hover:text-blue-400"
                                title="Edit Activity"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteActivity(act.id); }}
                                className="p-0.5 hover:text-red-400"
                                title="Delete Activity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Resize Bottom Handle */}
                          {!isReadOnly && !batchMode && (
                            <div
                              onMouseDown={(e) => handleMouseDown(e, act, true)}
                              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-500/50"
                              title="Drag to Resize Duration (5-min precision)"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl border shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Scheduled Activities</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{activities.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Duration</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {(activities.reduce((acc, a) => acc + (timeToMins(a.endTime) - timeToMins(a.startTime)), 0) / 60).toFixed(1)} hrs
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Conflict Status</div>
            <div className={`text-xl font-bold mt-1 ${conflictSummary.total > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {conflictSummary.total > 0 ? `⚠️ ${conflictSummary.total} Issue(s)` : '✅ Clean'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Filters</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {selectedTagFilters.length > 0 ? `${selectedTagFilters.length} Tag(s)` : 'Showing All'}
            </div>
          </div>
        </div>
      </main>


      {/* MODAL 1: Add/Edit Activity Modal */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>{editingActivity ? 'Edit Activity' : 'Add New Activity'}</span>
              </h2>
              <button onClick={() => setIsActivityModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Activity Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Quiz Bee Final Round"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${darkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Date</label>
                  <select
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className={`w-full px-2.5 py-2 text-xs rounded-lg border focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  >
                    {EVENT_DATES.map(d => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Start Time (5-min step)</label>
                  <input
                    type="time"
                    step="300"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className={`w-full px-2.5 py-2 text-xs rounded-lg border focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">End Time</label>
                  <input
                    type="time"
                    step="300"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className={`w-full px-2.5 py-2 text-xs rounded-lg border focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  />
                </div>
              </div>

              {/* Venue Input with Auto-Suggestions */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Venue / Location</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. AVR Room 1, Main Field, Gymnasium"
                    list="venue-suggestions"
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${darkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  />
                  <datalist id="venue-suggestions">
                    {existingVenues.map(v => <option key={v} value={v} />)}
                  </datalist>
                </div>
              </div>

              {/* Tag Selection Multi-Checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Grade Level Tags</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => {
                    const isChecked = formTags.includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setFormTags(formTags.filter(t => t !== tag.name));
                          } else {
                            setFormTags([...formTags, tag.name]);
                          }
                        }}
                        style={{ backgroundColor: isChecked ? tag.color : 'transparent', borderColor: tag.color }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition flex items-center space-x-1 ${isChecked ? 'text-slate-900 shadow-sm' : 'text-slate-500'}`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                        <span>{tag.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Description / Notes</label>
                <textarea
                  rows="2"
                  placeholder="Additional event guidelines or equipment requirements..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${darkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md transition"
                >
                  {editingActivity ? 'Save Changes' : 'Create Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Expanded Single Day View Modal */}
      {expandedDay && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-4xl h-[90vh] rounded-2xl border shadow-2xl flex flex-col p-6 overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold flex items-center space-x-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <span>{EVENT_DATES.find(d => d.id === expandedDay)?.label} - Single Day Focus</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Full resolution view with side-by-side overlap rendering.
                </p>
              </div>
              <button onClick={() => setExpandedDay(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Expanded Day Grid Body */}
            <div className="flex-1 overflow-y-auto mt-4 pr-2 relative">
              <div className="relative grid grid-cols-[80px_1fr] h-[1000px] select-none border rounded-xl overflow-hidden">
                {/* Time Axis */}
                <div className="border-r border-slate-200 dark:border-slate-800 relative font-mono text-xs text-slate-400 bg-slate-50 dark:bg-slate-950">
                  {Array.from({ length: 13 }).map((_, idx) => {
                    const mins = GRID_START_MINS + idx * 60;
                    return (
                      <div key={mins} style={{ top: `${(idx / 12) * 100}%` }} className="absolute left-0 right-0 -translate-y-1/2 text-center font-medium">
                        {format12H(minsToTime(mins))}
                      </div>
                    );
                  })}
                </div>

                {/* Day Column Events */}
                <div className="relative h-full">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div key={idx} style={{ top: `${(idx / 12) * 100}%` }} className="absolute left-0 right-0 border-t border-slate-200 dark:border-slate-800/60" />
                  ))}

                  {computeOverlappingDayLayouts(filteredActivities.filter(a => a.date === expandedDay)).map(act => {
                    const startMins = timeToMins(act.startTime);
                    const endMins = timeToMins(act.endTime);
                    const topPercent = ((startMins - GRID_START_MINS) / TOTAL_GRID_MINS) * 100;
                    const heightPercent = ((endMins - startMins) / TOTAL_GRID_MINS) * 100;

                    const multiBg = getMultiTagBackground(act.tags, tags);

                    return (
                      <div
                        key={act.id}
                        style={{
                          top: `${topPercent}%`,
                          height: `${heightPercent}%`,
                          left: `${act.left}%`,
                          width: `${act.width}%`,
                          background: multiBg
                        }}
                        className="absolute rounded-lg p-2.5 border border-slate-300 shadow-md text-slate-900 flex flex-col justify-between"
                      >
                        <div>
                          <div className="font-bold text-sm">{act.title}</div>
                          <div className="text-xs font-mono font-medium opacity-90 mt-0.5">
                            {format12H(act.startTime)} - {format12H(act.endTime)}
                          </div>
                          {act.venue && (
                            <div className="text-xs font-semibold flex items-center space-x-1 mt-1">
                              <MapPin className="w-3 h-3 text-rose-600" />
                              <span>{act.venue}</span>
                            </div>
                          )}
                          {act.description && (
                            <p className="text-xs mt-1.5 line-clamp-2 opacity-80">{act.description}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {act.tags.map(t => (
                            <span key={t} className="bg-white/90 text-slate-900 text-[10px] px-1.5 py-0.5 rounded font-bold border border-slate-300">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Settings & JSON Backup Import/Export Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                <span>Settings & Data Management</span>
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">JSON Backup Options</h3>
                <div className="grid grid-cols-2 gap-2">
                  {/* Export JSON */}
                  <button
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ activities, tags }, null, 2));
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `ymsat_2027_schedule_backup.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                    }}
                    className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex flex-col items-center justify-center text-xs font-semibold space-y-1"
                  >
                    <Download className="w-5 h-5 text-blue-500" />
                    <span>Export JSON</span>
                  </button>

                  {/* Import JSON */}
                  <label className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex flex-col items-center justify-center text-xs font-semibold space-y-1 cursor-pointer">
                    <Upload className="w-5 h-5 text-emerald-500" />
                    <span>Import JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const parsed = JSON.parse(event.target.result);
                              if (Array.isArray(parsed.activities)) {
                                saveToCloud(parsed.activities, parsed.tags || tags);
                                setIsSettingsOpen(false);
                                alert("Schedule backup successfully imported!");
                              }
                            } catch (err) {
                              alert("Invalid JSON schedule file.");
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Reset Default Activity */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => {
                    setConfirmDialog({
                      title: "Reset Schedule Data",
                      message: "Are you sure you want to restore default Opening Program activity?",
                      onConfirm: () => {
                        saveToCloud(DEFAULT_INITIAL_ACTIVITIES, DEFAULT_TAGS);
                        setIsSettingsOpen(false);
                        setConfirmDialog(null);
                      }
                    });
                  }}
                  className="w-full text-center text-xs text-rose-500 hover:text-rose-600 font-semibold py-1.5"
                >
                  Reset to Default Opening Program
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Custom Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl border shadow-2xl p-5 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center space-x-2 text-amber-500 mb-2">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-base">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              {confirmDialog.message}
            </p>
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800 mt-auto">
        YMSAT 2027 Schedule Planner • Powered by Firebase Firestore Real-Time Sync
      </footer>
    </div>
  );
}