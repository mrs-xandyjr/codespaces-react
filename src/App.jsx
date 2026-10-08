import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calendar, Clock, Plus, Trash2, Edit3, Share2, Settings,
  Sun, Moon, Tag, Filter, CheckSquare, Square, Maximize2, Download, Upload,
  X, Check, Copy, ExternalLink, BarChart2, Eye, Lock, Move, AlertTriangle, 
  CheckCircle2, AlertCircle, Layers, MapPin, Search, ChevronRight, Info,
  AlertOctagon, Sparkles
} from 'lucide-react';

// Default pastel colors for Grade 7 through Grade 12
const DEFAULT_TAGS = [
  { id: 'tag-g7', name: 'Grade 7', color: '#a7f3d0', textColor: '#064e3b' },   // Pastel Green
  { id: 'tag-g8', name: 'Grade 8', color: '#fef08a', textColor: '#713f12' },   // Pastel Yellow
  { id: 'tag-g9', name: 'Grade 9', color: '#fca5a5', textColor: '#7f1d1d' },   // Pastel Red
  { id: 'tag-g10', name: 'Grade 10', color: '#93c5fd', textColor: '#1e3a8a' }, // Pastel Blue
  { id: 'tag-g11', name: 'Grade 11', color: '#fbcfe8', textColor: '#831843' }, // Pastel Pink
  { id: 'tag-g12', name: 'Grade 12', color: '#fed7aa', textColor: '#7c2d12' }  // Pastel Orange
];

const DEFAULT_SCHEDULE_META = {
  title: 'YMSAT Schedule',
  startDate: '2027-01-20',
  endDate: '2027-01-27',
  startTime: '06:00',
  endTime: '18:00'
};

