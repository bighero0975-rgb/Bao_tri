import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Wrench, History, ArrowLeft, Save, CheckCircle, AlertCircle, User, Package, LogOut, FileSpreadsheet, Lock, PieChart, BarChart3, Settings, Printer, Plus, X, Camera, Search, MapPin, ListFilter, Image as ImageIcon, Trash2, Boxes, Edit, Download, Upload, Database, Cloud, CloudOff, CalendarClock, Clock, Filter, Zap, Droplets, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, AlertTriangle, Calculator, PlaySquare } from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

const safeGetStorage = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (err) {
    console.warn(`Lỗi đọc localStorage [${key}], dùng dữ liệu mặc định:`, err);
    return fallback;
  }
};

const safeSetStorage = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
  } catch (err) {
    console.warn(`Cảnh báo đầy bộ nhớ localStorage [${key}], tự động lược bỏ ảnh nặng để tránh treo máy:`, err);
    try {
      if (Array.isArray(value)) {
        const lightweight = value.map(item => (item && typeof item === 'object' ? { ...item, images: [] } : item));
        window.localStorage.setItem(key, JSON.stringify(lightweight));
      }
    } catch (e) {
      // Bỏ qua nếu trình duyệt chặn hoàn toàn localStorage
    }
  }
};

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error ? String(error.message || error) : 'Lỗi không xác định' };
  }
  componentDidCatch(error, errorInfo) {
    console.error('AppErrorBoundary bắt được lỗi:', error, errorInfo);
  }
  handleResetSession = () => {
    try {
      window.localStorage.removeItem('techmaintain_active_session');
    } catch (e) {}
    this.setState({ hasError: false, errorMsg: '' });
    window.location.reload();
  };
  handleClearAllCache = () => {
    try {
      window.localStorage.clear();
    } catch (e) {}
    this.setState({ hasError: false, errorMsg: '' });
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-5">
            <div className="bg-red-500/20 text-red-400 p-4 rounded-full w-fit mx-auto">
              <AlertTriangle className="w-12 h-12" />
            </div>
            <h2 className="text-xl font-black">Đã xảy ra sự cố hiển thị</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Bộ nhớ đệm của trình duyệt có dữ liệu không tương thích hoặc quá tải. Bạn có thể bấm nút bên dưới để khôi phục ngay lập tức (dữ liệu trên Đám mây vẫn được giữ nguyên).
            </p>
            <div className="bg-slate-900/80 p-3 rounded-xl text-xs font-mono text-red-300 break-words">
              {this.state.errorMsg}
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <button onClick={this.handleResetSession} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg transition-all">
                Tải lại & Khôi phục phiên làm việc
              </button>
              <button onClick={this.handleClearAllCache} className="w-full py-3 bg-slate-700 hover:bg-red-600 text-slate-200 hover:text-white rounded-xl font-bold text-sm transition-all">
                Xóa bộ nhớ đệm trình duyệt & Làm mới
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const injectStyles = () => {
  if (typeof document === 'undefined') return;
  try {
    if (document.getElementById('custom-app-styles')) return;
    const style = document.createElement('style');
    style.id = 'custom-app-styles';
    style.innerHTML = `
      .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      @keyframes bounce-in { 0% { transform: scale(0.9); opacity: 0; } 50% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      .animate-bounce-in { animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      @keyframes scan { 0% { transform: translateY(0); } 50% { transform: translateY(1000%); } 100% { transform: translateY(0); } }
      @media print {
        body, html { background: #fff !important; overflow: visible !important; height: auto !important; }
        .no-print { display: none !important; }
        .print-container-reset { position: static !important; overflow: visible !important; height: auto !important; max-width: 100% !important; box-shadow: none !important; border: none !important; background: #fff !important; }
        #printableSheet { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 auto !important; max-width: 100% !important; }
      }
    `;
    document.head.appendChild(style);
  } catch (e) {}
};

injectStyles();

const myFirebaseConfig = {
  apiKey: "AIzaSyDedcI5SKRTek49VEkH6s71ogC8-orTjkg", 
  authDomain: "techmaintain-app.firebaseapp.com",
  projectId: "techmaintain-app",
  storageBucket: "techmaintain-app.firebasestorage.app",
  messagingSenderId: "202386593017",
  appId: "1:202386593017:web:3e47d12a813446e770be28"
};

let firebaseConfig = myFirebaseConfig;
try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    firebaseConfig = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
  }
} catch (e) {
  firebaseConfig = myFirebaseConfig;
}

const appId = typeof __app_id !== 'undefined' && __app_id ? __app_id : 'techmaintain-app';

let app = null;
let auth = null;
let db = null;
try {
  app = firebaseConfig ? initializeApp(firebaseConfig) : null;
  auth = app ? getAuth(app) : null;
  db = app ? getFirestore(app) : null;
} catch (err) {
  console.warn('Khởi tạo Firebase ở chế độ Offline:', err);
}

const getActualWorkMinutes = (start, end) => {
  if (!start || !end || typeof start !== 'string' || typeof end !== 'string') return 0;
  const parts1 = start.split(':');
  const parts2 = end.split(':');
  if (parts1.length < 2 || parts2.length < 2) return 0;
  const [h1, m1] = parts1.map(Number);
  const [h2, m2] = parts2.map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
  const sMins = h1 * 60 + m1;
  const eMins = h2 * 60 + m2;
  if (eMins <= sMins) return 0;

  let total = eMins - sMins;

  // Trừ giờ nghỉ trưa: 11:30 (690p) -> 13:00 (780p)
  const lunchOverlap = Math.max(0, Math.min(eMins, 780) - Math.max(sMins, 690));
  
  // Trừ giờ nghỉ chiều: 17:00 (1020p) -> 17:30 (1050p)
  const eveningOverlap = Math.max(0, Math.min(eMins, 1050) - Math.max(sMins, 1020));

  return Math.max(0, total - lunchOverlap - eveningOverlap);
};

const formatDurationMinutes = (mins) => {
  if (mins <= 0) return '0h';
  const hours = Math.floor(mins / 60);
  const m = mins % 60;
  if (hours === 0) return `${m}p`;
  if (m === 0) return `${hours}h`;
  return `${hours}h ${m}p`;
};

const calculateWorkTime = (start, end) => formatDurationMinutes(getActualWorkMinutes(start, end));

const getNormalizedErrorLevel = (task) => {
  if (!task || !task.type || !String(task.type).trim().toLowerCase().includes('đột xuất')) return '';
  if (!task.errorLevel) return '1';
  const match = String(task.errorLevel).match(/\d+/);
  return match ? match[0] : '1';
};

const getTodayDateStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getYesterdayDateStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getVietnameseDayName = (isoDateStr) => {
  if (!isoDateStr || typeof isoDateStr !== 'string') return '';
  const parts = isoDateStr.split('-').map(Number);
  if (parts.length !== 3) return '';
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  const days = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return days[dateObj.getDay()] || '';
};

const getFirstDayOfMonthStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
};

const formatDateVi = (isoDateStr) => {
  if (!isoDateStr || typeof isoDateStr !== 'string') return '';
  const parts = isoDateStr.split('-');
  if (parts.length !== 3) return isoDateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const toIsoDateLocal = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const analyzeEmployeeAttendanceInRange = (emp, allUnmergedTasks, startDateStr, endDateStr, sysSettings) => {
  const yesterdayStr = getYesterdayDateStr();
  const effectiveEnd = endDateStr && endDateStr <= yesterdayStr ? endDateStr : yesterdayStr;

  if (!emp || !startDateStr || !effectiveEnd || startDateStr > effectiveEnd) {
    return { missingDates: [], leaveDates: [] };
  }

  const empTasks = (Array.isArray(allUnmergedTasks) ? allUnmergedTasks : []).filter(
    t => t && (t.username === emp.username || t.technicianName === emp.name || t.technicianName === emp.username)
  );

  const workDateSet = new Set();
  const taskLeaveDateSet = new Set();

  empTasks.forEach(t => {
    const dStr = String(t.date || '');
    if (!dStr) return;
    const isLeave = String(t.type || '').trim().toLowerCase() === 'nghỉ phép';
    if (isLeave) {
      taskLeaveDateSet.add(dStr);
    } else {
      workDateSet.add(dStr);
    }
  });

  const manualLeaveDates = Array.isArray(sysSettings?.kpi_leave_days?.[emp.username])
    ? sysSettings.kpi_leave_days[emp.username]
    : [];
  const manualLeaveSet = new Set(manualLeaveDates);

  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = effectiveEnd.split('-').map(Number);
  const cursor = new Date(sy, sm - 1, sd);
  const endObj = new Date(ey, em - 1, ed);

  const missingDates = [];
  const leaveDates = [];
  let workingDaysCount = 0;

  while (cursor <= endObj) {
    // Trừ ngày Chủ nhật (getDay() === 0)
    if (cursor.getDay() !== 0) {
      workingDaysCount += 1;
      const iso = toIsoDateLocal(cursor);
      if (workDateSet.has(iso)) {
        // Đã có báo cáo công việc trong ngày
      } else if (taskLeaveDateSet.has(iso) || manualLeaveSet.has(iso)) {
        leaveDates.push({
          date: iso,
          source: taskLeaveDateSet.has(iso) ? 'task' : 'admin'
        });
      } else {
        missingDates.push(iso);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const requiredReportDays = Math.max(0, workingDaysCount - leaveDates.length);
  return { missingDates, leaveDates, workingDaysCount, requiredReportDays };
};

const getActiveReportMonth = (sysSettings) => {
  const monthCfg = sysSettings?.month_config || {};
  const startDay = Math.min(28, Math.max(1, Number(monthCfg.startDay) || 16));
  if (monthCfg.autoDetectMonth === false && monthCfg.defaultMonth) {
    return monthCfg.defaultMonth;
  }
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1;
  const d = now.getDate();

  // Nếu ngày hiện tại >= ngày chốt đầu kỳ (mặc định ngày 16) -> thuộc kỳ báo cáo của tháng kế tiếp
  if (startDay > 1 && d >= startDay) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return `${y}-${String(m).padStart(2, '0')}`;
};

const getMonthCycleRange = (monthStr, customStartDay = 16) => {
  const safeMonth = (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) ? monthStr : new Date().toISOString().slice(0, 7);
  const [year, month] = safeMonth.split('-').map(Number);
  const startDay = Math.min(28, Math.max(1, Number(customStartDay) || 16));

  let startDateObj;
  let endDateObj;

  if (startDay === 1) {
    startDateObj = new Date(year, month - 1, 1);
    endDateObj = new Date(year, month, 0);
  } else {
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate();
    const actualStartDay = Math.min(startDay, prevMonthLastDay);

    const currMonthLastDay = new Date(year, month, 0).getDate();
    const actualEndDay = Math.min(startDay - 1, currMonthLastDay);

    startDateObj = new Date(prevYear, prevMonth - 1, actualStartDay);
    endDateObj = new Date(year, month - 1, actualEndDay);
  }

  const startDate = toIsoDateLocal(startDateObj);
  const endDate = toIsoDateLocal(endDateObj);

  // Chia khoảng thời gian chu kỳ thành 4 tuần liên tiếp
  const weeks = [];
  if (startDay === 16) {
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevMM = String(prevMonth).padStart(2, '0');
    const currMM = String(month).padStart(2, '0');
    const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();

    const ranges = [
      { s: `${prevYear}-${prevMM}-16`, e: `${prevYear}-${prevMM}-22` },
      { s: `${prevYear}-${prevMM}-23`, e: `${prevYear}-${prevMM}-${String(prevLastDay).padStart(2, '0')}` },
      { s: `${year}-${currMM}-01`, e: `${year}-${currMM}-07` },
      { s: `${year}-${currMM}-08`, e: `${year}-${currMM}-15` }
    ];
    ranges.forEach((r, idx) => {
      weeks.push({
        index: idx,
        label: `Tuần ${idx + 1}`,
        shortRange: `${r.s.slice(8, 10)}/${r.s.slice(5, 7)} - ${r.e.slice(8, 10)}/${r.e.slice(5, 7)}`,
        startDate: r.s,
        endDate: r.e
      });
    });
  } else {
    const allDays = [];
    const cursor = new Date(startDateObj);
    while (cursor <= endDateObj) {
      allDays.push(toIsoDateLocal(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    const splitPoints = [0, 7, 14, 21, allDays.length];
    for (let idx = 0; idx < 4; idx++) {
      const sIdx = Math.min(splitPoints[idx], Math.max(0, allDays.length - 1));
      const eIdx = Math.min(splitPoints[idx + 1] - 1, Math.max(0, allDays.length - 1));
      const s = allDays[sIdx] || startDate;
      const e = allDays[Math.max(sIdx, eIdx)] || endDate;
      weeks.push({
        index: idx,
        label: `Tuần ${idx + 1}`,
        shortRange: `${s.slice(8, 10)}/${s.slice(5, 7)} - ${e.slice(8, 10)}/${e.slice(5, 7)}`,
        startDate: s,
        endDate: e
      });
    }
  }

  return {
    monthStr: safeMonth,
    monthLabel: `Tháng ${String(month).padStart(2, '0')}/${year}`,
    shortMonthYear: `${String(month).padStart(2, '0')}/${year}`,
    startDate,
    endDate,
    rangeText: `${formatDateVi(startDate)} - ${formatDateVi(endDate)}`,
    weeks
  };
};

const getTargetSlaMinutes = (task, sysSettings) => {
  const lvl = getNormalizedErrorLevel(task);
  if (!lvl) return 0;
  const errTimes = sysSettings?.error_times || { level1: 1.5, level2: 4, level3: 24 };
  if (lvl === '1') return Math.round((Number(errTimes.level1) || 1.5) * 60);
  if (lvl === '2') return Math.round((Number(errTimes.level2) || 4) * 60);
  const approved = Number(task.approvedTime || task.approvedHours || errTimes.level3 || 24);
  return Math.round(approved * 60);
};

const getErrorLevelDisplay = (task) => {
  const lvl = getNormalizedErrorLevel(task);
  return lvl ? `Lỗi mức ${lvl}` : '';
};

const evaluateTaskKpiStatus = (task, sysSettings) => {
  if (!task) return 'Không đạt';
  const status = String(task.status || '').trim();
  if (status !== 'Hoàn thành') {
    return status === 'Đang xử lý' ? 'Chưa đạt (Đang xử lý)' : 'Không đạt';
  }
  const lvl = getNormalizedErrorLevel(task);
  if (lvl) {
    const actualMins = getActualWorkMinutes(task.startTime, task.endTime);
    const targetMins = getTargetSlaMinutes(task, sysSettings);
    return actualMins <= targetMins ? 'Đạt' : 'Không đạt';
  }
  return 'Đạt';
};

const calculateEarlyLateStr = (task, sysSettings) => {
  const lvl = getNormalizedErrorLevel(task);
  if (!lvl) return '';
  const actualMins = getActualWorkMinutes(task.startTime, task.endTime);
  const targetMins = getTargetSlaMinutes(task, sysSettings);
  const diffMins = actualMins - targetMins;
  if (diffMins === 0) return '0h';
  const absMins = Math.abs(diffMins);
  const sign = diffMins > 0 ? '+' : '-';
  return `${sign}${formatDurationMinutes(absMins)}`;
};

const sanitizeForFirestore = (obj) => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)).filter(v => v !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned = {};
    Object.keys(obj).forEach(key => {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    });
    return cleaned;
  }
  return obj;
};

const mergeCollectionsById = (cloudList = [], localList = [], deletedIds = new Set()) => {
  const map = new Map();
  (Array.isArray(localList) ? localList : []).forEach(item => {
    if (item && item.id !== undefined && !deletedIds.has(String(item.id))) {
      map.set(String(item.id), item);
    }
  });
  (Array.isArray(cloudList) ? cloudList : []).forEach(item => {
    if (item && item.id !== undefined && !deletedIds.has(String(item.id))) {
      map.set(String(item.id), item);
    }
  });
  return Array.from(map.values());
};

const INITIAL_MACHINES = [
  { id: 'M-101', name: 'Máy Phay CNC 3 Trục', model: 'Haas VF-2', location: 'Xưởng A', department: 'Cơ Khí', category: 'Cắt CNC', status: 'operational' },
];

const INITIAL_INVENTORY = [
  { id: 'P-101', name: 'Dầu máy CNC', unit: 'Lít', quantity: 45 },
];

const INITIAL_USERS = [
  { id: 'admin', username: 'admin', password: '123', name: 'Quản Lý Trưởng', role: 'admin', employeeId: 'ADMIN', position: 'Quản lý', department: 'Ban Quản Lý' },
  { id: 'tech1', username: 'ktv1', password: '123', name: 'Nguyễn Văn KTV', role: 'maintenance', employeeId: 'CN0314', position: 'Thợ cơ', department: 'Bảo trì xưởng' },
  { id: 'tech2', username: 'ktv2', password: '123', name: 'Lê Văn KTV', role: 'maintenance', employeeId: 'CN0644', position: 'Thợ điện', department: 'Bảo trì xưởng' }
];

const INITIAL_CATEGORIES = ['Cầu trục', 'Cắt CNC', 'Kho', 'Sơn', 'Quạt', 'Băng tải', 'P.Máy nén khí', 'Cơ khí', 'Vách ướt', 'STT', 'Khác'];

const expandMergedTaskEntries = (tasks) => {
  if (!Array.isArray(tasks)) return [];
  const result = [];
  const splitRegex = /\n*---\s*\[(\d{4}-\d{2}-\d{2})\]\s*(.*?)\s*tiếp tục\s*---\n*/gi;

  tasks.forEach(task => {
    if (!task) return;
    const rawNote = String(task.note || '');
    if (!rawNote.includes('tiếp tục ---')) {
      result.push(task);
      return;
    }

    const segments = [];
    let lastIndex = 0;
    let currentHeader = null;
    const regex = new RegExp(splitRegex.source, 'gi');
    let match;

    while ((match = regex.exec(rawNote)) !== null) {
      const contentBefore = rawNote.slice(lastIndex, match.index).trim();
      segments.push({
        header: currentHeader,
        note: contentBefore
      });
      currentHeader = {
        date: match[1],
        techName: (match[2] || '').trim()
      };
      lastIndex = regex.lastIndex;
    }

    const tailContent = rawNote.slice(lastIndex).trim();
    segments.push({
      header: currentHeader,
      note: tailContent
    });

    // Lọc bỏ các phân đoạn rỗng không có nội dung ghi chú (do bấm Tiếp nhiều lần nhưng không ghi thêm)
    const validSegments = segments.filter((seg, idx) => idx === 0 || seg.note.length > 0);

    if (validSegments.length <= 1) {
      result.push({
        ...task,
        note: validSegments[0]?.note || rawNote.replace(splitRegex, '\n').trim()
      });
    } else {
      validSegments.forEach((seg, idx) => {
        const isLastSeg = idx === validSegments.length - 1;
        result.push({
          ...task,
          id: idx === 0 ? task.id : `${task.id}-SUB-${idx}`,
          originalTaskId: task.id,
          date: seg.header?.date || task.date,
          technicianName: seg.header?.techName || task.technicianName,
          note: seg.note || task.taskName,
          status: isLastSeg ? task.status : 'Hoàn thành',
          parts: idx === 0 ? (task.parts || []) : []
        });
      });
    }
  });

  return result;
};

const getMartechLogoBase64 = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 110;
  const ctx = canvas.getContext('2d');

  // Nền trắng
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Vòng tròn xanh bên trái
  ctx.strokeStyle = '#0066b3';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(52, 55, 42, 0, Math.PI * 2);
  ctx.stroke();

  // Tam giác bên trong vòng tròn
  ctx.beginPath();
  ctx.moveTo(52, 16);
  ctx.lineTo(17, 80);
  ctx.lineTo(87, 80);
  ctx.closePath();
  ctx.stroke();

  // Chữ M bên trong tam giác
  ctx.fillStyle = '#0066b3';
  ctx.font = '900 34px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('M', 52, 76);

  // Chữ MARTECH
  ctx.textAlign = 'left';
  ctx.font = '900 33px Arial, sans-serif';
  ctx.fillStyle = '#0066b3';
  ctx.fillText('MARTECH', 108, 42);

  // Ký hiệu ®
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText('®', 332, 22);

  // Chữ B + O cách điệu + ILER
  ctx.font = '900 36px Arial, sans-serif';
  ctx.fillText('B', 108, 80);

  // Chữ O cách điệu (vòng tròn xanh đậm + chấm trắng lệch tâm dưới)
  ctx.beginPath();
  ctx.arc(158, 67, 17, 0, Math.PI * 2);
  ctx.fillStyle = '#0066b3';
  ctx.fill();

  // Các vạch ngang nhỏ nửa trên chữ O
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(146, 58); ctx.lineTo(170, 58);
  ctx.moveTo(144, 62); ctx.lineTo(172, 62);
  ctx.stroke();

  // Lỗ tròn trắng bên dưới trong chữ O
  ctx.beginPath();
  ctx.arc(158, 72, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Chữ ILER
  ctx.fillStyle = '#0066b3';
  ctx.fillText('ILER', 180, 80);

  // Slogan: The [Sóng đỏ] Energy Solutions
  ctx.fillStyle = '#e06666';
  ctx.font = 'italic 15px Arial, sans-serif';
  ctx.fillText('The', 128, 102);

  // Biểu tượng 3 gợn sóng đỏ
  ctx.strokeStyle = '#e06666';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const y = 92 + i * 4;
    ctx.moveTo(164, y);
    ctx.bezierCurveTo(170, y - 3, 176, y + 3, 182, y);
    ctx.stroke();
  }

  ctx.fillText('Energy Solutions', 188, 102);

  return canvas.toDataURL('image/png');
};

const getMartechSquareIconBase64 = (size = 512) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Nền bo góc xanh dương đặc trưng Martech
  const radius = size * 0.22;
  ctx.fillStyle = '#0066b3';
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  const cx = size / 2;
  const cy = size / 2;

  // Vòng tròn trắng biểu tượng Martech
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.042;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.34, 0, Math.PI * 2);
  ctx.stroke();

  // Tam giác trắng bên trong vòng tròn
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.31);
  ctx.lineTo(cx - size * 0.27, cy + size * 0.19);
  ctx.lineTo(cx + size * 0.27, cy + size * 0.19);
  ctx.closePath();
  ctx.stroke();

  // Chữ M đậm ở tâm
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(size * 0.26)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('M', cx, cy + size * 0.16);

  return canvas.toDataURL('image/png');
};

const applyAppBrandingIcons = (customIconDataUrl) => {
  if (typeof document === 'undefined') return;
  try {
    const icon192 = customIconDataUrl || getMartechSquareIconBase64(192);
    const icon512 = customIconDataUrl || getMartechSquareIconBase64(512);

    document.title = 'Martech Boiler - Quản Lý Bảo Trì';

    const upsertLink = (rel, attrs = {}) => {
      let link = document.querySelector(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      Object.entries(attrs).forEach(([k, v]) => link.setAttribute(k, v));
    };

    upsertLink('icon', { type: 'image/png', href: icon192 });
    upsertLink('shortcut icon', { type: 'image/png', href: icon192 });
    upsertLink('apple-touch-icon', { sizes: '180x180', href: icon192 });

    const manifestObj = {
      name: 'Hệ thống Quản lý Bảo trì - Martech Boiler',
      short_name: 'Martech Bảo Trì',
      start_url: '.',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#0066b3',
      icons: [
        { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    };
    const manifestBlob = new Blob([JSON.stringify(manifestObj)], { type: 'application/manifest+json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);
    upsertLink('manifest', { href: manifestUrl });
  } catch (e) {
    console.warn('Không thể cập nhật biểu tượng ứng dụng:', e);
  }
};

const loadXLSX = async () => {
  if (window.XLSX) return window.XLSX;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error("Lỗi tải thư viện đọc Excel"));
    document.body.appendChild(script);
  });
};

const loadExcelJS = async () => {
  if (window.ExcelJS) return window.ExcelJS;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js";
    script.onload = () => resolve(window.ExcelJS);
    script.onerror = () => reject(new Error("Lỗi tải thư viện ExcelJS"));
    document.body.appendChild(script);
  });
};

const NativeCameraScanner = ({ onScan }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [isJsQRLoaded, setIsJsQRLoaded] = useState(false);

  useEffect(() => {
    if (window.jsQR) { setIsJsQRLoaded(true); return; }
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    script.async = true;
    script.onload = () => setIsJsQRLoaded(true);
    script.onerror = () => setError("Không tải được bộ giải mã QR.");
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isJsQRLoaded) return;
    let stream = null;
    let animationFrameId;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", true);
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        setError("Không thể truy cập camera.");
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (canvas && window.jsQR) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
                if (code && code.data) { onScan(code.data); return; }
            }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    startCamera();
    return () => {
      if (stream) { stream.getTracks().forEach(track => track.stop()); }
      if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
    };
  }, [isJsQRLoaded, onScan]);

  return (
    <div className="absolute inset-0 w-full h-full bg-slate-900 overflow-hidden flex items-center justify-center">
      {error ? (
        <div className="text-white text-center p-6 z-20 bg-slate-800 rounded-2xl m-4 shadow-xl"><AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" /><p>{error}</p></div>
      ) : (<><video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" /><canvas ref={canvasRef} className="hidden" /></>)}
      
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center pb-24 md:pb-0">
        <div className="w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 border-2 border-blue-400 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 shadow-[0_0_10px_#60a5fa] animate-[scan_2s_infinite]"></div>
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl -translate-x-1 -translate-y-1"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl translate-x-1 -translate-y-1"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl -translate-x-1 translate-y-1"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl translate-x-1 translate-y-1"></div>
        </div>
      </div>
    </div>
  );
};

const CustomConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm md:max-w-md shadow-2xl border border-slate-100">
        <div className="flex items-center space-x-4 mb-4 text-red-600">
           <div className="bg-red-100 p-3 rounded-full"><AlertTriangle className="w-6 h-6 md:w-8 md:h-8" /></div>
           <h3 className="font-bold text-lg md:text-xl text-slate-800">{title || 'Xác nhận'}</h3>
        </div>
        <p className="text-slate-600 text-sm md:text-base mb-8 leading-relaxed">{message || 'Bạn có chắc chắn muốn thực hiện hành động này?'}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors text-sm md:text-base">Hủy bỏ</button>
          <button onClick={onConfirm} className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/30 text-sm md:text-base">Xác nhận</button>
        </div>
      </div>
    </div>
  );
};

const ImageZoomModal = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center backdrop-blur-md animate-fade-in cursor-zoom-out" onClick={onClose}>
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-[210]"><button onClick={onClose} className="bg-black/50 text-white p-2.5 md:p-4 rounded-full hover:bg-red-600 transition-colors border border-white/20 shadow-lg"><X className="w-6 h-6 md:w-8 md:h-8" /></button></div>
      <img src={imageUrl} className="max-w-full max-h-[85vh] object-contain p-2 md:p-8 cursor-default rounded-lg" onClick={(e) => e.stopPropagation()} alt="Zoomed preview" />
    </div>
  );
};

const EasyTimePicker = ({ label, value, onChange, theme = 'purple', quickTimes = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const safeVal = value && typeof value === 'string' && value.includes(':') ? value : '07:30';
  const [rawH, rawM] = safeVal.split(':');
  const currentH = String(Math.min(23, Math.max(0, parseInt(rawH, 10) || 0))).padStart(2, '0');
  const currentM = String(Math.min(59, Math.max(0, parseInt(rawM, 10) || 0))).padStart(2, '0');

  const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const commonMinutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const handleSelectHour = (h) => {
    onChange(`${h}:${currentM}`);
  };

  const handleSelectMinute = (m) => {
    onChange(`${currentH}:${m}`);
  };

  const handleSetNow = () => {
    const now = new Date().toTimeString().slice(0, 5);
    onChange(now);
    setIsOpen(false);
  };

  const isPurple = theme === 'purple';
  const accentBg = isPurple ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700';
  const accentLightBg = isPurple ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-blue-50 border-blue-200 text-blue-900';
  const accentText = isPurple ? 'text-purple-800' : 'text-blue-800';
  const activeBtn = isPurple ? 'bg-purple-600 text-white border-purple-600 shadow-md scale-[1.03]' : 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.03]';

  return (
    <div className="flex flex-col">
      <label className={`text-xs md:text-sm font-bold ${accentText} flex items-center mb-1.5`}>
        <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 shrink-0" /> {label}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`w-full py-3 px-3 md:p-4 rounded-2xl border-2 ${isPurple ? 'border-purple-200 hover:border-purple-400' : 'border-blue-200 hover:border-blue-400'} bg-white shadow-sm flex items-center justify-between transition-all active:scale-95`}
      >
        <div className="flex items-baseline gap-0.5 mx-auto">
          <span className="text-xl md:text-2xl font-black font-mono text-slate-800 tracking-wider">{currentH}</span>
          <span className={`text-lg md:text-xl font-black font-mono ${isPurple ? 'text-purple-500' : 'text-blue-500'} mx-0.5`}>:</span>
          <span className="text-xl md:text-2xl font-black font-mono text-slate-800 tracking-wider">{currentM}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {quickTimes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {quickTimes.map((qt) => (
            <button
              key={qt}
              type="button"
              onClick={() => onChange(qt)}
              className={`text-[11px] md:text-xs px-2 py-1 rounded-lg font-bold border transition-all active:scale-95 ${
                safeVal === qt
                  ? (isPurple ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-blue-600 text-white border-blue-600 shadow-sm')
                  : 'bg-white/90 text-slate-600 border-slate-200 hover:bg-white'
              }`}
            >
              {qt}
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[220] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={() => setIsOpen(false)}>
          <div
            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 md:p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-800 text-base md:text-lg flex items-center">
                  <Clock className={`w-5 h-5 mr-2 ${isPurple ? 'text-purple-600' : 'text-blue-600'}`} />
                  Chọn {label}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Chạm chọn Giờ và Phút bên dưới (Định dạng 24h)</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-3 rounded-2xl border ${accentLightBg} flex items-center justify-between mb-4`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider opacity-75">Đang chọn:</span>
                <span className="text-2xl md:text-3xl font-black font-mono tracking-wider">{currentH}:{currentM}</span>
              </div>
              <button
                type="button"
                onClick={handleSetNow}
                className="px-3 py-1.5 bg-white rounded-xl text-xs font-bold shadow-sm border border-slate-200 text-slate-700 active:scale-95"
              >
                Lấy giờ hiện tại
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider">1. Chọn Giờ (00h - 23h)</span>
                  <span className="text-[11px] font-bold text-slate-400">Ca ngày: 07h - 17h | Tăng ca: 17h - 21h</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {hoursList.map((h) => {
                    const isWorkHour = parseInt(h, 10) >= 7 && parseInt(h, 10) <= 20;
                    const isSelected = h === currentH;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleSelectHour(h)}
                        className={`py-2.5 rounded-xl font-mono text-sm font-black border transition-all ${
                          isSelected
                            ? activeBtn
                            : isWorkHour
                            ? 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                            : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider">2. Chọn Phút</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Nhập phút lẻ:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={parseInt(currentM, 10)}
                      onChange={(e) => {
                        const val = Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0));
                        handleSelectMinute(String(val).padStart(2, '0'));
                      }}
                      className="w-14 py-1 px-2 text-center font-mono font-black text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {commonMinutes.map((m) => {
                    const isSelected = m === currentM;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSelectMinute(m)}
                        className={`py-2.5 rounded-xl font-mono text-sm font-black border transition-all ${
                          isSelected
                            ? activeBtn
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        :{m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`w-full py-3.5 rounded-2xl text-white font-black text-base shadow-lg transition-all active:scale-95 ${accentBg}`}
              >
                Xác nhận ({currentH}:{currentM})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VietnameseMonthPicker = ({ value, onChange, className = '', title = 'Chọn tháng báo cáo' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  const fallbackYM = new Date().toISOString().slice(0, 7);
  const safeVal = value && /^\d{4}-\d{2}$/.test(value) ? value : fallbackYM;
  const [yearStr, monthStr] = safeVal.split('-');
  const selectedYear = parseInt(yearStr, 10) || new Date().getFullYear();
  const selectedMonth = parseInt(monthStr, 10) || (new Date().getMonth() + 1);

  const [viewYear, setViewYear] = useState(selectedYear);

  const openPicker = () => {
    setViewYear(selectedYear);
    if (btnRef.current && typeof window !== 'undefined') {
      const rect = btnRef.current.getBoundingClientRect();
      const popupWidth = 272;
      const popupHeight = 290;
      const top = Math.min(window.innerHeight - popupHeight - 12, Math.max(12, rect.bottom + 6));
      const left = Math.min(window.innerWidth - popupWidth - 12, Math.max(12, rect.left));
      setPopupPos({ top, left });
    }
    setIsOpen(true);
  };

  const handlePickMonth = (mNum) => {
    const formatted = `${viewYear}-${String(mNum).padStart(2, '0')}`;
    if (onChange) onChange(formatted);
    setIsOpen(false);
  };

  const handleSelectCurrentMonth = () => {
    const now = new Date();
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (onChange) onChange(formatted);
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={title}
        onClick={openPicker}
        className={`inline-flex items-center justify-between gap-2 whitespace-nowrap cursor-pointer transition-all ${className}`}
      >
        <span>Tháng {monthStr}/{yearStr}</span>
        <CalendarClock className="w-4 h-4 opacity-75 shrink-0" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[240] bg-slate-900/20 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{ top: `${popupPos.top}px`, left: `${popupPos.left}px`, width: '272px' }}
            className="fixed z-[250] bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setViewYear((y) => y - 1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                title="Năm trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-black text-sm text-slate-800">Năm {viewYear}</span>
              <button
                type="button"
                onClick={() => setViewYear((y) => y + 1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                title="Năm sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((mNum) => {
                const isSelected = viewYear === selectedYear && mNum === selectedMonth;
                return (
                  <button
                    key={mNum}
                    type="button"
                    onClick={() => handlePickMonth(mNum)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-slate-100'
                    }`}
                  >
                    Tháng {mNum}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSelectCurrentMonth}
                className="text-xs font-bold text-purple-600 hover:text-purple-800 px-2 py-1 rounded-lg hover:bg-purple-50 transition-colors"
              >
                Tháng hiện tại
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const SearchablePartSelect = ({ inventory, isCustomPart, setIsCustomPart, tempPart, setTempPart, theme = 'blue' }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const safeInventory = Array.isArray(inventory) ? inventory : [];
    const filtered = safeInventory.filter(i => String(i?.name || '').toLowerCase().includes(search.toLowerCase()));

    const handleSelect = (val) => {
        if (val === 'CUSTOM') {
            setIsCustomPart(true);
            setTempPart({ name: '', unit: '', quantity: '' });
        } else {
            setIsCustomPart(false);
            const selectedItem = safeInventory.find(i => i?.name === val);
            setTempPart({ ...tempPart, name: val, unit: selectedItem ? selectedItem.unit : '' });
        }
        setIsOpen(false); setSearch(''); 
    };

    const activeColor = theme === 'purple' ? 'text-purple-600' : 'text-blue-600';
    const focusRing = theme === 'purple' ? 'focus:ring-purple-500' : 'focus:ring-blue-500';
    const borderActive = theme === 'purple' ? 'border-purple-500 ring-purple-500' : 'border-blue-500 ring-blue-500';

    return (
        <div className="relative" ref={wrapperRef}>
            <div className={`w-full p-3 md:p-4 border border-slate-300 rounded-xl text-sm md:text-base bg-white flex justify-between items-center cursor-pointer transition-all ${isOpen ? `ring-2 ring-opacity-20 ${borderActive}` : ''}`} onClick={() => setIsOpen(!isOpen)}>
                <span className={`block truncate ${!tempPart.name && !isCustomPart ? "text-slate-500" : "text-slate-800 font-bold"}`}>
                    {isCustomPart ? "+ Nhập vật tư ngoài / Tạo mới" : (tempPart.name || '-- Chọn vật tư trong kho --')}
                </span>
                <ChevronDown className={`w-5 h-5 md:w-6 md:h-6 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-72 md:max-h-96 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-slate-100 bg-slate-50 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                            <input type="text" autoFocus placeholder="Nhập tên vật tư để tìm..." className={`w-full pl-10 pr-4 py-2.5 md:py-3 text-sm md:text-base border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 ${focusRing}`} value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        <div className={`p-4 md:p-5 text-sm md:text-base font-bold cursor-pointer hover:bg-slate-100 border-b border-slate-100 flex items-center ${activeColor}`} onClick={() => handleSelect('CUSTOM')}>
                            <Plus className="w-5 h-5 mr-2" /> Nhập vật tư ngoài / Tạo mới
                        </div>
                        {filtered.length > 0 ? filtered.map(item => (
                            <div key={item.id} className="p-4 md:p-5 text-sm md:text-base cursor-pointer hover:bg-slate-50 border-b border-slate-50 flex justify-between items-center transition-colors" onClick={() => handleSelect(item.name)}>
                                <span className="font-medium text-slate-700 truncate mr-3">{item.name}</span>
                                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-lg whitespace-nowrap font-bold">Tồn: {item.quantity} {item.unit}</span>
                            </div>
                        )) : (
                            <div className="p-8 text-center text-sm md:text-base text-slate-400">Không tìm thấy <b>"{search}"</b></div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const CoWorkerSelect = ({ usersList, currentUser, selectedCoWorkers, setSelectedCoWorkers }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const availableUsers = usersList?.filter(u => u.username !== currentUser?.username && u.role !== 'admin') || [];

    const toggleUser = (u) => {
        const isSelected = selectedCoWorkers?.some(cw => cw.username === u.username);
        let newCoWorkers = [...(selectedCoWorkers || [])];
        if (isSelected) newCoWorkers = newCoWorkers.filter(cw => cw.username !== u.username);
        else newCoWorkers.push({ username: u.username, name: u.name });
        setSelectedCoWorkers(newCoWorkers);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className={`w-full p-3.5 md:p-4 border rounded-2xl text-sm md:text-base bg-white flex justify-between items-center cursor-pointer transition-all ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-300 hover:bg-slate-50'}`} onClick={() => setIsOpen(!isOpen)}>
                <span className={`block truncate ${selectedCoWorkers?.length ? 'text-blue-700 font-bold' : 'text-slate-500'}`}>
                    {selectedCoWorkers?.length ? `Đã chọn (${selectedCoWorkers.length}): ${selectedCoWorkers.map(cw => cw.name).join(', ')}` : '-- Chọn KTV làm cùng --'}
                </span>
                <ChevronDown className={`w-5 h-5 md:w-6 md:h-6 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                    {availableUsers.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">Không có KTV khác</div>
                    ) : (
                        availableUsers.map(u => {
                            const isSelected = selectedCoWorkers?.some(cw => cw.username === u.username);
                            return (
                                <div key={u.username} className="p-3 md:p-4 text-sm md:text-base cursor-pointer hover:bg-slate-50 border-b border-slate-100 flex items-center transition-colors" onClick={() => toggleUser(u)}>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'}`}>
                                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                                    </div>
                                    <span className={`font-medium ${isSelected ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>{u.name}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

const LoginView = ({ handleLogin, isCloudSyncing, db, permissionError }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-900 text-white animate-fade-in overflow-y-auto">
      <div className="w-full max-w-md space-y-8 my-auto">
        <div className="text-center space-y-3">
          <div className="bg-blue-600 p-5 rounded-3xl inline-block shadow-lg shadow-blue-500/30"><Wrench className="w-16 h-16 text-white" /></div>
          <h1 className="text-4xl font-black tracking-tight">Martech Boiler</h1>
          <p className="text-slate-400 text-base">Hệ thống quản lý bảo trì &amp; công việc</p>
        </div>
        
        <div className="space-y-5 bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl relative">
            <h3 className="text-xl font-bold text-center mb-4">Đăng Nhập Hệ Thống</h3>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tên đăng nhập</label>
              <div className="relative">
                 <User className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                 <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-600 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder:text-slate-600 transition-all" placeholder="Nhập tài khoản..." />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Mật khẩu</label>
              <div className="relative">
                 <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                 <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin(username, password)} className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-600 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder:text-slate-600 transition-all" placeholder="***" />
              </div>
            </div>
            <button onClick={() => handleLogin(username, password)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl text-lg transition-all active:scale-95 shadow-lg mt-4">Đăng Nhập</button>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-400">
            {db && !permissionError ? (
              <>
                <Cloud className={`w-4 h-4 ${isCloudSyncing ? 'text-blue-400 animate-pulse' : 'text-emerald-400'}`} />
                <span>{isCloudSyncing ? 'Đang đồng bộ đám mây...' : 'Đã kết nối dữ liệu đám mây'}</span>
              </>
            ) : (
              <>
                <CloudOff className="w-4 h-4 text-amber-400" />
                <span>Chế độ lưu trữ cục bộ (Offline)</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ user, machines, dailyTasks, utilityLogs, logs, handleLogout, setView, db, setMachineFilter, setTaskFilter, sysSettings, usersList }) => {
  const machinesOperational = machines.filter(m => m.status === 'operational').length;
  const machinesIssue = machines.filter(m => m.status === 'maintenance' || m.status === 'broken').length;
  const totalPending = dailyTasks.filter(t => t.status !== 'Hoàn thành').length;

  const monthStartDay = Math.min(28, Math.max(1, Number(sysSettings?.month_config?.startDay) || 16));
  const activeMonth = getActiveReportMonth(sysSettings);
  const cycleInfo = getMonthCycleRange(activeMonth, monthStartDay);
  const unmergedTasks = expandMergedTaskEntries(dailyTasks);
  const techUsers = (Array.isArray(usersList) ? usersList : []).filter(u => u && u.role !== 'admin');

  const techsWithMissingReports = techUsers
    .map(tech => {
      const { missingDates } = analyzeEmployeeAttendanceInRange(tech, unmergedTasks, cycleInfo.startDate, cycleInfo.endDate, sysSettings);
      return { tech, missingDates };
    })
    .filter(item => item.missingDates.length > 0);

  const totalMissingDaysAllTechs = techsWithMissingReports.reduce((sum, item) => sum + item.missingDates.length, 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="bg-white p-4 md:px-8 border-b border-slate-200 flex justify-between items-center shadow-sm z-10 shrink-0">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
            <div><h1 className="font-black text-xl md:text-3xl text-slate-800 tracking-tight">Dashboard Quản Trị</h1><p className="text-xs md:text-sm text-slate-500 mt-1 font-medium">Đang đăng nhập: {user.name}</p></div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-4 py-2.5 rounded-xl transition-colors font-bold"><LogOut className="w-5 h-5 md:w-6 md:h-6" /><span className="hidden sm:inline">Đăng xuất</span></button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-20 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm flex flex-col justify-center">
              <h3 className="text-sm md:text-base font-bold text-slate-800 mb-4 flex items-center"><Database className="w-5 h-5 mr-2 text-blue-600"/> Máy móc &amp; Thiết bị ({machines.length})</h3>
              <div className="flex gap-4">
                 <div className="flex-1 bg-green-50 p-4 rounded-2xl border border-green-100 cursor-pointer transition-transform hover:shadow-md active:scale-95" onClick={() => { setMachineFilter('operational'); setView('machines'); }}>
                    <p className="text-green-600 text-[11px] md:text-xs uppercase font-bold flex items-center mb-2"><CheckCircle className="w-4 h-4 mr-1"/>Bình thường</p>
                    <p className="text-3xl md:text-5xl font-black text-green-700">{machinesOperational}</p>
                 </div>
                 <div className="flex-1 bg-red-50 p-4 rounded-2xl border border-red-100 cursor-pointer transition-transform hover:shadow-md active:scale-95" onClick={() => { setMachineFilter('issue'); setView('machines'); }}>
                    <p className="text-red-600 text-[11px] md:text-xs uppercase font-bold flex items-center mb-2"><AlertTriangle className="w-4 h-4 mr-1"/>Lỗi / Bảo trì</p>
                    <p className="text-3xl md:text-5xl font-black text-red-700">{machinesIssue}</p>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-6 lg:col-span-2">
               <div className="bg-orange-50 p-6 md:p-8 rounded-3xl border border-orange-100 shadow-sm cursor-pointer transition-transform hover:shadow-md active:scale-95 flex flex-col justify-center" onClick={() => { setTaskFilter('pending'); setView('daily_task_history'); }}>
                  <p className="text-orange-600 text-xs md:text-sm uppercase font-bold flex items-center mb-2"><Clock className="w-4 h-4 md:w-5 md:h-5 mr-1.5"/> Việc Tồn đọng</p>
                  <p className="text-4xl md:text-6xl font-black text-orange-700">{totalPending}</p>
               </div>
               <div className="bg-purple-50 p-6 md:p-8 rounded-3xl border border-purple-100 shadow-sm cursor-pointer transition-transform hover:shadow-md active:scale-95 flex flex-col justify-center" onClick={() => { setTaskFilter('all'); setView('daily_task_history'); }}>
                  <p className="text-purple-600 text-xs md:text-sm uppercase font-bold flex items-center mb-2"><CalendarClock className="w-4 h-4 md:w-5 md:h-5 mr-1.5"/> Tổng BC Ngày</p>
                  <p className="text-4xl md:text-6xl font-black text-purple-700">{dailyTasks.length}</p>
               </div>
               <div className="bg-cyan-50 p-6 md:p-8 rounded-3xl border border-cyan-100 shadow-sm col-span-2 flex justify-between items-center cursor-pointer transition-transform hover:shadow-md active:scale-95" onClick={() => setView('utility_history')}>
                  <div>
                    <p className="text-cyan-600 text-xs md:text-sm uppercase font-bold flex items-center mb-2"><Droplets className="w-4 h-4 md:w-5 md:h-5 mr-1.5"/> Sổ Ghi Điện / Nước</p>
                    <p className="text-3xl md:text-5xl font-black text-cyan-800">{utilityLogs?.length || 0} <span className="text-base md:text-xl font-medium text-cyan-600 ml-1">bản ghi</span></p>
                  </div>
                  <div className="flex gap-3 bg-white p-3 md:p-4 rounded-2xl shadow-sm"><Zap className="w-8 h-8 md:w-12 md:h-12 text-yellow-500"/><Droplets className="w-8 h-8 md:w-12 md:h-12 text-blue-400"/></div>
               </div>
            </div>
          </div>

          {techsWithMissingReports.length > 0 && (
            <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-start gap-3.5">
                <div className="bg-rose-600 text-white p-3 rounded-2xl shrink-0 shadow-sm">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-rose-900 text-base md:text-lg">
                    Cảnh báo thiếu báo cáo ngày ({cycleInfo.monthLabel}: {totalMissingDaysAllTechs} ngày thiếu)
                  </h3>
                  <p className="text-xs md:text-sm text-rose-700 mt-0.5">
                    Có <b>{techsWithMissingReports.length}</b> kỹ thuật viên chưa nhập đủ báo cáo ngày (trừ Chủ nhật &amp; Nghỉ phép):
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {techsWithMissingReports.map(({ tech, missingDates }) => (
                      <span key={tech.id} className="bg-white text-rose-800 border border-rose-200 px-3 py-1 rounded-xl text-xs font-bold shadow-xs">
                        {tech.name}: <b className="text-rose-600">thiếu {missingDates.length} ngày</b>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setView('kpi_report')}
                className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-2xl text-xs md:text-sm font-black shadow-md transition-all active:scale-95"
              >
                Kiểm tra &amp; Duyệt phép &rarr;
              </button>
            </div>
          )}
          
          <div>
            <h3 className="font-bold text-slate-800 text-lg md:text-2xl mb-4 md:mb-6 flex items-center"><Settings className="w-6 h-6 md:w-8 md:h-8 mr-2 text-slate-600" /> Hệ thống tính năng</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
               <button onClick={() => setView('user_management')} className="bg-white rounded-3xl border border-slate-200 shadow-sm w-full flex items-center p-5 md:p-6 hover:shadow-md hover:border-emerald-300 transition-all active:scale-95 text-left group">
                  <div className="bg-emerald-100 p-4 md:p-5 rounded-2xl text-emerald-600 mr-4 md:mr-5 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><User className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div><p className="font-bold text-slate-800 text-base md:text-lg">Quản lý Tài Khoản</p><p className="text-xs text-slate-500 mt-1">Tạo &amp; phân quyền KTV</p></div>
               </button>

               <button onClick={() => { setMachineFilter('all'); setView('machines'); }} className="bg-white rounded-3xl border border-slate-200 shadow-sm w-full flex items-center p-5 md:p-6 hover:shadow-md hover:border-blue-300 transition-all active:scale-95 text-left group">
                  <div className="bg-blue-100 p-4 md:p-5 rounded-2xl text-blue-600 mr-4 md:mr-5 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Database className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div><p className="font-bold text-slate-800 text-base md:text-lg">Quản lý Thiết Bị</p><p className="text-xs text-slate-500 mt-1">Danh sách máy &amp; trạng thái</p></div>
               </button>

               <button onClick={() => setView('inventory')} className="bg-white rounded-3xl border border-slate-200 shadow-sm w-full flex items-center p-5 md:p-6 hover:shadow-md hover:border-orange-300 transition-all active:scale-95 text-left group">
                  <div className="bg-orange-100 p-4 md:p-5 rounded-2xl text-orange-600 mr-4 md:mr-5 group-hover:bg-orange-500 group-hover:text-white transition-colors"><Boxes className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div><p className="font-bold text-slate-800 text-base md:text-lg">Kho Vật Tư</p><p className="text-xs text-slate-500 mt-1">Quản lý tồn kho linh kiện</p></div>
               </button>

               <button onClick={() => { setTaskFilter('all'); setView('daily_task_history'); }} className="bg-white rounded-3xl border border-slate-200 shadow-sm w-full flex items-center p-5 md:p-6 hover:shadow-md hover:border-purple-300 transition-all active:scale-95 text-left group">
                  <div className="bg-purple-100 p-4 md:p-5 rounded-2xl text-purple-600 mr-4 md:mr-5 group-hover:bg-purple-500 group-hover:text-white transition-colors"><CalendarClock className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div><p className="font-bold text-slate-800 text-base md:text-lg">Sổ Ghi Công Việc</p><p className="text-xs text-slate-500 mt-1">Báo cáo ngày &amp; Xuất KPI</p></div>
               </button>

               <button onClick={() => setView('kpi_report')} className="bg-white rounded-3xl border border-slate-200 shadow-sm w-full flex items-center p-5 md:p-6 hover:shadow-md hover:border-violet-300 transition-all active:scale-95 text-left group">
                  <div className="bg-violet-100 p-4 md:p-5 rounded-2xl text-violet-600 mr-4 md:mr-5 group-hover:bg-violet-600 group-hover:text-white transition-colors"><BarChart3 className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div><p className="font-bold text-slate-800 text-base md:text-lg">Báo Cáo KPI Bảo Trì</p><p className="text-xs text-slate-500 mt-1">Bảng tính &amp; Phiếu ký chuẩn</p></div>
               </button>

               <button onClick={() => setView('utility_history')} className="bg-white rounded-3xl border border-slate-200 shadow-sm w-full flex items-center p-5 md:p-6 hover:shadow-md hover:border-cyan-300 transition-all active:scale-95 text-left group">
                  <div className="bg-cyan-100 p-4 md:p-5 rounded-2xl text-cyan-600 mr-4 md:mr-5 group-hover:bg-cyan-500 group-hover:text-white transition-colors"><Droplets className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div><p className="font-bold text-slate-800 text-base md:text-lg">Sổ Ghi Điện / Nước</p><p className="text-xs text-slate-500 mt-1">Lịch sử tiêu thụ tháng</p></div>
               </button>

               <button onClick={() => setView('settings')} className="bg-white rounded-3xl border border-slate-200 shadow-sm w-full flex items-center p-5 md:p-6 hover:shadow-md hover:border-slate-400 transition-all active:scale-95 text-left group">
                  <div className="bg-slate-100 p-4 md:p-5 rounded-2xl text-slate-600 mr-4 md:mr-5 group-hover:bg-slate-700 group-hover:text-white transition-colors"><Settings className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div><p className="font-bold text-slate-800 text-base md:text-lg">Cài đặt Hệ thống</p><p className="text-xs text-slate-500 mt-1">Kỳ tháng, Google Sheet, SLA</p></div>
               </button>

               <button onClick={() => setView('home')} className="bg-white rounded-3xl border border-slate-200 shadow-sm w-full flex items-center p-5 md:p-6 hover:shadow-md hover:border-indigo-300 transition-all active:scale-95 text-left group">
                  <div className="bg-indigo-100 p-4 md:p-5 rounded-2xl text-indigo-600 mr-4 md:mr-5 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><QrCode className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div><p className="font-bold text-slate-800 text-base md:text-lg">Giao Diện Kỹ Thuật</p><p className="text-xs text-slate-500 mt-1">Quét QR &amp; Nhập báo cáo</p></div>
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HomeView = ({ user, machines, dailyTasks, logs, setView, handleLogout, setMachineFilter, setTaskFilter, setInitialTaskData, setEditTaskData, sysSettings }) => {
  const machinesOperational = machines.filter(m => m.status === 'operational').length;
  const machinesIssue = machines.filter(m => m.status === 'maintenance' || m.status === 'broken').length;
  const totalPending = dailyTasks.filter(t => t.status !== 'Hoàn thành').length;

  const monthStartDay = Math.min(28, Math.max(1, Number(sysSettings?.month_config?.startDay) || 16));
  const activeMonth = getActiveReportMonth(sysSettings);
  const cycleInfo = getMonthCycleRange(activeMonth, monthStartDay);
  const unmergedTasks = expandMergedTaskEntries(dailyTasks);

  const isTechnician = user && user.role !== 'admin';
  const todayStr = getTodayDateStr();
  const isTodaySunday = new Date().getDay() === 0;

  const currentCycleAttendance = isTechnician
    ? analyzeEmployeeAttendanceInRange(user, unmergedTasks, cycleInfo.startDate, cycleInfo.endDate, sysSettings)
    : { missingDates: [], leaveDates: [] };

  // Nếu vừa bước sang kỳ mới trong vòng 5 ngày đầu, kiểm tra thêm các ngày thiếu của kỳ vừa kết thúc
  const prevCycleMissing = (() => {
    if (!isTechnician || monthStartDay <= 1) return [];
    const todayDay = new Date().getDate();
    if (todayDay < monthStartDay || todayDay > monthStartDay + 5) return [];
    const [y, m] = activeMonth.split('-').map(Number);
    const prevY = m === 1 ? y - 1 : y;
    const prevM = m === 1 ? 12 : m - 1;
    const prevMonthStr = `${prevY}-${String(prevM).padStart(2, '0')}`;
    const prevCycle = getMonthCycleRange(prevMonthStr, monthStartDay);
    return analyzeEmployeeAttendanceInRange(user, unmergedTasks, prevCycle.startDate, prevCycle.endDate, sysSettings).missingDates;
  })();

  const allMissingDates = Array.from(new Set([...prevCycleMissing, ...currentCycleAttendance.missingDates])).sort();

  const hasReportedToday = isTechnician && unmergedTasks.some(
    t => t && String(t.date || '') === todayStr && (t.username === user.username || t.technicianName === user.name || t.technicianName === user.username)
  );

  const handleOpenFillMissingDate = (targetDate) => {
    setInitialTaskData({ date: targetDate, isMissingFill: true });
    setEditTaskData(null);
    setView('daily_task_form');
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 md:bg-slate-50 animate-fade-in">
      <div className="bg-blue-600 px-5 md:px-8 pt-8 md:pt-6 pb-12 md:pb-6 rounded-b-[2.5rem] md:rounded-none shrink-0 relative shadow-md z-0">
         <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3 md:gap-4">
               <div className="bg-white/20 p-3 md:p-4 rounded-2xl backdrop-blur-sm shadow-inner"><User className="w-6 h-6 md:w-8 md:h-8 text-white"/></div>
               <div><p className="text-blue-100 text-xs md:text-sm font-medium">Xin chào,</p><h1 className="text-white font-bold text-xl md:text-3xl leading-tight break-words">{user.name}</h1></div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
               {user.role === 'admin' && <button onClick={() => setView('dashboard')} className="text-blue-700 font-bold text-[11px] md:text-sm uppercase bg-blue-50 px-3 md:px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl shadow-sm active:scale-95 hover:bg-white transition-all">Trang Quản Trị</button>}
               <button onClick={handleLogout} className="bg-white/10 p-2.5 md:p-3.5 rounded-full hover:bg-red-500 hover:text-white text-blue-50 transition-colors shadow-sm"><LogOut className="w-5 h-5 md:w-6 md:h-6" /></button>
            </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 -mt-6 md:mt-0 md:pt-8 pb-20 space-y-4 md:space-y-8 custom-scrollbar relative z-10">
         <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                 <div className="bg-white rounded-3xl shadow-sm md:shadow-md border border-slate-200 p-5 md:p-6 grid grid-cols-3 gap-2 md:gap-4 divide-x divide-slate-100 h-full">
                    <div className="text-center px-1 md:px-3 cursor-pointer hover:bg-slate-50 transition-colors rounded-2xl flex flex-col justify-center" onClick={() => { setMachineFilter('operational'); setView('manual_select'); }}>
                       <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-2 md:mb-3">Máy tốt</p>
                       <p className="text-3xl md:text-5xl font-black text-green-600 leading-none">{machinesOperational}</p>
                    </div>
                    <div className="text-center px-1 md:px-3 cursor-pointer hover:bg-slate-50 transition-colors rounded-2xl flex flex-col justify-center" onClick={() => { setMachineFilter('issue'); setView('manual_select'); }}>
                       <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-2 md:mb-3">Lỗi / Bảo trì</p>
                       <p className="text-3xl md:text-5xl font-black text-red-500 leading-none">{machinesIssue}</p>
                    </div>
                    <div className="text-center px-1 md:px-3 cursor-pointer hover:bg-slate-50 transition-colors rounded-2xl flex flex-col justify-center" onClick={() => { setTaskFilter('pending'); setView('daily_task_history'); }}>
                       <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-2 md:mb-3">Tồn đọng</p>
                       <p className="text-3xl md:text-5xl font-black text-orange-500 leading-none">{totalPending}</p>
                    </div>
                 </div>

                 <button onClick={() => setView('scanner')} className="lg:col-span-2 w-full h-full min-h-[120px] md:min-h-[140px] bg-slate-900 text-white p-5 md:p-8 rounded-3xl flex items-center justify-center gap-4 md:gap-6 shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98]">
                     <div className="bg-white/20 p-3 md:p-5 rounded-2xl md:rounded-3xl"><QrCode className="w-8 h-8 md:w-12 md:h-12" /></div>
                     <span className="font-black text-2xl md:text-4xl tracking-wide">Quét Mã QR Máy</span>
                 </button>
             </div>

             {isTechnician && allMissingDates.length > 0 && (
               <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-4 md:p-6 shadow-md animate-fade-in space-y-3">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                   <div className="flex items-start gap-3">
                     <div className="bg-rose-600 text-white p-3 rounded-2xl shrink-0 shadow-sm animate-pulse">
                       <AlertTriangle className="w-6 h-6" />
                     </div>
                     <div>
                       <div className="flex flex-wrap items-center gap-2">
                         <h3 className="font-black text-rose-900 text-base md:text-lg">
                           Cảnh báo: Bạn đang nhập thiếu {allMissingDates.length} ngày báo cáo!
                         </h3>
                         <span className="text-[11px] font-bold bg-rose-600 text-white px-2.5 py-0.5 rounded-full">
                           Trừ % KPI
                         </span>
                       </div>
                       <p className="text-xs md:text-sm text-rose-700 mt-1 leading-relaxed">
                         Các ngày làm việc chưa có báo cáo (trừ Chủ nhật &amp; Nghỉ phép) sẽ bị đánh giá <b>Không hoàn thành</b> và trừ điểm KPI tháng. Chạm vào từng ngày bên dưới để nhập bổ sung ngay:
                       </p>
                     </div>
                   </div>
                   <button
                     onClick={() => handleOpenFillMissingDate(allMissingDates[0])}
                     className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 rounded-2xl text-xs md:text-sm font-black shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                   >
                     <Plus className="w-4 h-4" /> Nhập bổ sung ({formatDateVi(allMissingDates[0])})
                   </button>
                 </div>

                 <div className="flex flex-wrap gap-2 pt-1">
                   {allMissingDates.map((mDate) => (
                     <button
                       key={mDate}
                       onClick={() => handleOpenFillMissingDate(mDate)}
                       className="bg-white hover:bg-rose-600 text-rose-800 hover:text-white border border-rose-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                       title="Bấm để nhập báo cáo bổ sung hoặc khai báo nghỉ phép cho ngày này"
                     >
                       <CalendarClock className="w-3.5 h-3.5" />
                       <span>{getVietnameseDayName(mDate)}, {formatDateVi(mDate)}</span>
                     </button>
                   ))}
                 </div>
               </div>
             )}

             {isTechnician && allMissingDates.length === 0 && !isTodaySunday && !hasReportedToday && (
               <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 md:px-6 md:py-4 shadow-sm flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                 <div className="flex items-center gap-3">
                   <div className="bg-amber-100 text-amber-700 p-2.5 rounded-xl shrink-0">
                     <Clock className="w-5 h-5" />
                   </div>
                   <p className="text-xs md:text-sm text-amber-900 font-medium">
                     Nhắc nhở: Hôm nay (<b>{formatDateVi(todayStr)}</b>) bạn chưa nhập báo cáo công việc ngày.
                   </p>
                 </div>
                 <button
                   onClick={() => { setInitialTaskData(null); setEditTaskData(null); setView('daily_task_form'); }}
                   className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
                 >
                   Nhập báo cáo hôm nay
                 </button>
               </div>
             )}

             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                 <button onClick={() => { setMachineFilter('all'); setView('manual_select'); }} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-start gap-3 md:gap-4 hover:shadow-md hover:border-blue-400 transition-all active:scale-95 group">
                     <div className="bg-blue-50 p-3.5 md:p-4 rounded-2xl group-hover:bg-blue-500 transition-colors"><ListFilter className="w-6 h-6 md:w-8 md:h-8 text-blue-600 group-hover:text-white"/></div>
                     <div className="text-left"><p className="font-bold text-sm md:text-lg text-slate-800">Chọn Thiết Bị</p><p className="text-[10px] md:text-xs text-slate-500 mt-1">Tìm kiếm thủ công</p></div>
                 </button>

                 <button onClick={() => setView('inventory')} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-start gap-3 md:gap-4 hover:shadow-md hover:border-orange-400 transition-all active:scale-95 group">
                     <div className="bg-orange-50 p-3.5 md:p-4 rounded-2xl group-hover:bg-orange-500 transition-colors"><Boxes className="w-6 h-6 md:w-8 md:h-8 text-orange-600 group-hover:text-white"/></div>
                     <div className="text-left"><p className="font-bold text-sm md:text-lg text-slate-800">Kho Vật Tư</p><p className="text-[10px] md:text-xs text-slate-500 mt-1">Xem tồn kho linh kiện</p></div>
                 </button>

                 <button onClick={() => { setInitialTaskData(null); setEditTaskData(null); setView('daily_task_form'); }} className="relative bg-purple-50 p-5 md:p-6 rounded-3xl border border-purple-100 shadow-sm flex flex-col items-start gap-3 md:gap-4 hover:shadow-md hover:bg-purple-100 hover:border-purple-300 transition-all active:scale-95 group">
                     {isTechnician && allMissingDates.length > 0 && (
                       <span className="absolute top-3 right-3 bg-rose-600 text-white text-[10px] md:text-xs font-black px-2.5 py-1 rounded-full shadow-sm animate-bounce">
                         Thiếu {allMissingDates.length} ngày
                       </span>
                     )}
                     <div className="bg-purple-200 p-3.5 md:p-4 rounded-2xl group-hover:bg-purple-600 transition-colors"><CalendarClock className="w-6 h-6 md:w-8 md:h-8 text-purple-700 group-hover:text-white"/></div>
                     <div className="text-left"><p className="font-bold text-sm md:text-lg text-purple-900">Báo Cáo Ngày</p><p className="text-[10px] md:text-xs text-purple-600 mt-1">Việc ngoài / không QR</p></div>
                 </button>

                 <button onClick={() => { setTaskFilter('all'); setView('daily_task_history'); }} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-start gap-3 md:gap-4 hover:shadow-md hover:border-slate-400 transition-all active:scale-95 group">
                     <div className="bg-slate-100 p-3.5 md:p-4 rounded-2xl group-hover:bg-slate-600 transition-colors"><History className="w-6 h-6 md:w-8 md:h-8 text-slate-600 group-hover:text-white"/></div>
                     <div className="text-left"><p className="font-bold text-sm md:text-lg text-slate-800">Sổ Lịch Sử</p><p className="text-[10px] md:text-xs text-slate-500 mt-1">Xem lại việc đã làm</p></div>
                 </button>

                 <button onClick={() => setView('kpi_report')} className="bg-violet-50 p-5 md:p-6 rounded-3xl border border-violet-200 shadow-sm flex flex-col items-start gap-3 md:gap-4 hover:shadow-md hover:bg-violet-100 hover:border-violet-300 transition-all active:scale-95 group">
                     <div className="bg-violet-200 p-3.5 md:p-4 rounded-2xl group-hover:bg-violet-600 transition-colors"><BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-violet-700 group-hover:text-white"/></div>
                     <div className="text-left"><p className="font-bold text-sm md:text-lg text-violet-900">Báo Cáo KPI</p><p className="text-[10px] md:text-xs text-violet-600 mt-1">Xem điểm hiệu suất tháng</p></div>
                 </button>

                 <button onClick={() => setView('meter_menu')} className="col-span-2 sm:col-span-3 lg:col-span-4 xl:col-span-1 bg-gradient-to-r from-cyan-50 to-blue-50 p-5 md:p-6 rounded-3xl border border-cyan-100 shadow-sm flex items-center xl:flex-col xl:items-start justify-between xl:justify-start gap-3 hover:shadow-md transition-all active:scale-[0.98]">
                     <div className="flex items-center xl:flex-col xl:items-start gap-4 md:gap-6">
                        <div className="bg-white p-3.5 md:p-4 rounded-2xl shadow-sm flex gap-2"><Zap className="w-6 h-6 md:w-8 md:h-8 text-yellow-500"/><Droplets className="w-6 h-6 md:w-8 md:h-8 text-blue-500"/></div>
                        <div className="text-left"><p className="font-bold text-base md:text-lg text-cyan-900">Sổ Ghi Điện / Nước</p><p className="text-[11px] md:text-xs text-cyan-700 mt-1">Lịch sử hằng tháng</p></div>
                     </div>
                     <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-cyan-600 font-bold md:text-xl xl:self-end mt-auto">&rarr;</div>
                 </button>
             </div>
         </div>
      </div>
    </div>
  );
};

const ScannerView = ({ user, setView, handleScanSuccess, machines }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 text-white relative animate-fade-in">
      <div className="absolute top-4 left-4 z-50">
        <button onClick={() => setView('home')} className="p-3 bg-white/20 rounded-full hover:bg-white/40 backdrop-blur-md transition-all"><ArrowLeft className="w-6 h-6" /></button>
      </div>
      <NativeCameraScanner onScan={handleScanSuccess} />
      <div className="absolute bottom-10 w-full text-center z-50 flex justify-center">
         <button onClick={() => setView('manual_select')} className="bg-blue-600/90 border border-blue-400 px-6 py-3.5 rounded-full font-bold backdrop-blur-md shadow-lg hover:bg-blue-600 transition-all flex items-center gap-2"><ListFilter className="w-5 h-5"/> Nhập mã thủ công</button>
      </div>
    </div>
  );
};

const ManualSelectView = ({ machines, logs, setView, handleScanSuccess, machineFilter }) => {
   const [search, setSearch] = useState('');
   const [expandedGroups, setExpandedGroups] = useState({});

   let filtered = Array.isArray(machines) ? machines : [];
   if (machineFilter === 'operational') filtered = filtered.filter(m => m?.status === 'operational');
   if (machineFilter === 'issue') filtered = filtered.filter(m => m?.status !== 'operational');
   filtered = filtered.filter(m => String(m?.name || '').toLowerCase().includes(search.toLowerCase()) || String(m?.id || '').toLowerCase().includes(search.toLowerCase()));

   const groupedMachines = {};
   filtered.forEach(m => {
       if (!m) return;
       const cat = m.category || 'Chưa phân loại';
       if (!groupedMachines[cat]) groupedMachines[cat] = [];
       groupedMachines[cat].push(m);
   });
   
   const sortedGroups = Object.keys(groupedMachines).sort((a, b) => {
       if (a === 'Chưa phân loại') return 1;
       if (b === 'Chưa phân loại') return -1;
       return a.localeCompare(b);
   });

   const toggleGroup = (groupName) => {
       setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
   };

   return (
     <div className="flex flex-col h-full bg-slate-50 animate-fade-in">
        <div className="p-4 md:p-6 bg-white shadow-sm flex items-center gap-3 shrink-0">
           <button onClick={() => setView('home')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
           <h2 className="font-bold text-lg md:text-xl flex-1 text-slate-800">Chọn Thiết Bị Thủ Công</h2>
        </div>
        <div className="p-4 shrink-0 bg-white border-b border-slate-200">
           <div className="max-w-3xl mx-auto relative">
              <Search className="absolute left-3 top-3 md:top-3.5 w-5 h-5 text-slate-400" />
              <input type="text" placeholder="Tìm tên hoặc mã máy..." className="w-full pl-10 pr-4 py-3 md:py-3.5 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base font-medium transition-all" value={search} onChange={e=>setSearch(e.target.value)} />
           </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
           <div className="max-w-3xl mx-auto space-y-6">
               {filtered.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-300">Không tìm thấy thiết bị phù hợp.</div>
               ) : (
                  sortedGroups.map((groupName) => {
                    const isExpanded = expandedGroups[groupName];
                    return (
                      <div key={groupName} className="space-y-3">
                         <div onClick={() => toggleGroup(groupName)} className="flex items-center justify-between border-b border-slate-300 pb-2 mb-3 mt-2 cursor-pointer hover:bg-slate-100 rounded-xl p-2 transition-colors">
                             <h3 className="font-black text-slate-700 text-base md:text-lg uppercase tracking-wide flex items-center"><Database className="w-5 h-5 mr-2 text-slate-500" /> Nhóm: {groupName} <span className="text-sm font-bold text-slate-400 normal-case ml-2">({groupedMachines[groupName].length} máy)</span></h3>
                             <button className="text-slate-500 bg-white p-1.5 rounded-full shadow-sm border border-slate-200 hover:text-blue-600 hover:border-blue-300 transition-colors focus:outline-none">
                                 {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                             </button>
                         </div>
                         {isExpanded && (
                           <div className="flex flex-col gap-3 animate-fade-in">
                              {groupedMachines[groupName].map(m => (
                                <button key={m.id} onClick={() => handleScanSuccess(m.id)} className="w-full bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 text-left hover:border-blue-400 hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-between group">
                                   <div className="overflow-hidden pr-4 flex-1">
                                     <h4 className="font-bold text-slate-800 text-base md:text-lg truncate group-hover:text-blue-700 transition-colors mb-1">{m.name}</h4>
                                     <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                        <span className="text-xs md:text-sm text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{m.id}</span>
                                        {m.location && <span className="text-xs md:text-sm text-slate-500 flex items-center"><MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0"/> {m.location}</span>}
                                        {m.department && <span className="text-xs md:text-sm text-slate-500 flex items-center"><User className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0"/> {m.department}</span>}
                                     </div>
                                     {m.status !== 'operational' && (
                                         <div className="mt-2.5 text-xs md:text-sm text-red-700 bg-red-50 p-2 md:p-2.5 rounded-xl border border-red-100 flex items-start w-full text-left">
                                             <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0 mt-0.5 text-red-500" />
                                             <span className="line-clamp-2" title={logs?.find(l => l.machineId === m.id)?.note || 'Không có ghi chú'}>
                                                 <b>Ghi chú lỗi: </b>{logs?.find(l => l.machineId === m.id)?.note || 'Chưa cập nhật thông tin lỗi.'}
                                             </span>
                                         </div>
                                     )}
                                   </div>
                                   <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full shrink-0 shadow-sm ${m.status === 'operational' ? 'bg-green-500' : m.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                </button>
                              ))}
                           </div>
                         )}
                      </div>
                    );
                  })
               )}
           </div>
        </div>
     </div>
   );
};

const MeterMenuView = ({ setView, user, setUtilityMode }) => {
  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in">
       <div className="p-4 md:p-6 bg-white shadow-sm flex items-center gap-3 shrink-0">
           <button onClick={() => setView('home')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
           <h2 className="font-bold text-lg md:text-xl flex-1 text-slate-800">Menu Ghi Điện / Nước</h2>
       </div>
       <div className="p-4 md:p-8 space-y-4 md:space-y-6 max-w-xl mx-auto w-full flex-1 overflow-y-auto custom-scrollbar">
          <button onClick={() => { setUtilityMode('elec'); setView('utility_form'); }} className="w-full bg-yellow-50 p-6 md:p-8 rounded-3xl border border-yellow-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all active:scale-95 group">
             <div className="bg-yellow-100 p-4 md:p-5 rounded-2xl group-hover:bg-yellow-500 group-hover:text-white transition-colors"><Zap className="w-8 h-8 md:w-10 md:h-10 text-yellow-600 group-hover:text-white" /></div>
             <div className="text-left"><h3 className="font-black text-yellow-900 text-lg md:text-2xl">Ghi Chỉ Số Điện</h3><p className="text-yellow-700 text-sm md:text-base mt-1">Cập nhật điện năng tiêu thụ</p></div>
          </button>
          <button onClick={() => { setUtilityMode('water'); setView('utility_form'); }} className="w-full bg-blue-50 p-6 md:p-8 rounded-3xl border border-blue-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all active:scale-95 group">
             <div className="bg-blue-100 p-4 md:p-5 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-colors"><Droplets className="w-8 h-8 md:w-10 md:h-10 text-blue-600 group-hover:text-white" /></div>
             <div className="text-left"><h3 className="font-black text-blue-900 text-lg md:text-2xl">Ghi Chỉ Số Nước</h3><p className="text-blue-700 text-sm md:text-base mt-1">Cập nhật khối lượng nước</p></div>
          </button>
          <button onClick={() => setView('utility_history')} className="w-full bg-slate-100 p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-slate-300 transition-all active:scale-95 mt-8 group">
             <div className="bg-slate-200 p-4 md:p-5 rounded-2xl group-hover:bg-slate-600 group-hover:text-white transition-colors"><History className="w-8 h-8 md:w-10 md:h-10 text-slate-600 group-hover:text-white" /></div>
             <div className="text-left"><h3 className="font-black text-slate-800 text-lg md:text-2xl">Xem Lịch Sử</h3><p className="text-slate-500 text-sm md:text-base mt-1">Tra cứu chỉ số đã ghi</p></div>
          </button>
       </div>
    </div>
  );
};

const UtilityFormView = ({ user, setView, showNotification, handleSaveUtilityLog, editData, setEditData, utilityLogs, mode }) => {
  const isElec = mode === 'elec';
  const dateStr = getTodayDateStr();
  const [formData, setFormData] = useState({
     id: editData ? editData.id : Date.now(),
     technicianName: user.name,
     username: user.username,
     date: editData ? editData.date : dateStr,
     note: editData ? editData.note : '',
     images: editData && editData.images ? editData.images : [],
     elec1: editData?.elec1 || { bt: '', cd: '', td: '', vc: '', cosphi: '' },
     elec2: editData?.elec2 || { bt: '', cd: '', td: '', vc: '', cosphi: '' },
     water: editData?.water || { tong: '', bvChinh: '', bvPhu: '', cantinVPC: '', cantinXuong: '', vpChinh: '', tuoiCay: '' }
  });

  const sortedUtilityLogs = [...utilityLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
  const previousLog = sortedUtilityLogs.find(log => log.date < formData.date);
  const prevWaterData = previousLog ? (previousLog.water || {}) : {};

  const handleElecChange = (tram, field, value) => {
     const newData = { ...formData[tram], [field]: value };
     if (['bt', 'cd', 'td', 'vc'].includes(field)) {
         const bt = parseFloat(newData.bt) || 0;
         const cd = parseFloat(newData.cd) || 0;
         const td = parseFloat(newData.td) || 0;
         const vc = parseFloat(newData.vc) || 0;
         const ap = bt + cd + td;
         if (ap > 0 || vc > 0) {
             const cos = ap / Math.sqrt(ap * ap + vc * vc);
             newData.cosphi = cos.toFixed(3);
         } else {
             newData.cosphi = '';
         }
     }
     setFormData({ ...formData, [tram]: newData });
  };

  const renderCosPhiInput = (tram) => {
     const val = formData[tram].cosphi;
     const isWarning = val !== '' && parseFloat(val) < 0.9 && parseFloat(val) > 0;
     
     return (
         <div className="col-span-2 sm:col-span-3 mt-2">
             <label className="text-xs font-bold text-yellow-700 mb-1 flex justify-between items-center">
                 <span>Cos Phi (Hệ số Công suất) - Tự động tính</span>
                 {isWarning && <span className="text-red-600 flex items-center animate-pulse bg-red-100 px-2 py-0.5 rounded-md"><AlertTriangle className="w-3 h-3 mr-1"/> &lt; 0.9 (Phạt vô công)</span>}
             </label>
             <input 
                 readOnly 
                 disabled
                 placeholder="Hệ thống tự tính" 
                 type="text" 
                 value={val} 
                 className={`w-full p-3.5 border rounded-xl outline-none font-black transition-all cursor-not-allowed ${isWarning ? 'border-red-500 bg-red-50 text-red-700 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-yellow-200 bg-yellow-100/50 text-yellow-800 opacity-80'}`} 
             />
         </div>
     );
  };

  const renderWaterField = (fieldKey, labelStr, isFullWidth = false) => {
      const currentVal = formData.water[fieldKey];
      const prevVal = prevWaterData[fieldKey];
      let diffDisplay = null;

      if (currentVal !== '' && prevVal !== undefined && prevVal !== '') {
          const diff = parseFloat(currentVal) - parseFloat(prevVal);
          if (!isNaN(diff)) {
              const isPositive = diff >= 0;
              diffDisplay = (
                  <span className={`text-[10px] md:text-xs font-black ml-2 px-2 py-0.5 rounded-md ${isPositive ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'}`} title={`Chỉ số kỳ trước: ${prevVal}`}>
                      {isPositive ? '+' : ''}{diff} m³ tiêu thụ
                  </span>
              );
          }
      }

      return (
          <div className={isFullWidth ? "sm:col-span-2" : ""}>
              <label className="text-sm font-bold text-blue-800 mb-1.5 flex items-center">
                  {labelStr} {diffDisplay}
              </label>
              <input 
                  placeholder="Khối (m³)" 
                  type="number" 
                  value={formData.water[fieldKey]} 
                  onChange={e=>setFormData({...formData, water: {...formData.water, [fieldKey]: e.target.value}})} 
                  className={`w-full p-3.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold ${isFullWidth ? 'border-blue-400 bg-white shadow-sm' : 'border-blue-300 bg-slate-50 focus:bg-white'}`} 
              />
          </div>
      );
  };

  const handleSave = () => { handleSaveUtilityLog(formData, mode); setEditData(null); };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-fade-in">
       <div className="p-4 md:p-6 bg-white shadow-sm flex items-center gap-3 shrink-0 z-10 border-b border-slate-200">
           <button onClick={() => {setEditData(null); setView(user.role === 'admin' ? 'utility_history' : 'meter_menu');}} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
           <h2 className="font-bold text-lg md:text-2xl flex-1 flex items-center text-slate-800">{isElec ? <Zap className="w-6 h-6 mr-2 text-yellow-500"/> : <Droplets className="w-6 h-6 mr-2 text-blue-500"/>} Ghi Chỉ Số {isElec ? 'Điện' : 'Nước'}</h2>
       </div>
       
       <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-40 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
              <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                 <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Ngày ghi nhận</label>
                    <input type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-bold transition-all" />
                 </div>
                 
                 {isElec ? (
                    <div className="space-y-6">
                       <div className="bg-yellow-50 p-4 md:p-6 rounded-2xl border border-yellow-200">
                          <h4 className="font-black text-yellow-800 text-lg mb-4 flex items-center"><Zap className="w-5 h-5 mr-1.5"/> Trạm 1</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                             <div><label className="text-xs font-bold text-yellow-700 block mb-1">Bình thường</label><input placeholder="Chỉ số" type="number" value={formData.elec1.bt} onChange={e=>handleElecChange('elec1', 'bt', e.target.value)} className="w-full p-3.5 border border-yellow-300 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500 font-bold" /></div>
                             <div><label className="text-xs font-bold text-yellow-700 block mb-1">Cao điểm</label><input placeholder="Chỉ số" type="number" value={formData.elec1.cd} onChange={e=>handleElecChange('elec1', 'cd', e.target.value)} className="w-full p-3.5 border border-yellow-300 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500 font-bold" /></div>
                             <div><label className="text-xs font-bold text-yellow-700 block mb-1">Thấp điểm</label><input placeholder="Chỉ số" type="number" value={formData.elec1.td} onChange={e=>handleElecChange('elec1', 'td', e.target.value)} className="w-full p-3.5 border border-yellow-300 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500 font-bold" /></div>
                             <div><label className="text-xs font-bold text-yellow-700 block mb-1">Vô công (kVArh)</label><input placeholder="Chỉ số" type="number" value={formData.elec1.vc} onChange={e=>handleElecChange('elec1', 'vc', e.target.value)} className="w-full p-3.5 border border-yellow-300 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500 font-bold" /></div>
                             {renderCosPhiInput('elec1')}
                          </div>
                       </div>
                       <div className="bg-yellow-50 p-4 md:p-6 rounded-2xl border border-yellow-200">
                          <h4 className="font-black text-yellow-800 text-lg mb-4 flex items-center"><Zap className="w-5 h-5 mr-1.5"/> Trạm 2</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                             <div><label className="text-xs font-bold text-yellow-700 block mb-1">Bình thường</label><input placeholder="Chỉ số" type="number" value={formData.elec2.bt} onChange={e=>handleElecChange('elec2', 'bt', e.target.value)} className="w-full p-3.5 border border-yellow-300 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500 font-bold" /></div>
                             <div><label className="text-xs font-bold text-yellow-700 block mb-1">Cao điểm</label><input placeholder="Chỉ số" type="number" value={formData.elec2.cd} onChange={e=>handleElecChange('elec2', 'cd', e.target.value)} className="w-full p-3.5 border border-yellow-300 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500 font-bold" /></div>
                             <div><label className="text-xs font-bold text-yellow-700 block mb-1">Thấp điểm</label><input placeholder="Chỉ số" type="number" value={formData.elec2.td} onChange={e=>handleElecChange('elec2', 'td', e.target.value)} className="w-full p-3.5 border border-yellow-300 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500 font-bold" /></div>
                             <div><label className="text-xs font-bold text-yellow-700 block mb-1">Vô công (kVArh)</label><input placeholder="Chỉ số" type="number" value={formData.elec2.vc} onChange={e=>handleElecChange('elec2', 'vc', e.target.value)} className="w-full p-3.5 border border-yellow-300 rounded-xl outline-none focus:ring-2 focus:ring-yellow-500 font-bold" /></div>
                             {renderCosPhiInput('elec2')}
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div className="bg-blue-50 p-4 md:p-6 rounded-2xl border border-blue-200">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-black text-blue-800 text-lg flex items-center"><Droplets className="w-5 h-5 mr-1.5"/> Nước Tiêu Thụ</h4>
                            {previousLog && <span className="text-[10px] md:text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-md">So với: {previousLog.date}</span>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {renderWaterField('tong', 'Đồng hồ tổng', true)}
                           {renderWaterField('bvChinh', 'Bảo vệ cổng chính')}
                           {renderWaterField('bvPhu', 'Bảo vệ cổng phụ')}
                           {renderWaterField('cantinVPC', 'Căn tin VPC')}
                           {renderWaterField('cantinXuong', 'Căn tin xưởng')}
                           {renderWaterField('vpChinh', 'Văn phòng chính')}
                           {renderWaterField('tuoiCay', 'Tưới cây')}
                        </div>
                    </div>
                 )}
              </div>
              
              <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
                 <label className="block text-sm font-bold text-slate-600 mb-2">Ghi chú thêm</label>
                 <textarea placeholder="Mô tả nếu có bất thường..." className="w-full p-4 border border-slate-300 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] bg-slate-50 focus:bg-white transition-all" value={formData.note} onChange={e=>setFormData({...formData, note: e.target.value})}></textarea>
              </div>
          </div>
       </div>

       <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-white/95 backdrop-blur-xl border-t border-slate-200 z-20 shadow-[0_-20px_25px_-5px_rgba(0,0,0,0.05)]">
           <div className="max-w-3xl mx-auto w-full">
              <button onClick={handleSave} className={`w-full text-white py-4 md:py-5 rounded-2xl md:rounded-3xl font-black text-lg md:text-xl flex justify-center items-center gap-3 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all ${isElec ? 'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-500/40' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/40'}`}>
                 <Save className="w-6 h-6 md:w-7 md:h-7"/> {editData ? 'Cập Nhật Thay Đổi' : 'Lưu Chỉ Số Mới'}
              </button>
           </div>
       </div>
    </div>
  );
};

const UtilityHistoryView = ({ utilityLogs, usersList, setView, user, setEditData, setUtilityMode, setZoomedImage }) => {
  const [filterTech, setFilterTech] = useState('all');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const safeLogs = Array.isArray(utilityLogs) ? utilityLogs : [];
  const filteredLogs = safeLogs.filter(t => {
      if (!t) return false;
      let matchTech = filterTech === 'all' ? true : (t.username === filterTech || t.technicianName === filterTech);
      let matchDate = String(t.date || '').startsWith(filterMonth);
      return matchTech && matchDate;
  });

  const sortedFilteredLogs = [...filteredLogs].sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0));

  const handleEdit = (log, mode) => { setEditData(log); setUtilityMode(mode); setView('utility_form'); };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-fade-in">
        <div className="p-4 md:p-6 border-b border-slate-200 bg-white shrink-0 shadow-sm z-10">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                   <button onClick={() => setView(user.role === 'admin' ? 'dashboard' : 'meter_menu')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-6 h-6 md:w-7 md:h-7 text-slate-600" /></button>
                   <h2 className="font-bold text-slate-800 text-lg md:text-2xl flex items-center">Lịch Sử Điện Nước</h2>
                </div>
                <div className="flex gap-3 md:w-1/2 lg:w-1/3">
                   <div className="flex-1 relative">
                       <Filter className="absolute left-3 top-2.5 md:top-3.5 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                       <select value={filterTech} onChange={e => setFilterTech(e.target.value)} className="w-full pl-9 md:pl-10 pr-3 py-2 md:py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-cyan-500 text-slate-700 font-bold"><option value="all">Tất cả KTV</option>{usersList.filter(u=>u.role !== 'admin').map(u => <option key={u.id} value={u.username}>{u.name}</option>)}</select>
                   </div>
                   <div className="flex-1 relative">
                       <VietnameseMonthPicker
                           value={filterMonth}
                           onChange={(val) => setFilterMonth(val)}
                           className="w-full px-3 py-2 md:py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-cyan-500 text-slate-700 font-bold"
                       />
                   </div>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-4">
                <div className="flex justify-between items-center text-xs md:text-sm text-slate-500 uppercase font-bold tracking-wider mb-2"><span>Tháng {filterMonth.split('-').reverse().join('/')} ({sortedFilteredLogs.length} bản ghi)</span></div>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                                <tr>
                                    <th className="px-4 py-4 font-bold whitespace-nowrap">Ngày</th>
                                    <th className="px-4 py-4 font-bold whitespace-nowrap">KTV</th>
                                    <th className="px-4 py-4 font-bold text-yellow-700 whitespace-nowrap"><Zap className="w-3.5 h-3.5 inline mr-1 -mt-0.5"/> T1 (Cosφ)</th>
                                    <th className="px-4 py-4 font-bold text-yellow-700 whitespace-nowrap"><Zap className="w-3.5 h-3.5 inline mr-1 -mt-0.5"/> T2 (Cosφ)</th>
                                    <th className="px-4 py-4 font-bold text-blue-700 whitespace-nowrap"><Droplets className="w-3.5 h-3.5 inline mr-1 -mt-0.5"/> Nước (m³)</th>
                                    <th className="px-4 py-4 font-bold min-w-[200px]">Ghi chú</th>
                                    <th className="px-4 py-4 font-bold text-center whitespace-nowrap">Hình ảnh</th>
                                    <th className="px-4 py-4 font-bold text-center whitespace-nowrap">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedFilteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="p-12 text-center text-slate-400 text-base md:text-lg border-dashed border-slate-300">Không có bản ghi nào.</td>
                                    </tr>
                                ) : (
                                    sortedFilteredLogs.map((log) => {
                                        const logsBefore = utilityLogs.filter(l => l.date < log.date).sort((a, b) => new Date(b.date) - new Date(a.date));
                                        const previousLog = logsBefore.length > 0 ? logsBefore[0] : null;

                                        let waterConsumedStr = "--";
                                        if (previousLog && log.water?.tong !== undefined && previousLog.water?.tong !== undefined && log.water?.tong !== '' && previousLog.water?.tong !== '') {
                                            const diff = parseFloat(log.water.tong) - parseFloat(previousLog.water.tong);
                                            waterConsumedStr = isNaN(diff) ? "--" : diff.toString();
                                        }

                                        const cos1 = log.elec1?.cosphi || '--';
                                        const cos2 = log.elec2?.cosphi || '--';

                                        return (
                                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="font-bold text-slate-800 flex items-center bg-slate-100 px-2.5 py-1.5 rounded-lg w-fit"><CalendarClock className="w-4 h-4 mr-1.5 text-slate-500"/> {log.date}</div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-slate-700 font-medium flex items-center"><User className="w-4 h-4 mr-1.5 text-slate-400" /> {log.technicianName}</div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap font-bold text-yellow-800">{cos1}</td>
                                                <td className="px-4 py-3 whitespace-nowrap font-bold text-yellow-800">{cos2}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="font-black text-blue-700 text-base bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 inline-block shadow-sm">{waterConsumedStr}</div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={log.note}>{log.note || '--'}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-1.5 justify-center">
                                                        {log.images && log.images.length > 0 ? log.images.map((img, idx) => (
                                                            <img key={idx} src={img} onClick={() => setZoomedImage(img)} className="w-10 h-10 md:w-12 md:h-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:scale-110 transition-transform shadow-sm" alt="Log" />
                                                        )) : <span className="text-slate-300">-</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={() => handleEdit(log, 'elec')} className="bg-yellow-50 text-yellow-700 p-2 md:p-2.5 rounded-lg text-sm font-bold hover:bg-yellow-100 border border-yellow-200 shadow-sm transition-colors" title="Sửa Điện"><Zap className="w-4 h-4" /></button>
                                                        <button onClick={() => handleEdit(log, 'water')} className="bg-blue-50 text-blue-700 p-2 md:p-2.5 rounded-lg text-sm font-bold hover:bg-blue-100 border border-blue-200 shadow-sm transition-colors" title="Sửa Nước"><Droplets className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

const UserManagementView = ({ usersList, setView, showNotification, saveUserData, handleDeleteUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ id: '', username: '', password: '', name: '', role: 'maintenance', employeeId: '', position: '', department: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const safeUsers = Array.isArray(usersList) ? usersList : [];
  const filteredUsers = safeUsers.filter(u =>
    u && (
      String(u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(u.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleSave = async () => {
      if (!editForm.username || !editForm.password || !editForm.name) { return showNotification('Vui lòng điền đủ Tên ĐN, Mật khẩu, Họ tên!', 'error'); }
      if (isAdding && usersList.find(u => u.username === editForm.username)) { return showNotification('Tên đăng nhập đã tồn tại!', 'error'); }
      await saveUserData({
          id: editForm.id || `U-${Date.now()}`,
          username: editForm.username,
          password: editForm.password,
          name: editForm.name,
          role: editForm.role,
          employeeId: editForm.employeeId || '',
          position: editForm.position || '',
          department: editForm.department || ''
      });
      showNotification(isAdding ? 'Đã tạo tài khoản KTV mới' : 'Đã cập nhật tài khoản');
      setEditingId(null); setIsAdding(false);
  };

  const handleConfirmDeleteUser = async () => {
      if (deleteModal.id) {
          await handleDeleteUser(deleteModal.id);
          showNotification('Đã xóa tài khoản!');
      }
      setDeleteModal({ isOpen: false, id: null });
  };

  const startAdd = () => { setIsAdding(true); setEditingId(null); setEditForm({ id: '', username: '', password: '', name: '', role: 'maintenance', employeeId: '', position: 'Nhân viên', department: 'Bảo trì xưởng' }); };
  const startEdit = (u) => { setIsAdding(false); setEditingId(u.id); setEditForm({ employeeId: '', position: '', department: '', ...u }); };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in">
      <CustomConfirmModal isOpen={deleteModal.isOpen} title="Xóa tài khoản" message="Bạn có chắc chắn muốn xóa tài khoản này? Hành động này không thể hoàn tác." onConfirm={handleConfirmDeleteUser} onCancel={() => setDeleteModal({ isOpen: false, id: null })} />

      <div className="bg-white p-4 md:p-6 border-b border-slate-200 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3"><button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 md:w-7 md:h-7" /></button><h2 className="font-bold text-slate-800 text-lg md:text-2xl">Quản lý Tài Khoản</h2></div>
            <div className="flex gap-3 md:w-1/2 lg:w-1/3">
                <div className="relative flex-1"><Search className="absolute left-3 top-2.5 md:top-3.5 w-4 h-4 md:w-5 md:h-5 text-slate-400" /><input type="text" placeholder="Tìm tài khoản, Mã NV..." className="w-full pl-9 md:pl-10 pr-3 py-2 md:py-3 bg-slate-100 border-none rounded-xl text-sm md:text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <button onClick={startAdd} className="bg-blue-600 text-white px-4 py-2 md:py-3 rounded-xl text-sm md:text-base font-bold flex items-center shadow-sm hover:bg-blue-700 transition-colors"><User className="w-4 h-4 md:w-5 md:h-5 mr-2"/> Tạo mới</button>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            {(isAdding || editingId) && (
                <div className="bg-blue-50 p-5 md:p-8 rounded-3xl border border-blue-200 shadow-sm mb-6 animate-fade-in max-w-3xl mx-auto">
                    <h3 className="font-bold text-blue-800 mb-6 md:text-xl">{isAdding ? 'Tạo tài khoản KTV mới' : 'Cập nhật tài khoản'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div><label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Tên đăng nhập <span className="text-red-500">*</span></label><input disabled={!isAdding && editForm.id === 'admin'} value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100" placeholder="VD: ktv_nguyen" /></div>
                        <div><label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Mật khẩu <span className="text-red-500">*</span></label><input value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="w-full p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="***" /></div>
                        <div><label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Họ và Tên <span className="text-red-500">*</span></label><input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white font-bold" placeholder="Họ tên đầy đủ" /></div>
                        <div><label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Mã nhân viên</label><input value={editForm.employeeId || ''} onChange={e => setEditForm({...editForm, employeeId: e.target.value})} className="w-full p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="VD: CN0314" /></div>
                        <div><label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Chức vụ</label><input value={editForm.position || ''} onChange={e => setEditForm({...editForm, position: e.target.value})} className="w-full p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="VD: Thợ điện, Thợ cơ..." /></div>
                        <div><label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Đơn vị / Bộ phận</label><input value={editForm.department || ''} onChange={e => setEditForm({...editForm, department: e.target.value})} className="w-full p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="VD: Bảo trì xưởng" /></div>
                        <div className="md:col-span-2"><label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Quyền hạn</label>
                            <select disabled={editForm.id === 'admin'} value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base bg-white outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100">
                                <option value="maintenance">Kỹ thuật viên</option><option value="admin">Quản lý (Admin)</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-blue-100">
                        <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-5 py-3 bg-white text-slate-600 rounded-xl text-sm md:text-base border border-slate-200 font-bold hover:bg-slate-50 transition-colors">Hủy bỏ</button>
                        <button onClick={handleSave} className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm md:text-base font-bold shadow-md flex items-center hover:bg-blue-700 transition-colors"><Save className="w-5 h-5 mr-2"/> Lưu Tài Khoản</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <div key={u.id} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-4 mb-4">
                       <div className={`p-3 md:p-4 rounded-2xl shrink-0 ${u.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                           {u.role === 'admin' ? <Lock className="w-6 h-6 md:w-8 md:h-8" /> : <User className="w-6 h-6 md:w-8 md:h-8" />}
                       </div>
                       <div className="overflow-hidden flex-1">
                           <h4 className="font-bold text-slate-800 text-base md:text-lg truncate">{u.name}</h4>
                           <div className="text-xs md:text-sm text-slate-500 font-mono mt-2 bg-slate-50 p-2 md:p-3 rounded-xl border border-slate-100 break-all space-y-1">
                               <div><b className="text-slate-700">Mã NV:</b> {u.employeeId || '--'}</div>
                               <div><b className="text-slate-700">Chức vụ:</b> {u.position || '--'}</div>
                               <div><b className="text-slate-700">Đơn vị:</b> {u.department || '--'}</div>
                               <div><b className="text-slate-700">User:</b> {u.username}</div>
                               <div><b className="text-slate-700">Pass:</b> {u.password}</div>
                           </div>
                       </div>
                    </div>
                    <div className="flex gap-2 justify-end mt-auto pt-4 border-t border-slate-100">
                       <button onClick={() => startEdit(u)} className="px-4 py-2 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-xl transition-colors border border-blue-100 text-sm font-bold flex items-center"><Edit className="w-4 h-4 mr-1.5" /> Sửa</button>
                       {u.id !== 'admin' && <button onClick={() => setDeleteModal({isOpen: true, id: u.id})} className="px-4 py-2 text-red-600 hover:text-white bg-red-50 hover:bg-red-500 rounded-xl transition-colors border border-red-100 text-sm font-bold flex items-center"><Trash2 className="w-4 h-4 mr-1.5" /> Xóa</button>}
                    </div>
                  </div>
                ))
              ) : (<div className="col-span-full p-12 text-center text-slate-400 text-base md:text-lg bg-white rounded-3xl border border-dashed border-slate-300">Không tìm thấy tài khoản phù hợp.</div>)}
            </div>
        </div>
      </div>
    </div>
  );
};

const MachineManagementView = ({ machines, logs, setView, showNotification, saveMachineData, machineFilter, handleDeleteMachineApp, user, categoryList, saveCategoryListData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ id: '', name: '', model: '', location: '', department: '', category: '', status: 'operational' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [expandedGroups, setExpandedGroups] = useState({});
  
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [deleteCatModal, setDeleteCatModal] = useState({ isOpen: false, cat: null });

  let baseMachines = Array.isArray(machines) ? machines : [];
  if (machineFilter === 'operational') baseMachines = baseMachines.filter(m => m?.status === 'operational');
  if (machineFilter === 'issue') baseMachines = baseMachines.filter(m => m?.status === 'maintenance' || m?.status === 'broken');

  const filteredMachines = baseMachines.filter(m => m && (String(m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || String(m.id || '').toLowerCase().includes(searchTerm.toLowerCase())));
  const filterTitle = machineFilter === 'operational' ? '(Máy Đang Tốt)' : machineFilter === 'issue' ? '(Lỗi / Bảo Trì)' : '';

  const groupedMachines = {};
  filteredMachines.forEach(m => {
      const cat = m.category || 'Chưa phân loại';
      if (!groupedMachines[cat]) groupedMachines[cat] = [];
      groupedMachines[cat].push(m);
  });
  const sortedGroups = Object.keys(groupedMachines).sort((a, b) => {
      if (a === 'Chưa phân loại') return 1;
      if (b === 'Chưa phân loại') return -1;
      return a.localeCompare(b);
  });

  const toggleGroup = (groupName) => {
      setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const startAdd = () => { setIsAdding(true); setEditingId(null); setEditForm({ id: '', name: '', model: '', location: '', department: '', category: '', status: 'operational' }); };
  const startEdit = (m) => { setIsAdding(false); setEditingId(m.id); setEditForm({ id: m.id, name: m.name, model: m.model || '', location: m.location || '', department: m.department || '', category: m.category || '', status: m.status || 'operational' }); };

  const allCategories = Array.from(new Set([...(categoryList || []), ...machines.map(m => m.category).filter(Boolean)]));

  const handleAddCategory = () => {
      const trimmed = newCatName.trim();
      if (trimmed && !allCategories.includes(trimmed)) {
          if (saveCategoryListData) saveCategoryListData([...(categoryList||[]), trimmed]);
          setNewCatName('');
          showNotification('Đã thêm chủng loại mới!');
      } else if (allCategories.includes(trimmed)) {
          showNotification('Chủng loại này đã tồn tại!', 'error');
      }
  };

  const handleConfirmDeleteCat = async () => {
      const cat = deleteCatModal.cat;
      if (cat) {
          if (saveCategoryListData) saveCategoryListData((categoryList||[]).filter(c => c !== cat));
          const updates = machines.filter(m => m.category === cat).map(m => saveMachineData({ ...m, category: '' }));
          await Promise.all(updates);
          showNotification(`Đã xóa chủng loại ${cat}`);
      }
      setDeleteCatModal({ isOpen: false, cat: null });
  };

  const handleSaveEdit = async () => {
      if (!editForm.name) { showNotification('Vui lòng nhập tên thiết bị!', 'error'); return; }
      let finalId = editForm.id.trim();
      if (isAdding) {
          if (!finalId) finalId = `M-${Date.now()}`;
          if (machines.find(m => m.id === finalId)) { showNotification('Mã thiết bị này đã tồn tại!', 'error'); return; }
      } else {
          if (finalId !== editingId && machines.find(m => m.id === finalId)) {
              showNotification('Mã thiết bị này đã tồn tại!', 'error'); return;
          }
          if (finalId !== editingId) {
              await handleDeleteMachineApp(editingId);
          }
      }
      await saveMachineData({ ...editForm, id: finalId });
      setEditingId(null); setIsAdding(false);
      showNotification(isAdding ? 'Đã thêm thiết bị mới thành công!' : 'Đã cập nhật thiết bị!');
  };

  const handleConfirmDelete = async () => {
      if (deleteModal.id) { await handleDeleteMachineApp(deleteModal.id); showNotification('Đã xóa thiết bị!'); }
      setDeleteModal({ isOpen: false, id: null });
  };

  const handleExportExcel = async () => {
      try {
        setIsLoading(true); const XLSX = await loadXLSX();
        const headers = ['Mã Thiết Bị', 'Tên Thiết Bị', 'Model', 'Vị Trí', 'Phòng Ban', 'Chủng Loại', 'Trạng Thái'];
        const rows = machines.map(m => [m.id, m.name, m.model || '', m.location || '', m.department || '', m.category || '', m.status || 'operational']);
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]); const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Danh_Sach_May"); XLSX.writeFile(workbook, `Danh_Sach_Thiet_Bi_${new Date().toISOString().split('T')[0]}.xlsx`);
        showNotification('Đã xuất file Excel thành công!');
      } catch (err) { showNotification('Lỗi khi xuất file Excel', 'error'); } finally { setIsLoading(false); }
  };

  const handleImportExcel = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        setIsLoading(true); const XLSX = await loadXLSX(); const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = new Uint8Array(event.target.result); const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0]; const worksheet = workbook.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
            if (rows.length < 2) throw new Error("File trống hoặc sai định dạng");
            
            const newMachinesList = [];
            for (let i = 1; i < rows.length; i++) {
              const cols = rows[i]; if (!cols || cols.length === 0) continue;
              const id = cols[0] ? String(cols[0]).trim() : '';
              if (id) newMachinesList.push({ id: id, name: cols[1] ? String(cols[1]).trim() : '', model: cols[2] ? String(cols[2]).trim() : '', location: cols[3] ? String(cols[3]).trim() : '', department: cols[4] ? String(cols[4]).trim() : '', category: cols[5] ? String(cols[5]).trim() : '', status: cols[6] ? String(cols[6]).trim() : 'operational' });
            }
            let addedCount = 0; let updatedCount = 0;
            const promises = newMachinesList.map(newM => {
                const existingIndex = machines.findIndex(item => item.id === newM.id);
                if (existingIndex > -1) updatedCount++; else addedCount++;
                return saveMachineData({ ...(machines[existingIndex] || {}), ...newM });
            });
            await Promise.all(promises); showNotification(`Đã đồng bộ: Cập nhật ${updatedCount}, Thêm mới ${addedCount}`, 'success');
          } catch (err) { showNotification('Lỗi đọc dữ liệu file Excel.', 'error'); } finally { setIsLoading(false); }
        };
        reader.readAsArrayBuffer(file);
      } catch (err) { showNotification('Lỗi tải bộ giải mã Excel', 'error'); setIsLoading(false); }
      e.target.value = null; 
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in">
      <CustomConfirmModal isOpen={deleteModal.isOpen} title="Xóa thiết bị" message="Bạn có chắc chắn muốn xóa thiết bị này khỏi danh sách? Hành động này sẽ không thể hoàn tác." onConfirm={handleConfirmDelete} onCancel={() => setDeleteModal({ isOpen: false, id: null })} />

      {isCatModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[150] p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-xl text-slate-800">Quản lý Chủng loại</h3>
                      <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-6 h-6"/></button>
                  </div>
                  
                  <div className="flex gap-2 mb-6">
                      <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="Tên chủng loại mới..." className="flex-1 p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"/>
                      <button onClick={handleAddCategory} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm">Thêm</button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                      {allCategories.map(cat => (
                          <div key={cat} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-200 transition-colors group">
                              <span className="font-bold text-slate-700">{cat}</span>
                              <button onClick={() => setDeleteCatModal({isOpen: true, cat})} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                          </div>
                      ))}
                      {allCategories.length === 0 && <div className="text-center text-slate-400 py-4 font-medium">Chưa có dữ liệu</div>}
                  </div>
              </div>
          </div>
      )}
      <CustomConfirmModal isOpen={deleteCatModal.isOpen} title="Xóa Chủng Loại" message={`Bạn có chắc chắn muốn xóa chủng loại "${deleteCatModal.cat}"? Các thiết bị đang thuộc nhóm này sẽ bị gỡ phân loại.`} onConfirm={handleConfirmDeleteCat} onCancel={() => setDeleteCatModal({ isOpen: false, cat: null })} />

      <div className="bg-white p-4 md:p-6 border-b border-slate-200 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
                <button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 md:w-7 md:h-7" /></button>
                <h2 className="font-bold text-slate-800 text-lg md:text-2xl">Quản lý Thiết Bị</h2>
                {isLoading && <span className="text-xs text-blue-500 font-medium animate-pulse ml-2">Đang xử lý...</span>}
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:w-2/3 lg:w-1/2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 md:top-3.5 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                    <input type="text" placeholder="Tìm kiếm mã hoặc tên máy..." className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-3 bg-slate-100 border-none rounded-xl text-sm md:text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <button onClick={startAdd} className="flex-1 md:flex-none bg-blue-600 text-white py-2 md:py-3 px-4 rounded-xl text-sm md:text-base font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"><Plus className="w-4 h-4 md:w-5 md:h-5" /> <span className="hidden md:inline">Tạo mới</span></button>
                    <button disabled={isLoading} onClick={handleExportExcel} className="flex-1 md:flex-none bg-white border border-slate-300 text-slate-700 py-2 md:py-3 px-4 rounded-xl text-sm md:text-base font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"><Download className="w-4 h-4 md:w-5 md:h-5 text-blue-600" /> <span className="hidden md:inline">Tải File</span></button>
                    <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImportExcel} />
                    <button disabled={isLoading} onClick={() => fileInputRef.current.click()} className="flex-1 md:flex-none bg-white border border-slate-300 text-slate-700 py-2 md:py-3 px-4 rounded-xl text-sm md:text-base font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"><Upload className="w-4 h-4 md:w-5 md:h-5 text-green-600" /> <span className="hidden md:inline">Nhập File</span></button>
                </div>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 pb-20 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-4">
            
            {isAdding && (
                <div className="bg-blue-50 p-5 md:p-8 rounded-3xl border border-blue-200 shadow-sm mb-6 animate-fade-in max-w-4xl mx-auto md:mx-0">
                    <h3 className="font-bold text-blue-800 mb-6 md:text-xl">Thêm thiết bị mới thủ công</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div><label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Mã máy (Để trống tự tạo)</label><input value={editForm.id} onChange={e => setEditForm({...editForm, id: e.target.value})} className="w-full p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="VD: M-102" /></div>
                        <div><label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Tên máy <span className="text-red-500">*</span></label><input autoFocus value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white font-bold" placeholder="Tên thiết bị..." /></div>
                        <div><label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Vị trí (Xưởng)</label><input value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} className="w-full p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="VD: Xưởng A" /></div>
                        <div><label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Phòng ban (Bộ phận)</label><input value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} className="w-full p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="VD: Cơ khí, Điện..." /></div>
                        
                        <div>
                            <label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Chủng loại thiết bị</label>
                            <div className="flex gap-2">
                                <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="flex-1 p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium">
                                    <option value="">-- Chọn chủng loại --</option>
                                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button onClick={() => setIsCatModalOpen(true)} className="p-3 md:p-4 bg-slate-50 text-slate-600 rounded-xl border border-slate-200 hover:bg-blue-100 hover:text-blue-700 transition-colors shadow-sm" title="Quản lý danh mục"><Settings className="w-5 h-5"/></button>
                            </div>
                        </div>
                        
                        <div><label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Trạng thái hiện tại</label>
                            <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium">
                                <option value="operational">Hoạt động tốt</option>
                                <option value="maintenance">Đang bảo trì</option>
                                <option value="broken">Bị hỏng</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-blue-100">
                        <button onClick={() => setIsAdding(false)} className="px-5 py-3 bg-white text-slate-600 rounded-xl text-sm md:text-base border border-slate-200 font-bold hover:bg-slate-50 transition-colors">Hủy bỏ</button>
                        <button onClick={handleSaveEdit} className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm md:text-base font-bold shadow-md flex items-center hover:bg-blue-700 transition-colors"><Save className="w-5 h-5 mr-2"/> Lưu Thiết Bị</button>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center text-xs md:text-sm text-slate-500 uppercase font-bold tracking-wider mb-4"><span>Danh sách thiết bị {filterTitle} ({filteredMachines.length})</span></div>
            
            <div className="space-y-6">
              {filteredMachines.length > 0 ? (
                sortedGroups.map((groupName) => {
                  const isExpanded = expandedGroups[groupName];
                  return (
                  <div key={groupName} className="space-y-3">
                     <div onClick={() => toggleGroup(groupName)} className="flex items-center justify-between border-b border-slate-300 pb-2 mb-3 mt-4 cursor-pointer hover:bg-slate-100 rounded-xl p-2 transition-colors">
                         <h3 className="font-black text-slate-700 text-lg uppercase tracking-wide flex items-center"><Database className="w-5 h-5 mr-2 text-slate-500" /> Nhóm: {groupName} <span className="text-sm font-bold text-slate-400 normal-case ml-2">({groupedMachines[groupName].length} máy)</span></h3>
                         <button className="text-slate-500 bg-white p-1.5 rounded-full shadow-sm border border-slate-200 hover:text-blue-600 hover:border-blue-300 transition-colors focus:outline-none">
                             {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                         </button>
                     </div>
                     {isExpanded && (
                     <div className="flex flex-col gap-3 animate-fade-in">
                        {groupedMachines[groupName].map((m) => (
                          <div key={m.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                             {editingId === m.id ? (
                                 <div className="flex flex-col gap-3 p-5 md:p-6 bg-blue-50/50 border-b border-blue-200 flex-1">
                                    <input className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800" value={editForm.id} onChange={e => setEditForm({...editForm, id: e.target.value})} placeholder="Mã thiết bị" />
                                    <input className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Tên thiết bị" />
                                    <div className="flex gap-2">
                                        <input className="w-1/2 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} placeholder="Vị trí" />
                                        <input className="w-1/2 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} placeholder="Phòng ban" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex w-1/2 gap-1">
                                            <select className="flex-1 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>
                                                <option value="">-- Chủng loại --</option>
                                                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <button onClick={() => setIsCatModalOpen(true)} className="p-3 shrink-0 bg-slate-50 text-slate-600 rounded-xl border border-slate-300 hover:bg-blue-100 hover:text-blue-700 transition-colors shadow-sm" title="Quản lý danh mục"><Settings className="w-4 h-4"/></button>
                                        </div>
                                        <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-1/2 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium">
                                            <option value="operational">Hoạt động tốt</option><option value="maintenance">Đang bảo trì</option><option value="broken">Bị hỏng</option>
                                        </select>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-blue-100">
                                        <button onClick={() => setEditingId(null)} className="px-5 py-2.5 text-sm md:text-base bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">Hủy</button>
                                        <button onClick={handleSaveEdit} className="px-5 py-2.5 text-sm md:text-base bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">Lưu</button>
                                    </div>
                                 </div>
                             ) : (
                                 <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full shrink-0 ${m.status === 'operational' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : m.status === 'maintenance' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'}`}></div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h4 className="font-bold text-slate-800 text-base md:text-lg truncate" title={m.name}>{m.name}</h4>
                                                <span className="bg-slate-100 px-2 py-0.5 rounded-md text-xs font-mono font-bold text-slate-600 shrink-0">{m.id}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs md:text-sm text-slate-500">
                                                {m.location && <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0"/> Vị trí: {m.location}</span>}
                                                {m.department && <span className="flex items-center"><User className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0"/> Phòng ban: {m.department}</span>}
                                            </div>
                                            {m.status !== 'operational' && (
                                                <div className="mt-2.5 text-xs md:text-sm text-red-700 bg-red-50 p-2 md:p-3 rounded-xl border border-red-100 flex items-start">
                                                    <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0 mt-0.5 text-red-500" />
                                                    <span className="line-clamp-2" title={logs?.find(l => l.machineId === m.id)?.note || 'Không có ghi chú'}>
                                                        <b>Nội dung lỗi: </b>{logs?.find(l => l.machineId === m.id)?.note || 'Chưa cập nhật thông tin lỗi.'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 justify-end shrink-0 border-t border-slate-100 md:border-t-0 pt-3 md:pt-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEdit(m)} className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-blue-100 text-sm font-bold flex items-center"><Edit className="w-4 h-4 mr-1.5" /> Sửa</button>
                                        <button onClick={() => setDeleteModal({ isOpen: true, id: m.id })} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-100 text-sm font-bold flex items-center"><Trash2 className="w-4 h-4 mr-1.5" /> Xóa</button>
                                    </div>
                                 </div>
                             )}
                          </div>
                        ))}
                     </div>
                     )}
                  </div>
                )})
              ) : (<div className="p-12 text-center text-slate-400 text-base md:text-lg bg-white rounded-3xl border border-dashed border-slate-300">Không tìm thấy thiết bị phù hợp.</div>)}
            </div>
        </div>
      </div>
    </div>
  );
};

const InventoryView = ({ inventory, setView, showNotification, saveInventoryData, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', unit: '', quantity: '' });
  const fileInputRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', unit: '', quantity: '' });

  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const filteredInventory = safeInventory.filter(item => item && String(item.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const handleAddOrUpdate = async () => {
    if (!newItem.name || !newItem.unit || !newItem.quantity) { showNotification('Vui lòng nhập đủ thông tin!', 'error'); return; }
    const existingItem = inventory.find(i => i.name.toLowerCase() === newItem.name.toLowerCase());
    if (existingItem) {
      const newQty = existingItem.quantity + Number(newItem.quantity);
      await saveInventoryData({ ...existingItem, quantity: newQty, unit: newItem.unit });
      showNotification(`Đã cộng thêm ${newItem.quantity} vào ${newItem.name}`);
    } else {
      const newId = 'P-' + Date.now();
      await saveInventoryData({ id: newId, name: newItem.name, unit: newItem.unit, quantity: Number(newItem.quantity) });
      showNotification('Đã lưu vật tư mới!');
    }
    setNewItem({ name: '', unit: '', quantity: '' }); 
  };

  const startEdit = (item) => { setEditingId(item.id); setEditForm({ name: item.name, unit: item.unit, quantity: item.quantity }); };

  const saveEdit = async () => {
      if (!editForm.name || !editForm.unit || editForm.quantity === '') { showNotification('Vui lòng nhập đủ thông tin!', 'error'); return; }
      const existingItem = inventory.find(i => i.id === editingId);
      if (existingItem) { await saveInventoryData({ ...existingItem, name: editForm.name, unit: editForm.unit, quantity: Number(editForm.quantity) }); showNotification('Đã cập nhật thành công!'); }
      setEditingId(null);
  };

  const handleExportExcel = async () => { /* Logic export */ };
  const handleImportExcel = async (e) => { /* Logic import */ };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in">
      <div className="bg-white p-4 md:p-6 border-b border-slate-200 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
                <button onClick={() => setView(user.role === 'admin' ? 'dashboard' : 'home')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 md:w-7 md:h-7" /></button>
                <h2 className="font-bold text-slate-800 text-lg md:text-2xl">Kho Vật Tư</h2>
                {isLoading && <span className="text-xs text-blue-500 font-medium animate-pulse ml-2">Đang xử lý...</span>}
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:w-2/3 lg:w-1/2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 md:top-3.5 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                    <input type="text" placeholder="Tìm kiếm trong kho..." className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-3 bg-slate-100 border-none rounded-xl text-sm md:text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                {user.role === 'admin' && (
                    <div className="flex gap-2">
                        <button disabled={isLoading} onClick={handleExportExcel} className="flex-1 md:flex-none bg-white border border-slate-300 text-slate-700 py-2 md:py-3 px-4 rounded-xl text-sm md:text-base font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"><Download className="w-4 h-4 md:w-5 md:h-5 text-blue-600" /> <span className="hidden md:inline">Tải File</span></button>
                        <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImportExcel} />
                        <button disabled={isLoading} onClick={() => fileInputRef.current.click()} className="flex-1 md:flex-none bg-white border border-slate-300 text-slate-700 py-2 md:py-3 px-4 rounded-xl text-sm md:text-base font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"><Upload className="w-4 h-4 md:w-5 md:h-5 text-green-600" /> <span className="hidden md:inline">Nhập Kho</span></button>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 pb-20 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            {user.role === 'admin' && (
              <div className="bg-slate-100 p-4 md:p-6 rounded-3xl border border-dashed border-slate-300 mb-6 max-w-4xl mx-auto md:mx-0">
                <h3 className="text-xs md:text-sm uppercase font-bold text-slate-500 mb-4"><Plus className="w-4 h-4 inline mr-1 -mt-0.5"/> Thêm nhanh thủ công</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
                  <input placeholder="Tên vật tư (VD: Dầu nhớt)" className="md:col-span-2 p-3 md:p-4 border border-slate-300 rounded-xl text-sm md:text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                  <div className="flex gap-2 md:gap-4 md:col-span-2">
                      <input placeholder="Đơn vị" className="w-1/2 p-3 md:p-4 border border-slate-300 rounded-xl text-sm md:text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
                      <input placeholder="SL" type="number" className="w-1/4 p-3 md:p-4 border border-slate-300 rounded-xl text-sm md:text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} />
                      <button onClick={handleAddOrUpdate} className="w-1/4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 flex justify-center items-center shadow-md transition-transform active:scale-95"><Plus className="w-5 h-5 md:w-6 md:h-6" /></button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center text-xs md:text-sm text-slate-500 uppercase font-bold tracking-wider mb-2"><span>Danh sách vật tư ({filteredInventory.length})</span></div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredInventory.length > 0 ? (
                filteredInventory.map((item) => (
                  <div key={item.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                    {editingId === item.id ? (
                      <div className="flex flex-col gap-3 bg-blue-50/50 p-5 md:p-6 border-b border-blue-200 flex-1">
                        <input className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Tên vật tư" />
                        <div className="flex gap-2">
                            <input className="w-1/2 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.unit} onChange={e => setEditForm({...editForm, unit: e.target.value})} placeholder="Đơn vị" />
                            <input className="w-1/2 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center" type="number" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: e.target.value})} placeholder="Số lượng" />
                        </div>
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-blue-100">
                            <button onClick={() => setEditingId(null)} className="px-5 py-2.5 text-sm md:text-base bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">Hủy</button>
                            <button onClick={saveEdit} className="px-5 py-2.5 text-sm md:text-base bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">Lưu</button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 md:p-6 flex justify-between items-center flex-1 group">
                        <div className="overflow-hidden pr-4">
                            <h4 className="font-bold text-slate-800 text-base md:text-lg mb-2 truncate" title={item.name}>{item.name}</h4>
                            <p className="text-xs md:text-sm text-slate-500 font-mono mt-1 bg-slate-50 inline-block px-2 py-1 rounded-lg border border-slate-100">{item.id}</p>
                            {user.role === 'admin' && (
                                <div className="mt-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEdit(item)} className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-blue-100 text-xs md:text-sm font-bold flex items-center"><Edit className="w-3 h-3 md:w-4 md:h-4 mr-1.5" /> Chỉnh sửa</button>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                           <div className={`flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl border-2 ${item.quantity < 10 ? 'bg-red-50 border-red-200 text-red-600 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                              <span className="font-black text-2xl md:text-3xl leading-none">{item.quantity}</span>
                              <span className="text-[10px] md:text-xs font-bold mt-1.5 text-slate-500 uppercase tracking-wide">{item.unit}</span>
                           </div>
                           {item.quantity < 10 && <p className="text-[10px] md:text-xs text-red-500 font-bold mt-3 bg-red-100 px-3 py-1 rounded-full animate-pulse">Sắp hết!</p>}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (<div className="col-span-full p-12 text-center text-slate-400 text-base md:text-lg bg-white rounded-3xl border border-dashed border-slate-300">Kho đang trống.</div>)}
            </div>
        </div>
      </div>
    </div>
  );
};

const SettingsView = ({ setView, showNotification, googleSheetUrl, sysSettings, saveSettings }) => {
    const [url, setUrl] = useState(googleSheetUrl);
    const [errTimes, setErrTimes] = useState(sysSettings?.error_times || { level1: 1.5, level2: 4, level3: 24 });
    const [appIcon, setAppIcon] = useState(sysSettings?.app_icon || '');
    const [monthConfig, setMonthConfig] = useState(() => ({
        startDay: sysSettings?.month_config?.startDay ?? 16,
        autoDetectMonth: sysSettings?.month_config?.autoDetectMonth !== false,
        defaultMonth: sysSettings?.month_config?.defaultMonth || getActiveReportMonth(sysSettings)
    }));

    const previewMonth = monthConfig.autoDetectMonth
        ? getActiveReportMonth({ ...sysSettings, month_config: monthConfig })
        : (monthConfig.defaultMonth || getActiveReportMonth(sysSettings));
    const previewCycle = getMonthCycleRange(previewMonth, monthConfig.startDay);

    const handleAppIconUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 256;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, 256, 256);
                const scale = Math.min(256 / img.width, 256 / img.height);
                const w = img.width * scale;
                const h = img.height * scale;
                ctx.drawImage(img, (256 - w) / 2, (256 - h) / 2, w, h);
                const dataUrl = canvas.toDataURL('image/png');
                setAppIcon(dataUrl);
                applyAppBrandingIcons(dataUrl);
                showNotification('Đã tải ảnh logo ứng dụng! Nhấn "Lưu Cấu Hình" để áp dụng.');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = null;
    };

    const handleSave = () => {
        const cleanMonthConfig = {
            startDay: Math.min(28, Math.max(1, Number(monthConfig.startDay) || 16)),
            autoDetectMonth: Boolean(monthConfig.autoDetectMonth),
            defaultMonth: monthConfig.defaultMonth || previewMonth
        };
        saveSettings(url, { ...sysSettings, error_times: errTimes, month_config: cleanMonthConfig, app_icon: appIcon });
        applyAppBrandingIcons(appIcon);
        showNotification('Đã lưu cấu hình!');
        setView('dashboard');
    };

    return (
      <div className="flex flex-col h-full bg-slate-50 animate-fade-in">
        <div className="p-4 md:p-6 border-b border-slate-200 bg-white flex items-center space-x-3 shrink-0"><button onClick={() => setView('dashboard')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 md:w-7 md:h-7 text-slate-600" /></button><h2 className="font-bold text-slate-800 text-lg md:text-2xl">Cài đặt Hệ thống</h2></div>
        <div className="p-4 md:p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 border-b pb-4 flex items-center"><CalendarClock className="w-6 h-6 mr-2 text-purple-600"/> Cài đặt Kỳ Tổng Hợp Tháng</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Ngày bắt đầu chu kỳ tháng</label>
                      <input
                          type="number"
                          min="1"
                          max="28"
                          value={monthConfig.startDay}
                          onChange={(e) => setMonthConfig({ ...monthConfig, startDay: parseInt(e.target.value, 10) || 1 })}
                          className="w-full p-4 border border-slate-300 rounded-xl text-base font-bold focus:ring-2 focus:ring-purple-500 outline-none bg-slate-50"
                      />
                      <p className="text-xs text-slate-500 mt-1.5">
                          {Number(monthConfig.startDay) === 1
                              ? 'Tính từ ngày 01 đến ngày cuối cùng của tháng.'
                              : `Tính từ ngày ${monthConfig.startDay} tháng trước đến ngày ${Number(monthConfig.startDay) - 1} tháng này.`}
                      </p>
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Xác định tháng báo cáo mặc định</label>
                      <select
                          value={monthConfig.autoDetectMonth ? 'auto' : 'fixed'}
                          onChange={(e) => setMonthConfig({ ...monthConfig, autoDetectMonth: e.target.value === 'auto' })}
                          className="w-full p-4 border border-slate-300 rounded-xl text-base font-bold focus:ring-2 focus:ring-purple-500 outline-none bg-slate-50"
                      >
                          <option value="auto">Tự động theo ngày hiện tại</option>
                          <option value="fixed">Cố định tháng báo cáo</option>
                      </select>
                      {!monthConfig.autoDetectMonth && (
                          <div className="mt-2.5">
                              <VietnameseMonthPicker
                                  value={monthConfig.defaultMonth}
                                  onChange={(val) => setMonthConfig({ ...monthConfig, defaultMonth: val })}
                                  className="w-full p-3 border border-purple-300 rounded-xl text-sm font-bold bg-purple-50 text-purple-900 outline-none focus:ring-2 focus:ring-purple-500"
                              />
                          </div>
                      )}
                  </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Xem trước kỳ tổng hợp hiện hành:</span>
                      <span className="text-xs font-black bg-purple-600 text-white px-3 py-1 rounded-lg">
                          {previewCycle.monthLabel} ({previewCycle.rangeText})
                      </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {previewCycle.weeks.map((w) => (
                          <div key={w.index} className="bg-white border border-purple-100 rounded-xl p-2 text-center">
                              <p className="text-[11px] font-black text-purple-900">{w.label}</p>
                              <p className="text-[11px] font-mono text-slate-600 mt-0.5">{w.shortRange}</p>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 border-b pb-4 flex items-center"><FileSpreadsheet className="w-6 h-6 mr-2 text-green-600"/> Xuất Báo Cáo Google Sheet</h3>
              <div className="mb-6"><label className="block text-sm font-bold text-slate-700 mb-2">Google Apps Script URL (Web App URL)</label><input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full p-4 border border-slate-300 rounded-xl text-base focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" placeholder="https://script.google.com/macros/s/..." /></div>
          </div>
          
          <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 border-b pb-4 flex items-center"><AlertTriangle className="w-6 h-6 mr-2 text-red-600"/> Cài đặt thời gian xử lý (Sửa chữa đột xuất)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Lỗi Mức 1 (Giờ)</label>
                      <input type="number" step="0.5" value={errTimes.level1} onChange={(e) => setErrTimes({...errTimes, level1: parseFloat(e.target.value) || 0})} className="w-full p-4 border border-slate-300 rounded-xl text-base focus:ring-2 focus:ring-red-500 outline-none bg-slate-50" />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Lỗi Mức 2 (Giờ)</label>
                      <input type="number" step="0.5" value={errTimes.level2} onChange={(e) => setErrTimes({...errTimes, level2: parseFloat(e.target.value) || 0})} className="w-full p-4 border border-slate-300 rounded-xl text-base focus:ring-2 focus:ring-red-500 outline-none bg-slate-50" />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Lỗi Mức 3 mặc định (Giờ)</label>
                      <input type="number" step="1" value={errTimes.level3} onChange={(e) => setErrTimes({...errTimes, level3: parseFloat(e.target.value) || 0})} className="w-full p-4 border border-slate-300 rounded-xl text-base focus:ring-2 focus:ring-red-500 outline-none bg-slate-50" />
                  </div>
              </div>
          </div>

          <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 border-b pb-4 flex items-center"><ImageIcon className="w-6 h-6 mr-2 text-blue-600"/> Biểu tượng &amp; Logo Ứng Dụng (App Icon)</h3>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                  <img
                      src={appIcon || getMartechSquareIconBase64(192)}
                      alt="App Icon Preview"
                      className="w-20 h-20 rounded-2xl border-2 border-slate-200 shadow-md object-contain bg-white shrink-0"
                  />
                  <div className="flex-1 space-y-3 text-center sm:text-left">
                      <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                          Biểu tượng này hiển thị trên tab trình duyệt và khi cài đặt ứng dụng ra màn hình chính (Windows Desktop / Điện thoại).
                      </p>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2.5">
                          <label className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-bold cursor-pointer transition-colors shadow-sm inline-flex items-center gap-2">
                              <Upload className="w-4 h-4" /> Tải ảnh logo mới (.png / .jpg)
                              <input type="file" accept="image/*" onChange={handleAppIconUpload} className="hidden" />
                          </label>
                          {appIcon && (
                              <button
                                  type="button"
                                  onClick={() => {
                                      setAppIcon('');
                                      applyAppBrandingIcons('');
                                      showNotification('Đã khôi phục logo mặc định Martech Boiler');
                                  }}
                                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs md:text-sm font-bold transition-colors"
                              >
                                  Dùng logo mặc định
                              </button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
          
          <div className="max-w-3xl mx-auto pb-8">
              <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl text-lg font-bold shadow-md transition-colors flex justify-center items-center gap-2"><Save className="w-5 h-5"/> Lưu Cấu Hình</button>
          </div>
        </div>
      </div>
    );
};

const DailyTaskHistoryView = ({ dailyTasks, usersList, setView, user, taskFilter, setInitialTaskData, setEditTaskData, handleDeleteDailyTaskApp, showNotification, setZoomedImage, sysSettings, handleSyncAllDailyTasksToSheet }) => {
  const monthStartDay = sysSettings?.month_config?.startDay ?? 16;
  const initialActiveMonth = getActiveReportMonth(sysSettings);
  const initialCycle = getMonthCycleRange(initialActiveMonth, monthStartDay);

  const [filterTech, setFilterTech] = useState(user.role === 'admin' ? 'all' : user.username);
  const [filterType, setFilterType] = useState('all');
  const [selectedReportMonth, setSelectedReportMonth] = useState(initialActiveMonth);
  const [startDate, setStartDate] = useState(initialCycle.startDate);
  const [endDate, setEndDate] = useState(initialCycle.endDate);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [isExporting, setIsExporting] = useState(false);
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [selectedKpiUsers, setSelectedKpiUsers] = useState([]);
  const [attendanceModalInfo, setAttendanceModalInfo] = useState(null);
  const [isMobileActionMenuOpen, setIsMobileActionMenuOpen] = useState(false);
  const [showMobileExtraFilters, setShowMobileExtraFilters] = useState(false);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
      const handleClickOutsideMenu = (event) => {
          if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
              setIsMobileActionMenuOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutsideMenu);
      return () => document.removeEventListener('mousedown', handleClickOutsideMenu);
  }, []);

  const techUsers = usersList.filter(u => u.role !== 'admin');

  const handleSelectMonthPeriod = (monthVal) => {
      if (!monthVal) return;
      setSelectedReportMonth(monthVal);
      const cycle = getMonthCycleRange(monthVal, monthStartDay);
      setStartDate(cycle.startDate);
      setEndDate(cycle.endDate);
  };

  useEffect(() => { 
      if(taskFilter === 'pending') {
          setFilterTech('all'); 
      } else {
          setFilterTech(user.role === 'admin' ? 'all' : user.username);
      }
      setFilterType('all');
  }, [taskFilter, user]);

  // Tự động tách các phiếu có ghi chú gộp "--- [Ngày] ... tiếp tục ---" thành từng dòng phiếu riêng biệt
  const unmergedDailyTasks = expandMergedTaskEntries(dailyTasks);

  // Kiểm tra ngày nhập thiếu của nhân sự đang chọn (hoặc của chính KTV đang đăng nhập)
  const targetUserForMissing = user.role !== 'admin'
    ? user
    : (filterTech !== 'all' ? techUsers.find(u => u.username === filterTech || u.name === filterTech) : null);

  const historyMissingDates = (taskFilter !== 'pending' && targetUserForMissing && startDate && endDate)
    ? analyzeEmployeeAttendanceInRange(targetUserForMissing, unmergedDailyTasks, startDate, endDate, sysSettings).missingDates
    : [];

  const filteredTasks = unmergedDailyTasks.filter(t => {
      if (!t) return false;
      if (taskFilter === 'pending' && t.status === 'Hoàn thành') return false;
      let matchTech = filterTech === 'all' ? true : (t.username === filterTech || t.technicianName === filterTech);
      if (taskFilter === 'pending') matchTech = true; 
      
      let matchType = filterType === 'all' ? true : (t.type && String(t.type).trim().toLowerCase() === filterType.toLowerCase());
      
      let matchDate = true;
      const taskDate = String(t.date || '');
      if (taskFilter !== 'pending') {
          if (startDate && taskDate < startDate) matchDate = false;
          if (endDate && taskDate > endDate) matchDate = false;
      }
      return matchTech && matchType && matchDate;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
      const dateA = String(a?.date || '');
      const dateB = String(b?.date || '');
      if (dateA !== dateB) {
          return new Date(dateB || 0) - new Date(dateA || 0);
      }
      return String(b?.startTime || '').localeCompare(String(a?.startTime || ''));
  });

  const viewTitle = taskFilter === 'pending' ? 'Công Việc Đang Dở' : 'Sổ Ghi Công Việc';

  const startEdit = (task) => { setEditTaskData(task); setInitialTaskData(null); setView('daily_task_form'); };
  const handleConfirmDelete = async () => { if(deleteModal.id) { await handleDeleteDailyTaskApp(deleteModal.id); showNotification('Đã xóa công việc!'); } setDeleteModal({ isOpen: false, id: null }); };

  const openKpiExportModal = () => {
      if (user.role !== 'admin') {
          handleExportKPI([user]);
          return;
      }
      if (filterTech !== 'all') {
          const found = techUsers.find(u => u.username === filterTech || u.name === filterTech);
          setSelectedKpiUsers(found ? [found.username] : techUsers.map(u => u.username));
      } else {
          setSelectedKpiUsers(techUsers.map(u => u.username));
      }
      setIsKpiModalOpen(true);
  };

  const toggleSelectKpiUser = (username) => {
      setSelectedKpiUsers(prev =>
          prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
      );
  };

  const toggleSelectAllKpiUsers = () => {
      if (selectedKpiUsers.length === techUsers.length) {
          setSelectedKpiUsers([]);
      } else {
          setSelectedKpiUsers(techUsers.map(u => u.username));
      }
  };

  const populateKpiWorksheet = (workbook, sheet, selectedUser, userTasks, logoId, currentMonthStr) => {
      // Thiết lập trang in A4 Nằm ngang (Landscape)
      sheet.pageSetup = {
          paperSize: 9, // A4
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }
      };

      // Độ rộng 10 cột chuẩn theo mẫu A -> J
      sheet.columns = [
          { width: 14 }, // A: Ngày / Kế hoạch PM (B)
          { width: 12 }, // B: Bắt đầu / Hoãn hợp lệ (C)
          { width: 12 }, // C: Kết thúc / Đạt PM (A)
          { width: 16 }, // D: Thời gian thực làm / % PM Thực tế
          { width: 22 }, // E: Công việc được giao / Điểm KPI PM
          { width: 15 }, // F: Mức độ lỗi / Sự cố CM (Tổng)
          { width: 32 }, // G: Nội dung công việc / Ca CM Đạt SLA (K)
          { width: 32 }, // H: Ghi chú công việc / % CM Thực tế
          { width: 15 }, // I: Hoàn thành / Điểm KPI CM
          { width: 16 }  // J: Thời gian trễ/sớm / Tổng Điểm KPI
      ];

      const thinBorder = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      const doubleBottomBorder = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'double'}, right: {style:'thin'} };
      const fontName = 'Arial';

      // --- 1. TIÊU ĐỀ & LOGO ---
      sheet.mergeCells('A1:B2');
      sheet.addImage(logoId, {
          tl: { col: 0.1, row: 0.1 },
          ext: { width: 175, height: 53 }
      });

      sheet.mergeCells('C1:J2');
      const titleCell = sheet.getCell('C1');
      titleCell.value = `PHIẾU GIAO VIỆC THÁNG ${currentMonthStr}\n(Kỳ tính: ${formatDateVi(startDate)} - ${formatDateVi(endDate)})`;
      titleCell.font = { name: fontName, size: 14, bold: true };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      sheet.getRow(1).height = 24;
      sheet.getRow(2).height = 24;

      // --- 2. MỤC A: THÔNG TIN NHÂN SỰ ---
      sheet.mergeCells('A3:J3');
      sheet.getCell('A3').value = 'A. THÔNG TIN NHÂN SỰ:';
      sheet.getCell('A3').font = { name: fontName, size: 11, bold: true };
      sheet.getRow(3).height = 22;

      sheet.getCell('A4').value = 'Mã NV:';
      sheet.getCell('A4').font = { name: fontName, size: 11, bold: true };
      sheet.mergeCells('B4:D4');
      sheet.getCell('B4').value = selectedUser.employeeId || '';
      sheet.getCell('B4').font = { name: fontName, size: 11 };

      sheet.getCell('E4').value = 'Chức vụ:';
      sheet.getCell('E4').font = { name: fontName, size: 11, bold: true };
      sheet.mergeCells('F4:J4');
      sheet.getCell('F4').value = selectedUser.position || 'Nhân viên';
      sheet.getCell('F4').font = { name: fontName, size: 11 };
      sheet.getRow(4).height = 20;

      sheet.getCell('A5').value = 'Họ và tên:';
      sheet.getCell('A5').font = { name: fontName, size: 11, bold: true };
      sheet.mergeCells('B5:D5');
      sheet.getCell('B5').value = selectedUser.name || '';
      sheet.getCell('B5').font = { name: fontName, size: 11 };

      sheet.getCell('E5').value = 'Đơn vị:';
      sheet.getCell('E5').font = { name: fontName, size: 11, bold: true };
      sheet.mergeCells('F5:J5');
      sheet.getCell('F5').value = selectedUser.department || 'Bảo trì xưởng';
      sheet.getCell('F5').font = { name: fontName, size: 11 };
      sheet.getRow(5).height = 20;

      // --- 3. MỤC B: BÁO CÁO KPI ---
      sheet.mergeCells('A6:J6');
      sheet.getCell('A6').value = 'B. BÁO CÁO KPI:';
      sheet.getCell('A6').font = { name: fontName, size: 11, bold: true };
      sheet.getRow(6).height = 24;

      // Dòng 7 & 8: Tiêu đề bảng KPI
      sheet.mergeCells('A7:E7');
      const pmHeader = sheet.getCell('A7');
      pmHeader.value = 'Tỷ lệ thực hiện và hoàn thành đúng hạn công tác bảo trì, bảo dưỡng theo kế hoạch';
      pmHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } };
      pmHeader.font = { name: fontName, size: 10, bold: true };
      pmHeader.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

      sheet.mergeCells('F7:I7');
      const cmHeader = sheet.getCell('F7');
      cmHeader.value = 'Phản hồi và khắc phục sự cố kỹ thuật đột xuất kịp thời';
      cmHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
      cmHeader.font = { name: fontName, size: 10, bold: true };
      cmHeader.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

      sheet.mergeCells('J7:J8');
      const totalHeader = sheet.getCell('J7');
      totalHeader.value = 'Tổng Điểm KPI';
      totalHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
      totalHeader.font = { name: fontName, size: 10, bold: true };
      totalHeader.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

      const subHeaders = [
          'Kế hoạch PM (B)', 'Hoãn hợp lệ (C)', 'Đạt PM (A)', '% PM Thực tế', 'Điểm KPI PM (50%)',
          'Sự cố CM (Tổng)', 'Ca CM Đạt SLA (K)', '% CM Thực tế', 'Điểm KPI CM (30%)'
      ];
      subHeaders.forEach((text, idx) => {
          const cell = sheet.getCell(8, idx + 1);
          cell.value = text;
          cell.font = { name: fontName, size: 10, bold: true };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });

      sheet.getRow(7).height = 28;
      sheet.getRow(8).height = 30;

      // Kiểm tra ngày nhập thiếu (trừ Chủ nhật) & ngày nghỉ phép trong kỳ xuất KPI
      const attendanceInfo = analyzeEmployeeAttendanceInRange(
          selectedUser,
          unmergedDailyTasks,
          startDate,
          endDate,
          sysSettings
      );
      const missingDates = attendanceInfo.missingDates || [];
      const leaveDates = attendanceInfo.leaveDates || [];

      // Tính toán số liệu thực tế từ Sổ công việc của nhân viên này
      let B = 0, C = 0, A = 0;
      let cmTotal = 0, K = 0;

      userTasks.forEach(t => {
          const isLeave = String(t.type || '').trim().toLowerCase() === 'nghỉ phép';
          if (isLeave) return; // Ngày nghỉ phép không trừ và không tính vào mẫu số PM

          const isCM = !!getNormalizedErrorLevel(t);
          if (isCM) {
              cmTotal++;
              if (evaluateTaskKpiStatus(t, sysSettings) === 'Đạt') {
                  K++;
              }
          } else {
              B++;
              if (t.status === 'Hoàn thành') {
                  A++;
              }
          }
      });

      // Mỗi ngày nhập thiếu (trừ Chủ nhật & Nghỉ phép) bị đánh giá Không hoàn thành (+1 vào Kế hoạch B, +0 vào Đạt A)
      B += missingDates.length;

      const pmValidPlan = B - C;
      const pmRate = pmValidPlan > 0 ? (A / pmValidPlan) : (B === 0 ? 1 : 0);
      const pmScore = Math.min(0.5, pmRate * 0.5); // Tối đa 50%

      const cmRate = cmTotal > 0 ? (K / cmTotal) : 1;
      const cmScore = Math.min(0.3, cmRate * 0.3); // Tối đa 30%

      const totalKpiScore = pmScore + cmScore;

      const kpiValues = [
          B,
          C,
          A,
          `${(pmRate * 100).toFixed(1)}%`,
          `${(pmScore * 100).toFixed(1)}%`,
          cmTotal,
          K,
          `${(cmRate * 100).toFixed(1)}%`,
          `${(cmScore * 100).toFixed(1)}%`,
          `${(totalKpiScore * 100).toFixed(1)}%`
      ];

      const row9 = sheet.getRow(9);
      row9.height = 32;
      kpiValues.forEach((val, idx) => {
          const cell = sheet.getCell(9, idx + 1);
          cell.value = val;
          cell.font = { name: fontName, size: 11, bold: idx === 4 || idx === 8 || idx === 9 };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Kẻ khung cho bảng KPI (Dòng 7 -> 9)
      for (let r = 7; r <= 9; r++) {
          for (let c = 1; c <= 10; c++) {
              sheet.getCell(r, c).border = r === 9 ? doubleBottomBorder : thinBorder;
          }
      }

      // --- 4. MỤC C: NỘI DUNG CÔNG VIỆC ---
      sheet.getRow(10).height = 14;
      sheet.mergeCells('A11:J11');
      sheet.getCell('A11').value = 'C. NỘI DUNG CÔNG VIỆC:';
      sheet.getCell('A11').font = { name: fontName, size: 11, bold: true };
      sheet.getRow(11).height = 24;

      const cHeaders = ['Ngày', 'Bắt đầu', 'Kết thúc', 'Thời gian thực làm', 'Công việc được giao', 'Mức độ lỗi', 'Nội dung công việc', 'Ghi chú công việc', 'Hoàn thành', 'Thời gian trễ/sớm'];
      const row12 = sheet.getRow(12);
      row12.height = 28;
      cHeaders.forEach((text, idx) => {
          const cell = sheet.getCell(12, idx + 1);
          cell.value = text;
          cell.font = { name: fontName, size: 10, bold: true };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = thinBorder;
      });

      // Gộp các dòng công việc thực tế với các dòng ngày nhập thiếu (đánh giá Không hoàn thành)
      const missingTaskRows = missingDates.map(mDate => ({
          id: `MISSING-${mDate}`,
          date: mDate,
          startTime: '--',
          endTime: '--',
          type: 'Báo cáo ngày',
          taskName: `Nhập thiếu báo cáo công việc ngày (${getVietnameseDayName(mDate)})`,
          note: 'Không có dữ liệu công việc trong ngày - Đánh giá không hoàn thành (Trừ % KPI)',
          status: 'Không hoàn thành',
          isMissingDayRow: true
      }));

      const combinedRowsForSheet = [...userTasks, ...missingTaskRows].sort((a, b) => {
          if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
          return String(b.startTime || '').localeCompare(String(a.startTime || ''));
      });

      combinedRowsForSheet.forEach(t => {
          const isLeave = String(t.type || '').trim().toLowerCase() === 'nghỉ phép';
          const isMissing = Boolean(t.isMissingDayRow);
          const realTime = isMissing || isLeave ? '0h' : calculateWorkTime(t.startTime, t.endTime);
          const errLvlStr = isMissing || isLeave ? '' : getErrorLevelDisplay(t);
          const statusStr = isMissing
              ? 'Không đạt'
              : isLeave
              ? 'Nghỉ phép'
              : evaluateTaskKpiStatus(t, sysSettings);

          const partsStr = t.parts && t.parts.length > 0 ? '\nVT: ' + t.parts.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(', ') : '';
          const earlyLateStr = isMissing || isLeave ? '' : calculateEarlyLateStr(t, sysSettings);

          const row = sheet.addRow([
              String(t.date || '').split('-').reverse().join('/'),
              t.startTime || '',
              t.endTime || '',
              realTime,
              t.type || '',
              errLvlStr,
              t.taskName || '',
              (t.note || '') + partsStr,
              statusStr,
              earlyLateStr
          ]);

          row.eachCell({ includeEmpty: true }, (c, colNumber) => {
              c.font = {
                  name: fontName,
                  size: 10,
                  color: isMissing ? { argb: 'FFDC2626' } : (isLeave ? { argb: 'FF0D9488' } : undefined),
                  bold: isMissing && colNumber === 9
              };
              if (isMissing) {
                  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
              }
              c.border = thinBorder;
              if (colNumber === 7 || colNumber === 8) {
                  c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
              } else {
                  c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
              }
          });
      });
  };

  const handleExportKPI = async (usersToExport) => {
      if (!usersToExport || usersToExport.length === 0) {
          showNotification('Vui lòng chọn ít nhất 1 nhân sự để xuất KPI!', 'error');
          return;
      }

      try {
          setIsExporting(true);
          setIsKpiModalOpen(false);
          const ExcelJS = await loadExcelJS();
          const workbook = new ExcelJS.Workbook();

          const logoBase64 = getMartechLogoBase64();
          const logoId = workbook.addImage({
              base64: logoBase64,
              extension: 'png',
          });

          const cycleInfo = getMonthCycleRange(selectedReportMonth, monthStartDay);
          const currentMonthStr = cycleInfo.shortMonthYear;

          const usedSheetNames = new Set();

          usersToExport.forEach((u, index) => {
              // Tạo tên Sheet hợp lệ trong Excel (không chứa ký tự đặc biệt và tối đa 31 ký tự)
              let baseName = (u.name || u.username || `NV_${index + 1}`).replace(/[*?:\\/[\]]/g, '').trim();
              if (u.employeeId) {
                  baseName = `${u.employeeId}_${baseName}`.replace(/[*?:\\/[\]]/g, '').trim();
              }
              let sheetName = baseName.slice(0, 28);
              let counter = 1;
              while (usedSheetNames.has(sheetName.toLowerCase())) {
                  sheetName = `${baseName.slice(0, 25)}_${counter}`;
                  counter++;
              }
              usedSheetNames.add(sheetName.toLowerCase());

              const sheet = workbook.addWorksheet(sheetName);

              // Lọc danh sách công việc đã tách riêng từng phiếu của nhân viên này theo bộ lọc ngày & loại công việc hiện tại
              const userFilteredTasks = unmergedDailyTasks.filter(t => {
                  if (taskFilter === 'pending' && t.status === 'Hoàn thành') return false;
                  const matchTech = (t.username === u.username || t.technicianName === u.name || t.technicianName === u.username);
                  const matchType = filterType === 'all' ? true : (t.type && t.type.trim().toLowerCase() === filterType.toLowerCase());
                  let matchDate = true;
                  if (taskFilter !== 'pending') {
                      if (startDate && t.date < startDate) matchDate = false;
                      if (endDate && t.date > endDate) matchDate = false;
                  }
                  return matchTech && matchType && matchDate;
              }).sort((a, b) => {
                  if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
                  return (b.startTime || '').localeCompare(a.startTime || '');
              });

              populateKpiWorksheet(workbook, sheet, u, userFilteredTasks, logoId, currentMonthStr);
          });

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          const fileNameSuffix = usersToExport.length === 1
              ? usersToExport[0].name.replace(/\s+/g, '_')
              : `${usersToExport.length}_Nhan_Su`;
          link.download = `KPI_${fileNameSuffix}_${currentMonthStr.replace('/', '-')}.xlsx`;
          link.click();
          showNotification(`Đã xuất báo cáo KPI (${usersToExport.length} sheet) thành công!`);
      } catch (err) {
          console.error(err);
          showNotification('Lỗi xuất file KPI. Vui lòng thử lại!', 'error');
      } finally {
          setIsExporting(false);
      }
  };

  const handleExportExcel = async () => {
      try {
          setIsExporting(true);
          const ExcelJS = await loadExcelJS();
          const workbook = new ExcelJS.Workbook();
          const sheet = workbook.addWorksheet('So_Cong_Viec');
          
          // Căn chỉnh kích thước các cột cho giống Form mẫu
          sheet.columns = [
              { width: 15 }, // Ngày
              { width: 12 }, // Bắt đầu
              { width: 12 }, // Kết thúc
              { width: 18 }, // Tgian thực làm
              { width: 22 }, // Công việc
              { width: 15 }, // Mức độ lỗi
              { width: 35 }, // Nội dung
              { width: 35 }, // Ghi chú
              { width: 15 }, // Hoàn thành
              { width: 18 }  // Thời gian trễ/sớm
          ];

          const thinBorder = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

          // Xây dựng Header
          const headers = ['Ngày', 'Bắt đầu', 'Kết thúc', 'Thời gian thực làm', 'Công việc được giao', 'Mức độ lỗi', 'Nội dung công việc', 'Ghi chú công việc', 'Hoàn thành', 'Thời gian trễ/sớm'];
          const headRow = sheet.addRow(headers);
          headRow.eachCell(c => {
              c.font = { bold: true };
              c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
              c.border = thinBorder;
          });

          // Điền dữ liệu
          sortedTasks.forEach(t => {
              const realTime = calculateWorkTime(t.startTime, t.endTime);
              const errLvlStr = getErrorLevelDisplay(t);
              const statusStr = getNormalizedErrorLevel(t) ? evaluateTaskKpiStatus(t, sysSettings) : t.status;
              
              const partsStr = t.parts && t.parts.length > 0 ? '\nVT: ' + t.parts.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(', ') : '';
              const earlyLateStr = calculateEarlyLateStr(t, sysSettings);
              
              const row = sheet.addRow([
                  String(t.date || '').split('-').reverse().join('/'), 
                  t.startTime || '', 
                  t.endTime || '', 
                  realTime, 
                  t.type || '', 
                  errLvlStr, 
                  t.taskName || '', 
                  (t.note || '') + partsStr, 
                  statusStr, 
                  earlyLateStr
              ]);

              // Apply style viền, căn lề và wrap text
              row.eachCell({ includeEmpty: true }, (c, colNumber) => {
                  c.border = thinBorder;
                  if (colNumber === 7 || colNumber === 8) {
                      c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                  } else {
                      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                  }
              });
          });

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `So_Ghi_Cong_Viec_${startDate || 'all'}_${endDate || 'all'}.xlsx`;
          link.click();
          showNotification('Đã xuất file Excel Sổ Ghi Công Việc thành công!');
      } catch (err) {
          console.error(err);
          showNotification('Lỗi khi xuất file Excel!', 'error');
      } finally {
          setIsExporting(false);
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-fade-in">
        <CustomConfirmModal
            isOpen={deleteModal.isOpen}
            title="Xóa công việc"
            message="Bạn có chắc chắn muốn xóa báo cáo công việc này? Hành động này không thể hoàn tác."
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteModal({ isOpen: false, id: null })}
        />

        {isKpiModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsKpiModalOpen(false)}>
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                    <div className="p-5 bg-purple-700 text-white flex items-center justify-between">
                        <div>
                            <h3 className="font-black text-base md:text-lg flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5" /> Xuất Báo Cáo KPI (Excel)
                            </h3>
                            <p className="text-xs text-purple-100 mt-0.5">Chọn nhân sự cần xuất phiếu đánh giá KPI</p>
                        </div>
                        <button onClick={() => setIsKpiModalOpen(false)} className="p-1.5 rounded-full hover:bg-purple-600 text-purple-100 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">
                            Đã chọn: <b className="text-purple-700">{selectedKpiUsers.length}</b> / {techUsers.length} KTV
                        </span>
                        <button
                            type="button"
                            onClick={toggleSelectAllKpiUsers}
                            className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            {selectedKpiUsers.length === techUsers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {techUsers.map((u) => {
                            const isChecked = selectedKpiUsers.includes(u.username);
                            return (
                                <div
                                    key={u.id}
                                    onClick={() => toggleSelectKpiUser(u.username)}
                                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${isChecked ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${isChecked ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300 bg-white'}`}>
                                            {isChecked && <CheckCircle className="w-3.5 h-3.5" />}
                                        </div>
                                        <div>
                                            <p className="text-sm">{u.name}</p>
                                            <p className="text-[11px] font-mono text-slate-500">{u.employeeId || u.username}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                        <button onClick={() => setIsKpiModalOpen(false)} className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs md:text-sm font-bold hover:bg-slate-100">
                            Hủy
                        </button>
                        <button
                            onClick={() => handleExportKPI(techUsers.filter(u => selectedKpiUsers.includes(u.username)))}
                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-md flex items-center gap-1.5"
                        >
                            <Download className="w-4 h-4" /> Xuất File KPI
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="p-3 sm:p-4 md:p-6 border-b border-slate-100 bg-white shrink-0 shadow-sm z-20">
            <div className="max-w-7xl mx-auto space-y-2.5 md:space-y-3">
                {/* HÀNG 1: TIÊU ĐỀ & NÚT THAO TÁC (TINH GỌN TRÊN ĐIỆN THOẠI, ĐẦY ĐỦ TRÊN MÁY TÍNH) */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <button onClick={() => setView(user.role === 'admin' ? 'dashboard' : 'home')} className="p-1.5 sm:p-2 -ml-1.5 hover:bg-slate-100 rounded-full transition-colors shrink-0">
                            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-slate-600" />
                        </button>
                        <h2 className="font-bold text-slate-800 text-base sm:text-xl md:text-2xl truncate whitespace-nowrap">{viewTitle}</h2>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <button
                            onClick={() => { setInitialTaskData(null); setEditTaskData(null); setView('daily_task_form'); }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                        >
                            <Plus className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="md:hidden">Tạo mới</span>
                            <span className="hidden md:inline">Tạo báo cáo mới</span>
                        </button>

                        {/* MENU TÁC VỤ GỌN CHO ĐIỆN THOẠI (XUẤT KPI, ĐỒNG BỘ SHEET, XUẤT EXCEL) */}
                        <div className="relative md:hidden" ref={mobileMenuRef}>
                            <button
                                type="button"
                                onClick={() => setIsMobileActionMenuOpen(prev => !prev)}
                                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                                title="Xuất báo cáo & Đồng bộ"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                                <span>Xuất</span>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isMobileActionMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isMobileActionMenuOpen && (
                                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-fade-in">
                                    {taskFilter !== 'pending' && (
                                        <button
                                            disabled={isExporting}
                                            onClick={() => { setIsMobileActionMenuOpen(false); openKpiExportModal(); }}
                                            className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-purple-700 hover:bg-purple-50 flex items-center gap-2.5 disabled:opacity-50"
                                        >
                                            <FileSpreadsheet className="w-4 h-4 shrink-0" />
                                            <span>Xuất Báo Cáo KPI</span>
                                        </button>
                                    )}
                                    <button
                                        disabled={isExporting}
                                        onClick={() => { setIsMobileActionMenuOpen(false); handleSyncAllDailyTasksToSheet(dailyTasks); }}
                                        className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 flex items-center gap-2.5 disabled:opacity-50"
                                    >
                                        <Cloud className="w-4 h-4 shrink-0" />
                                        <span>Đồng bộ Google Sheet</span>
                                    </button>
                                    <button
                                        disabled={isExporting}
                                        onClick={() => { setIsMobileActionMenuOpen(false); handleExportExcel(); }}
                                        className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 disabled:opacity-50"
                                    >
                                        <Download className="w-4 h-4 shrink-0" />
                                        <span>Xuất Excel Sổ CV</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* CỤM NÚT ĐẦY ĐỦ TRÊN MÁY TÍNH */}
                        <div className="hidden md:flex items-center gap-2">
                            {taskFilter !== 'pending' && (
                                <button disabled={isExporting} onClick={openKpiExportModal} className="shrink-0 bg-purple-600 text-white px-3.5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-purple-700 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                                    <FileSpreadsheet className="w-5 h-5"/> <span>Xuất KPI</span>
                                </button>
                            )}
                            <button disabled={isExporting} onClick={() => handleSyncAllDailyTasksToSheet(dailyTasks)} className="shrink-0 bg-blue-600 text-white px-3.5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50" title="Đẩy toàn bộ dữ liệu Sổ ghi công việc hiện tại lên Google Sheet">
                                <Cloud className="w-5 h-5"/> <span>Đồng bộ Sheet</span>
                            </button>
                            <button disabled={isExporting} onClick={handleExportExcel} className="shrink-0 bg-green-600 text-white px-3.5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-green-700 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                                <Download className="w-5 h-5"/> <span>Xuất Excel</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* HÀNG 2 (ĐIỆN THOẠI): THANH LỌC 1 DÒNG SIÊU GỌN + NÚT MỞ RỘNG KTV/NGÀY */}
                <div className="md:hidden space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                        {taskFilter !== 'pending' && (
                            <VietnameseMonthPicker
                                value={selectedReportMonth}
                                onChange={(val) => handleSelectMonthPeriod(val)}
                                className="px-2.5 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-xs outline-none text-purple-900 font-bold shrink-0"
                            />
                        )}
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="flex-1 min-w-0 px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-bold truncate"
                        >
                            <option value="all">Tất cả phân loại</option>
                            <option value="Bảo dưỡng định kỳ">Bảo dưỡng định kỳ</option>
                            <option value="Chế tạo máy">Chế tạo máy</option>
                            <option value="Sửa chữa đột xuất">Sửa chữa đột xuất</option>
                            <option value="Nghỉ phép">Nghỉ phép</option>
                        </select>
                        <button
                            type="button"
                            onClick={() => setShowMobileExtraFilters(prev => !prev)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 shrink-0 transition-colors ${showMobileExtraFilters || filterTech !== 'all' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                        >
                            <Filter className="w-3.5 h-3.5" />
                            <span>Lọc</span>
                            {filterTech !== 'all' && <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>}
                        </button>
                    </div>

                    {showMobileExtraFilters && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-fade-in">
                            {user.role === 'admin' && (
                                <select
                                    value={filterTech}
                                    onChange={e => setFilterTech(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-bold"
                                >
                                    <option value="all">Tất cả KTV</option>
                                    {usersList.filter(u => u.role !== 'admin').map(u => <option key={u.id} value={u.username}>{u.name}</option>)}
                                </select>
                            )}
                            {taskFilter !== 'pending' && (
                                <div className="flex items-center justify-between gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 min-w-0 bg-transparent text-xs outline-none text-slate-700 font-bold" />
                                    <span className="text-slate-400 font-bold">-</span>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 min-w-0 bg-transparent text-xs outline-none text-slate-700 font-bold" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* HÀNG 2 (MÁY TÍNH): BỘ LỌC ĐẦY ĐỦ NHÂN VIÊN, PHÂN LOẠI & THỜI GIAN */}
                <div className="hidden md:flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
                   {user.role === 'admin' && (
                      <div className="relative min-w-[180px]">
                          <Filter className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                          <select value={filterTech} onChange={e => setFilterTech(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-bold"><option value="all">Tất cả KTV</option>{usersList.filter(u=>u.role !== 'admin').map(u => <option key={u.id} value={u.username}>{u.name}</option>)}</select>
                      </div>
                   )}
                   <div className="relative min-w-[190px]">
                       <ListFilter className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                       <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-bold">
                           <option value="all">Tất cả phân loại</option>
                           <option value="Bảo dưỡng định kỳ">Bảo dưỡng định kỳ</option>
                           <option value="Chế tạo máy">Chế tạo máy</option>
                           <option value="Sửa chữa đột xuất">Sửa chữa đột xuất</option>
                           <option value="Nghỉ phép">Nghỉ phép</option>
                       </select>
                   </div>
                   {taskFilter !== 'pending' && (
                       <div className="flex flex-wrap items-center gap-2">
                           <VietnameseMonthPicker
                               value={selectedReportMonth}
                               onChange={(val) => handleSelectMonthPeriod(val)}
                               title={`Chọn nhanh kỳ tháng (Từ ngày ${monthStartDay} tháng trước đến ngày ${Number(monthStartDay) === 1 ? 'cuối tháng' : Number(monthStartDay) - 1 + ' tháng này'})`}
                               className="px-3.5 py-2.5 bg-purple-50 border border-purple-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 text-purple-900 font-bold shrink-0"
                           />
                           <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0">
                               <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-sm outline-none text-slate-700 font-bold" />
                               <span className="text-slate-400 font-bold">-</span>
                               <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-sm outline-none text-slate-700 font-bold" />
                           </div>
                       </div>
                   )}
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 pb-20 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-4">
                {historyMissingDates.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs md:text-sm font-black text-rose-900">
                                    Cảnh báo: {targetUserForMissing?.name} đang nhập thiếu {historyMissingDates.length} ngày báo cáo trong kỳ này!
                                </p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {historyMissingDates.map(mDate => (
                                        <button
                                            key={mDate}
                                            onClick={() => {
                                                setInitialTaskData({ date: mDate, isMissingFill: true });
                                                setEditTaskData(null);
                                                setView('daily_task_form');
                                            }}
                                            className="bg-white hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors"
                                        >
                                            + {getVietnameseDayName(mDate)}, {formatDateVi(mDate)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center text-xs md:text-sm text-slate-500 uppercase font-bold tracking-wider mb-4"><span>{taskFilter !== 'pending' ? `Từ ${startDate} đến ${endDate}` : 'Tất cả'} ({sortedTasks.length} bản ghi)</span></div>
                
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                                <tr>
                                    <th className="px-4 py-4 font-bold">Thời gian</th>
                                    <th className="px-4 py-4 font-bold">Nhân sự</th>
                                    <th className="px-4 py-4 font-bold min-w-[250px]">Nội dung Công việc</th>
                                    <th className="px-4 py-4 font-bold min-w-[200px]">Ghi chú / Vật tư</th>
                                    <th className="px-4 py-4 font-bold text-center">Trạng thái</th>
                                    <th className="px-4 py-4 font-bold text-center">Hình ảnh</th>
                                    <th className="px-4 py-4 font-bold text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedTasks.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center text-slate-400 text-base md:text-lg border-dashed border-slate-300">Không có báo cáo nào phù hợp.</td>
                                    </tr>
                                ) : (
                                    sortedTasks.map((task) => (
                                        <tr key={task.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-4 py-4 align-top whitespace-nowrap">
                                                <div className="font-bold text-slate-800 flex items-center bg-slate-100 px-2.5 py-1.5 rounded-lg w-fit mb-1.5"><CalendarClock className="w-4 h-4 mr-1.5 text-slate-500"/> {task.date}</div>
                                                <div className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md w-fit flex items-center mb-1.5">
                                                    <Clock className="w-3 h-3 mr-1 text-slate-400" /> {task.startTime} - {task.endTime}
                                                </div>
                                                <div className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-md border border-purple-100 w-fit">
                                                    T.Gian: {calculateWorkTime(task.startTime, task.endTime)}
                                                </div>
                                            </td>
                                            
                                            <td className="px-4 py-4 align-top whitespace-nowrap">
                                                <div className="font-bold text-slate-700 flex items-center mb-1"><User className="w-4 h-4 mr-1.5 text-slate-400" /> {task.technicianName}</div>
                                                {task.coWorkers && task.coWorkers.length > 0 && (
                                                    <div className="text-xs text-slate-500 flex flex-col gap-1 mt-1 pl-5">
                                                        {task.coWorkers.map(cw => (
                                                            <span key={cw.username} className="flex items-center text-[11px]"><Plus className="w-3 h-3 mr-1"/> {cw.name}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-4 py-4 align-top">
                                                <h4 className="font-bold text-slate-800 text-base leading-tight mb-2 break-words">{task.taskName}</h4>
                                                <div className="flex gap-1.5 flex-wrap items-center">
                                                    <span className={`text-[10px] md:text-xs font-bold border px-2 py-1 rounded-md uppercase tracking-wider inline-block ${String(task.type || '').trim().toLowerCase() === 'nghỉ phép' ? 'text-teal-700 bg-teal-50 border-teal-200' : 'text-purple-700 bg-purple-50 border-purple-100'}`}>
                                                        {task.type}
                                                    </span>
                                                    {task.status === 'Đang xử lý' && String(task.type || '').trim().toLowerCase() !== 'nghỉ phép' && (
                                                        <span className="text-[10px] px-2 py-1 rounded-md font-bold border whitespace-nowrap bg-amber-50 text-amber-700 border-amber-200">
                                                            KPI: Chưa đạt (Đang xử lý)
                                                        </span>
                                                    )}
                                                </div>
                                                {getNormalizedErrorLevel(task) && (
                                                    <div className="mt-2 flex gap-1 flex-wrap">
                                                        <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-md font-bold whitespace-nowrap">{getErrorLevelDisplay(task)}</span>
                                                        {task.status === 'Hoàn thành' && (
                                                            <span className={`text-[10px] px-2 py-1 rounded-md font-bold border whitespace-nowrap ${evaluateTaskKpiStatus(task, sysSettings) === 'Đạt' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>KPI: {evaluateTaskKpiStatus(task, sysSettings)}</span>
                                                        )}
                                                        <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-md font-bold whitespace-nowrap">
                                                            Trễ/Sớm: {calculateEarlyLateStr(task, sysSettings)}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-4 py-4 align-top">
                                                <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed bg-white p-2.5 border border-slate-100 rounded-xl line-clamp-3 hover:line-clamp-none transition-all cursor-pointer mb-2" title={task.note}>
                                                    {task.note}
                                                </p>
                                                {task.parts && task.parts.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {task.parts.map((p, idx) => (
                                                            <span key={idx} className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-md text-[11px] font-bold shadow-sm whitespace-nowrap">
                                                                <Package className="w-3 h-3 inline mr-1 -mt-0.5"/>
                                                                {p.name} <span className="opacity-60 font-normal">({p.quantity} {p.unit})</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-4 py-4 align-top text-center">
                                                <span className={`text-[11px] px-2.5 py-1 rounded-md font-bold shadow-sm whitespace-nowrap inline-block ${task.status === 'Hoàn thành' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                                                    {task.status}
                                                </span>
                                            </td>

                                            <td className="px-4 py-4 align-top text-center">
                                                <div className="flex gap-1.5 justify-center flex-wrap max-w-[120px] mx-auto">
                                                    {task.images && task.images.length > 0 ? task.images.map((img, idx) => (
                                                        <img key={idx} src={img} onClick={() => setZoomedImage(img)} className="w-10 h-10 object-cover rounded-lg border border-slate-200 cursor-pointer hover:scale-110 transition-transform shadow-sm" alt="BC" />
                                                    )) : <span className="text-slate-300">-</span>}
                                                </div>
                                            </td>

                                            <td className="px-4 py-4 align-top whitespace-nowrap">
                                                <div className="flex flex-col gap-2 items-center">
                                                    {task.status !== 'Hoàn thành' && (
                                                        <button onClick={() => { setInitialTaskData(task); setEditTaskData(null); setView('daily_task_form'); }} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-purple-700 transition-colors shadow-sm w-full" title="Đóng phiếu cũ và tạo 1 phiếu mới cho ca làm việc tiếp theo">
                                                            <PlaySquare className="w-3.5 h-3.5" /> Tiếp
                                                        </button>
                                                    )}
                                                    {(user.role === 'admin' || task.username === user.username) && (
                                                        <div className="flex gap-1 w-full justify-center">
                                                            <button onClick={() => startEdit(task)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-transparent hover:border-blue-200" title="Sửa">
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => setDeleteModal({ isOpen: true, id: task.originalTaskId || task.id })} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-200" title="Xóa">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

const DailyTaskFormView = ({ user, inventory, setView, showNotification, handleSaveDailyTask, initialTaskData, setInitialTaskData, editTaskData, setEditTaskData, sysSettings }) => {
  const nowStr = new Date().toTimeString().slice(0, 5);
  const dateStr = getTodayDateStr();

  const isEditing = !!editTaskData;
  const isMissingFill = Boolean(initialTaskData && initialTaskData.isMissingFill);
  const isContinuing = Boolean(initialTaskData && !initialTaskData.isMissingFill);
  const sourceData = editTaskData || (isContinuing ? initialTaskData : null);

  const [formData, setFormData] = useState({ 
      id: isEditing ? editTaskData.id : `DT-${Date.now()}`,
      technicianName: isEditing ? editTaskData.technicianName : (user?.name || ''),
      username: isEditing ? editTaskData.username : (user?.username || ''), 
      date: isEditing ? editTaskData.date : (isMissingFill && initialTaskData.date ? initialTaskData.date : dateStr), 
      startTime: isEditing ? editTaskData.startTime : (isMissingFill ? '07:30' : nowStr), 
      endTime: isEditing ? editTaskData.endTime : (isMissingFill ? '17:00' : nowStr),
      taskName: sourceData ? sourceData.taskName : '', 
      type: sourceData ? sourceData.type : 'Sửa chữa đột xuất', 
      errorLevel: sourceData && sourceData.errorLevel ? String(sourceData.errorLevel).replace(/\D/g, '') || '1' : '1',
      approvedTime: sourceData && sourceData.approvedTime ? sourceData.approvedTime : (sysSettings?.error_times?.level3 || 24),
      note: isEditing ? editTaskData.note : '', 
      status: isEditing ? editTaskData.status : 'Hoàn thành', 
      parts: isEditing ? (editTaskData.parts || []) : [], 
      images: isEditing ? (editTaskData.images || []) : [] 
  });
  
  const [tempPart, setTempPart] = useState({ name: '', unit: '', quantity: '' });
  const [isCustomPart, setIsCustomPart] = useState(false);

  const addPart = () => { 
      if(tempPart.name && tempPart.quantity) { 
          setFormData({...formData, parts: [...formData.parts, tempPart]}); 
          setTempPart({ name: '', unit: '', quantity: '' }); 
          setIsCustomPart(false);
      } else showNotification('Chọn/nhập vật tư và số lượng!', 'error');
  };
  
  const handleImageUpload = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas'); const scaleSize = 800 / img.width;
              canvas.width = 800; canvas.height = img.height * scaleSize;
              const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              setFormData(prev => ({...prev, images: [...prev.images, canvas.toDataURL('image/jpeg', 0.6)]}));
          };
          img.src = event.target.result;
      };
      reader.readAsDataURL(file);
  };

  const removeImage = (index) => {
      const newImages = [...formData.images];
      newImages.splice(index, 1);
      setFormData({...formData, images: newImages});
  };

  const parseTimeToMinutes = (tStr) => {
      if (!tStr || typeof tStr !== 'string' || !tStr.includes(':')) return NaN;
      const [h, m] = tStr.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return NaN;
      return h * 60 + m;
  };
  const startMins = parseTimeToMinutes(formData.startTime);
  const endMins = parseTimeToMinutes(formData.endTime);
  const isInvalidTimeRange = isNaN(startMins) || isNaN(endMins) || endMins <= startMins;

  const actualMins = getActualWorkMinutes(formData.startTime, formData.endTime);
  let maxMinutes = 0;
  if (formData.errorLevel === '1') maxMinutes = (sysSettings?.error_times?.level1 || 1.5) * 60;
  else if (formData.errorLevel === '2') maxMinutes = (sysSettings?.error_times?.level2 || 4) * 60;
  else if (formData.errorLevel === '3') maxMinutes = (parseFloat(formData.approvedTime) || sysSettings?.error_times?.level3 || 24) * 60;
  const isKpiPassed = actualMins <= maxMinutes;

  const submitForm = () => {
      const isLeaveType = String(formData.type || '').trim().toLowerCase() === 'nghỉ phép';
      if (!isLeaveType && isInvalidTimeRange) {
          return showNotification('Giờ kết thúc phải lớn hơn giờ bắt đầu!', 'error');
      }
      const trimmedTaskName = (formData.taskName || '').trim();
      const trimmedNote = (formData.note || '').trim();
      if (!isLeaveType && !trimmedTaskName && !trimmedNote) {
          return showNotification('Vui lòng nhập Tên công việc hoặc Ghi chú chi tiết!', 'error');
      }
      
      const finalData = {
          ...formData,
          taskName: trimmedTaskName || (isLeaveType ? 'Nghỉ phép' : trimmedNote),
          note: trimmedNote || (isLeaveType ? 'Nghỉ phép theo quy định (Không trừ KPI)' : trimmedTaskName),
          status: isLeaveType ? 'Hoàn thành' : formData.status
      };

      if (finalData.type === 'Sửa chữa đột xuất') {
          finalData.kpiStatus = finalData.status === 'Hoàn thành' && isKpiPassed ? 'Đạt' : 'Không đạt';
      } else {
          delete finalData.errorLevel;
          delete finalData.approvedTime;
          delete finalData.kpiStatus;
      }
      
      handleSaveDailyTask(finalData, isEditing);
  };

  const handleBack = () => { setInitialTaskData(null); setEditTaskData(null); setView(user.role === 'admin' ? 'daily_task_history' : 'home'); };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-fade-in">
      <div className="p-4 md:p-6 border-b border-slate-200 bg-white shrink-0 shadow-sm z-10">
          <div className="max-w-3xl mx-auto flex items-center space-x-4"><button onClick={handleBack} className="p-2.5 -ml-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-6 h-6 md:w-7 md:h-7 text-slate-600" /></button><h2 className="font-bold text-slate-800 text-lg md:text-2xl flex items-center"><CalendarClock className="w-6 h-6 md:w-8 md:h-8 mr-3 text-purple-600"/> {isEditing ? 'Sửa Báo Cáo Ngày' : (isContinuing ? 'Tạo Phiếu Mới (Tiếp Tục Công Việc)' : (isMissingFill ? 'Nhập Bổ Sung Báo Cáo Ngày Thiếu' : 'Báo cáo Hằng ngày'))}</h2></div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-40 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-6">
              {isMissingFill && initialTaskData?.date && (
                  <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3 animate-fade-in">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-xs md:text-sm text-rose-900">
                          <p className="font-bold">Đang nhập bổ sung cho ngày bị thiếu: {getVietnameseDayName(initialTaskData.date)}, {formatDateVi(initialTaskData.date)}</p>
                          <p className="text-rose-700 mt-0.5">Nếu ngày này bạn nghỉ phép, hãy chọn <b>Phân loại: Nghỉ phép</b> để không bị trừ % điểm KPI.</p>
                      </div>
                  </div>
              )}
              {isContinuing && initialTaskData && (
                  <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl flex items-start gap-3 animate-fade-in">
                      <CheckCircle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                      <div className="text-xs md:text-sm text-purple-900">
                          <p className="font-bold">Đang tạo phiếu mới tiếp nối công việc: "{initialTaskData.taskName}"</p>
                          <p className="text-purple-700 mt-0.5">Phiếu cũ ngày <b>{initialTaskData.date}</b> ({initialTaskData.startTime} - {initialTaskData.endTime}) sẽ tự động được đóng (chuyển sang <b>Hoàn thành</b>) và tách thành dòng riêng khi lưu phiếu mới này.</p>
                      </div>
                  </div>
              )}
              {user.role === 'admin' && (<div className="bg-slate-100 p-4 rounded-xl border border-slate-200"><label className="block text-sm font-bold text-slate-600 mb-2">Người thực hiện (Admin nhập hộ)</label><input type="text" className="w-full p-3.5 rounded-xl border border-slate-300 bg-white text-base focus:ring-2 focus:ring-purple-500 outline-none font-bold" value={formData.technicianName} onChange={e => setFormData({...formData, technicianName: e.target.value})} /></div>)}

              <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div><label className="block text-sm md:text-base font-bold text-slate-700 mb-2">Tên Công việc / Thiết bị <span className="text-red-500">*</span></label><input type="text" autoFocus className="w-full p-4 rounded-2xl border border-slate-300 bg-slate-50 text-lg focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-bold placeholder:font-normal transition-all" placeholder="VD: Thay bóng đèn xưởng A, Đi dây mạng..." value={formData.taskName} onChange={e => setFormData({...formData, taskName: e.target.value})} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div><label className="block text-sm font-bold text-slate-600 mb-2">Ngày thực hiện</label><input type="date" className="w-full p-4 rounded-2xl border border-slate-300 text-base font-medium focus:ring-2 focus:ring-purple-500 outline-none bg-white transition-all" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                      <div>
                          <label className="block text-sm font-bold text-slate-600 mb-2">Phân loại</label>
                          <select
                              className="w-full p-4 rounded-2xl border border-slate-300 text-base font-medium focus:ring-2 focus:ring-purple-500 outline-none bg-white transition-all text-slate-700"
                              value={formData.type}
                              onChange={e => {
                                  const nextType = e.target.value;
                                  if (nextType === 'Nghỉ phép') {
                                      setFormData({
                                          ...formData,
                                          type: nextType,
                                          taskName: formData.taskName || 'Nghỉ phép',
                                          note: formData.note || 'Nghỉ phép theo quy định',
                                          status: 'Hoàn thành'
                                      });
                                  } else {
                                      setFormData({ ...formData, type: nextType });
                                  }
                              }}
                          >
                                <option value="Sửa chữa đột xuất">Sửa chữa đột xuất</option>
                                <option value="Bảo dưỡng định kỳ">Bảo dưỡng định kỳ</option>
                                <option value="Chế tạo máy">Chế tạo máy</option>
                                <option value="Nghỉ phép">Nghỉ phép</option>
                          </select>
                      </div>
                  </div>

                  {formData.type === 'Nghỉ phép' && (
                      <div className="bg-teal-50 border border-teal-200 p-4 rounded-2xl flex items-start gap-3 animate-fade-in">
                          <CheckCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                          <div className="text-xs md:text-sm text-teal-900">
                              <p className="font-bold">Chế độ khai báo Nghỉ phép:</p>
                              <p className="text-teal-700 mt-0.5">Ngày <b>{formatDateVi(formData.date)}</b> sẽ được ghi nhận là ngày nghỉ phép hợp lệ và <b>không bị đánh giá thiếu báo cáo hay trừ % điểm KPI</b>.</p>
                          </div>
                      </div>
                  )}

                  <div className={`p-4 md:p-6 rounded-3xl border space-y-3 transition-colors ${isInvalidTimeRange ? 'bg-red-50/70 border-red-300' : 'bg-purple-50 border-purple-100'}`}>
                      <div className="grid grid-cols-2 gap-3 md:gap-6">
                          <EasyTimePicker
                              label="Giờ Bắt đầu"
                              value={formData.startTime}
                              onChange={(val) => setFormData({ ...formData, startTime: val })}
                              theme="purple"
                              quickTimes={['07:30', '08:00', '13:00', '17:30']}
                          />
                          <EasyTimePicker
                              label="Giờ Kết thúc"
                              value={formData.endTime}
                              onChange={(val) => setFormData({ ...formData, endTime: val })}
                              theme="purple"
                              quickTimes={['11:30', '17:00', '20:00', '21:00']}
                          />
                      </div>
                      {isInvalidTimeRange ? (
                          <div className="flex items-center gap-2 bg-red-100 text-red-700 px-3.5 py-2.5 rounded-xl border border-red-200 text-xs md:text-sm font-bold">
                              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                              <span>Lỗi: Giờ kết thúc ({formData.endTime}) phải lớn hơn giờ bắt đầu ({formData.startTime})!</span>
                          </div>
                      ) : (
                          <div className="flex items-center justify-between bg-white/80 px-3.5 py-2 rounded-xl border border-purple-200/70 text-xs md:text-sm">
                              <span className="text-purple-700 font-medium">Thời gian thực làm (đã trừ giờ nghỉ):</span>
                              <span className="font-black text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-lg">
                                  {formatDurationMinutes(actualMins)}
                              </span>
                          </div>
                      )}
                  </div>

                  {formData.type === 'Sửa chữa đột xuất' && (
                      <div className="col-span-full bg-red-50 p-4 md:p-6 rounded-2xl border border-red-200 animate-fade-in">
                          <label className="block text-sm md:text-base font-bold text-red-800 mb-4 flex items-center"><AlertTriangle className="w-5 h-5 mr-2" /> Mức độ lỗi & KPI Thời gian xử lý</label>
                          <div className="space-y-4">
                              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-red-100/50 transition-colors border border-transparent hover:border-red-200">
                                  <input type="radio" name="errorLevel" value="1" checked={formData.errorLevel === '1'} onChange={() => setFormData({...formData, errorLevel: '1'})} className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500" />
                                  <div>
                                      <span className="font-bold text-red-700 text-sm md:text-base">Lỗi mức 1 (≤ {sysSettings?.error_times?.level1 || 1.5} giờ)</span>
                                      <p className="text-xs md:text-sm text-red-600 mt-0.5">Nhẹ / căn chỉnh, thay nhanh</p>
                                  </div>
                              </label>
                              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-red-100/50 transition-colors border border-transparent hover:border-red-200">
                                  <input type="radio" name="errorLevel" value="2" checked={formData.errorLevel === '2'} onChange={() => setFormData({...formData, errorLevel: '2'})} className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500" />
                                  <div>
                                      <span className="font-bold text-red-700 text-sm md:text-base">Lỗi mức 2 (≤ {sysSettings?.error_times?.level2 || 4} giờ)</span>
                                      <p className="text-xs md:text-sm text-red-600 mt-0.5">Trung bình / thay phụ tùng, sự cố điện</p>
                                  </div>
                              </label>
                              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-red-100/50 transition-colors border border-transparent hover:border-red-200">
                                  <input type="radio" name="errorLevel" value="3" checked={formData.errorLevel === '3'} onChange={() => setFormData({...formData, errorLevel: '3'})} className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500" />
                                  <div className="flex-1">
                                      <span className="font-bold text-red-700 text-sm md:text-base">Lỗi mức 3 (Nặng)</span>
                                      <p className="text-xs md:text-sm text-red-600 mt-0.5 leading-relaxed">Hỏng cụm cơ khí chính, lỗi hệ thống, sự cố phức tạp vượt ngoài năng lực nội bộ</p>
                                      {formData.errorLevel === '3' && (
                                          <div className="mt-3 bg-white p-3 md:p-4 rounded-xl border border-red-200 shadow-sm animate-fade-in">
                                              <label className="text-xs md:text-sm font-bold text-red-700 block mb-2">Thời gian chuẩn đoán được phê duyệt (giờ)</label>
                                              <input type="number" step="0.5" value={formData.approvedTime} onChange={e => setFormData({...formData, approvedTime: e.target.value})} className="p-3 rounded-lg border border-red-300 w-full outline-none focus:ring-2 focus:ring-red-500 bg-red-50/30 font-bold text-red-900" />
                                          </div>
                                      )}
                                  </div>
                              </label>
                          </div>
                          
                          <div className={`mt-5 p-4 rounded-xl border-2 font-bold flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-colors ${isKpiPassed ? 'bg-green-50 text-green-700 border-green-300' : 'bg-red-50 text-red-700 border-red-300'}`}>
                              <span className="flex items-center"><Clock className="w-5 h-5 mr-2" /> T.Gian thực làm: {(actualMins / 60).toFixed(1)} giờ</span>
                              <span className={`uppercase text-sm shadow-sm px-3 py-1.5 rounded-lg inline-flex items-center w-fit ${isKpiPassed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                  {isKpiPassed ? <CheckCircle className="w-4 h-4 mr-1.5" /> : <AlertTriangle className="w-4 h-4 mr-1.5" />} KPI: {isKpiPassed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                              </span>
                          </div>
                      </div>
                  )}
              </div>

              <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div><label className="block text-sm md:text-base font-bold text-slate-700 mb-2">Ghi chú / Nội dung chi tiết <span className="text-red-500">*</span></label><textarea rows="5" className="w-full p-4 rounded-2xl border border-slate-300 text-base md:text-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none leading-relaxed bg-slate-50 focus:bg-white transition-all" placeholder="Mô tả chi tiết các bước đã làm..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})}></textarea></div>

                  <div>
                      <label className="block text-sm md:text-base font-bold text-slate-700 mb-3">Vật tư sử dụng</label>
                      <div className="flex flex-col gap-3 mb-4 bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-200">
                          <SearchablePartSelect inventory={inventory} isCustomPart={isCustomPart} setIsCustomPart={setIsCustomPart} tempPart={tempPart} setTempPart={setTempPart} theme="purple" />
                          {isCustomPart && (<input placeholder="Nhập tên vật tư mới..." className="w-full p-3 border border-purple-300 rounded-xl text-base bg-white outline-none focus:ring-2 focus:ring-purple-500" value={tempPart.name} onChange={e => setTempPart({...tempPart, name: e.target.value})} />)}
                          <div className="flex flex-col md:flex-row gap-3">
                              <input placeholder="Đơn vị" disabled={!isCustomPart} className={`flex-1 p-3 border border-slate-300 rounded-xl text-base font-medium ${!isCustomPart ? 'bg-slate-100 text-slate-500' : 'bg-white outline-none focus:ring-2 focus:ring-purple-500'}`} value={tempPart.unit} onChange={e => setTempPart({...tempPart, unit: e.target.value})} />
                              <input placeholder="Số lượng dùng" type="number" className="flex-1 p-3 border border-slate-300 rounded-xl text-base font-bold text-center bg-white outline-none focus:ring-2 focus:ring-purple-500" value={tempPart.quantity} onChange={e => setTempPart({...tempPart, quantity: e.target.value})} />
                              <button onClick={addPart} className="md:w-1/4 bg-slate-800 text-white p-3 rounded-xl text-base font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"><Plus className="w-5 h-5" /> <span className="md:hidden">Thêm</span></button>
                          </div>
                      </div>
                      <div className="space-y-3">{formData.parts.map((p, i) => (<div key={i} className="bg-white border border-slate-200 p-4 rounded-xl flex justify-between text-sm md:text-base items-center shadow-sm"><span className="font-bold text-slate-800">{p.name}</span><span className="text-purple-700 bg-purple-100 px-3 py-1 rounded-lg font-black border border-purple-200">Dùng: {p.quantity} {p.unit}</span></div>))}</div>
                  </div>

                  <div>
                      <label className="block text-sm md:text-base font-bold text-slate-700 mb-3">Hình ảnh đính kèm</label>
                      <div className="flex flex-wrap gap-2 md:gap-4">
                          {formData.images.map((img, idx) => (<div key={idx} className="relative w-16 h-16 md:w-24 md:h-24"><img src={img} className="w-full h-full object-cover rounded-xl border border-slate-200 shadow-sm" alt="Preview" /><button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-transform hover:scale-110"><X className="w-3 h-3 md:w-4 md:h-4" /></button></div>))}
                          <label className="w-16 h-16 md:w-24 md:h-24 flex flex-col items-center justify-center border-2 border-dashed border-purple-300 rounded-xl cursor-pointer bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors shadow-sm"><Camera className="w-5 h-5 md:w-8 md:h-8 mb-1 md:mb-2" /><span className="text-[9px] md:text-xs font-bold uppercase tracking-wider">Thêm ảnh</span><input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" /></label>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <button onClick={() => setFormData({...formData, status: 'Hoàn thành'})} className={`p-4 md:p-6 rounded-3xl border-2 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 bg-white transition-all shadow-sm ${formData.status === 'Hoàn thành' ? 'border-green-500 text-green-700 bg-green-50 shadow-md transform scale-[1.02]' : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300'}`}><CheckCircle className="w-6 h-6 md:w-8 md:h-8" /> <span className="font-bold md:text-lg">Đã xong</span></button>
                  <button onClick={() => setFormData({...formData, status: 'Đang xử lý'})} className={`p-4 md:p-6 rounded-3xl border-2 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 bg-white transition-all shadow-sm ${formData.status === 'Đang xử lý' ? 'border-yellow-500 text-yellow-700 bg-yellow-50 shadow-md transform scale-[1.02]' : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300'}`}><AlertCircle className="w-6 h-6 md:w-8 md:h-8" /> <span className="font-bold md:text-lg">Đang dở</span></button>
              </div>
          </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 border-t border-slate-200 bg-white/95 backdrop-blur-xl shadow-[0_-20px_25px_-5px_rgba(0,0,0,0.05)] z-20">
          <div className="max-w-3xl mx-auto w-full">
            <button onClick={submitForm} className="w-full bg-purple-600 text-white py-4 md:py-5 rounded-2xl md:rounded-3xl text-lg md:text-xl font-black shadow-lg shadow-purple-500/40 flex items-center justify-center gap-3 hover:bg-purple-700 transition-all hover:shadow-xl active:scale-[0.98]">
                <Save className="w-6 h-6 md:w-7 md:h-7" /> {isEditing ? 'Cập Nhật Báo Cáo' : (isContinuing ? 'Lưu Tiến Độ Mới' : 'Lưu Báo Cáo Ngày')}
            </button>
          </div>
      </div>
    </div>
  );
};

const MachineLogFormView = ({ user, inventory, selectedMachine, setView, showNotification, handleSaveMachineLog, editLogData, setEditLogData, usersList, sysSettings }) => {
  const isEditing = !!editLogData;
  const dateStr = getTodayDateStr();
  const nowStr = new Date().toTimeString().slice(0, 5);

  const [machineStatus, setMachineStatus] = useState(selectedMachine.status);

  const [formData, setFormData] = useState({
      id: isEditing ? editLogData.id : Date.now(),
      machineId: selectedMachine.id,
      technicianName: user?.name || '',
      username: user?.username || '',
      date: isEditing ? editLogData.date : dateStr,
      startTime: isEditing ? (editLogData.startTime || nowStr) : nowStr,
      endTime: isEditing ? (editLogData.endTime || nowStr) : nowStr,
      type: isEditing ? editLogData.type : 'Bảo dưỡng định kỳ',
      errorLevel: isEditing && editLogData.errorLevel ? editLogData.errorLevel : '1',
      approvedTime: isEditing && editLogData.approvedTime ? editLogData.approvedTime : (sysSettings?.error_times?.level3 || 24),
      note: isEditing ? editLogData.note : '',
      status: isEditing ? editLogData.status : 'Hoàn thành',
      images: isEditing ? (editLogData.images || []) : [],
      parts: isEditing ? (editLogData.parts || []) : [],
      coWorkers: isEditing ? (editLogData.coWorkers || []) : []
  });

  const [tempPart, setTempPart] = useState({ name: '', unit: '', quantity: '' });
  const [isCustomPart, setIsCustomPart] = useState(false);

  const addPart = () => { 
      if(tempPart.name && tempPart.quantity) { 
          setFormData({...formData, parts: [...formData.parts, tempPart]}); 
          setTempPart({ name: '', unit: '', quantity: '' }); 
          setIsCustomPart(false);
      } else showNotification('Chọn/nhập vật tư và số lượng!', 'error');
  };

  const handleImageUpload = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas'); const scaleSize = 800 / img.width;
              canvas.width = 800; canvas.height = img.height * scaleSize;
              const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              setFormData(prev => ({...prev, images: [...prev.images, canvas.toDataURL('image/jpeg', 0.6)]}));
          };
          img.src = event.target.result;
      };
      reader.readAsDataURL(file);
  };

  const removeImage = (index) => {
      const newImages = [...formData.images];
      newImages.splice(index, 1);
      setFormData({...formData, images: newImages});
  };

  const actualMins = getActualWorkMinutes(formData.startTime, formData.endTime);
  let maxMinutes = 0;
  if (formData.errorLevel === '1') maxMinutes = (sysSettings?.error_times?.level1 || 1.5) * 60;
  else if (formData.errorLevel === '2') maxMinutes = (sysSettings?.error_times?.level2 || 4) * 60;
  else if (formData.errorLevel === '3') maxMinutes = (parseFloat(formData.approvedTime) || sysSettings?.error_times?.level3 || 24) * 60;
  const isKpiPassed = actualMins <= maxMinutes;

  const submitForm = () => {
      if(!formData.note) return showNotification('Vui lòng nhập nội dung chi tiết!', 'error');
      
      const finalData = { ...formData };
      if (finalData.type === 'Sửa chữa đột xuất') {
          finalData.kpiStatus = finalData.status === 'Hoàn thành' && isKpiPassed ? 'Đạt' : 'Không đạt';
      } else {
          delete finalData.errorLevel;
          delete finalData.approvedTime;
          delete finalData.kpiStatus;
      }
      handleSaveMachineLog(finalData, machineStatus);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-fade-in">
      <div className="p-4 md:p-6 border-b border-slate-200 bg-white shrink-0 shadow-sm z-10">
          <div className="max-w-3xl mx-auto flex items-center space-x-4">
              <button onClick={() => { setView('details'); setEditLogData(null); }} className="p-2.5 -ml-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-6 h-6 md:w-7 md:h-7 text-slate-600" /></button>
              <div>
                  <h2 className="font-bold text-slate-800 text-lg md:text-2xl">{isEditing ? 'Sửa Báo Cáo Thiết Bị' : 'Báo Cáo Công Việc'}</h2>
                  <p className="text-sm md:text-base text-blue-600 font-bold mt-1">{selectedMachine.name} ({selectedMachine.id})</p>
              </div>
          </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-40 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div><label className="block text-sm font-bold text-slate-600 mb-2">Ngày thực hiện</label><input type="date" className="w-full p-4 rounded-2xl border border-slate-300 text-base font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition-all" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                      <div>
                          <label className="block text-sm font-bold text-slate-600 mb-2">Phân loại công việc</label>
                          <select className="w-full p-4 rounded-2xl border border-slate-300 text-base font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 focus:bg-white transition-all text-slate-700" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                <option>Bảo dưỡng định kỳ</option>
                                <option>Chế tạo máy</option>
                                <option>Sửa chữa đột xuất</option>
                          </select>
                      </div>
                  </div>

                  <div className="bg-blue-50 p-4 md:p-6 rounded-3xl border border-blue-100 space-y-3">
                      <div className="grid grid-cols-2 gap-3 md:gap-6">
                          <EasyTimePicker
                              label="Giờ Bắt đầu"
                              value={formData.startTime}
                              onChange={(val) => setFormData({ ...formData, startTime: val })}
                              theme="blue"
                              quickTimes={['07:30', '08:00', '13:00', '17:30']}
                          />
                          <EasyTimePicker
                              label="Giờ Kết thúc"
                              value={formData.endTime}
                              onChange={(val) => setFormData({ ...formData, endTime: val })}
                              theme="blue"
                              quickTimes={['11:30', '17:00', '20:00', '21:00']}
                          />
                      </div>
                      <div className="flex items-center justify-between bg-white/80 px-3.5 py-2 rounded-xl border border-blue-200/70 text-xs md:text-sm">
                          <span className="text-blue-700 font-medium">Thời gian thực làm (đã trừ giờ nghỉ):</span>
                          <span className="font-black text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-lg">
                              {formatDurationMinutes(actualMins)}
                          </span>
                      </div>
                  </div>

                  {formData.type === 'Sửa chữa đột xuất' && (
                      <div className="bg-red-50 p-4 md:p-6 rounded-2xl border border-red-200 animate-fade-in">
                          <label className="block text-sm md:text-base font-bold text-red-800 mb-4 flex items-center"><AlertTriangle className="w-5 h-5 mr-2" /> Mức độ lỗi & KPI Thời gian xử lý</label>
                          <div className="space-y-4">
                              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-red-100/50 transition-colors border border-transparent hover:border-red-200">
                                  <input type="radio" name="errorLevel" value="1" checked={formData.errorLevel === '1'} onChange={() => setFormData({...formData, errorLevel: '1'})} className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500" />
                                  <div>
                                      <span className="font-bold text-red-700 text-sm md:text-base">Lỗi mức 1 (≤ {sysSettings?.error_times?.level1 || 1.5} giờ)</span>
                                      <p className="text-xs md:text-sm text-red-600 mt-0.5">Nhẹ / căn chỉnh, thay nhanh</p>
                                  </div>
                              </label>
                              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-red-100/50 transition-colors border border-transparent hover:border-red-200">
                                  <input type="radio" name="errorLevel" value="2" checked={formData.errorLevel === '2'} onChange={() => setFormData({...formData, errorLevel: '2'})} className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500" />
                                  <div>
                                      <span className="font-bold text-red-700 text-sm md:text-base">Lỗi mức 2 (≤ {sysSettings?.error_times?.level2 || 4} giờ)</span>
                                      <p className="text-xs md:text-sm text-red-600 mt-0.5">Trung bình / thay phụ tùng, sự cố điện</p>
                                  </div>
                              </label>
                              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-red-100/50 transition-colors border border-transparent hover:border-red-200">
                                  <input type="radio" name="errorLevel" value="3" checked={formData.errorLevel === '3'} onChange={() => setFormData({...formData, errorLevel: '3'})} className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500" />
                                  <div className="flex-1">
                                      <span className="font-bold text-red-700 text-sm md:text-base">Lỗi mức 3 (Nặng)</span>
                                      <p className="text-xs md:text-sm text-red-600 mt-0.5 leading-relaxed">Hỏng cụm cơ khí chính, lỗi hệ thống, sự cố phức tạp vượt ngoài năng lực nội bộ</p>
                                      {formData.errorLevel === '3' && (
                                          <div className="mt-3 bg-white p-3 md:p-4 rounded-xl border border-red-200 shadow-sm animate-fade-in">
                                              <label className="text-xs md:text-sm font-bold text-red-700 block mb-2">Thời gian chuẩn đoán được phê duyệt (giờ)</label>
                                              <input type="number" step="0.5" value={formData.approvedTime} onChange={e => setFormData({...formData, approvedTime: e.target.value})} className="p-3 rounded-lg border border-red-300 w-full outline-none focus:ring-2 focus:ring-red-500 bg-red-50/30 font-bold text-red-900" />
                                          </div>
                                      )}
                                  </div>
                              </label>
                          </div>
                          
                          <div className={`mt-5 p-4 rounded-xl border-2 font-bold flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-colors ${isKpiPassed ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-red-50 text-red-700 border-red-300'}`}>
                              <span className="flex items-center"><Clock className="w-5 h-5 mr-2" /> T.Gian thực làm: {(actualMins / 60).toFixed(1)} giờ</span>
                              <span className={`uppercase text-sm shadow-sm px-3 py-1.5 rounded-lg inline-flex items-center w-fit ${isKpiPassed ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}>
                                  {isKpiPassed ? <CheckCircle className="w-4 h-4 mr-1.5" /> : <AlertTriangle className="w-4 h-4 mr-1.5" />} KPI: {isKpiPassed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                              </span>
                          </div>
                      </div>
                  )}

                  <div>
                      <label className="block text-sm md:text-base font-bold text-slate-700 mb-2">KTV làm cùng (Tự động thêm vào Báo cáo ngày)</label>
                      <CoWorkerSelect 
                          usersList={usersList} 
                          currentUser={user} 
                          selectedCoWorkers={formData.coWorkers} 
                          setSelectedCoWorkers={(cw) => setFormData({...formData, coWorkers: cw})} 
                      />
                      {formData.coWorkers && formData.coWorkers.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                              {formData.coWorkers.map(cw => (
                                  <span key={cw.username} className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center shadow-sm">
                                      {cw.name}
                                      <button onClick={() => setFormData({...formData, coWorkers: formData.coWorkers.filter(c => c.username !== cw.username)})} className="ml-2 text-blue-400 hover:text-red-500 transition-colors"><X className="w-3 h-3 md:w-4 md:h-4"/></button>
                                  </span>
                              ))}
                          </div>
                      )}
                  </div>

                  <div>
                      <label className="block text-sm md:text-base font-bold text-slate-700 mb-2">Ghi chú / Nội dung chi tiết <span className="text-red-500">*</span></label>
                      <textarea rows="5" className="w-full p-4 rounded-2xl border border-slate-300 text-base md:text-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed bg-slate-50 focus:bg-white transition-all" placeholder="Mô tả chi tiết tình trạng máy, các bước đã làm..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})}></textarea>
                  </div>

                  <div>
                      <label className="block text-sm md:text-base font-bold text-slate-700 mb-3">Vật tư thay thế / sử dụng</label>
                      <div className="flex flex-col gap-3 mb-4 bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-200">
                          <SearchablePartSelect inventory={inventory} isCustomPart={isCustomPart} setIsCustomPart={setIsCustomPart} tempPart={tempPart} setTempPart={setTempPart} theme="blue" />
                          {isCustomPart && (<input placeholder="Nhập tên vật tư mới..." className="w-full p-3 border border-blue-300 rounded-xl text-base bg-white outline-none focus:ring-2 focus:ring-blue-500" value={tempPart.name} onChange={e => setTempPart({...tempPart, name: e.target.value})} />)}
                          <div className="flex flex-col md:flex-row gap-3">
                              <input placeholder="Đơn vị" disabled={!isCustomPart} className={`flex-1 p-3 border border-slate-300 rounded-xl text-base font-medium ${!isCustomPart ? 'bg-slate-100 text-slate-500' : 'bg-white outline-none focus:ring-2 focus:ring-blue-500'}`} value={tempPart.unit} onChange={e => setTempPart({...tempPart, unit: e.target.value})} />
                              <input placeholder="Số lượng dùng" type="number" className="flex-1 p-3 border border-slate-300 rounded-xl text-base font-bold text-center bg-white outline-none focus:ring-2 focus:ring-blue-500" value={tempPart.quantity} onChange={e => setTempPart({...tempPart, quantity: e.target.value})} />
                              <button onClick={addPart} className="md:w-1/4 bg-blue-600 text-white p-3 rounded-xl text-base font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"><Plus className="w-5 h-5" /> <span className="md:hidden">Thêm</span></button>
                          </div>
                      </div>
                      <div className="space-y-3">{formData.parts.map((p, i) => (<div key={i} className="bg-white border border-slate-200 p-4 rounded-xl flex justify-between text-sm md:text-base items-center shadow-sm"><span className="font-bold text-slate-800">{p.name}</span><span className="text-blue-700 bg-blue-50 px-3 py-1 rounded-lg font-black border border-blue-200">Dùng: {p.quantity} {p.unit}</span></div>))}</div>
                  </div>

                  <div>
                      <label className="block text-sm md:text-base font-bold text-slate-700 mb-3">Hình ảnh đính kèm (Máy móc, Lỗi...)</label>
                      <div className="flex flex-wrap gap-2 md:gap-4">
                          {formData.images.map((img, idx) => (
                              <div key={idx} className="relative w-16 h-16 md:w-24 md:h-24">
                                  <img src={img} className="w-full h-full object-cover rounded-xl border border-slate-200 shadow-sm" alt="Preview" />
                                  <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-transform hover:scale-110"><X className="w-3 h-3 md:w-4 md:h-4" /></button>
                              </div>
                          ))}
                          <label className="w-16 h-16 md:w-24 md:h-24 flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-xl cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors shadow-sm">
                              <Camera className="w-5 h-5 md:w-8 md:h-8 mb-1 md:mb-2" /><span className="text-[9px] md:text-xs font-bold uppercase tracking-wider">Thêm ảnh</span><input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                          </label>
                      </div>
                  </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl transition-colors ${machineStatus === 'broken' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {machineStatus === 'broken' ? <AlertTriangle className="w-5 h-5"/> : <CheckCircle className="w-5 h-5"/>}
                      </div>
                      <div>
                          <p className="font-bold text-slate-800 text-sm md:text-base">Trạng thái thiết bị</p>
                          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">{machineStatus === 'broken' ? 'Đã đánh dấu máy lỗi/hỏng' : 'Máy hoạt động bình thường'}</p>
                      </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={machineStatus === 'broken'} onChange={(e) => setMachineStatus(e.target.checked ? 'broken' : 'operational')} />
                      <div className="w-12 h-6 md:w-14 md:h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] md:after:top-0.5 md:after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 md:after:h-6 md:after:w-6 after:transition-all peer-checked:bg-red-500 shadow-inner"></div>
                  </label>
              </div>

              <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <button onClick={() => setFormData({...formData, status: 'Hoàn thành'})} className={`p-4 md:p-6 rounded-3xl border-2 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 bg-white transition-all shadow-sm ${formData.status === 'Hoàn thành' ? 'border-green-500 text-green-700 bg-green-50 shadow-md transform scale-[1.02]' : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300'}`}><CheckCircle className="w-6 h-6 md:w-8 md:h-8" /> <span className="font-bold md:text-lg">Hoàn thành</span></button>
                  <button onClick={() => setFormData({...formData, status: 'Cần theo dõi'})} className={`p-4 md:p-6 rounded-3xl border-2 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 bg-white transition-all shadow-sm ${formData.status === 'Cần theo dõi' ? 'border-yellow-500 text-yellow-700 bg-yellow-50 shadow-md transform scale-[1.02]' : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300'}`}><AlertCircle className="w-6 h-6 md:w-8 md:h-8" /> <span className="font-bold md:text-lg">Cần theo dõi</span></button>
              </div>
          </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 border-t border-slate-200 bg-white/95 backdrop-blur-xl shadow-[0_-20px_25px_-5px_rgba(0,0,0,0.05)] z-20">
          <div className="max-w-3xl mx-auto w-full">
            <button onClick={submitForm} className="w-full bg-blue-600 text-white py-4 md:py-5 rounded-2xl md:rounded-3xl text-lg md:text-xl font-black shadow-lg shadow-blue-500/40 flex items-center justify-center gap-3 hover:bg-blue-700 transition-all hover:shadow-xl active:scale-[0.98]">
                <Save className="w-6 h-6 md:w-7 md:h-7" /> {isEditing ? 'Cập Nhật Báo Cáo' : 'Lưu Báo Cáo Thiết Bị'}
            </button>
          </div>
      </div>
    </div>
  );
};

const KpiReportView = ({ user, usersList, dailyTasks, machines, sysSettings, saveSettings, googleSheetUrl, setView, showNotification }) => {
  const monthStartDay = Math.min(28, Math.max(1, Number(sysSettings?.month_config?.startDay) || 16));
  const [activeTab, setActiveTab] = useState('sheet'); // 'sheet' | 'single' | 'formula'
  const [selectedMonth, setSelectedMonth] = useState(() => getActiveReportMonth(sysSettings)); // YYYY-MM
  const [currentPeriod, setCurrentPeriod] = useState('month'); // 'month' | 0 | 1 | 2 | 3
  const [selectedEmpUsername, setSelectedEmpUsername] = useState('');
  const [weeklyModalEmpUsername, setWeeklyModalEmpUsername] = useState(null);
  const [attendanceModalEmpUsername, setAttendanceModalEmpUsername] = useState(null);
  const [newLeaveDateInput, setNewLeaveDateInput] = useState('');
  const [isMonthConfigOpen, setIsMonthConfigOpen] = useState(false);
  const [tempStartDay, setTempStartDay] = useState(monthStartDay);
  const [tempAutoDetect, setTempAutoDetect] = useState(sysSettings?.month_config?.autoDetectMonth !== false);
  const [isExporting, setIsExporting] = useState(false);

  const isAdmin = user.role === 'admin';
  const techUsers = (Array.isArray(usersList) ? usersList : []).filter(u => u && u.role !== 'admin');
  const visibleUsers = isAdmin ? techUsers : techUsers.filter(u => u.username === user.username);

  useEffect(() => {
    if (!selectedEmpUsername || !visibleUsers.some(u => u.username === selectedEmpUsername)) {
      if (visibleUsers.length > 0) {
        setSelectedEmpUsername(visibleUsers[0].username);
      }
    }
  }, [visibleUsers, selectedEmpUsername]);

  // Tính khoảng thời gian chu kỳ tháng (mặc định từ ngày 16 tháng trước đến 15 tháng này)
  const cycleInfo = getMonthCycleRange(selectedMonth, monthStartDay);

  // Tách các công việc trong sổ công việc nằm trong chu kỳ [cycleInfo.startDate -> cycleInfo.endDate]
  const unmergedTasks = expandMergedTaskEntries(dailyTasks);
  const monthTasks = unmergedTasks.filter(t => {
    if (!t || !t.date) return false;
    const dStr = String(t.date);
    return dStr >= cycleInfo.startDate && dStr <= cycleInfo.endDate;
  });

  // Dữ liệu tuần đã lưu/tùy chỉnh cho tháng đang chọn
  const savedMonthData = sysSettings?.kpi_weekly_data?.[selectedMonth] || {};

  // Hàm kiểm tra ngày nhập thiếu (trừ Chủ nhật) & ngày nghỉ phép trong toàn chu kỳ tháng
  const getEmployeeAttendance = (emp) => {
    return analyzeEmployeeAttendanceInRange(
      emp,
      unmergedTasks,
      cycleInfo.startDate,
      cycleInfo.endDate,
      sysSettings
    );
  };

  // Bật/tắt trạng thái Nghỉ phép cho 1 ngày cụ thể của nhân viên
  const handleToggleLeaveDate = (empUsername, dateIso) => {
    if (!isAdmin || !empUsername || !dateIso) return;
    const currentList = Array.isArray(sysSettings?.kpi_leave_days?.[empUsername])
      ? sysSettings.kpi_leave_days[empUsername]
      : [];
    const exists = currentList.includes(dateIso);
    const updatedList = exists
      ? currentList.filter(d => d !== dateIso)
      : [...currentList, dateIso].sort();

    const updatedSettings = {
      ...sysSettings,
      kpi_leave_days: {
        ...(sysSettings?.kpi_leave_days || {}),
        [empUsername]: updatedList
      }
    };
    saveSettings(googleSheetUrl, updatedSettings);
    showNotification(
      exists
        ? `Đã hủy nghỉ phép ngày ${formatDateVi(dateIso)} (Tính lại ngày thiếu báo cáo)`
        : `Đã duyệt nghỉ phép ngày ${formatDateVi(dateIso)} (Không trừ KPI)`
    );
  };

  // Hàm lấy chỉ số tự động từ Sổ Ghi Công Việc chia theo 4 tuần của chu kỳ tháng
  const getAutoWeeklyMetricsFromTasks = (emp) => {
    const yesterdayStr = getYesterdayDateStr();
    const weeks = cycleInfo.weeks.map((wMeta) => {
      const wStart = wMeta.startDate;
      const wEnd = wMeta.endDate <= yesterdayStr ? wMeta.endDate : yesterdayStr;
      let wWorkingDays = 0;
      if (wStart && wEnd && wStart <= wEnd) {
        const [sy, sm, sd] = wStart.split('-').map(Number);
        const [ey, em, ed] = wEnd.split('-').map(Number);
        const cur = new Date(sy, sm - 1, sd);
        const endD = new Date(ey, em - 1, ed);
        while (cur <= endD) {
          if (cur.getDay() !== 0) wWorkingDays += 1;
          cur.setDate(cur.getDate() + 1);
        }
      }
      return {
        pmPlan: 0,
        pmDone: 0,
        cmTotal: 0,
        cmDone: 0,
        missingDays: 0,
        leaveDays: 0,
        workingDays: wWorkingDays,
        requiredReportDays: wWorkingDays
      };
    });

    const empTasks = monthTasks.filter(t =>
      t.username === emp.username || t.technicianName === emp.name || t.technicianName === emp.username
    );

    empTasks.forEach(t => {
      const isLeave = String(t.type || '').trim().toLowerCase() === 'nghỉ phép';
      if (isLeave) return; // Ngày nghỉ phép không cộng vào kế hoạch PM và không trừ KPI

      const dStr = String(t.date || '');
      let wIdx = 0;
      for (let i = 0; i < cycleInfo.weeks.length; i++) {
        if (dStr >= cycleInfo.weeks[i].startDate && dStr <= cycleInfo.weeks[i].endDate) {
          wIdx = i;
          break;
        }
      }

      const isCM = !!getNormalizedErrorLevel(t);
      if (isCM) {
        weeks[wIdx].cmTotal += 1;
        if (evaluateTaskKpiStatus(t, sysSettings) === 'Đạt') {
          weeks[wIdx].cmDone += 1;
        }
      } else {
        weeks[wIdx].pmPlan += 1;
        if (t.status === 'Hoàn thành') {
          weeks[wIdx].pmDone += 1;
        }
      }
    });

    // Phân bổ các ngày nhập thiếu (trừ Chủ nhật) và ngày nghỉ phép vào đúng từng tuần
    const { missingDates, leaveDates } = getEmployeeAttendance(emp);

    missingDates.forEach(mDate => {
      for (let i = 0; i < cycleInfo.weeks.length; i++) {
        if (mDate >= cycleInfo.weeks[i].startDate && mDate <= cycleInfo.weeks[i].endDate) {
          weeks[i].missingDays += 1;
          break;
        }
      }
    });

    leaveDates.forEach(lObj => {
      for (let i = 0; i < cycleInfo.weeks.length; i++) {
        if (lObj.date >= cycleInfo.weeks[i].startDate && lObj.date <= cycleInfo.weeks[i].endDate) {
          weeks[i].leaveDays += 1;
          weeks[i].requiredReportDays = Math.max(0, weeks[i].workingDays - weeks[i].leaveDays);
          break;
        }
      }
    });

    return weeks;
  };

  const handleSaveQuickMonthConfig = () => {
    const cleanDay = Math.min(28, Math.max(1, Number(tempStartDay) || 16));
    const nextMonthCfg = {
      startDay: cleanDay,
      autoDetectMonth: Boolean(tempAutoDetect),
      defaultMonth: selectedMonth
    };
    const nextSys = { ...sysSettings, month_config: nextMonthCfg };
    saveSettings(googleSheetUrl, nextSys);
    if (!tempAutoDetect && selectedMonth) {
      setSelectedMonth(selectedMonth);
    }
    setIsMonthConfigOpen(false);
    showNotification(`Đã cập nhật cài đặt tháng (Ngày bắt đầu: ${cleanDay})!`);
  };

  // Hợp nhất dữ liệu tự động từ Sổ Công Việc với các hiệu chỉnh của Admin
  const getEmployeeWeeks = (emp) => {
    const autoWeeks = getAutoWeeklyMetricsFromTasks(emp);
    const empSavedWeeks = savedMonthData[emp.username]?.weeks || [];

    return [0, 1, 2, 3].map(wIdx => {
      const autoW = autoWeeks[wIdx];
      const savedW = empSavedWeeks[wIdx] || {};
      const legacyErrors = savedW.errors !== undefined
        ? Number(savedW.errors)
        : (savedW.deduct !== undefined ? Number(savedW.deduct) : 0);
      return {
        errors: legacyErrors,
        pmPlan: savedW.pmPlan !== undefined ? Number(savedW.pmPlan) : autoW.pmPlan,
        pmPostponed: savedW.pmPostponed !== undefined ? Number(savedW.pmPostponed) : 0,
        pmDone: savedW.pmDone !== undefined ? Number(savedW.pmDone) : autoW.pmDone,
        cmTotal: savedW.cmTotal !== undefined ? Number(savedW.cmTotal) : autoW.cmTotal,
        cmDone: savedW.cmDone !== undefined ? Number(savedW.cmDone) : autoW.cmDone,
        missingDays: autoW.missingDays,
        leaveDays: autoW.leaveDays,
        workingDays: autoW.workingDays,
        requiredReportDays: autoW.requiredReportDays
      };
    });
  };

  // Cộng dồn 4 tuần thành số liệu tháng
  const getAggregatedMonthlyMetrics = (weeks) => {
    return weeks.reduce((acc, w) => {
      acc.errors += (w.errors || 0);
      acc.pmPlan += (w.pmPlan || 0);
      acc.pmPostponed += (w.pmPostponed || 0);
      acc.pmDone += (w.pmDone || 0);
      acc.cmTotal += (w.cmTotal || 0);
      acc.cmDone += (w.cmDone || 0);
      acc.missingDays += (w.missingDays || 0);
      acc.leaveDays += (w.leaveDays || 0);
      acc.workingDays += (w.workingDays || 0);
      acc.requiredReportDays += (w.requiredReportDays || 0);
      return acc;
    }, { errors: 0, pmPlan: 0, pmPostponed: 0, pmDone: 0, cmTotal: 0, cmDone: 0, missingDays: 0, leaveDays: 0, workingDays: 0, requiredReportDays: 0 });
  };

  // Công thức tính điểm KPI chuẩn (20% Kỷ luật & 5S | 50% PM >95% | 20% CM SLA 90% | Khấu trừ thiếu báo cáo ngày trong Mục II)
  const computeMetricsKPI = (metrics) => {
    // 1. Mục I: Kỷ luật & 5S (20%) - Bị từ 1 lỗi trở lên sẽ mất toàn bộ 20% điểm
    const errorCount = Number(metrics.errors || 0);
    const scoreI = errorCount >= 1 ? 0 : 100;
    const rateI = scoreI / 100;

    // 2. Mục II.1: Bảo dưỡng định kỳ PM (50%, mục tiêu >= 95%)
    const effectivePM = Math.max(0, (metrics.pmPlan || 0) - (metrics.pmPostponed || 0));
    let t1 = 1.0;
    if (effectivePM > 0) {
      t1 = (metrics.pmDone || 0) / effectivePM;
    }
    const scorePM = t1 >= 0.95 ? 1.0 : (t1 / 0.95);

    // 3. Mục II.2: Sự cố đột xuất CM (30%, mục tiêu >= 90%)
    let t2 = 1.0;
    if ((metrics.cmTotal || 0) > 0) {
      t2 = (metrics.cmDone || 0) / metrics.cmTotal;
    }
    const scoreCM = t2 >= 0.90 ? 1.0 : (t2 / 0.90);

    // 4. Điểm quy đổi theo trọng số (Mục I: 20% | Mục II.1: 50% | Mục II.2: 30%)
    const weightedI = rateI * 0.20;
    const weightedPM = scorePM * 0.50;
    const weightedCM = scoreCM * 0.30;

    // Lỗi không nhập báo cáo ngày (trừ Chủ nhật & Nghỉ phép) trừ KPI trực tiếp trong tổng điểm 80% của Mục II (II.1 + II.2)
    const missingDays = Number(metrics.missingDays || 0);
    const leaveDays = Number(metrics.leaveDays || 0);
    const requiredReportDays = Number(metrics.requiredReportDays || 0);
    const rawSection2Score = weightedPM + weightedCM;
    const reportComplianceRate = requiredReportDays > 0
      ? Math.max(0, (requiredReportDays - missingDays) / requiredReportDays)
      : (missingDays > 0 ? 0 : 1.0);
    const finalSection2Score = rawSection2Score * reportComplianceRate;
    const missingDayDeduction = rawSection2Score - finalSection2Score;

    const totalScore = weightedI + finalSection2Score;

    // 5. Xếp loại A, B, C, D trên tổng trọng số 100% (20% + 50% + 30%)
    const maxPossibleWeight = 1.00;
    const achievementRatio = totalScore / maxPossibleWeight;
    let rank = 'Loại D';
    let rankClass = 'bg-rose-100 text-rose-800 border-rose-200';
    let salaryPct = '0 - 70%';

    if (achievementRatio >= 0.95) {
      rank = 'Loại A';
      rankClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      salaryPct = '100% + Thưởng';
    } else if (achievementRatio >= 0.85) {
      rank = 'Loại B';
      rankClass = 'bg-blue-100 text-blue-800 border-blue-200';
      salaryPct = '100%';
    } else if (achievementRatio >= 0.70) {
      rank = 'Loại C';
      rankClass = 'bg-amber-100 text-amber-800 border-amber-200';
      salaryPct = '80%';
    }

    return {
      ...metrics,
      missingDays,
      leaveDays,
      requiredReportDays,
      reportComplianceRate,
      rawSection2Score,
      finalSection2Score,
      missingDayDeduction,
      scoreI,
      rateI,
      effectivePM,
      t1,
      scorePM,
      t2,
      scoreCM,
      weightedI,
      weightedPM,
      weightedCM,
      totalScore,
      rank,
      rankClass,
      salaryPct
    };
  };

  // Lưu thay đổi của 1 tuần cho 1 nhân viên
  const handleUpdateEmpWeek = (emp, weekIndex, field, rawVal) => {
    if (!isAdmin) return;
    const numVal = Math.max(0, parseInt(rawVal, 10) || 0);
    const currentWeeks = getEmployeeWeeks(emp);
    const updatedWeeks = currentWeeks.map((w, idx) =>
      idx === weekIndex ? { ...w, [field]: numVal } : w
    );
    const prevEmpRecord = savedMonthData[emp.username] || {};

    const updatedSettings = {
      ...sysSettings,
      kpi_weekly_data: {
        ...(sysSettings?.kpi_weekly_data || {}),
        [selectedMonth]: {
          ...savedMonthData,
          [emp.username]: {
            ...prevEmpRecord,
            weeks: updatedWeeks
          }
        }
      }
    };
    saveSettings(googleSheetUrl, updatedSettings);
  };

  // Lưu nhận xét quản lý cho nhân viên trên phiếu in
  const handleUpdateManagerNote = (empUsername, noteText) => {
    if (!isAdmin) return;
    const empObj = visibleUsers.find(u => u.username === empUsername);
    if (!empObj) return;
    const currentWeeks = getEmployeeWeeks(empObj);
    const prevEmpRecord = savedMonthData[empUsername] || {};

    const updatedSettings = {
      ...sysSettings,
      kpi_weekly_data: {
        ...(sysSettings?.kpi_weekly_data || {}),
        [selectedMonth]: {
          ...savedMonthData,
          [empUsername]: {
            ...prevEmpRecord,
            weeks: currentWeeks,
            managerNote: noteText
          }
        }
      }
    };
    saveSettings(googleSheetUrl, updatedSettings);
  };

  // Đồng bộ lại các chỉ số PM / CM từ Sổ Ghi Công Việc (giữ nguyên Điểm trừ, Điểm cộng, Hoãn)
  // Đồng bộ lại các chỉ số PM / CM từ Sổ Ghi Công Việc (giữ nguyên Số lỗi, Hoãn)
  const handleSyncFromDailyTasks = () => {
    const updatedMonthMap = { ...savedMonthData };
    visibleUsers.forEach(emp => {
      const autoWeeks = getAutoWeeklyMetricsFromTasks(emp);
      const currentWeeks = getEmployeeWeeks(emp);
      const mergedWeeks = [0, 1, 2, 3].map(wIdx => ({
        errors: currentWeeks[wIdx].errors,
        pmPostponed: currentWeeks[wIdx].pmPostponed,
        pmPlan: autoWeeks[wIdx].pmPlan,
        pmDone: autoWeeks[wIdx].pmDone,
        cmTotal: autoWeeks[wIdx].cmTotal,
        cmDone: autoWeeks[wIdx].cmDone
      }));
      updatedMonthMap[emp.username] = {
        ...(updatedMonthMap[emp.username] || {}),
        weeks: mergedWeeks
      };
    });

    saveSettings(googleSheetUrl, {
      ...sysSettings,
      kpi_weekly_data: {
        ...(sysSettings?.kpi_weekly_data || {}),
        [selectedMonth]: updatedMonthMap
      }
    });
    showNotification(`Đã đồng bộ số liệu PM & CM tháng ${selectedMonth.split('-').reverse().join('/')} từ Sổ công việc!`);
  };

  // Tính toán danh sách hiển thị cho bảng tổng hợp
  const computedRows = visibleUsers.map(emp => {
    const weeks = getEmployeeWeeks(emp);
    const attendance = getEmployeeAttendance(emp);
    const monthlyMetrics = getAggregatedMonthlyMetrics(weeks);
    const monthlyResult = computeMetricsKPI(monthlyMetrics);
    const activeMetrics = currentPeriod === 'month' ? monthlyMetrics : weeks[currentPeriod];
    const activeResult = computeMetricsKPI(activeMetrics);
    const managerNote = savedMonthData[emp.username]?.managerNote || '';

    return {
      emp,
      weeks,
      attendance,
      monthlyResult,
      activeMetrics,
      activeResult,
      managerNote
    };
  });

  // Thống kê 4 thẻ Overview
  const empCount = computedRows.length;
  const avgScorePct = empCount > 0
    ? ((computedRows.reduce((s, r) => s + r.activeResult.totalScore, 0) / empCount) * 100).toFixed(1)
    : '0.0';
  const avgPmPct = empCount > 0
    ? ((computedRows.reduce((s, r) => s + r.activeResult.t1, 0) / empCount) * 100).toFixed(1)
    : '0.0';
  const gradeACount = computedRows.filter(r => r.activeResult.rank === 'Loại A').length;

  const [reportYear, reportMonthNum] = selectedMonth.split('-');
  const formattedMonthLabel = `${cycleInfo.monthLabel} (${cycleInfo.rangeText})`;

  // Xuất file Excel Tổng Hợp Tháng & 4 Tuần
  const handleExportExcelReport = async () => {
    try {
      setIsExporting(true);
      const ExcelJS = await loadExcelJS();
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(`KPI_${selectedMonth}`);

      sheet.pageSetup = {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      };

      const logoBase64 = getMartechLogoBase64();
      const logoId = workbook.addImage({ base64: logoBase64, extension: 'png' });
      sheet.mergeCells('A1:B2');
      sheet.addImage(logoId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 165, height: 50 } });

      sheet.mergeCells('C1:R2');
      const titleCell = sheet.getCell('C1');
      titleCell.value = `BẢNG TÍNH & BÁO CÁO ĐÁNH GIÁ KPI KỸ THUẬT BẢO TRÌ - ${cycleInfo.monthLabel.toUpperCase()}\n(Kỳ tính: ${cycleInfo.rangeText})`;
      titleCell.font = { name: 'Arial', size: 13, bold: true };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      sheet.getRow(1).height = 24;
      sheet.getRow(2).height = 24;

      const thinBorder = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

      const headerRow = sheet.getRow(4);
      headerRow.height = 34;
      const headers = [
        'STT', 'Mã NV', 'Họ và Tên',
        'Số Lỗi (I)', '% Mục I (20%)',
        'Tổng KH PM (B)', 'Hoãn (C)', 'Tổng Đạt PM (A)', '% PM Tháng (50%)',
        'Tổng Sự Cố (ΣK)', 'Tổng CM Đạt (K)', '% CM Tháng (30%)',
        'Thiếu ngày', 'Trừ Thiếu Ngày (Mục II)', 'Tổng Điểm KPI Tháng', 'Xếp Loại',
        `Tuần 1 (${cycleInfo.weeks[0]?.shortRange || ''})`,
        `Tuần 2 (${cycleInfo.weeks[1]?.shortRange || ''})`,
        `Tuần 3 (${cycleInfo.weeks[2]?.shortRange || ''})`,
        `Tuần 4 (${cycleInfo.weeks[3]?.shortRange || ''})`
      ];

      headers.forEach((h, idx) => {
        const c = headerRow.getCell(idx + 1);
        c.value = h;
        c.font = { name: 'Arial', size: 10, bold: true };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        c.border = thinBorder;
      });

      sheet.columns = [
        { width: 6 }, { width: 12 }, { width: 22 },
        { width: 11 }, { width: 13 },
        { width: 13 }, { width: 10 }, { width: 13 }, { width: 14 },
        { width: 12 }, { width: 12 }, { width: 14 },
        { width: 12 }, { width: 15 }, { width: 16 }, { width: 12 },
        { width: 11 }, { width: 11 }, { width: 11 }, { width: 11 }
      ];

      computedRows.forEach((r, idx) => {
        const res = r.monthlyResult;
        const wScores = r.weeks.map(w => `${(computeMetricsKPI(w).totalScore * 100).toFixed(1)}%`);
        const row = sheet.addRow([
          idx + 1,
          r.emp.employeeId || r.emp.id || '',
          r.emp.name || '',
          res.errors,
          `${res.scoreI}%`,
          res.pmPlan,
          res.pmPostponed,
          res.pmDone,
          `${(res.t1 * 100).toFixed(1)}%`,
          res.cmTotal,
          res.cmDone,
          `${(res.t2 * 100).toFixed(1)}%`,
          res.missingDays,
          res.missingDayDeduction > 0 ? `-${(res.missingDayDeduction * 100).toFixed(1)}%` : '0.0%',
          `${(res.totalScore * 100).toFixed(1)}%`,
          res.rank,
          ...wScores
        ]);
        row.height = 24;
        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
          cell.font = { name: 'Arial', size: 10, bold: colNum === 15 || colNum === 16 };
          cell.border = thinBorder;
          cell.alignment = { vertical: 'middle', horizontal: colNum === 3 ? 'left' : 'center' };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Bao_Cao_KPI_Tuan_Va_Thang_${selectedMonth}.xlsx`;
      link.click();
      showNotification('Đã xuất file Excel Báo cáo KPI Tuần & Tháng thành công!');
    } catch (err) {
      console.error(err);
      showNotification('Lỗi khi xuất file Excel!', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Nhân viên đang chọn cho Tab Phiếu In Ký Chuẩn
  const singleSelectedRow = computedRows.find(r => r.emp.username === selectedEmpUsername) || computedRows[0];
  // Nhân viên đang mở Modal 4 Tuần
  const modalEmpRow = weeklyModalEmpUsername ? computedRows.find(r => r.emp.username === weeklyModalEmpUsername) : null;
  // Nhân viên đang mở Modal Ngày Thiếu & Nghỉ Phép
  const attendanceModalEmpRow = attendanceModalEmpUsername ? computedRows.find(r => r.emp.username === attendanceModalEmpUsername) : null;

  const copyFormulaText = (text) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showNotification('Đã sao chép công thức Excel!');
    } catch (e) {
      showNotification('Không thể sao chép tự động!', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-fade-in print-container-reset">
      {/* TOP NAVIGATION BAR */}
      <div className="bg-slate-900 text-white shadow-md shrink-0 z-20 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <button onClick={() => setView(isAdmin ? 'dashboard' : 'home')} className="p-2 -ml-2 hover:bg-slate-800 rounded-full transition-colors text-slate-300 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm">
              <Calculator className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="font-bold text-sm md:text-lg leading-tight uppercase">Hệ Thống Tính & Báo Cáo KPI Bảo Trì</h1>
              <p className="text-[11px] md:text-xs text-slate-400">Bộ phận Quản lý Thiết bị (QLTB) • Kỳ đánh giá {reportYear}</p>
            </div>
          </div>

          {/* TAB NAVIGATION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('sheet')}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold transition flex items-center gap-1.5 ${activeTab === 'sheet' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              <BarChart3 className="w-4 h-4" /> Bảng Tính Tổng Hợp
            </button>
            <button
              onClick={() => setActiveTab('single')}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold transition flex items-center gap-1.5 ${activeTab === 'single' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              <FileSpreadsheet className="w-4 h-4" /> Phiếu In Ký Chuẩn
            </button>
            <button
              onClick={() => setActiveTab('formula')}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold transition flex items-center gap-1.5 ${activeTab === 'formula' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              <Calculator className="w-4 h-4" /> Công Thức Excel
            </button>
            <button
              disabled={isExporting}
              onClick={handleExportExcelReport}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Xuất Excel
            </button>
          </div>
        </div>
      </div>

      {/* MAIN SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar print-container-reset">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20 print-container-reset">

          {/* ===================================================================== */}
          {/* TAB 1: BẢNG TÍNH TỔNG HỢP (THÁNG & 4 TUẦN)                            */}
          {/* ===================================================================== */}
          {activeTab === 'sheet' && (
            <div className="space-y-6 animate-fade-in">
              {/* 4 STATS OVERVIEW CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng nhân sự</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">{empCount}</h3>
                    <span className="text-xs text-blue-600 font-semibold">Nhân viên kỹ thuật</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Điểm KPI Trung bình</p>
                    <h3 className="text-2xl font-black text-emerald-600 mt-1">{avgScorePct}%</h3>
                    <span className="text-xs text-slate-500">Toàn tổ bảo trì</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tỷ lệ hoàn thành PM (50%)</p>
                    <h3 className="text-2xl font-black text-indigo-600 mt-1">{avgPmPct}%</h3>
                    <span className="text-xs text-slate-500">Mục tiêu: &gt;95%</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Wrench className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Phân loại Xuất sắc (A)</p>
                    <h3 className="text-2xl font-black text-amber-500 mt-1">{gradeACount}</h3>
                    <span className="text-xs text-amber-600 font-semibold">Hưởng 100% lương KPI + Thưởng</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* SPREADSHEET CARD */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* WEEK / MONTH SELECTOR BAR */}
                <div className="p-3.5 bg-slate-100 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPeriod('month')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${currentPeriod === 'month' ? 'bg-purple-700 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-purple-50'}`}
                    >
                      <PieChart className="w-3.5 h-3.5" /> Tổng Hợp Tháng (Tự động)
                    </button>
                    <div className="h-5 w-[1px] bg-slate-300 mx-1 hidden sm:block"></div>
                    {cycleInfo.weeks.map((wObj) => (
                      <button
                        key={wObj.index}
                        onClick={() => setCurrentPeriod(wObj.index)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${currentPeriod === wObj.index ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300 hover:bg-blue-50'}`}
                      >
                        {wObj.label} <span className="opacity-80 font-normal">({wObj.shortRange})</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setTempStartDay(monthStartDay);
                            setTempAutoDetect(sysSettings?.month_config?.autoDetectMonth !== false);
                            setIsMonthConfigOpen(true);
                          }}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                          title="Cài đặt ngày bắt đầu kỳ tháng và tháng mặc định"
                        >
                          <Settings className="w-3.5 h-3.5" /> Cài đặt tháng
                        </button>
                        <button
                          onClick={handleSyncFromDailyTasks}
                          className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                          title="Cập nhật lại số liệu PM & CM theo dữ liệu Sổ Ghi Công Việc của kỳ tháng này"
                        >
                          <History className="w-3.5 h-3.5" /> Đồng bộ Sổ CV
                        </button>
                      </>
                    )}
                    <span className="text-xs font-bold text-slate-600">Tháng báo cáo:</span>
                    <VietnameseMonthPicker
                      value={selectedMonth}
                      onChange={(val) => setSelectedMonth(val || getActiveReportMonth(sysSettings))}
                      className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-[11px] font-bold text-purple-800 bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg">
                      {cycleInfo.rangeText}
                    </span>
                  </div>
                </div>

                {/* TABLE SUBHEADER */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h2 className="text-sm md:text-base font-black text-slate-800 flex items-center gap-2">
                      {currentPeriod === 'month' ? (
                        <><BarChart3 className="w-5 h-5 text-purple-600" /> BẢNG TỔNG HỢP {cycleInfo.monthLabel.toUpperCase()} ({cycleInfo.rangeText})</>
                      ) : (
                        <><CalendarClock className="w-5 h-5 text-blue-600" /> NHẬP LIỆU CHI TIẾT KPI - {cycleInfo.weeks[currentPeriod]?.label.toUpperCase()} ({cycleInfo.weeks[currentPeriod]?.shortRange})</>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentPeriod === 'month'
                        ? `Dữ liệu tháng được tính từ ngày ${formatDateVi(cycleInfo.startDate)} đến ngày ${formatDateVi(cycleInfo.endDate)} (cộng dồn 4 tuần từ Sổ Ghi Công Việc). Chọn từng Tuần 1 → Tuần 4 ở thanh trên hoặc bấm biểu tượng Lịch tuần ở từng dòng để chỉnh sửa chi tiết.`
                        : `Bạn đang xem/nhập số liệu phát sinh trong ${cycleInfo.weeks[currentPeriod]?.label} (${cycleInfo.weeks[currentPeriod]?.shortRange}). Mọi thay đổi sẽ tự động cộng dồn vào Tổng Hợp Tháng.`}
                    </p>
                  </div>
                </div>

                {/* RESPONSIVE TABLE */}
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      {/* GROUP HEADERS */}
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 text-center font-bold">
                        <th rowSpan="2" className="p-2 border-r border-slate-200 w-10">STT</th>
                        <th colSpan="2" className="p-2 border-r border-slate-200 bg-slate-200/60">THÔNG TIN NHÂN SỰ</th>
                        <th colSpan="2" className="p-2 border-r border-slate-200 bg-amber-50 text-amber-900">MỤC I: KỶ LUẬT &amp; 5S (20%)</th>
                        <th colSpan="4" className="p-2 border-r border-slate-200 bg-blue-50 text-blue-900">MỤC II.1: BẢO DƯỠNG ĐỊNH KỲ - PM (50%)</th>
                        <th colSpan="3" className="p-2 border-r border-slate-200 bg-emerald-50 text-emerald-900">MỤC II.2: SỰ CỐ ĐỘT XUẤT - CM (30%)</th>
                        <th rowSpan="2" className="p-2 border-r border-slate-200 w-20 bg-rose-50 text-rose-700" title="Số ngày nhập thiếu báo cáo (trừ Chủ nhật &amp; Nghỉ phép) -&gt; Trừ trực tiếp vào tổng 80% KPI của Mục II (II.1 + II.2)">Thiếu ngày</th>
                        <th className="p-2 bg-purple-50 text-purple-900">TỔNG HỢP</th>
                        <th rowSpan="2" className="p-2 border-l border-slate-200 w-24 no-print">Tác vụ</th>
                      </tr>
                      {/* SUB HEADERS */}
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-300 text-center text-[11px] font-bold">
                        <th className="p-2 border-r border-slate-200 w-24">Mã NV</th>
                        <th className="p-2 border-r border-slate-200 min-w-[140px]">Họ và Tên</th>

                        {/* KPI I */}
                        <th className="p-2 border-r border-slate-200 w-20 text-rose-600" title="Số lỗi vi phạm kỷ luật & 5S (≥ 1 lỗi = mất 20% điểm cả tháng)">Số Lỗi</th>
                        <th className="p-2 border-r border-slate-200 w-20 bg-amber-50 font-black" title="Đạt 100% nếu 0 lỗi; Mất 20% điểm (0%) nếu ≥ 1 lỗi">% Mục I</th>

                        {/* KPI II.1 */}
                        <th className="p-2 border-r border-slate-200 w-20" title="Tổng số việc bảo dưỡng định kỳ giao theo lịch">K/Hoạch (B)</th>
                        <th className="p-2 border-r border-slate-200 w-14" title="Số việc hoãn hợp lệ do khách quan">Hoãn (C)</th>
                        <th className="p-2 border-r border-slate-200 w-16" title="Số việc hoàn thành đúng hạn và nghiệm thu">Đạt (A)</th>
                        <th className="p-2 border-r border-slate-200 w-20 bg-blue-50 font-black" title="Tỷ lệ A / (B - C)">% Đạt (T1)</th>

                        {/* KPI II.2 */}
                        <th className="p-2 border-r border-slate-200 w-16" title="Tổng số ca sự cố phát sinh">Tổng (ΣK)</th>
                        <th className="p-2 border-r border-slate-200 w-16" title="Số ca sửa đúng hạn cam kết SLA">Đạt (K)</th>
                        <th className="p-2 border-r border-slate-200 w-20 bg-emerald-50 font-black" title="Tỷ lệ K / ΣK">% Kịp (T2)</th>

                        {/* SUMMARY */}
                        <th className="p-2 w-24 font-black text-slate-900 bg-purple-100/70">Tổng Điểm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {computedRows.length === 0 ? (
                        <tr>
                          <td colSpan="15" className="p-8 text-center text-slate-400">Chưa có dữ liệu nhân sự kỹ thuật.</td>
                        </tr>
                      ) : (
                        computedRows.map((row, idx) => {
                          const { emp, activeMetrics, activeResult } = row;
                          const isMonthly = currentPeriod === 'month';

                          return (
                            <tr key={emp.id} className="hover:bg-slate-50/90 transition text-center">
                              <td className="p-2 border-r border-slate-200 text-slate-500 font-semibold">{idx + 1}</td>
                              <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-700">{emp.employeeId || emp.id}</td>
                              <td className="p-2 border-r border-slate-200 text-left font-bold text-slate-800">{emp.name}</td>

                              {isMonthly ? (
                                <>
                                  {/* MỤC I (AGGREGATED) */}
                                  <td onClick={() => setWeeklyModalEmpUsername(emp.username)} title="Tổng số lỗi 4 tuần (≥ 1 lỗi = mất 20% điểm tháng)" className={`p-2 border-r border-slate-200 font-bold cursor-pointer hover:bg-purple-50/60 ${activeMetrics.errors >= 1 ? 'text-rose-600 bg-rose-50/50' : 'text-slate-700'}`}>{activeMetrics.errors}</td>
                                  <td className={`p-2 border-r border-slate-200 font-black ${activeMetrics.errors >= 1 ? 'bg-rose-100/70 text-rose-700' : 'bg-amber-50/70 text-amber-900'}`}>{activeResult.scoreI}%</td>

                                  {/* MỤC II.1 (AGGREGATED) */}
                                  <td onClick={() => setWeeklyModalEmpUsername(emp.username)} title="Tổng kế hoạch bảo dưỡng định kỳ 4 tuần" className="p-2 border-r border-slate-200 font-semibold cursor-pointer hover:bg-purple-50/60">
                                    {activeMetrics.pmPlan}
                                  </td>
                                  <td onClick={() => setWeeklyModalEmpUsername(emp.username)} title="Tổng hoãn hợp lệ 4 tuần" className="p-2 border-r border-slate-200 text-slate-500 cursor-pointer hover:bg-purple-50/60">{activeMetrics.pmPostponed}</td>
                                  <td onClick={() => setWeeklyModalEmpUsername(emp.username)} title="Tổng hoàn thành 4 tuần" className="p-2 border-r border-slate-200 font-bold text-blue-700 cursor-pointer hover:bg-purple-50/60">{activeMetrics.pmDone}</td>
                                  <td className="p-2 border-r border-slate-200 font-black bg-blue-50/70 text-blue-900">{(activeResult.t1 * 100).toFixed(1)}%</td>

                                  {/* MỤC II.2 (AGGREGATED) */}
                                  <td onClick={() => setWeeklyModalEmpUsername(emp.username)} title="Tổng sự cố 4 tuần" className="p-2 border-r border-slate-200 font-semibold cursor-pointer hover:bg-purple-50/60">{activeMetrics.cmTotal}</td>
                                  <td onClick={() => setWeeklyModalEmpUsername(emp.username)} title="Tổng xử lý đạt SLA 4 tuần" className="p-2 border-r border-slate-200 font-bold text-emerald-700 cursor-pointer hover:bg-purple-50/60">{activeMetrics.cmDone}</td>
                                  <td className="p-2 border-r border-slate-200 font-black bg-emerald-50/70 text-emerald-900">{(activeResult.t2 * 100).toFixed(1)}%</td>

                                  {/* CỘT ĐỘC LẬP: THIẾU NGÀY */}
                                  <td onClick={() => setAttendanceModalEmpUsername(emp.username)} title="Bấm để xem chi tiết ngày thiếu báo cáo &amp; duyệt nghỉ phép" className="p-2 border-r border-slate-200 font-bold bg-rose-50/30 cursor-pointer hover:bg-rose-50">
                                    {activeResult.missingDays > 0 ? (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className="bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md font-black">
                                          {activeResult.missingDays}
                                        </span>
                                        <span className="text-[10px] font-bold text-rose-600">
                                          -{(activeResult.missingDayDeduction * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400">0</span>
                                    )}
                                  </td>
                                </>
                              ) : (
                                <>
                                  {/* MỤC I (WEEKLY INPUT) */}
                                  <td className="p-1 border-r border-slate-200">
                                    <input disabled={!isAdmin} type="number" min="0" max="100" value={activeMetrics.errors} onChange={(e) => handleUpdateEmpWeek(emp, currentPeriod, 'errors', e.target.value)} className={`w-full text-center font-bold bg-white border border-slate-200 focus:ring-1 focus:ring-rose-500 rounded py-1 disabled:bg-slate-100 ${activeMetrics.errors >= 1 ? 'text-rose-600' : 'text-slate-700'}`} />
                                  </td>
                                  <td className={`p-2 border-r border-slate-200 font-black ${activeMetrics.errors >= 1 ? 'bg-rose-100/70 text-rose-700' : 'bg-amber-50/70 text-amber-900'}`}>{activeResult.scoreI}%</td>

                                  {/* MỤC II.1 (WEEKLY INPUT) */}
                                  <td className="p-1 border-r border-slate-200">
                                    <input disabled={!isAdmin} type="number" min="0" value={activeMetrics.pmPlan} onChange={(e) => handleUpdateEmpWeek(emp, currentPeriod, 'pmPlan', e.target.value)} className="w-full text-center bg-white border border-slate-200 focus:ring-1 focus:ring-blue-500 rounded py-1 disabled:bg-slate-100" />
                                  </td>
                                  <td className="p-1 border-r border-slate-200">
                                    <input disabled={!isAdmin} type="number" min="0" value={activeMetrics.pmPostponed} onChange={(e) => handleUpdateEmpWeek(emp, currentPeriod, 'pmPostponed', e.target.value)} className="w-full text-center text-slate-500 bg-white border border-slate-200 focus:ring-1 focus:ring-blue-500 rounded py-1 disabled:bg-slate-100" />
                                  </td>
                                  <td className="p-1 border-r border-slate-200">
                                    <input disabled={!isAdmin} type="number" min="0" value={activeMetrics.pmDone} onChange={(e) => handleUpdateEmpWeek(emp, currentPeriod, 'pmDone', e.target.value)} className="w-full text-center font-bold text-blue-700 bg-white border border-slate-200 focus:ring-1 focus:ring-blue-500 rounded py-1 disabled:bg-slate-100" />
                                  </td>
                                  <td className="p-2 border-r border-slate-200 font-black bg-blue-50/70 text-blue-900">{(activeResult.t1 * 100).toFixed(1)}%</td>

                                  {/* MỤC II.2 (WEEKLY INPUT) */}
                                  <td className="p-1 border-r border-slate-200">
                                    <input disabled={!isAdmin} type="number" min="0" value={activeMetrics.cmTotal} onChange={(e) => handleUpdateEmpWeek(emp, currentPeriod, 'cmTotal', e.target.value)} className="w-full text-center bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded py-1 disabled:bg-slate-100" />
                                  </td>
                                  <td className="p-1 border-r border-slate-200">
                                    <input disabled={!isAdmin} type="number" min="0" value={activeMetrics.cmDone} onChange={(e) => handleUpdateEmpWeek(emp, currentPeriod, 'cmDone', e.target.value)} className="w-full text-center font-bold text-emerald-700 bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded py-1 disabled:bg-slate-100" />
                                  </td>
                                  <td className="p-2 border-r border-slate-200 font-black bg-emerald-50/70 text-emerald-900">{(activeResult.t2 * 100).toFixed(1)}%</td>

                                  {/* CỘT ĐỘC LẬP: THIẾU NGÀY */}
                                  <td onClick={() => setAttendanceModalEmpUsername(emp.username)} title="Bấm để xem chi tiết ngày thiếu báo cáo &amp; duyệt nghỉ phép" className="p-2 border-r border-slate-200 font-bold bg-rose-50/30 cursor-pointer hover:bg-rose-50">
                                    {activeResult.missingDays > 0 ? <span className="text-rose-600 font-black">{activeResult.missingDays}</span> : <span className="text-slate-400">0</span>}
                                  </td>
                                </>
                              )}

                              {/* SUMMARY */}
                              <td className="p-2 font-black text-slate-900 bg-purple-50 text-xs">
                                {(activeResult.totalScore * 100).toFixed(1)}%
                              </td>

                              {/* ACTIONS */}
                              <td className="p-2 border-l border-slate-200 no-print">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => setAttendanceModalEmpUsername(emp.username)}
                                    title="Kiểm tra ngày nhập thiếu & duyệt Nghỉ phép"
                                    className={`p-1.5 rounded-lg transition-colors ${row.monthlyResult.missingDays > 0 ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' : 'text-teal-600 hover:bg-teal-50'}`}
                                  >
                                    <AlertTriangle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setWeeklyModalEmpUsername(emp.username)}
                                    title="Xem & Sửa chi tiết 4 tuần"
                                    className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-1.5 rounded-lg transition-colors"
                                  >
                                    <CalendarClock className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedEmpUsername(emp.username);
                                      setActiveTab('single');
                                    }}
                                    title="Xem & In phiếu ký chuẩn"
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                                  >
                                    <FileSpreadsheet className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* FOOTER LEGEND */}
                <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap justify-end items-center gap-2">
                  <span className="italic text-[11px] text-slate-500">* Lỗi không nhập báo cáo ngày (trừ Chủ nhật &amp; Nghỉ phép) tự động trừ % KPI trong tổng điểm của Mục II (II.1 + II.2), không ảnh hưởng Mục I (20%).</span>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 2: PHIẾU ĐÁNH GIÁ CÁ NHÂN CHUẨN IN KHỔ A4                         */}
          {/* ===================================================================== */}
          {activeTab === 'single' && singleSelectedRow && (
            <div className="space-y-6 animate-fade-in print-container-reset">
              {/* CONTROLS */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-3 no-print">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" /> Chọn nhân viên xuất phiếu:
                  </label>
                  <select
                    disabled={!isAdmin}
                    value={singleSelectedRow.emp.username}
                    onChange={(e) => setSelectedEmpUsername(e.target.value)}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-75"
                  >
                    {visibleUsers.map(u => (
                      <option key={u.id} value={u.username}>
                        {(u.employeeId || u.id)} - {u.name}
                      </option>
                    ))}
                  </select>
                  <VietnameseMonthPicker
                    value={selectedMonth}
                    onChange={(val) => setSelectedMonth(val || getActiveReportMonth(sysSettings))}
                    className="border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition shadow-sm"
                  >
                    <Printer className="w-4 h-4" /> In Phiếu (Khổ A4)
                  </button>
                </div>
              </div>

              {/* FORM SHEET CONTAINER (STANDARDIZED A4 FORMAT) */}
              <div id="printableSheet" className="bg-white p-6 sm:p-12 max-w-4xl mx-auto rounded-2xl shadow-lg border border-slate-200">
                {/* HEADER */}
                <div className="border-b-2 border-slate-800 pb-4 mb-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <img src={getMartechLogoBase64()} alt="Martech Boiler" className="h-11 w-auto object-contain" />
                      <div>
                        <h3 className="text-xs uppercase font-bold tracking-wider text-slate-600">CÔNG TY MARTECH BOILER</h3>
                        <p className="text-xs font-black text-slate-800">BỘ PHẬN: QUẢN LÝ THIẾT BỊ (QLTB)</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>Mẫu số: <b>02/KPI-QLTB</b></p>
                      <p>Áp dụng: Năm {reportYear}</p>
                    </div>
                  </div>
                  <div className="text-center mt-4">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-wide uppercase">
                      BẢNG ĐÁNH GIÁ KẾT QUẢ HOÀN THÀNH CÔNG VIỆC
                    </h2>
                    <p className="text-sm font-bold text-slate-600 mt-1">Kỳ đánh giá: {formattedMonthLabel}</p>
                  </div>
                </div>

                {/* PART A: EMPLOYEE INFO */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-slate-800 uppercase mb-2 flex items-center gap-2">
                    <span>A. THÔNG TIN NHÂN SỰ:</span>
                  </h4>
                  <table className="w-full text-xs border border-slate-300">
                    <tbody>
                      <tr>
                        <td className="bg-slate-100 font-bold p-2.5 w-1/6 border-r border-b border-slate-300">Mã NV:</td>
                        <td className="p-2.5 w-2/6 border-r border-b border-slate-300 font-bold">{singleSelectedRow.emp.employeeId || singleSelectedRow.emp.id}</td>
                        <td className="bg-slate-100 font-bold p-2.5 w-1/6 border-r border-b border-slate-300">Chức vụ:</td>
                        <td className="p-2.5 w-2/6 border-b border-slate-300 font-semibold">{singleSelectedRow.emp.position || 'Nhân viên kỹ thuật bảo trì'}</td>
                      </tr>
                      <tr>
                        <td className="bg-slate-100 font-bold p-2.5 border-r border-slate-300">Họ và tên:</td>
                        <td className="p-2.5 border-r border-slate-300 font-black text-blue-900 text-sm">{singleSelectedRow.emp.name}</td>
                        <td className="bg-slate-100 font-bold p-2.5 border-r border-slate-300">Đơn vị:</td>
                        <td className="p-2.5 font-semibold">{singleSelectedRow.emp.department || 'Bảo trì xưởng'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* PART B: EVALUATION TABLE */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-slate-800 uppercase mb-2">
                    <span>B. NỘI DUNG ĐÁNH GIÁ:</span>
                  </h4>
                  <table className="w-full text-xs border border-slate-300 text-left">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold text-center border-b border-slate-300">
                        <th className="p-2 border-r border-slate-300 w-10">STT<br /><span className="font-normal text-[10px]">(1)</span></th>
                        <th className="p-2 border-r border-slate-300">Tiêu chí đánh giá<br /><span className="font-normal text-[10px]">(2)</span></th>
                        <th className="p-2 border-r border-slate-300 w-20">Trọng số (%)<br /><span className="font-normal text-[10px]">(3)</span></th>
                        <th className="p-2 border-r border-slate-300 w-20">Mục tiêu<br /><span className="font-normal text-[10px]">(4)</span></th>
                        <th className="p-2 border-r border-slate-300 w-28">Kết quả hoàn thành (%)<br /><span className="font-normal text-[10px]">(5)</span></th>
                        <th className="p-2 border-r border-slate-300 w-28">Điểm quy đổi (%)<br /><span className="font-normal text-[10px]">(6 = 3 × 5)</span></th>
                        <th className="p-2 w-36">Ghi chú<br /><span className="font-normal text-[10px]">(7)</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Row I */}
                      <tr className="border-b border-slate-300 bg-slate-50/60">
                        <td className="p-2.5 font-bold text-center border-r border-slate-300">I</td>
                        <td className="p-2.5 font-bold border-r border-slate-300" colSpan="6">KPI ĐỊNH TÍNH</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 text-center border-r border-slate-300">1</td>
                        <td className="p-2.5 border-r border-slate-300">
                          <p className="font-bold text-slate-800">Tinh thần thái độ công tác và chấp hành nội quy</p>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            - Giờ giấc chấm công, tuân thủ an toàn (BHLĐ, LOTO, PCCC).<br />
                            - Ý thức 5S, bảo quản trang thiết bị, tủ công cụ.<br />
                            - Tinh thần trách nhiệm, sẵn sàng nhận điều động khẩn cấp.<br />
                            - Quy định đánh giá: 0 lỗi đạt 100% (20đ); phát sinh từ 1 lỗi trở lên trong tháng tính 0% (mất 20% điểm).
                          </p>
                        </td>
                        <td className="p-2.5 text-center font-bold border-r border-slate-300">20%</td>
                        <td className="p-2.5 text-center border-r border-slate-300">100%</td>
                        <td className={`p-2.5 text-center font-bold border-r border-slate-300 ${singleSelectedRow.monthlyResult.errors >= 1 ? 'text-rose-600' : 'text-blue-700'}`}>
                          {singleSelectedRow.monthlyResult.scoreI}%
                        </td>
                        <td className={`p-2.5 text-center font-bold border-r border-slate-300 ${singleSelectedRow.monthlyResult.errors >= 1 ? 'text-rose-600' : ''}`}>
                          {(singleSelectedRow.monthlyResult.weightedI * 100).toFixed(1)}%
                        </td>
                        <td className="p-2 text-[11px] text-slate-600">
                          {singleSelectedRow.monthlyResult.errors >= 1
                            ? `Vi phạm ${singleSelectedRow.monthlyResult.errors} lỗi (Mất 20% điểm)`
                            : 'Không vi phạm lỗi (Đạt tối đa 20%)'}
                        </td>
                      </tr>

                      {/* Row II */}
                      <tr className="border-b border-slate-300 bg-slate-50/60">
                        <td className="p-2.5 font-bold text-center border-r border-slate-300">II</td>
                        <td className="p-2.5 font-bold border-r border-slate-300" colSpan="6">KPI ĐỊNH LƯỢNG (KẾT QUẢ CÔNG VIỆC KỸ THUẬT)</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 text-center border-r border-slate-300">1</td>
                        <td className="p-2.5 border-r border-slate-300">
                          <p className="font-bold text-slate-800">Tỷ lệ thực hiện và hoàn thành đúng hạn công tác bảo trì định kỳ (PM)</p>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            Đo lường mức độ hoàn thành phiếu kiểm tra định kỳ (Master PM).<br />
                            <span className="text-blue-600 font-mono text-[10px]">
                              (Tổng tháng: {singleSelectedRow.monthlyResult.pmDone} đạt / [{singleSelectedRow.monthlyResult.pmPlan} kế hoạch - {singleSelectedRow.monthlyResult.pmPostponed} hoãn] = {(singleSelectedRow.monthlyResult.t1 * 100).toFixed(1)}%)
                            </span>
                          </p>
                        </td>
                        <td className="p-2.5 text-center font-bold border-r border-slate-300">50%</td>
                        <td className="p-2.5 text-center font-semibold border-r border-slate-300">&gt; 95%</td>
                        <td className="p-2.5 text-center font-bold border-r border-slate-300 text-blue-700">
                          {(singleSelectedRow.monthlyResult.scorePM * 100).toFixed(1)}%
                        </td>
                        <td className="p-2.5 text-center font-bold border-r border-slate-300">
                          {(singleSelectedRow.monthlyResult.weightedPM * 100).toFixed(1)}%
                        </td>
                        <td className="p-2 text-[11px] text-slate-500">Nghiệm thu theo Phiếu bảo trì</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 text-center border-r border-slate-300">2</td>
                        <td className="p-2.5 border-r border-slate-300">
                          <p className="font-bold text-slate-800">Phản hồi và khắc phục sự cố kỹ thuật đột xuất kịp thời (CM)</p>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            Có mặt &le; 10 phút &amp; sửa hoàn thành đúng định mức SLA.<br />
                            <span className="text-blue-600 font-mono text-[10px]">
                              {singleSelectedRow.monthlyResult.cmTotal > 0
                                ? `(Tổng tháng: ${singleSelectedRow.monthlyResult.cmDone} đạt / ${singleSelectedRow.monthlyResult.cmTotal} ca = ${(singleSelectedRow.monthlyResult.t2 * 100).toFixed(1)}%)`
                                : '(Tổng tháng: Chuyền chạy ổn định, không có ca hư hỏng phát sinh = 100%)'}
                            </span>
                          </p>
                        </td>
                        <td className="p-2.5 text-center font-bold border-r border-slate-300">20%</td>
                        <td className="p-2.5 text-center font-semibold border-r border-slate-300">90%</td>
                        <td className="p-2.5 text-center font-bold border-r border-slate-300 text-blue-700">
                          {(singleSelectedRow.monthlyResult.scoreCM * 100).toFixed(1)}%
                        </td>
                        <td className="p-2.5 text-center font-bold border-r border-slate-300">
                          {(singleSelectedRow.monthlyResult.weightedCM * 100).toFixed(1)}%
                        </td>
                        <td className="p-2 text-[11px] text-slate-500">Phiếu sửa chữa đột xuất</td>
                      </tr>

                      {/* Row II.3: Khấu trừ thiếu báo cáo ngày trong Mục II (II.1 + II.2) */}
                      <tr className="border-b border-slate-300 bg-rose-50/40">
                        <td className="p-2.5 text-center border-r border-slate-300">3</td>
                        <td className="p-2.5 border-r border-slate-300">
                          <p className="font-bold text-slate-800">Khấu trừ lỗi không nhập báo cáo ngày (Áp dụng trên tổng 80% của Mục II.1 &amp; II.2)</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Thiếu <b>{singleSelectedRow.monthlyResult.missingDays}</b> / {singleSelectedRow.monthlyResult.requiredReportDays} ngày làm việc (đã trừ Chủ nhật &amp; ngày nghỉ phép).
                          </p>
                        </td>
                        <td className="p-2.5 text-center font-bold border-r border-slate-300">-</td>
                        <td className="p-2.5 text-center border-r border-slate-300">0 ngày thiếu</td>
                        <td className={`p-2.5 text-center font-bold border-r border-slate-300 ${singleSelectedRow.monthlyResult.missingDays > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {(singleSelectedRow.monthlyResult.reportComplianceRate * 100).toFixed(1)}%
                        </td>
                        <td className={`p-2.5 text-center font-bold border-r border-slate-300 ${singleSelectedRow.monthlyResult.missingDayDeduction > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                          {singleSelectedRow.monthlyResult.missingDayDeduction > 0 ? `-${(singleSelectedRow.monthlyResult.missingDayDeduction * 100).toFixed(1)}%` : '0.0%'}
                        </td>
                        <td className="p-2 text-[11px] text-slate-500">Trừ trong tổng điểm Mục II</td>
                      </tr>

                      {/* TOTAL ROW */}
                      <tr className="bg-slate-50 font-bold border-b border-slate-400">
                        <td className="p-3 text-center border-r border-slate-300" colSpan="2">CỘNG TỔNG ĐIỂM ĐÁNH GIÁ THÁNG</td>
                        <td className="p-3 text-center border-r border-slate-300">100%</td>
                        <td className="p-3 text-center border-r border-slate-300">-</td>
                        <td className="p-3 text-center border-r border-slate-300">-</td>
                        <td className="p-3 text-center text-sm font-black text-blue-900 border-r border-slate-300 bg-blue-50">
                          {(singleSelectedRow.monthlyResult.totalScore * 100).toFixed(1)}%
                        </td>
                        <td className="p-3 text-center text-[11px] text-slate-700 font-bold">
                          {singleSelectedRow.monthlyResult.rank} ({singleSelectedRow.monthlyResult.salaryPct})
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* WEEKLY BREAKDOWN SUB-TABLE ON PRINT SHEET */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-slate-800 uppercase mb-1.5">
                    <span>C. BẢNG THEO DÕI CHI TIẾT THEO TUẦN (CĂN CỨ TỔNG HỢP THÁNG):</span>
                  </h4>
                  <table className="w-full text-[11px] border border-slate-300 text-center">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-300">
                        <th className="p-1.5 border-r border-slate-300">Thời gian</th>
                        <th className="p-1.5 border-r border-slate-300">Số Lỗi (Mục I)</th>
                        <th className="p-1.5 border-r border-slate-300">Điểm Mục I</th>
                        <th className="p-1.5 border-r border-slate-300">PM: Đạt / (KH - Hoãn)</th>
                        <th className="p-1.5 border-r border-slate-300">Thiếu / Phép</th>
                        <th className="p-1.5 border-r border-slate-300">% Đạt PM</th>
                        <th className="p-1.5 border-r border-slate-300">CM: Đạt / Tổng ca</th>
                        <th className="p-1.5 border-r border-slate-300">% Kịp CM</th>
                        <th className="p-1.5 bg-slate-200/60">Điểm KPI Tuần</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {singleSelectedRow.weeks.map((w, wIdx) => {
                        const wRes = computeMetricsKPI(w);
                        const effPM = Math.max(0, (w.pmPlan || 0) - (w.pmPostponed || 0));
                        const wMeta = cycleInfo.weeks[wIdx];
                        return (
                          <tr key={wIdx}>
                            <td className="p-1.5 border-r border-slate-300 font-semibold">
                              Tuần {wIdx + 1} {wMeta ? <span className="text-[10px] text-slate-500 font-normal">({wMeta.shortRange})</span> : ''}
                            </td>
                            <td className={`p-1.5 border-r border-slate-300 ${w.errors >= 1 ? 'text-rose-600 font-bold' : ''}`}>{w.errors} lỗi</td>
                            <td className="p-1.5 border-r border-slate-300 font-semibold">{wRes.scoreI}%</td>
                            <td className="p-1.5 border-r border-slate-300">
                              {w.pmDone} / {effPM} <span className="text-[10px] text-slate-500">({w.pmPlan}-{w.pmPostponed})</span>
                            </td>
                            <td className="p-1.5 border-r border-slate-300 text-[10px]">
                              <span className={w.missingDays > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>{w.missingDays || 0} thiếu</span> / <span className="text-teal-700 font-semibold">{w.leaveDays || 0} phép</span>
                            </td>
                            <td className="p-1.5 border-r border-slate-300 font-semibold">{(wRes.t1 * 100).toFixed(1)}%</td>
                            <td className="p-1.5 border-r border-slate-300">
                              {w.cmTotal > 0 ? `${w.cmDone} / ${w.cmTotal}` : 'Không có sự cố'}
                            </td>
                            <td className="p-1.5 border-r border-slate-300 font-semibold">{(wRes.t2 * 100).toFixed(1)}%</td>
                            <td className="p-1.5 font-bold bg-slate-50">{(wRes.totalScore * 100).toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* SUMMARY & REMARKS */}
                <div className="mb-8 border border-slate-300 p-3 rounded text-xs">
                  <p className="font-bold text-slate-800 mb-1">Ý KIẾN / NHẬN XÉT CỦA QUẢN LÝ TRỰC TIẾP:</p>
                  {isAdmin ? (
                    <>
                      <textarea
                        rows="2"
                        placeholder="Nhập nhận xét của quản lý trực tiếp..."
                        value={singleSelectedRow.managerNote}
                        onChange={(e) => handleUpdateManagerNote(singleSelectedRow.emp.username, e.target.value)}
                        className="w-full text-slate-700 italic leading-relaxed bg-slate-50 border border-dashed border-slate-300 rounded p-2 outline-none focus:bg-white focus:border-blue-400 resize-none no-print"
                      />
                      <p className="hidden print:block text-slate-700 italic leading-relaxed">
                        {singleSelectedRow.managerNote || 'Tuân thủ tốt quy trình bảo dưỡng phòng ngừa, chủ động phối hợp xử lý kịp thời các sự cố phát sinh tại dây chuyền sản xuất.'}
                      </p>
                    </>
                  ) : (
                    <p className="text-slate-600 italic leading-relaxed">
                      {singleSelectedRow.managerNote || 'Tuân thủ tốt quy trình bảo dưỡng phòng ngừa, chủ động phối hợp xử lý kịp thời các sự cố phát sinh tại dây chuyền sản xuất.'}
                    </p>
                  )}
                </div>

                {/* SIGNATURE SECTION */}
                <div className="pt-2">
                  <div className="grid grid-cols-3 text-center text-xs">
                    <div>
                      <p className="font-bold uppercase text-slate-900">Nhân viên đánh giá</p>
                      <p className="italic text-[11px] text-slate-500 mb-16">(Ký, ghi rõ họ tên)</p>
                      <p className="font-bold text-slate-800">{singleSelectedRow.emp.name}</p>
                      <p className="text-[11px] text-slate-400 mt-1">Ngày: ..... / ..... / {reportYear}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase text-slate-900">Quản lý trực tiếp</p>
                      <p className="italic text-[11px] text-slate-500 mb-16">(Ký, ghi rõ họ tên)</p>
                      <p className="font-bold text-slate-800">Tổ trưởng / Trưởng ca</p>
                      <p className="text-[11px] text-slate-400 mt-1">Ngày: ..... / ..... / {reportYear}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase text-slate-900">Ban Lãnh Đạo Phê Duyệt</p>
                      <p className="italic text-[11px] text-slate-500 mb-16">(Ký, phê duyệt)</p>
                      <p className="font-bold text-slate-800">Trưởng phòng QLTB</p>
                      <p className="text-[11px] text-slate-400 mt-1">Ngày: ..... / ..... / {reportYear}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 3: HƯỚNG DẪN CÔNG THỨC EXCEL                                      */}
          {/* ===================================================================== */}
          {activeTab === 'formula' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 animate-fade-in">
              <div>
                <h3 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> HƯỚNG DẪN THIẾT LẬP CÔNG THỨC TRÊN EXCEL / GOOGLE SHEETS
                </h3>
                <p className="text-xs md:text-sm text-slate-600 mt-1">
                  Bộ công thức chuẩn hóa áp dụng cho bảng đánh giá KPI Bảo trì (20% Kỷ luật &amp; 5S • 50% Bảo dưỡng PM • 30% Sự cố đột xuất CM):
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* KPI 1 */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black">1</span>
                    Tiêu chí I: Kỷ luật &amp; 5S (20% - Bị ≥1 lỗi mất 20%)
                  </h4>
                  <p className="text-xs text-slate-600">Giả sử ô <code>C5</code> là Số lỗi vi phạm trong tháng:</p>
                  <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-xs flex justify-between items-center gap-2">
                    <code className="overflow-x-auto">=IF(C5&gt;=1, 0, 100)</code>
                    <button onClick={() => copyFormulaText('=IF(C5>=1, 0, 100)')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] shrink-0">Copy</button>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">Nếu bị từ 1 lỗi trở lên trong tháng sẽ tính 0% (mất toàn bộ 20% điểm KPI Mục I).</p>
                </div>

                {/* KPI 2.1 */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black">2</span>
                    Tiêu chí II.1: Bảo dưỡng định kỳ PM (50%)
                  </h4>
                  <p className="text-xs text-slate-600">Ô <code>F5</code> là Kế hoạch (B), <code>G5</code> là Hoãn (C), <code>I5</code> là Đạt (A):</p>
                  <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-xs flex justify-between items-center gap-2">
                    <code className="overflow-x-auto">=IF((F5 - G5) &gt; 0, I5 / (F5 - G5), 1)</code>
                    <button onClick={() => copyFormulaText('=IF((F5 - G5) > 0, I5 / (F5 - G5), 1)')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] shrink-0">Copy</button>
                  </div>
                  <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-xs flex justify-between items-center gap-2">
                    <code className="overflow-x-auto">=IF(T1 &gt;= 0.95, 1, T1 / 0.95)</code>
                    <button onClick={() => copyFormulaText('=IF(T1 >= 0.95, 1, T1 / 0.95)')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] shrink-0">Copy</button>
                  </div>
                </div>

                {/* KPI 2.2 */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">3</span>
                    Tiêu chí II.2: Sự cố đột xuất CM (30%)
                  </h4>
                  <p className="text-xs text-slate-600">Ô <code>J5</code> là Tổng sự cố (ΣK), <code>K5</code> là Số ca đạt SLA (K):</p>
                  <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-xs flex justify-between items-center gap-2">
                    <code className="overflow-x-auto">=IF(J5 &gt; 0, K5 / J5, 1)</code>
                    <button onClick={() => copyFormulaText('=IF(J5 > 0, K5 / J5, 1)')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] shrink-0">Copy</button>
                  </div>
                  <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-xs flex justify-between items-center gap-2">
                    <code className="overflow-x-auto">=IF(T2 &gt;= 0.9, 1, T2 / 0.9)</code>
                    <button onClick={() => copyFormulaText('=IF(T2 >= 0.9, 1, T2 / 0.9)')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] shrink-0">Copy</button>
                  </div>
                </div>

                {/* TOTAL & RANK */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-black">4</span>
                    Khấu trừ thiếu báo cáo ngày trong Mục II (80%) &amp; Tổng điểm KPI
                  </h4>
                  <p className="text-xs text-slate-600">Tỷ lệ chuyên cần báo cáo ngày <code>TyLe_BC = (NgayCong - ThieuNgay) / NgayCong</code>:</p>
                  <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-xs flex justify-between items-center gap-2">
                    <code className="overflow-x-auto">=(KQ_I * 20%) + ((KQ_PM * 50% + KQ_CM * 30%) * TyLe_BC)</code>
                    <button onClick={() => copyFormulaText('=(KQ_I * 20%) + ((KQ_PM * 50% + KQ_CM * 30%) * TyLe_BC)')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] shrink-0">Copy</button>
                  </div>
                  <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-xs flex justify-between items-center gap-2">
                    <code className="overflow-x-auto">=IF(Total&gt;=0.95,"Loại A",IF(Total&gt;=0.85,"Loại B",IF(Total&gt;=0.7,"Loại C","Loại D")))</code>
                    <button onClick={() => copyFormulaText('=IF(Total>=0.95,"Loại A",IF(Total>=0.85,"Loại B",IF(Total>=0.7,"Loại C","Loại D")))')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] shrink-0">Copy</button>
                  </div>
                </div>

                {/* TOTAL & RANK */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-black">4</span>
                    Khấu trừ thiếu báo cáo ngày trong Mục II &amp; Tổng điểm KPI
                  </h4>
                  <p className="text-xs text-slate-600">Tỷ lệ chuyên cần báo cáo ngày <code>TyLe_BC = (NgayCong - ThieuNgay) / NgayCong</code>:</p>
                  <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-xs flex justify-between items-center gap-2">
                    <code className="overflow-x-auto">=(KQ_I * 20%) + ((KQ_PM * 50% + KQ_CM * 20%) * TyLe_BC)</code>
                    <button onClick={() => copyFormulaText('=(KQ_I * 20%) + ((KQ_PM * 50% + KQ_CM * 20%) * TyLe_BC)')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] shrink-0">Copy</button>
                  </div>
                  <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl font-mono text-xs flex justify-between items-center gap-2">
                    <code className="overflow-x-auto">=IF((Total/0.9)&gt;=0.95,"Loại A",IF((Total/0.9)&gt;=0.85,"Loại B",IF((Total/0.9)&gt;=0.7,"Loại C","Loại D")))</code>
                    <button onClick={() => copyFormulaText('=IF((Total/0.9)>=0.95,"Loại A",IF((Total/0.9)>=0.85,"Loại B",IF((Total/0.9)>=0.7,"Loại C","Loại D")))')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] shrink-0">Copy</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* WEEKLY DETAIL MODAL (QUICK VIEW & EDIT 4 WEEKS) */}
      {modalEmpRow && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 no-print animate-fade-in" onClick={() => setWeeklyModalEmpUsername(null)}>
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 md:p-5 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-sm md:text-base uppercase">
                  Chi tiết KPI 4 Tuần: {modalEmpRow.emp.name} ({modalEmpRow.emp.employeeId || modalEmpRow.emp.id})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isAdmin ? 'Chỉnh sửa trực tiếp từng tuần, số liệu tháng sẽ tự động cập nhật' : 'Bảng theo dõi chi tiết 4 tuần trong tháng'}
                </p>
              </div>
              <button onClick={() => setWeeklyModalEmpUsername(null)} className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs border-collapse border border-slate-200 text-center">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-300">
                    <th className="p-2 border-r border-slate-200">Tuần</th>
                    <th className="p-2 border-r border-slate-200 text-rose-600">Số Lỗi</th>
                    <th className="p-2 border-r border-slate-200 bg-amber-50">% Mục I</th>
                    <th className="p-2 border-r border-slate-200">KH PM (B)</th>
                    <th className="p-2 border-r border-slate-200">Hoãn (C)</th>
                    <th className="p-2 border-r border-slate-200">Đạt PM (A)</th>
                    <th className="p-2 border-r border-slate-200 bg-blue-50">% PM</th>
                    <th className="p-2 border-r border-slate-200">Sự cố (ΣK)</th>
                    <th className="p-2 border-r border-slate-200">Đạt CM (K)</th>
                    <th className="p-2 border-r border-slate-200 bg-emerald-50">% CM</th>
                    <th className="p-2 bg-purple-50 font-bold">Tổng Tuần</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {modalEmpRow.weeks.map((w, wIdx) => {
                    const wRes = computeMetricsKPI(w);
                    const wMeta = cycleInfo.weeks[wIdx];
                    return (
                      <tr key={wIdx}>
                        <td className="p-2 border-r border-slate-200 font-bold bg-slate-50 whitespace-nowrap">
                          Tuần {wIdx + 1} {wMeta && <span className="block text-[10px] font-normal text-slate-500">{wMeta.shortRange}</span>}
                        </td>
                        <td className="p-1 border-r border-slate-200"><input disabled={!isAdmin} type="number" min="0" max="100" value={w.errors} onChange={(e) => handleUpdateEmpWeek(modalEmpRow.emp, wIdx, 'errors', e.target.value)} className={`w-14 text-center font-bold border border-slate-200 rounded py-1 disabled:bg-slate-100 ${w.errors >= 1 ? 'text-rose-600' : 'text-slate-700'}`} /></td>
                        <td className={`p-2 border-r border-slate-200 font-bold ${w.errors >= 1 ? 'bg-rose-100/70 text-rose-700' : 'bg-amber-50/70 text-amber-900'}`}>{wRes.scoreI}%</td>
                        <td className="p-1 border-r border-slate-200"><input disabled={!isAdmin} type="number" min="0" value={w.pmPlan} onChange={(e) => handleUpdateEmpWeek(modalEmpRow.emp, wIdx, 'pmPlan', e.target.value)} className="w-14 text-center border border-slate-200 rounded py-1 disabled:bg-slate-100" /></td>
                        <td className="p-1 border-r border-slate-200"><input disabled={!isAdmin} type="number" min="0" value={w.pmPostponed} onChange={(e) => handleUpdateEmpWeek(modalEmpRow.emp, wIdx, 'pmPostponed', e.target.value)} className="w-14 text-center border border-slate-200 rounded py-1 disabled:bg-slate-100" /></td>
                        <td className="p-1 border-r border-slate-200"><input disabled={!isAdmin} type="number" min="0" value={w.pmDone} onChange={(e) => handleUpdateEmpWeek(modalEmpRow.emp, wIdx, 'pmDone', e.target.value)} className="w-14 text-center font-bold text-blue-700 border border-slate-200 rounded py-1 disabled:bg-slate-100" /></td>
                        <td className="p-2 border-r border-slate-200 font-bold bg-blue-50/70 text-blue-900">{(wRes.t1 * 100).toFixed(1)}%</td>
                        <td className="p-1 border-r border-slate-200"><input disabled={!isAdmin} type="number" min="0" value={w.cmTotal} onChange={(e) => handleUpdateEmpWeek(modalEmpRow.emp, wIdx, 'cmTotal', e.target.value)} className="w-14 text-center border border-slate-200 rounded py-1 disabled:bg-slate-100" /></td>
                        <td className="p-1 border-r border-slate-200"><input disabled={!isAdmin} type="number" min="0" value={w.cmDone} onChange={(e) => handleUpdateEmpWeek(modalEmpRow.emp, wIdx, 'cmDone', e.target.value)} className="w-14 text-center font-bold text-emerald-700 border border-slate-200 rounded py-1 disabled:bg-slate-100" /></td>
                        <td className="p-2 border-r border-slate-200 font-bold bg-emerald-50/70 text-emerald-900">{(wRes.t2 * 100).toFixed(1)}%</td>
                        <td className="p-2 font-black bg-purple-50 text-purple-900">{(wRes.totalScore * 100).toFixed(1)}%</td>
                      </tr>
                    );
                  })}

                  {/* TOTAL MONTHLY ROW */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <td className="p-2 border-r border-slate-200 text-purple-900">TỔNG THÁNG</td>
                    <td className={`p-2 border-r border-slate-200 ${modalEmpRow.monthlyResult.errors >= 1 ? 'text-rose-600' : 'text-slate-700'}`}>{modalEmpRow.monthlyResult.errors} lỗi</td>
                    <td className={`p-2 border-r border-slate-200 ${modalEmpRow.monthlyResult.errors >= 1 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-950'}`}>{modalEmpRow.monthlyResult.scoreI}%</td>
                    <td className="p-2 border-r border-slate-200">{modalEmpRow.monthlyResult.pmPlan}</td>
                    <td className="p-2 border-r border-slate-200">{modalEmpRow.monthlyResult.pmPostponed}</td>
                    <td className="p-2 border-r border-slate-200 text-blue-700">{modalEmpRow.monthlyResult.pmDone}</td>
                    <td className="p-2 border-r border-slate-200 bg-blue-100 text-blue-950">{(modalEmpRow.monthlyResult.t1 * 100).toFixed(1)}%</td>
                    <td className="p-2 border-r border-slate-200">{modalEmpRow.monthlyResult.cmTotal}</td>
                    <td className="p-2 border-r border-slate-200 text-emerald-700">{modalEmpRow.monthlyResult.cmDone}</td>
                    <td className="p-2 border-r border-slate-200 bg-emerald-100 text-emerald-950">{(modalEmpRow.monthlyResult.t2 * 100).toFixed(1)}%</td>
                    <td className="p-2 font-black bg-purple-200 text-purple-950">{(modalEmpRow.monthlyResult.totalScore * 100).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setWeeklyModalEmpUsername(null)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-sm">
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT NGÀY THIẾU BÁO CÁO & DUYỆT NGHỈ PHÉP */}
      {attendanceModalEmpRow && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[205] flex items-center justify-center p-4 no-print animate-fade-in" onClick={() => setAttendanceModalEmpUsername(null)}>
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[88vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 md:p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-sm md:text-base uppercase flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-amber-400" />
                  Ngày Thiếu Báo Cáo &amp; Nghỉ Phép: {attendanceModalEmpRow.emp.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kỳ {cycleInfo.monthLabel} ({cycleInfo.rangeText}) • Tự động loại trừ ngày Chủ nhật
                </p>
              </div>
              <button onClick={() => setAttendanceModalEmpUsername(null)} className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5">
                  <p className="text-xs font-bold text-rose-700 uppercase">Ngày thiếu báo cáo (Trừ KPI)</p>
                  <p className="text-2xl font-black text-rose-800 mt-1">{attendanceModalEmpRow.attendance.missingDates.length} <span className="text-xs font-semibold">ngày</span></p>
                  <p className="text-[11px] text-rose-600 mt-0.5">Mỗi ngày bị đánh giá Không hoàn thành</p>
                </div>
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3.5">
                  <p className="text-xs font-bold text-teal-700 uppercase">Ngày nghỉ phép (Không trừ)</p>
                  <p className="text-2xl font-black text-teal-800 mt-1">{attendanceModalEmpRow.attendance.leaveDates.length} <span className="text-xs font-semibold">ngày</span></p>
                  <p className="text-[11px] text-teal-600 mt-0.5">Được miễn trừ đánh giá KPI ngày</p>
                </div>
              </div>

              {isAdmin && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700">Thêm nhanh ngày nghỉ phép trong kỳ:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      min={cycleInfo.startDate}
                      max={cycleInfo.endDate}
                      value={newLeaveDateInput}
                      onChange={(e) => setNewLeaveDateInput(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      onClick={() => {
                        if (!newLeaveDateInput) {
                          showNotification('Vui lòng chọn ngày nghỉ phép!', 'error');
                          return;
                        }
                        const [ly, lm, ld] = newLeaveDateInput.split('-').map(Number);
                        if (new Date(ly, lm - 1, ld).getDay() === 0) {
                          showNotification('Ngày Chủ nhật mặc định đã được miễn trừ!', 'error');
                          return;
                        }
                        handleToggleLeaveDate(attendanceModalEmpRow.emp.username, newLeaveDateInput);
                        setNewLeaveDateInput('');
                      }}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      + Duyệt phép
                    </button>
                  </div>
                </div>
              )}

              {/* DANH SÁCH NGÀY NHẬP THIẾU */}
              <div>
                <h4 className="text-xs font-black uppercase text-rose-700 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Danh sách ngày nhập thiếu ({attendanceModalEmpRow.attendance.missingDates.length})
                </h4>
                {attendanceModalEmpRow.attendance.missingDates.length === 0 ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-700 text-center">
                    Nhân viên đã nhập đầy đủ báo cáo cho tất cả các ngày làm việc!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attendanceModalEmpRow.attendance.missingDates.map((dIso) => (
                      <div key={dIso} className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-black text-slate-800 text-xs md:text-sm">{getVietnameseDayName(dIso)}, {formatDateVi(dIso)}</span>
                          <span className="ml-2 text-[11px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200">
                            Không hoàn thành (Trừ % KPI)
                          </span>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleToggleLeaveDate(attendanceModalEmpRow.emp.username, dIso)}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                          >
                            Duyệt Nghỉ phép (Không trừ)
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DANH SÁCH NGÀY NGHỈ PHÉP */}
              {attendanceModalEmpRow.attendance.leaveDates.length > 0 && (
                <div>
                  <h4 className="text-xs font-black uppercase text-teal-700 mb-2 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Danh sách ngày Nghỉ phép ({attendanceModalEmpRow.attendance.leaveDates.length})
                  </h4>
                  <div className="space-y-2">
                    {attendanceModalEmpRow.attendance.leaveDates.map((lObj) => (
                      <div key={lObj.date} className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-black text-slate-800 text-xs md:text-sm">{getVietnameseDayName(lObj.date)}, {formatDateVi(lObj.date)}</span>
                          <span className="ml-2 text-[11px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md border border-teal-200">
                            Nghỉ phép • Không trừ KPI ({lObj.source === 'task' ? 'Từ Sổ CV' : 'Admin duyệt'})
                          </span>
                        </div>
                        {isAdmin && lObj.source === 'admin' && (
                          <button
                            onClick={() => handleToggleLeaveDate(attendanceModalEmpRow.emp.username, lObj.date)}
                            className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold transition"
                          >
                            Hủy nghỉ phép
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button onClick={() => setAttendanceModalEmpUsername(null)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-sm">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CÀI ĐẶT THÁNG NHANH */}
      {isMonthConfigOpen && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[210] flex items-center justify-center p-4 no-print animate-fade-in" onClick={() => setIsMonthConfigOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="bg-purple-100 text-purple-600 p-2.5 rounded-xl"><CalendarClock className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-black text-slate-800 text-base md:text-lg">Cài Đặt Kỳ Tổng Hợp Tháng</h3>
                  <p className="text-xs text-slate-500">Thiết lập ngày chốt chu kỳ báo cáo tháng</p>
                </div>
              </div>
              <button onClick={() => setIsMonthConfigOpen(false)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5">Ngày bắt đầu chu kỳ tháng (1 - 28)</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={tempStartDay}
                  onChange={(e) => setTempStartDay(parseInt(e.target.value, 10) || 1)}
                  className="w-full p-3 border border-slate-300 rounded-xl text-base font-black text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none bg-slate-50"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {Number(tempStartDay) === 1
                    ? 'Tính từ ngày 01 đến ngày cuối tháng.'
                    : `Tính từ ngày ${tempStartDay} tháng trước đến ngày ${Number(tempStartDay) - 1} tháng này.`}
                </p>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5">Tháng báo cáo mặc định khi mở ứng dụng</label>
                <select
                  value={tempAutoDetect ? 'auto' : 'fixed'}
                  onChange={(e) => setTempAutoDetect(e.target.value === 'auto')}
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none bg-slate-50"
                >
                  <option value="auto">Tự động nhận diện theo ngày hiện tại</option>
                  <option value="fixed">Đặt cố định tháng đang chọn ({selectedMonth.split('-').reverse().join('/')})</option>
                </select>
              </div>

              {(() => {
                const preview = getMonthCycleRange(selectedMonth, tempStartDay);
                return (
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 space-y-2">
                    <p className="text-xs font-bold text-purple-900">
                      Áp dụng cho {preview.monthLabel}: <span className="font-black text-purple-700">{preview.rangeText}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {preview.weeks.map(w => (
                        <div key={w.index} className="bg-white px-2.5 py-1.5 rounded-lg border border-purple-100 text-[11px] flex justify-between">
                          <span className="font-bold text-slate-700">{w.label}:</span>
                          <span className="font-mono text-purple-700 font-semibold">{w.shortRange}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button onClick={() => setIsMonthConfigOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs md:text-sm font-bold">
                Hủy
              </button>
              <button onClick={handleSaveQuickMonthConfig} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-md flex items-center gap-1.5">
                <Save className="w-4 h-4" /> Lưu Cài Đặt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function MainApp() {
  const initialUser = safeGetStorage('techmaintain_active_session', null);
  const validInitialUser = initialUser && typeof initialUser === 'object' && initialUser.username ? initialUser : null;

  const [user, setUser] = useState(validInitialUser); 
  const [view, setViewInternal] = useState(validInitialUser ? (validInitialUser.role === 'admin' ? 'dashboard' : 'home') : 'login'); 
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [notification, setNotification] = useState(null);
  
  const [zoomedImage, setZoomedImage] = useState(null);
  const [utilityEditItem, setUtilityEditItem] = useState(null);
  const [utilityMode, setUtilityMode] = useState('elec'); 
  const [editLogData, setEditLogData] = useState(null);
  const [editTaskData, setEditTaskData] = useState(null);
  const [machineFilter, setMachineFilter] = useState('all'); 
  const [taskFilter, setTaskFilter] = useState('all'); 
  const [initialTaskData, setInitialTaskData] = useState(null); 
  const [logDeleteModal, setLogDeleteModal] = useState({ isOpen: false, id: null });

  const [usersList, setUsersList] = useState(() => {
    const saved = safeGetStorage('techmaintain_users', INITIAL_USERS);
    return Array.isArray(saved) && saved.length > 0 ? saved : INITIAL_USERS;
  });
  const [dailyTasks, setDailyTasks] = useState(() => {
    const saved = safeGetStorage('techmaintain_daily', []);
    return Array.isArray(saved) ? saved : [];
  });
  const [machines, setMachines] = useState(() => {
    const saved = safeGetStorage('techmaintain_machines', INITIAL_MACHINES);
    return Array.isArray(saved) && saved.length > 0 ? saved : INITIAL_MACHINES;
  });
  const [logs, setLogs] = useState(() => {
    const saved = safeGetStorage('techmaintain_logs', []);
    return Array.isArray(saved) ? saved : [];
  });
  const [inventory, setInventory] = useState(() => {
    const saved = safeGetStorage('techmaintain_inventory', INITIAL_INVENTORY);
    return Array.isArray(saved) && saved.length > 0 ? saved : INITIAL_INVENTORY;
  });
  const [utilityLogs, setUtilityLogs] = useState(() => {
    const saved = safeGetStorage('techmaintain_utility', []);
    return Array.isArray(saved) ? saved : [];
  });
  const [googleSheetUrl, setGoogleSheetUrl] = useState(() => {
    if (typeof window === 'undefined') return '';
    try { return window.localStorage.getItem('gs_url') || ''; } catch (e) { return ''; }
  });
  
  const [sysSettings, setSysSettings] = useState(() => {
    const saved = safeGetStorage('techmaintain_sysSettings', {
      error_times: { level1: 1.5, level2: 4, level3: 24 },
      month_config: { startDay: 16, autoDetectMonth: true, defaultMonth: '' }
    });
    return saved && typeof saved === 'object'
      ? {
          error_times: { level1: 1.5, level2: 4, level3: 24 },
          month_config: { startDay: 16, autoDetectMonth: true, defaultMonth: '' },
          ...saved
        }
      : {
          error_times: { level1: 1.5, level2: 4, level3: 24 },
          month_config: { startDay: 16, autoDetectMonth: true, defaultMonth: '' }
        };
  });

  const [categoryList, setCategoryList] = useState(() => { 
    const saved = safeGetStorage('techmaintain_categories', INITIAL_CATEGORIES);
    return Array.isArray(saved) ? saved : INITIAL_CATEGORIES; 
  });

  const [fbUser, setFbUser] = useState(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(!!db);
  const [permissionError, setPermissionError] = useState(false);
  const deletedDailyTaskIdsRef = useRef(new Set());

  useEffect(() => {
    applyAppBrandingIcons(sysSettings?.app_icon || '');
  }, [sysSettings?.app_icon]);

  const setView = (newView, replace = false) => {
    if (newView === view) return;
    try {
      if (replace) window.history.replaceState({ view: newView }, '', '');
      else window.history.pushState({ view: newView }, '', '');
    } catch (e) {}
    setViewInternal(newView);
  };

  useEffect(() => {
    if (!validInitialUser) {
      try { window.history.replaceState({ view: 'login' }, '', ''); } catch (e) {}
    }
    const handlePopState = (event) => {
        if (event.state && event.state.view) {
            let nextView = event.state.view;
            if (user && nextView === 'login') {
              nextView = user.role === 'admin' ? 'dashboard' : 'home';
              try { window.history.replaceState({ view: nextView }, '', ''); } catch (e) {}
            }
            setViewInternal(nextView);
        }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, validInitialUser]);

  useEffect(() => {
    if (!auth) { setIsCloudSyncing(false); return; }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
           await signInWithCustomToken(auth, __initial_auth_token);
        } else {
           await signInAnonymously(auth);
        }
      } catch (error) {
        setIsCloudSyncing(false);
        setPermissionError(true);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser || !db || permissionError) return;
    let isUnmounted = false;
    const unsubs = [];

    const handleSnapError = (error) => { 
        if (isUnmounted) return;
        setIsCloudSyncing(false); 
        if (error.code === 'permission-denied' || (error.message && error.message.includes('permission'))) {
            setPermissionError(true);
            unsubs.forEach(u => { try { u(); } catch(e) {} });
        }
    };

    unsubs.push(onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'machines'), (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        setMachines(list);
        safeSetStorage('techmaintain_machines', list);
    }, handleSnapError));

    unsubs.push(onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'inventory'), (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        setInventory(list);
        safeSetStorage('techmaintain_inventory', list);
    }, handleSnapError));

    unsubs.push(onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => String(b.id).localeCompare(String(a.id)));
        setLogs(list);
        safeSetStorage('techmaintain_logs', list);
    }, handleSnapError));

    unsubs.push(onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
        if (snap.empty) {
            INITIAL_USERS.forEach(u => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id), u).catch(() => {}));
        } else {
            const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            setUsersList(list);
            safeSetStorage('techmaintain_users', list);
        }
    }, handleSnapError));

    unsubs.push(onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'daily_tasks'), (snap) => { 
        const cloudTasks = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        setDailyTasks(prev => {
            const merged = mergeCollectionsById(cloudTasks, prev, deletedDailyTaskIdsRef.current)
                .sort((a, b) => String(b.id).localeCompare(String(a.id)));
            safeSetStorage('techmaintain_daily', merged);
            return merged;
        });
    }, handleSnapError));

    unsubs.push(onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'utility_logs'), (snap) => { 
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => String(b.id).localeCompare(String(a.id)));
        setUtilityLogs(list); 
        safeSetStorage('techmaintain_utility', list);
    }, handleSnapError));

    unsubs.push(onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), (snap) => { 
        const sData = snap.docs.find(d => d.id === 'general'); 
        if (sData) {
            const data = sData.data();
            if (data.gs_url) setGoogleSheetUrl(data.gs_url); 
            if (data.sysSettings) setSysSettings(data.sysSettings);
        }
        setIsCloudSyncing(false); 
    }, handleSnapError));

    unsubs.push(onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'categories'), (docSnap) => {
        if (docSnap.exists()) {
            const list = docSnap.data().list || [];
            setCategoryList(list);
            safeSetStorage('techmaintain_categories', list);
        } else {
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'categories'), { list: INITIAL_CATEGORIES }).catch(() => {});
            setCategoryList(INITIAL_CATEGORIES);
        }
    }, handleSnapError));

    return () => {
        isUnmounted = true;
        unsubs.forEach(u => { try { u(); } catch(e) {} });
    };
  }, [fbUser, db, permissionError]);

  const canUseCloud = Boolean(db && fbUser && !permissionError);

  const syncDocToCloud = (collectionName, docId, dataObj, options) => {
      if (!canUseCloud) return;
      const cleanData = sanitizeForFirestore(dataObj);
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', collectionName, String(docId));
      const writePromise = options ? setDoc(docRef, cleanData, options) : setDoc(docRef, cleanData);
      writePromise.catch((e) => {
          console.warn(`Chuyển sang lưu cục bộ do lỗi ghi Cloud (${collectionName}):`, e);
          setPermissionError(true);
      });
  };

  const deleteDocFromCloud = (collectionName, docId) => {
      if (!canUseCloud) return;
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', collectionName, String(docId));
      deleteDoc(docRef).catch((e) => {
          console.warn(`Lỗi xóa trên Cloud (${collectionName}):`, e);
          setPermissionError(true);
      });
  };

  const saveUserData = async (uObj) => {
      setUsersList(prev => {
          const nList = prev.some(u => u.id === uObj.id) ? prev.map(u => u.id === uObj.id ? uObj : u) : [...prev, uObj];
          safeSetStorage('techmaintain_users', nList);
          return nList;
      });
      syncDocToCloud('users', uObj.id, uObj);
  };

  const handleDeleteUser = async (id) => {
      setUsersList(prev => {
          const nList = prev.filter(u => u.id !== id);
          safeSetStorage('techmaintain_users', nList);
          return nList;
      });
      deleteDocFromCloud('users', id);
  };

  const saveMachineData = async (newMachineObj) => {
      setMachines(prev => {
          const nList = prev.some(m => m.id === newMachineObj.id) ? prev.map(m => m.id === newMachineObj.id ? newMachineObj : m) : [...prev, newMachineObj];
          safeSetStorage('techmaintain_machines', nList);
          return nList;
      });
      syncDocToCloud('machines', newMachineObj.id, newMachineObj);
  }; 

  const handleDeleteMachineApp = async (id) => {
      setMachines(prev => {
          const nList = prev.filter(m => m.id !== id);
          safeSetStorage('techmaintain_machines', nList);
          return nList;
      });
      deleteDocFromCloud('machines', id);
  };

  const saveInventoryData = async (newInvObj) => {
      setInventory(prev => {
          const nList = prev.some(i => i.id === newInvObj.id) ? prev.map(i => i.id === newInvObj.id ? newInvObj : i) : [...prev, newInvObj];
          safeSetStorage('techmaintain_inventory', nList);
          return nList;
      });
      syncDocToCloud('inventory', newInvObj.id, newInvObj);
  };

  const saveLogData = async (logEntry) => {
      setLogs(prev => {
          const nList = prev.some(l => String(l.id) === String(logEntry.id))
              ? prev.map(l => String(l.id) === String(logEntry.id) ? logEntry : l)
              : [logEntry, ...prev];
          safeSetStorage('techmaintain_logs', nList);
          return nList;
      });
      syncDocToCloud('logs', String(logEntry.id), logEntry);
  };

  const handleDeleteLogApp = async (id) => {
      setLogs(prev => {
          const nList = prev.filter(l => String(l.id) !== String(id));
          safeSetStorage('techmaintain_logs', nList);
          return nList;
      });
      deleteDocFromCloud('logs', String(id));
  };

  const saveDailyTaskData = async (taskObj) => {
      const cleanTask = sanitizeForFirestore(taskObj);
      deletedDailyTaskIdsRef.current.delete(String(cleanTask.id));
      setDailyTasks(prev => {
          const exists = prev.some(t => String(t.id) === String(cleanTask.id));
          const nList = exists
              ? prev.map(t => String(t.id) === String(cleanTask.id) ? cleanTask : t)
              : [cleanTask, ...prev];
          safeSetStorage('techmaintain_daily', nList);
          return nList;
      });
      syncDocToCloud('daily_tasks', String(cleanTask.id), cleanTask);
  };

  const handleDeleteDailyTaskApp = async (id) => { 
      deletedDailyTaskIdsRef.current.add(String(id));
      setDailyTasks(prev => {
          const nList = prev.filter(t => String(t.id) !== String(id));
          safeSetStorage('techmaintain_daily', nList);
          return nList;
      });
      deleteDocFromCloud('daily_tasks', String(id));
      if (googleSheetUrl) {
          pushToGoogleSheet({
              action: 'delete_daily_task',
              formType: 'daily_task',
              id: String(id)
          });
      }
  };

  const saveUtilityLogData = async (logObj) => {
      setUtilityLogs(prev => {
          const nList = prev.some(l => String(l.id) === String(logObj.id))
              ? prev.map(l => String(l.id) === String(logObj.id) ? logObj : l)
              : [logObj, ...prev];
          safeSetStorage('techmaintain_utility', nList);
          return nList;
      });
      syncDocToCloud('utility_logs', String(logObj.id), logObj);
  };

  const saveSettings = async (url, newSysSettings) => {
      safeSetStorage('gs_url', url);
      safeSetStorage('techmaintain_sysSettings', newSysSettings);
      setGoogleSheetUrl(url);
      setSysSettings(newSysSettings);
      syncDocToCloud('settings', 'general', { gs_url: url, sysSettings: newSysSettings }, { merge: true });
  };

  const saveCategoryListData = async (newList) => { 
      setCategoryList(newList);
      safeSetStorage('techmaintain_categories', newList);
      syncDocToCloud('settings', 'categories', { list: newList });
  };

  const handleLogin = (username, password) => {
    const foundUser = usersList.find(u => u && u.username === username && u.password === password);
    if (foundUser) { 
        safeSetStorage('techmaintain_active_session', foundUser);
        setUser(foundUser); 
        showNotification(`Đăng nhập thành công!`);
        setView(foundUser.role === 'admin' ? 'dashboard' : 'home', true);
    } 
    else showNotification('Tài khoản hoặc mật khẩu không đúng!', 'error');
  };

  const handleLogout = () => { 
      try { localStorage.removeItem('techmaintain_active_session'); } catch (e) {}
      setUser(null); 
      setView('login', true); 
      setSelectedMachine(null); 
  };
  
  const handleScanSuccess = (id) => { if (!id) return; const machine = machines.find(m => m.id === id); if (machine) { setSelectedMachine(machine); setView('details'); showNotification(`Quét thành công`); } else if (typeof id === 'string' && id.length > 2) if (!notification) showNotification(`Mã không hợp lệ`, 'error'); };

  const pushToGoogleSheet = async (payload) => { 
      if (!googleSheetUrl) return false;
      try {
          await fetch(googleSheetUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: {
                  'Content-Type': 'text/plain;charset=utf-8',
              },
              body: JSON.stringify(payload)
          });
          console.log(`Đã đồng bộ dữ liệu (${payload.action || payload.formType}) lên Google Sheet.`);
          return true;
      } catch (error) {
          console.error("Lỗi khi đẩy lên Google Sheet:", error);
          return false;
      }
  };

  const enrichTaskForSheet = (task) => {
      const actualMins = getActualWorkMinutes(task.startTime, task.endTime);
      const actualTimeStr = formatDurationMinutes(actualMins);
      const errorLevel = getErrorLevelDisplay(task);
      const slaStatus = evaluateTaskKpiStatus(task, sysSettings);
      const earlyLateStr = calculateEarlyLateStr(task, sysSettings);
      const partsStr = task.parts && task.parts.length > 0 
          ? task.parts.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(', ') 
          : '';

      return {
          ...task,
          errorLevel,
          actualTimeStr,
          slaStatus,
          earlyLateStr,
          partsStr
      };
  };

  const handleSyncAllDailyTasksToSheet = async (tasksToSync = dailyTasks) => {
      if (!googleSheetUrl) {
          showNotification('Vui lòng cấu hình Google Sheet URL trong phần Cài đặt trước!', 'error');
          return;
      }
      try {
          showNotification('Đang đồng bộ toàn bộ Sổ công việc lên Google Sheet...');
          const unmergedTasks = expandMergedTaskEntries(tasksToSync);
          const sorted = [...unmergedTasks].sort((a, b) => {
              if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
              return (b.startTime || '').localeCompare(a.startTime || '');
          });
          const enrichedList = sorted.map(t => enrichTaskForSheet(t));
          
          await pushToGoogleSheet({
              action: 'sync_all_daily_tasks',
              formType: 'daily_task_bulk',
              records: enrichedList
          });
          showNotification(`Đã gửi đồng bộ ${enrichedList.length} bản ghi công việc lên Google Sheet!`);
      } catch (err) {
          showNotification('Lỗi khi đồng bộ lên Google Sheet!', 'error');
      }
  };
  
  const handleSaveDailyTask = async (newLog, isEditingRecord = false) => { 
      try {
          const isEditingSplitSubTask = isEditingRecord && editTaskData && editTaskData.originalTaskId;
          const entryId = isEditingRecord && editTaskData && !isEditingSplitSubTask
              ? editTaskData.id
              : `DT-${Date.now()}-${Math.floor(Math.random() * 1000)}`; 
          const entry = sanitizeForFirestore({ ...newLog, id: entryId, formType: 'daily_task' });
          delete entry.originalTaskId;

          await saveDailyTaskData(entry); 
          
          if (!isEditingRecord) { 
              // Tự động Đóng (chuyển trạng thái thành Hoàn thành) phiếu cũ khi nhấn "Tiếp"
              if (initialTaskData && !initialTaskData.isMissingFill) {
                 const oldId = initialTaskData.originalTaskId || initialTaskData.id;
                 const originalTaskObj = dailyTasks.find(t => String(t.id) === String(oldId)) || initialTaskData;
                 const cleanedOldNote = String(originalTaskObj.note || '').split(/\n*---\s*\[\d{4}-\d{2}-\d{2}\]/i)[0].trim();
                 const updatedOldTask = sanitizeForFirestore({ 
                     ...originalTaskObj, 
                     id: oldId,
                     note: cleanedOldNote || originalTaskObj.note,
                     status: 'Hoàn thành' 
                 });
                 delete updatedOldTask.originalTaskId;
                 await saveDailyTaskData(updatedOldTask);
                 if (googleSheetUrl) {
                     pushToGoogleSheet({
                         action: 'upsert_daily_task',
                         formType: 'daily_task',
                         ...enrichTaskForSheet(updatedOldTask)
                     });
                 }
              }

              for (const usedPart of entry.parts || []) { 
                  const foundPart = inventory.find(i => i.name === usedPart.name); 
                  if (foundPart) await saveInventoryData({ ...foundPart, quantity: Math.max(0, foundPart.quantity - Number(usedPart.quantity)) }); 
              } 
          } 

          if (googleSheetUrl) {
              pushToGoogleSheet({
                  action: 'upsert_daily_task',
                  formType: 'daily_task',
                  ...enrichTaskForSheet(entry)
              });
          }
          
          const wasContinuing = Boolean(initialTaskData && !initialTaskData.isMissingFill);
          setInitialTaskData(null); 
          setEditTaskData(null);
          showNotification(isEditingRecord ? 'Đã lưu cập nhật báo cáo!' : (wasContinuing ? 'Đã đóng phiếu cũ và tạo phiếu mới thành công!' : 'Đã lưu báo cáo hằng ngày thành công!')); 
          setTaskFilter('all');
          setView('daily_task_history'); 
      } catch (err) {
          console.error("Lỗi khi lưu báo cáo hằng ngày:", err);
          showNotification('Có lỗi xảy ra khi lưu báo cáo, vui lòng thử lại!', 'error');
      }
  };
  
  const handleSaveUtilityLog = async (data, mode) => { 
      const existingLog = utilityLogs.find(l => l.date === data.date);
      let entry = { formType: 'utility_log', ...data };

      if (existingLog && (!utilityEditItem || existingLog.id !== utilityEditItem.id)) {
          entry.id = existingLog.id;
          
          if (mode === 'elec') {
              entry.water = existingLog.water || entry.water;
          } else if (mode === 'water') {
              entry.elec1 = existingLog.elec1 || entry.elec1;
              entry.elec2 = existingLog.elec2 || entry.elec2;
          }
          
          if (existingLog.note && data.note && existingLog.note !== data.note) {
              entry.note = existingLog.note + '\n' + data.note;
          } else if (!data.note && existingLog.note) {
              entry.note = existingLog.note;
          }
          
          if (existingLog.images && existingLog.images.length > 0) {
              entry.images = [...existingLog.images, ...(data.images || [])];
          }

          if (utilityEditItem) {
               setUtilityLogs(prev => prev.filter(l => l.id !== utilityEditItem.id));
               if (canUseCloud) {
                   try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'utility_logs', String(utilityEditItem.id))); }
                   catch (e) { setPermissionError(true); }
               }
          }
      }

      await saveUtilityLogData(entry); 
      if (googleSheetUrl && !utilityEditItem) pushToGoogleSheet(entry); 
      showNotification('Đã lưu và gộp dữ liệu thành công!'); 
      setView(user.role === 'admin' ? 'utility_history' : 'home'); 
  };

  const handleSaveMachineLog = async (logData, newMachineStatus) => {
      const entry = { formType: 'machine_log', ...logData };
      await saveLogData(entry);
      
      if (!editLogData) {
          for (const usedPart of entry.parts || []) {
             const foundPart = inventory.find(i => i.name === usedPart.name); 
             if (foundPart) await saveInventoryData({ ...foundPart, quantity: Math.max(0, foundPart.quantity - Number(usedPart.quantity)) }); 
          }

          if (googleSheetUrl) pushToGoogleSheet(entry);
          
          const allWorkers = [
              { username: entry.username, name: entry.technicianName },
              ...(entry.coWorkers || [])
          ];
          const nowStr = new Date().toTimeString().slice(0, 5);
          const machineObj = machines.find(m => m.id === entry.machineId);
          const machineNameStr = machineObj ? machineObj.name : entry.machineId;

          for (const worker of allWorkers) {
              const dtId = `DT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
              const taskEntry = {
                  id: dtId,
                  formType: 'daily_task',
                  technicianName: worker.name,
                  username: worker.username,
                  date: entry.date,
                  startTime: entry.startTime || nowStr,
                  endTime: entry.endTime || nowStr,
                  taskName: `[${machineNameStr}] ${entry.type}`,
                  type: entry.type,
                  errorLevel: entry.errorLevel,
                  approvedTime: entry.approvedTime,
                  kpiStatus: entry.kpiStatus,
                  note: entry.note,
                  status: entry.status,
                  parts: entry.parts || [],
                  images: entry.images || []
              };
              await saveDailyTaskData(taskEntry);
              if (googleSheetUrl) {
                  pushToGoogleSheet({
                      action: 'upsert_daily_task',
                      formType: 'daily_task',
                      ...enrichTaskForSheet(taskEntry)
                  });
              }
          }
      }

      if (newMachineStatus) {
          const machineToUpdate = machines.find(m => m.id === entry.machineId);
          if (machineToUpdate && machineToUpdate.status !== newMachineStatus) {
              await saveMachineData({ ...machineToUpdate, status: newMachineStatus });
              setSelectedMachine(prev => prev ? {...prev, status: newMachineStatus} : prev);
          }
      }

      showNotification('Đã lưu báo cáo cho thiết bị này!');
      setView('details');
  };

  const handleConfirmDeleteLog = async () => {
      if (logDeleteModal.id) {
          await handleDeleteLogApp(logDeleteModal.id);
          showNotification('Đã xóa báo cáo!');
      }
      setLogDeleteModal({ isOpen: false, id: null });
  };

  const showNotification = (msg, type = 'success') => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3000); };

  if (!user) return (
      <div className="fixed inset-0 bg-slate-900 flex justify-center overflow-hidden font-sans">
         <div className="w-full max-w-md md:max-w-none h-full relative overflow-hidden"><LoginView handleLogin={handleLogin} isCloudSyncing={isCloudSyncing} db={db} permissionError={permissionError} /></div>
         {notification && (
            <div className={`absolute top-4 left-4 right-4 md:max-w-md md:mx-auto p-4 md:p-5 rounded-2xl shadow-2xl flex items-center space-x-3 z-50 animate-bounce-in ${notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}>
               {notification.type === 'error' ? <AlertCircle className="w-6 h-6 shrink-0"/> : <CheckCircle className="w-6 h-6 shrink-0"/>}
               <span className="font-bold md:text-lg">{notification.msg}</span>
            </div>
         )}
      </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-200 flex justify-center overflow-hidden font-sans text-slate-800 print-container-reset">
      <div className="w-full max-w-[1600px] h-full bg-slate-50 flex flex-col relative overflow-hidden md:shadow-[0_0_50px_rgba(0,0,0,0.1)] md:border-x border-slate-300 print-container-reset">
        <div className="h-1 md:h-1.5 bg-blue-600 w-full shrink-0 z-50 no-print"></div>
        <div className="flex-1 overflow-hidden relative flex flex-col print-container-reset">
          {view === 'dashboard' && <DashboardView user={user} machines={machines} dailyTasks={dailyTasks} utilityLogs={utilityLogs} logs={logs} handleLogout={handleLogout} setView={setView} db={db} setMachineFilter={setMachineFilter} setTaskFilter={setTaskFilter} sysSettings={sysSettings} usersList={usersList} />}
          {view === 'user_management' && <UserManagementView usersList={usersList} setView={setView} showNotification={showNotification} saveUserData={saveUserData} handleDeleteUser={handleDeleteUser} />}
          {view === 'machines' && <MachineManagementView machines={machines} logs={logs} setView={setView} showNotification={showNotification} saveMachineData={saveMachineData} machineFilter={machineFilter} handleDeleteMachineApp={handleDeleteMachineApp} user={user} categoryList={categoryList} saveCategoryListData={saveCategoryListData} />}
          {view === 'settings' && <SettingsView setView={setView} showNotification={showNotification} googleSheetUrl={googleSheetUrl} sysSettings={sysSettings} saveSettings={saveSettings} />}
          {view === 'inventory' && <InventoryView inventory={inventory} setView={setView} showNotification={showNotification} saveInventoryData={saveInventoryData} user={user} db={db} />}
          {view === 'home' && <HomeView user={user} machines={machines} dailyTasks={dailyTasks} logs={logs} setView={setView} handleLogout={handleLogout} db={db} setMachineFilter={setMachineFilter} setTaskFilter={setTaskFilter} setInitialTaskData={setInitialTaskData} setEditTaskData={setEditTaskData} sysSettings={sysSettings} />}
          {view === 'daily_task_form' && <DailyTaskFormView user={user} inventory={inventory} setView={setView} showNotification={showNotification} handleSaveDailyTask={handleSaveDailyTask} initialTaskData={initialTaskData} setInitialTaskData={setInitialTaskData} editTaskData={editTaskData} setEditTaskData={setEditTaskData} sysSettings={sysSettings}/>}
          {view === 'daily_task_history' && <DailyTaskHistoryView dailyTasks={dailyTasks} usersList={usersList} setView={setView} user={user} taskFilter={taskFilter} setInitialTaskData={setInitialTaskData} setEditTaskData={setEditTaskData} handleDeleteDailyTaskApp={handleDeleteDailyTaskApp} showNotification={showNotification} setZoomedImage={setZoomedImage} sysSettings={sysSettings} handleSyncAllDailyTasksToSheet={handleSyncAllDailyTasksToSheet} />}
          {view === 'kpi_report' && <KpiReportView user={user} usersList={usersList} dailyTasks={dailyTasks} machines={machines} sysSettings={sysSettings} saveSettings={saveSettings} googleSheetUrl={googleSheetUrl} setView={setView} showNotification={showNotification} />}
          {view === 'meter_menu' && <MeterMenuView setView={setView} user={user} setUtilityMode={setUtilityMode} />}
          {view === 'utility_form' && <UtilityFormView user={user} setView={setView} showNotification={showNotification} handleSaveUtilityLog={handleSaveUtilityLog} editData={utilityEditItem} setEditData={setUtilityEditItem} utilityLogs={utilityLogs} mode={utilityMode} />}
          {view === 'utility_history' && <UtilityHistoryView utilityLogs={utilityLogs} usersList={usersList} setView={setView} user={user} setEditData={setUtilityEditItem} setUtilityMode={setUtilityMode} setZoomedImage={setZoomedImage} />}
          {view === 'scanner' && <ScannerView user={user} setView={setView} handleScanSuccess={handleScanSuccess} machines={machines} />}
          {view === 'manual_select' && <ManualSelectView machines={machines} logs={logs} setView={setView} handleScanSuccess={handleScanSuccess} machineFilter={machineFilter} />}
          {view === 'details' && selectedMachine && (
               <div className="flex flex-col h-full bg-slate-50 relative animate-fade-in">
                   <div className="bg-white shadow-sm p-4 md:p-6 shrink-0 z-10 border-b border-slate-200">
                      <div className="max-w-7xl mx-auto w-full">
                          <button onClick={() => setView('home')} className="p-2 md:p-3 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full mb-3"><ArrowLeft className="w-6 h-6" /></button>
                          <h1 className="text-xl md:text-3xl font-black text-slate-900">{selectedMachine.name}</h1>
                          <div className="flex items-center space-x-3 mt-3">
                              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-sm font-mono font-bold border border-slate-200">{selectedMachine.id}</span>
                              <p className="text-slate-500 text-sm md:text-base flex items-center"><MapPin className="w-4 h-4 mr-1"/> {selectedMachine.location}</p>
                          </div>
                      </div>
                   </div>
                   <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-20 custom-scrollbar">
                      <div className="max-w-7xl mx-auto space-y-6">
                          <button onClick={() => { setEditLogData(null); setView('form'); }} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 transition-colors text-white py-4 md:py-3 px-8 rounded-2xl md:rounded-xl flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl active:scale-95 text-lg md:text-base font-bold">
                              <Wrench className="w-6 h-6 md:w-5 md:h-5" /> <span>Tạo Báo Cáo Mới</span>
                          </button>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                               {logs.filter(l => l.machineId === selectedMachine.id).map((log) => (
                                 <div key={log.id} className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200 hover:border-blue-300 transition-colors flex flex-col group">
                                    <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                                       <div>
                                           <span className="text-xs md:text-sm font-black text-blue-700 uppercase bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">{log.type}</span>
                                           {log.type === 'Sửa chữa đột xuất' && log.errorLevel && (
                                               <span className="ml-2 text-[10px] md:text-xs font-black text-red-700 uppercase bg-red-50 border border-red-100 px-3 py-1 rounded-lg">Mức {log.errorLevel}</span>
                                           )}
                                           <div className="text-sm text-slate-500 mt-3 flex items-center bg-slate-50 px-3 py-1.5 rounded-lg w-fit"><Clock className="w-4 h-4 mr-2"/> {log.date}</div>
                                       </div>
                                       {log.type === 'Sửa chữa đột xuất' && log.kpiStatus && (
                                          <div className={`text-xs font-bold px-3 py-1 rounded-full border ${log.kpiStatus === 'Đạt' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                              KPI: {log.kpiStatus}
                                          </div>
                                       )}
                                    </div>
                                    <p className="text-slate-700 text-base md:text-lg whitespace-pre-wrap flex-1 mb-4">{log.note}</p>
                                    
                                    {log.parts && log.parts.length > 0 && (
                                       <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                         <div className="text-[10px] md:text-xs text-slate-400 mb-2 flex items-center uppercase font-bold"><Package className="w-4 h-4 mr-1.5"/> Vật tư thay thế:</div>
                                         <div className="flex flex-wrap gap-2">
                                           {log.parts.map((p, idx) => (
                                             <span key={idx} className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold shadow-sm">{p.name} <span className="opacity-60 font-normal">({p.quantity} {p.unit})</span></span>
                                           ))}
                                         </div>
                                       </div>
                                    )}

                                    {log.images && log.images.length > 0 && (
                                       <div className="flex gap-3 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                                         {log.images.map((img, idx) => (
                                            <img key={idx} src={img} onClick={() => setZoomedImage(img)} className="w-16 h-16 md:w-24 md:h-24 object-cover rounded-xl border border-slate-200 shrink-0 cursor-pointer hover:scale-105 transition-transform" alt="Báo cáo" />
                                         ))}
                                       </div>
                                     )}
                                     
                                     <div className="pt-4 border-t border-slate-100 flex items-center justify-end mt-auto opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                         <button onClick={() => { setEditLogData(log); setView('form'); }} className="px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 hover:border-blue-200 font-medium flex items-center"><Edit className="w-4 h-4" /><span className="hidden md:inline ml-1.5 text-sm font-bold">Sửa</span></button>
                                         <button onClick={() => setLogDeleteModal({ isOpen: true, id: log.id })} className="px-3 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-slate-200 hover:border-red-200 font-medium flex items-center ml-2"><Trash2 className="w-4 h-4" /><span className="hidden md:inline ml-1.5 text-sm font-bold">Xóa</span></button>
                                     </div>
                                 </div>
                               ))}
                          </div>
                      </div>
                   </div>
               </div>
          )}
          {view === 'form' && selectedMachine && (
               <MachineLogFormView 
                   user={user} 
                   inventory={inventory}
                   selectedMachine={selectedMachine} 
                   setView={setView} 
                   showNotification={showNotification} 
                   handleSaveMachineLog={handleSaveMachineLog} 
                   editLogData={editLogData} 
                   setEditLogData={setEditLogData} 
                   usersList={usersList}
                   sysSettings={sysSettings}
               />
          )}
        </div>
        
        <ImageZoomModal imageUrl={zoomedImage} onClose={() => setZoomedImage(null)} />
        <CustomConfirmModal isOpen={logDeleteModal.isOpen} title="Xóa báo cáo thiết bị" message="Bạn có chắc chắn muốn xóa báo cáo này? Hành động này sẽ không thể hoàn tác." onConfirm={handleConfirmDeleteLog} onCancel={() => setLogDeleteModal({ isOpen: false, id: null })} />

        {notification && (
            <div className={`absolute top-4 left-4 right-4 md:max-w-md md:mx-auto p-4 md:p-5 rounded-2xl shadow-2xl flex items-center space-x-3 z-50 animate-bounce-in ${notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}>
               {notification.type === 'error' ? <AlertCircle className="w-6 h-6 shrink-0"/> : <CheckCircle className="w-6 h-6 shrink-0"/>}
               <span className="font-bold md:text-lg">{notification.msg}</span>
            </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <MainApp />
    </AppErrorBoundary>
  );
}