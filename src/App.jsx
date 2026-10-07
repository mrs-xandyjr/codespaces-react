import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Search,
  Download,
  Upload,
  Sun,
  Moon,
  BarChart3,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  Settings,
  Tag,
  Info,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  Layers,
  CalendarDays,
  Pencil,
  RotateCcw,
  Sliders
} from 'lucide-react';

const GRID_START_MINUTES = 360; // 6:00 AM
const GRID_END_MINUTES = 1080;   // 6:00 PM
const TOTAL_MINUTES = GRID_END_MINUTES - GRID_START_MINUTES; // 720 minutes (12 hours)

// Pixel heights per hour
const MAIN_HOUR_HEIGHT = 80; 
const MAIN_GRID_HEIGHT = (TOTAL_MINUTES / 60) * MAIN_HOUR_HEIGHT; // 960px

const DAY_VIEW_HOUR_HEIGHT = 120; 
const DAY_VIEW_GRID_HEIGHT = (TOTAL_MINUTES / 60) * DAY_VIEW_HOUR_HEIGHT; // 1440px

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#EF4444', // Red
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#F97316', // Orange
];

const DEFAULT_CATEGORIES = [
  { id: 'cat-work', name: 'Deep Work', color: '#3B82F6' },
  { id: 'cat-fitness', name: 'Health & Fitness', color: '#10B981' },
  { id: 'cat-learn', name: 'Learning & Dev', color: '#8B5CF6' },
  { id: 'cat-meeting', name: 'Team Meetings', color: '#EC4899' },
  { id: 'cat-admin', name: 'Admin & Email', color: '#F59E0B' },
  { id: 'cat-leisure', name: 'Personal & Rest', color: '#14B8A6' },
];

const INITIAL_ACTIVITIES = [
  {
    id: 'act-1',
    title: 'Sprint Planning & Kickoff',
    date: '2026-01-20',
    startTime: '08:00',
    endTime: '09:30',
    categoryId: 'cat-meeting',
    notes: 'Review goals for Q1 and assign initial development tickets.',
  },
  {
    id: 'act-2',
    title: 'Core Architecture Coding',
    date: '2026-01-20',
    startTime: '10:00',
    endTime: '12:30',
    categoryId: 'cat-work',
    notes: 'Implement API routing layer and global state store.',
  },
  {
    id: 'act-3',
    title: 'Gym Workout & Cardio',
    date: '2026-01-20',
    startTime: '13:00',
    endTime: '14:15',
    categoryId: 'cat-fitness',
    notes: 'Leg day routine and 20 min high intensity cycling.',
  },
  {
    id: 'act-4',
    title: 'React 19 & Next.js Study',
    date: '2026-01-21',
    startTime: '07:00',
    endTime: '08:30',
    categoryId: 'cat-learn',
    notes: 'Explore Server Actions, useActionState, and Optimistic UI features.',
  },
  {
    id: 'act-5',
    title: 'Client Demo & Feedback',
    date: '2026-01-21',
    startTime: '09:00',
    endTime: '10:30',
    categoryId: 'cat-meeting',
    notes: 'Present prototype wireframes to stakeholders for sign-off.',
  },
  {
    id: 'act-6',
    title: 'Inbox Zero & Documentation',
    date: '2026-01-21',
    startTime: '11:00',
    endTime: '12:00',
    categoryId: 'cat-admin',
    notes: 'Clear pending emails and update internal team wiki.',
  },
  {
    id: 'act-7',
    title: 'UI Design System Review',
    date: '2026-01-22',
    startTime: '08:30',
    endTime: '10:00',
    categoryId: 'cat-work',
    notes: 'Audit Tailwind color tokens and dark mode component specs.',
  },
  {
    id: 'act-8',
    title: 'Database Schema Migration',
    date: '2026-01-22',
    startTime: '10:00',
    endTime: '12:00',
    categoryId: 'cat-work',
    notes: 'Optimize indexes and run benchmark scripts on staging environment.',
  },
  {
    id: 'act-9',
    title: 'Yoga & Mindfulness',
    date: '2026-01-23',
    startTime: '06:30',
    endTime: '07:30',
    categoryId: 'cat-fitness',
    notes: 'Morning stretch and breathing exercise session.',
  },
  {
    id: 'act-10',
    title: 'Code Review & Refactoring',
    date: '2026-01-23',
    startTime: '13:30',
    endTime: '15:45',
    categoryId: 'cat-work',
    notes: 'Review pull requests for batch selection and modal components.',
  },
  {
    id: 'act-11',
    title: 'Weekend Reading & Rest',
    date: '2026-01-24',
    startTime: '09:00',
    endTime: '11:30',
    categoryId: 'cat-leisure',
    notes: 'Read technical whitepapers and enjoy morning coffee.',
  },
  {
    id: 'act-12',
    title: 'Weekly Retrospective',
    date: '2026-01-26',
    startTime: '16:00',
    endTime: '17:30',
    categoryId: 'cat-meeting',
    notes: 'Discuss sprint accomplishments and team retro points.',
  }
];

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hrs, mins] = timeStr.split(':').map(Number);
  return hrs * 60 + mins;
};

const minutesToTime = (totalMinutes) => {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  const formattedHrs = String(hrs).padStart(2, '0');
  const formattedMins = String(mins).padStart(2, '0');
  return `${formattedHrs}:${formattedMins}`;
};

const formatDisplayTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  const displayMin = String(m).padStart(2, '0');
  return `${displayHour}:${displayMin} ${period}`;
};

const formatDateLabel = (dateStr) => {
  if (!dateStr) return { dayName: '', fullDayName: '', formattedDate: '', fullFormattedDate: '' };
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const fullDayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
  const fullMonthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
  return { dayName, fullDayName, formattedDate: `${monthName} ${day}`, fullFormattedDate: `${fullMonthName} ${day}, ${year}` };
};

// Generates an array of date strings ('YYYY-MM-DD') between startDate and endDate
const generateDateRange = (startStr, endStr) => {
  if (!startStr || !endStr) return [];
  const dates = [];
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return [startStr];
  }

  const current = new Date(start);
  let limitCount = 0;
  while (current <= end && limitCount < 31) { // Cap at 31 days max to preserve UI responsiveness
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
    limitCount++;
  }
  return dates;
};

const calculateOverlaps = (activities) => {
  if (!activities || activities.length === 0) return [];

  const sorted = [...activities].map((act) => ({
    ...act,
    startMins: timeToMinutes(act.startTime),
    endMins: timeToMinutes(act.endTime),
  })).sort((a, b) => a.startMins - b.startMins || (b.endMins - b.startMins) - (a.endMins - a.startMins));

  const clusters = [];
  let currentCluster = [];
  let clusterEnd = -1;

  sorted.forEach((item) => {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEnd = item.endMins;
    } else if (item.startMins < clusterEnd) {
      currentCluster.push(item);
      if (item.endMins > clusterEnd) clusterEnd = item.endMins;
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endMins;
    }
  });
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const result = [];
  clusters.forEach((cluster) => {
    const columns = [];
    cluster.forEach((item) => {
      let assignedCol = -1;
      for (let i = 0; i < columns.length; i++) {
        if (columns[i] <= item.startMins) {
          assignedCol = i;
          columns[i] = item.endMins;
          break;
        }
      }
      if (assignedCol === -1) {
        assignedCol = columns.length;
        columns.push(item.endMins);
      }
      item.columnIndex = assignedCol;
    });

    const totalCols = columns.length;
    cluster.forEach((item) => {
      item.totalColumns = totalCols;
      result.push(item);
    });
  });

  return result;
};

