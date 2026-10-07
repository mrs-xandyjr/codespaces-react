import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// Custom SVG Icons for SVG-level reliability & no external asset loading dependencies
const Icons = {
  Calendar: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Upload: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  Moon: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  Sun: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  PieChart: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  ),
  ZoomIn: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
    </svg>
  ),
  ZoomOut: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  MapPin: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Undo: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
    </svg>
  )
};

const PRESET_COLORS = [
  { name: 'Work', bg: '#3b82f6', border: '#1d4ed8', category: 'Work' },
  { name: 'Health', bg: '#10b981', border: '#047857', category: 'Health' },
  { name: 'Focus', bg: '#f43f5e', border: '#be123c', category: 'Focus' },
  { name: 'Meeting', bg: '#f59e0b', border: '#b45309', category: 'Meeting' },
  { name: 'Break', bg: '#14b8a6', border: '#0f766e', category: 'Break' },
  { name: 'Personal', bg: '#8b5cf6', border: '#6d28d9', category: 'Personal' },
  { name: 'Urgent', bg: '#ef4444', border: '#b91c1c', category: 'Urgent' },
  { name: 'Creative', bg: '#6366f1', border: '#4338ca', category: 'Creative' },
];

// Fixed target range: Jan 20, 2026 - Jan 27, 2026 (8 Days)
const DEFAULT_START_DATE = '2026-01-20';
const DEFAULT_END_DATE = '2026-01-27';

