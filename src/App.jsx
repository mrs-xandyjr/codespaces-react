import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar, Clock, Plus, Trash2, Edit3, Share2, Eye, Lock, Unlock,
  Settings, Sun, Moon, Tag, Filter, CheckSquare, Square, Maximize2,
  Download, Upload, X, Check, Copy, ExternalLink, BarChart2,
  AlertCircle, AlertTriangle, Layers, Info, Sparkles, FileText
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
  { id: 'cat-g7', name: 'Grade 7', color: '#86efac' },  // Pastel Green
  { id: 'cat-g8', name: 'Grade 8', color: '#fef08a' },  // Pastel Yellow
  { id: 'cat-g9', name: 'Grade 9', color: '#fca5a5' },  // Pastel Red
  { id: 'cat-g10', name: 'Grade 10', color: '#93c5fd' },// Pastel Blue
  { id: 'cat-g11', name: 'Grade 11', color: '#fbcfe8' },// Pastel Pink
  { id: 'cat-g12', name: 'Grade 12', color: '#fed7aa' } // Pastel Orange
];

const DEFAULT_SCHEDULE_META = {
  title: 'YMSAT Schedule',
  startDate: '2027-01-20',
  endDate: '2027-01-27',
  startTime: '07:00',
  endTime: '17:00'
};

const DEFAULT_ACTIVITIES = [
  {
    id: 'act-opening-1',
    title: 'Opening Program',
    date: '2027-01-20',
    startTime: '07:30',
    endTime: '08:30',
    categoryIds: ['cat-g7', 'cat-g8', 'cat-g9', 'cat-g10', 'cat-g11', 'cat-g12'],
    notes: 'Joint Opening Ceremony for YMSAT Week 2027. Mandatory attendance for all year levels in the Gymnasium.'
  }
];

const encodeScheduleData = (meta, categories, activities) => {
  try {
    const payload = { meta, cats: categories, acts: activities, v: 2 };
    const jsonStr = JSON.stringify(payload);
    return btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode('0x' + p1);
    }));
  } catch (err) {
    console.error('Failed to encode schedule:', err);
    return null;
  }
};

