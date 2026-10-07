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
  Sliders,
  Move
} from 'lucide-react';

// Time window defaults (6:00 AM to 6:00 PM)
const DEFAULT_START_HOUR = 6;
const DEFAULT_END_HOUR = 18;

// Pixel scales for main grid and expanded single-day popup
const MAIN_HOUR_HEIGHT = 80;
const DAY_VIEW_HOUR_HEIGHT = 120;

// Preset Color Swatches for Categories
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

// Initial Categories
const DEFAULT_CATEGORIES = [
  { id: 'cat-work', name: 'Deep Work', color: '#3B82F6' },
  { id: 'cat-fitness', name: 'Health & Fitness', color: '#10B981' },
  { id: 'cat-learn', name: 'Learning & Dev', color: '#8B5CF6' },
  { id: 'cat-meeting', name: 'Team Meetings', color: '#EC4899' },
  { id: 'cat-admin', name: 'Admin & Email', color: '#F59E0B' },
  { id: 'cat-leisure', name: 'Personal & Rest', color: '#14B8A6' },
];

// Sample Initial Activities with Multi-Tag categories
const INITIAL_ACTIVITIES = [
  {
    id: 'act-1',
    title: 'Sprint Planning & Kickoff',
    date: '2026-01-20',
    startTime: '08:00',
    endTime: '09:30',
    categoryIds: ['cat-meeting', 'cat-work'],
    notes: 'Review goals for Q1 and assign initial development tickets.',
  },
  {
    id: 'act-2',
    title: 'Core Architecture Coding',
    date: '2026-01-20',
    startTime: '10:00',
    endTime: '12:30',
    categoryIds: ['cat-work'],
    notes: 'Implement API routing layer and global state store.',
  },
  {
    id: 'act-3',
    title: 'Gym Workout & Cardio',
    date: '2026-01-20',
    startTime: '13:00',
    endTime: '14:15',
    categoryIds: ['cat-fitness', 'cat-leisure'],
    notes: 'Leg day routine and 20 min high intensity cycling.',
  },
  {
    id: 'act-4',
    title: 'React 19 & Next.js Study',
    date: '2026-01-21',
    startTime: '07:00',
    endTime: '08:30',
    categoryIds: ['cat-learn', 'cat-work'],
    notes: 'Explore Server Actions, useActionState, and Optimistic UI features.',
  },
  {
    id: 'act-5',
    title: 'Client Demo & Feedback',
    date: '2026-01-21',
    startTime: '09:00',
    endTime: '10:30',
    categoryIds: ['cat-meeting'],
    notes: 'Present prototype wireframes to stakeholders for sign-off.',
  },
  {
    id: 'act-6',
    title: 'Inbox Zero & Documentation',
    date: '2026-01-21',
    startTime: '11:00',
    endTime: '12:00',
    categoryIds: ['cat-admin'],
    notes: 'Clear pending emails and update internal team wiki.',
  },
  {
    id: 'act-7',
    title: 'UI Design System Review',
    date: '2026-01-22',
    startTime: '08:30',
    endTime: '10:00',
    categoryIds: ['cat-work', 'cat-learn'],
    notes: 'Audit Tailwind color tokens and dark mode component specs.',
  },
  {
    id: 'act-8',
    title: 'Database Schema Migration',
    date: '2026-01-22',
    startTime: '10:00',
    endTime: '12:00',
    categoryIds: ['cat-work'],
    notes: 'Optimize indexes and run benchmark scripts on staging environment.',
  },
  {
    id: 'act-9',
    title: 'Yoga & Mindfulness',
    date: '2026-01-23',
    startTime: '06:30',
    endTime: '07:30',
    categoryIds: ['cat-fitness'],
    notes: 'Morning stretch and breathing exercise session.',
  },
  {
    id: 'act-10',
    title: 'Code Review & Refactoring',
    date: '2026-01-23',
    startTime: '13:30',
    endTime: '15:45',
    categoryIds: ['cat-work', 'cat-admin'],
    notes: 'Review pull requests for batch selection and modal components.',
  },
  {
    id: 'act-11',
    title: 'Weekend Reading & Rest',
    date: '2026-01-24',
    startTime: '09:00',
    endTime: '11:30',
    categoryIds: ['cat-leisure', 'cat-learn'],
    notes: 'Read technical whitepapers and enjoy morning coffee.',
  },
  {
    id: 'act-12',
    title: 'Weekly Retrospective',
    date: '2026-01-26',
    startTime: '16:00',
    endTime: '17:30',
    categoryIds: ['cat-meeting', 'cat-admin'],
    notes: 'Discuss sprint accomplishments and team retro points.',
  }
];

