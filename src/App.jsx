import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Wrench, History, ArrowLeft, Save, CheckCircle, AlertCircle, User, Package, LogOut, FileSpreadsheet, Lock, PieChart, BarChart3, Settings, Printer, Plus, X, Camera, Search, MapPin, ListFilter, Image as ImageIcon, Trash2, Boxes, Edit, Download, Upload, Database, Cloud, CloudOff, CalendarClock, Clock, Filter, Zap, Droplets, ChevronDown, ChevronUp, AlertTriangle, Calculator, PlaySquare } from 'lucide-react';

// --- FIREBASE CLOUD DATABASE SETUP ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

// Injected Styles for custom animations and scrollbars
const injectStyles = () => {
  if (typeof document === 'undefined') return;
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
  `;
  document.head.appendChild(style);
};

// Gọi hàm injectStyles để áp dụng CSS
injectStyles();

const myFirebaseConfig = {
  apiKey: "AIzaSyDedcI5SKRTek49VEkH6s71ogC8-orTjkg", 
  authDomain: "techmaintain-app.firebaseapp.com",
  projectId: "techmaintain-app",
  storageBucket: "techmaintain-app.firebasestorage.app",
  messagingSenderId: "202386593017",
  appId: "1:202386593017:web:3e47d12a813446e770be28"
};

const isCustomConfigured = myFirebaseConfig.apiKey && myFirebaseConfig.apiKey !== "";
const firebaseConfig = isCustomConfigured 
    ? myFirebaseConfig 
    : (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null);

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'techmaintain-app';
const safeAppId = rawAppId.replace(/[\/\.]/g, '_');

const app = firebaseConfig ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

// --- MOCK DATA MẶC ĐỊNH ---
const INITIAL_MACHINES = [
  { id: 'M-101', name: 'Máy Phay CNC 3 Trục', model: 'Haas VF-2', location: 'Xưởng A', department: 'Cơ Khí', category: 'Cắt CNC', status: 'operational' },
];

const INITIAL_INVENTORY = [
  { id: 'P-101', name: 'Dầu máy CNC', unit: 'Lít', quantity: 45 },
];

const INITIAL_USERS = [
  { id: 'admin', username: 'admin', password: '123', name: 'Quản Lý Trưởng', role: 'admin' },
  { id: 'tech1', username: 'ktv1', password: '123', name: 'Nguyễn Văn KTV', role: 'maintenance' },
  { id: 'tech2', username: 'ktv2', password: '123', name: 'Lê Văn KTV', role: 'maintenance' }
];

const INITIAL_CATEGORIES = ['Cầu trục', 'Cắt CNC', 'Kho', 'Sơn', 'Quạt', 'Băng tải', 'P.Máy nén khí', 'Cơ khí', 'Vách ướt', 'STT', 'Khác'];

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

// ============================================================================
// COMPONENT DÙNG CHUNG
// ============================================================================
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

const SearchablePartSelect = ({ inventory, isCustomPart, setIsCustomPart, tempPart, setTempPart, theme = 'blue' }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = inventory.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

    const handleSelect = (val) => {
        if (val === 'CUSTOM') {
            setIsCustomPart(true);
            setTempPart({ name: '', unit: '', quantity: '' });
        } else {
            setIsCustomPart(false);
            const selectedItem = inventory.find(i => i.name === val);
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

// ============================================================================
// VIEWS CHÍNH CỦA HỆ THỐNG
// ============================================================================

const LoginView = ({ handleLogin, isCloudSyncing, db }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-900 text-white animate-fade-in overflow-y-auto">
      <div className="w-full max-w-md space-y-8 my-auto">
        <div className="text-center space-y-3">
          <div className="bg-blue-600 p-5 rounded-3xl inline-block shadow-lg shadow-blue-500/30"><Wrench className="w-16 h-16 text-white" /></div>
          <h1 className="text-4xl font-black tracking-tight">Martech Boiler</h1>
          <p className="text-slate-400 text-base">Hệ thống quản lý bảo trì & công việc</p>
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
                 <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-600 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder:text-slate-600 transition-all" placeholder="***" />
              </div>
            </div>
            <button onClick={() => handleLogin(username, password)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl text-lg transition-all active:scale-95 shadow-lg mt-4">Đăng Nhập</button>
        </div>
        
        <div className="flex justify-center items-center gap-2 mt-8 text-sm font-medium">
           {isCloudSyncing ? (<><Cloud className="w-5 h-5 text-blue-500 animate-pulse" /><span className="text-blue-400">Đang dò tìm kết nối...</span></>) : db ? (<><Cloud className="w-5 h-5 text-green-500" /><span className="text-green-400">Đã kết nối dữ liệu Đám mây</span></>) : (<><CloudOff className="w-5 h-5 text-yellow-500" /><span className="text-yellow-500">Chế độ Offline (Cục bộ)</span></>)}
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ user, machines, dailyTasks, utilityLogs, logs, handleLogout, setView, db, setMachineFilter, setTaskFilter }) => {
  const machinesOperational = machines.filter(m => m.status === 'operational').length;
  const machinesIssue = machines.filter(m => m.status === 'maintenance' || m.status === 'broken').length;
  const totalPending = dailyTasks.filter(t => t.status !== 'Hoàn thành').length;

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
              <h3 className="text-sm md:text-base font-bold text-slate-800 mb-4 flex items-center"><Database className="w-5 h-5 mr-2 text-blue-600"/> Máy móc & Thiết bị ({machines.length})</h3>
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
          
          <div>
            <h3 className="font-bold text-slate-800 text-lg md:text-2xl mb-4 md:mb-6 flex items-center"><Settings className="w-6 h-6 md:w-8 md:h-8 mr-2 text-slate-600" /> Hệ thống tính năng</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
               <button onClick={() => setView('user_management')} className="bg-white rounded-3xl border border-slate-200 shadow-sm w-full flex items-center p-5 md:p-6 hover:shadow-md hover:border-emerald-300 transition-all active:scale-95 text-left group">
                  <div className="bg-emerald-100 p-4 md:p-5 rounded-2xl text-emerald-600 mr-4 md:mr-5 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><User className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div className="flex-1"><p className="font-bold text-slate-800 text-base md:text-lg">Tài khoản (KTV)</p><p className="text-xs md:text-sm text-slate-500 mt-1">Quản lý User & Pass</p></div>
               </button>
               <button onClick={() => { setMachineFilter('all'); setView('machines'); }} className="bg-white rounded-3xl border border-slate-200 shadow-sm w-full flex items-center p-5 md:p-6 hover:shadow-md hover:border-indigo-300 transition-all active:scale-95 text-left group">
                  <div className="bg-indigo-100 p-4 md:p-5 rounded-2xl text-indigo-600 mr-4 md:mr-5 group-hover:bg-indigo-500 group-hover:text-white transition-colors"><Database className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div className="flex-1"><p className="font-bold text-slate-800 text-base md:text-lg">Thiết Bị</p><p className="text-xs md:text-sm text-slate-500 mt-1">Danh sách & Excel</p></div>
               </button>
               <button onClick={() => setView('inventory')} className="bg-white rounded-3xl border border-slate-200 shadow-sm w-full flex items-center p-5 md:p-6 hover:shadow-md hover:border-orange-300 transition-all active:scale-95 text-left group">
                  <div className="bg-orange-100 p-4 md:p-5 rounded-2xl text-orange-600 mr-4 md:mr-5 group-hover:bg-orange-500 group-hover:text-white transition-colors"><Boxes className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div className="flex-1"><p className="font-bold text-slate-800 text-base md:text-lg">Kho Vật Tư</p><p className="text-xs md:text-sm text-slate-500 mt-1">Quản lý tồn kho</p></div>
               </button>
               <button onClick={() => { setTaskFilter('all'); setView('daily_task_history'); }} className="bg-white rounded-3xl border border-slate-200 shadow-sm w-full flex items-center p-5 md:p-6 hover:shadow-md hover:border-pink-300 transition-all active:scale-95 text-left group">
                  <div className="bg-pink-100 p-4 md:p-5 rounded-2xl text-pink-600 mr-4 md:mr-5 group-hover:bg-pink-500 group-hover:text-white transition-colors"><CalendarClock className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div className="flex-1"><p className="font-bold text-slate-800 text-base md:text-lg">Sổ Ghi Công Việc</p><p className="text-xs md:text-sm text-slate-500 mt-1">Lịch sử BC hằng ngày</p></div>
               </button>
               <button onClick={() => setView('utility_history')} className="bg-white rounded-3xl border border-slate-200 shadow-sm w-full flex items-center p-5 md:p-6 hover:shadow-md hover:border-cyan-300 transition-all active:scale-95 text-left group">
                  <div className="bg-cyan-100 p-4 md:p-5 rounded-2xl text-cyan-600 mr-4 md:mr-5 group-hover:bg-cyan-500 group-hover:text-white transition-colors"><Droplets className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div className="flex-1"><p className="font-bold text-slate-800 text-base md:text-lg">Sổ Ghi Điện Nước</p><p className="text-xs md:text-sm text-slate-500 mt-1">Lịch sử chỉ số</p></div>
               </button>
               <button onClick={() => setView('settings')} className="bg-white rounded-3xl border border-slate-200 shadow-sm w-full flex items-center p-5 md:p-6 hover:shadow-md hover:border-green-300 transition-all active:scale-95 text-left group">
                  <div className="bg-green-100 p-4 md:p-5 rounded-2xl text-green-600 mr-4 md:mr-5 group-hover:bg-green-500 group-hover:text-white transition-colors"><FileSpreadsheet className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div className="flex-1"><p className="font-bold text-slate-800 text-base md:text-lg">Xuất báo cáo</p><p className="text-xs md:text-sm text-slate-500 mt-1">Cấu hình Google Sheet</p></div>
               </button>
               <button onClick={() => setView('home')} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl border border-blue-200 shadow-sm w-full flex items-center p-5 md:p-6 hover:shadow-md hover:border-blue-400 transition-all active:scale-95 text-left group lg:col-span-3 xl:col-span-2">
                  <div className="bg-blue-600 p-4 md:p-5 rounded-2xl text-white mr-4 md:mr-5 shadow-md"><Wrench className="w-6 h-6 md:w-8 md:h-8" /></div>
                  <div className="flex-1"><p className="font-black text-blue-900 text-base md:text-xl">Màn hình Kỹ thuật viên</p><p className="text-xs md:text-sm text-blue-700 mt-1">Vào giao diện vận hành app</p></div>
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HomeView = ({ user, machines, dailyTasks, logs, setView, handleLogout, setMachineFilter, setTaskFilter, setInitialTaskData, setEditTaskData }) => {
  const machinesOperational = machines.filter(m => m.status === 'operational').length;
  const machinesIssue = machines.filter(m => m.status === 'maintenance' || m.status === 'broken').length;
  const totalPending = dailyTasks.filter(t => t.status !== 'Hoàn thành').length;

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

             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
                 <button onClick={() => { setMachineFilter('all'); setView('manual_select'); }} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-start gap-3 md:gap-4 hover:shadow-md hover:border-blue-400 transition-all active:scale-95 group">
                     <div className="bg-blue-50 p-3.5 md:p-4 rounded-2xl group-hover:bg-blue-500 transition-colors"><ListFilter className="w-6 h-6 md:w-8 md:h-8 text-blue-600 group-hover:text-white"/></div>
                     <div className="text-left"><p className="font-bold text-sm md:text-lg text-slate-800">Chọn Thiết Bị</p><p className="text-[10px] md:text-xs text-slate-500 mt-1">Tìm kiếm thủ công</p></div>
                 </button>

                 <button onClick={() => setView('inventory')} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-start gap-3 md:gap-4 hover:shadow-md hover:border-orange-400 transition-all active:scale-95 group">
                     <div className="bg-orange-50 p-3.5 md:p-4 rounded-2xl group-hover:bg-orange-500 transition-colors"><Boxes className="w-6 h-6 md:w-8 md:h-8 text-orange-600 group-hover:text-white"/></div>
                     <div className="text-left"><p className="font-bold text-sm md:text-lg text-slate-800">Kho Vật Tư</p><p className="text-[10px] md:text-xs text-slate-500 mt-1">Xem tồn kho linh kiện</p></div>
                 </button>

                 <button onClick={() => { setInitialTaskData(null); setEditTaskData(null); setView('daily_task_form'); }} className="bg-purple-50 p-5 md:p-6 rounded-3xl border border-purple-100 shadow-sm flex flex-col items-start gap-3 md:gap-4 hover:shadow-md hover:bg-purple-100 hover:border-purple-300 transition-all active:scale-95 group">
                     <div className="bg-purple-200 p-3.5 md:p-4 rounded-2xl group-hover:bg-purple-600 transition-colors"><CalendarClock className="w-6 h-6 md:w-8 md:h-8 text-purple-700 group-hover:text-white"/></div>
                     <div className="text-left"><p className="font-bold text-sm md:text-lg text-purple-900">Báo Cáo Ngày</p><p className="text-[10px] md:text-xs text-purple-600 mt-1">Việc ngoài / không QR</p></div>
                 </button>

                 <button onClick={() => { setTaskFilter('all'); setView('daily_task_history'); }} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-start gap-3 md:gap-4 hover:shadow-md hover:border-slate-400 transition-all active:scale-95 group">
                     <div className="bg-slate-100 p-3.5 md:p-4 rounded-2xl group-hover:bg-slate-600 transition-colors"><History className="w-6 h-6 md:w-8 md:h-8 text-slate-600 group-hover:text-white"/></div>
                     <div className="text-left"><p className="font-bold text-sm md:text-lg text-slate-800">Sổ Lịch Sử</p><p className="text-[10px] md:text-xs text-slate-500 mt-1">Xem lại việc đã làm</p></div>
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

const ManualSelectView = ({ machines, setView, handleScanSuccess, machineFilter }) => {
   const [search, setSearch] = useState('');
   const [expandedGroups, setExpandedGroups] = useState({});

   let filtered = machines;
   if (machineFilter === 'operational') filtered = machines.filter(m => m.status === 'operational');
   if (machineFilter === 'issue') filtered = machines.filter(m => m.status !== 'operational');
   filtered = filtered.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase()));

   // Gom nhóm theo chủng loại (tương tự trang Quản lý Thiết Bị)
   const groupedMachines = {};
   filtered.forEach(m => {
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
  const dateStr = new Date().toISOString().split('T')[0];
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

  // Lấy bản ghi của ngày gần nhất trước ngày đang chọn (để tính hiệu số nước)
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

      // Tính khối lượng tiêu thụ cho tất cả các đồng hồ
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
  const [filterTech, setFilterTech] = useState(user.role === 'admin' ? 'all' : user.username);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  const filteredLogs = utilityLogs.filter(t => {
      let matchTech = filterTech === 'all' ? true : (t.username === filterTech || t.technicianName === filterTech);
      let matchDate = t.date.startsWith(filterMonth);
      return matchTech && matchDate;
  });

  // Thêm biến để chứa danh sách đã sắp xếp giảm dần theo ngày (mới nhất xếp trên)
  const sortedFilteredLogs = [...filteredLogs].sort((a, b) => new Date(b.date) - new Date(a.date));

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
                   {user.role === 'admin' && (
                      <div className="flex-1 relative">
                          <Filter className="absolute left-3 top-2.5 md:top-3.5 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                          <select value={filterTech} onChange={e => setFilterTech(e.target.value)} className="w-full pl-9 md:pl-10 pr-3 py-2 md:py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-cyan-500 text-slate-700 font-bold"><option value="all">Tất cả KTV</option>{usersList.filter(u=>u.role !== 'admin').map(u => <option key={u.id} value={u.username}>{u.name}</option>)}</select>
                      </div>
                   )}
                   <div className="flex-1 relative"><input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full px-3 py-2 md:py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-cyan-500 text-slate-700 font-bold" /></div>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-4">
                <div className="flex justify-between items-center text-xs md:text-sm text-slate-500 uppercase font-bold tracking-wider mb-2"><span>Tháng {filterMonth} ({sortedFilteredLogs.length} bản ghi)</span></div>
                
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
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
                                        // Lấy log của ngày gần nhất trước đó để tính khối nước tiêu thụ (chỉ tính đồng hồ tổng)
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
  const [editForm, setEditForm] = useState({ id: '', username: '', password: '', name: '', role: 'maintenance' });
  const [isAdding, setIsAdding] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const filteredUsers = usersList.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSave = async () => {
      if (!editForm.username || !editForm.password || !editForm.name) { return showNotification('Vui lòng điền đủ Tên ĐN, Mật khẩu, Họ tên!', 'error'); }
      if (isAdding && usersList.find(u => u.username === editForm.username)) { return showNotification('Tên đăng nhập đã tồn tại!', 'error'); }
      await saveUserData({ id: editForm.id || `U-${Date.now()}`, username: editForm.username, password: editForm.password, name: editForm.name, role: editForm.role });
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

  const startAdd = () => { setIsAdding(true); setEditingId(null); setEditForm({ id: '', username: '', password: '', name: '', role: 'maintenance' }); }
  const startEdit = (u) => { setIsAdding(false); setEditingId(u.id); setEditForm(u); }

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in">
      <CustomConfirmModal isOpen={deleteModal.isOpen} title="Xóa tài khoản" message="Bạn có chắc chắn muốn xóa tài khoản này? Hành động này không thể hoàn tác." onConfirm={handleConfirmDeleteUser} onCancel={() => setDeleteModal({ isOpen: false, id: null })} />

      <div className="bg-white p-4 md:p-6 border-b border-slate-200 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3"><button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 md:w-7 md:h-7" /></button><h2 className="font-bold text-slate-800 text-lg md:text-2xl">Quản lý Tài Khoản</h2></div>
            <div className="flex gap-3 md:w-1/2 lg:w-1/3">
                <div className="relative flex-1"><Search className="absolute left-3 top-2.5 md:top-3.5 w-4 h-4 md:w-5 md:h-5 text-slate-400" /><input type="text" placeholder="Tìm tài khoản..." className="w-full pl-9 md:pl-10 pr-3 py-2 md:py-3 bg-slate-100 border-none rounded-xl text-sm md:text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
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
                        <div><label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Tên đăng nhập</label><input disabled={!isAdding && editForm.id === 'admin'} value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100" placeholder="VD: ktv_nguyen" /></div>
                        <div><label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Mật khẩu</label><input value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="w-full p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="***" /></div>
                        <div className="md:col-span-2"><label className="text-xs md:text-sm font-bold text-slate-600 mb-2 block">Họ và Tên</label><input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-3 md:p-4 border border-blue-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Họ tên đầy đủ" /></div>
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
                       <div className="overflow-hidden">
                           <h4 className="font-bold text-slate-800 text-base md:text-lg truncate">{u.name}</h4>
                           <div className="text-xs md:text-sm text-slate-500 font-mono mt-2 bg-slate-50 p-2 md:p-3 rounded-xl border border-slate-100 break-all space-y-1">
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

const MachineManagementView = ({ machines, setView, showNotification, saveMachineData, machineFilter, handleDeleteMachineApp, user, categoryList, saveCategoryListData }) => {
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

  let baseMachines = machines;
  if (machineFilter === 'operational') baseMachines = machines.filter(m => m.status === 'operational');
  if (machineFilter === 'issue') baseMachines = machines.filter(m => m.status === 'maintenance' || m.status === 'broken');

  const filteredMachines = baseMachines.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.id.toLowerCase().includes(searchTerm.toLowerCase()));
  const filterTitle = machineFilter === 'operational' ? '(Máy Đang Tốt)' : machineFilter === 'issue' ? '(Lỗi / Bảo Trì)' : '';

  // Logic gom nhóm thiết bị theo chủng loại (category)
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

  // Lấy tổng hợp danh sách chủng loại
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
                                    <input className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-100 text-slate-500 outline-none" value={editForm.id} disabled title="Mã không thể sửa" />
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

  const filteredInventory = inventory.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

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

const SettingsView = ({ setView, showNotification, googleSheetUrl, setGoogleSheetUrl }) => {
    return (
      <div className="flex flex-col h-full bg-slate-50 animate-fade-in">
        <div className="p-4 md:p-6 border-b border-slate-200 bg-white flex items-center space-x-3 shrink-0"><button onClick={() => setView('dashboard')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 md:w-7 md:h-7 text-slate-600" /></button><h2 className="font-bold text-slate-800 text-lg md:text-2xl">Cài đặt Hệ thống</h2></div>
        <div className="p-4 md:p-8 space-y-6 flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 border-b pb-4 flex items-center"><FileSpreadsheet className="w-6 h-6 mr-2 text-green-600"/> Xuất Báo Cáo Google Sheet</h3>
              <div className="mb-6"><label className="block text-sm font-bold text-slate-700 mb-2">Google Apps Script URL (Web App URL)</label><input type="text" value={googleSheetUrl} onChange={(e) => setGoogleSheetUrl(e.target.value)} className="w-full p-4 border border-slate-300 rounded-xl text-base focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" placeholder="https://script.google.com/macros/s/..." /></div>
              <button onClick={() => { setGoogleSheetUrl(googleSheetUrl); localStorage.setItem('gs_url', googleSheetUrl); showNotification('Đã lưu cấu hình Google Sheet!'); setView('dashboard'); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl text-lg font-bold shadow-md transition-colors flex justify-center items-center gap-2"><Save className="w-5 h-5"/> Lưu Cấu Hình</button>
          </div>
        </div>
      </div>
    );
};

const DailyTaskHistoryView = ({ dailyTasks, usersList, setView, user, taskFilter, setInitialTaskData, setEditTaskData, handleDeleteDailyTaskApp, showNotification, setZoomedImage }) => {
  const [filterTech, setFilterTech] = useState(user.role === 'admin' ? 'all' : user.username);
  const [startDate, setStartDate] = useState(() => {
      const d = new Date();
      d.setDate(1);
      return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => { 
      if(taskFilter === 'pending') {
          setFilterTech('all'); 
      } else {
          setFilterTech(user.role === 'admin' ? 'all' : user.username);
      }
  }, [taskFilter, user]);

  const filteredTasks = dailyTasks.filter(t => {
      if (taskFilter === 'pending' && t.status === 'Hoàn thành') return false;
      // Cho phép tất cả KTV thấy việc tồn đọng của nhau
      let matchTech = filterTech === 'all' ? true : (t.username === filterTech || t.technicianName === filterTech);
      if (taskFilter === 'pending') matchTech = true; 
      
      let matchDate = true;
      if (taskFilter !== 'pending') {
          if (startDate && t.date < startDate) matchDate = false;
          if (endDate && t.date > endDate) matchDate = false;
      }
      return matchTech && matchDate;
  });

  const viewTitle = taskFilter === 'pending' ? 'Công Việc Đang Dở' : 'Sổ Ghi Công Việc';

  const startEdit = (task) => { setEditTaskData(task); setInitialTaskData(null); setView('daily_task_form'); };
  const handleConfirmDelete = async () => { if(deleteModal.id) { await handleDeleteDailyTaskApp(deleteModal.id); showNotification('Đã xóa công việc!'); } setDeleteModal({ isOpen: false, id: null }); };

  const handleExportExcel = async () => {
      try {
        setIsExporting(true); 
        const XLSX = await loadXLSX();
        const headers = ['Ngày', 'Bắt đầu', 'Kết thúc', 'KTV Chính', 'KTV làm cùng', 'Công việc / Thiết bị', 'Phân loại', 'Trạng thái', 'Ghi chú', 'Vật tư sử dụng'];
        const rows = filteredTasks.map(t => {
            const partsStr = t.parts && t.parts.length > 0 ? t.parts.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(', ') : '';
            const coWorkersStr = t.coWorkers && t.coWorkers.length > 0 ? t.coWorkers.map(cw => cw.name).join(', ') : '';
            return [t.date, t.startTime, t.endTime, t.technicianName, coWorkersStr, t.taskName, t.type, t.status, t.note, partsStr];
        });
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]); 
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Bao_Cao_Cong_Viec"); 
        XLSX.writeFile(workbook, `Bao_Cao_Cong_Viec_${startDate}_den_${endDate}.xlsx`);
        showNotification('Đã xuất file Excel thành công!');
      } catch (err) { 
        showNotification('Lỗi khi xuất file Excel', 'error'); 
      } finally { 
        setIsExporting(false); 
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-fade-in">
        <CustomConfirmModal isOpen={deleteModal.isOpen} title="Xóa công việc" message="Bạn có chắc chắn muốn xóa báo cáo công việc này? Hành động này không thể hoàn tác." onConfirm={handleConfirmDelete} onCancel={() => setDeleteModal({ isOpen: false, id: null })} />

        <div className="p-4 md:p-6 border-b border-slate-100 bg-white shrink-0 shadow-sm z-10">
            <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="flex items-center space-x-3 shrink-0"><button onClick={() => setView(user.role === 'admin' ? 'dashboard' : 'home')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-6 h-6 md:w-7 md:h-7 text-slate-600" /></button><h2 className="font-bold text-slate-800 text-lg md:text-2xl flex items-center">{viewTitle}</h2></div>
                <div className="flex-1 overflow-x-auto flex items-center gap-2 md:gap-3 xl:justify-end pb-2 xl:pb-0 custom-scrollbar">
                   {user.role === 'admin' && (
                      <div className="relative shrink-0">
                          <Filter className="absolute left-3 top-2.5 md:top-3.5 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                          <select value={filterTech} onChange={e => setFilterTech(e.target.value)} className="w-32 md:w-40 pl-9 md:pl-10 pr-3 py-2 md:py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm md:text-base outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-bold"><option value="all">Tất cả KTV</option>{usersList.filter(u=>u.role !== 'admin').map(u => <option key={u.id} value={u.username}>{u.name}</option>)}</select>
                      </div>
                   )}
                   {taskFilter !== 'pending' && (
                       <div className="flex items-center gap-1 md:gap-2 shrink-0">
                           <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[130px] md:w-[150px] px-2 py-2 md:py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs md:text-base outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-bold" />
                           <span className="text-slate-400">-</span>
                           <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[130px] md:w-[150px] px-2 py-2 md:py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs md:text-base outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-bold" />
                       </div>
                   )}
                   <button disabled={isExporting} onClick={handleExportExcel} className="shrink-0 bg-green-600 text-white px-3 py-2 md:py-3 rounded-xl text-sm md:text-base font-bold shadow-sm hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"><Download className="w-4 h-4 md:w-5 md:h-5"/> <span className="hidden md:inline">Xuất Excel</span></button>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 pb-20 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-4">
                <div className="flex justify-between items-center text-xs md:text-sm text-slate-500 uppercase font-bold tracking-wider mb-4"><span>{taskFilter !== 'pending' ? `Từ ${startDate} đến ${endDate}` : 'Tất cả'} ({filteredTasks.length} bản ghi)</span></div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {filteredTasks.length === 0 ? (
                       <div className="col-span-full p-12 text-center text-slate-400 text-base md:text-lg bg-white rounded-3xl border border-dashed border-slate-300">Không có báo cáo nào phù hợp.</div>
                  ) : (
                       filteredTasks.map((task) => (
                           <div key={task.id} className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md hover:border-purple-300 transition-all flex flex-col group">
                               <div className="flex justify-between items-start mb-4">
                                   <div className="pr-4"><h4 className="font-bold text-slate-800 text-base md:text-lg leading-tight mb-2">{task.taskName}</h4><span className="text-[10px] md:text-xs font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-md uppercase tracking-wider">{task.type}</span></div>
                                   <div className="flex flex-col items-end gap-2 shrink-0"><span className={`text-[10px] md:text-xs px-2.5 py-1 rounded-md font-bold shadow-sm ${task.status === 'Hoàn thành' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>{task.status}</span></div>
                               </div>
                               
                               <div className="flex flex-col gap-2 mb-4">
                                   <div className="flex items-center text-xs md:text-sm font-mono font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 w-fit"><Clock className="w-4 h-4 mr-2 text-slate-400" /> {task.date} ({task.startTime} - {task.endTime})</div>
                                   <div className="flex items-center text-xs md:text-sm font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 w-fit"><User className="w-4 h-4 mr-2 text-slate-400" /> {task.technicianName}</div>
                               </div>
                               
                               <p className="text-slate-700 text-sm md:text-base whitespace-pre-wrap flex-1 mb-4 bg-white p-3 md:p-4 border border-slate-100 rounded-xl leading-relaxed">{task.note}</p>

                               {task.parts && task.parts.length > 0 && (
                                 <div className="mb-4">
                                   <div className="text-[10px] md:text-xs text-slate-400 mb-2 flex items-center uppercase font-bold"><Package className="w-4 h-4 mr-1.5"/> Vật tư thay thế:</div>
                                   <div className="flex flex-wrap gap-2">{task.parts.map((p, idx) => (<span key={idx} className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold shadow-sm">{p.name} <span className="opacity-60 font-normal">({p.quantity} {p.unit})</span></span>))}</div>
                                 </div>
                               )}

                               {task.images && task.images.length > 0 && (
                                 <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">{task.images.map((img, idx) => (<img key={idx} src={img} onClick={() => setZoomedImage(img)} className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-xl border border-slate-200 shrink-0 cursor-pointer hover:shadow-md hover:scale-105 transition-all" alt="BC" />))}</div>
                               )}

                               <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                                   {task.status !== 'Hoàn thành' ? (<button onClick={() => { setInitialTaskData(task); setEditTaskData(null); setView('daily_task_form'); }} className="flex-1 mr-4 bg-purple-600 text-white py-3 rounded-xl text-sm md:text-base font-bold flex justify-center items-center gap-2 hover:bg-purple-700 transition-colors shadow-md active:scale-95"><PlaySquare className="w-5 h-5" /> Tiếp tục CV</button>) : (<div className="flex-1"></div>)}
                                   {/* Quyền Sửa/Xóa chỉ dành cho admin HOẶC chủ nhân của báo cáo đó nếu nó đã hoàn thành */}
                                   {(user.role === 'admin' || task.username === user.username) && (
                                       <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => startEdit(task)} className="px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 hover:border-blue-200 font-medium flex items-center"><Edit className="w-4 h-4" /><span className="hidden md:inline ml-1.5 text-sm font-bold">Sửa</span></button>
                                          <button onClick={() => setDeleteModal({ isOpen: true, id: task.id })} className="px-3 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-slate-200 hover:border-red-200 font-medium flex items-center"><Trash2 className="w-4 h-4" /><span className="hidden md:inline ml-1.5 text-sm font-bold">Xóa</span></button>
                                       </div>
                                   )}
                               </div>
                           </div>
                       ))
                  )}
                </div>
            </div>
        </div>
    </div>
  );
};