const decodeScheduleData = (encodedStr) => {
  try {
    const jsonStr = decodeURIComponent(Array.prototype.map.call(atob(encodedStr), (c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Failed to decode schedule:', err);
    return null;
  }
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
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

// Generates repeating diagonal striped background for multi-tag activity cards
const getCategoryStyle = (categoryIds, categories) => {
  if (!categoryIds || categoryIds.length === 0) {
    return { backgroundColor: '#cbd5e1', color: '#0f172a' };
  }

  const matchedColors = categoryIds
    .map(id => categories.find(c => c.id === id)?.color)
    .filter(Boolean);

  if (matchedColors.length === 0) {
    return { backgroundColor: '#cbd5e1', color: '#0f172a' };
  }

  if (matchedColors.length === 1) {
    return {
      backgroundColor: matchedColors[0],
      color: '#0f172a'
    };
  }

  const stripeWidth = 18; // px width per color stripe
  const stops = [];
  matchedColors.forEach((color, idx) => {
    stops.push(`${color} ${idx * stripeWidth}px`);
    stops.push(`${color} ${(idx + 1) * stripeWidth}px`);
  });
  const totalWidth = matchedColors.length * stripeWidth;

  return {
    backgroundImage: `repeating-linear-gradient(135deg, ${stops.join(', ')})`,
    backgroundSize: `${totalWidth * 1.414}px ${totalWidth * 1.414}px`,
    color: '#0f172a'
  };
};

export default function App() {
  const [scheduleMeta, setScheduleMeta] = useState(DEFAULT_SCHEDULE_META);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);

  const [isReadOnly, setIsReadOnly] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Batch selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState([]);

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'activity', 'viewActivity', 'categories', 'share', 'analytics', 'dayView', 'batchDelete', 'settings'
  const [editingActivity, setEditingActivity] = useState(null);
  const [viewingActivity, setViewingActivity] = useState(null);
  const [selectedDayForView, setSelectedDayForView] = useState(null);

  // Form inputs state
  const [activityForm, setActivityForm] = useState({
    title: '',
    date: '2027-01-20',
    startTime: '07:30',
    endTime: '08:30',
    categoryIds: [],
    notes: ''
  });

  const [toastMessage, setToastMessage] = useState(null);
  const [shareTab, setShareTab] = useState('readonly'); // 'readonly' | 'editable'
  const [generatedShareUrl, setGeneratedShareUrl] = useState('');

  const showToast = useCallback((text, type = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  useEffect(() => {
    const parseUrlState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;

      let mode = urlParams.get('mode');
      let encodedData = urlParams.get('data');

      if (!encodedData && hash.includes('data=')) {
        const hashParams = new URLSearchParams(hash.replace('#', '?'));
        encodedData = hashParams.get('data');
        if (!mode) mode = hashParams.get('mode');
      }

      const readOnlyMode = mode === 'view' || mode === 'readonly';
      setIsReadOnly(readOnlyMode);

      if (encodedData) {
        const decoded = decodeScheduleData(encodedData);
        if (decoded && decoded.meta && decoded.acts) {
          setScheduleMeta(decoded.meta);
          setCategories(decoded.cats || DEFAULT_CATEGORIES);
          setActivities(decoded.acts || []);
          showToast(
            readOnlyMode
              ? 'Loaded schedule in Read-Only Mode 👁️'
              : 'Loaded editable shared schedule! ✏️',
            'info'
          );
        } else {
          showToast('Could not decode schedule link data.', 'error');
        }
      }
    };

    parseUrlState();
    window.addEventListener('hashchange', parseUrlState);
    return () => window.removeEventListener('hashchange', parseUrlState);
  }, [showToast]);

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
    if (isReadOnly) return;
    setEditingActivity(null);
    setActivityForm({
      title: '',
      date: defaultDate,
      startTime: '08:00',
      endTime: '09:00',
      categoryIds: [categories[0]?.id || 'cat-g7'],
      notes: ''
    });
    setActiveModal('activity');
  };

  const handleOpenEditModal = (act) => {
    if (isReadOnly) {
      setViewingActivity(act);
      setActiveModal('viewActivity');
      return;
    }
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
    if (isReadOnly) return;

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
      showToast('Activity updated!', 'success');
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
      showToast('Activity created!', 'success');
    }
    setActiveModal(null);
  };

  const handleDeleteSingleActivity = (id) => {
    if (isReadOnly) return;
    setActivities(prev => prev.filter(a => a.id !== id));
    showToast('Activity removed', 'info');
  };

  const toggleSelectActivity = (id) => {
    setSelectedActivityIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleConfirmBatchDelete = () => {
    if (isReadOnly) return;
    setActivities(prev => prev.filter(a => !selectedActivityIds.includes(a.id)));
    showToast(`Deleted ${selectedActivityIds.length} activities`, 'success');
    setSelectedActivityIds([]);
    setActiveModal(null);
  };

  const handleOpenShareModal = () => {
    const encoded = encodeScheduleData(scheduleMeta, categories, activities);
    if (!encoded) {
      showToast('Failed to encode schedule data', 'error');
      return;
    }

    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const readOnlyLink = `${baseUrl}?mode=view&data=${encoded}`;
    const editableLink = `${baseUrl}?mode=edit&data=${encoded}`;

    setGeneratedShareUrl(shareTab === 'readonly' ? readOnlyLink : editableLink);
    setActiveModal('share');
  };

  const handleSwitchShareTab = (tab) => {
    setShareTab(tab);
    const encoded = encodeScheduleData(scheduleMeta, categories, activities);
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    setGeneratedShareUrl(tab === 'readonly' ? `${baseUrl}?mode=view&data=${encoded}` : `${baseUrl}?mode=edit&data=${encoded}`);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(generatedShareUrl);
    showToast(shareTab === 'readonly' ? 'Read-Only share link copied!' : 'Editable share link copied!', 'success');
  };

  const handleUnlockEditMode = () => {
    setIsReadOnly(false);
    // Remove mode=view from URL clean without reload
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, document.title, cleanUrl);
    showToast('Switched to Editable Mode! You can now make changes.', 'success');
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

  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#86efac');

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (isReadOnly || !newCatName.trim()) return;
    const newCat = {
      id: 'cat-' + Date.now(),
      name: newCatName.trim(),
      color: newCatColor
    };
    setCategories(prev => [...prev, newCat]);
    setNewCatName('');
    showToast('New tag added!', 'success');
  };

  const handleDeleteCategory = (id) => {
    if (isReadOnly) return;
    if (categories.length <= 1) {
      showToast('At least one tag must remain', 'error');
      return;
    }
    setCategories(prev => prev.filter(c => c.id !== id));
    setActivities(prev => prev.map(a => ({
      ...a,
      categoryIds: a.categoryIds.filter(cid => cid !== id)
    })));
    showToast('Tag deleted', 'info');
  };

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
    showToast('Exported backup JSON!', 'success');
  };

  const handleImportJSON = (e) => {
    if (isReadOnly) return;
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.meta) setScheduleMeta(parsed.meta);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.activities) setActivities(parsed.activities);
        showToast('Schedule imported successfully!', 'success');
        setActiveModal(null);
      } catch (err) {
        showToast('Invalid JSON file', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} transition-colors duration-200 font-sans pb-16`}>
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-xl text-white font-medium text-xs sm:text-sm transition-all animate-bounce ${
          toastMessage.type === 'error' ? 'bg-red-600' : toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-blue-600'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Prominent Read-Only Mode Header Banner */}
      {isReadOnly && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs sm:text-sm font-semibold flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center space-x-2">
            <Eye size={18} className="animate-pulse text-slate-900" />
            <span>
              <strong>👁️ Read-Only Mode</strong> — You are viewing a read-only schedule. Editing features are locked.
            </span>
          </div>
          <button
            onClick={handleUnlockEditMode}
            className="bg-slate-900 hover:bg-slate-800 text-amber-400 px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-sm"
          >
            <Unlock size={14} />
            <span>Make Editable Copy</span>
          </button>
        </div>
      )}

      {/* Top Application Navigation Bar */}
      <header className={`border-b ${darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white/90'} backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5 shadow-xs`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Title & Mode Pill */}
          <div className="flex items-center justify-between md:justify-start space-x-3">
            <div className="flex items-center space-x-2.5">
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 rounded-xl text-white shadow-md shadow-blue-500/20">
                <Calendar size={22} />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight flex items-center space-x-2">
                  <span>{scheduleMeta.title}</span>
                  {isReadOnly ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                      Read-Only
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                      Editable Mode
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {scheduleMeta.startDate} to {scheduleMeta.endDate}
                </p>
              </div>
            </div>
          </div>

          {/* Controls & Tools Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Filter Input */}
            <div className="relative flex-1 sm:w-48 md:w-56">
              <input
                type="text"
                placeholder="Search activities or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-xs pl-8 pr-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
              />
              <Filter size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Add Activity Button (Hidden in Read-Only mode) */}
            {!isReadOnly && (
              <button
                onClick={() => handleOpenAddModal()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add Activity</span>
              </button>
            )}

            {/* Share Link Button */}
            <button
              onClick={handleOpenShareModal}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition ${
                darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-amber-400' : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
              }`}
              title="Share Read-Only or Editable Link"
            >
              <Share2 size={16} className="text-amber-500" />
              <span className="hidden sm:inline">Share Link</span>
            </button>

            {/* Manage Tags Button */}
            <button
              onClick={() => setActiveModal('categories')}
              className={`p-2 rounded-xl border text-xs font-medium transition ${
                darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-100'
              }`}
              title="Grade Tags & Colors"
            >
              <Tag size={16} className="text-emerald-500" />
            </button>

            {/* Analytics Dashboard Button */}
            <button
              onClick={() => setActiveModal('analytics')}
              className={`p-2 rounded-xl border text-xs font-medium transition ${
                darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-100'
              }`}
              title="Time Analytics"
            >
              <BarChart2 size={16} className="text-purple-500" />
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setActiveModal('settings')}
              className={`p-2 rounded-xl border text-xs font-medium transition ${
                darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-100'
              }`}
              title="Schedule Options & Backup"
            >
              <Settings size={16} className="text-slate-500" />
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border text-xs font-medium transition ${
                darkMode ? 'border-slate-700 bg-slate-800 text-amber-400' : 'border-slate-200 bg-white text-slate-600'
              }`}
              title="Toggle Light / Dark Mode"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Grade Category Tag Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center">
            <Layers size={13} className="mr-1" /> Year Levels:
          </span>
          {categories.map(cat => (
            <span
              key={cat.id}
              className="inline-flex items-center space-x-1 text-xs px-2.5 py-0.5 rounded-full font-bold shadow-xs text-slate-900 border border-black/10"
              style={{ backgroundColor: cat.color }}
            >
              <span>{cat.name}</span>
            </span>
          ))}
        </div>

        {/* Batch Selection Toggle (Editable Mode Only) */}
        {!isReadOnly && (
          <button
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedActivityIds([]);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition ${
              selectionMode
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                : darkMode
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {selectionMode ? <CheckSquare size={14} /> : <Square size={14} />}
            <span>{selectionMode ? 'Batch Active' : 'Select & Delete'}</span>
          </button>
        )}

      </div>

      {/* Floating Batch Selection Toolbar */}
      {selectionMode && !isReadOnly && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900 border border-slate-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-4 text-xs font-medium animate-fade-in">
          <span>
            <strong className="text-blue-400">{selectedActivityIds.length}</strong> items selected
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <button
            onClick={() => setSelectedActivityIds(filteredActivities.map(a => a.id))}
            className="text-slate-300 hover:text-white transition"
          >
            Select All ({filteredActivities.length})
          </button>
          <button
            onClick={() => setSelectedActivityIds([])}
            className="text-slate-400 hover:text-white transition"
          >
            Clear
          </button>
          <div className="h-4 w-px bg-slate-700" />
          <button
            disabled={selectedActivityIds.length === 0}
            onClick={() => setActiveModal('batchDelete')}
            className={`px-3 py-1.5 rounded-xl flex items-center space-x-1 transition font-bold ${
              selectedActivityIds.length > 0
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Trash2 size={14} />
            <span>Delete Selected</span>
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 lg:px-8 mt-2">
        <div className={`rounded-2xl border shadow-sm overflow-x-auto ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <div className="min-w-[850px]">
            
            {/* Grid Days Header Row */}
            <div className={`grid grid-cols-8 border-b text-xs font-semibold ${darkMode ? 'border-slate-800 bg-slate-800/50 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              
              {/* Time axis label */}
              <div className="p-3 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center space-x-1 text-slate-400 font-mono">
                <Clock size={14} />
                <span>TIME</span>
              </div>

              {/* Day Column Headers (Clickable for Single Day Modal Pop-up) */}
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
                    className="p-2.5 border-r last:border-r-0 border-slate-200 dark:border-slate-800 text-center cursor-pointer transition hover:bg-blue-50/70 dark:hover:bg-blue-950/40 group"
                    title="Click for Expanded Single Day Pop-up View"
                  >
                    <div className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">{dayName}</div>
                    <div className="font-bold text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-center space-x-1">
                      <span>{dayNum}</span>
                      <Maximize2 size={11} className="opacity-0 group-hover:opacity-100 transition text-blue-500" />
                    </div>
                    {dayActivitiesCount > 0 && (
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full font-bold">
                        {dayActivitiesCount} item{dayActivitiesCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time Grid Canvas */}
            <div className="relative grid grid-cols-8 divide-x divide-slate-200 dark:divide-slate-800 min-h-[520px]">
              
              {/* Left Column: Hourly Markers */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-400 text-[11px] text-right pr-2">
                {timeSlots.map((timeStr) => (
                  <div key={timeStr} className="h-16 pt-1 font-mono">
                    {formatDisplayTime(timeStr)}
                  </div>
                ))}
              </div>

              {/* Day Columns containing Activity Blocks */}
              {dateColumns.map((dateStr) => {
                const dayActs = filteredActivities.filter(a => a.date === dateStr);

                return (
                  <div key={dateStr} className="relative divide-y divide-slate-100 dark:divide-slate-800/40">
                    
                    {/* Background hour grid slots */}
                    {timeSlots.map((timeStr) => (
                      <div
                        key={timeStr}
                        onClick={() => {
                          if (!isReadOnly) {
                            setActivityForm({
                              title: '',
                              date: dateStr,
                              startTime: timeStr,
                              endTime: minutesToTime(timeToMinutes(timeStr) + 60),
                              categoryIds: [categories[0]?.id || 'cat-g7'],
                              notes: ''
                            });
                            setActiveModal('activity');
                          }
                        }}
                        className={`h-16 transition ${
                          isReadOnly ? 'cursor-default' : 'hover:bg-blue-50/30 dark:hover:bg-slate-800/30 cursor-pointer'
                        }`}
                        title={isReadOnly ? 'Read-Only Mode' : `Click to add activity at ${formatDisplayTime(timeStr)}`}
                      />
                    ))}

                    {/* Positioned Activity Cards */}
                    {dayActs.map((act) => {
                      const actStartMins = timeToMinutes(act.startTime);
                      const actEndMins = timeToMinutes(act.endTime);

                      const topPercent = Math.max(0, ((actStartMins - gridStartMins) / totalGridMins) * 100);
                      const durationMins = Math.max(20, actEndMins - actStartMins);
                      const heightPercent = (durationMins / totalGridMins) * 100;

                      const isSelected = selectedActivityIds.includes(act.id);
                      const categoryStyle = getCategoryStyle(act.categoryIds, categories);

                      return (
                        <div
                          key={act.id}
                          onClick={() => handleOpenEditModal(act)}
                          style={{
                            top: `${topPercent}%`,
                            height: `${heightPercent}%`,
                            position: 'absolute',
                            left: '3px',
                            right: '3px',
                            ...categoryStyle
                          }}
                          className={`rounded-xl p-2 shadow-md border border-slate-900/10 overflow-hidden cursor-pointer transition-all duration-150 flex flex-col justify-between group hover:z-20 hover:scale-[1.02] ${
                            isSelected ? 'ring-2 ring-amber-500 ring-offset-1' : ''
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center space-x-1 overflow-hidden">
                              {selectionMode && !isReadOnly && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectActivity(act.id);
                                  }}
                                  className="text-slate-900 hover:text-amber-700"
                                >
                                  {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                </button>
                              )}
                              <span className="font-extrabold text-xs text-slate-900 truncate drop-shadow-xs">
                                {act.title}
                              </span>
                            </div>

                            {/* Quick Edit/Delete Buttons (Hidden in Read-Only Mode) */}
                            {!isReadOnly && !selectionMode && (
                              <div className="opacity-0 group-hover:opacity-100 transition flex items-center space-x-1 bg-slate-900/80 p-0.5 rounded-md text-white">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(act);
                                  }}
                                  className="p-0.5 hover:text-blue-300"
                                  title="Edit"
                                >
                                  <Edit3 size={11} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSingleActivity(act.id);
                                  }}
                                  className="p-0.5 hover:text-red-300"
                                  title="Delete"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Time Badge */}
                          <div className="mt-1 text-[10px] font-bold text-slate-900 flex items-center justify-between">
                            <span className="bg-white/80 dark:bg-slate-900/80 dark:text-slate-100 px-1.5 py-0.2 rounded font-mono text-[9px] shadow-xs">
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


      {/* MODAL 1: Add/Edit Activity Modal */}
      {activeModal === 'activity' && !isReadOnly && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
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
                  placeholder="e.g. Opening Ceremony / Math Fair"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
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
                  className={`w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-500">Start Time</label>
                  <input
                    type="time"
                    required
                    value={activityForm.startTime}
                    onChange={(e) => setActivityForm({ ...activityForm, startTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-500">End Time</label>
                  <input
                    type="time"
                    required
                    value={activityForm.endTime}
                    onChange={(e) => setActivityForm({ ...activityForm, endTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Grade Category Tags Picker */}
              <div>
                <label className="block font-semibold mb-1 text-slate-500">
                  Grade Tags (Select multiple to generate striped diagonal pattern)
                </label>
                <div className="flex flex-wrap gap-1.5 mt-1">
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
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition flex items-center space-x-1 text-slate-900 ${
                          isSelected
                            ? 'ring-2 ring-blue-600 scale-105 shadow-sm'
                            : 'opacity-50 grayscale hover:grayscale-0'
                        }`}
                        style={{ backgroundColor: cat.color }}
                      >
                        {isSelected && <Check size={12} />}
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-500">Notes / Description</label>
                <textarea
                  rows={3}
                  placeholder="Venue, instructions, or details..."
                  value={activityForm.notes}
                  onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md"
                >
                  {editingActivity ? 'Save Changes' : 'Create Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Read-Only View Activity Detail Modal */}
      {activeModal === 'viewActivity' && viewingActivity && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
                <Eye size={16} />
                <span>Read-Only Activity Details</span>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">{viewingActivity.title}</h3>
                <div className="flex items-center space-x-2 text-slate-500 mt-1 font-mono">
                  <Clock size={14} />
                  <span>{viewingActivity.date} | {formatDisplayTime(viewingActivity.startTime)} - {formatDisplayTime(viewingActivity.endTime)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-400">Target Year Levels</label>
                <div className="flex flex-wrap gap-1.5">
                  {viewingActivity.categoryIds.map(cid => {
                    const cat = categories.find(c => c.id === cid);
                    if (!cat) return null;
                    return (
                      <span
                        key={cat.id}
                        className="px-2.5 py-0.5 rounded-full font-bold text-slate-900 shadow-xs"
                        style={{ backgroundColor: cat.color }}
                      >
                        {cat.name}
                      </span>
                    );
                  })}
                </div>
              </div>

              {viewingActivity.notes && (
                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Notes & Information</label>
                  <p className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    {viewingActivity.notes}
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Expanded Single Day Pop-up View */}
      {activeModal === 'dayView' && selectedDayForView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-lg text-blue-600 dark:text-blue-400 flex items-center space-x-2">
                  <Calendar size={20} />
                  <span>
                    {new Date(selectedDayForView + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Expanded Single Day Agenda Pop-up View</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {activities.filter(a => a.date === selectedDayForView).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <Clock size={32} className="mx-auto mb-2 opacity-40" />
                  <p>No activities scheduled for this day.</p>
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
                        className="rounded-2xl p-3.5 shadow-md border border-slate-900/10 text-slate-900 transition hover:scale-[1.01]"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-extrabold text-sm">{act.title}</h4>
                            <div className="text-xs font-mono font-bold mt-0.5 opacity-90">
                              {formatDisplayTime(act.startTime)} - {formatDisplayTime(act.endTime)}
                            </div>
                          </div>
                          {!isReadOnly && (
                            <div className="flex items-center space-x-1 bg-white/80 rounded-lg p-1">
                              <button
                                onClick={() => handleOpenEditModal(act)}
                                className="p-1 text-slate-700 hover:text-blue-600"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteSingleActivity(act.id)}
                                className="p-1 text-slate-700 hover:text-red-600"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Tag Badges */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {act.categoryIds.map(cid => {
                            const cat = categories.find(c => c.id === cid);
                            if (!cat) return null;
                            return (
                              <span
                                key={cat.id}
                                className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-900/80 text-white shadow-2xs"
                              >
                                {cat.name}
                              </span>
                            );
                          })}
                        </div>

                        {act.notes && (
                          <div className="mt-2 text-xs bg-white/70 p-2.5 rounded-xl border border-black/5 font-medium">
                            {act.notes}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              {!isReadOnly && (
                <button
                  onClick={() => handleOpenAddModal(selectedDayForView)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1 shadow-md"
                >
                  <Plus size={14} />
                  <span>Add Activity to this Day</span>
                </button>
              )}
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold ml-auto"
              >
                Close Day View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Share Link Modal (Read-Only vs Editable Link) */}
      {activeModal === 'share' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Share2 size={18} className="text-amber-500" />
                <span>Share Schedule Link (URL Data Encoded)</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Read-Only vs Editable Link Selector Tabs */}
            <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 mb-4 text-xs font-bold">
              <button
                onClick={() => handleSwitchShareTab('readonly')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                  shareTab === 'readonly'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Eye size={14} />
                <span>1. Read-Only Link (Viewers Locked)</span>
              </button>
              <button
                onClick={() => handleSwitchShareTab('editable')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                  shareTab === 'editable'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Edit3 size={14} />
                <span>2. Editable Copy Link</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              {shareTab === 'readonly'
                ? 'This link locks the schedule in Read-Only Mode. Viewers can see all activities and details but cannot edit or delete schedule elements.'
                : 'This link passes an editable copy of your schedule data. Anyone opening it can make their own edits and additions.'}
            </p>

            <div className="space-y-3 text-xs">
              <textarea
                readOnly
                rows={4}
                value={generatedShareUrl}
                className={`w-full p-3 rounded-xl border font-mono text-[11px] select-all break-all ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400 font-medium">
                  Works instantly without database setup!
                </span>
                <button
                  onClick={handleCopyShareLink}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold flex items-center space-x-1.5 shadow-md transition"
                >
                  <Copy size={14} />
                  <span>Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Tag & Year Level Manager */}
      {activeModal === 'categories' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Tag size={18} className="text-emerald-500" />
                <span>Grade Level Tags & Colors</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-bold">{cat.name}</span>
                  </div>
                  {!isReadOnly && (
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-slate-400 hover:text-red-500 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {!isReadOnly && (
              <form onSubmit={handleAddCategory} className="space-y-3 border-t pt-3 border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-500">Create New Grade / Subject Tag</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    required
                    placeholder="Tag Name"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className={`flex-1 px-3 py-1.5 rounded-xl border text-xs focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-9 h-8 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 6: Time Analytics Dashboard */}
      {activeModal === 'analytics' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
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
              <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-purple-50 border-purple-100'}`}>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{analyticsData.totalHours} hrs</div>
                <div className="text-[11px] font-semibold text-slate-500">Scheduled Time</div>
              </div>
              <div className={`p-3 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-100'}`}>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{analyticsData.totalActivities}</div>
                <div className="text-[11px] font-semibold text-slate-500">Total Activities</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400">Breakdown by Grade / Tag</h4>
              {analyticsData.categoryBreakdown.map(cat => (
                <div key={cat.id} className="space-y-1 text-xs">
                  <div className="flex justify-between font-bold">
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

      {/* MODAL 7: Schedule Settings & JSON Backup */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Settings size={18} className="text-slate-500" />
                <span>Schedule Options & Backup</span>
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
                  disabled={isReadOnly}
                  value={scheduleMeta.title}
                  onChange={(e) => setScheduleMeta({ ...scheduleMeta, title: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-500">Start Date</label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    value={scheduleMeta.startDate}
                    onChange={(e) => setScheduleMeta({ ...scheduleMeta, startDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-500">End Date</label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    value={scheduleMeta.endDate}
                    onChange={(e) => setScheduleMeta({ ...scheduleMeta, endDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Offline Backup Options */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block font-semibold text-slate-500">JSON File Backup</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center justify-center space-x-1"
                  >
                    <Download size={14} />
                    <span>Export JSON</span>
                  </button>
                  {!isReadOnly && (
                    <label className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center justify-center space-x-1 cursor-pointer">
                      <Upload size={14} />
                      <span>Import JSON</span>
                      <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: Batch Delete Confirmation */}
      {activeModal === 'batchDelete' && !isReadOnly && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-6 text-center ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-bold text-base mb-1">Confirm Batch Delete</h3>
            <p className="text-xs text-slate-500 mb-4">
              Delete <strong>{selectedActivityIds.length}</strong> selected activities? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-2 text-xs">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md"
              >
                Delete Items
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}