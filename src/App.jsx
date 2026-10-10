import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";
import {
  Calendar, Clock, MapPin, Plus, Trash2, Edit3, Share2, Download, Upload,
  Sun, Moon, Search, Filter, CheckSquare, Square, X, AlertTriangle, Maximize2, Minimize2, RotateCcw,
  Eye, Copy, RefreshCw, Tag, Info, Check, ShieldAlert, Zap, Layers, Sparkles, Palette,
  ChevronDown, ChevronLeft, ChevronRight, Sliders, Undo2, Redo2, Printer, GripVertical, Columns, Code, ExternalLink
} from 'lucide-react';

// Firebase credentials for Method 3 Cloud Synchronization
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

// Fixed Primary Grade Tags for Vertical Alignment (6 Lanes)
const FIXED_GRADE_TAGS = [
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12'
];

const TAG_ORDER_PRIORITY = [
  ...FIXED_GRADE_TAGS,
  'Guests (Students)',
  'Guests (Teachers)'
];

// Preset Pastel Tags including Guest categories
const DEFAULT_TAGS = [
  { id: 'tag-g7', name: 'Grade 7', color: '#a7f3d0' },  // pastel green
  { id: 'tag-g8', name: 'Grade 8', color: '#fef08a' },  // pastel yellow
  { id: 'tag-g9', name: 'Grade 9', color: '#fca5a5' },  // pastel red
  { id: 'tag-g10', name: 'Grade 10', color: '#93c5fd' }, // pastel blue
  { id: 'tag-g11', name: 'Grade 11', color: '#fbcfe8' }, // pastel pink
  { id: 'tag-g12', name: 'Grade 12', color: '#fed7aa' }, // pastel orange
  { id: 'tag-gs', name: 'Guests (Students)', color: '#ddd6fe' }, // pastel purple
  { id: 'tag-gt', name: 'Guests (Teachers)', color: '#bae6fd' }, // pastel cyan
];