const minutesToFormattedTime = (totalMinutes) => {
  const mins = Math.max(0, Math.min(1439, totalMinutes));
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const minutesToInputTime = (totalMinutes) => {
  const mins = Math.max(0, Math.min(1439, totalMinutes));
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const inputTimeToMinutes = (timeStr) => {
  if (!timeStr) return 360;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const formatDuration = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const generateJan20Jan27SampleBlocks = () => {
  return [
    // Jan 20, 2026 (Tue)
    {
      id: 'sample-1',
      date: '2026-01-20',
      startMin: 6 * 60 + 30, // 06:30 AM
      duration: 45,
      title: 'Morning Gym & Stretch',
      description: 'Cardio warm-up and flexibility routine',
      category: 'Health',
      color: '#10b981',
      location: 'Fit Gym'
    },
    {
      id: 'sample-2',
      date: '2026-01-20',
      startMin: 8 * 60, // 08:00 AM
      duration: 30,
      title: 'Breakfast & News Triage',
      description: 'Morning espresso and industry updates',
      category: 'Personal',
      color: '#8b5cf6',
      location: 'Home Cafe'
    },
    {
      id: 'sample-3',
      date: '2026-01-20',
      startMin: 9 * 60, // 09:00 AM
      duration: 30,
      title: 'Q1 Kickoff & Team Standup',
      description: 'Aligning weekly sprint goals with team',
      category: 'Meeting',
      color: '#f59e0b',
      location: 'Zoom Room A'
    },
    {
      id: 'sample-4',
      date: '2026-01-20',
      startMin: 10 * 60, // 10:00 AM
      duration: 105, // 1h 45m
      title: 'Core Architecture Deep Work',
      description: 'Refactoring schedule grid state engine',
      category: 'Focus',
      color: '#f43f5e',
      location: 'Main Desk'
    },
    {
      id: 'sample-5',
      date: '2026-01-20',
      startMin: 12 * 60, // 12:00 PM
      duration: 60,
      title: 'Team Lunch Break',
      description: 'Fresh salad & social chat with peers',
      category: 'Break',
      color: '#14b8a6',
      location: 'Cafeteria'
    },
    {
      id: 'sample-6',
      date: '2026-01-20',
      startMin: 13 * 60 + 30, // 01:30 PM
      duration: 90,
      title: 'Product Strategy Review',
      description: 'Quarterly roadmap sync with stakeholders',
      category: 'Work',
      color: '#3b82f6',
      location: 'Conference Rm 3'
    },
    {
      id: 'sample-7',
      date: '2026-01-20',
      startMin: 15 * 60 + 30, // 03:30 PM
      duration: 60,
      title: 'Client Sync - Acme Corp',
      description: 'Demoing 5-minute precision scheduler',
      category: 'Meeting',
      color: '#f59e0b',
      location: 'Meet Link'
    },
    {
      id: 'sample-8',
      date: '2026-01-20',
      startMin: 17 * 60 + 15, // 05:15 PM
      duration: 30,
      title: 'Daily Wrap-Up & Notes',
      description: 'Logging progress and tomorrow priorities',
      category: 'Work',
      color: '#3b82f6',
      location: 'Desk'
    },

    // Jan 21, 2026 (Wed)
    {
      id: 'sample-9',
      date: '2026-01-21',
      startMin: 6 * 60 + 15, // 06:15 AM
      duration: 45,
      title: 'Sunrise Jog',
      description: '5k park trail run',
      category: 'Health',
      color: '#10b981',
      location: 'City Park'
    },
    {
      id: 'sample-10',
      date: '2026-01-21',
      startMin: 8 * 60 + 30, // 08:30 AM
      duration: 45,
      title: 'Email Triage & Planning',
      description: 'Clear inbox zero',
      category: 'Work',
      color: '#3b82f6',
      location: 'Office'
    },
    {
      id: 'sample-11',
      date: '2026-01-21',
      startMin: 9 * 60 + 30, // 09:30 AM
      duration: 60,
      title: 'Frontend Refactoring',
      description: 'Optimizing touch drag & snap events',
      category: 'Focus',
      color: '#f43f5e',
      location: 'IDE'
    },
    {
      id: 'sample-12',
      date: '2026-01-21',
      startMin: 11 * 60, // 11:00 AM
      duration: 60,
      title: 'Design Sprint Workshop',
      description: 'Collaborative UI wireframing session',
      category: 'Work',
      color: '#3b82f6',
      location: 'Figma / Rm B'
    },
    {
      id: 'sample-13',
      date: '2026-01-21',
      startMin: 12 * 60 + 15, // 12:15 PM
      duration: 45,
      title: 'Healthy Lunch',
      description: 'Protein bowl & relaxation',
      category: 'Break',
      color: '#14b8a6',
      location: 'Terrace'
    },
    {
      id: 'sample-14',
      date: '2026-01-21',
      startMin: 13 * 60 + 30, // 01:30 PM
      duration: 120, // 2h
      title: 'System API Integration',
      description: 'Building JSON/CSV exporter & storage handlers',
      category: 'Focus',
      color: '#f43f5e',
      location: 'Desk'
    },
    {
      id: 'sample-15',
      date: '2026-01-21',
      startMin: 16 * 60, // 04:00 PM
      duration: 60,
      title: '1-on-1 Mentorship',
      description: 'Career growth & technical feedback',
      category: 'Meeting',
      color: '#f59e0b',
      location: 'Coffee Corner'
    },
    {
      id: 'sample-16',
      date: '2026-01-21',
      startMin: 17 * 60 + 15, // 05:15 PM
      duration: 35,
      title: 'Planning Tomorrow Sprint',
      description: 'Updating task backlog',
      category: 'Work',
      color: '#3b82f6',
      location: 'Desk'
    },

    // Jan 22, 2026 (Thu)
    {
      id: 'sample-17',
      date: '2026-01-22',
      startMin: 6 * 60 + 45, // 06:45 AM
      duration: 45,
      title: 'Yoga & Mindfulness',
      description: 'Breathing exercises & gentle stretch',
      category: 'Health',
      color: '#10b981',
      location: 'Home Studio'
    },
    {
      id: 'sample-18',
      date: '2026-01-22',
      startMin: 8 * 60 + 30, // 08:30 AM
      duration: 60,
      title: 'Technical Reading',
      description: 'Web Application Performance whitepapers',
      category: 'Focus',
      color: '#f43f5e',
      location: 'Library'
    },
    {
      id: 'sample-19',
      date: '2026-01-22',
      startMin: 10 * 60, // 10:00 AM
      duration: 90,
      title: 'Client Proposal Pitch',
      description: 'Presenting modern scheduling platform',
      category: 'Meeting',
      color: '#f59e0b',
      location: 'Boardroom'
    },
    {
      id: 'sample-20',
      date: '2026-01-22',
      startMin: 12 * 60, // 12:00 PM
      duration: 60,
      title: 'Lunch with Alex',
      description: 'Catching up on industry trends',
      category: 'Personal',
      color: '#8b5cf6',
      location: 'Bistro'
    },
    {
      id: 'sample-21',
      date: '2026-01-22',
      startMin: 13 * 60 + 30, // 01:30 PM
      duration: 90,
      title: 'Code Review & Testing',
      description: 'Reviewing pull requests and writing tests',
      category: 'Work',
      color: '#3b82f6',
      location: 'GitHub'
    },
    {
      id: 'sample-22',
      date: '2026-01-22',
      startMin: 15 * 60 + 30, // 03:30 PM
      duration: 90,
      title: 'UI/UX Polish',
      description: 'Fine-tuning Tailwind colors & animations',
      category: 'Work',
      color: '#3b82f6',
      location: 'Figma'
    },
    {
      id: 'sample-23',
      date: '2026-01-22',
      startMin: 17 * 60 + 15, // 05:15 PM
      duration: 30,
      title: 'Inbox Zero & Admin',
      description: 'Cleaning up slack messages and files',
      category: 'Work',
      color: '#3b82f6',
      location: 'Desk'
    },

    // Jan 23, 2026 (Fri)
    {
      id: 'sample-24',
      date: '2026-01-23',
      startMin: 6 * 60 + 30, // 06:30 AM
      duration: 45,
      title: 'Strength Workout',
      description: 'Upper body weight session',
      category: 'Health',
      color: '#10b981',
      location: 'Fit Gym'
    },
    {
      id: 'sample-25',
      date: '2026-01-23',
      startMin: 9 * 60, // 09:00 AM
      duration: 30,
      title: 'Friday Standup',
      description: 'Quick check-in before release',
      category: 'Meeting',
      color: '#f59e0b',
      location: 'Zoom'
    },
    {
      id: 'sample-26',
      date: '2026-01-23',
      startMin: 9 * 60 + 45, // 09:45 AM
      duration: 105,
      title: 'Release Deployment & QA',
      description: 'Production push & sanity testing',
      category: 'Work',
      color: '#3b82f6',
      location: 'DevOps Desk'
    },
    {
      id: 'sample-27',
      date: '2026-01-23',
      startMin: 12 * 60, // 12:00 PM
      duration: 60,
      title: 'Friday Team Pizza Lunch',
      description: 'Celebrating successful weekly release',
      category: 'Break',
      color: '#14b8a6',
      location: 'Lounge'
    },
    {
      id: 'sample-28',
      date: '2026-01-23',
      startMin: 13 * 60 + 30, // 01:30 PM
      duration: 120,
      title: 'Hackathon & Innovation Lab',
      description: 'Exploring AI smart auto-scheduling features',
      category: 'Focus',
      color: '#f43f5e',
      location: 'Lab'
    },
    {
      id: 'sample-29',
      date: '2026-01-23',
      startMin: 16 * 60, // 04:00 PM
      duration: 60,
      title: 'Sprint Retro & Demo',
      description: 'Demoing new schedule features to team',
      category: 'Meeting',
      color: '#f59e0b',
      location: 'Main Hall'
    },
    {
      id: 'sample-30',
      date: '2026-01-23',
      startMin: 17 * 60, // 05:00 PM
      duration: 30,
      title: 'Weekly Clean Up',
      description: 'Closing tabs and logging off for weekend',
      category: 'Work',
      color: '#3b82f6',
      location: 'Desk'
    },

    // Jan 24, 2026 (Sat)
    {
      id: 'sample-31',
      date: '2026-01-24',
      startMin: 7 * 60, // 07:00 AM
      duration: 90,
      title: 'Morning Trail Run',
      description: 'Outdoor fresh air cardio',
      category: 'Health',
      color: '#10b981',
      location: 'Mountain Park'
    },
    {
      id: 'sample-32',
      date: '2026-01-24',
      startMin: 9 * 60 + 30, // 09:30 AM
      duration: 120,
      title: 'Farmers Market & Coffee',
      description: 'Buying fresh organic groceries',
      category: 'Personal',
      color: '#8b5cf6',
      location: 'Town Square'
    },
    {
      id: 'sample-33',
      date: '2026-01-24',
      startMin: 12 * 60, // 12:00 PM
      duration: 120,
      title: 'Family Brunch & Walk',
      description: 'Weekend leisure time',
      category: 'Personal',
      color: '#8b5cf6',
      location: 'Downtown'
    },
    {
      id: 'sample-34',
      date: '2026-01-24',
      startMin: 14 * 60 + 30, // 02:30 PM
      duration: 120,
      title: 'Side Project Coding',
      description: 'Building custom React UI widgets',
      category: 'Focus',
      color: '#f43f5e',
      location: 'Home Office'
    },
    {
      id: 'sample-35',
      date: '2026-01-24',
      startMin: 17 * 60, // 05:00 PM
      duration: 60,
      title: 'Reading Fiction & Relaxation',
      description: 'Unwinding with a book',
      category: 'Break',
      color: '#14b8a6',
      location: 'Living Room'
    },

    // Jan 25, 2026 (Sun)
    {
      id: 'sample-36',
      date: '2026-01-25',
      startMin: 8 * 60, // 08:00 AM
      duration: 60,
      title: 'Sunday Pancakes & Coffee',
      description: 'Relaxed morning routine',
      category: 'Personal',
      color: '#8b5cf6',
      location: 'Kitchen'
    },
    {
      id: 'sample-37',
      date: '2026-01-25',
      startMin: 10 * 60, // 10:00 AM
      duration: 120,
      title: 'Park Outing & Photography',
      description: 'Nature walk with camera',
      category: 'Personal',
      color: '#8b5cf6',
      location: 'Botanical Garden'
    },
    {
      id: 'sample-38',
      date: '2026-01-25',
      startMin: 13 * 60, // 01:00 PM
      duration: 90,
      title: 'Meal Prep for Week',
      description: 'Cooking healthy lunches for Jan 26-27',
      category: 'Health',
      color: '#10b981',
      location: 'Kitchen'
    },
    {
      id: 'sample-39',
      date: '2026-01-25',
      startMin: 15 * 60, // 03:00 PM
      duration: 90,
      title: 'Book Club Discussion',
      description: 'Monthly virtual fiction review',
      category: 'Personal',
      color: '#8b5cf6',
      location: 'Zoom'
    },
    {
      id: 'sample-40',
      date: '2026-01-25',
      startMin: 17 * 60, // 05:00 PM
      duration: 45,
      title: 'Weekly Goals & Organization',
      description: 'Reviewing schedule for Jan 26-27',
      category: 'Work',
      color: '#3b82f6',
      location: 'Desk'
    },

    // Jan 26, 2026 (Mon)
    {
      id: 'sample-41',
      date: '2026-01-26',
      startMin: 6 * 60 + 30, // 06:30 AM
      duration: 45,
      title: 'Morning Gym',
      description: 'Leg day session',
      category: 'Health',
      color: '#10b981',
      location: 'Fit Gym'
    },
    {
      id: 'sample-42',
      date: '2026-01-26',
      startMin: 8 * 60 + 30, // 08:30 AM
      duration: 60,
      title: 'Weekly Goal Alignment',
      description: 'Setting priorities for final week sprint',
      category: 'Work',
      color: '#3b82f6',
      location: 'Desk'
    },
    {
      id: 'sample-43',
      date: '2026-01-26',
      startMin: 10 * 60, // 10:00 AM
      duration: 120,
      title: 'Backend Database Migration',
      description: 'Executing database schema updates',
      category: 'Focus',
      color: '#f43f5e',
      location: 'Terminal'
    },
    {
      id: 'sample-44',
      date: '2026-01-26',
      startMin: 12 * 60 + 15, // 12:15 PM
      duration: 45,
      title: 'Lunch & Rest',
      description: 'Quick meal and short walk',
      category: 'Break',
      color: '#14b8a6',
      location: 'Cafeteria'
    },
    {
      id: 'sample-45',
      date: '2026-01-26',
      startMin: 13 * 60 + 30, // 01:30 PM
      duration: 90,
      title: 'Executive Stakeholder Sync',
      description: 'Presenting monthly project metrics',
      category: 'Meeting',
      color: '#f59e0b',
      location: 'Executive Suite'
    },
    {
      id: 'sample-46',
      date: '2026-01-26',
      startMin: 15 * 60 + 30, // 03:30 PM
      duration: 90,
      title: 'Security Audit & Patching',
      description: 'Reviewing dependencies and SSL certs',
      category: 'Work',
      color: '#3b82f6',
      location: 'Desk'
    },
    {
      id: 'sample-47',
      date: '2026-01-26',
      startMin: 17 * 60 + 15, // 05:15 PM
      duration: 30,
      title: 'Daily Recap',
      description: 'Wrapping up tickets',
      category: 'Work',
      color: '#3b82f6',
      location: 'Desk'
    },

    // Jan 27, 2026 (Tue)
    {
      id: 'sample-48',
      date: '2026-01-27',
      startMin: 6 * 60 + 30, // 06:30 AM
      duration: 45,
      title: 'Morning Walk & Podcast',
      description: 'Brisk walk around neighborhood',
      category: 'Health',
      color: '#10b981',
      location: 'Outdoors'
    },
    {
      id: 'sample-49',
      date: '2026-01-27',
      startMin: 8 * 60 + 30, // 08:30 AM
      duration: 60,
      title: 'Performance Review Prep',
      description: 'Assembling self-evaluation documents',
      category: 'Work',
      color: '#3b82f6',
      location: 'Desk'
    },
    {
      id: 'sample-50',
      date: '2026-01-27',
      startMin: 10 * 60, // 10:00 AM
      duration: 90,
      title: 'Cross-Functional Design Review',
      description: 'Final walkthrough of 8-day planner app',
      category: 'Meeting',
      color: '#f59e0b',
      location: 'Conf Rm 1'
    },
    {
      id: 'sample-51',
      date: '2026-01-27',
      startMin: 12 * 60, // 12:00 PM
      duration: 60,
      title: 'Lunch Break',
      description: 'Recharging for afternoon session',
      category: 'Break',
      color: '#14b8a6',
      location: 'Bistro'
    },
    {
      id: 'sample-52',
      date: '2026-01-27',
      startMin: 13 * 60 + 30, // 01:30 PM
      duration: 120,
      title: 'Feature Development Sprint',
      description: 'Adding overlapping block side-by-side math',
      category: 'Focus',
      color: '#f43f5e',
      location: 'IDE'
    },
    {
      id: 'sample-53',
      date: '2026-01-27',
      startMin: 16 * 60, // 04:00 PM
      duration: 60,
      title: 'Documentation & Knowledge Sharing',
      description: 'Writing developer documentation',
      category: 'Work',
      color: '#3b82f6',
      location: 'Wiki'
    },
    {
      id: 'sample-54',
      date: '2026-01-27',
      startMin: 17 * 60 + 15, // 05:15 PM
      duration: 30,
      title: '2-Week Schedule Retrospective',
      description: 'Evaluating schedule utilization & achievements',
      category: 'Meeting',
      color: '#f59e0b',
      location: 'Zoom Room'
    }
  ];
};

export default function App() {
  // Fixed Schedule Scope default: Jan 20, 2026 to Jan 27, 2026
  const [startDateStr, setStartDateStr] = useState(DEFAULT_START_DATE);
  const [numDays, setNumDays] = useState(8); // Default 8 days: Jan 20 - Jan 27

  // Fixed Daily Time Window default: 6:00 AM (360m) to 6:00 PM (1080m)
  const [timeWindowMode, setTimeWindowMode] = useState('6am-6pm'); // '6am-6pm' or 'full24h'
  
  // Grid Zoom Ratio (Pixels per minute)
  const [slotHeightRatio, setSlotHeightRatio] = useState(1.25); // ~15px per 12 mins

  // Theme & Filters
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Activity Blocks state with LocalStorage persistence
  const [blocks, setBlocks] = useState(() => {
    const saved = localStorage.getItem('jan20_jan27_planner_blocks_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved schedule:', e);
      }
    }
    return generateJan20Jan27SampleBlocks();
  });

  // Save changes to LocalStorage
  useEffect(() => {
    localStorage.setItem('jan20_jan27_planner_blocks_v2', JSON.stringify(blocks));
  }, [blocks]);

  // Dark Mode Class Sync
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const [editingBlock, setEditingBlock] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [undoToast, setUndoToast] = useState(null);

  // Interactive Dragging / Resizing State
  const [interaction, setInteraction] = useState(null);
  // interaction = { type: 'drag'|'resize-top'|'resize-bottom'|'create', blockId, startX, startY, origDate, origStartMin, origDuration, tempDate, tempStartMin, tempDuration }

  const gridContainerRef = useRef(null);

  // Daily visible minute boundaries
  const visibleStartMin = timeWindowMode === '6am-6pm' ? 6 * 60 : 0; // 6:00 AM (360)
  const visibleEndMin = timeWindowMode === '6am-6pm' ? 18 * 60 : 24 * 60; // 6:00 PM (1080)
  const totalVisibleMins = visibleEndMin - visibleStartMin; // 720 mins (12 hrs)

  const daysList = useMemo(() => {
    const list = [];
    const baseDate = new Date(startDateStr);
    for (let i = 0; i < numDays; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      list.push({ dateStr, dayName, monthDay, isWeekend, fullDateObj: d });
    }
    return list;
  }, [startDateStr, numDays]);

  const getYToMinutes = useCallback(
    (offsetY) => {
      const minFromTop = offsetY / slotHeightRatio;
      const rawMin = visibleStartMin + minFromTop;
      // Snap strictly to nearest 5 minutes
      const snapped = Math.round(rawMin / 5) * 5;
      return Math.max(visibleStartMin, Math.min(visibleEndMin - 5, snapped));
    },
    [slotHeightRatio, visibleStartMin, visibleEndMin]
  );

  useEffect(() => {
    if (!interaction) return;

    const handlePointerMove = (e) => {
      if (!gridContainerRef.current) return;
      const rect = gridContainerRef.current.getBoundingClientRect();

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Determine date column
      const colWidth = rect.width / daysList.length;
      const targetColIndex = Math.max(0, Math.min(daysList.length - 1, Math.floor(mouseX / colWidth)));
      const targetDateStr = daysList[targetColIndex].dateStr;

      const snappedMin = getYToMinutes(mouseY);

      setInteraction((prev) => {
        if (!prev) return null;
        if (prev.type === 'drag') {
          const maxStart = visibleEndMin - prev.origDuration;
          const newStart = Math.max(visibleStartMin, Math.min(maxStart, snappedMin));
          return {
            ...prev,
            tempDate: targetDateStr,
            tempStartMin: newStart
          };
        } else if (prev.type === 'resize-bottom') {
          const newDuration = Math.max(5, snappedMin - prev.tempStartMin);
          const maxDuration = visibleEndMin - prev.tempStartMin;
          return {
            ...prev,
            tempDuration: Math.min(maxDuration, newDuration)
          };
        } else if (prev.type === 'resize-top') {
          const currentEndMin = prev.origStartMin + prev.origDuration;
          const newStartMin = Math.min(currentEndMin - 5, Math.max(visibleStartMin, snappedMin));
          const newDuration = currentEndMin - newStartMin;
          return {
            ...prev,
            tempStartMin: newStartMin,
            tempDuration: newDuration
          };
        } else if (prev.type === 'create') {
          const start = Math.min(prev.origStartMin, snappedMin);
          const end = Math.max(prev.origStartMin + 5, snappedMin + 5);
          return {
            ...prev,
            tempDate: targetDateStr,
            tempStartMin: start,
            tempDuration: end - start
          };
        }
        return prev;
      });
    };

    const handlePointerUp = () => {
      if (!interaction) return;

      if (interaction.type === 'create') {
        const newBlock = {
          id: `block-${Date.now()}`,
          date: interaction.tempDate,
          startMin: interaction.tempStartMin,
          duration: Math.max(15, interaction.tempDuration),
          title: 'New Activity',
          description: '',
          category: 'Work',
          color: PRESET_COLORS[0].bg,
          location: ''
        };
        setEditingBlock(newBlock);
        setIsModalOpen(true);
      } else {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === interaction.blockId
              ? {
                  ...b,
                  date: interaction.tempDate,
                  startMin: interaction.tempStartMin,
                  duration: interaction.tempDuration
                }
              : b
          )
        );
      }
      setInteraction(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [interaction, daysList, getYToMinutes, visibleStartMin, visibleEndMin]);

  const handleStartDrag = (e, block, type = 'drag') => {
    e.stopPropagation();
    e.preventDefault();

    setInteraction({
      type,
      blockId: block.id,
      startX: e.clientX,
      startY: e.clientY,
      origDate: block.date,
      origStartMin: block.startMin,
      origDuration: block.duration,
      tempDate: block.date,
      tempStartMin: block.startMin,
      tempDuration: block.duration
    });
  };

  const handleGridMouseDown = (e) => {
    if (e.target.dataset.gridBg !== 'true') return;

    const rect = gridContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const colWidth = rect.width / daysList.length;
    const targetColIndex = Math.max(0, Math.min(daysList.length - 1, Math.floor(mouseX / colWidth)));
    const targetDateStr = daysList[targetColIndex].dateStr;
    const snappedMin = getYToMinutes(mouseY);

    setInteraction({
      type: 'create',
      blockId: null,
      startX: e.clientX,
      startY: e.clientY,
      origDate: targetDateStr,
      origStartMin: snappedMin,
      origDuration: 15,
      tempDate: targetDateStr,
      tempStartMin: snappedMin,
      tempDuration: 15
    });
  };

  const handleOpenNewModal = () => {
    const newBlock = {
      id: `block-${Date.now()}`,
      date: daysList[0]?.dateStr || DEFAULT_START_DATE,
      startMin: 9 * 60, // 9:00 AM
      duration: 60,
      title: 'New Activity',
      description: '',
      category: 'Work',
      color: PRESET_COLORS[0].bg,
      location: ''
    };
    setEditingBlock(newBlock);
    setIsModalOpen(true);
  };

  const handleSaveModal = (updatedBlock) => {
    setBlocks((prev) => {
      const exists = prev.some((b) => b.id === updatedBlock.id);
      if (exists) {
        return prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b));
      } else {
        return [...prev, updatedBlock];
      }
    });
    setIsModalOpen(false);
    setEditingBlock(null);
  };

  const handleDeleteBlock = (blockId) => {
    const targetBlock = blocks.find((b) => b.id === blockId);
    if (!targetBlock) return;

    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setIsModalOpen(false);

    if (undoToast?.timeoutId) clearTimeout(undoToast.timeoutId);
    const timeoutId = setTimeout(() => {
      setUndoToast(null);
    }, 6000);

    setUndoToast({
      block: targetBlock,
      message: `Deleted "${targetBlock.title}"`,
      timeoutId
    });
  };

  const handleUndoDelete = () => {
    if (!undoToast) return;
    setBlocks((prev) => [...prev, undoToast.block]);
    if (undoToast.timeoutId) clearTimeout(undoToast.timeoutId);
    setUndoToast(null);
  };

  const handleDuplicateBlock = (blockToDuplicate) => {
    const duplicated = {
      ...blockToDuplicate,
      id: `block-${Date.now()}`,
      title: `${blockToDuplicate.title} (Copy)`,
      startMin: Math.min(visibleEndMin - blockToDuplicate.duration, blockToDuplicate.startMin + 30)
    };
    setBlocks((prev) => [...prev, duplicated]);
  };

  const handleResetToSample = () => {
    setStartDateStr(DEFAULT_START_DATE);
    setNumDays(8);
    setTimeWindowMode('6am-6pm');
    setBlocks(generateJan20Jan27SampleBlocks());
  };

  const filteredBlocks = useMemo(() => {
    return blocks.filter((b) => {
      const matchesSearch =
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.location && b.location.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCat = selectedCategory === 'All' || b.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [blocks, searchTerm, selectedCategory]);

  const layoutBlocks = useMemo(() => {
    // Organize blocks by date
    const dateMap = {};
    daysList.forEach((d) => {
      dateMap[d.dateStr] = [];
    });

    filteredBlocks.forEach((b) => {
      if (dateMap[b.date]) {
        dateMap[b.date].push(b);
      }
    });

    const positioned = [];

    Object.keys(dateMap).forEach((dateStr) => {
      const dayBlocks = dateMap[dateStr].sort((a, b) => a.startMin - b.startMin || b.duration - a.duration);

      // Simple greedy column layout calculation for overlapping intervals
      const columns = []; // array of end times for each column

      dayBlocks.forEach((block) => {
        const blockEnd = block.startMin + block.duration;
        let placed = false;

        for (let colIdx = 0; colIdx < columns.length; colIdx++) {
          if (columns[colIdx] <= block.startMin) {
            columns[colIdx] = blockEnd;
            block._colIndex = colIdx;
            placed = true;
            break;
          }
        }

        if (!placed) {
          block._colIndex = columns.length;
          columns.push(blockEnd);
        }
      });

      // Assign total columns for overlapping cluster calculation
      dayBlocks.forEach((block) => {
        const blockEnd = block.startMin + block.duration;
        // Count how many blocks overlap with this block
        const overlapping = dayBlocks.filter(
          (other) => block.startMin < other.startMin + other.duration && blockEnd > other.startMin
        );
        const maxCol = Math.max(...overlapping.map((o) => o._colIndex || 0), 0) + 1;
        block._totalCols = Math.max(maxCol, 1);
        positioned.push(block);
      });
    });

    return positioned;
  }, [filteredBlocks, daysList]);

  const analyticsSummary = useMemo(() => {
    const categoryTotals = {};
    let totalScheduledMins = 0;

    blocks.forEach((b) => {
      const mins = b.duration || 0;
      totalScheduledMins += mins;
      const cat = b.category || 'Work';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + mins;
    });

    const totalAvailableMins = daysList.length * totalVisibleMins;
    const utilizationPercent = Math.min(100, Math.round((totalScheduledMins / totalAvailableMins) * 100));

    const categoryList = Object.entries(categoryTotals)
      .map(([cat, mins]) => ({
        category: cat,
        mins,
        hours: (mins / 60).toFixed(1),
        percent: totalScheduledMins > 0 ? Math.round((mins / totalScheduledMins) * 100) : 0
      }))
      .sort((a, b) => b.mins - a.mins);

    return {
      totalHours: (totalScheduledMins / 60).toFixed(1),
      totalBlocks: blocks.length,
      utilizationPercent,
      categoryList
    };
  }, [blocks, daysList, totalVisibleMins]);

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(blocks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `schedule-jan20-jan27-${startDateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed)) {
            setBlocks(parsed);
          }
        } catch (err) {
          alert('Invalid schedule JSON file format.');
        }
      };
    }
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ID,Date,Start Time,End Time,Duration (Mins),Title,Category,Location,Description\n';

    blocks.forEach((b) => {
      const startStr = minutesToFormattedTime(b.startMin);
      const endStr = minutesToFormattedTime(b.startMin + b.duration);
      const row = [
        b.id,
        b.date,
        `"${startStr}"`,
        `"${endStr}"`,
        b.duration,
        `"${b.title.replace(/"/g, '""')}"`,
        `"${(b.category || '').replace(/"/g, '""')}"`,
        `"${(b.location || '').replace(/"/g, '""')}"`,
        `"${(b.description || '').replace(/"/g, '""')}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `schedule-jan20-jan27-${startDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Top Header Navigation */}
      <header className={`sticky top-0 z-30 px-4 py-3 border-b shadow-sm backdrop-blur-md transition-colors ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
          
          {/* Logo & Schedule Scope Title */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25">
                <Icons.Calendar />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold leading-tight tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                    Schedule Planner
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Jan 20 – Jan 27, 2026
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">5-Minute Precision Grid • 6:00 AM – 6:00 PM Scope</p>
              </div>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
            >
              {darkMode ? <Icons.Sun /> : <Icons.Moon />}
            </button>
          </div>

          {/* Center Date Quick Jump & Scope controls */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold w-full lg:w-auto justify-center">
            <button
              onClick={() => {
                setStartDateStr('2026-01-20');
                setNumDays(8);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                startDateStr === '2026-01-20' && numDays === 8
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Jan 20 – Jan 27 (8 Days)
            </button>

            <button
              onClick={() => {
                setStartDateStr('2026-01-20');
                setNumDays(4);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                startDateStr === '2026-01-20' && numDays === 4
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Jan 20 – 23
            </button>

            <button
              onClick={() => {
                setStartDateStr('2026-01-24');
                setNumDays(4);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                startDateStr === '2026-01-24' && numDays === 4
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Jan 24 – 27
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                showAnalytics
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icons.PieChart />
              <span>Analytics</span>
            </button>

            <button
              onClick={handleResetToSample}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              title="Reset Schedule back to Jan 20-27 defaults"
            >
              <Icons.Sparkles />
              <span>Reset Defaults</span>
            </button>

            <button
              onClick={handleOpenNewModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all"
            >
              <Icons.Plus />
              <span>Add Activity</span>
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="hidden lg:flex p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Toggle Dark/Light Mode"
            >
              {darkMode ? <Icons.Sun /> : <Icons.Moon />}
            </button>
          </div>

        </div>
      </header>

      <div className={`px-4 py-2.5 border-b text-xs transition-colors ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/70 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Time Scope & Date Picker */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="font-semibold text-slate-600 dark:text-slate-400">Start Date:</label>
              <input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="font-semibold text-slate-600 dark:text-slate-400">Time Scope:</label>
              <button
                onClick={() => setTimeWindowMode(timeWindowMode === '6am-6pm' ? 'full24h' : '6am-6pm')}
                className={`px-3 py-1 rounded-lg border font-bold transition-all ${
                  timeWindowMode === '6am-6pm'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                }`}
              >
                {timeWindowMode === '6am-6pm' ? '6:00 AM – 6:00 PM (12 Hours)' : 'Full Day (24 Hours)'}
              </button>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2 flex-grow max-w-md">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 pointer-events-none">
                <Icons.Search />
              </span>
              <input
                type="text"
                placeholder="Search activities or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="All">All Categories</option>
              {PRESET_COLORS.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category}
                </option>
              ))}
            </select>
          </div>

          {/* Zoom Slider & Export Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5" title="Adjust vertical grid zoom scale">
              <span className="text-slate-400"><Icons.ZoomOut /></span>
              <input
                type="range"
                min="0.8"
                max="2.2"
                step="0.1"
                value={slotHeightRatio}
                onChange={(e) => setSlotHeightRatio(parseFloat(e.target.value))}
                className="w-20 accent-indigo-600 cursor-pointer"
              />
              <span className="text-slate-400"><Icons.ZoomIn /></span>
            </div>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-1">
              <button
                onClick={handleExportJSON}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title="Export Schedule JSON"
              >
                <Icons.Download />
              </button>

              <label
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Import Schedule JSON"
              >
                <Icons.Upload />
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>

              <button
                onClick={handleExportCSV}
                className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Export CSV Spreadsheet"
              >
                CSV
              </button>
            </div>
          </div>

        </div>
      </div>

      {showAnalytics && (
        <div className={`p-4 border-b transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-indigo-50/60 border-indigo-100'}`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <Icons.PieChart />
                <span>Schedule Utilization & Category Breakdown</span>
              </h3>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-4">
                <span>
                  Total Scheduled: <strong className="text-indigo-600 dark:text-indigo-400 text-sm">{analyticsSummary.totalHours} hrs</strong> ({analyticsSummary.totalBlocks} activities)
                </span>
                <span>
                  6 AM – 6 PM Utilization: <strong className="text-emerald-600 dark:text-emerald-400 text-sm">{analyticsSummary.utilizationPercent}%</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {analyticsSummary.categoryList.map((item) => {
                const colorObj = PRESET_COLORS.find((c) => c.category === item.category);
                const bgHex = colorObj ? colorObj.bg : '#6366f1';
                return (
                  <div key={item.category} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate text-slate-700 dark:text-slate-200">{item.category}</span>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bgHex }} />
                    </div>
                    <div className="mt-2">
                      <div className="text-base font-extrabold text-slate-900 dark:text-white">{item.hours}h</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{item.percent}% of schedule</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto p-2 sm:p-4 relative">
        <div className="max-w-7xl mx-auto border rounded-2xl shadow-xl overflow-hidden flex flex-col bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          
          {/* Day Headers Row */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur">
            {/* Time Corner Column */}
            <div className="w-16 sm:w-20 flex-shrink-0 p-2 text-center border-r border-slate-200 dark:border-slate-700 flex items-center justify-center font-extrabold text-[11px] text-slate-500 dark:text-slate-400 tracking-wider">
              TIME
            </div>

            {/* Days Columns Headers */}
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysList.length}, minmax(0, 1fr))` }}>
              {daysList.map((dayItem) => {
                const dayMins = blocks
                  .filter((b) => b.date === dayItem.dateStr)
                  .reduce((acc, b) => acc + (b.duration || 0), 0);
                const dayHours = (dayMins / 60).toFixed(1);

                return (
                  <div
                    key={dayItem.dateStr}
                    className={`p-2 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center ${
                      dayItem.isWeekend ? 'bg-slate-200/50 dark:bg-slate-800/40' : ''
                    }`}
                  >
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                      {dayItem.dayName}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100">
                      {dayItem.monthDay}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                      {dayHours}h scheduled
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex relative">
            
            {/* Time Slot Labels Column */}
            <div className="w-16 sm:w-20 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 select-none">
              {Array.from({ length: totalVisibleMins / 60 }, (_, i) => {
                const hourMin = visibleStartMin + i * 60;
                const heightPx = 60 * slotHeightRatio;
                return (
                  <div
                    key={hourMin}
                    style={{ height: `${heightPx}px` }}
                    className="border-b border-slate-200/80 dark:border-slate-800/80 text-[11px] font-bold text-slate-400 dark:text-slate-500 pr-2 pt-1 text-right"
                  >
                    {minutesToFormattedTime(hourMin)}
                  </div>
                );
              })}
            </div>

            {/* Grid Area with 5-minute Snapping Canvas */}
            <div
              ref={gridContainerRef}
              onMouseDown={handleGridMouseDown}
              data-grid-bg="true"
              className="flex-1 relative cursor-crosshair select-none min-w-0"
              style={{ height: `${totalVisibleMins * slotHeightRatio}px` }}
            >
              {/* Subdivision Grid Lines (5 min dashed, 30 min half-hour, 60 min hour) */}
              {Array.from({ length: totalVisibleMins / 5 }, (_, i) => {
                const stepMins = i * 5;
                const topPx = stepMins * slotHeightRatio;
                const isHour = stepMins % 60 === 0;
                const isHalfHour = stepMins % 30 === 0;

                return (
                  <div
                    key={stepMins}
                    data-grid-bg="true"
                    style={{ top: `${topPx}px` }}
                    className={`absolute left-0 right-0 pointer-events-none ${
                      isHour
                        ? 'border-b border-slate-300 dark:border-slate-700/80'
                        : isHalfHour
                        ? 'border-b border-slate-200/60 dark:border-slate-800/60'
                        : 'border-b border-dashed border-slate-100/50 dark:border-slate-800/20'
                    }`}
                  />
                );
              })}

              {/* Vertical Column Day Dividers */}
              <div
                data-grid-bg="true"
                className="absolute inset-0 grid pointer-events-none"
                style={{ gridTemplateColumns: `repeat(${daysList.length}, minmax(0, 1fr))` }}
              >
                {daysList.map((d) => (
                  <div key={d.dateStr} data-grid-bg="true" className="border-r last:border-r-0 border-slate-200/60 dark:border-slate-800/60 h-full" />
                ))}
              </div>

              {layoutBlocks.map((block) => {
                const dayIndex = daysList.findIndex((d) => d.dateStr === block.date);
                if (dayIndex === -1) return null;

                const colWidthPercent = 100 / daysList.length;

                // Handle Dragging state calculation
                const isDragging = interaction && interaction.blockId === block.id;
                const displayDate = isDragging ? interaction.tempDate : block.date;
                const displayStartMin = isDragging ? interaction.tempStartMin : block.startMin;
                const displayDuration = isDragging ? interaction.tempDuration : block.duration;

                const displayDayIndex = daysList.findIndex((d) => d.dateStr === displayDate);
                if (displayDayIndex === -1) return null;

                // Side-by-side overlapping column width calculation
                const totalOverlapCols = block._totalCols || 1;
                const colIndexInsideDay = block._colIndex || 0;
                const subColWidthPercent = colWidthPercent / totalOverlapCols;
                const displayLeftPercent = displayDayIndex * colWidthPercent + colIndexInsideDay * subColWidthPercent;

                const topPx = (displayStartMin - visibleStartMin) * slotHeightRatio;
                const heightPx = Math.max(14, displayDuration * slotHeightRatio);

                // Skip rendering if block is completely outside current visible time window
                if (topPx + heightPx < 0 || topPx > totalVisibleMins * slotHeightRatio) return null;

                return (
                  <div
                    key={block.id}
                    onMouseDown={(e) => handleStartDrag(e, block, 'drag')}
                    style={{
                      left: `${displayLeftPercent}%`,
                      width: `${subColWidthPercent}%`,
                      top: `${topPx}px`,
                      height: `${heightPx}px`,
                      backgroundColor: block.color || '#3b82f6'
                    }}
                    className={`absolute p-1.5 rounded-xl shadow-md border border-black/10 text-white transition-shadow cursor-grab active:cursor-grabbing overflow-hidden group flex flex-col justify-between ${
                      isDragging ? 'z-30 opacity-90 ring-4 ring-indigo-400 scale-[0.98]' : 'z-10 hover:z-20 hover:shadow-xl'
                    }`}
                  >
                    {/* Top Resize Handle */}
                    <div
                      onMouseDown={(e) => handleStartDrag(e, block, 'resize-top')}
                      className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/40 z-20 rounded-t-xl"
                      title="Drag to adjust start time in 5-min steps"
                    />

                    {/* Block Label & Content */}
                    <div className="pointer-events-none flex flex-col justify-between h-full overflow-hidden">
                      <div>
                        <div className="flex items-center justify-between gap-1 leading-tight">
                          <span className="font-bold text-xs truncate drop-shadow-sm">{block.title}</span>
                          {heightPx > 28 && (
                            <span className="text-[9px] font-mono font-bold whitespace-nowrap bg-black/25 px-1 py-0.5 rounded">
                              {minutesToFormattedTime(displayStartMin)}
                            </span>
                          )}
                        </div>

                        {heightPx > 48 && (
                          <div className="mt-1 text-[10px] opacity-90 truncate leading-tight">
                            {block.location && (
                              <span className="inline-flex items-center gap-0.5 mr-1 font-semibold">
                                <Icons.MapPin /> {block.location}
                              </span>
                            )}
                            {block.description}
                          </div>
                        )}
                      </div>

                      {heightPx > 36 && (
                        <div className="flex items-center justify-between text-[9px] opacity-85 pt-0.5 border-t border-white/20">
                          <span className="uppercase tracking-wider font-extrabold truncate">{block.category || 'Work'}</span>
                          <span className="font-bold">{formatDuration(displayDuration)}</span>
                        </div>
                      )}
                    </div>

                    {/* Hover Action Buttons */}
                    <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-1 z-30 bg-black/50 backdrop-blur-md p-1 rounded-lg">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBlock({ ...block });
                          setIsModalOpen(true);
                        }}
                        className="p-1 hover:bg-white/20 rounded text-white"
                        title="Edit Activity"
                      >
                        <Icons.Edit />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateBlock(block);
                        }}
                        className="p-1 hover:bg-white/20 rounded text-white"
                        title="Duplicate Activity"
                      >
                        <Icons.Copy />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBlock(block.id);
                        }}
                        className="p-1 hover:bg-red-500/80 rounded text-white"
                        title="Delete Activity"
                      >
                        <Icons.Trash />
                      </button>
                    </div>

                    {/* Bottom Resize Handle */}
                    <div
                      onMouseDown={(e) => handleStartDrag(e, block, 'resize-bottom')}
                      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/40 z-20 rounded-b-xl"
                      title="Drag to adjust duration in 5-min steps"
                    />
                  </div>
                );
              })}

              {/* Live Preview Box when dragging to create a new activity */}
              {interaction && interaction.type === 'create' && (
                <div
                  style={{
                    left: `${(daysList.findIndex((d) => d.dateStr === interaction.tempDate) * 100) / daysList.length}%`,
                    width: `${100 / daysList.length}%`,
                    top: `${(interaction.tempStartMin - visibleStartMin) * slotHeightRatio}px`,
                    height: `${interaction.tempDuration * slotHeightRatio}px`
                  }}
                  className="absolute bg-indigo-500/30 border-2 border-dashed border-indigo-600 rounded-xl pointer-events-none z-30 flex items-center justify-center text-xs font-bold text-indigo-900 dark:text-indigo-200"
                >
                  {minutesToFormattedTime(interaction.tempStartMin)} ({formatDuration(interaction.tempDuration)})
                </div>
              )}

            </div>
          </div>
        </div>
      </main>

      {isModalOpen && editingBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border p-6 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Icons.Clock />
                <span>{blocks.some((b) => b.id === editingBlock.id) ? 'Edit Activity Details' : 'Create New Activity'}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <div className="mt-4 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-bold mb-1">Activity Title *</label>
                <input
                  type="text"
                  value={editingBlock.title}
                  onChange={(e) => setEditingBlock({ ...editingBlock, title: e.target.value })}
                  placeholder="e.g., Morning Workout, Client Call..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Date</label>
                  <select
                    value={editingBlock.date}
                    onChange={(e) => setEditingBlock({ ...editingBlock, date: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    {daysList.map((d) => (
                      <option key={d.dateStr} value={d.dateStr}>
                        {d.dayName} {d.monthDay}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Start Time</label>
                  <input
                    type="time"
                    step="300"
                    value={minutesToInputTime(editingBlock.startMin)}
                    onChange={(e) => {
                      const newStart = inputTimeToMinutes(e.target.value);
                      setEditingBlock({ ...editingBlock, startMin: newStart });
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={editingBlock.duration}
                    onChange={(e) => {
                      const dur = Math.max(5, Number(e.target.value));
                      setEditingBlock({ ...editingBlock, duration: dur });
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Location / Link</label>
                <input
                  type="text"
                  value={editingBlock.location || ''}
                  onChange={(e) => setEditingBlock({ ...editingBlock, location: e.target.value })}
                  placeholder="e.g., Zoom Link, Conf Room 3, Gym..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Category & Preset Color</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() =>
                        setEditingBlock({
                          ...editingBlock,
                          category: preset.category,
                          color: preset.bg
                        })
                      }
                      style={{ backgroundColor: preset.bg }}
                      className={`p-2 rounded-xl text-white text-[11px] font-extrabold truncate transition-transform ${
                        editingBlock.color === preset.bg ? 'ring-2 ring-offset-2 ring-indigo-500 scale-105' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {preset.category}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium">Custom Color:</span>
                  <input
                    type="color"
                    value={editingBlock.color}
                    onChange={(e) => setEditingBlock({ ...editingBlock, color: e.target.value })}
                    className="w-8 h-8 rounded border-none cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Description / Notes</label>
                <textarea
                  rows="3"
                  value={editingBlock.description}
                  onChange={(e) => setEditingBlock({ ...editingBlock, description: e.target.value })}
                  placeholder="Add details, meeting agenda or reminders..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              {blocks.some((b) => b.id === editingBlock.id) ? (
                <button
                  onClick={() => handleDeleteBlock(editingBlock.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold"
                >
                  <Icons.Trash />
                  <span>Delete</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveModal(editingBlock)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-500/20"
                >
                  Save Activity
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {undoToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700">
          <span className="text-xs font-medium">{undoToast.message}</span>
          <button
            onClick={handleUndoDelete}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all"
          >
            <Icons.Undo />
            <span>Undo</span>
          </button>
        </div>
      )}

    </div>
  );
}