const DailyTaskFormView = ({ user, inventory, setView, showNotification, handleSaveDailyTask, initialTaskData, setInitialTaskData, editTaskData, setEditTaskData }) => {
  const nowStr = new Date().toTimeString().slice(0, 5);
  const dateStr = new Date().toISOString().split('T')[0];

  const isEditing = !!editTaskData;
  const isContinuing = !!initialTaskData;
  const sourceData = editTaskData || initialTaskData;

  const [formData, setFormData] = useState({ 
      id: sourceData ? sourceData.id : Date.now(),
      technicianName: isEditing ? editTaskData.technicianName : (user?.name || ''),
      username: isEditing ? editTaskData.username : (user?.username || ''), 
      date: isEditing ? editTaskData.date : dateStr, 
      startTime: isEditing ? editTaskData.startTime : nowStr, 
      endTime: isEditing ? editTaskData.endTime : nowStr,
      taskName: sourceData ? sourceData.taskName : '', 
      type: sourceData ? sourceData.type : 'Bảo dưỡng định kỳ', 
      note: isEditing ? editTaskData.note : (isContinuing ? `${initialTaskData.note}\n\n--- [${dateStr}] ${user.name} tiếp tục ---\n` : ''), 
      status: isEditing ? editTaskData.status : 'Hoàn thành', 
      parts: sourceData ? (sourceData.parts || []) : [], 
      images: sourceData ? (sourceData.images || []) : [] 
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

  const submitForm = () => {
      if(!formData.taskName) return showNotification('Nhập Tên công việc/Thiết bị!', 'error');
      if(!formData.note) return showNotification('Nhập Ghi chú/Nội dung CV!', 'error');
      
      handleSaveDailyTask(formData, isEditing || isContinuing);
      setInitialTaskData(null); 
      setEditTaskData(null);
  };

  const handleBack = () => { setInitialTaskData(null); setEditTaskData(null); setView(user.role === 'admin' ? 'daily_task_history' : 'home'); };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-fade-in">
      <div className="p-4 md:p-6 border-b border-slate-200 bg-white shrink-0 shadow-sm z-10">
          <div className="max-w-3xl mx-auto flex items-center space-x-4"><button onClick={handleBack} className="p-2.5 -ml-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-6 h-6 md:w-7 md:h-7 text-slate-600" /></button><h2 className="font-bold text-slate-800 text-lg md:text-2xl flex items-center"><CalendarClock className="w-6 h-6 md:w-8 md:h-8 mr-3 text-purple-600"/> {isEditing ? 'Sửa Báo Cáo Ngày' : (isContinuing ? 'Tiếp tục Công Việc' : 'Báo cáo Hằng ngày')}</h2></div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-40 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-6">
              {user.role === 'admin' && (<div className="bg-slate-100 p-4 rounded-xl border border-slate-200"><label className="block text-sm font-bold text-slate-600 mb-2">Người thực hiện (Admin nhập hộ)</label><input type="text" className="w-full p-3.5 rounded-xl border border-slate-300 bg-white text-base focus:ring-2 focus:ring-purple-500 outline-none font-bold" value={formData.technicianName} onChange={e => setFormData({...formData, technicianName: e.target.value})} /></div>)}

              <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div><label className="block text-sm md:text-base font-bold text-slate-700 mb-2">Tên Công việc / Thiết bị <span className="text-red-500">*</span></label><input type="text" autoFocus className="w-full p-4 rounded-2xl border border-slate-300 bg-slate-50 text-lg focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-bold placeholder:font-normal transition-all" placeholder="VD: Thay bóng đèn xưởng A, Đi dây mạng..." value={formData.taskName} onChange={e => setFormData({...formData, taskName: e.target.value})} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div><label className="block text-sm font-bold text-slate-600 mb-2">Ngày thực hiện</label><input type="date" className="w-full p-4 rounded-2xl border border-slate-300 text-base font-medium focus:ring-2 focus:ring-purple-500 outline-none bg-white transition-all" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                      <div>
                          <label className="block text-sm font-bold text-slate-600 mb-2">Phân loại</label>
                          <select className="w-full p-4 rounded-2xl border border-slate-300 text-base font-medium focus:ring-2 focus:ring-purple-500 outline-none bg-white transition-all" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                <option>Bảo dưỡng định kỳ</option>
                                <option>Sửa chữa đột xuất</option>
                                <option>Sửa chữa chung</option>
                                <option>Bảo trì cơ sở vật chất</option>
                                <option>Hỗ trợ sản xuất</option>
                                <option>Kiểm tra lỗi</option>
                                <option>Thay thế linh kiện</option>
                                <option>Khác</option>
                          </select>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:gap-6 bg-purple-50 p-4 md:p-6 rounded-3xl border border-purple-100">
                      <div><label className="text-sm font-bold text-purple-800 flex items-center mb-2"><Clock className="w-4 h-4 mr-1.5"/> Giờ Bắt đầu</label><input type="time" className="w-full p-3 md:p-4 rounded-2xl border border-purple-200 text-base md:text-lg text-center font-black font-mono outline-none focus:ring-2 focus:ring-purple-400 bg-white transition-all" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} /></div>
                      <div><label className="text-sm font-bold text-purple-800 flex items-center mb-2"><Clock className="w-4 h-4 mr-1.5"/> Giờ Kết thúc</label><input type="time" className="w-full p-3 md:p-4 rounded-2xl border border-purple-200 text-base md:text-lg text-center font-black font-mono outline-none focus:ring-2 focus:ring-purple-400 bg-white transition-all" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} /></div>
                  </div>
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
                <Save className="w-6 h-6 md:w-7 md:h-7" /> {isEditing ? 'Cập Nhật Báo Cáo' : (initialTaskData ? 'Lưu Tiến Độ Mới' : 'Lưu Báo Cáo Ngày')}
            </button>
          </div>
      </div>
    </div>
  );
};

