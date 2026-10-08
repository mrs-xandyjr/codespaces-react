import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import {
  Calendar, Clock, Plus, Trash2, Edit3, Share2, Cloud, CloudOff, Settings,
  Sun, Moon, Tag, Filter, CheckSquare, Square, Maximize2, Download, Upload,
  X, Check, Copy, ExternalLink, BarChart2, RefreshCw, AlertCircle, Eye, Save,
  Grid, ChevronLeft, ChevronRight, CheckCircle2, Layers, AlertTriangle, FileText
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
  { id: 'cat-g7', name: 'Grade 7', color: '#3B82F6' },       // Blue
  { id: 'cat-g8', name: 'Grade 8', color: '#10B981' },    // Green
  { id: 'cat-g9', name: 'Grade 9', color: '#F59E0B' },     // Amber
  { id: 'cat-g10', name: 'Grade 10', color: '#8B5CF6' },   // Purple
  { id: 'cat-syp', name: 'SYP', color: '#EC4899' }      // Pink
];

const DEFAULT_SCHEDULE_META = {
  title: 'YMSAT 2027 Schedule',
  startDate: '2027-01-20',
  endDate: '2027-01-27',
  startTime: '06:00',
  endTime: '18:00'
};

const DEFAULT_ACTIVITIES = [
  {
    id: 'act-1',
    title: 'YMSAT Preps',
    date: '2027-01-20',
    startTime: '13:30',
    endTime: '16:30',
    categoryIds: ['cat-g7', 'cat-g8', 'cat-g9', 'cat-g10'],
    notes: 'Not required.'
  },
];

