import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar, Clock, Plus, Trash2, Edit3, Share2, Settings,
  Sun, Moon, Tag, Filter, CheckSquare, Square, Maximize2, Download, Upload,
  X, Check, Copy, BarChart2, AlertCircle, Eye, CheckCircle2,
  Layers, AlertTriangle, FileText
} from 'lucide-react';

// Requested Pastel Tag Colors for Grade 7 to 12
const DEFAULT_CATEGORIES = [
  { id: 'cat-g7', name: 'Grade 7', color: '#86efac' },   // Pastel Green
  { id: 'cat-g8', name: 'Grade 8', color: '#fef08a' },   // Pastel Yellow
  { id: 'cat-g9', name: 'Grade 9', color: '#fca5a5' },   // Pastel Red
  { id: 'cat-g10', name: 'Grade 10', color: '#93c5fd' }, // Pastel Blue
  { id: 'cat-g11', name: 'Grade 11', color: '#f472b6' }, // Pastel Pink
  { id: 'cat-g12', name: 'Grade 12', color: '#fdba74' }  // Pastel Orange
];

const DEFAULT_SCHEDULE_META = {
  title: 'YMSAT Schedule',
  startDate: '2027-01-20',
  endDate: '2027-01-27',
  startTime: '06:00',
  endTime: '18:00'
};

// Single default activity block: Opening Program with ALL tags selected
const DEFAULT_ACTIVITIES = [
  {
    id: 'act-opening-program',
    title: 'Opening Program',
    date: '2027-01-20',
    startTime: '07:30',
    endTime: '08:30',
    categoryIds: ['cat-g7', 'cat-g8', 'cat-g9', 'cat-g10', 'cat-g11', 'cat-g12'],
    notes: 'Welcome assembly and opening ceremonies for YMSAT.'
  }
];

const encodeScheduleToURL = (scheduleMeta, categories, activities) => {
  try {
    const payload = {
      meta: scheduleMeta,
      cats: categories,
      acts: activities,
      v: 2
    };
    const jsonStr = JSON.stringify(payload);
    const encoded = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode('0x' + p1);
    }));
    return encoded;
  } catch (err) {
    console.error('Encoding failed:', err);
    return null;
  }
};