const MachineLogFormView = ({ user, inventory, selectedMachine, setView, showNotification, handleSaveMachineLog, editLogData, setEditLogData, usersList }) => {
  const isEditing = !!editLogData;
  const dateStr = new Date().toISOString().split('T')[0];
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

  const submitForm = () => {
      if(!formData.note) return showNotification('Vui lòng nhập nội dung chi tiết!', 'error');
      handleSaveMachineLog(formData, machineStatus);
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
                                <option>Sửa chữa đột xuất</option>
                                <option>Sửa chữa chung</option>
                                <option>Bảo trì cơ sở vật chất</option>
                                <option>Hỗ trợ sản xuất</option>
                                <option>Kiểm tra lỗi</option>
                                <option>Thay thế linh kiện</option>
                                <option>Khác</option>
                          </select>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:gap-6 bg-blue-50 p-4 md:p-6 rounded-3xl border border-blue-100">
                      <div><label className="text-sm font-bold text-blue-800 flex items-center mb-2"><Clock className="w-4 h-4 mr-1.5"/> Giờ Bắt đầu</label><input type="time" className="w-full p-3 md:p-4 rounded-2xl border border-blue-200 text-base md:text-lg text-center font-black font-mono outline-none focus:ring-2 focus:ring-blue-400 bg-white transition-all" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} /></div>
                      <div><label className="text-sm font-bold text-blue-800 flex items-center mb-2"><Clock className="w-4 h-4 mr-1.5"/> Giờ Kết thúc</label><input type="time" className="w-full p-3 md:p-4 rounded-2xl border border-blue-200 text-base md:text-lg text-center font-black font-mono outline-none focus:ring-2 focus:ring-blue-400 bg-white transition-all" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} /></div>
                  </div>

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

              {/* Tùy chọn chuyển đổi trạng thái máy móc */}
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