// Method 2: Encoding schedule into URL safe string
const encodeScheduleToURL = (scheduleMeta, categories, activities) => {
  try {
    const payload = {
      meta: scheduleMeta,
      cats: categories,
      acts: activities,
      v: 1
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
    return { background: '#6B7280', color: '#FFFFFF' };
  }

  const matchedColors = categoryIds
    .map(id => categories.find(c => c.id === id)?.color)
    .filter(Boolean);

  if (matchedColors.length === 0) {
    return { background: '#6B7280', color: '#FFFFFF' };
  }

  if (matchedColors.length === 1) {
    return {
      background: matchedColors[0],
      color: '#FFFFFF'
    };
  }

  // Multi-tag striped gradient generator using repeating linear gradient
  const stripeWidth = 24; // px per color stripe
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
    color: '#FFFFFF'
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
  // --- Core Schedule States ---
  const [scheduleMeta, setScheduleMeta] = useState(DEFAULT_SCHEDULE_META);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);

  // --- Theme State ---
  const [darkMode, setDarkMode] = useState(false);

  // --- Shared Link (Method 2) State ---
  const [isViewingSharedUrl, setIsViewingSharedUrl] = useState(false);
  const [sharedSourceData, setSharedSourceData] = useState(null);

  // --- Cloud Sync (Method 3) Firebase Config & Sync State ---
  const [userFirebaseConfig, setUserFirebaseConfig] = useState(() => {
    try {
      if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        return typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
      }
      const savedConfig = localStorage.getItem('flexi_firebase_config');
      return savedConfig ? JSON.parse(savedConfig) : null;
    } catch (e) {
      return null;
    }
  });

  const [cloudSyncStatus, setCloudSyncStatus] = useState('local'); // 'connected', 'syncing', 'error', 'local'
  const [cloudUserId, setCloudUserId] = useState(null);
  const [firebaseInstances, setFirebaseInstances] = useState(null);

  // --- UI Interactive States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState([]);
  
  // --- Active Modals ---
  const [activeModal, setActiveModal] = useState(null); // 'activity', 'categories', 'share', 'cloud', 'analytics', 'dayView', 'batchDelete', 'settings', 'import'
  const [editingActivity, setEditingActivity] = useState(null);
  const [selectedDayForView, setSelectedDayForView] = useState(null);

  // --- Form Input States ---
  const [activityForm, setActivityForm] = useState({
    title: '',
    date: '2026-01-20',
    startTime: '09:00',
    endTime: '10:00',
    categoryIds: [],
    notes: ''
  });

  const [firebaseConfigText, setFirebaseConfigText] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text, type = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  useEffect(() => {
    const checkUrlHash = () => {
      const hash = window.location.hash;
      if (hash && hash.includes('share=')) {
        const encodedData = hash.split('share=')[1];
        const decoded = decodeScheduleFromURL(encodedData);
        if (decoded && decoded.meta && decoded.acts) {
          setIsViewingSharedUrl(true);
          setSharedSourceData(decoded);
          setScheduleMeta(decoded.meta);
          setCategories(decoded.cats || DEFAULT_CATEGORIES);
          setActivities(decoded.acts || []);
          showToast('Loaded shared schedule from link!', 'success');
        } else {
          showToast('Invalid shared link data.', 'error');
        }
      }
    };

    checkUrlHash();
    window.addEventListener('hashchange', checkUrlHash);
    return () => window.removeEventListener('hashchange', checkUrlHash);
  }, []);

  useEffect(() => {
    if (!userFirebaseConfig || !userFirebaseConfig.apiKey) {
      setCloudSyncStatus('local');
      return;
    }

    try {
      setCloudSyncStatus('syncing');
      const existingApps = getApps();
      const app = existingApps.length > 0 ? existingApps[0] : initializeApp(userFirebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);

      setFirebaseInstances({ app, auth, db });

      // Authenticate
      const handleAuth = async () => {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      };

      handleAuth().catch(err => console.warn('Firebase Auth warning:', err));

      const unsubAuth = onAuthStateChanged(auth, (usr) => {
        if (usr) {
          setCloudUserId(usr.uid);
          
          // Setup real-time listener for schedule doc
          const appId = typeof __app_id !== 'undefined' ? __app_id : 'shared-flexi-schedule';
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'schedule_data');

          const unsubSnapshot = onSnapshot(docRef, 
            (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.meta) setScheduleMeta(data.meta);
                if (data.categories) setCategories(data.categories);
                if (data.activities) setActivities(data.activities);
              }
              setCloudSyncStatus('connected');
            },
            (err) => {
              console.error('Firestore listener error:', err);
              setCloudSyncStatus('error');
            }
          );

          return () => unsubSnapshot();
        } else {
          setCloudSyncStatus('local');
        }
      });

      return () => unsubAuth();
    } catch (err) {
      console.error('Firebase initialization error:', err);
      setCloudSyncStatus('error');
    }
  }, [userFirebaseConfig]);

  const saveToCloud = async (newMeta, newCats, newActs) => {
    if (!firebaseInstances || !firebaseInstances.db || cloudSyncStatus === 'local') return;

    try {
      setCloudSyncStatus('syncing');
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'shared-flexi-schedule';
      const docRef = doc(firebaseInstances.db, 'artifacts', appId, 'public', 'data', 'schedule_data');

      await setDoc(docRef, {
        meta: newMeta || scheduleMeta,
        categories: newCats || categories,
        activities: newActs || activities,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setCloudSyncStatus('connected');
    } catch (err) {
      console.error('Cloud save failed:', err);
      setCloudSyncStatus('error');
    }
  };

  const updateActivitiesState = (updater) => {
    setActivities(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!isViewingSharedUrl) {
        saveToCloud(scheduleMeta, categories, next);
      }
      return next;
    });
  };

  const updateScheduleMetaState = (updater) => {
    setScheduleMeta(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!isViewingSharedUrl) {
        saveToCloud(next, categories, activities);
      }
      return next;
    });
  };

  const updateCategoriesState = (updater) => {
    setCategories(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!isViewingSharedUrl) {
        saveToCloud(scheduleMeta, next, activities);
      }
      return next;
    });
  };

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
      startTime: '09:00',
      endTime: '10:00',
      categoryIds: [categories[0]?.id || 'cat-work'],
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
      updateActivitiesState(prev => prev.map(a => a.id === editingActivity.id ? {
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
      updateActivitiesState(prev => [...prev, newAct]);
      showToast('Activity created successfully!', 'success');
    }
    setActiveModal(null);
  };

  const handleDeleteSingleActivity = (id) => {
    updateActivitiesState(prev => prev.filter(a => a.id !== id));
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
    updateActivitiesState(prev => prev.filter(a => !selectedActivityIds.includes(a.id)));
    showToast(`Deleted ${selectedActivityIds.length} activities`, 'success');
    setSelectedActivityIds([]);
    setActiveModal(null);
  };

  const [generatedShareUrl, setGeneratedShareUrl] = useState('');

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

  const handleImportSharedToCloud = () => {
    setIsViewingSharedUrl(false);
    window.location.hash = '';
    saveToCloud(scheduleMeta, categories, activities);
    showToast('Shared schedule imported into your main workspace!', 'success');
  };

  const handleExitSharedMode = () => {
    setIsViewingSharedUrl(false);
    window.location.hash = '';
    showToast('Exited shared view mode', 'info');
  };

  const handleSaveFirebaseConfig = (e) => {
    e.preventDefault();
    try {
      let parsed = null;
      if (firebaseConfigText.trim().startsWith('{')) {
        parsed = JSON.parse(firebaseConfigText);
      } else {
        showToast('Invalid Firebase JSON format', 'error');
        return;
      }
      localStorage.setItem('flexi_firebase_config', JSON.stringify(parsed));
      setUserFirebaseConfig(parsed);
      setActiveModal(null);
      showToast('Firebase configuration updated!', 'success');
    } catch (err) {
      showToast('Error parsing Firebase configuration', 'error');
    }
  };

  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3B82F6');

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newCat = {
      id: 'cat-' + Date.now(),
      name: newCatName.trim(),
      color: newCatColor
    };
    updateCategoriesState(prev => [...prev, newCat]);
    setNewCatName('');
    showToast('Category created!', 'success');
  };

  const handleDeleteCategory = (id) => {
    if (categories.length <= 1) {
      showToast('At least one category must remain', 'error');
      return;
    }
    updateCategoriesState(prev => prev.filter(c => c.id !== id));
    // Remove deleted category ID from activities
    updateActivitiesState(prev => prev.map(a => ({
      ...a,
      categoryIds: a.categoryIds.filter(cid => cid !== id)
    })));
    showToast('Category removed', 'info');
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
    showToast('Backup JSON exported successfully!', 'success');
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
        saveToCloud(parsed.meta, parsed.categories, parsed.activities);
        showToast('Schedule imported from backup JSON!', 'success');
        setActiveModal(null);
      } catch (err) {
        showToast('Invalid JSON file format', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'} transition-colors duration-200 font-sans pb-12`}>
      
      {/* Toast Notification Floating Banner */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-lg shadow-xl text-white font-medium text-sm transition-all animate-bounce ${
          toastMessage.type === 'error' ? 'bg-red-600' : toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-blue-600'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Shared Link Mode Top Notice Banner (Method 2) */}
      {isViewingSharedUrl && (
        <div className="bg-amber-500 text-slate-900 px-4 py-2.5 text-sm font-semibold flex flex-wrap items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <Eye size={18} className="animate-pulse" />
            <span>You are viewing a shared link schedule: <strong>"{scheduleMeta.title}"</strong></span>
          </div>
          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <button
              onClick={handleImportSharedToCloud}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded-md text-xs transition flex items-center space-x-1"
            >
              <Cloud size={14} />
              <span>Import to My Workspace</span>
            </button>
            <button
              onClick={handleExitSharedMode}
              className="bg-amber-600 hover:bg-amber-700 text-slate-900 px-3 py-1 rounded-md text-xs transition"
            >
              Exit View
            </button>
          </div>
        </div>
      )}

      {/* Main Header & Navbar */}
      <header className={`border-b ${darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white/90'} backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5 shadow-sm`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Title & Cloud Indicator */}
          <div className="flex items-center justify-between md:justify-start space-x-4">
            <div className="flex items-center space-x-2.5">
              <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/20">
                <Calendar size={22} />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">{scheduleMeta.title}</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {scheduleMeta.startDate} to {scheduleMeta.endDate}
                </p>
              </div>
            </div>

            {/* Cloud Sync Status Indicator Pill (Method 3) */}
            <button
              onClick={() => setActiveModal('cloud')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                cloudSyncStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : cloudSyncStatus === 'syncing'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                  : cloudSyncStatus === 'error'
                  ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
              title="Click to configure Cloud Database Sync"
            >
              {cloudSyncStatus === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <Cloud size={14} className="text-emerald-500" />
                  <span className="hidden sm:inline">Cloud Synced</span>
                </>
              ) : cloudSyncStatus === 'syncing' ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-blue-500" />
                  <span className="hidden sm:inline">Syncing...</span>
                </>
              ) : (
                <>
                  <CloudOff size={14} className="text-slate-400" />
                  <span className="hidden sm:inline">Local Mode</span>
                </>
              )}
            </button>
          </div>

          {/* Search Filter & Control Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input Filter */}
            <div className="relative flex-1 sm:w-48 md:w-56">
              <input
                type="text"
                placeholder="Filter activities..."
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 shadow-sm transition"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Add Activity</span>
            </button>

            <button
              onClick={handleGenerateShareLink}
              className={`p-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1 transition ${
                darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
              }`}
              title="Share via URL Encoded Link (Method 2)"
            >
              <Share2 size={16} className="text-amber-500" />
              <span className="hidden lg:inline">Share Link</span>
            </button>

            <button
              onClick={() => setActiveModal('categories')}
              className={`p-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1 transition ${
                darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
              }`}
              title="Manage Categories & Striped Tag Colors"
            >
              <Tag size={16} className="text-emerald-500" />
              <span className="hidden lg:inline">Tags</span>
            </button>

            <button
              onClick={() => setActiveModal('analytics')}
              className={`p-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1 transition ${
                darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
              }`}
              title="Time Analytics Dashboard"
            >
              <BarChart2 size={16} className="text-purple-500" />
              <span className="hidden lg:inline">Stats</span>
            </button>

            <button
              onClick={() => setActiveModal('settings')}
              className={`p-1.5 rounded-lg border text-xs font-medium transition ${
                darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
              }`}
              title="Date Range & Time Grid Settings"
            >
              <Settings size={16} className="text-slate-500" />
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-1.5 rounded-lg border text-xs font-medium transition ${
                darkMode ? 'border-slate-700 hover:bg-slate-800 text-amber-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title="Toggle Light / Dark Mode"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

        </div>
      </header>

      {/* Sub-Header Bar: Selection Toggle & Category Legend */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Category Legend Pill Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 mr-1 flex items-center">
            <Layers size={13} className="mr-1" /> Categories:
          </span>
          {categories.map(cat => (
            <span
              key={cat.id}
              className="inline-flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full font-medium shadow-xs text-white"
              style={{ backgroundColor: cat.color }}
            >
              <span>{cat.name}</span>
            </span>
          ))}
        </div>

        {/* Batch Selection Mode Toggle (Method 4) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedActivityIds([]);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition ${
              selectionMode 
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                : darkMode 
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' 
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {selectionMode ? <CheckSquare size={14} /> : <Square size={14} />}
            <span>{selectionMode ? 'Selection Mode Active' : 'Batch Selection'}</span>
          </button>
        </div>

      </div>

      {/* Floating Action Bar for Batch Selection Mode (Method 4) */}
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
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Trash2 size={14} />
            <span>Delete Selected</span>
          </button>
        </div>
      )}

      {}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 mt-2">
        <div className={`rounded-2xl border shadow-sm overflow-x-auto ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <div className="min-w-[800px]">
            
            {/* Grid Days Header Row (Method 5: Interactive Day Headers for Expanded Single Day Pop-up) */}
            <div className={`grid grid-cols-8 border-b text-xs font-semibold ${darkMode ? 'border-slate-800 bg-slate-800/50 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              
              {/* Time axis header */}
              <div className="p-3 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center space-x-1 text-slate-400">
                <Clock size={14} />
                <span>GMT</span>
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
                    title="Click for Expanded Single Day Detail View"
                  >
                    <div className="text-slate-400 text-[10px] uppercase tracking-wider">{dayName}</div>
                    <div className="font-bold text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-center space-x-1">
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
            <div className="relative grid grid-cols-8 divide-x divide-slate-200 dark:divide-slate-800 min-h-[500px]">
              
              {/* Left Column: Hourly Time Slot Markers */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-400 text-[11px] text-right pr-2">
                {timeSlots.map((timeStr) => (
                  <div key={timeStr} className="h-16 pt-1 font-mono">
                    {formatDisplayTime(timeStr)}
                  </div>
                ))}
              </div>

              {/* Day Activity Columns */}
              {dateColumns.map((dateStr) => {
                const dayActs = filteredActivities.filter(a => a.date === dateStr);

                return (
                  <div key={dateStr} className="relative divide-y divide-slate-100 dark:divide-slate-800/40">
                    
                    {/* Background Hour Lines for Grid Alignment */}
                    {timeSlots.map((timeStr) => (
                      <div
                        key={timeStr}
                        onClick={() => {
                          setActivityForm({
                            title: '',
                            date: dateStr,
                            startTime: timeStr,
                            endTime: minutesToTime(timeToMinutes(timeStr) + 60),
                            categoryIds: [categories[0]?.id || 'cat-work'],
                            notes: ''
                          });
                          setActiveModal('activity');
                        }}
                        className="h-16 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition cursor-pointer"
                        title={`Click to schedule activity at ${formatDisplayTime(timeStr)}`}
                      />
                    ))}

                    {/* Positioned Activity Cards */}
                    {dayActs.map((act) => {
                      const actStartMins = timeToMinutes(act.startTime);
                      const actEndMins = timeToMinutes(act.endTime);

                      // Calculate Top % and Height % within the timeline range
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
                            left: '4px',
                            right: '4px',
                            ...categoryStyle
                          }}
                          className={`rounded-xl p-2 text-xs shadow-md border border-white/20 overflow-hidden transition-all duration-150 flex flex-col justify-between group hover:z-20 hover:scale-[1.02] ${
                            isSelected ? 'ring-2 ring-amber-400 ring-offset-1' : ''
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-1">
                            
                            {/* Selection Checkbox OR Title */}
                            <div className="flex items-center space-x-1 overflow-hidden">
                              {selectionMode && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectActivity(act.id);
                                  }}
                                  className="text-white hover:text-amber-200"
                                >
                                  {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                </button>
                              )}
                              <span className="font-bold truncate drop-shadow-sm text-white">
                                {act.title}
                              </span>
                            </div>

                            {/* Quick Action Icons */}
                            {!selectionMode && (
                              <div className="opacity-0 group-hover:opacity-100 transition flex items-center space-x-1 bg-black/40 backdrop-blur-xs p-0.5 rounded-md">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(act);
                                  }}
                                  className="p-0.5 text-white hover:text-blue-200"
                                  title="Edit Activity"
                                >
                                  <Edit3 size={11} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSingleActivity(act.id);
                                  }}
                                  className="p-0.5 text-white hover:text-red-200"
                                  title="Delete Activity"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Time Details & Tags */}
                          <div className="mt-1 text-[10px] opacity-90 flex items-center justify-between drop-shadow-sm">
                            <span className="font-mono bg-black/30 px-1 py-0.2 rounded text-[9px]">
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

      {}
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
                  placeholder="e.g. Morning Workout / Client Call"
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
                    step="300" // 5 min precision
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

              {/* Multi-Tag Category Selection (Method 3 Striped Gradient support) */}
              <div>
                <label className="block font-semibold mb-1 text-slate-500">
                  Category Tags (Select multiple for Striped Gradient pattern)
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
                        className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center space-x-1.5 transition ${
                          isSelected
                            ? 'ring-2 ring-blue-500 text-white font-bold'
                            : 'opacity-60 text-slate-700 dark:text-slate-300'
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
                <label className="block font-semibold mb-1 text-slate-500">Notes / Details</label>
                <textarea
                  rows={3}
                  placeholder="Additional context or checklist items..."
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

      {}
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
              This link encodes your entire schedule data directly into the URL string. Computer 2 can open this link to view your schedule <strong>without needing any database setup</strong>!
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
                  Tip: Send this link via Email, Messaging apps, or Slack!
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

      {}
      {activeModal === 'cloud' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Cloud size={18} className="text-blue-500" />
                <span>Cloud Database Synchronization (Method 3)</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Current Status Badge */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                cloudSyncStatus === 'connected' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200' : 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}>
                <div className="flex items-center space-x-2">
                  <Cloud size={18} className={cloudSyncStatus === 'connected' ? 'text-emerald-500' : 'text-slate-400'} />
                  <div>
                    <div className="font-bold">
                      Status: {cloudSyncStatus === 'connected' ? 'Active Real-Time Cloud Sync' : 'Local Browser Mode'}
                    </div>
                    {cloudUserId && <div className="text-[10px] opacity-75 font-mono">User ID: {cloudUserId}</div>}
                  </div>
                </div>
              </div>

              {/* Firebase Setup Form */}
              <form onSubmit={handleSaveFirebaseConfig} className="space-y-3">
                <label className="block font-semibold text-slate-500">
                  Firebase JSON Configuration Object
                </label>
                <textarea
                  rows={6}
                  placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "my-app.firebaseapp.com",\n  "projectId": "my-app-123"\n}`}
                  value={firebaseConfigText}
                  onChange={(e) => setFirebaseConfigText(e.target.value)}
                  className={`w-full p-3 rounded-lg border font-mono text-[11px] focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Paste your Firebase web config JSON above to enable multi-computer instant sync.
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-sm"
                  >
                    Save & Connect
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {}
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
                <p className="text-xs text-slate-400">Detailed Chronological Timeline View</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* List of Day Activities in Order */}
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
                        className="rounded-xl p-3 shadow-md border border-white/20 text-white transition hover:scale-[1.01]"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-sm drop-shadow-sm">{act.title}</h4>
                            <div className="text-xs font-mono opacity-90 mt-0.5">
                              {formatDisplayTime(act.startTime)} - {formatDisplayTime(act.endTime)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => {
                                handleOpenEditModal(act);
                              }}
                              className="p-1 text-white/80 hover:text-white"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteSingleActivity(act.id)}
                              className="p-1 text-white/80 hover:text-white"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {act.notes && (
                          <div className="mt-2 text-xs opacity-90 bg-black/20 p-2 rounded-lg border border-white/10">
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
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center space-x-1 shadow-sm"
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

      {}
      {activeModal === 'categories' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Tag size={18} className="text-emerald-500" />
                <span>Category Tag & Striped Pattern Manager</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Category List */}
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
                      className="w-4 h-4 rounded-full border border-white/20 shadow-xs"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium">{cat.name}</span>
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

            {/* Add New Category Form */}
            <form onSubmit={handleAddCategory} className="space-y-3 border-t pt-3 border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-500">Create New Tag</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  placeholder="Category Name"
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

      {}
      {activeModal === 'analytics' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <BarChart2 size={18} className="text-purple-500" />
                <span>Time Allocation Analytics</span>
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

            {/* Progress Breakdown Bars */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500">Breakdown by Category</h4>
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

      {}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Settings size={18} className="text-slate-500" />
                <span>Grid & Date Range Settings</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setActiveModal(null);
                showToast('Schedule settings updated!', 'success');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold mb-1 text-slate-500">Schedule Title</label>
                <input
                  type="text"
                  value={scheduleMeta.title}
                  onChange={(e) => updateScheduleMetaState({ ...scheduleMeta, title: e.target.value })}
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
                    onChange={(e) => updateScheduleMetaState({ ...scheduleMeta, startDate: e.target.value })}
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
                    onChange={(e) => updateScheduleMetaState({ ...scheduleMeta, endDate: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-500">Grid Start Time</label>
                  <input
                    type="time"
                    value={scheduleMeta.startTime}
                    onChange={(e) => updateScheduleMetaState({ ...scheduleMeta, startTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-500">Grid End Time</label>
                  <input
                    type="time"
                    value={scheduleMeta.endTime}
                    onChange={(e) => updateScheduleMetaState({ ...scheduleMeta, endTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Data Backup / Export */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block font-semibold text-slate-500">Backup & Recovery</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center space-x-1"
                  >
                    <Download size={14} />
                    <span>Export JSON</span>
                  </button>
                  <label className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center space-x-1 cursor-pointer">
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

      {}
      {activeModal === 'batchDelete' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-6 text-center ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-bold text-base mb-1">Confirm Batch Deletion</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to permanently delete <strong>{selectedActivityIds.length}</strong> selected activities?
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