export default function App() {
  // Title & Date Range Settings
  const [plannerTitle, setPlannerTitle] = useState(() => {
    return localStorage.getItem('planner_title') || 'Master Schedule Planner';
  });
  const [startDate, setStartDate] = useState(() => {
    return localStorage.getItem('planner_start_date') || '2026-01-20';
  });
  const [endDate, setEndDate] = useState(() => {
    return localStorage.getItem('planner_end_date') || '2026-01-27';
  });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Dynamic Date Range Columns
  const scheduleDates = useMemo(() => {
    return generateDateRange(startDate, endDate);
  }, [startDate, endDate]);

  // Data Store
  const [activities, setActivities] = useState(() => {
    const saved = localStorage.getItem('planner_activities');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_ACTIVITIES;
  });

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('planner_categories');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_CATEGORIES;
  });

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilters, setActiveCategoryFilters] = useState([]);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('planner_dark') === 'true';
  });

  // Expanded Single Day View Pop-up state
  const [selectedDayView, setSelectedDayView] = useState(null);

  // Batch Selection & Deletion State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Modals & Drawers
  const [editingActivity, setEditingActivity] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Drag & Resize State
  const [dragState, setDragState] = useState(null);
  const gridContainerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('planner_title', plannerTitle);
  }, [plannerTitle]);

  useEffect(() => {
    localStorage.setItem('planner_start_date', startDate);
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem('planner_end_date', endDate);
  }, [endDate]);

  useEffect(() => {
    localStorage.setItem('planner_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('planner_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('planner_dark', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleSelectActivity = (id) => {
    setSelectedActivityIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const visibleIds = filteredActivities.map((a) => a.id);
    setSelectedActivityIds(visibleIds);
  };

  const handleDeselectAll = () => {
    setSelectedActivityIds([]);
  };

  const handleBatchDeleteConfirm = () => {
    setActivities((prev) => prev.filter((act) => !selectedActivityIds.includes(act.id)));
    setSelectedActivityIds([]);
    setShowDeleteConfirm(false);
    setIsBatchMode(false);
  };

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchesSearch =
        act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (act.notes && act.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        activeCategoryFilters.length === 0 || activeCategoryFilters.includes(act.categoryId);

      return matchesSearch && matchesCategory;
    });
  }, [activities, searchQuery, activeCategoryFilters]);

  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      map[cat.id] = cat;
    });
    return map;
  }, [categories]);

  const handleMouseDown = (e, activity, type, viewType = 'main') => {
    if (isBatchMode) return;
    e.stopPropagation();

    const hourHeight = viewType === 'dayView' ? DAY_VIEW_HOUR_HEIGHT : MAIN_HOUR_HEIGHT;
    
    let gridBounds = null;
    if (viewType === 'main' && gridContainerRef.current) {
      gridBounds = gridContainerRef.current.getBoundingClientRect();
    }

    setDragState({
      id: activity.id,
      type, // 'move', 'resize-top', 'resize-bottom'
      startY: e.clientY,
      startX: e.clientX,
      initialStart: timeToMinutes(activity.startTime),
      initialEnd: timeToMinutes(activity.endTime),
      initialDate: activity.date,
      hourHeight,
      viewType,
      gridBounds,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e) => {
      const deltaY = e.clientY - dragState.startY;
      const hourH = dragState.hourHeight || MAIN_HOUR_HEIGHT;
      // 5-minute grid snapping calculations
      const minutesDelta = Math.round((deltaY / hourH) * 60 / 5) * 5;

      // Handle Cross-Day Dragging in Main Grid
      let newDate = dragState.initialDate;
      if (dragState.type === 'move' && dragState.viewType === 'main' && dragState.gridBounds && scheduleDates.length > 0) {
        const timeColWidth = 100; // Left axis width
        const relativeX = e.clientX - (dragState.gridBounds.left + timeColWidth);
        const dayColWidth = (dragState.gridBounds.width - timeColWidth) / scheduleDates.length;
        
        let colIndex = Math.floor(relativeX / dayColWidth);
        colIndex = Math.max(0, Math.min(scheduleDates.length - 1, colIndex));
        
        if (scheduleDates[colIndex]) {
          newDate = scheduleDates[colIndex];
        }
      }

      setActivities((prev) =>
        prev.map((act) => {
          if (act.id !== dragState.id) return act;

          let newStart = dragState.initialStart;
          let newEnd = dragState.initialEnd;
          const duration = dragState.initialEnd - dragState.initialStart;

          if (dragState.type === 'move') {
            newStart = Math.max(
              GRID_START_MINUTES,
              Math.min(GRID_END_MINUTES - duration, dragState.initialStart + minutesDelta)
            );
            newEnd = newStart + duration;
          } else if (dragState.type === 'resize-top') {
            newStart = Math.max(
              GRID_START_MINUTES,
              Math.min(dragState.initialEnd - 15, dragState.initialStart + minutesDelta)
            );
          } else if (dragState.type === 'resize-bottom') {
            newEnd = Math.min(
              GRID_END_MINUTES,
              Math.max(dragState.initialStart + 15, dragState.initialEnd + minutesDelta)
            );
          }

          return {
            ...act,
            date: newDate,
            startTime: minutesToTime(newStart),
            endTime: minutesToTime(newEnd),
          };
        })
      );
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, scheduleDates]);

  const handleGridCellClick = (dateStr, clickedMinute) => {
    if (isBatchMode) return;
    const snappedStart = Math.round(clickedMinute / 5) * 5;
    const snappedEnd = Math.min(GRID_END_MINUTES, snappedStart + 60);

    setEditingActivity({
      id: 'act-' + Date.now(),
      title: 'New Activity',
      date: dateStr,
      startTime: minutesToTime(snappedStart),
      endTime: minutesToTime(snappedEnd),
      categoryId: categories[0]?.id || '',
      notes: '',
      isNew: true,
    });
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      title: plannerTitle,
      startDate,
      endDate,
      activities,
      categories
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${plannerTitle.toLowerCase().replace(/\s+/g, '_')}_export.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportCSV = () => {
    let csv = "ID,Title,Date,Start Time,End Time,Category,Notes\n";
    activities.forEach(act => {
      const catName = categoryMap[act.categoryId]?.name || 'Uncategorized';
      const cleanNotes = (act.notes || '').replace(/"/g, '""');
      csv += `"${act.id}","${act.title}","${act.date}","${act.startTime}","${act.endTime}","${catName}","${cleanNotes}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${plannerTitle.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importJSON = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (parsed.title) setPlannerTitle(parsed.title);
          if (parsed.startDate) setStartDate(parsed.startDate);
          if (parsed.endDate) setEndDate(parsed.endDate);
          if (parsed.activities) setActivities(parsed.activities);
          if (parsed.categories) setCategories(parsed.categories);
        } catch (err) {
          console.error("Invalid JSON format", err);
        }
      };
    }
  };

  const categoryAnalytics = useMemo(() => {
    const totals = {};
    let grandTotalMins = 0;

    categories.forEach((cat) => {
      totals[cat.id] = { ...cat, totalMinutes: 0, count: 0 };
    });

    activities.forEach((act) => {
      const start = timeToMinutes(act.startTime);
      const end = timeToMinutes(act.endTime);
      const duration = Math.max(0, end - start);
      grandTotalMins += duration;

      if (totals[act.categoryId]) {
        totals[act.categoryId].totalMinutes += duration;
        totals[act.categoryId].count += 1;
      }
    });

    return Object.values(totals).map((item) => ({
      ...item,
      hours: (item.totalMinutes / 60).toFixed(1),
      percentage: grandTotalMins > 0 ? Math.round((item.totalMinutes / grandTotalMins) * 100) : 0,
    }));
  }, [activities, categories]);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* HEADER BAR */}
      <header className={`border-b sticky top-0 z-30 backdrop-blur-md ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* Editable Logo & Schedule Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <Calendar className="w-6 h-6" />
            </div>

            <div className="flex flex-col">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={plannerTitle}
                    onChange={(e) => setPlannerTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setIsEditingTitle(false);
                    }}
                    autoFocus
                    className={`font-bold text-lg px-2 py-0.5 rounded border outline-none ${
                      darkMode ? 'bg-slate-800 border-indigo-500 text-white' : 'bg-slate-100 border-indigo-500 text-slate-900'
                    }`}
                  />
                  <button
                    onClick={() => setIsEditingTitle(false)}
                    className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <h1
                  onClick={() => setIsEditingTitle(true)}
                  className="font-bold text-lg leading-tight tracking-tight flex items-center gap-2 cursor-pointer group"
                  title="Click to edit title inline"
                >
                  <span>{plannerTitle}</span>
                  <Pencil className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h1>
              )}

              {/* Date Range Badge */}
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {formatDateLabel(startDate).formattedDate} – {formatDateLabel(endDate).formattedDate}
                </span>
                <span>• {scheduleDates.length} Days</span>
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xs relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search activities or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-8 py-1.5 text-sm rounded-lg border outline-none transition-all ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 focus:border-indigo-500 text-slate-100 placeholder-slate-500'
                  : 'bg-slate-100 border-slate-200 focus:border-indigo-500 text-slate-800 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Tools & Settings */}
          <div className="flex items-center gap-2">
            
            {/* Range & Settings Modal Toggle */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                darkMode
                  ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              title="Edit Schedule Title and Date Range"
            >
              <Sliders className="w-4 h-4 text-indigo-500" />
              Date Range & Settings
            </button>

            {/* Multi-Select / Batch Mode Button */}
            <button
              onClick={() => {
                setIsBatchMode(!isBatchMode);
                setSelectedActivityIds([]);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                isBatchMode
                  ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
                  : darkMode
                  ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              {isBatchMode ? 'Cancel Selection' : 'Select & Delete'}
            </button>

            {/* Category Manager Button */}
            <button
              onClick={() => setShowCategoryManager(true)}
              className={`p-2 rounded-lg border transition-all ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Manage Categories & Colors"
            >
              <Tag className="w-4 h-4" />
            </button>

            {/* Analytics Modal Toggle */}
            <button
              onClick={() => setShowAnalytics(true)}
              className={`p-2 rounded-lg border transition-all ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Time Utilization Analytics"
            >
              <BarChart3 className="w-4 h-4" />
            </button>

            {/* Export & Import Group */}
            <div className="flex items-center border rounded-lg overflow-hidden dark:border-slate-700 border-slate-200">
              <button
                onClick={exportJSON}
                className="p-2 text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Export JSON Backup"
              >
                <FileCode className="w-4 h-4" />
              </button>
              <button
                onClick={exportCSV}
                className="p-2 text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-l dark:border-slate-700 border-slate-200"
                title="Export CSV Table"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              <label
                className="p-2 text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-l dark:border-slate-700 border-slate-200 cursor-pointer"
                title="Import JSON Backup"
              >
                <Upload className="w-4 h-4" />
                <input type="file" accept=".json" onChange={importJSON} className="hidden" />
              </label>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg border transition-all ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Add New Activity Button */}
            <button
              onClick={() =>
                setEditingActivity({
                  id: 'act-' + Date.now(),
                  title: '',
                  date: scheduleDates[0] || '2026-01-20',
                  startTime: '09:00',
                  endTime: '10:00',
                  categoryId: categories[0]?.id || '',
                  notes: '',
                  isNew: true,
                })
              }
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Activity
            </button>
          </div>
        </div>

        {/* SUB-HEADER: CATEGORY FILTERS & BATCH STATUS */}
        <div className={`px-4 py-2 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100/70 border-slate-200'}`}>
          
          {/* Category Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {categories.map((cat) => {
              const isActive = activeCategoryFilters.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() =>
                    setActiveCategoryFilters((prev) =>
                      isActive ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                    )
                  }
                  className={`px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 border ${
                    isActive
                      ? 'border-transparent text-white shadow-sm'
                      : darkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                  style={{
                    backgroundColor: isActive ? cat.color : undefined,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: isActive ? '#fff' : cat.color }}
                  />
                  {cat.name}
                </button>
              );
            })}
            {activeCategoryFilters.length > 0 && (
              <button
                onClick={() => setActiveCategoryFilters([])}
                className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-semibold ml-1"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Batch Mode Bar Controls */}
          {isBatchMode && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5" /> Select Mode Active
              </span>
              <button
                onClick={handleSelectAll}
                className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 font-medium text-xs"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 font-medium text-xs"
              >
                Deselect All
              </button>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                {selectedActivityIds.length} Selected
              </span>
            </div>
          )}
        </div>
      </header>

      {}
      <main className="flex-1 overflow-x-auto p-4 max-w-[1600px] w-full mx-auto">
        <div className={`min-w-[1000px] rounded-2xl border shadow-sm overflow-hidden flex flex-col ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          
          {/* DYNAMIC DATE HEADERS */}
          <div
            className={`grid sticky top-[108px] z-20 border-b ${darkMode ? 'bg-slate-900/95 border-slate-800 text-slate-200' : 'bg-slate-100/90 border-slate-200 text-slate-700'}`}
            style={{
              gridTemplateColumns: `100px repeat(${scheduleDates.length}, minmax(120px, 1fr))`
            }}
          >
            {/* Time Column Header */}
            <div className="p-3 border-r dark:border-slate-800 border-slate-200 font-semibold text-xs text-center flex items-center justify-center gap-1 text-slate-400">
              <Clock className="w-3.5 h-3.5" /> Time
            </div>

            {/* Dynamic Days Column Headers */}
            {scheduleDates.map((dateStr) => {
              const { dayName, formattedDate } = formatDateLabel(dateStr);
              const dayCount = filteredActivities.filter((a) => a.date === dateStr).length;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDayView(dateStr)}
                  className="p-3 border-r last:border-r-0 dark:border-slate-800 border-slate-200 text-center cursor-pointer group hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 transition-all relative"
                  title="Click to open Expanded Single Day View"
                >
                  <div className="font-bold text-sm tracking-tight flex items-center justify-center gap-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {dayName}
                    <Maximize2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-1 mt-0.5">
                    <span>{formattedDate}</span>
                    {dayCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold flex items-center justify-center text-slate-600 dark:text-slate-300">
                        {dayCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* TIMETABLE GRID BODY */}
          <div
            ref={gridContainerRef}
            className="grid relative"
            style={{
              height: `${MAIN_GRID_HEIGHT}px`,
              gridTemplateColumns: `100px repeat(${scheduleDates.length}, minmax(120px, 1fr))`
            }}
          >
            {/* TIME SLOTS AXIS (LEFT COLUMN) */}
            <div className={`border-r dark:border-slate-800 border-slate-200 select-none ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
              {Array.from({ length: 12 }).map((_, idx) => {
                const hourMins = GRID_START_MINUTES + idx * 60;
                return (
                  <div
                    key={idx}
                    className="border-b dark:border-slate-800/60 border-slate-200/80 pr-2 text-right font-medium text-xs text-slate-400 flex items-start justify-end pt-1"
                    style={{ height: `${MAIN_HOUR_HEIGHT}px` }}
                  >
                    {formatDisplayTime(minutesToTime(hourMins))}
                  </div>
                );
              })}
            </div>

            {/* DYNAMIC DAY COLUMNS & ACTIVITIES */}
            {scheduleDates.map((dateStr) => {
              const dayActivities = filteredActivities.filter((a) => a.date === dateStr);
              const layoutItems = calculateOverlaps(dayActivities);

              return (
                <div
                  key={dateStr}
                  className="border-r last:border-r-0 dark:border-slate-800 border-slate-200 relative group transition-colors hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickY = e.clientY - rect.top;
                    const clickedMinute = GRID_START_MINUTES + (clickY / MAIN_GRID_HEIGHT) * TOTAL_MINUTES;
                    handleGridCellClick(dateStr, clickedMinute);
                  }}
                >
                  {/* Hourly Background Lines */}
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="border-b dark:border-slate-800/40 border-slate-100 pointer-events-none"
                      style={{ height: `${MAIN_HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Half-Hour Dash Guidelines */}
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div
                      key={`sub-${idx}`}
                      className="border-b border-dashed dark:border-slate-800/20 border-slate-100 pointer-events-none absolute w-full"
                      style={{ top: `${(idx + 0.5) * MAIN_HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Activity Block Cards */}
                  {layoutItems.map((act) => {
                    const category = categoryMap[act.categoryId] || { color: '#64748B', name: 'Other' };
                    const startMins = timeToMinutes(act.startTime);
                    const endMins = timeToMinutes(act.endTime);
                    
                    const topPx = ((startMins - GRID_START_MINUTES) / TOTAL_MINUTES) * MAIN_GRID_HEIGHT;
                    const heightPx = ((endMins - startMins) / TOTAL_MINUTES) * MAIN_GRID_HEIGHT;

                    const widthPercent = 100 / (act.totalColumns || 1);
                    const leftPercent = (act.columnIndex || 0) * widthPercent;

                    const isSelected = selectedActivityIds.includes(act.id);

                    return (
                      <div
                        key={act.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isBatchMode) {
                            toggleSelectActivity(act.id);
                          } else {
                            setEditingActivity({ ...act });
                          }
                        }}
                        style={{
                          top: `${topPx}px`,
                          height: `${Math.max(26, heightPx)}px`,
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          backgroundColor: `${category.color}22`,
                          borderColor: category.color,
                        }}
                        className={`absolute rounded-lg border-l-4 border-y border-r p-1.5 text-xs shadow-sm cursor-pointer transition-all duration-75 overflow-hidden flex flex-col justify-between group/card ${
                          isSelected ? 'ring-2 ring-rose-500 ring-offset-1 bg-rose-500/30' : 'hover:shadow-md hover:z-10'
                        } ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}
                      >
                        {/* Top Resize Handle */}
                        {!isBatchMode && (
                          <div
                            onMouseDown={(e) => handleMouseDown(e, act, 'resize-top', 'main')}
                            className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-slate-400/40 opacity-0 group-hover/card:opacity-100 z-10 rounded-t"
                          />
                        )}

                        {/* Top Card Header */}
                        <div className="flex items-start justify-between gap-1 pointer-events-none">
                          <div className="flex items-center gap-1 min-w-0">
                            {isBatchMode && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectActivity(act.id);
                                }}
                                className="pointer-events-auto mr-0.5"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-rose-600 dark:text-rose-400 fill-rose-100 dark:fill-rose-950" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                )}
                              </div>
                            )}
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: category.color }}
                            />
                            <p className="font-bold truncate leading-tight text-[11px]">{act.title || 'Untitled'}</p>
                          </div>
                        </div>

                        {/* Middle Content */}
                        <div className="my-0.5 pointer-events-none">
                          <p className="text-[10px] font-semibold opacity-80 flex items-center gap-1">
                            {formatDisplayTime(act.startTime)} - {formatDisplayTime(act.endTime)}
                          </p>
                          {heightPx > 45 && act.notes && (
                            <p className="text-[10px] opacity-70 truncate mt-0.5 italic">{act.notes}</p>
                          )}
                        </div>

                        {/* Drag Handle Overlay */}
                        {!isBatchMode && (
                          <div
                            onMouseDown={(e) => handleMouseDown(e, act, 'move', 'main')}
                            className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing opacity-0 group-hover/card:opacity-100 flex items-center justify-center"
                          >
                            <span className="text-[9px] font-bold bg-slate-900/70 text-white px-1.5 py-0.5 rounded shadow backdrop-blur-sm pointer-events-none">
                              Drag 5m
                            </span>
                          </div>
                        )}

                        {/* Bottom Resize Handle */}
                        {!isBatchMode && (
                          <div
                            onMouseDown={(e) => handleMouseDown(e, act, 'resize-bottom', 'main')}
                            className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-slate-400/40 opacity-0 group-hover/card:opacity-100 z-10 rounded-b"
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
      </main>

      {}
      {selectedDayView && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-hidden">
          <div className={`w-full max-w-4xl h-[92vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            
            {/* Day Modal Header Bar */}
            <div className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
              darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              {/* Day Navigation */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const currentIndex = scheduleDates.indexOf(selectedDayView);
                    if (currentIndex > 0) {
                      setSelectedDayView(scheduleDates[currentIndex - 1]);
                    }
                  }}
                  disabled={scheduleDates.indexOf(selectedDayView) === 0}
                  className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 dark:border-slate-700"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-indigo-500" />
                    <h2 className="font-bold text-lg md:text-xl tracking-tight">
                      {formatDateLabel(selectedDayView).fullDayName}, {formatDateLabel(selectedDayView).fullFormattedDate}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    High Resolution Single Day View • 5-min precision grid
                  </p>
                </div>

                <button
                  onClick={() => {
                    const currentIndex = scheduleDates.indexOf(selectedDayView);
                    if (currentIndex < scheduleDates.length - 1) {
                      setSelectedDayView(scheduleDates[currentIndex + 1]);
                    }
                  }}
                  disabled={scheduleDates.indexOf(selectedDayView) === scheduleDates.length - 1}
                  className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 dark:border-slate-700"
                  title="Next Day"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setEditingActivity({
                      id: 'act-' + Date.now(),
                      title: '',
                      date: selectedDayView,
                      startTime: '09:00',
                      endTime: '10:00',
                      categoryId: categories[0]?.id || '',
                      notes: '',
                      isNew: true,
                    })
                  }
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Activity
                </button>

                <button
                  onClick={() => setSelectedDayView(null)}
                  className="px-3.5 py-1.5 bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 shadow"
                  title="Return to Full Schedule Grid"
                >
                  <Minimize2 className="w-4 h-4" /> Close Day View
                </button>
              </div>
            </div>

            {/* Expanded Day View Area */}
            <div className="flex-1 overflow-y-auto relative p-4">
              <div className="max-w-3xl mx-auto rounded-xl border dark:border-slate-800 border-slate-200 overflow-hidden relative" style={{ height: `${DAY_VIEW_GRID_HEIGHT}px` }}>
                <div className="grid grid-cols-[100px_1fr] h-full relative">
                  
                  {/* Time Column */}
                  <div className={`border-r dark:border-slate-800 border-slate-200 select-none ${
                    darkMode ? 'bg-slate-900/60' : 'bg-slate-50'
                  }`}>
                    {Array.from({ length: 12 }).map((_, idx) => {
                      const hourMins = GRID_START_MINUTES + idx * 60;
                      return (
                        <div
                          key={idx}
                          className="border-b dark:border-slate-800/80 border-slate-200 pr-3 text-right font-semibold text-xs text-slate-500 dark:text-slate-400 flex items-start justify-end pt-2"
                          style={{ height: `${DAY_VIEW_HOUR_HEIGHT}px` }}
                        >
                          {formatDisplayTime(minutesToTime(hourMins))}
                        </div>
                      );
                    })}
                  </div>

                  {/* Interactive Column Grid */}
                  <div
                    className="relative transition-colors hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickY = e.clientY - rect.top;
                      const clickedMinute = GRID_START_MINUTES + (clickY / DAY_VIEW_GRID_HEIGHT) * TOTAL_MINUTES;
                      handleGridCellClick(selectedDayView, clickedMinute);
                    }}
                  >
                    {/* Hourly Lines */}
                    {Array.from({ length: 12 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="border-b dark:border-slate-800/60 border-slate-200 pointer-events-none"
                        style={{ height: `${DAY_VIEW_HOUR_HEIGHT}px` }}
                      />
                    ))}

                    {/* 15-Min Lines */}
                    {Array.from({ length: 48 }).map((_, idx) => (
                      <div
                        key={`sub15-${idx}`}
                        className="border-b border-dashed dark:border-slate-800/30 border-slate-100 pointer-events-none absolute w-full"
                        style={{ top: `${(idx * DAY_VIEW_HOUR_HEIGHT) / 4}px` }}
                      />
                    ))}

                    {/* Day Activities */}
                    {calculateOverlaps(filteredActivities.filter((a) => a.date === selectedDayView)).map((act) => {
                      const category = categoryMap[act.categoryId] || { color: '#64748B', name: 'Other' };
                      const startMins = timeToMinutes(act.startTime);
                      const endMins = timeToMinutes(act.endTime);
                      
                      const topPx = ((startMins - GRID_START_MINUTES) / TOTAL_MINUTES) * DAY_VIEW_GRID_HEIGHT;
                      const heightPx = ((endMins - startMins) / TOTAL_MINUTES) * DAY_VIEW_GRID_HEIGHT;

                      const widthPercent = 100 / (act.totalColumns || 1);
                      const leftPercent = (act.columnIndex || 0) * widthPercent;

                      const isSelected = selectedActivityIds.includes(act.id);

                      return (
                        <div
                          key={act.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isBatchMode) {
                              toggleSelectActivity(act.id);
                            } else {
                              setEditingActivity({ ...act });
                            }
                          }}
                          style={{
                            top: `${topPx}px`,
                            height: `${Math.max(36, heightPx)}px`,
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            backgroundColor: `${category.color}25`,
                            borderColor: category.color,
                          }}
                          className={`absolute rounded-xl border-l-8 border-y border-r p-3 text-xs shadow-md cursor-pointer transition-all overflow-hidden flex flex-col justify-between group/daycard ${
                            isSelected ? 'ring-4 ring-rose-500 bg-rose-500/30' : 'hover:shadow-lg hover:z-10'
                          } ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}
                        >
                          {/* Top Resize Handle */}
                          {!isBatchMode && (
                            <div
                              onMouseDown={(e) => handleMouseDown(e, act, 'resize-top', 'dayView')}
                              className="absolute top-0 left-0 right-0 h-3 cursor-n-resize hover:bg-slate-400/40 opacity-0 group-hover/daycard:opacity-100 z-10 rounded-t"
                            />
                          )}

                          {/* Content Row */}
                          <div className="flex items-start justify-between gap-2 pointer-events-none">
                            <div className="flex items-center gap-2">
                              {isBatchMode && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectActivity(act.id);
                                  }}
                                  className="pointer-events-auto"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-5 h-5 text-rose-600 dark:text-rose-400 fill-rose-100 dark:fill-rose-950" />
                                  ) : (
                                    <Square className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                  )}
                                </div>
                              )}
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm"
                                style={{ backgroundColor: category.color }}
                              >
                                {category.name}
                              </span>
                              <h4 className="font-bold text-sm tracking-tight">{act.title || 'Untitled'}</h4>
                            </div>

                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300">
                              {formatDisplayTime(act.startTime)} - {formatDisplayTime(act.endTime)}
                            </span>
                          </div>

                          {act.notes && heightPx > 50 && (
                            <p className="text-xs opacity-90 my-1 pointer-events-none line-clamp-2">
                              {act.notes}
                            </p>
                          )}

                          {/* Drag Overlay Bar */}
                          {!isBatchMode && (
                            <div
                              onMouseDown={(e) => handleMouseDown(e, act, 'move', 'dayView')}
                              className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing opacity-0 group-hover/daycard:opacity-100 flex items-center justify-center bg-slate-900/10 backdrop-blur-[1px] transition-opacity"
                            >
                              <span className="text-xs font-bold bg-slate-900 text-white px-3 py-1 rounded-full shadow pointer-events-none">
                                Drag to move (5m snap)
                              </span>
                            </div>
                          )}

                          {/* Bottom Resize Handle */}
                          {!isBatchMode && (
                            <div
                              onMouseDown={(e) => handleMouseDown(e, act, 'resize-bottom', 'dayView')}
                              className="absolute bottom-0 left-0 right-0 h-3 cursor-s-resize hover:bg-slate-400/40 opacity-0 group-hover/daycard:opacity-100 z-10 rounded-b"
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
        </div>
      )}

      {}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-slate-800 border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-500" />
                Schedule Settings & Range
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">Schedule Planner Title</label>
                <input
                  type="text"
                  value={plannerTitle}
                  onChange={(e) => setPlannerTitle(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Quick Range Presets */}
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">Quick Range Presets</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setStartDate('2026-01-20');
                      setEndDate('2026-01-27');
                    }}
                    className="px-2.5 py-1 rounded-lg border font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Jan 20 – Jan 27, 2026
                  </button>                  <button
                    onClick={() => {
                      const today = new Date();
                      const yyyy = today.getFullYear();
                      const mm = String(today.getMonth() + 1).padStart(2, '0');
                      const dd = String(today.getDate()).padStart(2, '0');
                      const start = `${yyyy}-${mm}-${dd}`;

                      const nextWeek = new Date(today);
                      nextWeek.setDate(nextWeek.getDate() + 6);
                      const nyyyy = nextWeek.getFullYear();
                      const nmm = String(nextWeek.getMonth() + 1).padStart(2, '0');
                      const ndd = String(nextWeek.getDate()).padStart(2, '0');
                      const end = `${nyyyy}-${nmm}-${ndd}`;

                      setStartDate(start);
                      setEndDate(end);
                    }}
                    className="px-2.5 py-1 rounded-lg border font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Next 7 Days
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t dark:border-slate-800 border-slate-200 flex justify-end">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow"
                >
                  Save & Apply Range
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {isBatchMode && selectedActivityIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 dark:border-slate-200 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="font-bold text-sm">
              {selectedActivityIds.length} {selectedActivityIds.length === 1 ? 'activity' : 'activities'} selected
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700 dark:bg-slate-300" />
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Delete Selected
          </button>
        </div>
      )}

      {/* CONFIRM BATCH DELETE DIALOG */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center gap-3 text-rose-500 mb-4">
              <div className="p-3 rounded-full bg-rose-100 dark:bg-rose-950/80">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Confirm Batch Deletion</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <span className="font-bold text-rose-600 dark:text-rose-400">{selectedActivityIds.length}</span> selected activity items?
            </p>

            <div className={`p-3 rounded-xl max-h-36 overflow-y-auto mb-6 text-xs border ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <p className="font-bold mb-2 text-slate-400 uppercase text-[10px] tracking-wider">Items to be removed:</p>
              <ul className="space-y-1">
                {activities
                  .filter((a) => selectedActivityIds.includes(a.id))
                  .map((a) => (
                    <li key={a.id} className="truncate flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="font-medium">{a.title}</span>
                      <span className="opacity-60 text-[10px]">({a.date})</span>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleBatchDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {editingActivity && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            
            <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-slate-800 border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-500" />
                {editingActivity.isNew ? 'Create Activity' : 'Edit Activity'}
              </h3>
              <button
                onClick={() => setEditingActivity(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setActivities((prev) => {
                  const exists = prev.some((a) => a.id === editingActivity.id);
                  if (exists) {
                    return prev.map((a) => (a.id === editingActivity.id ? editingActivity : a));
                  }
                  return [...prev, { ...editingActivity, isNew: undefined }];
                });
                setEditingActivity(null);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">Activity Title</label>
                <input
                  type="text"
                  required
                  value={editingActivity.title}
                  onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value })}
                  placeholder="e.g. Deep Work Session"
                  className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">Date</label>
                  <select
                    value={editingActivity.date}
                    onChange={(e) => setEditingActivity({ ...editingActivity, date: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {scheduleDates.map((d) => {
                      const { dayName, formattedDate } = formatDateLabel(d);
                      return (
                        <option key={d} value={d}>
                          {dayName}, {formattedDate}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">Category</label>
                  <select
                    value={editingActivity.categoryId}
                    onChange={(e) => setEditingActivity({ ...editingActivity, categoryId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">Start Time</label>
                  <input
                    type="time"
                    min="06:00"
                    max="18:00"
                    step="300"
                    required
                    value={editingActivity.startTime}
                    onChange={(e) => setEditingActivity({ ...editingActivity, startTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">End Time</label>
                  <input
                    type="time"
                    min="06:00"
                    max="18:00"
                    step="300"
                    required
                    value={editingActivity.endTime}
                    onChange={(e) => setEditingActivity({ ...editingActivity, endTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">Notes / Agenda</label>
                <textarea
                  rows={3}
                  value={editingActivity.notes || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, notes: e.target.value })}
                  placeholder="Add details, links or action items..."
                  className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t dark:border-slate-800 border-slate-200">
                {!editingActivity.isNew ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActivities((prev) => prev.filter((a) => a.id !== editingActivity.id));
                      setEditingActivity(null);
                    }}
                    className="text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                ) : <span />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingActivity(null)}
                    className={`px-4 py-2 font-semibold rounded-xl border ${
                      darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/20"
                  >
                    Save Activity
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {showCategoryManager && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-lg w-full rounded-2xl p-6 shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-slate-800 border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-500" />
                Category & Color Tag Manager
              </h3>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="color"
                      value={cat.color}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        setCategories((prev) =>
                          prev.map((c) => (c.id === cat.id ? { ...c, color: newColor } : c))
                        );
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                    />
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setCategories((prev) =>
                          prev.map((c) => (c.id === cat.id ? { ...c, name: newName } : c))
                        );
                      }}
                      className={`font-semibold text-xs px-2 py-1 rounded-lg border outline-none w-full ${
                        darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (categories.length <= 1) return;
                      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
                    }}
                    disabled={categories.length <= 1}
                    className="text-slate-400 hover:text-rose-500 disabled:opacity-30 p-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t dark:border-slate-800 border-slate-200 flex items-center justify-between mt-4">
              <button
                onClick={() => {
                  const newCat = {
                    id: 'cat-' + Date.now(),
                    name: 'New Category',
                    color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
                  };
                  setCategories((prev) => [...prev, newCat]);
                }}
                className="px-3.5 py-1.5 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-xl hover:bg-indigo-100 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Category
              </button>

              <button
                onClick={() => setShowCategoryManager(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showAnalytics && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-xl w-full rounded-2xl p-6 shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-slate-800 border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Time Utilization Analytics
              </h3>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Total scheduled hours across all active days in range ({formatDateLabel(startDate).formattedDate} – {formatDateLabel(endDate).formattedDate}).
            </p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {categoryAnalytics.map((cat) => (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="font-bold">{cat.name}</span>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {cat.hours} hrs ({cat.percentage}%) • {cat.count} items
                    </span>
                  </div>

                  <div className={`h-3 rounded-full overflow-hidden w-full ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t dark:border-slate-800 border-slate-200 flex justify-end mt-6">
              <button
                onClick={() => setShowAnalytics(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow"
              >
                Close Analytics
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}