const PASTEL_PALETTE = [
  '#a7f3d0', '#fef08a', '#fca5a5', '#93c5fd', '#fbcfe8', '#fed7aa',
  '#c084fc', '#ddd6fe', '#bae6fd', '#a7f3d0', '#fde68a', '#e2e8f0'
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

      if (a.date !== b.date) continue;

      const aStart = timeToMins(a.startTime);
      const aEnd = timeToMins(a.endTime);
      const bStart = timeToMins(b.startTime);
      const bEnd = timeToMins(b.endTime);

      if (aStart < bEnd && bStart < aEnd) {
        const sharedTags = a.tags.filter(t => b.tags.includes(t));
        if (sharedTags.length > 0) {
          conflictMap.get(a.id).tagConflict = true;
          conflictMap.get(b.id).tagConflict = true;
        }

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
 * Computes track-aligned horizontal positions for activities.
 * Supports per-day automatic collapsing of empty grade lanes (`isAutoFitLanes`).
 */
function computeOverlappingDayLayouts(dayActivities, allTags = [], isAutoFitLanes = false) {
  if (!dayActivities || dayActivities.length === 0) return [];

  const nonGradeTagsSet = new Set();
  dayActivities.forEach(act => {
    if (act.tags && act.tags.length > 0) {
      act.tags.forEach(t => {
        const isGrade = FIXED_GRADE_TAGS.some(g => g.toLowerCase() === t.trim().toLowerCase());
        if (!isGrade) {
          nonGradeTagsSet.add(t.trim());
        }
      });
    }
  });

  const nonGradeTagsList = Array.from(nonGradeTagsSet).sort((a, b) => {
    const idxA = allTags.findIndex(t => t.name.toLowerCase() === a.toLowerCase());
    const idxB = allTags.findIndex(t => t.name.toLowerCase() === b.toLowerCase());
    return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
  });

  const allDayTracks = [...FIXED_GRADE_TAGS, ...nonGradeTagsList];

  const activeTagsOnDay = new Set();
  dayActivities.forEach(act => {
    if (act.tags) {
      act.tags.forEach(t => activeTagsOnDay.add(t.trim().toLowerCase()));
    }
  });

  const trackWeights = allDayTracks.map(trackTag => {
    const isGrade = FIXED_GRADE_TAGS.some(g => g.toLowerCase() === trackTag.toLowerCase());
    if (isAutoFitLanes && isGrade) {
      const hasActivityOnDay = activeTagsOnDay.has(trackTag.toLowerCase());
      return hasActivityOnDay ? 1 : 0;
    }
    return 1;
  });

  let totalWeight = trackWeights.reduce((sum, w) => sum + w, 0);

  if (totalWeight === 0) {
    for (let i = 0; i < trackWeights.length; i++) trackWeights[i] = 1;
    totalWeight = trackWeights.length;
  }

  const trackOffsets = [];
  const trackWidths = [];
  let currentOffset = 0;

  for (let i = 0; i < allDayTracks.length; i++) {
    const wPercent = (trackWeights[i] / totalWeight) * 100;
    trackOffsets.push(currentOffset);
    trackWidths.push(wPercent);
    currentOffset += wPercent;
  }

  return dayActivities.map(act => {
    const matchingIndices = [];

    if (act.tags && act.tags.length > 0) {
      act.tags.forEach(t => {
        const idx = allDayTracks.findIndex(
          trackTag => trackTag.toLowerCase() === t.trim().toLowerCase()
        );
        if (idx !== -1) {
          matchingIndices.push(idx);
        }
      });
    }

    let left = 0;
    let width = 100;

    if (matchingIndices.length > 0) {
      const minIdx = Math.min(...matchingIndices);
      const maxIdx = Math.max(...matchingIndices);

      left = trackOffsets[minIdx];
      width = 0;
      for (let k = minIdx; k <= maxIdx; k++) {
        width += trackWidths[k];
      }
    }

    return {
      ...act,
      left,
      width
    };
  });
}

// Compute multi-tag linear gradient style for activity cards
function getMultiTagBackground(actTags, allTags) {
  if (!actTags || actTags.length === 0) return '#e5e7eb';
  const tagColors = actTags.map(tName => {
    const found = allTags.find(t => t.name === tName);
    return found ? found.color : '#cbd5e1';
  });

  if (tagColors.length === 1) return tagColors[0];

  const step = 100 / tagColors.length;
  const stops = tagColors.map((c, i) => `${c} ${i * step}%, ${c} ${(i + 1) * step}%`).join(', ');
  return `linear-gradient(135deg, ${stops})`;
}

export default function App() {
  // Core Data States
  const [activities, setActivities] = useState([]);
  const [tags, setTags] = useState(DEFAULT_TAGS);

  // Layout Minimization States
  const [minimizedDayIds, setMinimizedDayIds] = useState([]);
  const [autoFitLaneDayIds, setAutoFitLaneDayIds] = useState([]);

  // Dynamic Date and Time Display Range States
  const [startDateFilter, setStartDateFilter] = useState('2027-01-21');
  const [endDateFilter, setEndDateFilter] = useState('2027-01-26');
  const [gridStartTime, setGridStartTime] = useState('06:00'); // 6:00 AM
  const [gridEndTime, setGridEndTime] = useState('18:00');   // 6:00 PM
  const [isRangeSettingsOpen, setIsRangeSettingsOpen] = useState(false);

  // Calendar Width & Height Scaling States (100% to 500%)
  const [gridWidthScale, setGridWidthScale] = useState(100);
  const [gridHeightScale, setGridHeightScale] = useState(100);

  // Hover 1-Second Activity Details Popover State
  const [hoverPopover, setHoverPopover] = useState(null);
  const hoverTimerRef = useRef(null);
  const popoverLeaveTimerRef = useRef(null);

  // Undo / Redo History Stacks
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const dragSnapshotRef = useRef(null);

  // Derived Range Math
  const currentStartMins = useMemo(() => timeToMins(gridStartTime), [gridStartTime]);
  const currentEndMins = useMemo(() => Math.max(timeToMins(gridEndTime), currentStartMins + 60), [gridEndTime, currentStartMins]);
  const totalGridMins = useMemo(() => currentEndMins - currentStartMins, [currentStartMins, currentEndMins]);

  // Ref to store time range for mouse move listeners
  const timeRangeRef = useRef({ startMins: 360, endMins: 1080, totalMins: 720 });
  useEffect(() => {
    timeRangeRef.current = {
      startMins: currentStartMins,
      endMins: currentEndMins,
      totalMins: totalGridMins
    };
  }, [currentStartMins, currentEndMins, totalGridMins]);

  // Filtered Display Dates based on Range Selection
  const displayedDates = useMemo(() => {
    return EVENT_DATES.filter(d => d.id >= startDateFilter && d.id <= endDateFilter);
  }, [startDateFilter, endDateFilter]);

  // List of days with 0 scheduled activities
  const emptyDayIds = useMemo(() => {
    return displayedDates
      .filter(d => activities.filter(a => a.date === d.id).length === 0)
      .map(d => d.id);
  }, [displayedDates, activities]);

  // Dynamic Grid Template Columns definition considering minimized day widths
  const gridColumnsTemplate = useMemo(() => {
    const colSpecs = displayedDates.map(d =>
      minimizedDayIds.includes(d.id) ? '48px' : 'minmax(120px, 1fr)'
    );
    return `80px ${colSpecs.join(' ')}`;
  }, [displayedDates, minimizedDayIds]);

  // Refs to access current activities/tags inside global event listeners
  const activitiesRef = useRef(activities);
  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  const tagsRef = useRef(tags);
  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);

  // Sync & Sharing States
  const [syncStatus, setSyncStatus] = useState('connecting');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [readOnlyBanner, setReadOnlyBanner] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(''); // 'link' or 'embed' or ''

  // UI Navigation & View States
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilters, setSelectedTagFilters] = useState([]);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedActIds, setSelectedActIds] = useState(new Set());

  // Modals & Dialogs
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Tag Management State
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState(null);
  const [tagNameInput, setTagNameInput] = useState('');
  const [tagColorInput, setTagColorInput] = useState('#93c5fd');

  // Tag Drag-and-Drop Reordering States
  const [draggedTagIndex, setDraggedTagIndex] = useState(null);
  const [dragOverTagIndex, setDragOverTagIndex] = useState(null);

  // Form State for Activity Add/Edit
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('2027-01-21');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('09:00');
  const [formVenue, setFormVenue] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTags, setFormTags] = useState([]);

  // Dragging and Resizing state tracking
  const [draggingAct, setDraggingAct] = useState(null);

  // Generated Live Share Link and Embed Code
  const liveShareUrl = useMemo(() => {
    return `${window.location.origin}${window.location.pathname}#mode=view`;
  }, []);

  const iframeEmbedCode = useMemo(() => {
    return `<iframe src="${liveShareUrl}" width="100%" height="800px" frameborder="0" style="border:0;" allowfullscreen></iframe>`;
  }, [liveShareUrl]);

  // Effect for Closing Filter Menu on Outside Click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle Day Minimization
  const toggleMinimizeDay = (dayId) => {
    setMinimizedDayIds(prev =>
      prev.includes(dayId) ? prev.filter(id => id !== dayId) : [...prev, dayId]
    );
  };

  // Toggle Per-Day Empty Grade Lanes Minimization
  const toggleAutoFitDayLanes = (dayId) => {
    setAutoFitLaneDayIds(prev =>
      prev.includes(dayId) ? prev.filter(id => id !== dayId) : [...prev, dayId]
    );
  };

  // Reset all minimizations
  const handleResetWidths = () => {
    setMinimizedDayIds([]);
    setAutoFitLaneDayIds([]);
  };

  // Effect 1: Detect Hash Mode for View-Only Execution
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.includes('mode=view') || hash.includes('mode=readonly')) {
        setIsReadOnly(true);
        setReadOnlyBanner(true);
      } else {
        setIsReadOnly(false);
        setReadOnlyBanner(false);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Effect 2: Real-time Firestore Synchronization for BOTH Admin and Read-Only Views
  useEffect(() => {
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
        } else if (!isReadOnly) {
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

  // Hover Popover Timers
  const handleActivityMouseEnter = (e, act) => {
    if (draggingAct) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (popoverLeaveTimerRef.current) clearTimeout(popoverLeaveTimerRef.current);

    const rect = e.currentTarget.getBoundingClientRect();

    hoverTimerRef.current = setTimeout(() => {
      const popoverWidth = 280;
      const popoverHeight = 280;

      let x = rect.right + 10;
      if (x + popoverWidth > window.innerWidth) {
        x = Math.max(10, rect.left - popoverWidth - 10);
      }

      let y = Math.max(10, Math.min(rect.top, window.innerHeight - popoverHeight - 10));

      setHoverPopover({
        act,
        x,
        y
      });
    }, 1000);
  };

  const handleActivityMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    popoverLeaveTimerRef.current = setTimeout(() => {
      setHoverPopover(null);
    }, 250);
  };

  const handlePopoverMouseEnter = () => {
    if (popoverLeaveTimerRef.current) {
      clearTimeout(popoverLeaveTimerRef.current);
      popoverLeaveTimerRef.current = null;
    }
  };

  const handlePopoverMouseLeave = () => {
    setHoverPopover(null);
  };

  // Push updates to Firestore
  const saveToCloud = async (newActivities, newTags = tags, recordHistory = true) => {
    if (isReadOnly) return;

    if (recordHistory) {
      const snapshotToPush = dragSnapshotRef.current || {
        activities: [...activitiesRef.current],
        tags: [...tagsRef.current]
      };
      setUndoStack(prev => [...prev.slice(-9), snapshotToPush]);
      setRedoStack([]);
      dragSnapshotRef.current = null;
    }

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

  // Undo Handler
  const handleUndo = () => {
    if (undoStack.length === 0 || isReadOnly) return;

    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, undoStack.length - 1);

    const currentState = {
      activities: [...activitiesRef.current],
      tags: [...tagsRef.current]
    };

    setRedoStack(prev => [...prev.slice(-9), currentState]);
    setUndoStack(newUndoStack);

    saveToCloud(previousState.activities, previousState.tags, false);
  };

  // Redo Handler
  const handleRedo = () => {
    if (redoStack.length === 0 || isReadOnly) return;

    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, redoStack.length - 1);

    const currentState = {
      activities: [...activitiesRef.current],
      tags: [...tagsRef.current]
    };

    setUndoStack(prev => [...prev.slice(-9), currentState]);
    setRedoStack(newRedoStack);

    saveToCloud(nextState.activities, nextState.tags, false);
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isReadOnly) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, isReadOnly]);

  // Global Mouse Event Listener for Drag & Resize
  useEffect(() => {
    if (!draggingAct || isReadOnly) return;

    const handleGlobalMouseMove = (e) => {
      const columnEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-day-column="true"]');
      if (!columnEl) return;

      const dayId = columnEl.getAttribute('data-day-id');
      const rect = columnEl.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const percentage = Math.max(0, Math.min(1, offsetY / rect.height));

      const { startMins, endMins, totalMins } = timeRangeRef.current;
      const currentMins = snapTo5Mins(startMins + percentage * totalMins);

      if (draggingAct.isResize) {
        const newEndMins = Math.max(draggingAct.initialStartMins + 15, Math.min(endMins, currentMins));
        const newEndTime = minsToTime(newEndMins);

        setActivities(prev => prev.map(a => a.id === draggingAct.actId ? { ...a, endTime: newEndTime } : a));
      } else {
        const duration = draggingAct.initialEndMins - draggingAct.initialStartMins;
        let newStartMins = snapTo5Mins(currentMins - draggingAct.grabOffsetMins);

        if (newStartMins < startMins) newStartMins = startMins;
        if (newStartMins + duration > endMins) newStartMins = endMins - duration;

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

  // Tag Management Handlers
  const startCreateTag = () => {
    setEditingTagId(null);
    setTagNameInput('');
    setTagColorInput('#93c5fd');
  };

  const startEditTag = (tag) => {
    setEditingTagId(tag.id);
    setTagNameInput(tag.name);
    setTagColorInput(tag.color);
  };

  const handleSaveTag = (e) => {
    e.preventDefault();
    if (!tagNameInput.trim()) return;

    const newName = tagNameInput.trim();

    if (editingTagId) {
      const oldTag = tags.find(t => t.id === editingTagId);
      const oldName = oldTag ? oldTag.name : '';

      const updatedTags = tags.map(t => t.id === editingTagId ? { ...t, name: newName, color: tagColorInput } : t);

      let updatedActivities = activities;
      if (oldName && oldName !== newName) {
        updatedActivities = activities.map(act => ({
          ...act,
          tags: act.tags.map(t => t === oldName ? newName : t)
        }));
        setSelectedTagFilters(prev => prev.map(t => t === oldName ? newName : t));
      }

      saveToCloud(updatedActivities, updatedTags);
    } else {
      if (tags.some(t => t.name.toLowerCase() === newName.toLowerCase())) {
        alert("A tag with this name already exists.");
        return;
      }
      const newTag = {
        id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: newName,
        color: tagColorInput
      };
      const updatedTags = [...tags, newTag];
      saveToCloud(activities, updatedTags);
    }

    startCreateTag();
  };

  const handleDeleteTag = (tagId, tagName) => {
    setConfirmDialog({
      title: `Delete Tag "${tagName}"`,
      message: `Are you sure you want to delete this tag? It will be removed from all assigned activities.`,
      onConfirm: () => {
        const updatedTags = tags.filter(t => t.id !== tagId);
        const updatedActivities = activities.map(act => ({
          ...act,
          tags: act.tags.filter(t => t !== tagName)
        }));
        setSelectedTagFilters(prev => prev.filter(t => t !== tagName));
        saveToCloud(updatedActivities, updatedTags);
        if (editingTagId === tagId) startCreateTag();
        setConfirmDialog(null);
      }
    });
  };

  // Drag-and-Drop Tag Reordering Handlers
  const handleTagDragStart = (e, index) => {
    setDraggedTagIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTagDragOver = (e, index) => {
    e.preventDefault();
    if (dragOverTagIndex !== index) {
      setDragOverTagIndex(index);
    }
  };

  const handleTagDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedTagIndex === null || draggedTagIndex === targetIndex) {
      setDraggedTagIndex(null);
      setDragOverTagIndex(null);
      return;
    }

    const updatedTags = [...tags];
    const [movedTag] = updatedTags.splice(draggedTagIndex, 1);
    updatedTags.splice(targetIndex, 0, movedTag);

    setDraggedTagIndex(null);
    setDragOverTagIndex(null);
    saveToCloud(activities, updatedTags);
  };

  const openAddActivityModal = (defaultDate = '2027-01-21', defaultStart = '08:00') => {
    setEditingActivity(null);
    setFormTitle('');
    setFormDate(defaultDate);
    setFormStartTime(defaultStart);
    const endMins = Math.min(timeToMins(defaultStart) + 60, currentEndMins);
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

  const handleMakeEditableCopy = () => {
    window.location.hash = '';
    setIsReadOnly(false);
    setReadOnlyBanner(false);
    saveToCloud(activities, tags);
  };

  const handleCopyTextToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(type);
      setTimeout(() => setCopyFeedback(''), 2500);
    });
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  const handleMouseDown = (e, act, isResize = false) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (popoverLeaveTimerRef.current) clearTimeout(popoverLeaveTimerRef.current);
    setHoverPopover(null);

    if (isReadOnly || batchMode) return;
    e.stopPropagation();

    dragSnapshotRef.current = {
      activities: [...activitiesRef.current],
      tags: [...tagsRef.current]
    };

    const columnEl = e.currentTarget.closest('[data-day-column="true"]');
    let grabOffsetMins = 0;

    if (columnEl && !isResize) {
      const rect = columnEl.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const pointerMins = currentStartMins + (offsetY / rect.height) * totalGridMins;
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

  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      const matchesSearch = !searchQuery ||
        act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (act.venue && act.venue.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (act.description && act.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag = selectedTagFilters.length === 0 ||
        act.tags.some(t => selectedTagFilters.includes(t));

      return matchesSearch && matchesTag;
    });
  }, [activities, searchQuery, selectedTagFilters]);

  const conflictMap = useMemo(() => {
    return detectConflicts(activities);
  }, [activities]);

  const conflictSummary = useMemo(() => {
    let tagConflicts = 0;
    let venueConflicts = 0;
    conflictMap.forEach(v => {
      if (v.tagConflict) tagConflicts++;
      if (v.venueConflict) venueConflicts++;
    });
    return { tagConflicts, venueConflicts, total: tagConflicts + venueConflicts };
  }, [conflictMap]);

  const existingVenues = useMemo(() => {
    const set = new Set();
    activities.forEach(a => { if (a.venue) set.add(a.venue); });
    return Array.from(set);
  }, [activities]);

  const hourTicks = useMemo(() => {
    const ticks = [];
    const startHour = Math.floor(currentStartMins / 60);
    const endHour = Math.ceil(currentEndMins / 60);
    for (let h = startHour; h <= endHour; h++) {
      const mins = h * 60;
      if (mins >= currentStartMins && mins <= currentEndMins) {
        ticks.push(mins);
      }
    }
    return ticks;
  }, [currentStartMins, currentEndMins]);

  const activeExpandedDayObj = useMemo(() => {
    return EVENT_DATES.find(d => d.id === expandedDay);
  }, [expandedDay]);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>

      {/* Global CSS for Landscape Printing */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          header, footer, .no-print, button, input, select {
            display: none !important;
          }
          .print-header-banner {
            display: block !important;
          }
          .overflow-x-auto, .overflow-y-auto, .overflow-hidden {
            overflow: visible !important;
          }
          .min-w-\\[1000px\\] {
            min-width: 100% !important;
            width: 100% !important;
          }
          .relative.h-\\[500px\\] {
            height: 820px !important;
          }
          .relative.h-\\[1000px\\] {
            height: 880px !important;
          }
          .print-modal-container {
            position: relative !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: landscape;
            margin: 8mm;
          }
        }
      `}</style>

      {/* Hover Activity Details Popover Card */}
      {hoverPopover && (
        <div
          style={{ top: `${hoverPopover.y}px`, left: `${hoverPopover.x}px` }}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          className={`fixed z-50 w-72 p-4 rounded-xl shadow-2xl border transition-opacity duration-200 pointer-events-auto no-print ${
            darkMode ? 'bg-slate-900/95 border-slate-700 text-slate-100' : 'bg-white/95 border-slate-300 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 mb-1.5">
            <div className="flex items-center space-x-1.5">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>Activity Overview</span>
            </div>
            {!isReadOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const actToEdit = hoverPopover.act;
                  setHoverPopover(null);
                  openEditActivityModal(actToEdit);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-0.5 rounded font-semibold transition flex items-center space-x-1 shadow-xs"
                title="Edit Activity Details"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            )}
          </div>

          <h4 className="font-bold text-sm leading-snug mb-2.5 text-slate-900 dark:text-slate-100">
            {hoverPopover.act.title}
          </h4>

          <div className="space-y-2 text-xs font-medium">
            <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>
                {EVENT_DATES.find(d => d.id === hoverPopover.act.date)?.label} ({EVENT_DATES.find(d => d.id === hoverPopover.act.date)?.dayName})
              </span>
            </div>

            <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>{format12H(hoverPopover.act.startTime)} – {format12H(hoverPopover.act.endTime)}</span>
            </div>

            {hoverPopover.act.venue && (
              <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-semibold">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{hoverPopover.act.venue}</span>
              </div>
            )}

            {hoverPopover.act.description && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed line-clamp-4">
                {hoverPopover.act.description}
              </div>
            )}

            {hoverPopover.act.tags && hoverPopover.act.tags.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-1">
                {hoverPopover.act.tags.map(tName => {
                  const tagObj = tags.find(t => t.name === tName);
                  return (
                    <span
                      key={tName}
                      style={{ backgroundColor: tagObj ? tagObj.color : '#cbd5e1' }}
                      className="text-slate-900 text-[10px] px-2 py-0.5 rounded font-bold border border-slate-300/50 shadow-xs"
                    >
                      {tName}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Read-Only Mode Amber Alert Banner */}
      {readOnlyBanner && (
        <div className="bg-amber-500 text-slate-950 font-semibold px-4 py-2.5 flex items-center justify-between shadow-md no-print">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 animate-pulse" />
            <span>👁️ <strong>Read-Only Live View Mode</strong> — You are viewing a live read-only schedule. All updates made by the admin sync here automatically.</span>
          </div>
          <button
            onClick={handleMakeEditableCopy}
            className="bg-slate-900 text-amber-400 hover:bg-slate-800 px-3 py-1 rounded-md text-xs font-bold transition flex items-center space-x-1"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Switch to Admin / Editable Mode</span>
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'} px-4 py-3 shadow-sm no-print`}>
        <div className="w-full flex flex-wrap items-center justify-between gap-3">

          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl text-white shadow-md">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                YMSAT Schedule Planner
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {EVENT_DATES.find(d => d.id === startDateFilter)?.label} – {EVENT_DATES.find(d => d.id === endDateFilter)?.label} • {format12H(gridStartTime)} – {format12H(gridEndTime)}
              </p>
            </div>

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

          <div className="flex items-center space-x-2">
            {!isReadOnly && (
              <>
                <div className="flex items-center space-x-1 border-r pr-2 border-slate-200 dark:border-slate-800">
                  <button
                    onClick={handleUndo}
                    disabled={undoStack.length === 0}
                    className={`p-2 rounded-lg border transition ${
                      undoStack.length === 0
                        ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400'
                        : darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                    title="Undo Action (Ctrl+Z)"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                    className={`p-2 rounded-lg border transition ${
                      redoStack.length === 0
                        ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400'
                        : darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                    title="Redo Action (Ctrl+Y / Ctrl+Shift+Z)"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => openAddActivityModal(startDateFilter)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-sm font-medium shadow-sm transition flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Activity</span>
                </button>
              </>
            )}

            <button
              onClick={handleTriggerPrint}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition flex items-center space-x-1.5 ${darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'}`}
              title="Print Schedule Grid"
            >
              <Printer className="w-4 h-4" />
              <span>Print Schedule</span>
            </button>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition flex items-center space-x-1.5 ${darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'}`}
              title="Generate Live Read-Only Share URL or Embed Snippet"
            >
              <Share2 className="w-4 h-4 text-indigo-500" />
              <span>Share Link</span>
            </button>

            {!isReadOnly && (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`p-2 rounded-lg border transition ${darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-300 bg-white hover:bg-slate-50'}`}
                title="Settings & JSON Backup"
              >
                <Layers className="w-4 h-4" />
              </button>
            )}

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

      {/* Print Header */}
      <div className="hidden print-header-banner p-4 border-b-2 border-slate-900 mb-4 text-slate-900">
        <h1 className="text-2xl font-bold tracking-tight">YMSAT 2027 Schedule Planner</h1>
        <p className="text-sm font-semibold text-slate-700 mt-0.5">
          Date Range: {EVENT_DATES.find(d => d.id === startDateFilter)?.label} to {EVENT_DATES.find(d => d.id === endDateFilter)?.label} ({format12H(gridStartTime)} – {format12H(gridEndTime)})
        </p>
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 w-full px-4 py-4 space-y-4 ${expandedDay ? 'no-print' : ''}`}>

        {/* Toolbar Bar */}
        <div className={`p-3.5 rounded-xl border shadow-sm flex flex-wrap items-center justify-between gap-3 no-print ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-44 sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search activity, venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'}`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Grid Scale Sliders */}
            <div className="flex items-center space-x-3 text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center space-x-1.5" title="Scale Calendar Width (100% - 500%)">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">W: {gridWidthScale}%</span>
                <input
                  type="range"
                  min="100"
                  max="500"
                  step="10"
                  value={gridWidthScale}
                  onChange={(e) => setGridWidthScale(Number(e.target.value))}
                  className="w-16 sm:w-20 accent-blue-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              <div className="flex items-center space-x-1.5" title="Scale Calendar Height (100% - 500%)">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">H: {gridHeightScale}%</span>
                <input
                  type="range"
                  min="100"
                  max="500"
                  step="10"
                  value={gridHeightScale}
                  onChange={(e) => setGridHeightScale(Number(e.target.value))}
                  className="w-16 sm:w-20 accent-blue-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              {(gridWidthScale !== 100 || gridHeightScale !== 100) && (
                <button
                  onClick={() => { setGridWidthScale(100); setGridHeightScale(100); }}
                  className="text-[10px] text-blue-500 hover:underline font-bold pl-1"
                  title="Reset Grid Dimensions to Default"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Layout Controls */}
            <div className="flex items-center space-x-1.5 border-l pl-2 border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  const allDisplayedFit = displayedDates.every(d => autoFitLaneDayIds.includes(d.id));
                  if (allDisplayedFit) {
                    setAutoFitLaneDayIds(prev => prev.filter(id => !displayedDates.some(d => d.id === id)));
                  } else {
                    setAutoFitLaneDayIds(prev => Array.from(new Set([...prev, ...displayedDates.map(d => d.id)])));
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center space-x-1 ${
                  displayedDates.every(d => autoFitLaneDayIds.includes(d.id))
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : darkMode ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                title="Collapse empty grade lanes automatically for all days based on active tags"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Auto-Fit All Lanes</span>
              </button>

              {emptyDayIds.length > 0 && (
                <button
                  onClick={() => {
                    const allEmptyAlreadyMinimized = emptyDayIds.every(id => minimizedDayIds.includes(id));
                    if (allEmptyAlreadyMinimized) {
                      setMinimizedDayIds(prev => prev.filter(id => !emptyDayIds.includes(id)));
                    } else {
                      setMinimizedDayIds(prev => Array.from(new Set([...prev, ...emptyDayIds])));
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center space-x-1 ${
                    emptyDayIds.every(id => minimizedDayIds.includes(id))
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : darkMode ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Minimize all days with 0 scheduled activities"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Empty Days ({emptyDayIds.length})</span>
                </button>
              )}

              {(minimizedDayIds.length > 0 || autoFitLaneDayIds.length > 0) && (
                <button
                  onClick={handleResetWidths}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition flex items-center space-x-1"
                  title="Reset all day column widths and grade lanes back to full size"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Widths & Lanes</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsRangeSettingsOpen(!isRangeSettingsOpen)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition ${
                isRangeSettingsOpen
                  ? 'bg-blue-600 text-white border-blue-600'
                  : darkMode ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Display Range</span>
            </button>

            {/* Tag Filter Menu */}
            <div className="relative" ref={filterMenuRef}>
              <button
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition ${
                  selectedTagFilters.length > 0
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                    : darkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter Tags</span>
                {selectedTagFilters.length > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {selectedTagFilters.length}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFilterMenuOpen && (
                <div className={`absolute right-0 sm:left-0 sm:right-auto mt-2 w-56 rounded-xl border shadow-xl z-40 p-2 space-y-1.5 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Select Tags</span>
                    {selectedTagFilters.length > 0 && (
                      <button
                        onClick={() => setSelectedTagFilters([])}
                        className="text-blue-500 hover:underline capitalize text-[11px] font-medium"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 py-1">
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
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                            isSelected
                              ? darkMode ? 'bg-slate-800 text-white font-semibold' : 'bg-slate-100 text-slate-900 font-semibold'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span style={{ backgroundColor: tag.color }} className="w-3 h-3 rounded-full border border-slate-400/40 flex-shrink-0" />
                            <span className="truncate">{tag.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>

                  {!isReadOnly && (
                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setIsFilterMenuOpen(false);
                          startCreateTag();
                          setIsTagModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center space-x-1 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                      >
                        <Tag className="w-3 h-3" />
                        <span>Manage Tags</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!isReadOnly && (
              <button
                onClick={() => {
                  startCreateTag();
                  setIsTagModalOpen(true);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1 transition ${darkMode ? 'border-indigo-800 bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/80' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                title="Add or Edit Grade Level Tags"
              >
                <Tag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Manage Tags</span>
              </button>
            )}
          </div>

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

        {/* Display Range Panel */}
        {isRangeSettingsOpen && (
          <div className={`p-4 rounded-xl border shadow-sm transition-all no-print ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100/90 border-slate-300'} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end`}>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Display Start Date</label>
              <select
                value={startDateFilter}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setStartDateFilter(newStart);
                  if (newStart > endDateFilter) setEndDateFilter(newStart);
                }}
                className={`w-full px-2.5 py-1.5 text-xs rounded-lg border font-semibold ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'}`}
              >
                {EVENT_DATES.map(d => (
                  <option key={d.id} value={d.id}>{d.label} ({d.dayName})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Display End Date</label>
              <select
                value={endDateFilter}
                onChange={(e) => {
                  const newEnd = e.target.value;
                  if (newEnd >= startDateFilter) setEndDateFilter(newEnd);
                }}
                className={`w-full px-2.5 py-1.5 text-xs rounded-lg border font-semibold ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'}`}
              >
                {EVENT_DATES.filter(d => d.id >= startDateFilter).map(d => (
                  <option key={d.id} value={d.id}>{d.label} ({d.dayName})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Grid Start Time</label>
              <input
                type="time"
                step="1800"
                value={gridStartTime}
                onChange={(e) => setGridStartTime(e.target.value)}
                className={`w-full px-2.5 py-1.5 text-xs rounded-lg border font-mono font-semibold ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'}`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Grid End Time</label>
              <input
                type="time"
                step="1800"
                value={gridEndTime}
                onChange={(e) => setGridEndTime(e.target.value)}
                className={`w-full px-2.5 py-1.5 text-xs rounded-lg border font-mono font-semibold ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'}`}
              />
            </div>
          </div>
        )}

        {/* Conflict Warning Banner */}
        {conflictSummary.total > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs text-rose-700 dark:text-rose-300 gap-2 no-print">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>
                <strong>Scheduling Conflicts Detected:</strong> {conflictSummary.tagConflicts > 0 && `${conflictSummary.tagConflicts} Tag Overlap(s)`} {conflictSummary.venueConflicts > 0 && `${conflictSummary.venueConflicts} Venue Double-Booking(s)`}.
              </span>
            </div>
            <span className="font-mono text-[10px] bg-rose-200 dark:bg-rose-900/50 px-2 py-0.5 rounded">
              ⚠️ Conflict Rules Enforced
            </span>
          </div>
        )}

        {/* Main Grid Viewport */}
        <div className={`rounded-xl border shadow-sm overflow-x-auto overflow-y-auto ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div
            style={{
              width: `${gridWidthScale}%`,
              minWidth: `${(gridWidthScale / 100) * 1000}px`
            }}
            className="transition-all duration-150"
          >

            {/* Dynamic Date Header Row */}
            <div
              style={{ display: 'grid', gridTemplateColumns: gridColumnsTemplate }}
              className={`border-b text-center text-xs font-semibold ${darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
            >
              <div className="p-3 flex items-center justify-center border-r border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-400">
                Time
              </div>
              {displayedDates.map((d) => {
                const dayActCount = filteredActivities.filter(a => a.date === d.id).length;
                const isMinimized = minimizedDayIds.includes(d.id);
                const isFitLanes = autoFitLaneDayIds.includes(d.id);

                if (isMinimized) {
                  return (
                    <div key={d.id} className="p-2 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-between bg-slate-200/50 dark:bg-slate-950/80">
                      <div className="font-bold text-slate-700 dark:text-slate-300 text-[10px] truncate w-full text-center" title={`${d.label} (${d.dayName})`}>
                        {d.label.split(',')[0]}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono my-1">
                        ({dayActCount})
                      </div>
                      <button
                        onClick={() => toggleMinimizeDay(d.id)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-slate-800 transition"
                        title="Restore Day Column Width"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={d.id} className="p-2.5 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-between group">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{d.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">{d.dayName}</div>
                    </div>
                    <div className="mt-1 flex items-center justify-between w-full px-1 no-print">
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-600 dark:text-slate-400 font-mono">
                        {dayActCount} {dayActCount === 1 ? 'act' : 'acts'}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => toggleAutoFitDayLanes(d.id)}
                          className={`px-1 py-0.5 rounded transition flex items-center space-x-0.5 text-[9px] font-semibold ${
                            isFitLanes
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-800'
                          }`}
                          title={isFitLanes ? "Restore all 6 grade lanes for this day" : "Minimize empty grade lanes on this day"}
                        >
                          <Columns className="w-2.5 h-2.5" />
                          <span>{isFitLanes ? 'Fitted' : 'Fit'}</span>
                        </button>

                        <button
                          onClick={() => toggleMinimizeDay(d.id)}
                          className="text-slate-400 hover:text-indigo-600 px-1 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition flex items-center space-x-0.5 text-[9px] font-semibold"
                          title="Minimize Day Column Width"
                        >
                          <Minimize2 className="w-2.5 h-2.5" />
                          <span>Min</span>
                        </button>

                        <button
                          onClick={() => setExpandedDay(d.id)}
                          className="text-blue-500 hover:text-blue-600 px-1 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-slate-800 transition flex items-center space-x-0.5 text-[9px] font-semibold"
                          title="Expand Full-Screen Single Day View"
                        >
                          <Maximize2 className="w-2.5 h-2.5" />
                          <span>Full</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Grid Layout Body */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: gridColumnsTemplate,
                height: `${Math.round(500 * (gridHeightScale / 100))}px`
              }}
              className="relative select-none transition-all duration-150"
            >

              {/* Left Time Column */}
              <div className="border-r border-slate-200 dark:border-slate-800 relative font-mono text-[11px] text-slate-400">
                {hourTicks.map((mins) => {
                  const topPercent = ((mins - currentStartMins) / totalGridMins) * 100;
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

              {/* Event Columns */}
              {displayedDates.map((d) => {
                const dayActivities = filteredActivities.filter(a => a.date === d.id);
                const isAutoFitLanes = autoFitLaneDayIds.includes(d.id);
                const layoutedActivities = computeOverlappingDayLayouts(dayActivities, tags, isAutoFitLanes);

                return (
                  <div
                    key={d.id}
                    data-day-column="true"
                    data-day-id={d.id}
                    className={`relative border-r border-slate-200 dark:border-slate-800 h-full group/col ${
                      minimizedDayIds.includes(d.id) ? 'bg-slate-100/50 dark:bg-slate-950/40' : ''
                    }`}
                  >
                    {/* Hourly Grid Lines */}
                    {hourTicks.map((mins) => {
                      const topPercent = ((mins - currentStartMins) / totalGridMins) * 100;
                      return (
                        <div
                          key={mins}
                          style={{ top: `${topPercent}%` }}
                          className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800/60 pointer-events-none"
                        />
                      );
                    })}

                    {/* Quick Add Hover Trigger */}
                    {!isReadOnly && !batchMode && !draggingAct && (
                      <div
                        onClick={() => openAddActivityModal(d.id, gridStartTime)}
                        className="absolute inset-0 bg-blue-500/0 hover:bg-blue-500/5 transition cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100 no-print"
                      >
                        <span className="bg-blue-600 text-white text-[11px] px-2 py-1 rounded shadow font-medium flex items-center space-x-1">
                          <Plus className="w-3 h-3" />
                          <span>Add to {d.label}</span>
                        </span>
                      </div>
                    )}

                    {/* Activity Event Cards */}
                    {layoutedActivities.map((act) => {
                      const startMins = timeToMins(act.startTime);
                      const endMins = timeToMins(act.endTime);

                      if (endMins <= currentStartMins || startMins >= currentEndMins) return null;

                      const topPercent = Math.max(0, ((startMins - currentStartMins) / totalGridMins) * 100);
                      const heightPercent = ((Math.min(endMins, currentEndMins) - Math.max(startMins, currentStartMins)) / totalGridMins) * 100;

                      const conflicts = conflictMap.get(act.id) || { tagConflict: false, venueConflict: false };
                      const isTagConf = conflicts.tagConflict;
                      const isVenueConf = conflicts.venueConflict;
                      const isSelected = selectedActIds.has(act.id);
                      const isBeingDragged = draggingAct?.actId === act.id;

                      let cardStyle = {};
                      let cardClasses = "absolute rounded-md p-1.5 shadow-sm border transition-all text-xs overflow-hidden flex flex-col justify-between group/card select-none ";

                      if (!isReadOnly && !batchMode) {
                        cardClasses += "cursor-grab active:cursor-grabbing ";
                      }

                      if (isBeingDragged) {
                        cardClasses += "z-30 opacity-90 ring-2 ring-blue-500 shadow-xl scale-[1.02] ";
                      }

                      if (isTagConf && isVenueConf) {
                        cardClasses += "bg-slate-950 text-white border-2 border-blue-500 ring-2 ring-rose-500 ";
                        cardStyle = {
                          backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 10px, #fff 10px, #fff 20px)',
                          color: '#000'
                        };
                      } else if (isTagConf) {
                        cardClasses += "bg-slate-950 text-white border-slate-900 font-medium ";
                      } else if (isVenueConf) {
                        cardClasses += "bg-white text-slate-950 border-[3px] border-blue-600 font-medium shadow-md ";
                      } else {
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
                          onMouseEnter={(e) => handleActivityMouseEnter(e, act)}
                          onMouseLeave={handleActivityMouseLeave}
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
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <div className="font-bold truncate text-[11px] leading-tight">
                                {act.title}
                              </div>

                              {batchMode && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => { }}
                                  className="rounded border-slate-400 text-blue-600 focus:ring-0 no-print"
                                />
                              )}
                            </div>

                            <div className="text-[10px] opacity-90 flex items-center space-x-1 mt-0.5 font-mono truncate">
                              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate">{format12H(act.startTime)} - {format12H(act.endTime)}</span>
                            </div>

                            {act.venue && (
                              <div className="text-[10px] font-semibold flex items-center space-x-1 mt-0.5 truncate">
                                <MapPin className="w-2.5 h-2.5 flex-shrink-0 text-rose-600" />
                                <span className="truncate">{act.venue}</span>
                              </div>
                            )}
                          </div>

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

                          {!isReadOnly && !batchMode && (
                            <div className="absolute top-1 right-1 opacity-0 group-hover/card:opacity-100 flex items-center space-x-0.5 bg-slate-900/80 text-white rounded p-0.5 transition no-print">
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

                          {!isReadOnly && !batchMode && (
                            <div
                              onMouseDown={(e) => handleMouseDown(e, act, true)}
                              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-500/50 no-print"
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

        <div className={`p-4 rounded-xl border shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 no-print ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
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
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">Configured Tags</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {tags.length} Custom Tag(s)
            </div>
          </div>
        </div>
      </main>


      {/* MODAL 1: Add/Edit Activity Modal */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
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
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Start Time</label>
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

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Grade Level / Event Tags</label>
                  <button
                    type="button"
                    onClick={() => {
                      startCreateTag();
                      setIsTagModalOpen(true);
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add / Edit Tags</span>
                  </button>
                </div>

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

      {/* MODAL 2: Manage Tags Add / Edit / Reorder Modal */}
      {isTagModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <Tag className="w-5 h-5 text-indigo-500" />
                <span>Manage Grade Level & Activity Tags</span>
              </h2>
              <button onClick={() => setIsTagModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTag} className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300">
                <span>{editingTagId ? 'Edit Selected Tag' : 'Create New Tag'}</span>
                {editingTagId && (
                  <button type="button" onClick={startCreateTag} className="text-slate-400 hover:text-slate-600 text-[11px] font-normal underline">
                    Cancel Editing
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  required
                  placeholder="Tag Name (e.g. Grade 12, VIP, Workshop)"
                  value={tagNameInput}
                  onChange={(e) => setTagNameInput(e.target.value)}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:outline-none ${darkMode ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-300'}`}
                />

                <div className="flex items-center space-x-1 border rounded-lg p-1 dark:border-slate-700 bg-white dark:bg-slate-950">
                  <input
                    type="color"
                    value={tagColorInput}
                    onChange={(e) => setTagColorInput(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    title="Choose Custom Color"
                  />
                  <span className="text-[10px] font-mono text-slate-500 uppercase">{tagColorInput}</span>
                </div>

                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{editingTagId ? 'Update' : 'Add'}</span>
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Pastel Palette Presets:</label>
                <div className="flex flex-wrap gap-1.5">
                  {PASTEL_PALETTE.map(hex => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setTagColorInput(hex)}
                      style={{ backgroundColor: hex }}
                      className={`w-5 h-5 rounded-full border border-slate-400/50 transition hover:scale-110 ${tagColorInput === hex ? 'ring-2 ring-indigo-600 scale-110' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </form>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Configured Tags ({tags.length})
                </label>
                <span className="text-[10px] text-indigo-500 font-semibold flex items-center space-x-1">
                  <GripVertical className="w-3 h-3" />
                  <span>Drag handle to reorder</span>
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {tags.map((tag, index) => {
                  const assignedCount = activities.filter(a => a.tags.includes(tag.name)).length;
                  const isDragging = draggedTagIndex === index;
                  const isDragOver = dragOverTagIndex === index;

                  return (
                    <div
                      key={tag.id}
                      draggable
                      onDragStart={(e) => handleTagDragStart(e, index)}
                      onDragOver={(e) => handleTagDragOver(e, index)}
                      onDrop={(e) => handleTagDrop(e, index)}
                      onDragEnd={() => { setDraggedTagIndex(null); setDragOverTagIndex(null); }}
                      className={`p-2 rounded-xl border flex items-center justify-between transition ${
                        isDragging ? 'opacity-40 border-dashed border-indigo-500' : ''
                      } ${
                        isDragOver ? 'border-2 border-indigo-500 bg-indigo-50/20' : darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <GripVertical className="w-4 h-4 text-slate-400 hover:text-indigo-500 cursor-grab active:cursor-grabbing flex-shrink-0" />
                        <span style={{ backgroundColor: tag.color }} className="w-4 h-4 rounded-full border border-slate-400/40 shadow-sm flex-shrink-0" />
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{tag.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({assignedCount} {assignedCount === 1 ? 'activity' : 'activities'})</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => startEditTag(tag)}
                          className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                          title="Edit Tag Name or Color"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTag(tag.id, tag.name)}
                          className="p-1 rounded text-slate-500 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                          title="Delete Tag"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsTagModalOpen(false)}
                className="bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold shadow transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Full-Screen Single Day View Modal */}
      {expandedDay && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 print-modal-container">
          <div className={`w-full h-full max-w-none rounded-2xl border shadow-2xl flex flex-col p-4 sm:p-6 overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>

            {/* Print Header */}
            <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4 text-slate-900">
              <h1 className="text-2xl font-black uppercase tracking-wide">YMSAT 2027 — Single Day View</h1>
              <div className="text-lg font-bold text-blue-700 mt-1">
                📅 {activeExpandedDayObj?.label} ({activeExpandedDayObj?.dayName})
              </div>
              <div className="text-xs text-slate-600 mt-0.5 font-mono">
                Daily Schedule Window: {format12H(gridStartTime)} to {format12H(gridEndTime)}
              </div>
            </div>

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800 gap-4 no-print">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-xl text-white">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold flex items-center space-x-2">
                    <span>Full Day View — {activeExpandedDayObj?.label} ({activeExpandedDayObj?.dayName})</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Showing {format12H(gridStartTime)} to {format12H(gridEndTime)} • Drag cards to reschedule or resize duration
                  </p>
                </div>
              </div>

              {/* Day View Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleAutoFitDayLanes(expandedDay)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 border ${
                    autoFitLaneDayIds.includes(expandedDay)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : darkMode ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Toggle empty grade lane minimization for this day"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>{autoFitLaneDayIds.includes(expandedDay) ? 'Lanes Fitted' : 'Fit Empty Lanes'}</span>
                </button>

                <button
                  onClick={handleTriggerPrint}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
                  title="Print This Single Day Schedule"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Day View</span>
                </button>

                <button
                  onClick={() => {
                    const idx = EVENT_DATES.findIndex(d => d.id === expandedDay);
                    if (idx > 0) setExpandedDay(EVENT_DATES[idx - 1].id);
                  }}
                  disabled={EVENT_DATES.findIndex(d => d.id === expandedDay) === 0}
                  className="p-1.5 rounded-lg border dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <select
                  value={expandedDay}
                  onChange={(e) => setExpandedDay(e.target.value)}
                  className={`px-3 py-1 text-xs rounded-lg border font-bold ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'}`}
                >
                  {EVENT_DATES.map(d => (
                    <option key={d.id} value={d.id}>{d.label} ({d.dayName})</option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    const idx = EVENT_DATES.findIndex(d => d.id === expandedDay);
                    if (idx < EVENT_DATES.length - 1) setExpandedDay(EVENT_DATES[idx + 1].id);
                  }}
                  disabled={EVENT_DATES.findIndex(d => d.id === expandedDay) === EVENT_DATES.length - 1}
                  className="p-1.5 rounded-lg border dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button onClick={() => setExpandedDay(null)} className="p-1.5 rounded-lg border dark:border-slate-700 hover:bg-red-500/10 hover:text-red-500 transition ml-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 pr-1 relative print:overflow-visible">
              <div className="relative grid grid-cols-[80px_1fr] h-[1000px] select-none border rounded-xl overflow-hidden w-full">
                <div className="border-r border-slate-200 dark:border-slate-800 relative font-mono text-xs text-slate-400 bg-slate-50 dark:bg-slate-950">
                  {hourTicks.map((mins) => {
                    const topPercent = ((mins - currentStartMins) / totalGridMins) * 100;
                    return (
                      <div key={mins} style={{ top: `${topPercent}%` }} className="absolute left-0 right-0 -translate-y-1/2 text-center font-medium pr-1">
                        {format12H(minsToTime(mins))}
                      </div>
                    );
                  })}
                </div>

                <div
                  data-day-column="true"
                  data-day-id={expandedDay}
                  className="relative h-full w-full"
                >
                  {hourTicks.map((mins) => {
                    const topPercent = ((mins - currentStartMins) / totalGridMins) * 100;
                    return (
                      <div key={mins} style={{ top: `${topPercent}%` }} className="absolute left-0 right-0 border-t border-slate-200 dark:border-slate-800/60 pointer-events-none" />
                    );
                  })}

                  {!isReadOnly && !batchMode && !draggingAct && (
                    <div
                      onClick={() => openAddActivityModal(expandedDay, gridStartTime)}
                      className="absolute inset-0 bg-blue-500/0 hover:bg-blue-500/5 transition cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100 no-print z-0"
                    >
                      <span className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg shadow-md font-medium flex items-center space-x-1.5">
                        <Plus className="w-4 h-4" />
                        <span>Add Activity to {activeExpandedDayObj?.label}</span>
                      </span>
                    </div>
                  )}

                  {computeOverlappingDayLayouts(
                    filteredActivities.filter(a => a.date === expandedDay),
                    tags,
                    autoFitLaneDayIds.includes(expandedDay)
                  ).map(act => {
                    const startMins = timeToMins(act.startTime);
                    const endMins = timeToMins(act.endTime);

                    if (endMins <= currentStartMins || startMins >= currentEndMins) return null;

                    const topPercent = Math.max(0, ((startMins - currentStartMins) / totalGridMins) * 100);
                    const heightPercent = ((Math.min(endMins, currentEndMins) - Math.max(startMins, currentStartMins)) / totalGridMins) * 100;

                    const multiBg = getMultiTagBackground(act.tags, tags);
                    const isBeingDragged = draggingAct?.actId === act.id;

                    let cardClasses = "absolute rounded-lg p-3 border border-slate-300 shadow-md text-slate-900 flex flex-col justify-between transition-all hover:shadow-lg group/daycard select-none ";
                    if (!isReadOnly && !batchMode) {
                      cardClasses += "cursor-grab active:cursor-grabbing ";
                    }
                    if (isBeingDragged) {
                      cardClasses += "z-30 opacity-90 ring-2 ring-blue-500 shadow-2xl scale-[1.01] ";
                    }

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
                        onMouseDown={(e) => handleMouseDown(e, act, false)}
                        className={cardClasses}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <div className="font-bold text-sm sm:text-base leading-snug">{act.title}</div>

                            {!isReadOnly && !batchMode && (
                              <div className="opacity-0 group-hover/daycard:opacity-100 flex items-center space-x-1 bg-slate-900/80 text-white rounded p-1 transition no-print">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEditActivityModal(act); }}
                                  className="p-0.5 hover:text-blue-400"
                                  title="Edit Activity"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteActivity(act.id); }}
                                  className="p-0.5 hover:text-red-400"
                                  title="Delete Activity"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="text-xs font-mono font-medium opacity-90 mt-1 flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{format12H(act.startTime)} - {format12H(act.endTime)}</span>
                          </div>

                          {act.venue && (
                            <div className="text-xs font-semibold flex items-center space-x-1 mt-1 text-rose-800">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{act.venue}</span>
                            </div>
                          )}

                          {act.description && (
                            <p className="text-xs mt-1.5 opacity-90 line-clamp-3">{act.description}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {act.tags.map(t => (
                            <span key={t} className="bg-white/90 text-slate-900 text-[10px] px-2 py-0.5 rounded-md font-bold border border-slate-300 shadow-xs">
                              {t}
                            </span>
                          ))}
                        </div>

                        {!isReadOnly && !batchMode && (
                          <div
                            onMouseDown={(e) => handleMouseDown(e, act, true)}
                            className="absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize hover:bg-blue-600/60 rounded-b-lg no-print"
                            title="Drag to Resize Duration (5-min precision)"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Share & Embed Live Link Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 transition-all ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold flex items-center space-x-2">
                <Share2 className="w-5 h-5 text-indigo-500" />
                <span>Share & Embed Live Schedule</span>
              </h2>
              <button onClick={() => setIsShareModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 mt-4">
              {/* Real-time Indicator Banner */}
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 flex items-start space-x-3 text-xs text-indigo-700 dark:text-indigo-300">
                <Zap className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Live Real-Time Cloud Synchronization</span>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    Anyone using this link or viewing the embedded schedule will automatically see updates in real time whenever you make changes. No account login required.
                  </p>
                </div>
              </div>

              {/* Option 1: Direct Read-Only URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                  <span>1. Direct Web Share Link (Read-Only)</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={liveShareUrl}
                    className={`flex-1 px-3 py-2 text-xs font-mono rounded-lg border focus:outline-none ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-800'}`}
                  />
                  <button
                    onClick={() => handleCopyTextToClipboard(liveShareUrl, 'link')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition flex items-center space-x-1.5 flex-shrink-0"
                  >
                    {copyFeedback === 'link' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copyFeedback === 'link' ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Embed Code Snippet */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1.5">
                  <Code className="w-3.5 h-3.5 text-indigo-500" />
                  <span>2. Embed Code Snippet (&lt;iframe&gt;)</span>
                </label>
                <textarea
                  rows="3"
                  readOnly
                  value={iframeEmbedCode}
                  className={`w-full p-2.5 text-xs font-mono rounded-lg border focus:outline-none resize-none ${darkMode ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-800'}`}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-slate-400">
                    Copy and paste into Notion, WordPress, Webflow, or custom websites.
                  </span>
                  <button
                    onClick={() => handleCopyTextToClipboard(iframeEmbedCode, 'embed')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
                  >
                    {copyFeedback === 'embed' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copyFeedback === 'embed' ? 'Copied Code!' : 'Copy Embed Code'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end mt-6 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold shadow transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Settings & JSON Backup Import/Export Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
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

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => {
                    setConfirmDialog({
                      title: "Reset Schedule Data",
                      message: "Are you sure you want to restore default Opening Program activity and tags?",
                      onConfirm: () => {
                        saveToCloud(DEFAULT_INITIAL_ACTIVITIES, DEFAULT_TAGS);
                        setIsSettingsOpen(false);
                        setConfirmDialog(null);
                      }
                    });
                  }}
                  className="w-full text-center text-xs text-rose-500 hover:text-rose-600 font-semibold py-1.5"
                >
                  Reset to Default Opening Program & Tags
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Custom Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 no-print">
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
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800 mt-auto no-print">
        YMSAT 2027 Schedule Planner • Powered by Firebase Firestore Real-Time Sync
      </footer>
    </div>
  );
}