// ============================================================================
// ROOT APP (HYBRID RESPONSIVE WRAPPER)
// ============================================================================
export default function App() {
  const savedSession = typeof window !== 'undefined' ? localStorage.getItem('techmaintain_active_session') : null;
  const initialUser = savedSession ? JSON.parse(savedSession) : null;

  const [user, setUser] = useState(initialUser); 
  const [view, setViewInternal] = useState(initialUser ? (initialUser.role === 'admin' ? 'dashboard' : 'home') : 'login'); 
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

  const [usersList, setUsersList] = useState(() => { if (typeof window !== 'undefined' && db) return []; const saved = typeof window !== 'undefined' ? localStorage.getItem('techmaintain_users') : null; return saved ? JSON.parse(saved) : INITIAL_USERS; });
  const [dailyTasks, setDailyTasks] = useState(() => { if (typeof window !== 'undefined' && db) return []; const saved = typeof window !== 'undefined' ? localStorage.getItem('techmaintain_daily') : null; return saved ? JSON.parse(saved) : []; });
  const [machines, setMachines] = useState(() => { if (typeof window !== 'undefined' && db) return []; const saved = typeof window !== 'undefined' ? localStorage.getItem('techmaintain_machines') : null; return saved ? JSON.parse(saved) : INITIAL_MACHINES; });
  const [logs, setLogs] = useState(() => { if (typeof window !== 'undefined' && db) return []; const saved = typeof window !== 'undefined' ? localStorage.getItem('techmaintain_logs') : null; return saved ? JSON.parse(saved) : []; });
  const [inventory, setInventory] = useState(() => { if (typeof window !== 'undefined' && db) return []; const saved = typeof window !== 'undefined' ? localStorage.getItem('techmaintain_inventory') : null; return saved ? JSON.parse(saved) : INITIAL_INVENTORY; });
  const [utilityLogs, setUtilityLogs] = useState(() => { if (typeof window !== 'undefined' && db) return []; const saved = typeof window !== 'undefined' ? localStorage.getItem('techmaintain_utility') : null; return saved ? JSON.parse(saved) : []; });
  const [googleSheetUrl, setGoogleSheetUrl] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('gs_url') || '' : '');
  
  const [categoryList, setCategoryList] = useState(() => { 
      if (typeof window !== 'undefined' && db) return []; 
      const saved = typeof window !== 'undefined' ? localStorage.getItem('techmaintain_categories') : null; 
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES; 
  });

  const [fbUser, setFbUser] = useState(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(!!db);

  const setView = (newView, replace = false) => {
    if (newView === view) return;
    if (replace) window.history.replaceState({ view: newView }, '', ''); else window.history.pushState({ view: newView }, '', '');
    setViewInternal(newView);
  };

  useEffect(() => {
    if (!initialUser) {
        window.history.replaceState({ view: 'login' }, '', '');
    }
    const handlePopState = (event) => {
        if (event.state && event.state.view) {
            let nextView = event.state.view;
            if (user && nextView === 'login') { nextView = user.role === 'admin' ? 'dashboard' : 'home'; window.history.replaceState({ view: nextView }, '', ''); }
            setViewInternal(nextView);
        }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, initialUser]);

  useEffect(() => {
    if (!auth) { setIsCloudSyncing(false); return; }
    const initAuth = async () => {
      try {
        if (isCustomConfigured) await signInAnonymously(auth);
        else if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
        else await signInAnonymously(auth);
      } catch (error) { console.error("Lỗi xác thực Firebase:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser || !db) return;
    const handleSnapError = (error) => { console.error("Firebase Sync Error:", error); setIsCloudSyncing(false); };

    const unsubMachines = onSnapshot(collection(db, 'artifacts', safeAppId, 'public', 'data', 'machines'), (snap) => setMachines(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleSnapError);
    const unsubInventory = onSnapshot(collection(db, 'artifacts', safeAppId, 'public', 'data', 'inventory'), (snap) => setInventory(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleSnapError);
    const unsubLogs = onSnapshot(collection(db, 'artifacts', safeAppId, 'public', 'data', 'logs'), (snap) => setLogs(snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => b.id - a.id)), handleSnapError);
    const unsubUsers = onSnapshot(collection(db, 'artifacts', safeAppId, 'public', 'data', 'users'), (snap) => { if(snap.empty) { INITIAL_USERS.forEach(u => setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'users', u.id), u)); } else setUsersList(snap.docs.map(d => ({ ...d.data(), id: d.id }))); }, handleSnapError);
    const unsubDaily = onSnapshot(collection(db, 'artifacts', safeAppId, 'public', 'data', 'daily_tasks'), (snap) => { setDailyTasks(snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => b.id - a.id)); }, handleSnapError);
    const unsubUtility = onSnapshot(collection(db, 'artifacts', safeAppId, 'public', 'data', 'utility_logs'), (snap) => { setUtilityLogs(snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => b.id - a.id)); }, handleSnapError);
    const unsubSettings = onSnapshot(collection(db, 'artifacts', safeAppId, 'public', 'data', 'settings'), (snap) => { const sData = snap.docs.find(d => d.id === 'general'); if (sData && sData.data().gs_url) setGoogleSheetUrl(sData.data().gs_url); setIsCloudSyncing(false); }, handleSnapError);

    const unsubCategories = onSnapshot(doc(db, 'artifacts', safeAppId, 'public', 'data', 'settings', 'categories'), (docSnap) => {
        if (docSnap.exists()) {
            setCategoryList(docSnap.data().list || []);
        } else {
            setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'settings', 'categories'), { list: INITIAL_CATEGORIES }).catch(e => console.error(e));
            setCategoryList(INITIAL_CATEGORIES);
        }
    }, handleSnapError);

    return () => { unsubMachines(); unsubInventory(); unsubLogs(); unsubUsers(); unsubDaily(); unsubUtility(); unsubSettings(); unsubCategories(); };
  }, [fbUser, db]);

  const saveUserData = async (uObj) => { if (db && fbUser) await setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'users', uObj.id), uObj); else { const nList = usersList.map(u => u.id === uObj.id ? uObj : u); if(!nList.find(u=>u.id===uObj.id)) nList.push(uObj); setUsersList(nList); localStorage.setItem('techmaintain_users', JSON.stringify(nList)); } };
  const handleDeleteUser = async (id) => { if (db && fbUser) await deleteDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'users', id)); else { const nList = usersList.filter(u => u.id !== id); setUsersList(nList); localStorage.setItem('techmaintain_users', JSON.stringify(nList)); } };
  const saveMachineData = async (newMachineObj) => { if (db && fbUser) await setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'machines', newMachineObj.id), newMachineObj); else { const nList = machines.map(m => m.id === newMachineObj.id ? newMachineObj : m); if(!nList.find(m=>m.id===newMachineObj.id)) nList.push(newMachineObj); setMachines(nList); localStorage.setItem('techmaintain_machines', JSON.stringify(nList)); } }; 
  const handleDeleteMachineApp = async (id) => { if (db && fbUser) await deleteDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'machines', id)); else { const nList = machines.filter(m => m.id !== id); setMachines(nList); localStorage.setItem('techmaintain_machines', JSON.stringify(nList)); } };
  const saveInventoryData = async (newInvObj) => { if (db && fbUser) await setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'inventory', newInvObj.id), newInvObj); else { const nList = inventory.map(i => i.id === newInvObj.id ? newInvObj : i); if(!nList.find(i=>i.id===newInvObj.id)) nList.push(newInvObj); setInventory(nList); localStorage.setItem('techmaintain_inventory', JSON.stringify(nList)); } };
  const saveLogData = async (logEntry) => { if (db && fbUser) await setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'logs', String(logEntry.id)), logEntry); else { const nList = logs.find(l=>l.id===logEntry.id) ? logs.map(l=>l.id===logEntry.id?logEntry:l) : [logEntry, ...logs]; setLogs(nList); localStorage.setItem('techmaintain_logs', JSON.stringify(nList)); } };
  const handleDeleteLogApp = async (id) => { if (db && fbUser) await deleteDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'logs', String(id))); else { const nList = logs.filter(l => l.id !== id); setLogs(nList); localStorage.setItem('techmaintain_logs', JSON.stringify(nList)); } };
  const saveDailyTaskData = async (taskObj) => { if (db && fbUser) await setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'daily_tasks', String(taskObj.id)), taskObj); else { const nList = dailyTasks.find(t=>t.id===taskObj.id) ? dailyTasks.map(t=>t.id===taskObj.id?taskObj:t) : [taskObj, ...dailyTasks]; setDailyTasks(nList); localStorage.setItem('techmaintain_daily', JSON.stringify(nList)); } };
  const handleDeleteDailyTaskApp = async (id) => { if (db && fbUser) await deleteDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'daily_tasks', String(id))); else { const nList = dailyTasks.filter(t => t.id !== id); setDailyTasks(nList); localStorage.setItem('techmaintain_daily', JSON.stringify(nList)); } };
  const saveUtilityLogData = async (logObj) => { if (db && fbUser) await setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'utility_logs', String(logObj.id)), logObj); else { const nList = [logObj, ...utilityLogs]; setUtilityLogs(nList); localStorage.setItem('techmaintain_utility', JSON.stringify(nList)); } };

  const saveCategoryListData = async (newList) => { 
      if (db && fbUser) await setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'settings', 'categories'), { list: newList }); 
      else { setCategoryList(newList); localStorage.setItem('techmaintain_categories', JSON.stringify(newList)); } 
  };

  const handleLogin = (username, password) => {
    const foundUser = usersList.find(u => u.username === username && u.password === password);
    if (foundUser) { 
        localStorage.setItem('techmaintain_active_session', JSON.stringify(foundUser));
        setUser(foundUser); 
        showNotification(`Đăng nhập thành công!`);
        setView(foundUser.role === 'admin' ? 'dashboard' : 'home', true);
    } 
    else showNotification('Tài khoản hoặc mật khẩu không đúng!', 'error');
  };

  const handleLogout = () => { 
      localStorage.removeItem('techmaintain_active_session');
      setUser(null); 
      setView('login', true); 
      setSelectedMachine(null); 
  };
  
  const handleScanSuccess = (id) => { if (!id) return; const machine = machines.find(m => m.id === id); if (machine) { setSelectedMachine(machine); setView('details'); showNotification(`Quét thành công`); } else if (typeof id === 'string' && id.length > 2) if (!notification) showNotification(`Mã không hợp lệ`, 'error'); };

  const pushToGoogleSheet = async (logData) => { 
      if (!googleSheetUrl) return;
      try {
          await fetch(googleSheetUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(logData)
          });
          console.log(`Đã đẩy dữ liệu ${logData.formType} lên Google Sheet.`);
      } catch (error) {
          console.error("Lỗi khi đẩy lên Google Sheet:", error);
      }
  };
  
  const handleSaveDailyTask = async (newLog, isEditingRecord = false) => { 
      const entryId = isEditingRecord && editTaskData ? editTaskData.id : (initialTaskData ? initialTaskData.id : Date.now()); 
      const entry = { ...newLog, id: entryId, formType: 'daily_task' }; 
      await saveDailyTaskData(entry); 
      
      if (!isEditingRecord && !initialTaskData) { 
          for (const usedPart of entry.parts) { 
              const foundPart = inventory.find(i => i.name === usedPart.name); 
              if (foundPart) await saveInventoryData({ ...foundPart, quantity: Math.max(0, foundPart.quantity - Number(usedPart.quantity)) }); 
          } 
          if(googleSheetUrl) pushToGoogleSheet(entry); 
      } 
      
      showNotification(isEditingRecord ? 'Đã lưu cập nhật công việc!' : 'Đã lưu báo cáo hằng ngày!'); 
      setView(user.role === 'admin' ? 'daily_task_history' : 'home'); 
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
               if (db && fbUser) await deleteDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'utility_logs', String(utilityEditItem.id)));
               else setUtilityLogs(prev => prev.filter(l => l.id !== utilityEditItem.id));
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
                  note: entry.note,
                  status: entry.status,
                  parts: entry.parts || [],
                  images: entry.images || []
              };
              await saveDailyTaskData(taskEntry);
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
         <div className="w-full max-w-md md:max-w-none h-full relative overflow-hidden"><LoginView handleLogin={handleLogin} isCloudSyncing={isCloudSyncing} db={db} /></div>
         {notification && (
            <div className={`absolute top-4 left-4 right-4 md:max-w-md md:mx-auto p-4 md:p-5 rounded-2xl shadow-2xl flex items-center space-x-3 z-50 animate-bounce-in ${notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}>
               {notification.type === 'error' ? <AlertCircle className="w-6 h-6 shrink-0"/> : <CheckCircle className="w-6 h-6 shrink-0"/>}
               <span className="font-bold md:text-lg">{notification.msg}</span>
            </div>
         )}
      </div>
  );

  return (
    // ROOT WRAPPER HYBRID RESPONSIVE
    <div className="fixed inset-0 bg-slate-200 flex justify-center overflow-hidden font-sans text-slate-800">
      <div className="w-full max-w-[1600px] h-full bg-slate-50 flex flex-col relative overflow-hidden md:shadow-[0_0_50px_rgba(0,0,0,0.1)] md:border-x border-slate-300">
        <div className="h-1 md:h-1.5 bg-blue-600 w-full shrink-0 z-50"></div>
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {view === 'dashboard' && <DashboardView user={user} machines={machines} dailyTasks={dailyTasks} utilityLogs={utilityLogs} logs={logs} handleLogout={handleLogout} setView={setView} db={db} setMachineFilter={setMachineFilter} setTaskFilter={setTaskFilter} />}
          {view === 'user_management' && <UserManagementView usersList={usersList} setView={setView} showNotification={showNotification} saveUserData={saveUserData} handleDeleteUser={handleDeleteUser} />}
          {view === 'machines' && <MachineManagementView machines={machines} setView={setView} showNotification={showNotification} saveMachineData={saveMachineData} machineFilter={machineFilter} handleDeleteMachineApp={handleDeleteMachineApp} user={user} categoryList={categoryList} saveCategoryListData={saveCategoryListData} />}
          {view === 'settings' && <SettingsView setView={setView} showNotification={showNotification} googleSheetUrl={googleSheetUrl} setGoogleSheetUrl={setGoogleSheetUrl} />}
          {view === 'inventory' && <InventoryView inventory={inventory} setView={setView} showNotification={showNotification} saveInventoryData={saveInventoryData} user={user} db={db} />}
          {view === 'home' && <HomeView user={user} machines={machines} dailyTasks={dailyTasks} logs={logs} setView={setView} handleLogout={handleLogout} db={db} setMachineFilter={setMachineFilter} setTaskFilter={setTaskFilter} setInitialTaskData={setInitialTaskData} setEditTaskData={setEditTaskData} />}
          {view === 'daily_task_form' && <DailyTaskFormView user={user} inventory={inventory} setView={setView} showNotification={showNotification} handleSaveDailyTask={handleSaveDailyTask} initialTaskData={initialTaskData} setInitialTaskData={setInitialTaskData} editTaskData={editTaskData} setEditTaskData={setEditTaskData}/>}
          {view === 'daily_task_history' && <DailyTaskHistoryView dailyTasks={dailyTasks} usersList={usersList} setView={setView} user={user} taskFilter={taskFilter} setInitialTaskData={setInitialTaskData} setEditTaskData={setEditTaskData} handleDeleteDailyTaskApp={handleDeleteDailyTaskApp} showNotification={showNotification} setZoomedImage={setZoomedImage} />}
          {view === 'meter_menu' && <MeterMenuView setView={setView} user={user} setUtilityMode={setUtilityMode} />}
          {view === 'utility_form' && <UtilityFormView user={user} setView={setView} showNotification={showNotification} handleSaveUtilityLog={handleSaveUtilityLog} editData={utilityEditItem} setEditData={setUtilityEditItem} utilityLogs={utilityLogs} mode={utilityMode} />}
          {view === 'utility_history' && <UtilityHistoryView utilityLogs={utilityLogs} usersList={usersList} setView={setView} user={user} setEditData={setUtilityEditItem} setUtilityMode={setUtilityMode} setZoomedImage={setZoomedImage} />}
          {view === 'scanner' && <ScannerView user={user} setView={setView} handleScanSuccess={handleScanSuccess} machines={machines} />}
          {view === 'manual_select' && <ManualSelectView machines={machines} setView={setView} handleScanSuccess={handleScanSuccess} machineFilter={machineFilter} />}
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
                                           <div className="text-sm text-slate-500 mt-3 flex items-center bg-slate-50 px-3 py-1.5 rounded-lg w-fit"><Clock className="w-4 h-4 mr-2"/> {log.date}</div>
                                       </div>
                                    </div>
                                    <p className="text-slate-700 text-base md:text-lg whitespace-pre-wrap flex-1 mb-4">{log.note}</p>
                                    
                                    {/* HIỂN THỊ VẬT TƯ ĐÃ SỬ DỤNG */}
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
               />
          )}
        </div>
        
        {/* COMPONENT MODAL XEM ẢNH ZOOM */}
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