// Hex color to RGBA string converter
const hexToRgba = (hex, alpha = 0.3) => {
  if (!hex) return `rgba(100, 116, 139, ${alpha})`;
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(100, 116, 139, ${alpha})`;
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
};

// Generates dynamic background style (solid or multi-tag diagonal striped gradient)
const getMultiTagBackground = (categoryIds = [], categoryMap, isDark) => {
  const validCategories = (categoryIds || [])
    .map((id) => categoryMap[id])
    .filter(Boolean);

  if (validCategories.length === 0) {
    return {
      background: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(241, 245, 249, 0.8)',
      borderColor: '#94a3b8',
    };
  }

  if (validCategories.length === 1) {
    const cat = validCategories[0];
    const bgOpacity = isDark ? 0.35 : 0.22;
    return {
      backgroundColor: hexToRgba(cat.color, bgOpacity),
      borderColor: cat.color,
    };
  }

  // Multiple Tags -> Create repeating diagonal striped CSS linear gradient
  const stripeWidth = 16;
  const colorStops = [];
  validCategories.forEach((cat, idx) => {
    const startPx = idx * stripeWidth;
    const endPx = (idx + 1) * stripeWidth;
    const rgbaColor = hexToRgba(cat.color, isDark ? 0.45 : 0.28);
    colorStops.push(`${rgbaColor} ${startPx}px`);
    colorStops.push(`${rgbaColor} ${endPx}px`);
  });

  return {
    background: `repeating-linear-gradient(-45deg, ${colorStops.join(', ')})`,
    borderColor: validCategories[0].color,
  };
};

// Time Conversion Helpers
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

// Date Range Generator
const getDatesInRange = (startDateStr, endDateStr) => {
  const dates = [];
  let current = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  if (isNaN(current.getTime()) || isNaN(end.getTime()) || current > end) {
    return [startDateStr];
  }

  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const formatDateLabel = (dateStr) => {
  if (!dateStr) return { dayName: '', formattedDate: '', fullFormattedDate: '' };
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const fullDayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
  const fullMonthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
  return {
    dayName,
    fullDayName,
    formattedDate: `${monthName} ${day}`,
    fullFormattedDate: `${fullMonthName} ${day}, ${year}`,
  };
};

const calculateOverlaps = (activities) => {
  if (!activities || activities.length === 0) return [];

  const sorted = [...activities]
    .map((act) => ({
      ...act,
      startMins: timeToMinutes(act.startTime),
      endMins: timeToMinutes(act.endTime),
    }))
    .sort((a, b) => a.startMins - b.startMins || (b.endMins - b.startMins) - (a.endMins - a.startMins));

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
  // Persistence state
  const [activities, setActivities] = useState(() => {
    const saved = localStorage.getItem('planner_activities_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Normalize backward compatibility for single categoryId
        return parsed.map((act) => ({
          ...act,
          categoryIds: act.categoryIds || (act.categoryId ? [act.categoryId] : []),
        }));
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_ACTIVITIES;
  });

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('planner_categories_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_CATEGORIES;
  });

  // Schedule Title & Configurable Date Range
  const [scheduleTitle, setScheduleTitle] = useState(() => {
    return localStorage.getItem('planner_title') || 'Jan 20 - Jan 27, 2026 Schedule';
  });
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [startDate, setStartDate] = useState(() => localStorage.getItem('planner_start_date') || '2026-01-20');
  const [endDate, setEndDate] = useState(() => localStorage.getItem('planner_end_date') || '2026-01-27');
  const [startHour, setStartHour] = useState(DEFAULT_START_HOUR);
  const [endHour, setEndHour] = useState(DEFAULT_END_HOUR);

  // App UI Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilters, setActiveCategoryFilters] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  // Single Day Pop-up View state
  const [selectedDayView, setSelectedDayView] = useState(null);

  // Batch Select & Delete Mode
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Modals
  const [editingActivity, setEditingActivity] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDateSettings, setShowDateSettings] = useState(false);

  // Drag & Drop / Resize state
  const [dragState, setDragState] = useState(null);
  const mainGridRef = useRef(null);

  // Derived Grid Metrics
  const gridStartMins = startHour * 60;
  const gridEndMins = endHour * 60;
  const totalMinutes = Math.max(60, gridEndMins - gridStartMins);
  const totalHours = Math.ceil(totalMinutes / 60);

  const mainGridHeight = totalHours * MAIN_HOUR_HEIGHT;
  const dayViewGridHeight = totalHours * DAY_VIEW_HOUR_HEIGHT;

  // Schedule Dates array
  const scheduleDates = useMemo(() => {
    return getDatesInRange(startDate, endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    localStorage.setItem('planner_activities_v2', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('planner_categories_v2', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('planner_title', scheduleTitle);
  }, [scheduleTitle]);

  useEffect(() => {
    localStorage.setItem('planner_start_date', startDate);
    localStorage.setItem('planner_end_date', endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      map[cat.id] = cat;
    });
    return map;
  }, [categories]);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchesSearch =
        act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (act.notes && act.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const actCatIds = act.categoryIds || (act.categoryId ? [act.categoryId] : []);
      const matchesCategory =
        activeCategoryFilters.length === 0 ||
        actCatIds.some((id) => activeCategoryFilters.includes(id));

      return matchesSearch && matchesCategory;
    });
  }, [activities, searchQuery, activeCategoryFilters]);

  const handleMouseDown = (e, activity, type, viewType = 'main') => {
    if (isBatchMode) return;
    e.stopPropagation();

    const hourHeight = viewType === 'dayView' ? DAY_VIEW_HOUR_HEIGHT : MAIN_HOUR_HEIGHT;

    setDragState({
      id: activity.id,
      type, // 'move', 'resize-top', 'resize-bottom'
      startY: e.clientY,
      startX: e.clientX,
      initialStart: timeToMinutes(activity.startTime),
      initialEnd: timeToMinutes(activity.endTime),
      initialDate: activity.date,
      currentDate: activity.date,
      viewType,
      hourHeight,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e) => {
      const deltaY = e.clientY - dragState.startY;
      const hourH = dragState.hourHeight;
      // Convert pixel delta to 5-minute snapped intervals
      const minutesDelta = Math.round(((deltaY / hourH) * 60) / 5) * 5;

      let targetDate = dragState.currentDate;

      // Handle Horizontal Date Column Switch in Main View
      if (dragState.type === 'move' && dragState.viewType === 'main' && mainGridRef.current) {
        const gridRect = mainGridRef.current.getBoundingClientRect();
        const timeColWidth = 80;
        const availableWidth = gridRect.width - timeColWidth;
        const colWidth = availableWidth / scheduleDates.length;

        const relativeX = e.clientX - gridRect.left - timeColWidth;
        const targetColIdx = Math.max(0, Math.min(scheduleDates.length - 1, Math.floor(relativeX / colWidth)));

        if (scheduleDates[targetColIdx]) {
          targetDate = scheduleDates[targetColIdx];
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
              gridStartMins,
              Math.min(gridEndMins - duration, dragState.initialStart + minutesDelta)
            );
            newEnd = newStart + duration;
          } else if (dragState.type === 'resize-top') {
            newStart = Math.max(
              gridStartMins,
              Math.min(dragState.initialEnd - 15, dragState.initialStart + minutesDelta)
            );
          } else if (dragState.type === 'resize-bottom') {
            newEnd = Math.min(
              gridEndMins,
              Math.max(dragState.initialStart + 15, dragState.initialEnd + minutesDelta)
            );
          }

          return {
            ...act,
            date: targetDate,
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
  }, [dragState, scheduleDates, gridStartMins, gridEndMins]);

  const handleGridCellClick = (dateStr, clickedMinute) => {
    if (isBatchMode) return;
    const snappedStart = Math.round(clickedMinute / 5) * 5;
    const snappedEnd = Math.min(gridEndMins, snappedStart + 60);

    setEditingActivity({
      id: 'act-' + Date.now(),
      title: 'New Activity',
      date: dateStr,
      startTime: minutesToTime(snappedStart),
      endTime: minutesToTime(snappedEnd),
      categoryIds: [categories[0]?.id || 'cat-work'],
      notes: '',
      isNew: true,
    });
  };

  const toggleSelectActivity = (id) => {
    setSelectedActivityIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedActivityIds(filteredActivities.map((a) => a.id));
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

  const exportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify({ title: scheduleTitle, startDate, endDate, activities, categories }, null, 2)
      );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `schedule_planner_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportCSV = () => {
    let csv = 'ID,Title,Date,Start Time,End Time,Categories/Tags,Notes\n';
    activities.forEach((act) => {
      const actCatIds = act.categoryIds || (act.categoryId ? [act.categoryId] : []);
      const tagNames = actCatIds.map((id) => categoryMap[id]?.name || 'Uncategorized').join('; ');
      const cleanNotes = (act.notes || '').replace(/"/g, '""');
      csv += `"${act.id}","${act.title}","${act.date}","${act.startTime}","${act.endTime}","${tagNames}","${cleanNotes}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `schedule_planner_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importJSON = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (parsed.activities) setActivities(parsed.activities);
          if (parsed.categories) setCategories(parsed.categories);
          if (parsed.title) setScheduleTitle(parsed.title);
          if (parsed.startDate) setStartDate(parsed.startDate);
          if (parsed.endDate) setEndDate(parsed.endDate);
        } catch (err) {
          console.error('Invalid JSON file format', err);
        }
      };
    }
  };

  // Analytics computation (split multi-tag time proportionally)
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

      const actCatIds = act.categoryIds || (act.categoryId ? [act.categoryId] : []);
      if (actCatIds.length > 0) {
        const splitDuration = duration / actCatIds.length;
        actCatIds.forEach((catId) => {
          if (totals[catId]) {
            totals[catId].totalMinutes += splitDuration;
            totals[catId].count += 1;
          }
        });
      }
    });

    return Object.values(totals).map((item) => ({
      ...item,
      hours: (item.totalMinutes / 60).toFixed(1),
      percentage: grandTotalMins > 0 ? Math.round((item.totalMinutes / grandTotalMins) * 100) : 0,
    }));
  }, [activities, categories]);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      <header
        className={`border-b sticky top-0 z-30 backdrop-blur-md ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Editable Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
              <Calendar className="w-6 h-6" />
            </div>

            <div>
              {isEditingTitle ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={scheduleTitle}
                    onChange={(e) => setScheduleTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                    autoFocus
                    className={`font-bold text-base md:text-lg px-2 py-0.5 rounded border outline-none ${
                      darkMode ? 'bg-slate-800 border-indigo-500 text-white' : 'bg-slate-100 border-indigo-500 text-slate-900'
                    }`}
                  />
                  <button
                    onClick={() => setIsEditingTitle(false)}
                    className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <h1
                  onClick={() => setIsEditingTitle(true)}
                  className="font-bold text-lg leading-tight tracking-tight flex items-center gap-2 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 group"
                  title="Click to edit Schedule Title"
                >
                  {scheduleTitle}
                  <Edit3 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                </h1>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>{scheduleDates.length} Days View</span> •
                <button
                  onClick={() => setShowDateSettings(true)}
                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  <Sliders className="w-3 h-3" /> Change Range & Window
                </button>
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="flex-1 max-w-xs relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search activities or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-8 py-1.5 text-xs font-medium rounded-xl border outline-none transition-all ${
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

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Batch Select Toggle */}
            <button
              onClick={() => {
                setIsBatchMode(!isBatchMode);
                setSelectedActivityIds([]);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 ${
                isBatchMode
                  ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
                  : darkMode
                  ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              {isBatchMode ? 'Exit Batch Mode' : 'Batch Select'}
            </button>

            {/* Category Manager */}
            <button
              onClick={() => setShowCategoryManager(true)}
              className={`p-2 rounded-xl border transition-all ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Manage Categories & Tag Colors"
            >
              <Tag className="w-4 h-4" />
            </button>

            {/* Analytics Toggle */}
            <button
              onClick={() => setShowAnalytics(true)}
              className={`p-2 rounded-xl border transition-all ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Time Analytics Dashboard"
            >
              <BarChart3 className="w-4 h-4" />
            </button>

            {/* Export & Import Utilities */}
            <div className="flex items-center border rounded-xl overflow-hidden dark:border-slate-700 border-slate-200">
              <button
                onClick={exportJSON}
                className="p-2 text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Export JSON Schedule"
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
                title="Import JSON Data"
              >
                <Upload className="w-4 h-4" />
                <input type="file" accept=".json" onChange={importJSON} className="hidden" />
              </label>
            </div>

            {/* Dark / Light Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border transition-all ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Add Activity Button */}
            <button
              onClick={() =>
                setEditingActivity({
                  id: 'act-' + Date.now(),
                  title: '',
                  date: scheduleDates[0] || '2026-01-20',
                  startTime: '09:00',
                  endTime: '10:00',
                  categoryIds: [categories[0]?.id || 'cat-work'],
                  notes: '',
                  isNew: true,
                })
              }
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Activity
            </button>
          </div>
        </div>

        {/* Sub-bar Filter Options & Multi-Tag Context */}
        <div
          className={`px-4 py-2 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100/70 border-slate-200'
          }`}
        >
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter Tags:
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

          {/* Batch Mode Top Notice */}
          {isBatchMode && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5" /> Multi-Select Active
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

      <main className="flex-1 overflow-x-auto p-4 max-w-[1600px] w-full mx-auto">
        <div
          ref={mainGridRef}
          className={`min-w-[1000px] rounded-2xl border shadow-sm overflow-hidden flex flex-col ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {/* Dynamic Columns Header */}
          <div
            className={`grid sticky top-[108px] z-20 border-b ${
              darkMode ? 'bg-slate-900/95 border-slate-800 text-slate-200' : 'bg-slate-100/90 border-slate-200 text-slate-700'
            }`}
            style={{
              gridTemplateColumns: `80px repeat(${scheduleDates.length}, minmax(120px, 1fr))`,
            }}
          >
            {/* Time Column Header */}
            <div className="p-3 border-r dark:border-slate-800 border-slate-200 font-semibold text-xs text-center flex items-center justify-center gap-1 text-slate-400">
              <Clock className="w-3.5 h-3.5" /> Time
            </div>

            {/* Date Column Headers */}
            {scheduleDates.map((dateStr) => {
              const { dayName, formattedDate } = formatDateLabel(dateStr);
              const dayCount = filteredActivities.filter((a) => a.date === dateStr).length;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDayView(dateStr)}
                  className="p-3 border-r last:border-r-0 dark:border-slate-800 border-slate-200 text-center cursor-pointer group hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 transition-all relative"
                  title="Click to expand full Single Day View"
                >
                  <div className="font-bold text-xs md:text-sm tracking-tight flex items-center justify-center gap-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {dayName}
                    <Maximize2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-1 mt-0.5">
                    <span>{formattedDate}</span>
                    {dayCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center">
                        {dayCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timetable Body Grid */}
          <div
            className="grid relative"
            style={{
              gridTemplateColumns: `80px repeat(${scheduleDates.length}, minmax(120px, 1fr))`,
              height: `${mainGridHeight}px`,
            }}
          >
            {/* Time Axis Column */}
            <div
              className={`border-r dark:border-slate-800 border-slate-200 select-none ${
                darkMode ? 'bg-slate-900/50' : 'bg-slate-50/50'
              }`}
            >
              {Array.from({ length: totalHours }).map((_, idx) => {
                const hourMins = gridStartMins + idx * 60;
                return (
                  <div
                    key={idx}
                    className="border-b dark:border-slate-800/60 border-slate-200/80 pr-2 text-right font-medium text-[11px] text-slate-400 flex items-start justify-end pt-1"
                    style={{ height: `${MAIN_HOUR_HEIGHT}px` }}
                  >
                    {formatDisplayTime(minutesToTime(hourMins))}
                  </div>
                );
              })}
            </div>

            {/* Date Columns & Draggable Activity Blocks */}
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
                    const clickedMinute = gridStartMins + (clickY / mainGridHeight) * totalMinutes;
                    handleGridCellClick(dateStr, clickedMinute);
                  }}
                >
                  {/* Hourly Background Horizontal Lines */}
                  {Array.from({ length: totalHours }).map((_, idx) => (
                    <div
                      key={idx}
                      className="border-b dark:border-slate-800/40 border-slate-100 pointer-events-none"
                      style={{ height: `${MAIN_HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Half-Hour Dashed Subdivision Lines */}
                  {Array.from({ length: totalHours }).map((_, idx) => (
                    <div
                      key={`sub-${idx}`}
                      className="border-b border-dashed dark:border-slate-800/20 border-slate-100 pointer-events-none absolute w-full"
                      style={{ top: `${(idx + 0.5) * MAIN_HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Activity Blocks */}
                  {layoutItems.map((act) => {
                    const actCatIds = act.categoryIds || (act.categoryId ? [act.categoryId] : []);
                    const bgStyle = getMultiTagBackground(actCatIds, categoryMap, darkMode);

                    const startMins = timeToMinutes(act.startTime);
                    const endMins = timeToMinutes(act.endTime);

                    const topPx = ((startMins - gridStartMins) / totalMinutes) * mainGridHeight;
                    const heightPx = ((endMins - startMins) / totalMinutes) * mainGridHeight;

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
                          ...bgStyle,
                        }}
                        className={`absolute rounded-xl border-l-4 border-y border-r p-1.5 text-xs shadow-sm cursor-pointer transition-all duration-75 overflow-hidden flex flex-col justify-between group/card ${
                          isSelected
                            ? 'ring-2 ring-rose-500 ring-offset-1 bg-rose-500/30'
                            : 'hover:shadow-md hover:z-10'
                        } ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}
                      >
                        {/* Top Resize Handle */}
                        {!isBatchMode && (
                          <div
                            onMouseDown={(e) => handleMouseDown(e, act, 'resize-top', 'main')}
                            className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-slate-400/40 opacity-0 group-hover/card:opacity-100 z-10 rounded-t"
                          />
                        )}

                        {/* Title & Tag Pills Header */}
                        <div className="flex items-start justify-between gap-1 pointer-events-none">
                          <div className="flex items-center gap-1 min-w-0">
                            {isBatchMode && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectActivity(act.id);
                                }}
                                className="pointer-events-auto mr-1"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-rose-600 dark:text-rose-400 fill-rose-100 dark:fill-rose-950" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                )}
                              </div>
                            )}

                            {/* Tag Color Indicators */}
                            <div className="flex items-center -space-x-1 shrink-0">
                              {actCatIds.map((id) => (
                                <span
                                  key={id}
                                  className="w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 shadow-sm"
                                  style={{ backgroundColor: categoryMap[id]?.color || '#94a3b8' }}
                                  title={categoryMap[id]?.name}
                                />
                              ))}
                            </div>

                            <p className="font-bold truncate leading-tight text-[11px] ml-0.5">
                              {act.title || 'Untitled'}
                            </p>
                          </div>
                        </div>

                        {/* Time & Notes */}
                        <div className="my-0.5 pointer-events-none">
                          <p className="text-[10px] font-semibold opacity-85">
                            {formatDisplayTime(act.startTime)} - {formatDisplayTime(act.endTime)}
                          </p>
                          {heightPx > 50 && act.notes && (
                            <p className="text-[10px] opacity-75 truncate italic mt-0.5">{act.notes}</p>
                          )}
                        </div>

                        {/* Center Drag Handle Overlay */}
                        {!isBatchMode && (
                          <div
                            onMouseDown={(e) => handleMouseDown(e, act, 'move', 'main')}
                            className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing opacity-0 group-hover/card:opacity-100 flex items-center justify-center bg-slate-900/10 backdrop-blur-[1px] transition-opacity"
                          >
                            <span className="text-[9px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded shadow pointer-events-none flex items-center gap-1">
                              <Move className="w-2.5 h-2.5" /> Drag
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

      {selectedDayView && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-hidden">
          <div
            className={`w-full max-w-4xl h-[92vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-fadeIn ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
                darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Day Navigation */}
                <button
                  onClick={() => {
                    const idx = scheduleDates.indexOf(selectedDayView);
                    if (idx > 0) setSelectedDayView(scheduleDates[idx - 1]);
                  }}
                  disabled={scheduleDates.indexOf(selectedDayView) === 0}
                  className="p-1.5 rounded-xl border hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 dark:border-slate-700"
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
                    High Resolution Day View • 5-minute precision grid snapping
                  </p>
                </div>

                <button
                  onClick={() => {
                    const idx = scheduleDates.indexOf(selectedDayView);
                    if (idx < scheduleDates.length - 1) setSelectedDayView(scheduleDates[idx + 1]);
                  }}
                  disabled={scheduleDates.indexOf(selectedDayView) === scheduleDates.length - 1}
                  className="p-1.5 rounded-xl border hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 dark:border-slate-700"
                  title="Next Day"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setEditingActivity({
                      id: 'act-' + Date.now(),
                      title: '',
                      date: selectedDayView,
                      startTime: '09:00',
                      endTime: '10:00',
                      categoryIds: [categories[0]?.id || 'cat-work'],
                      notes: '',
                      isNew: true,
                    })
                  }
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Activity
                </button>

                <button
                  onClick={() => setSelectedDayView(null)}
                  className="px-3.5 py-1.5 bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 shadow"
                >
                  <Minimize2 className="w-4 h-4" /> Close Day View
                </button>
              </div>
            </div>

            {/* Single Day High-Res Interactive Grid */}
            <div className="flex-1 overflow-y-auto relative p-4">
              <div
                className="max-w-3xl mx-auto rounded-xl border dark:border-slate-800 border-slate-200 overflow-hidden relative"
                style={{ height: `${dayViewGridHeight}px` }}
              >
                <div className="grid grid-cols-[90px_1fr] h-full relative">
                  {/* Left Time Axis */}
                  <div
                    className={`border-r dark:border-slate-800 border-slate-200 select-none ${
                      darkMode ? 'bg-slate-900/60' : 'bg-slate-50'
                    }`}
                  >
                    {Array.from({ length: totalHours }).map((_, idx) => {
                      const hourMins = gridStartMins + idx * 60;
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

                  {/* Day Column Area */}
                  <div
                    className="relative transition-colors hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickY = e.clientY - rect.top;
                      const clickedMinute = gridStartMins + (clickY / dayViewGridHeight) * totalMinutes;
                      handleGridCellClick(selectedDayView, clickedMinute);
                    }}
                  >
                    {/* Hour Lines */}
                    {Array.from({ length: totalHours }).map((_, idx) => (
                      <div
                        key={idx}
                        className="border-b dark:border-slate-800/60 border-slate-200 pointer-events-none"
                        style={{ height: `${DAY_VIEW_HOUR_HEIGHT}px` }}
                      />
                    ))}

                    {/* 15-Min Sub-guidelines */}
                    {Array.from({ length: totalHours * 4 }).map((_, idx) => (
                      <div
                        key={`sub15-${idx}`}
                        className="border-b border-dashed dark:border-slate-800/30 border-slate-100 pointer-events-none absolute w-full"
                        style={{ top: `${(idx * DAY_VIEW_HOUR_HEIGHT) / 4}px` }}
                      />
                    ))}

                    {/* Single Day Activity Cards */}
                    {calculateOverlaps(filteredActivities.filter((a) => a.date === selectedDayView)).map((act) => {
                      const actCatIds = act.categoryIds || (act.categoryId ? [act.categoryId] : []);
                      const bgStyle = getMultiTagBackground(actCatIds, categoryMap, darkMode);

                      const startMins = timeToMinutes(act.startTime);
                      const endMins = timeToMinutes(act.endTime);

                      const topPx = ((startMins - gridStartMins) / totalMinutes) * dayViewGridHeight;
                      const heightPx = ((endMins - startMins) / totalMinutes) * dayViewGridHeight;

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
                            height: `${Math.max(40, heightPx)}px`,
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            ...bgStyle,
                          }}
                          className={`absolute rounded-xl border-l-8 border-y border-r p-3 text-xs shadow-md cursor-pointer transition-all overflow-hidden flex flex-col justify-between group/daycard ${
                            isSelected
                              ? 'ring-4 ring-rose-500 bg-rose-500/30'
                              : 'hover:shadow-lg hover:z-10'
                          } ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}
                        >
                          {/* Top Resize Handle */}
                          {!isBatchMode && (
                            <div
                              onMouseDown={(e) => handleMouseDown(e, act, 'resize-top', 'dayView')}
                              className="absolute top-0 left-0 right-0 h-3 cursor-n-resize hover:bg-slate-400/40 opacity-0 group-hover/daycard:opacity-100 z-10 rounded-t"
                            />
                          )}

                          {/* Top Tag Pills & Title */}
                          <div className="flex items-start justify-between gap-2 pointer-events-none">
                            <div className="flex items-center gap-2 flex-wrap">
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

                              {actCatIds.map((id) => (
                                <span
                                  key={id}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm flex items-center gap-1"
                                  style={{ backgroundColor: categoryMap[id]?.color || '#64748B' }}
                                >
                                  {categoryMap[id]?.name}
                                </span>
                              ))}

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

                          {/* Center Drag Overlay */}
                          {!isBatchMode && (
                            <div
                              onMouseDown={(e) => handleMouseDown(e, act, 'move', 'dayView')}
                              className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing opacity-0 group-hover/daycard:opacity-100 flex items-center justify-center bg-slate-900/10 backdrop-blur-[1px] transition-opacity"
                            >
                              <span className="text-xs font-bold bg-slate-900 text-white px-3 py-1 rounded-full shadow pointer-events-none flex items-center gap-1">
                                <Move className="w-3.5 h-3.5" /> Drag to reposition (5m snap)
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

      {isBatchMode && selectedActivityIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 dark:border-slate-200 flex items-center gap-4 animate-bounce">
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

      {/* Batch Delete Confirm Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
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

            <div
              className={`p-3 rounded-xl max-h-36 overflow-y-auto mb-6 text-xs border ${
                darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <p className="font-bold mb-2 text-slate-400 uppercase text-[10px] tracking-wider">Items to remove:</p>
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

      {editingActivity && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
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
                  placeholder="e.g. Deep Work & Architecture"
                  className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>

              {/* Multi-Tag Selection Checkboxes / Pills */}
              <div>
                <label className="block font-semibold mb-1.5 text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span>Categories / Tags (Select multiple for striped gradient)</span>
                  <span className="text-[10px] text-indigo-500 font-medium">Multi-tag supported</span>
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-xl border dark:border-slate-800 border-slate-200">
                  {categories.map((cat) => {
                    const currentTags = editingActivity.categoryIds || [];
                    const isChecked = currentTags.includes(cat.id);

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          const updated = isChecked
                            ? currentTags.filter((id) => id !== cat.id)
                            : [...currentTags, cat.id];
                          setEditingActivity({ ...editingActivity, categoryIds: updated });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                          isChecked
                            ? 'text-white border-transparent shadow-sm'
                            : darkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-300'
                            : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                        style={{
                          backgroundColor: isChecked ? cat.color : undefined,
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: isChecked ? '#fff' : cat.color }}
                        />
                        {cat.name}
                        {isChecked && <Check className="w-3 h-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
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
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">Start Time</label>
                  <input
                    type="time"
                    min="00:00"
                    max="23:59"
                    step="300"
                    required
                    value={editingActivity.startTime}
                    onChange={(e) => setEditingActivity({ ...editingActivity, startTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">End Time</label>
                  <input
                    type="time"
                    min="00:00"
                    max="23:59"
                    step="300"
                    required
                    value={editingActivity.endTime}
                    onChange={(e) => setEditingActivity({ ...editingActivity, endTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                {/* Preview strip */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">Visual Gradient</label>
                  <div
                    className="h-9 rounded-xl border flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-200 shadow-inner"
                    style={getMultiTagBackground(editingActivity.categoryIds, categoryMap, darkMode)}
                  >
                    {editingActivity.categoryIds?.length > 1
                      ? `${editingActivity.categoryIds.length} Tags Mixture`
                      : categoryMap[editingActivity.categoryIds?.[0]]?.name || 'Single Tag'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">Notes / Details</label>
                <textarea
                  rows={3}
                  value={editingActivity.notes || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, notes: e.target.value })}
                  placeholder="Add details, links or agenda notes..."
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
                ) : (
                  <span />
                )}

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

      {showDateSettings && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`max-w-md w-full rounded-2xl p-6 shadow-2xl border ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-slate-800 border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-500" />
                Schedule Range & Time Window
              </h3>
              <button
                onClick={() => setShowDateSettings(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Presets */}
              <div>
                <label className="block font-semibold mb-1.5 text-slate-600 dark:text-slate-400">Quick Presets</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setStartDate('2026-01-20');
                      setEndDate('2026-01-27');
                    }}
                    className="p-2 rounded-xl border text-center font-semibold hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800"
                  >
                    Jan 20 – Jan 27
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const yyyy = today.getFullYear();
                      const mm = String(today.getMonth() + 1).padStart(2, '0');
                      const dd = String(today.getDate()).padStart(2, '0');
                      const end = new Date();
                      end.setDate(end.getDate() + 6);
                      const ey = end.getFullYear();
                      const em = String(end.getMonth() + 1).padStart(2, '0');
                      const ed = String(end.getDate()).padStart(2, '0');
                      setStartDate(`${yyyy}-${mm}-${dd}`);
                      setEndDate(`${ey}-${em}-${ed}`);
                    }}
                    className="p-2 rounded-xl border text-center font-semibold hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800"
                  >
                    7 Days From Today
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const yyyy = today.getFullYear();
                      const mm = String(today.getMonth() + 1).padStart(2, '0');
                      const dd = String(today.getDate()).padStart(2, '0');
                      const end = new Date();
                      end.setDate(end.getDate() + 13);
                      const ey = end.getFullYear();
                      const em = String(end.getMonth() + 1).padStart(2, '0');
                      const ed = String(end.getDate()).padStart(2, '0');
                      setStartDate(`${yyyy}-${mm}-${dd}`);
                      setEndDate(`${ey}-${em}-${ed}`);
                    }}
                    className="p-2 rounded-xl border text-center font-semibold hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800"
                  >
                    14 Days Range
                  </button>
                </div>
              </div>

              {/* Custom Date Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
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
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Grid Time Window Hours */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t dark:border-slate-800 border-slate-200">
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">Daily Start Hour</label>
                  <select
                    value={startHour}
                    onChange={(e) => setStartHour(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i} value={i}>
                        {i === 0 ? '12:00 AM' : `${i}:00 AM`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-400">Daily End Hour</label>
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl border outline-none font-medium ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {Array.from({ length: 13 }).map((_, i) => {
                      const h = i + 12;
                      return (
                        <option key={h} value={h}>
                          {h === 12 ? '12:00 PM' : h === 24 ? '12:00 AM Next Day' : `${h - 12}:00 PM`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t dark:border-slate-800 border-slate-200 flex justify-end">
                <button
                  onClick={() => setShowDateSettings(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow"
                >
                  Apply Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCategoryManager && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`max-w-lg w-full rounded-2xl p-6 shadow-2xl border ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-slate-800 border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-500" />
                Category & Tag Color Manager
              </h3>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
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
                      className={`font-semibold text-xs px-2.5 py-1.5 rounded-lg border outline-none w-full ${
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
                    name: 'New Tag',
                    color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
                  };
                  setCategories((prev) => [...prev, newCat]);
                }}
                className="px-3.5 py-1.5 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-xl hover:bg-indigo-100 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Tag / Category
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

      {showAnalytics && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`max-w-xl w-full rounded-2xl p-6 shadow-2xl border ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-slate-800 border-slate-200">
              <h3 className="font-bold text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Time Breakdown & Tag Utilization
              </h3>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Hours allocated across tags (multi-tagged activities are split proportionally among tags).
            </p>

            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {categoryAnalytics.map((cat) => (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="font-bold">{cat.name}</span>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {cat.hours} hrs ({cat.percentage}%) • {cat.count} tagged
                    </span>
                  </div>

                  <div
                    className={`h-3 rounded-full overflow-hidden w-full ${
                      darkMode ? 'bg-slate-800' : 'bg-slate-100'
                    }`}
                  >
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}