const DEFAULT_ACTIVITIES = [
  {
    id: 'act-opening',
    title: 'Opening Ceremony & Keynote',
    date: '2027-01-20',
    startTime: '07:30',
    endTime: '08:30',
    venue: 'Main Gym / Auditorium',
    categoryIds: ['tag-g7', 'tag-g8', 'tag-g9', 'tag-g10', 'tag-g11', 'tag-g12'], // All 6 tags selected -> Striped styling
    notes: 'Official inauguration for YMSAT Week with guest speaker.'
  },
  {
    id: 'act-stem-fair',
    title: 'STEM Science Fair Judging',
    date: '2027-01-20',
    startTime: '08:00',
    endTime: '10:30',
    venue: 'Science Lab Complex',
    categoryIds: ['tag-g9', 'tag-g10'],
    notes: 'Student science project exhibits and panel evaluation.'
  },
  {
    id: 'act-math-olympiad',
    title: 'Math Olympiad Contest',
    date: '2027-01-20',
    startTime: '08:30',
    endTime: '11:00',
    venue: 'Lecture Hall A',
    categoryIds: ['tag-g11', 'tag-g12'],
    notes: 'Interschool speed math solving championship.'
  },
  {
    id: 'act-robotics',
    title: 'Robotics Workshop',
    date: '2027-01-21',
    startTime: '09:00',
    endTime: '11:30',
    venue: 'Makerspace Studio',
    categoryIds: ['tag-g7', 'tag-g8'],
    notes: 'Hands-on microcontroller programming and sensor integration.'
  },
  {
    id: 'act-astro-demo',
    title: 'Astronomy & Optics Lab',
    date: '2027-01-21',
    startTime: '10:00',
    endTime: '12:00',
    venue: 'Lecture Hall A',
    categoryIds: ['tag-g9', 'tag-g10'],
    notes: 'Interactive stargazing equipment setup and optical physics.'
  },
  {
    id: 'act-chem-show',
    title: 'Chemistry Spectacular',
    date: '2027-01-22',
    startTime: '13:00',
    endTime: '15:00',
    venue: 'Main Gym / Auditorium',
    categoryIds: ['tag-g7', 'tag-g8'],
    notes: 'Live chemistry reaction demonstrations.'
  },
  {
    id: 'act-research-symp',
    title: 'Senior Research Symposium',
    date: '2027-01-25',
    startTime: '08:30',
    endTime: '12:00',
    venue: 'Conference Center',
    categoryIds: ['tag-g11', 'tag-g12'],
    notes: 'Oral presentations of senior capstone projects.'
  },
  {
    id: 'act-closing',
    title: 'Awarding & Closing Ceremony',
    date: '2027-01-27',
    startTime: '14:00',
    endTime: '16:30',
    venue: 'Main Gym / Auditorium',
    categoryIds: ['tag-g7', 'tag-g8', 'tag-g9', 'tag-g10', 'tag-g11', 'tag-g12'],
    notes: 'Distribution of trophies, certificates, and closing remarks.'
  }
];

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (totalMinutes) => {
  const boundedMins = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(boundedMins / 60).toString().padStart(2, '0');
  const m = (boundedMins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const formatDisplayTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
};

const snapTo5Minutes = (mins) => {
  return Math.round(mins / 5) * 5;
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

const encodeScheduleToURL = (scheduleMeta, tags, activities) => {
  try {
    const payload = {
      meta: scheduleMeta,
      tags: tags,
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

const detectConflicts = (activitiesList) => {
  const conflictMap = {};

  activitiesList.forEach(act => {
    conflictMap[act.id] = { hasTagConflict: false, hasVenueConflict: false };
  });

  for (let i = 0; i < activitiesList.length; i++) {
    for (let j = i + 1; j < activitiesList.length; j++) {
      const act1 = activitiesList[i];
      const act2 = activitiesList[j];

      // Conflicts must be on the exact same date
      if (act1.date !== act2.date) continue;

      const start1 = timeToMinutes(act1.startTime);
      const end1 = timeToMinutes(act1.endTime);
      const start2 = timeToMinutes(act2.startTime);
      const end2 = timeToMinutes(act2.endTime);

      // Check time overlap: start1 < end2 AND start2 < end1
      const isOverlapping = start1 < end2 && start2 < end1;

      if (isOverlapping) {
        // Tag Conflict: At least 1 shared tag
        const commonTags = (act1.categoryIds || []).filter(id => (act2.categoryIds || []).includes(id));
        if (commonTags.length > 0) {
          conflictMap[act1.id].hasTagConflict = true;
          conflictMap[act2.id].hasTagConflict = true;
        }

        // Venue Conflict: Non-empty, case-insensitive exact match
        const venue1 = (act1.venue || '').trim().toLowerCase();
        const venue2 = (act2.venue || '').trim().toLowerCase();

        if (venue1 && venue2 && venue1 === venue2) {
          conflictMap[act1.id].hasVenueConflict = true;
          conflictMap[act2.id].hasVenueConflict = true;
        }
      }
    }
  }

  return conflictMap;
};

const getTagBackgroundStyle = (categoryIds, tags, conflictState = {}) => {
  const { hasTagConflict, hasVenueConflict } = conflictState;

  // Dual conflict override: Black and White Zebra stripe
  if (hasTagConflict && hasVenueConflict) {
    return {
      backgroundImage: 'repeating-linear-gradient(135deg, #0f172a 0px, #0f172a 12px, #ffffff 12px, #ffffff 24px)',
      color: '#0f172a',
      border: '2px solid #ef4444',
      isConflictStyle: true
    };
  }

  // Tag Conflict: SOLID BLACK block with WHITE text
  if (hasTagConflict) {
    return {
      backgroundColor: '#09090b',
      color: '#ffffff',
      border: '2px solid #dc2626',
      isConflictStyle: true
    };
  }

  // Venue Conflict: SOLID WHITE block with BLACK text and dark bold outline
  if (hasVenueConflict) {
    return {
      backgroundColor: '#ffffff',
      color: '#09090b',
      border: '2px solid #2563eb',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      isConflictStyle: true
    };
  }

  // Default Tag Pastel Styling
  if (!categoryIds || categoryIds.length === 0) {
    return { backgroundColor: '#e2e8f0', color: '#0f172a' };
  }

  const matchedTags = categoryIds
    .map(id => tags.find(t => t.id === id))
    .filter(Boolean);

  if (matchedTags.length === 0) {
    return { backgroundColor: '#e2e8f0', color: '#0f172a' };
  }

  if (matchedTags.length === 1) {
    return {
      backgroundColor: matchedTags[0].color,
      color: matchedTags[0].textColor || '#0f172a'
    };
  }

  // Multi-tag repeating diagonal striped gradient generator
  const stripeWidth = 18; // px
  const gradientStops = [];
  matchedTags.forEach((tag, index) => {
    const start = index * stripeWidth;
    const end = (index + 1) * stripeWidth;
    gradientStops.push(`${tag.color} ${start}px`, `${tag.color} ${end}px`);
  });

  const totalWidth = matchedTags.length * stripeWidth;
  const gradientCss = `repeating-linear-gradient(135deg, ${gradientStops.join(', ')})`;

  return {
    backgroundImage: gradientCss,
    backgroundSize: `${totalWidth * 1.414}px ${totalWidth * 1.414}px`,
    color: '#0f172a'
  };
};

const computeOverlappingDayLayouts = (dayActivities) => {
  if (!dayActivities || dayActivities.length === 0) return [];

  // Sort by start time ascending, then duration descending
  const sorted = [...dayActivities]
    .map(act => ({
      ...act,
      startMins: timeToMinutes(act.startTime),
      endMins: timeToMinutes(act.endTime)
    }))
    .sort((a, b) => a.startMins - b.startMins || (b.endMins - b.startMins) - (a.endMins - a.startMins));

  // Partition into concurrent time clusters
  const clusters = [];
  let currentCluster = [];
  let clusterEndMins = -1;

  sorted.forEach(act => {
    if (currentCluster.length === 0) {
      currentCluster.push(act);
      clusterEndMins = act.endMins;
    } else {
      if (act.startMins < clusterEndMins) {
        currentCluster.push(act);
        if (act.endMins > clusterEndMins) clusterEndMins = act.endMins;
      } else {
        clusters.push(currentCluster);
        currentCluster = [act];
        clusterEndMins = act.endMins;
      }
    }
  });
  if (currentCluster.length > 0) clusters.push(currentCluster);

  const finalLayouts = [];

  // Assign column slots within each cluster
  clusters.forEach(cluster => {
    const columns = []; // stores max end time of each column

    const clusterAssigned = cluster.map(act => {
      let assignedCol = -1;
      for (let i = 0; i < columns.length; i++) {
        if (columns[i] <= act.startMins) {
          assignedCol = i;
          columns[i] = act.endMins;
          break;
        }
      }
      if (assignedCol === -1) {
        assignedCol = columns.length;
        columns.push(act.endMins);
      }
      return { ...act, colIdx: assignedCol };
    });

    const totalCols = columns.length;

    clusterAssigned.forEach(act => {
      const leftPercent = (act.colIdx / totalCols) * 100;
      const widthPercent = 100 / totalCols;

      finalLayouts.push({
        ...act,
        leftPercent,
        widthPercent,
        colIdx: act.colIdx,
        totalCols
      });
    });
  });

  return finalLayouts;
};

export default function App() {
  const [scheduleMeta, setScheduleMeta] = useState(DEFAULT_SCHEDULE_META);
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);

  // Read-only state for shared links
  const [isReadOnly, setIsReadOnly] = useState(false);

  // UI options
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState([]);

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'activity' | 'tags' | 'share' | 'analytics' | 'dayView' | 'batchDelete' | 'settings'
  const [editingActivity, setEditingActivity] = useState(null);
  const [selectedDayForView, setSelectedDayForView] = useState(null);

  // Activity Form state
  const [activityForm, setActivityForm] = useState({
    title: '',
    date: '2027-01-20',
    startTime: '08:00',
    endTime: '09:00',
    venue: '',
    categoryIds: [],
    notes: ''
  });

  // Share Modal links state
  const [shareLinks, setShareLinks] = useState({ viewLink: '', editLink: '' });

  // Drag-and-Drop and Resize State
  const [dragState, setDragState] = useState(null);

  // Grid container reference for offset calculations
  const gridRef = useRef(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((text, type = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  useEffect(() => {
    const handleUrlHash = () => {
      const hash = window.location.hash;
      if (hash && hash.includes('data=')) {
        const mode = hash.includes('mode=view') ? 'view' : 'edit';
        setIsReadOnly(mode === 'view');

        const params = new URLSearchParams(hash.replace('#', ''));
        const encodedData = params.get('data');

        if (encodedData) {
          const decoded = decodeScheduleFromURL(encodedData);
          if (decoded && decoded.meta && decoded.acts) {
            setScheduleMeta(decoded.meta);
            setTags(decoded.tags || DEFAULT_TAGS);
            setActivities(decoded.acts || []);
            showToast(
              mode === 'view' ? 'Opened in Read-Only Mode' : 'Opened Shared Editable Schedule',
              'success'
            );
          }
        }
      }
    };

    handleUrlHash();
    window.addEventListener('hashchange', handleUrlHash);
    return () => window.removeEventListener('hashchange', handleUrlHash);
  }, [showToast]);

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

  // Compute conflicts across all activities
  const conflictMap = useMemo(() => {
    return detectConflicts(activities);
  }, [activities]);

  // Filter activities by search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const q = searchQuery.toLowerCase();
    return activities.filter(act => {
      const matchesTitle = act.title.toLowerCase().includes(q);
      const matchesVenue = act.venue && act.venue.toLowerCase().includes(q);
      const matchesNotes = act.notes && act.notes.toLowerCase().includes(q);
      const matchesTag = act.categoryIds.some(cid => {
        const tag = tags.find(t => t.id === cid);
        return tag && tag.name.toLowerCase().includes(q);
      });
      return matchesTitle || matchesVenue || matchesNotes || matchesTag;
    });
  }, [activities, searchQuery, tags]);

  const handleStartDrag = (e, act, type) => {
    if (isReadOnly) return;
    if (selectionMode) return;

    e.preventDefault();
    e.stopPropagation();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    setDragState({
      actId: act.id,
      type, // 'move' or 'resize'
      startX: clientX,
      startY: clientY,
      origDate: act.date,
      origStartMins: timeToMinutes(act.startTime),
      origEndMins: timeToMinutes(act.endTime),
      tempDate: act.date,
      tempStartMins: timeToMinutes(act.startTime),
      tempEndMins: timeToMinutes(act.endTime)
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragState.startX;
      const deltaY = clientY - dragState.startY;

      if (!gridRef.current) return;
      const gridRect = gridRef.current.getBoundingClientRect();
      const gridHeight = gridRect.height;
      const minsPerPixel = totalGridMins / gridHeight;

      const deltaMinutes = snapTo5Minutes(deltaY * minsPerPixel);

      if (dragState.type === 'resize') {
        // Resizing bottom handle
        const duration = dragState.origEndMins - dragState.origStartMins;
        const newDuration = Math.max(15, duration + deltaMinutes); // min 15 minutes
        let newEndMins = dragState.origStartMins + newDuration;
        newEndMins = Math.min(gridEndMins, newEndMins);

        setDragState(prev => prev ? { ...prev, tempEndMins: newEndMins } : null);
      } else if (dragState.type === 'move') {
        // Dragging entire block vertically (time) and horizontally (date)
        const duration = dragState.origEndMins - dragState.origStartMins;
        let newStartMins = snapTo5Minutes(dragState.origStartMins + deltaMinutes);
        
        // Clamp to time bounds
        newStartMins = Math.max(gridStartMins, Math.min(gridEndMins - duration, newStartMins));
        const newEndMins = newStartMins + duration;

        // Determine column date shift based on X offset
        const colWidth = gridRect.width / dateColumns.length;
        const colShift = Math.round(deltaX / colWidth);
        const origDateIdx = dateColumns.indexOf(dragState.origDate);
        let newDateIdx = origDateIdx + colShift;
        newDateIdx = Math.max(0, Math.min(dateColumns.length - 1, newDateIdx));
        const newDate = dateColumns[newDateIdx] || dragState.origDate;

        setDragState(prev => prev ? {
          ...prev,
          tempDate: newDate,
          tempStartMins: newStartMins,
          tempEndMins: newEndMins
        } : null);
      }
    };

    const handlePointerUp = () => {
      if (dragState) {
        // Apply temporary dragged state to main activities array
        setActivities(prev => prev.map(a => a.id === dragState.actId ? {
          ...a,
          date: dragState.tempDate,
          startTime: minutesToTime(dragState.tempStartMins),
          endTime: minutesToTime(dragState.tempEndMins)
        } : a));

        showToast('Activity rescheduled', 'success');
        setDragState(null);
      }
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [dragState, totalGridMins, gridStartMins, gridEndMins, dateColumns, showToast]);

  const handleOpenAddModal = (defaultDate = scheduleMeta.startDate) => {
    if (isReadOnly) return;
    setEditingActivity(null);
    setActivityForm({
      title: '',
      date: defaultDate,
      startTime: '08:00',
      endTime: '09:00',
      venue: '',
      categoryIds: [tags[0]?.id || 'tag-g7'],
      notes: ''
    });
    setActiveModal('activity');
  };

  const handleOpenEditModal = (act) => {
    if (isReadOnly) return;
    setEditingActivity(act);
    setActivityForm({
      title: act.title,
      date: act.date,
      startTime: act.startTime,
      endTime: act.endTime,
      venue: act.venue || '',
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
        venue: activityForm.venue,
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
        venue: activityForm.venue,
        categoryIds: activityForm.categoryIds,
        notes: activityForm.notes
      };
      setActivities(prev => [...prev, newAct]);
      showToast('New activity created!', 'success');
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

  const handleGenerateShareLinks = () => {
    const encoded = encodeScheduleToURL(scheduleMeta, tags, activities);
    if (encoded) {
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      setShareLinks({
        viewLink: `${baseUrl}#mode=view&data=${encoded}`,
        editLink: `${baseUrl}#mode=edit&data=${encoded}`
      });
      setActiveModal('share');
    } else {
      showToast('Failed to generate share link', 'error');
    }
  };

  const handleConvertToEditableCopy = () => {
    setIsReadOnly(false);
    window.location.hash = '#mode=edit';
    showToast('Converted to editable workspace!', 'success');
  };

  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#a7f3d0');

  const handleAddTag = (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    const newTag = {
      id: 'tag-' + Date.now(),
      name: newTagName.trim(),
      color: newTagColor,
      textColor: '#0f172a'
    };
    setTags(prev => [...prev, newTag]);
    setNewTagName('');
    showToast('Tag created!', 'success');
  };

  const handleDeleteTag = (id) => {
    if (tags.length <= 1) {
      showToast('At least one tag must remain', 'error');
      return;
    }
    setTags(prev => prev.filter(t => t.id !== id));
    setActivities(prev => prev.map(a => ({
      ...a,
      categoryIds: a.categoryIds.filter(cid => cid !== id)
    })));
    showToast('Tag removed', 'info');
  };

  const analyticsData = useMemo(() => {
    let totalMins = 0;
    const tagMins = {};

    tags.forEach(t => { tagMins[t.id] = 0; });

    activities.forEach(act => {
      const dur = Math.max(0, timeToMinutes(act.endTime) - timeToMinutes(act.startTime));
      totalMins += dur;

      if (act.categoryIds && act.categoryIds.length > 0) {
        const share = dur / act.categoryIds.length;
        act.categoryIds.forEach(cid => {
          if (tagMins[cid] !== undefined) {
            tagMins[cid] += share;
          }
        });
      }
    });

    return {
      totalHours: (totalMins / 60).toFixed(1),
      totalActivities: activities.length,
      tagBreakdown: tags.map(t => ({
        ...t,
        hours: (tagMins[t.id] / 60).toFixed(1),
        percentage: totalMins > 0 ? Math.round((tagMins[t.id] / totalMins) * 100) : 0
      }))
    };
  }, [activities, tags]);

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      meta: scheduleMeta,
      tags,
      activities
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${scheduleMeta.title.replace(/\s+/g, '_')}_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup JSON exported!', 'success');
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.meta) setScheduleMeta(parsed.meta);
        if (parsed.tags) setTags(parsed.tags);
        if (parsed.activities) setActivities(parsed.activities);
        showToast('Schedule restored from JSON!', 'success');
        setActiveModal(null);
      } catch (err) {
        showToast('Invalid JSON backup file', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'} transition-colors duration-200 font-sans pb-16`}>
      
      {/* Notification Toast */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-2xl text-white font-medium text-xs transition-all animate-bounce ${
          toastMessage.type === 'error' ? 'bg-red-600' : toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-blue-600'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Read-Only Top Alert Banner */}
      {isReadOnly && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-semibold flex flex-wrap items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <Eye size={18} className="animate-pulse" />
            <span>👁️ <strong>Read-Only Shared View</strong> — You are viewing a shared YMSAT schedule. Dragging and editing features are locked.</span>
          </div>
          <button
            onClick={handleConvertToEditableCopy}
            className="mt-1 sm:mt-0 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded-lg text-xs transition flex items-center space-x-1 shadow-sm"
          >
            <Lock size={12} />
            <span>Make Editable Copy</span>
          </button>
        </div>
      )}

      {/* Header Bar */}
      <header className={`border-b ${darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white/90'} backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5 shadow-sm`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Schedule Meta Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-md shadow-blue-500/20">
              <Calendar size={22} />
            </div>
            <div>
              <h1 className="font-extrabold text-lg leading-tight tracking-tight flex items-center space-x-2">
                <span>{scheduleMeta.title}</span>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">Jan 20-27</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {scheduleMeta.startDate} — {scheduleMeta.endDate} ({scheduleMeta.startTime} to {scheduleMeta.endTime})
              </p>
            </div>
          </div>

          {/* Action Tools Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input Filter */}
            <div className="relative flex-1 sm:w-44 md:w-52">
              <input
                type="text"
                placeholder="Search activity, venue, tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
              />
              <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Action Buttons */}
            {!isReadOnly && (
              <button
                onClick={() => handleOpenAddModal()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-sm transition"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">Add Activity</span>
              </button>
            )}

            <button
              onClick={handleGenerateShareLinks}
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center space-x-1 transition ${
                darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
              }`}
              title="Share Read-Only or Editable Link (Method 2 URL Encoding)"
            >
              <Share2 size={15} className="text-amber-500" />
              <span className="hidden lg:inline">Share Link</span>
            </button>

            <button
              onClick={() => setActiveModal('tags')}
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center space-x-1 transition ${
                darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
              }`}
              title="Manage Grade Tags & Pastel Colors"
            >
              <Tag size={15} className="text-emerald-500" />
              <span className="hidden lg:inline">Grade Tags</span>
            </button>

            <button
              onClick={() => setActiveModal('analytics')}
              className={`p-1.5 px-2.5 rounded-lg border text-xs font-medium flex items-center space-x-1 transition ${
                darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
              }`}
              title="Time Analytics Dashboard"
            >
              <BarChart2 size={15} className="text-purple-500" />
              <span className="hidden lg:inline">Analytics</span>
            </button>

            <button
              onClick={() => setActiveModal('settings')}
              className={`p-1.5 rounded-lg border text-xs font-medium transition ${
                darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
              }`}
              title="Date Range & Grid Settings"
            >
              <Settings size={15} className="text-slate-500" />
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-1.5 rounded-lg border text-xs font-medium transition ${
                darkMode ? 'border-slate-700 hover:bg-slate-800 text-amber-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title="Toggle Light / Dark Mode"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* Pastel Grade Tags Legend Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center">
            <Layers size={13} className="mr-1" /> Tags:
          </span>
          {tags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center space-x-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold shadow-xs border border-black/10"
              style={{ backgroundColor: tag.color, color: tag.textColor || '#0f172a' }}
            >
              <span>{tag.name}</span>
            </span>
          ))}
        </div>

        {/* Batch Selection Mode Toggle */}
        {!isReadOnly && (
          <button
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedActivityIds([]);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition ${
              selectionMode 
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                : darkMode 
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' 
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {selectionMode ? <CheckSquare size={14} /> : <Square size={14} />}
            <span>{selectionMode ? 'Batch Mode Active' : 'Select Multiple'}</span>
          </button>
        )}

      </div>

      {/* Floating Bottom Toolbar for Batch Mode */}
      {selectionMode && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-slate-950 border border-slate-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-4 text-xs font-medium animate-bounce">
          <span>
            <strong className="text-blue-400 font-bold">{selectedActivityIds.length}</strong> items selected
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
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1 font-semibold transition ${
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

      <main className="max-w-7xl mx-auto px-4 lg:px-8 mt-1">
        <div className={`rounded-2xl border shadow-sm overflow-x-auto ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <div className="min-w-[850px]">
            
            {/* Interactive Day Column Headers Row */}
            <div className={`grid grid-cols-9 border-b text-xs font-semibold ${darkMode ? 'border-slate-800 bg-slate-800/60 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              
              {/* Time axis column header */}
              <div className="p-3 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center space-x-1 text-slate-400">
                <Clock size={14} />
                <span>TIME</span>
              </div>

              {/* 8 Day Columns Headers (Jan 20 to Jan 27) */}
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
                    className="p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800 text-center cursor-pointer transition hover:bg-blue-50 dark:hover:bg-blue-950/40 group"
                    title="Click for Expanded Single Day Detail View"
                  >
                    <div className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">{dayName}</div>
                    <div className="font-extrabold text-xs sm:text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-center space-x-0.5">
                      <span>{dayNum}</span>
                      <Maximize2 size={10} className="opacity-0 group-hover:opacity-100 transition text-blue-500" />
                    </div>
                    {dayActivitiesCount > 0 && (
                      <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full font-semibold">
                        {dayActivitiesCount} act
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Timetable Matrix Grid Body */}
            <div ref={gridRef} className="relative grid grid-cols-9 divide-x divide-slate-200 dark:divide-slate-800 min-h-[550px] select-none">
              
              {/* Hourly Time Slot Axis */}
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
                const layoutActs = computeOverlappingDayLayouts(dayActs);

                return (
                  <div
                    key={dateStr}
                    className="relative divide-y divide-slate-100 dark:divide-slate-800/40"
                  >
                    
                    {/* Background hour slots */}
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
                              venue: '',
                              categoryIds: [tags[0]?.id || 'tag-g7'],
                              notes: ''
                            });
                            setActiveModal('activity');
                          }
                        }}
                        className="h-16 hover:bg-blue-50/40 dark:hover:bg-slate-800/30 transition cursor-pointer"
                        title={isReadOnly ? 'Read-only mode' : `Click to schedule activity at ${formatDisplayTime(timeStr)}`}
                      />
                    ))}

                    {/* Rendered Activity Cards with Side-by-Side Overlap positioning */}
                    {layoutActs.map((act) => {
                      const isBeingDragged = dragState && dragState.actId === act.id;
                      
                      // Compute display position (either active temporary drag position or stored position)
                      const actStartMins = isBeingDragged ? dragState.tempStartMins : act.startMins;
                      const actEndMins = isBeingDragged ? dragState.tempEndMins : act.endMins;

                      const topPercent = Math.max(0, ((actStartMins - gridStartMins) / totalGridMins) * 100);
                      const durationMins = Math.max(15, actEndMins - actStartMins);
                      const heightPercent = (durationMins / totalGridMins) * 100;

                      const isSelected = selectedActivityIds.includes(act.id);
                      
                      // Fetch Conflict state for this activity
                      const actConflict = conflictMap[act.id] || { hasTagConflict: false, hasVenueConflict: false };
                      const tagStyle = getTagBackgroundStyle(act.categoryIds, tags, actConflict);

                      return (
                        <div
                          key={act.id}
                          onMouseDown={(e) => handleStartDrag(e, act, 'move')}
                          onTouchStart={(e) => handleStartDrag(e, act, 'move')}
                          style={{
                            top: `${topPercent}%`,
                            height: `${heightPercent}%`,
                            left: `calc(${act.leftPercent}% + 2px)`,
                            width: `calc(${act.widthPercent}% - 4px)`,
                            position: 'absolute',
                            ...tagStyle
                          }}
                          className={`rounded-xl p-2 text-xs shadow-md border overflow-hidden transition-shadow flex flex-col justify-between group z-10 ${
                            isBeingDragged ? 'ring-4 ring-blue-500 shadow-2xl opacity-90 z-30 cursor-grabbing' : 'hover:z-20 hover:shadow-lg cursor-grab'
                          } ${isSelected ? 'ring-4 ring-amber-400' : ''}`}
                        >
                          {/* Card Top Header: Title & Conflict Warning Badges */}
                          <div>
                            <div className="flex items-start justify-between gap-1 pointer-events-none">
                              <div className="flex items-center space-x-1 overflow-hidden">
                                {selectionMode && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSelectActivity(act.id);
                                    }}
                                    className="pointer-events-auto text-slate-800 hover:text-black"
                                  >
                                    {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                  </button>
                                )}
                                <span className="font-extrabold truncate drop-shadow-xs leading-tight">
                                  {act.title}
                                </span>
                              </div>

                              {!isReadOnly && !selectionMode && (
                                <div className="opacity-0 group-hover:opacity-100 transition flex items-center space-x-0.5 bg-black/40 backdrop-blur-xs p-0.5 rounded-md pointer-events-auto">
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

                            {/* Conflict Badges */}
                            {(actConflict.hasTagConflict || actConflict.hasVenueConflict) && (
                              <div className="mt-1 flex flex-wrap gap-0.5 pointer-events-none">
                                {actConflict.hasTagConflict && (
                                  <span className="text-[8px] bg-red-600 text-white font-extrabold px-1 py-0.2 rounded flex items-center space-x-0.5 shadow-sm">
                                    <AlertTriangle size={8} />
                                    <span>TAG CONFLICT</span>
                                  </span>
                                )}
                                {actConflict.hasVenueConflict && (
                                  <span className="text-[8px] bg-blue-600 text-white font-extrabold px-1 py-0.2 rounded flex items-center space-x-0.5 shadow-sm">
                                    <AlertOctagon size={8} />
                                    <span>VENUE CONFLICT</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Venue Indicator */}
                            {act.venue && (
                              <div className="mt-0.5 text-[10px] font-semibold flex items-center space-x-0.5 opacity-90 truncate pointer-events-none">
                                <MapPin size={10} className="shrink-0" />
                                <span className="truncate">{act.venue}</span>
                              </div>
                            )}
                          </div>

                          {/* Time Stamp */}
                          <div className="text-[9px] font-mono font-bold opacity-90 pointer-events-none flex items-center justify-between mt-1">
                            <span className="bg-black/20 text-current px-1 py-0.2 rounded backdrop-blur-xs">
                              {formatDisplayTime(minutesToTime(actStartMins))} - {formatDisplayTime(minutesToTime(actEndMins))}
                            </span>
                          </div>

                          {/* Bottom Resize Drag Handle */}
                          {!isReadOnly && !selectionMode && (
                            <div
                              onMouseDown={(e) => handleStartDrag(e, act, 'resize')}
                              onTouchStart={(e) => handleStartDrag(e, act, 'resize')}
                              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/30 transition flex items-center justify-center group-hover:opacity-100 opacity-30"
                              title="Drag bottom handle to resize duration"
                            >
                              <div className="w-8 h-1 rounded-full bg-slate-800/60" />
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
                  placeholder="e.g. Opening Program / Science Fair"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-500">Venue / Location</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Main Gym / Auditorium / Lecture Hall A"
                    value={activityForm.venue}
                    onChange={(e) => setActivityForm({ ...activityForm, venue: e.target.value })}
                    className={`w-full pl-8 pr-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  <MapPin size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                </div>
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
                    step="300" // 5-minute snapping step
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

              {/* Tag selection pills */}
              <div>
                <label className="block font-semibold mb-1 text-slate-500">
                  Grade Level Tags (Multi-select generates striped styling)
                </label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {tags.map(tag => {
                    const isSelected = activityForm.categoryIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          setActivityForm(prev => {
                            const exists = prev.categoryIds.includes(tag.id);
                            return {
                              ...prev,
                              categoryIds: exists
                                ? prev.categoryIds.filter(id => id !== tag.id)
                                : [...prev.categoryIds, tag.id]
                            };
                          });
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition flex items-center space-x-1 ${
                          isSelected
                            ? 'ring-2 ring-blue-600 shadow-xs'
                            : 'opacity-50 hover:opacity-80'
                        }`}
                        style={{ backgroundColor: tag.color, color: tag.textColor || '#0f172a' }}
                      >
                        {isSelected && <Check size={12} />}
                        <span>{tag.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-500">Notes / Details</label>
                <textarea
                  rows={3}
                  placeholder="Additional context or speaker details..."
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

      {activeModal === 'dayView' && selectedDayForView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-3xl rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-lg text-blue-600 dark:text-blue-400 flex items-center space-x-2">
                  <Calendar size={20} />
                  <span>
                    {new Date(selectedDayForView + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Expanded Single Day Schedule Matrix</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Side-by-Side Overlapping Grid View inside Expanded Modal */}
            <div className="max-h-[65vh] overflow-y-auto pr-1">
              {activities.filter(a => a.date === selectedDayForView).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <Clock size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No activities scheduled for this day.</p>
                </div>
              ) : (
                <div className="relative min-h-[450px] border rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  
                  {/* Hourly background grid lines */}
                  {timeSlots.map((timeStr) => (
                    <div key={timeStr} className="h-14 flex items-start px-2 text-[10px] font-mono text-slate-400 border-b border-slate-100 dark:border-slate-800/60">
                      {formatDisplayTime(timeStr)}
                    </div>
                  ))}

                  {/* Overlapping side-by-side activity blocks */}
                  {computeOverlappingDayLayouts(activities.filter(a => a.date === selectedDayForView)).map((act) => {
                    const actStartMins = act.startMins;
                    const actEndMins = act.endMins;

                    const topPercent = Math.max(0, ((actStartMins - gridStartMins) / totalGridMins) * 100);
                    const durationMins = Math.max(15, actEndMins - actStartMins);
                    const heightPercent = (durationMins / totalGridMins) * 100;

                    const actConflict = conflictMap[act.id] || { hasTagConflict: false, hasVenueConflict: false };
                    const tagStyle = getTagBackgroundStyle(act.categoryIds, tags, actConflict);

                    return (
                      <div
                        key={act.id}
                        style={{
                          top: `${topPercent}%`,
                          height: `${heightPercent}%`,
                          left: `calc(${act.leftPercent}% + 4px)`,
                          width: `calc(${act.widthPercent}% - 8px)`,
                          position: 'absolute',
                          ...tagStyle
                        }}
                        className="rounded-xl p-3 shadow-md border overflow-hidden transition hover:scale-[1.01] flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <h4 className="font-extrabold text-xs sm:text-sm leading-tight">{act.title}</h4>
                            {!isReadOnly && (
                              <button
                                onClick={() => handleOpenEditModal(act)}
                                className="p-1 rounded hover:bg-black/20 text-current"
                                title="Edit"
                              >
                                <Edit3 size={13} />
                              </button>
                            )}
                          </div>

                          {/* Venue info */}
                          {act.venue && (
                            <div className="text-[11px] font-semibold flex items-center space-x-1 mt-0.5 opacity-90">
                              <MapPin size={12} />
                              <span>{act.venue}</span>
                            </div>
                          )}

                          {/* Conflict Warnings */}
                          {(actConflict.hasTagConflict || actConflict.hasVenueConflict) && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {actConflict.hasTagConflict && (
                                <span className="text-[9px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded flex items-center space-x-0.5">
                                  <AlertTriangle size={10} />
                                  <span>TAG CONFLICT</span>
                                </span>
                              )}
                              {actConflict.hasVenueConflict && (
                                <span className="text-[9px] bg-blue-600 text-white font-extrabold px-1.5 py-0.5 rounded flex items-center space-x-0.5">
                                  <AlertOctagon size={10} />
                                  <span>VENUE CONFLICT</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Badges & Time Stamp */}
                        <div className="mt-2 flex flex-wrap items-center justify-between text-[10px] font-mono font-bold gap-1">
                          <span className="bg-black/20 text-current px-1.5 py-0.5 rounded">
                            {formatDisplayTime(act.startTime)} - {formatDisplayTime(act.endTime)}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {act.categoryIds.map(cid => {
                              const tag = tags.find(t => t.id === cid);
                              if (!tag) return null;
                              return (
                                <span key={tag.id} className="bg-black/20 text-current px-1.5 py-0.2 rounded font-bold">
                                  {tag.name}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    );
                  })}

                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              {!isReadOnly && (
                <button
                  onClick={() => handleOpenAddModal(selectedDayForView)}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center space-x-1 shadow-sm"
                >
                  <Plus size={14} />
                  <span>Add Activity to this Day</span>
                </button>
              )}
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold ml-auto"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'share' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-xl rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Share2 size={18} className="text-amber-500" />
                <span>Shareable URL Links (Method 2 URL Encoding)</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              All schedule data is encoded directly into these links. Anyone can open them instantly without a backend server!
            </p>

            <div className="space-y-4 text-xs">
              
              {/* Read-Only Share Link Option */}
              <div className={`p-3.5 rounded-xl border space-y-2 ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-amber-50/60 border-amber-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center space-x-1 text-amber-900 dark:text-amber-300">
                    <Eye size={14} />
                    <span>Read-Only View Link</span>
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">Recommended for Students/Parents</span>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={shareLinks.viewLink}
                    className={`flex-1 p-2 rounded-lg border font-mono text-[11px] select-all ${
                      darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                    }`}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareLinks.viewLink);
                      showToast('Read-Only link copied to clipboard!', 'success');
                    }}
                    className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center space-x-1 shadow-xs"
                  >
                    <Copy size={13} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              {/* Editable Copy Share Link Option */}
              <div className={`p-3.5 rounded-xl border space-y-2 ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-blue-50/60 border-blue-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center space-x-1 text-blue-900 dark:text-blue-300">
                    <Edit3 size={14} />
                    <span>Editable Copy Link</span>
                  </span>
                  <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded font-bold">For Co-Organizers</span>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={shareLinks.editLink}
                    className={`flex-1 p-2 rounded-lg border font-mono text-[11px] select-all ${
                      darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                    }`}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareLinks.editLink);
                      showToast('Editable link copied to clipboard!', 'success');
                    }}
                    className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center space-x-1 shadow-xs"
                  >
                    <Copy size={13} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {activeModal === 'tags' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Tag size={18} className="text-emerald-500" />
                <span>Grade Tag & Pastel Color Manager</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Current Tags List */}
            <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
              {tags.map(tag => (
                <div
                  key={tag.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-4 h-4 rounded-full border border-black/20 shadow-xs"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="font-bold">{tag.name}</span>
                  </div>
                  {!isReadOnly && (
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="text-slate-400 hover:text-red-500 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Create New Tag */}
            {!isReadOnly && (
              <form onSubmit={handleAddTag} className="space-y-3 border-t pt-3 border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-500">Add New Tag</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Faculty / VIP"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className={`flex-1 px-3 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-9 h-8 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                  >
                    Add Tag
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
                <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">{analyticsData.totalHours} hrs</div>
                <div className="text-[11px] text-slate-500 font-medium">Total Event Time</div>
              </div>
              <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-100'}`}>
                <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{analyticsData.totalActivities}</div>
                <div className="text-[11px] text-slate-500 font-medium">Scheduled Activities</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500">Breakdown by Grade Tag</h4>
              {analyticsData.tagBreakdown.map(tag => (
                <div key={tag.id} className="space-y-1 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                      <span>{tag.name}</span>
                    </span>
                    <span>{tag.hours} hrs ({tag.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${tag.percentage}%`,
                        backgroundColor: tag.color
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
                <span>Schedule & Grid Settings</span>
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
                <label className="block font-semibold mb-1 text-slate-500">Schedule Title</label>
                <input
                  type="text"
                  disabled={isReadOnly}
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
                    disabled={isReadOnly}
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
                    disabled={isReadOnly}
                    value={scheduleMeta.endDate}
                    onChange={(e) => setScheduleMeta({ ...scheduleMeta, endDate: e.target.value })}
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
                    disabled={isReadOnly}
                    value={scheduleMeta.startTime}
                    onChange={(e) => setScheduleMeta({ ...scheduleMeta, startTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-500">Grid End Time</label>
                  <input
                    type="time"
                    disabled={isReadOnly}
                    value={scheduleMeta.endTime}
                    onChange={(e) => setScheduleMeta({ ...scheduleMeta, endTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Offline JSON Backup section */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block font-semibold text-slate-500">Offline Backup File</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center justify-center space-x-1"
                  >
                    <Download size={14} />
                    <span>Export JSON</span>
                  </button>
                  {!isReadOnly && (
                    <label className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center justify-center space-x-1 cursor-pointer">
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
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md"
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
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold shadow-md"
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