const decodeScheduleFromURL = (encodedStr) => {
  try {
    const jsonStr = decodeURIComponent(Array.prototype.map.call(atob(encodedStr), (c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Decoding failed:', err);
    return null;
  }
};

const getCategoryStyle = (categoryIds, categories) => {
  if (!categoryIds || categoryIds.length === 0) {
    return { background: '#e2e8f0', color: '#0f172a' };
  }

  const matchedColors = categoryIds
    .map(id => categories.find(c => c.id === id)?.color)
    .filter(Boolean);

  if (matchedColors.length === 0) {
    return { background: '#e2e8f0', color: '#0f172a' };
  }

  if (matchedColors.length === 1) {
    return {
      background: matchedColors[0],
      color: '#0f172a' // Dark slate text for high contrast on pastel backgrounds
    };
  }

  // Multi-tag repeating linear gradient stripe pattern
  const stripeWidth = 18;
  let gradientStops = [];
  matchedColors.forEach((color, index) => {
    const start = index * stripeWidth;
    const end = (index + 1) * stripeWidth;
    gradientStops.push(`${color} ${start}px`, `${color} ${end}px`);
  });

  const totalWidth = matchedColors.length * stripeWidth;
  const gradientCss = `repeating-linear-gradient(135deg, ${gradientStops.join(', ')})`;

  return {
    backgroundImage: gradientCss,
    backgroundSize: `${totalWidth * 1.414}px ${totalWidth * 1.414}px`,
    color: '#0f172a'
  };
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const m = (totalMinutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const formatDisplayTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
};

const getDatesInRange = (startDateStr, endDateStr) => {
  const dates = [];
  let current = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

export default function App() {
  // Local storage initialization logic
  const [scheduleMeta, setScheduleMeta] = useState(() => {
    const saved = localStorage.getItem('ymsat_schedule_meta');
    return saved ? JSON.parse(saved) : DEFAULT_SCHEDULE_META;
  });

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('ymsat_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [activities, setActivities] = useState(() => {
    const saved = localStorage.getItem('ymsat_activities');
    return saved ? JSON.parse(saved) : DEFAULT_ACTIVITIES;
  });

  const [darkMode, setDarkMode] = useState(false);
  const [isViewingSharedUrl, setIsViewingSharedUrl] = useState(false);

  // UI Interactive States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState([]);
  
  // Modals
  const [activeModal, setActiveModal] = useState(null); // 'activity', 'categories', 'share', 'analytics', 'dayView', 'batchDelete', 'settings'
  const [editingActivity, setEditingActivity] = useState(null);
  const [selectedDayForView, setSelectedDayForView] = useState(null);

  // Form States
  const [activityForm, setActivityForm] = useState({
    title: '',
    date: '2027-01-20',
    startTime: '07:30',
    endTime: '08:30',
    categoryIds: ['cat-g7', 'cat-g8', 'cat-g9', 'cat-g10', 'cat-g11', 'cat-g12'],
    notes: ''
  });

  const [toastMessage, setToastMessage] = useState(null);
  const [generatedShareUrl, setGeneratedShareUrl] = useState('');

  const showToast = (text, type = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  useEffect(() => {
    if (!isViewingSharedUrl) {
      localStorage.setItem('ymsat_schedule_meta', JSON.stringify(scheduleMeta));
      localStorage.setItem('ymsat_categories', JSON.stringify(categories));
      localStorage.setItem('ymsat_activities', JSON.stringify(activities));
    }
  }, [scheduleMeta, categories, activities, isViewingSharedUrl]);

  useEffect(() => {
    const checkUrlForSharedData = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      let encodedData = null;

      if (hash && hash.includes('share=')) {
        encodedData = hash.split('share=')[1];
      } else if (search && search.includes('data=')) {
        const params = new URLSearchParams(search);
        encodedData = params.get('data');
      }

      if (encodedData) {
        const decoded = decodeScheduleFromURL(encodedData);
        if (decoded && decoded.meta && decoded.acts) {
          setIsViewingSharedUrl(true);
          setScheduleMeta(decoded.meta);
          setCategories(decoded.cats || DEFAULT_CATEGORIES);
          setActivities(decoded.acts || []);
          showToast('Loaded schedule from shared URL link!', 'success');
        } else {
          showToast('Invalid or corrupted share link.', 'error');
        }
      }
    };

    checkUrlForSharedData();
    window.addEventListener('hashchange', checkUrlForSharedData);
    return () => window.removeEventListener('hashchange', checkUrlForSharedData);
  }, []);

  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const q = searchQuery.toLowerCase();
    return activities.filter(act => {
      const matchesTitle = act.title.toLowerCase().includes(q);
      const matchesNotes = act.notes && act.notes.toLowerCase().includes(q);
      const matchesCat = act.categoryIds.some(cid => {
        const cat = categories.find(c => c.id === cid);
        return cat && cat.name.toLowerCase().includes(q);
      });
      return matchesTitle || matchesNotes || matchesCat;
    });
  }, [activities, searchQuery, categories]);

  const dateColumns = useMemo(() => {
    return getDatesInRange(scheduleMeta.startDate, scheduleMeta.endDate);
  }, [scheduleMeta.startDate, scheduleMeta.endDate]);

  const gridStartMins = useMemo(() => timeToMinutes(scheduleMeta.startTime), [scheduleMeta.startTime]);
  const gridEndMins = useMemo(() => timeToMinutes(scheduleMeta.endTime), [scheduleMeta.endTime]);
  const totalGridMins = useMemo(() => Math.max(60, gridEndMins - gridStartMins), [gridEndMins, gridStartMins]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let m = gridStartMins; m <= gridEndMins; m += 60) {
      slots.push(minutesToTime(m));
    }
    return slots;
  }, [gridStartMins, gridEndMins]);

  const handleOpenAddModal = (defaultDate = scheduleMeta.startDate) => {
    setEditingActivity(null);
    setActivityForm({
      title: '',
      date: defaultDate,
      startTime: '08:00',
      endTime: '09:00',
      categoryIds: categories.map(c => c.id), // All grades selected by default
      notes: ''
    });
    setActiveModal('activity');
  };

  const handleOpenEditModal = (act) => {
    setEditingActivity(act);
    setActivityForm({
      title: act.title,
      date: act.date,
      startTime: act.startTime,
      endTime: act.endTime,
      categoryIds: [...act.categoryIds],
      notes: act.notes || ''
    });
    setActiveModal('activity');
  };

  const handleSaveActivity = (e) => {
    e.preventDefault();
    if (!activityForm.title.trim()) {
      showToast('Please enter an activity title', 'error');
      return;
    }
    if (timeToMinutes(activityForm.endTime) <= timeToMinutes(activityForm.startTime)) {
      showToast('End time must be after start time', 'error');
      return;
    }

    if (editingActivity) {
      setActivities(prev => prev.map(a => a.id === editingActivity.id ? {
        ...a,
        title: activityForm.title,
        date: activityForm.date,
        startTime: activityForm.startTime,
        endTime: activityForm.endTime,
        categoryIds: activityForm.categoryIds,
        notes: activityForm.notes
      } : a));
      showToast('Activity updated successfully!', 'success');
    } else {
      const newAct = {
        id: 'act-' + Date.now(),
        title: activityForm.title,
        date: activityForm.date,
        startTime: activityForm.startTime,
        endTime: activityForm.endTime,
        categoryIds: activityForm.categoryIds,
        notes: activityForm.notes
      };
      setActivities(prev => [...prev, newAct]);
      showToast('Activity created successfully!', 'success');
    }
    setActiveModal(null);
  };

  const handleDeleteSingleActivity = (id) => {
    setActivities(prev => prev.filter(a => a.id !== id));
    showToast('Activity removed', 'info');
  };

  const toggleSelectActivity = (id) => {
    setSelectedActivityIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedActivityIds(filteredActivities.map(a => a.id));
  };

  const handleDeselectAll = () => {
    setSelectedActivityIds([]);
  };

  const handleConfirmBatchDelete = () => {
    setActivities(prev => prev.filter(a => !selectedActivityIds.includes(a.id)));
    showToast(`Deleted ${selectedActivityIds.length} activities`, 'success');
    setSelectedActivityIds([]);
    setActiveModal(null);
  };

  const handleGenerateShareLink = () => {
    const encoded = encodeScheduleToURL(scheduleMeta, categories, activities);
    if (encoded) {
      const fullUrl = `${window.location.origin}${window.location.pathname}#share=${encoded}`;
      setGeneratedShareUrl(fullUrl);
      setActiveModal('share');
    } else {
      showToast('Failed to encode schedule data', 'error');
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(generatedShareUrl);
    showToast('Shareable link copied to clipboard!', 'success');
  };

  const handleImportSharedToWorkspace = () => {
    setIsViewingSharedUrl(false);
    window.location.hash = '';
    localStorage.setItem('ymsat_schedule_meta', JSON.stringify(scheduleMeta));
    localStorage.setItem('ymsat_categories', JSON.stringify(categories));
    localStorage.setItem('ymsat_activities', JSON.stringify(activities));
    showToast('Shared schedule saved to your local workspace!', 'success');
  };

  const handleResetToDefaults = () => {
    setScheduleMeta(DEFAULT_SCHEDULE_META);
    setCategories(DEFAULT_CATEGORIES);
    setActivities(DEFAULT_ACTIVITIES);
    setIsViewingSharedUrl(false);
    window.location.hash = '';
    localStorage.removeItem('ymsat_schedule_meta');
    localStorage.removeItem('ymsat_categories');
    localStorage.removeItem('ymsat_activities');
    showToast('Reset schedule to original YMSAT defaults!', 'info');
  };

  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#86efac');

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newCat = {
      id: 'cat-' + Date.now(),
      name: newCatName.trim(),
      color: newCatColor
    };
    setCategories(prev => [...prev, newCat]);
    setNewCatName('');
    showToast('Tag created!', 'success');
  };

  const handleDeleteCategory = (id) => {
    if (categories.length <= 1) {
      showToast('At least one tag must remain', 'error');
      return;
    }
    setCategories(prev => prev.filter(c => c.id !== id));
    setActivities(prev => prev.map(a => ({
      ...a,
      categoryIds: a.categoryIds.filter(cid => cid !== id)
    })));
    showToast('Tag removed', 'info');
  };

  const analyticsData = useMemo(() => {
    let totalMins = 0;
    const catMins = {};
    categories.forEach(c => { catMins[c.id] = 0; });

    activities.forEach(act => {
      const dur = Math.max(0, timeToMinutes(act.endTime) - timeToMinutes(act.startTime));
      totalMins += dur;

      if (act.categoryIds && act.categoryIds.length > 0) {
        const share = dur / act.categoryIds.length;
        act.categoryIds.forEach(cid => {
          if (catMins[cid] !== undefined) {
            catMins[cid] += share;
          }
        });
      }
    });

    return {
      totalHours: (totalMins / 60).toFixed(1),
      totalActivities: activities.length,
      categoryBreakdown: categories.map(c => ({
        ...c,
        hours: (catMins[c.id] / 60).toFixed(1),
        percentage: totalMins > 0 ? Math.round((catMins[c.id] / totalMins) * 100) : 0
      }))
    };
  }, [activities, categories]);

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      meta: scheduleMeta,
      categories,
      activities
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${scheduleMeta.title.replace(/\s+/g, '_')}_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported backup JSON file!', 'success');
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.meta) setScheduleMeta(parsed.meta);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.activities) setActivities(parsed.activities);
        showToast('Schedule imported successfully from backup JSON!', 'success');
        setActiveModal(null);
      } catch (err) {
        showToast('Invalid JSON file format', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'} transition-colors duration-200 font-sans pb-12`}>
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-xl text-white font-medium text-sm transition-all animate-bounce ${
          toastMessage.type === 'error' ? 'bg-red-600' : toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-blue-600'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Method 2 Shared Link Notification Banner */}
      {isViewingSharedUrl && (
        <div className="bg-amber-400 text-slate-900 px-4 py-2.5 text-sm font-semibold flex flex-wrap items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <Eye size={18} className="animate-pulse" />
            <span>Viewing Shared Schedule Link: <strong>"{scheduleMeta.title}"</strong></span>
          </div>
          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <button
              onClick={handleImportSharedToWorkspace}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded-md text-xs transition flex items-center space-x-1"
            >
              <Download size={14} />
              <span>Save to My Workspace</span>
            </button>
            <button
              onClick={() => {
                setIsViewingSharedUrl(false);
                window.location.hash = '';
              }}
              className="bg-amber-600 hover:bg-amber-700 text-slate-900 px-3 py-1 rounded-md text-xs transition"
            >
              Exit Shared View
            </button>
          </div>
        </div>
      )}

      {/* Main Header & Navbar */}
      <header className={`border-b ${darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white/90'} backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5 shadow-xs`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Schedule Title */}
          <div className="flex items-center justify-between md:justify-start space-x-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-md shadow-blue-500/20">
                <Calendar size={22} />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">{scheduleMeta.title}</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {scheduleMeta.startDate} to {scheduleMeta.endDate}
                </p>
              </div>
            </div>
          </div>

          {/* Search Filter & Control Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input */}
            <div className="relative flex-1 sm:w-48 md:w-56">
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
              />
              <Filter size={14} className="absolute left-2.5 top-2 text-slate-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <button
              onClick={() => handleOpenAddModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-xs transition"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Add Activity</span>
            </button>

            <button
              onClick={handleGenerateShareLink}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition ${
                darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
              title="Method 2: Share via URL Link"
            >
              <Share2 size={15} className="text-amber-500" />
              <span>Share Link</span>
            </button>

            <button
              onClick={() => setActiveModal('categories')}
              className={`p-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1 transition ${
                darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
              }`}
              title="Manage Grade Tags"
            >
              <Tag size={16} className="text-emerald-500" />
              <span className="hidden lg:inline">Tags</span>
            </button>

            <button
              onClick={() => setActiveModal('analytics')}
              className={`p-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1 transition ${
                darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
              }`}
              title="Time Analytics"
            >
              <BarChart2 size={16} className="text-purple-500" />
              <span className="hidden lg:inline">Stats</span>
            </button>

            <button
              onClick={() => setActiveModal('settings')}
              className={`p-1.5 rounded-lg border text-xs font-medium transition ${
                darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
              }`}
              title="Settings & JSON Import/Export"
            >
              <Settings size={16} className="text-slate-500" />
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-1.5 rounded-lg border text-xs font-medium transition ${
                darkMode ? 'border-slate-700 hover:bg-slate-800 text-amber-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title="Toggle Light/Dark Mode"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

        </div>
      </header>

      {/* Sub-Header: Grade Tag Legend & Selection Mode Toggle */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Category Legend Pill Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center">
            <Layers size={13} className="mr-1" /> Grade Tags:
          </span>
          {categories.map(cat => (
            <span
              key={cat.id}
              className="inline-flex items-center space-x-1 text-xs px-2.5 py-0.5 rounded-full font-bold shadow-2xs border border-black/10 text-slate-900"
              style={{ backgroundColor: cat.color }}
            >
              <span>{cat.name}</span>
            </span>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetToDefaults}
            className="text-xs text-slate-400 hover:text-slate-600 underline px-2 py-1"
          >
            Reset Defaults
          </button>
          
          <button
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedActivityIds([]);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition ${
              selectionMode 
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs' 
                : darkMode 
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' 
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {selectionMode ? <CheckSquare size={14} /> : <Square size={14} />}
            <span>{selectionMode ? 'Selection Active' : 'Batch Selection'}</span>
          </button>
        </div>

      </div>

      {/* Floating Action Bar for Batch Selection Mode */}
      {selectionMode && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900 border border-slate-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-4 text-xs font-medium animate-fade-in">
          <span>
            <strong className="text-blue-400">{selectedActivityIds.length}</strong> items selected
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <button
            onClick={handleSelectAll}
            className="text-slate-300 hover:text-white transition"
          >
            Select All ({filteredActivities.length})
          </button>
          <button
            onClick={handleDeselectAll}
            className="text-slate-400 hover:text-white transition"
          >
            Clear
          </button>
          <div className="h-4 w-px bg-slate-700" />
          <button
            disabled={selectedActivityIds.length === 0}
            onClick={() => setActiveModal('batchDelete')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1 transition ${
              selectedActivityIds.length > 0
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Trash2 size={14} />
            <span>Delete Selected</span>
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 lg:px-8 mt-2">
        <div className={`rounded-2xl border shadow-xs overflow-x-auto ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <div className="min-w-[800px]">
            
            {/* Grid Days Header Row */}
            <div className={`grid grid-cols-9 border-b text-xs font-semibold ${darkMode ? 'border-slate-800 bg-slate-800/50 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              
              {/* Time axis header */}
              <div className="p-3 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center space-x-1 text-slate-400">
                <Clock size={14} />
                <span>TIME</span>
              </div>

              {/* Day Columns Headers */}
              {dateColumns.map((dateStr) => {
                const dateObj = new Date(dateStr + 'T00:00:00');
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const dayActivitiesCount = activities.filter(a => a.date === dateStr).length;

                return (
                  <div
                    key={dateStr}
                    onClick={() => {
                      setSelectedDayForView(dateStr);
                      setActiveModal('dayView');
                    }}
                    className={`p-2.5 border-r last:border-r-0 border-slate-200 dark:border-slate-800 text-center cursor-pointer transition hover:bg-blue-50 dark:hover:bg-blue-950/30 group`}
                    title="Click for Expanded Single Day View"
                  >
                    <div className="text-slate-400 text-[10px] uppercase tracking-wider">{dayName}</div>
                    <div className="font-bold text-xs sm:text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-center space-x-1">
                      <span>{dayNum}</span>
                      <Maximize2 size={10} className="opacity-0 group-hover:opacity-100 transition text-blue-500" />
                    </div>
                    {dayActivitiesCount > 0 && (
                      <span className="inline-block mt-1 text-[10px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full font-normal">
                        {dayActivitiesCount} item{dayActivitiesCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time Grid Matrix Body */}
            <div className="relative grid grid-cols-9 divide-x divide-slate-200 dark:divide-slate-800 min-h-[500px]">
              
              {/* Left Column: Hourly Markers */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-400 text-[11px] text-right pr-2">
                {timeSlots.map((timeStr) => (
                  <div key={timeStr} className="h-16 pt-1 font-mono">
                    {formatDisplayTime(timeStr)}
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {dateColumns.map((dateStr) => {
                const dayActs = filteredActivities.filter(a => a.date === dateStr);

                return (
                  <div key={dateStr} className="relative divide-y divide-slate-100 dark:divide-slate-800/40">
                    
                    {/* Background Hour Slot Lines */}
                    {timeSlots.map((timeStr) => (
                      <div
                        key={timeStr}
                        onClick={() => {
                          setActivityForm({
                            title: '',
                            date: dateStr,
                            startTime: timeStr,
                            endTime: minutesToTime(timeToMinutes(timeStr) + 60),
                            categoryIds: categories.map(c => c.id),
                            notes: ''
                          });
                          setActiveModal('activity');
                        }}
                        className="h-16 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition cursor-pointer"
                        title={`Click to add activity at ${formatDisplayTime(timeStr)}`}
                      />
                    ))}

                    {/* Positioned Activity Cards */}
                    {dayActs.map((act) => {
                      const actStartMins = timeToMinutes(act.startTime);
                      const actEndMins = timeToMinutes(act.endTime);

                      const topPercent = Math.max(0, ((actStartMins - gridStartMins) / totalGridMins) * 100);
                      const durationMins = Math.max(15, actEndMins - actStartMins);
                      const heightPercent = (durationMins / totalGridMins) * 100;

                      const isSelected = selectedActivityIds.includes(act.id);
                      const categoryStyle = getCategoryStyle(act.categoryIds, categories);

                      return (
                        <div
                          key={act.id}
                          style={{
                            top: `${topPercent}%`,
                            height: `${heightPercent}%`,
                            position: 'absolute',
                            left: '3px',
                            right: '3px',
                            ...categoryStyle
                          }}
                          className={`rounded-xl p-2 text-xs shadow-sm border border-slate-900/10 overflow-hidden transition-all duration-150 flex flex-col justify-between group hover:z-20 hover:scale-[1.02] ${
                            isSelected ? 'ring-2 ring-blue-600 ring-offset-1' : ''
                          }`}
                        >
                          {/* Card Top */}
                          <div className="flex items-start justify-between gap-1">
                            
                            <div className="flex items-center space-x-1 overflow-hidden">
                              {selectionMode && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectActivity(act.id);
                                  }}
                                  className="text-slate-900 hover:text-blue-700"
                                >
                                  {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                </button>
                              )}
                              <span className="font-bold truncate text-slate-900">
                                {act.title}
                              </span>
                            </div>

                            {!selectionMode && (
                              <div className="opacity-0 group-hover:opacity-100 transition flex items-center space-x-1 bg-white/80 backdrop-blur-xs p-0.5 rounded-md shadow-xs">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(act);
                                  }}
                                  className="p-0.5 text-slate-700 hover:text-blue-600"
                                  title="Edit"
                                >
                                  <Edit3 size={11} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSingleActivity(act.id);
                                  }}
                                  className="p-0.5 text-slate-700 hover:text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Time & Notes Details */}
                          <div className="mt-1 text-[10px] flex items-center justify-between text-slate-900 font-semibold">
                            <span className="font-mono bg-white/60 px-1 py-0.2 rounded text-[9px] border border-black/5">
                              {formatDisplayTime(act.startTime)} - {formatDisplayTime(act.endTime)}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                );
              })}

            </div>

          </div>
        </div>
      </main>

      {activeModal === 'activity' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Calendar size={18} className="text-blue-500" />
                <span>{editingActivity ? 'Edit Activity' : 'Add New Activity'}</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-500">Activity Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Opening Program / Science Quiz Bee"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-500">Date</label>
                <input
                  type="date"
                  required
                  value={activityForm.date}
                  onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-500">Start Time</label>
                  <input
                    type="time"
                    step="300"
                    required
                    value={activityForm.startTime}
                    onChange={(e) => setActivityForm({ ...activityForm, startTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-500">End Time</label>
                  <input
                    type="time"
                    step="300"
                    required
                    value={activityForm.endTime}
                    onChange={(e) => setActivityForm({ ...activityForm, endTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Multi-Tag Selection */}
              <div>
                <label className="block font-semibold mb-1 text-slate-500">
                  Target Grade Tags (Selecting multiple creates Striped Patterns)
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {categories.map(cat => {
                    const isSelected = activityForm.categoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setActivityForm(prev => {
                            const exists = prev.categoryIds.includes(cat.id);
                            return {
                              ...prev,
                              categoryIds: exists
                                ? prev.categoryIds.filter(id => id !== cat.id)
                                : [...prev.categoryIds, cat.id]
                            };
                          });
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center space-x-1 transition ${
                          isSelected
                            ? 'ring-2 ring-blue-600 text-slate-900 border-slate-900/30 shadow-xs'
                            : 'opacity-40 text-slate-600'
                        }`}
                        style={{ backgroundColor: cat.color }}
                      >
                        {isSelected && <Check size={12} className="text-slate-900" />}
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-500">Notes / Program Details</label>
                <textarea
                  rows={3}
                  placeholder="Additional context or location details..."
                  value={activityForm.notes}
                  onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition"
                >
                  {editingActivity ? 'Save Changes' : 'Create Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'share' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Share2 size={18} className="text-amber-500" />
                <span>Shareable View Link (Method 2)</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              This link encodes your entire schedule data directly into the URL string. Computer 2 can open this link to view your exact schedule <strong>without needing any database setup</strong>!
            </p>

            <div className="space-y-3 text-xs">
              <div className="relative">
                <textarea
                  readOnly
                  rows={4}
                  value={generatedShareUrl}
                  className={`w-full p-3 rounded-lg border font-mono text-[11px] select-all break-all ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Send this link via Email, Messaging apps, or Slack!
                </span>
                <button
                  onClick={handleCopyShareLink}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold flex items-center space-x-1.5 shadow-md transition"
                >
                  <Copy size={14} />
                  <span>Copy Share Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'dayView' && selectedDayForView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400 flex items-center space-x-2">
                  <Calendar size={20} />
                  <span>
                    {new Date(selectedDayForView + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Chronological Day Schedule</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {activities.filter(a => a.date === selectedDayForView).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <Clock size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No activities scheduled for this day yet.</p>
                </div>
              ) : (
                activities
                  .filter(a => a.date === selectedDayForView)
                  .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
                  .map((act) => {
                    const categoryStyle = getCategoryStyle(act.categoryIds, categories);
                    return (
                      <div
                        key={act.id}
                        style={{ ...categoryStyle }}
                        className="rounded-xl p-3 shadow-sm border border-black/10 text-slate-900 transition hover:scale-[1.01]"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-sm">{act.title}</h4>
                            <div className="text-xs font-mono opacity-90 mt-0.5">
                              {formatDisplayTime(act.startTime)} - {formatDisplayTime(act.endTime)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleOpenEditModal(act)}
                              className="p-1 text-slate-800 hover:text-blue-700"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteSingleActivity(act.id)}
                              className="p-1 text-slate-800 hover:text-red-700"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {act.notes && (
                          <div className="mt-2 text-xs opacity-90 bg-white/60 p-2 rounded-lg border border-black/5">
                            {act.notes}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <button
                onClick={() => handleOpenAddModal(selectedDayForView)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center space-x-1 shadow-xs"
              >
                <Plus size={14} />
                <span>Add Activity to this Day</span>
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'categories' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Tag size={18} className="text-emerald-500" />
                <span>Grade Tag & Color Manager</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-4 h-4 rounded-full border border-black/20 shadow-2xs"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-bold">{cat.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-slate-400 hover:text-red-500 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddCategory} className="space-y-3 border-t pt-3 border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-500">Create New Tag</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Faculty / Guests"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className={`flex-1 px-3 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-9 h-8 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                >
                  Add Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'analytics' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <BarChart2 size={18} className="text-purple-500" />
                <span>Time Analytics</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-center">
              <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-purple-50 border-purple-100'}`}>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{analyticsData.totalHours} hrs</div>
                <div className="text-[11px] text-slate-500">Total Scheduled Time</div>
              </div>
              <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-100'}`}>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analyticsData.totalActivities}</div>
                <div className="text-[11px] text-slate-500">Activities Scheduled</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500">Breakdown by Grade Tag</h4>
              {analyticsData.categoryBreakdown.map(cat => (
                <div key={cat.id} className="space-y-1 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span>{cat.name}</span>
                    </span>
                    <span>{cat.hours} hrs ({cat.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Settings size={18} className="text-slate-500" />
                <span>Schedule Settings & Offline Backup</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setActiveModal(null);
                showToast('Settings saved!', 'success');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold mb-1 text-slate-500">Schedule Name</label>
                <input
                  type="text"
                  value={scheduleMeta.title}
                  onChange={(e) => setScheduleMeta({ ...scheduleMeta, title: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-500">Start Date</label>
                  <input
                    type="date"
                    value={scheduleMeta.startDate}
                    onChange={(e) => setScheduleMeta({ ...scheduleMeta, startDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-500">End Date</label>
                  <input
                    type="date"
                    value={scheduleMeta.endDate}
                    onChange={(e) => setScheduleMeta({ ...scheduleMeta, endDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* JSON Backup & File Import Section */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block font-semibold text-slate-500">File Backup & Import (.json)</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center space-x-1 font-semibold"
                  >
                    <Download size={14} />
                    <span>Export JSON</span>
                  </button>
                  <label className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center space-x-1 font-semibold cursor-pointer">
                    <Upload size={14} />
                    <span>Import JSON</span>
                    <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'batchDelete' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-6 text-center ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-bold text-base mb-1">Confirm Batch Delete</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to delete <strong>{selectedActivityIds.length}</strong> selected activities?
            </p>
            <div className="flex justify-center space-x-2 text-xs">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}