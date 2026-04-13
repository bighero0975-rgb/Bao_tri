import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Wrench, History, ArrowLeft, Save, CheckCircle, AlertCircle, User, Package, LogOut, FileSpreadsheet, Lock, PieChart, BarChart3, Settings, Printer, Plus, X, Camera, Search, MapPin, ListFilter, Image as ImageIcon, Trash2, Boxes, Edit, Download, Upload, Database, Cloud, CloudOff, CalendarClock, Clock, Filter, Zap, Droplets, ChevronDown, ChevronUp, AlertTriangle, Calculator } from 'lucide-react';

// --- FIREBASE CLOUD DATABASE SETUP ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

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

// FIX: Loại bỏ các ký tự dấu / và . trong appId để tránh lỗi đường dẫn Firebase (Invalid collection reference)
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'techmaintain-app';
const safeAppId = rawAppId.replace(/[\/\.]/g, '_');

const app = firebaseConfig ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

// --- MOCK DATA MẶC ĐỊNH ---
const INITIAL_MACHINES = [
  { id: 'M-101', name: 'Máy Phay CNC 3 Trục', model: 'Haas VF-2', location: 'Xưởng A', department: 'Cơ Khí', status: 'operational' },
];

const INITIAL_INVENTORY = [
  { id: 'P-101', name: 'Dầu máy CNC', unit: 'Lít', quantity: 45 },
];

const INITIAL_USERS = [
  { id: 'admin', username: 'admin', password: '123', name: 'Quản Lý Trưởng', role: 'admin' },
  { id: 'tech1', username: 'ktv1', password: '123', name: 'Nguyễn Văn KTV', role: 'maintenance' }
];

// --- Hàm tải thư viện xử lý Excel (SheetJS) ---
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

// --- COMPONENT CAMERA THẬT ---
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
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      {error ? (
        <div className="text-white text-center p-4 z-20"><AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-500" /><p>{error}</p></div>
      ) : (<><video ref={videoRef} playsInline muted className="absolute w-full h-full object-cover" /><canvas ref={canvasRef} className="hidden" /></>)}
      <div className="absolute inset-0 border-[50px] border-black/50 flex items-center justify-center pointer-events-none z-10"><div className="w-64 h-64 border-4 border-blue-500/80 rounded-3xl relative shadow-[0_0_100px_rgba(59,130,246,0.5)]"><div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-[scan_2s_infinite]"></div></div></div>
    </div>
  );
};

// ============================================================================
// CÁC THÀNH PHẦN GIAO DIỆN
// ============================================================================

const LoginView = ({ handleLogin, isCloudSyncing, db }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-900 text-white animate-fade-in overflow-y-auto">
      <div className="w-full max-w-xs space-y-8 my-auto">
        <div className="text-center space-y-2">
          <div className="bg-blue-600 p-4 rounded-2xl inline-block shadow-lg shadow-blue-500/30">
            <Wrench className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold">TechMaintain</h1>
          <p className="text-slate-400 text-sm">Hệ thống quản lý bảo trì & công việc</p>
        </div>
        
        <div className="space-y-4 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative">
            <h3 className="text-lg font-bold text-center mb-4">Đăng Nhập Hệ Thống</h3>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tên đăng nhập</label>
              <div className="relative">
                 <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                 <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-600 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder:text-slate-600" placeholder="Nhập tài khoản..." />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Mật khẩu</label>
              <div className="relative">
                 <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                 <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-600 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder:text-slate-600" placeholder="***" />
              </div>
            </div>
            <button onClick={() => handleLogin(username, password)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg mt-2">Đăng Nhập</button>
        </div>
        
        <div className="flex justify-center items-center gap-2 mt-8 text-xs font-medium">
           {isCloudSyncing ? (<><Cloud className="w-4 h-4 text-blue-500 animate-pulse" /><span className="text-blue-400">Đang dò tìm kết nối...</span></>) : db ? (<><Cloud className="w-4 h-4 text-green-500" /><span className="text-green-400">Đã kết nối dữ liệu Đám mây</span></>) : (<><CloudOff className="w-4 h-4 text-yellow-500" /><span className="text-yellow-500">Chế độ Offline (Cục bộ)</span></>)}
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ user, machines, dailyTasks, utilityLogs, handleLogout, setView, db }) => (
  <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
    <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shadow-sm z-10 shrink-0">
      <div><h1 className="font-bold text-xl text-slate-800">Dashboard</h1><p className="text-xs text-slate-500">Admin: {user.name}</p></div>
      <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-2"><LogOut className="w-5 h-5" /></button>
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="grid grid-cols-2 gap-3">
         <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
            <p className="text-blue-600 text-xs uppercase font-bold">Tổng thiết bị</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{machines.length}</p>
         </div>
         <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm cursor-pointer" onClick={() => setView('daily_task_history')}>
            <p className="text-purple-600 text-xs uppercase font-bold">Báo cáo Ngày</p>
            <p className="text-2xl font-bold text-purple-800 mt-1">{dailyTasks.length}</p>
         </div>
         <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-100 shadow-sm col-span-2 flex justify-between items-center cursor-pointer" onClick={() => setView('utility_history')}>
            <div><p className="text-cyan-600 text-xs uppercase font-bold">Sổ Điện Nước</p><p className="text-2xl font-bold text-cyan-800 mt-1">{utilityLogs?.length || 0} <span className="text-sm font-normal text-cyan-600">bản ghi</span></p></div>
            <div className="flex gap-2"><Zap className="w-6 h-6 text-yellow-500"/><Droplets className="w-6 h-6 text-blue-400"/></div>
         </div>
      </div>
      
      <div>
        <h3 className="font-bold text-slate-800 mb-3 flex items-center"><Settings className="w-4 h-4 mr-2" /> Quản trị hệ thống</h3>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
           <button onClick={() => setView('user_management')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
              <div className="flex items-center space-x-3"><div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><User className="w-5 h-5" /></div><div className="text-left"><p className="font-medium text-slate-800">Quản lý Tài khoản (KTV)</p><p className="text-xs text-slate-500">Tạo tài khoản & Mật khẩu đăng nhập</p></div></div><ArrowLeft className="w-5 h-5 rotate-180 text-slate-300" />
           </button>
           <button onClick={() => setView('machines')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
              <div className="flex items-center space-x-3"><div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Database className="w-5 h-5" /></div><div className="text-left"><p className="font-medium text-slate-800">Quản lý Thiết Bị</p><p className="text-xs text-slate-500">Xem danh sách, nhập/xuất Excel</p></div></div><ArrowLeft className="w-5 h-5 rotate-180 text-slate-300" />
           </button>
           <button onClick={() => setView('inventory')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
              <div className="flex items-center space-x-3"><div className="bg-orange-100 p-2 rounded-lg text-orange-600"><Boxes className="w-5 h-5" /></div><div className="text-left"><p className="font-medium text-slate-800">Kho Vật Tư</p><p className="text-xs text-slate-500">Xem tồn kho, nhập/xuất Excel</p></div></div><ArrowLeft className="w-5 h-5 rotate-180 text-slate-300" />
           </button>
           <button onClick={() => setView('daily_task_history')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
              <div className="flex items-center space-x-3"><div className="bg-pink-100 p-2 rounded-lg text-pink-600"><CalendarClock className="w-5 h-5" /></div><div className="text-left"><p className="font-medium text-slate-800">Sổ Ghi Công Việc</p><p className="text-xs text-slate-500">Xem Báo cáo công việc hằng ngày</p></div></div><ArrowLeft className="w-5 h-5 rotate-180 text-slate-300" />
           </button>
           <button onClick={() => setView('utility_history')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
              <div className="flex items-center space-x-3"><div className="bg-cyan-100 p-2 rounded-lg text-cyan-600"><Droplets className="w-5 h-5" /></div><div className="text-left"><p className="font-medium text-slate-800">Sổ Ghi Điện Nước</p><p className="text-xs text-slate-500">Xem lịch sử chỉ số điện, nước</p></div></div><ArrowLeft className="w-5 h-5 rotate-180 text-slate-300" />
           </button>
           <button onClick={() => setView('settings')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
              <div className="flex items-center space-x-3"><div className="bg-green-100 p-2 rounded-lg text-green-600"><FileSpreadsheet className="w-5 h-5" /></div><div className="text-left"><p className="font-medium text-slate-800">Cài đặt Google Sheet</p><p className="text-xs text-slate-500">Cấu hình liên kết tự động xuất báo cáo</p></div></div><ArrowLeft className="w-5 h-5 rotate-180 text-slate-300" />
           </button>
           <button onClick={() => setView('home')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors bg-blue-50/30">
              <div className="flex items-center space-x-3"><div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Wrench className="w-5 h-5" /></div><div className="text-left"><p className="font-medium text-blue-800">Chế độ Kỹ thuật viên</p><p className="text-xs text-blue-600/70">Vào giao diện quét QR & Báo cáo</p></div></div><ArrowLeft className="w-5 h-5 rotate-180 text-slate-300" />
           </button>
        </div>
      </div>
    </div>
  </div>
);

// Quản lý Nhân sự (Tài khoản Đăng nhập)
const UserManagementView = ({ usersList, setView, showNotification, saveUserData, handleDeleteUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ id: '', username: '', password: '', name: '', role: 'maintenance' });
  const [isAdding, setIsAdding] = useState(false);

  const filteredUsers = usersList.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSave = async () => {
      if (!editForm.username || !editForm.password || !editForm.name) {
          return showNotification('Vui lòng điền đủ Tên ĐN, Mật khẩu, Họ tên!', 'error');
      }
      // Check duplicate username if adding new
      if (isAdding && usersList.find(u => u.username === editForm.username)) {
          return showNotification('Tên đăng nhập đã tồn tại!', 'error');
      }

      await saveUserData({
          id: editForm.id || `U-${Date.now()}`,
          username: editForm.username,
          password: editForm.password,
          name: editForm.name,
          role: editForm.role
      });

      showNotification(isAdding ? 'Đã tạo tài khoản KTV mới' : 'Đã cập nhật tài khoản');
      setEditingId(null);
      setIsAdding(false);
  };

  const startAdd = () => {
      setIsAdding(true);
      setEditingId(null);
      setEditForm({ id: '', username: '', password: '', name: '', role: 'maintenance' });
  }

  const startEdit = (u) => {
      setIsAdding(false);
      setEditingId(u.id);
      setEditForm(u);
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 border-b border-slate-200 shrink-0 shadow-sm">
        <div className="flex items-center space-x-3 mb-4"><button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6" /></button><h2 className="font-bold text-slate-800 text-lg">Quản lý Tài Khoản</h2></div>
        <div className="flex gap-2 mb-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input type="text" placeholder="Tìm tài khoản..." className="w-full pl-9 pr-3 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            <button onClick={startAdd} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center shadow-sm"><User className="w-4 h-4 mr-1"/> Tạo mới</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(isAdding || editingId) && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm mb-4 animate-fade-in">
                <h3 className="font-bold text-blue-800 mb-3 text-sm">{isAdding ? 'Tạo tài khoản KTV mới' : 'Cập nhật tài khoản'}</h3>
                <div className="space-y-3">
                    <div><label className="text-xs font-medium text-slate-600">Tên đăng nhập</label><input disabled={!isAdding && editForm.id === 'admin'} value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full mt-1 p-2 border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="VD: ktv_nguyen" /></div>
                    <div><label className="text-xs font-medium text-slate-600">Mật khẩu</label><input value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="w-full mt-1 p-2 border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="***" /></div>
                    <div><label className="text-xs font-medium text-slate-600">Họ và Tên</label><input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full mt-1 p-2 border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Họ tên đầy đủ" /></div>
                    <div><label className="text-xs font-medium text-slate-600">Quyền hạn</label>
                        <select disabled={editForm.id === 'admin'} value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full mt-1 p-2 border border-blue-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="maintenance">Kỹ thuật viên</option><option value="admin">Quản lý (Admin)</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-blue-100">
                    <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-4 py-2 bg-white text-slate-600 rounded-lg text-sm border border-slate-200 font-medium">Hủy</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow flex items-center"><Save className="w-4 h-4 mr-1"/> Lưu</button>
                </div>
            </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u, index) => (
              <div key={u.id} className={`p-4 flex justify-between items-center ${index !== filteredUsers.length -1 ? 'border-b border-slate-100' : ''}`}>
                <div className="flex items-center space-x-3">
                   <div className={`p-2 rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                       {u.role === 'admin' ? <Lock className="w-4 h-4" /> : <User className="w-4 h-4" />}
                   </div>
                   <div>
                       <h4 className="font-bold text-slate-800">{u.name}</h4>
                       <p className="text-xs text-slate-500 font-mono mt-0.5">User: {u.username} • Mật khẩu: {u.password}</p>
                   </div>
                </div>
                <div className="flex gap-1">
                   <button onClick={() => startEdit(u)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-100 rounded-lg transition-colors border border-slate-100"><Edit className="w-4 h-4" /></button>
                   {u.id !== 'admin' && <button onClick={() => {if(window.confirm('Xóa tài khoản này?')) handleDeleteUser(u.id)}} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-100 rounded-lg transition-colors border border-slate-100"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            ))
          ) : (<div className="p-8 text-center text-slate-400 text-sm">Không tìm thấy tài khoản.</div>)}
        </div>
      </div>
    </div>
  );
};

const MachineManagementView = ({ machines, setView, showNotification, saveMachineData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const filteredMachines = machines.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = async () => {
    try {
      setIsLoading(true);
      const XLSX = await loadXLSX();
      const headers = ['Mã Thiết Bị', 'Tên Thiết Bị', 'Model', 'Vị Trí', 'Đơn Vị', 'Trạng Thái'];
      const rows = machines.map(m => [m.id, m.name, m.model || '', m.location || '', m.department || '', m.status || 'operational']);
      
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Danh_Sach_May");
      
      XLSX.writeFile(workbook, `Danh_Sach_Thiet_Bi_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification('Đã xuất file Excel thành công!');
    } catch (err) {
      showNotification('Lỗi khi xuất file Excel', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const XLSX = await loadXLSX();
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
          if (rows.length < 2) throw new Error("File trống hoặc sai định dạng");
          
          const newMachinesList = [];
          for (let i = 1; i < rows.length; i++) {
            const cols = rows[i];
            if (!cols || cols.length === 0) continue;
            const id = cols[0] ? String(cols[0]).trim() : '';
            if (id) {
               newMachinesList.push({
                   id: id, name: cols[1] ? String(cols[1]).trim() : '', model: cols[2] ? String(cols[2]).trim() : '', location: cols[3] ? String(cols[3]).trim() : '', department: cols[4] ? String(cols[4]).trim() : '', status: cols[5] ? String(cols[5]).trim() : 'operational'
               });
            }
          }

          let addedCount = 0; let updatedCount = 0;
          const promises = newMachinesList.map(newM => {
              const existingIndex = machines.findIndex(item => item.id === newM.id);
              if (existingIndex > -1) updatedCount++; else addedCount++;
              return saveMachineData({ ...(machines[existingIndex] || {}), ...newM });
          });
          await Promise.all(promises);
          showNotification(`Đã đồng bộ: Cập nhật ${updatedCount}, Thêm mới ${addedCount}`, 'success');
        } catch (err) {
          showNotification('Lỗi đọc dữ liệu file Excel.', 'error');
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      showNotification('Lỗi tải bộ giải mã Excel', 'error');
      setIsLoading(false);
    }
    e.target.value = null; 
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 border-b border-slate-200 shrink-0 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6" /></button>
                <h2 className="font-bold text-slate-800 text-lg">Quản lý Thiết Bị</h2>
            </div>
            {isLoading && <span className="text-xs text-blue-500 font-medium animate-pulse">Đang xử lý...</span>}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
              <button disabled={isLoading} onClick={handleExportExcel} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">
                  <Download className="w-4 h-4 text-blue-600" /> Tải File
              </button>
              
              <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImportExcel} />
              <button disabled={isLoading} onClick={() => fileInputRef.current.click()} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">
                  <Upload className="w-4 h-4 text-green-600" /> Nhập File
              </button>
          </div>
        </div>
        
        <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Tìm kiếm mã hoặc tên máy..." className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex justify-between items-center text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">
            <span>Danh sách thiết bị ({filteredMachines.length})</span>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {filteredMachines.length > 0 ? (
            filteredMachines.map((m, index) => (
              <div key={m.id} className={`p-4 flex justify-between items-center ${index !== filteredMachines.length -1 ? 'border-b border-slate-100' : ''}`}>
                <div>
                  <h4 className="font-bold text-slate-800">{m.name}</h4>
                  <div className="text-xs text-slate-500 font-mono mt-1 flex items-center">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 mr-2">{m.id}</span>
                      {m.department && <span className="truncate max-w-[150px]">- {m.department}</span>}
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${m.status === 'operational' ? 'bg-green-500' : m.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">Không tìm thấy thiết bị. Hãy tải file Excel lên.</div>
          )}
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

  const startEdit = (item) => {
      setEditingId(item.id);
      setEditForm({ name: item.name, unit: item.unit, quantity: item.quantity });
  };

  const saveEdit = async () => {
      if (!editForm.name || !editForm.unit || editForm.quantity === '') { showNotification('Vui lòng nhập đủ thông tin!', 'error'); return; }
      
      const existingItem = inventory.find(i => i.id === editingId);
      if (existingItem) {
          await saveInventoryData({ ...existingItem, name: editForm.name, unit: editForm.unit, quantity: Number(editForm.quantity) });
          showNotification('Đã cập nhật thành công!');
      }
      setEditingId(null);
  };

  const handleExportExcel = async () => {
    try {
      setIsLoading(true);
      const XLSX = await loadXLSX();
      const headers = ['Mã Vật Tư', 'Tên Vật Tư', 'Đơn Vị', 'Số Lượng'];
      const rows = inventory.map(item => [item.id, item.name, item.unit, item.quantity]);
      
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "KhoVatTu");
      
      XLSX.writeFile(workbook, `Ton_Kho_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification('Đã xuất file Excel thành công!');
    } catch (err) {
      showNotification('Lỗi khi xuất file Excel', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const XLSX = await loadXLSX();
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
          if (rows.length < 2) throw new Error("File trống hoặc sai định dạng");
          
          const newInvList = [];
          for (let i = 1; i < rows.length; i++) {
            const cols = rows[i];
            if (!cols || cols.length === 0) continue;
            const id = cols[0] ? String(cols[0]).trim() : '';
            const name = cols[1] ? String(cols[1]).trim() : '';
            const unit = cols[2] ? String(cols[2]).trim() : '';
            const qty = cols[3] !== undefined ? Number(cols[3]) : 0;

            if (name || id) {
               newInvList.push({ id: id, name: name, unit: unit, quantity: isNaN(qty) ? 0 : qty });
            }
          }

          let addedCount = 0; let updatedCount = 0;
          const promises = newInvList.map(newItem => {
              let existingItem = inventory.find(item => item.id === newItem.id && newItem.id !== '');
              if (!existingItem) existingItem = inventory.find(item => item.name.toLowerCase() === newItem.name.toLowerCase());
              if (existingItem) { updatedCount++; return saveInventoryData({ ...existingItem, quantity: newItem.quantity, unit: newItem.unit }); } 
              else { addedCount++; return saveInventoryData({ id: newItem.id || `P-${Date.now()}-${Math.floor(Math.random()*1000)}`, name: newItem.name, unit: newItem.unit, quantity: newItem.quantity }); }
          });
          await Promise.all(promises);
          showNotification(`Đã đồng bộ: Cập nhật ${updatedCount}, Thêm ${addedCount}`, 'success');
        } catch (err) {
          showNotification('Lỗi đọc dữ liệu file Excel.', 'error');
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      showNotification('Lỗi tải bộ giải mã Excel', 'error');
      setIsLoading(false);
    }
    e.target.value = null; 
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 border-b border-slate-200 shrink-0 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3"><button onClick={() => setView(user.role === 'admin' ? 'dashboard' : 'home')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6" /></button><h2 className="font-bold text-slate-800 text-lg">Kho Vật Tư</h2></div>
            {isLoading && <span className="text-xs text-blue-500 font-medium animate-pulse">Đang xử lý...</span>}
        </div>
        {user.role === 'admin' && (
          <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                  <button disabled={isLoading} onClick={handleExportExcel} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"><Download className="w-4 h-4 text-blue-600" /> Tải File</button>
                  <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImportExcel} />
                  <button disabled={isLoading} onClick={() => fileInputRef.current.click()} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"><Upload className="w-4 h-4 text-green-600" /> Nhập Kho</button>
              </div>
          </div>
        )}
        <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input type="text" placeholder="Tìm kiếm trong kho..." className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {user.role === 'admin' && (
          <div className="bg-slate-100/50 p-3 rounded-xl border border-dashed border-slate-300 mb-2">
            <h3 className="text-[11px] uppercase font-bold text-slate-500 mb-2">Thêm nhanh thủ công</h3>
            <div className="flex flex-col gap-2">
              <input placeholder="Tên vật tư (VD: Dầu nhớt)" className="w-full p-2 border border-slate-300 rounded-lg text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <div className="flex gap-2">
                  <input placeholder="Đơn vị" className="w-1/2 p-2 border border-slate-300 rounded-lg text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
                  <input placeholder="SL" type="number" className="w-1/4 p-2 border border-slate-300 rounded-lg text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} />
                  <button onClick={handleAddOrUpdate} className="w-1/4 bg-slate-800 text-white p-2 rounded-lg font-medium text-sm hover:bg-slate-700 flex justify-center items-center shadow-sm"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center text-xs text-slate-500 uppercase font-bold tracking-wider mb-2"><span>Danh sách ({filteredInventory.length})</span></div>
        
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {filteredInventory.length > 0 ? (
            filteredInventory.map((item, index) => (
              <div key={item.id} className={`p-4 flex flex-col ${index !== filteredInventory.length -1 ? 'border-b border-slate-100' : ''}`}>
                {editingId === item.id ? (
                  <div className="flex flex-col gap-2 bg-blue-50/50 p-3 rounded-lg border border-blue-200 shadow-inner">
                    <input className="w-full p-2 border border-slate-300 rounded-lg text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Tên vật tư" />
                    <div className="flex gap-2">
                        <input className="w-1/2 p-2 border border-slate-300 rounded-lg text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.unit} onChange={e => setEditForm({...editForm, unit: e.target.value})} placeholder="Đơn vị" />
                        <input className="w-1/2 p-2 border border-slate-300 rounded-lg text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" type="number" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: e.target.value})} placeholder="Số lượng" />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setEditingId(null)} className="px-4 py-1.5 text-sm bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300 transition-colors">Hủy</button>
                        <button onClick={saveEdit} className="px-4 py-1.5 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-sm">Lưu</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div><h4 className="font-bold text-slate-800">{item.name}</h4><p className="text-xs text-slate-500 font-mono mt-0.5">{item.id}</p></div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className={`font-bold text-lg ${item.quantity < 10 ? 'text-red-500' : 'text-slate-700'}`}>{item.quantity}</span><span className="text-sm text-slate-500 ml-1">{item.unit}</span>
                        {item.quantity < 10 && <p className="text-[10px] text-red-500 font-medium">Sắp hết</p>}
                      </div>
                      {user.role === 'admin' && (<button onClick={() => startEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-100 rounded-lg transition-colors border border-slate-100 hover:border-blue-200"><Edit className="w-4 h-4" /></button>)}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (<div className="p-8 text-center text-slate-400 text-sm">Kho trống.</div>)}
        </div>
      </div>
    </div>
  );
};

const SettingsView = ({ setView, showNotification, googleSheetUrl, setGoogleSheetUrl }) => {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-4 border-b border-slate-100 flex items-center space-x-3 shrink-0"><button onClick={() => setView('dashboard')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 text-slate-600" /></button><h2 className="font-bold text-slate-800">Cài đặt Hệ thống</h2></div>
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2 border-b pb-2">Xuất Báo Cáo Google Sheet</h3>
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-sm text-yellow-800 mb-3">
              <strong>Chú ý:</strong><br/>Ứng dụng đã được cập nhật thêm tab <b>CongViecHangNgay</b>. Bạn cần dán code.gs mới nhất vào Apps Script và Deploy lại nhé!</div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Google Apps Script URL</label><input type="text" value={googleSheetUrl} onChange={(e) => setGoogleSheetUrl(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" placeholder="https://script.google.com/macros/s/..." /></div>
              <button onClick={() => { 
                  setGoogleSheetUrl(googleSheetUrl);
                  localStorage.setItem('gs_url', googleSheetUrl);
                  showNotification('Đã lưu cấu hình Google Sheet!'); 
                  setView('dashboard'); 
              }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md mt-3">Lưu URL Google Sheet</button>
          </div>
        </div>
      </div>
    );
};

const QrPrintView = ({ machines, setView }) => (
  <div className="flex flex-col h-full bg-white">
    <div className="p-4 border-b border-slate-100 flex items-center justify-between no-print shrink-0"><div className="flex items-center space-x-3"><button onClick={() => setView('dashboard')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 text-slate-600" /></button><h2 className="font-bold text-slate-800">In mã QR</h2></div><button onClick={() => window.print()} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm"><Printer className="w-4 h-4" /> <span>In Ngay</span></button></div>
    <div className="flex-1 overflow-y-auto p-8 bg-slate-100 print:bg-white print:p-0">
      <div className="grid grid-cols-2 gap-8 print:grid-cols-3 print:gap-4">
          {machines.map(m => (
              <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center print:shadow-none print:border-2 print:border-black"><h3 className="font-bold text-lg mb-2">{m.name}</h3><img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${m.id}`} alt={m.name} className="w-32 h-32 object-contain" /><p className="font-mono text-sm mt-2 font-bold">{m.id}</p><p className="text-xs text-slate-500">{m.model}</p></div>
          ))}
      </div>
    </div>
    <style>{`@media print { .no-print { display: none !important; } }`}</style>
  </div>
);

// --- MÀN HÌNH HOME CỦA KTV ---
const HomeView = ({ user, setView, handleLogout, db }) => (
  <div className="flex flex-col items-center justify-center h-full space-y-6 p-6 relative overflow-y-auto pb-20">
    <div className="absolute top-4 right-4 flex items-center space-x-3">{user.role === 'admin' && <button onClick={() => setView('dashboard')} className="text-blue-600 font-medium text-sm bg-blue-50 px-3 py-1.5 rounded-lg">Dashboard Admin</button>}<button onClick={handleLogout} className="text-slate-400 hover:text-red-500"><LogOut className="w-5 h-5" /></button></div>
    
    <div className="text-center space-y-2 mt-8">
        <div className="bg-blue-600 p-4 rounded-2xl inline-block shadow-lg"><User className="w-12 h-12 text-white" /></div>
        <h1 className="text-2xl font-bold text-slate-800">Xin chào, {user.name}</h1>
        <p className="text-xs font-mono text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded">@{user.username}</p>
    </div>
    
    <div className="w-full max-w-xs space-y-4 pt-4 border-t border-slate-200">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-2">Bảo trì Máy móc (Có QR)</h3>
        <button onClick={() => setView('scanner')} className="w-full bg-slate-900 text-white py-3.5 px-6 rounded-xl flex items-center justify-center space-x-3 shadow-xl active:scale-95 transition-transform"><QrCode className="w-5 h-5" /> <span className="font-semibold text-base">Quét Mã QR</span></button>
        <button onClick={() => setView('manual_select')} className="w-full bg-white text-slate-700 border border-slate-200 py-3.5 px-6 rounded-xl flex items-center justify-center space-x-3 shadow-sm hover:bg-slate-50 active:scale-95 transition-transform"><ListFilter className="w-5 h-5 text-slate-500" /> <span className="font-semibold text-base">Chọn Máy Thủ Công</span></button>
    </div>

    <div className="w-full max-w-xs space-y-4 pt-4 border-t border-slate-200">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-2">Công việc hằng ngày (Không QR)</h3>
        <button onClick={() => setView('daily_task_form')} className="w-full bg-purple-600 text-white py-3.5 px-6 rounded-xl flex items-center justify-center space-x-3 shadow-xl active:scale-95 transition-transform"><CalendarClock className="w-5 h-5" /> <span className="font-semibold text-base">Viết Báo Cáo Ngày</span></button>
        <button onClick={() => setView('daily_task_history')} className="w-full bg-purple-50 text-purple-700 border border-purple-200 py-3.5 px-6 rounded-xl flex items-center justify-center space-x-3 shadow-sm hover:bg-purple-100 active:scale-95 transition-transform"><History className="w-5 h-5" /> <span className="font-semibold text-base">Sổ Công Việc</span></button>
    </div>

    <div className="w-full max-w-xs space-y-4 pt-4 border-t border-slate-200">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-2">Ghi Điện Nước</h3>
        <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setView('utility_form')} className="bg-cyan-600 text-white py-3 px-4 rounded-xl flex flex-col items-center justify-center gap-1 shadow-xl active:scale-95 transition-transform"><Zap className="w-5 h-5" /> <span className="font-semibold text-sm">Ghi Số Mới</span></button>
            <button onClick={() => setView('utility_history')} className="bg-cyan-50 text-cyan-700 border border-cyan-200 py-3 px-4 rounded-xl flex flex-col items-center justify-center gap-1 shadow-sm hover:bg-cyan-100 active:scale-95 transition-transform"><History className="w-5 h-5" /> <span className="font-semibold text-sm">Lịch Sử</span></button>
        </div>
    </div>

    <div className="w-full max-w-xs pt-4 border-t border-slate-200">
        <button onClick={() => setView('inventory')} className="w-full bg-white text-slate-700 border border-slate-200 py-3 px-6 rounded-xl flex items-center justify-center space-x-3 shadow-sm hover:bg-slate-50 active:scale-95 transition-transform"><Boxes className="w-5 h-5 text-orange-500" /> <span className="font-medium text-sm">Xem Kho Vật Tư</span></button>
    </div>
  </div>
);

const ScannerView = ({ setView, handleScanSuccess, machines, user }) => {
  return (
    <div className="flex flex-col h-full bg-black relative">
      <div className="absolute top-0 left-0 right-0 p-4 z-20"><button onClick={() => setView(user.role === 'admin' ? 'dashboard' : 'home')} className="text-white flex items-center space-x-2 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm"><ArrowLeft className="w-5 h-5" /><span>Quay lại</span></button></div>
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
          <NativeCameraScanner onScan={handleScanSuccess} />
          <div className="absolute bottom-8 left-0 right-0 px-6 z-20"><p className="text-white/50 text-xs text-center mb-2">Nếu không quét được, hãy chọn máy bên dưới:</p><div className="flex gap-2 overflow-x-auto pb-2">{machines.map(m => (<button key={m.id} onClick={() => handleScanSuccess(m.id)} className="whitespace-nowrap bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-xs backdrop-blur-md border border-white/10">{m.name}</button>))}</div></div>
      </div>
    </div>
  );
};

const ManualSelectView = ({ machines, setView, handleScanSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredMachines = machines.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.id.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-slate-50">
       <div className="bg-white p-4 border-b border-slate-200 shrink-0 shadow-sm">
          <div className="flex items-center space-x-3 mb-4"><button onClick={() => setView('home')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6" /></button><h2 className="font-bold text-slate-800 text-lg">Tìm kiếm thiết bị</h2></div>
          <div className="relative"><Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" /><input type="text" placeholder="Nhập tên hoặc mã máy..." className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus /></div>
       </div>
       <div className="flex-1 overflow-y-auto p-4 space-y-3">
           <div className="flex justify-between items-center text-xs text-slate-500 uppercase font-bold tracking-wider mb-2"><span>Danh sách ({filteredMachines.length})</span></div>
          {filteredMachines.length > 0 ? (
              filteredMachines.map(m => (
              <button key={m.id} onClick={() => handleScanSuccess(m.id)} className="w-full p-4 bg-white border border-slate-200 hover:border-blue-500 rounded-xl flex items-center justify-between group transition-all shadow-sm active:scale-[0.98]">
                <div className="flex items-center space-x-4 text-left">
                  <div className={`w-2 h-12 rounded-full ${m.status === 'operational' ? 'bg-green-500' : m.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  <div><div className="font-bold text-slate-800 text-lg">{m.name}</div><div className="text-sm text-slate-500 font-mono flex items-center mt-1"><span className="bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-600 mr-2">{m.id}</span><MapPin className="w-3 h-3 mr-1" /><span className="truncate max-w-[150px]">{m.location}</span></div></div>
                </div>
                <div className="text-slate-300 group-hover:text-blue-600 transition-colors"><div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center bg-slate-50 group-hover:bg-blue-50 group-hover:border-blue-200">&rarr;</div></div>
              </button>
            ))
          ) : (<div className="text-center py-12 text-slate-400"><Search className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>Không tìm thấy thiết bị phù hợp.</p></div>)}
       </div>
    </div>
  );
};

const DetailsView = ({ selectedMachine, setView, logs, user, saveMachineData, handleDeleteMachine, showNotification }) => {
  const machineLogs = logs.filter(l => l.machineId === selectedMachine.id);
  const [isEditingMachine, setIsEditingMachine] = useState(false);
  const [editMachineData, setEditMachineData] = useState(selectedMachine);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, type: '', id: null });

  useEffect(() => {
    setEditMachineData(selectedMachine);
  }, [selectedMachine]);

  const handleConfirmDelete = () => {
    if (confirmDelete.type === 'machine') {
      handleDeleteMachine(confirmDelete.id);
    }
    setConfirmDelete({ isOpen: false, type: '', id: null });
  };

  const handleSaveEdit = async () => {
    await saveMachineData(editMachineData);
    setIsEditingMachine(false);
    showNotification('Đã cập nhật thông tin máy', 'success');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white shadow-sm p-4 shrink-0 z-10">
          <div className="flex items-center justify-between mb-2">
              <button onClick={() => setView('home')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6" /></button>
              <h2 className="font-bold text-slate-800">Chi tiết thiết bị</h2>
              <div>
                 {user.role === 'admin' && !isEditingMachine && (
                   <button onClick={() => setIsEditingMachine(true)} className="p-2 -mr-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                       <Edit className="w-5 h-5" />
                   </button>
                 )}
              </div>
          </div>

          {isEditingMachine ? (
             <div className="space-y-3 mt-4 animate-fade-in">
                <div>
                    <label className="text-xs text-slate-500 font-medium">Tên thiết bị</label>
                    <input value={editMachineData.name} onChange={e => setEditMachineData({...editMachineData, name: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Tên máy..." />
                </div>
                <div>
                    <label className="text-xs text-slate-500 font-medium">Model</label>
                    <input value={editMachineData.model || ''} onChange={e => setEditMachineData({...editMachineData, model: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Model máy..." />
                </div>
                <div>
                    <label className="text-xs text-slate-500 font-medium">Vị trí</label>
                    <input value={editMachineData.location || ''} onChange={e => setEditMachineData({...editMachineData, location: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Vị trí đặt máy..." />
                </div>
                <div>
                    <label className="text-xs text-slate-500 font-medium">Đơn vị / Phòng ban</label>
                    <input value={editMachineData.department || ''} onChange={e => setEditMachineData({...editMachineData, department: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Đơn vị quản lý..." />
                </div>
                <div>
                    <label className="text-xs text-slate-500 font-medium">Trạng thái</label>
                    <select value={editMachineData.status || 'operational'} onChange={e => setEditMachineData({...editMachineData, status: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="operational">Đang hoạt động tốt</option>
                      <option value="maintenance">Đang bảo trì</option>
                      <option value="broken">Bị hỏng</option>
                    </select>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                   <button onClick={() => setConfirmDelete({ isOpen: true, type: 'machine', id: selectedMachine.id })} className="mr-auto p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100 transition-colors">
                       <Trash2 className="w-5 h-5" />
                   </button>
                   <button onClick={() => { setIsEditingMachine(false); setEditMachineData(selectedMachine); }} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">Hủy</button>
                   <button onClick={handleSaveEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center hover:bg-blue-700 transition-colors"><Save className="w-4 h-4 mr-2" /> Lưu</button>
                </div>
             </div>
          ) : (
             <div className="animate-fade-in">
                <h1 className="text-xl font-bold text-slate-900">{selectedMachine.name}</h1>
                <div className="flex items-center space-x-2 mt-1">
                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs font-mono">{selectedMachine.id}</span>
                    <p className="text-slate-500 text-sm flex items-center"><MapPin className="w-3 h-3 mr-1"/> {selectedMachine.location}</p>
                </div>
                {selectedMachine.department && (
                    <div className="mt-2 inline-flex items-center bg-blue-50 border border-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
                        <User className="w-3 h-3 mr-1.5" />Đơn vị: {selectedMachine.department}
                    </div>
                )}
                <div className="flex items-center gap-2 mt-3">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${selectedMachine.status === 'operational' ? 'bg-green-50 text-green-700 border-green-200' : selectedMachine.status === 'maintenance' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {selectedMachine.status === 'operational' ? 'Đang hoạt động tốt' : selectedMachine.status === 'maintenance' ? 'Đang bảo trì' : 'Đang hỏng'}
                    </div>
                    {selectedMachine.model && <span className="text-xs text-slate-400">Model: {selectedMachine.model}</span>}
                </div>
             </div>
          )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
          <button onClick={() => setView('form')} className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg">
              <Wrench className="w-5 h-5" />
              <span className="font-semibold">Tạo Báo Cáo Mới</span>
          </button>

          <div>
              <h3 className="font-bold text-slate-800 mb-4 flex items-center space-x-2"><History className="w-5 h-5 text-slate-500" /><span>Lịch sử báo cáo</span></h3>
              {machineLogs.length === 0 ? (
                 <p className="text-sm text-slate-400 text-center py-6">Chưa có báo cáo nào cho thiết bị này.</p>
              ) : (
                 <div className="space-y-4">
                   {machineLogs.map((log) => (
                     <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                         <div className="flex justify-between items-start mb-2">
                             <div>
                                 <span className="text-xs font-bold text-blue-600 uppercase">{log.type}</span>
                                 <div className="text-xs text-slate-400 mt-1">{log.date}</div>
                             </div>
                             <div className="bg-slate-100 px-2 py-1 rounded text-[11px] font-medium text-slate-600 flex items-center">
                                 <User className="w-3 h-3 mr-1" /> {log.technician}
                             </div>
                         </div>
                         <p className="text-slate-700 text-sm my-3 whitespace-pre-wrap">{log.note}</p>

                         {log.parts && log.parts.length > 0 && (
                           <div className="border-t border-slate-50 pt-2 mt-2">
                             <div className="text-[11px] text-slate-400 mb-1 flex items-center"><Package className="w-3 h-3 mr-1"/> Vật tư:</div>
                             <div className="flex flex-wrap gap-1">
                               {log.parts.map((p, idx) => (
                                 <span key={idx} className="bg-slate-50 text-slate-600 border border-slate-100 px-2 py-0.5 rounded text-[10px]">{p.name} ({p.quantity} {p.unit})</span>
                               ))}
                             </div>
                           </div>
                         )}
                         {log.images && log.images.length > 0 && (
                           <div className="flex gap-2 mt-2 overflow-x-auto pb-1 custom-scrollbar">
                             {log.images.map((img, idx) => (
                                <img key={idx} src={img} className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0" alt="Báo cáo" />
                             ))}
                           </div>
                         )}
                     </div>
                   ))}
                 </div>
              )}
          </div>
      </div>

      {/* MODAL XÁC NHẬN XÓA TÁCH RỜI */}
      {confirmDelete.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
            <div className="flex items-center space-x-3 mb-3 text-red-600">
               <div className="bg-red-100 p-2 rounded-full"><AlertCircle className="w-6 h-6" /></div>
               <h3 className="font-bold text-lg text-slate-800">Xác nhận xóa</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6 pl-1">
              Bạn có chắc chắn muốn xóa vĩnh viễn thiết bị này? Hành động này sẽ không thể hoàn tác.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete({ isOpen: false, type: '', id: null })} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors">Hủy</button>
              <button onClick={handleConfirmDelete} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-red-500/30">
                Đồng ý Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENT: LogFormView (Báo cáo máy móc có QR)
// ============================================================================
const LogFormView = ({ selectedMachine, user, inventory, setView, showNotification, handleSaveLog }) => {
  const [formData, setFormData] = useState({ technicianName: user?.name || '', type: 'Bảo trì định kỳ', note: '', status: 'Hoàn thành', parts: [], images: [] });
  const [tempPart, setTempPart] = useState({ name: '', unit: '', quantity: '' });

  const addPart = () => { 
      if(tempPart.name && tempPart.quantity) { 
          setFormData({...formData, parts: [...formData.parts, tempPart]}); setTempPart({ name: '', unit: '', quantity: '' }); 
      } else {
          showNotification('Vui lòng chọn vật tư và nhập số lượng', 'error');
      }
  };
  
  const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800; 
              const scaleSize = MAX_WIDTH / img.width;
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scaleSize;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6); 
              setFormData(prev => ({...prev, images: [...prev.images, compressedBase64]}));
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

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="p-4 border-b border-slate-100 bg-white shrink-0 flex items-center space-x-3"><button onClick={() => setView('details')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 text-slate-600" /></button><div><h2 className="font-bold text-slate-800">Báo cáo công việc</h2><p className="text-xs text-slate-500">{selectedMachine.name}</p></div></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-32">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Người thực hiện</label><input type="text" className="w-full p-3 rounded-lg border border-slate-300 bg-white text-base focus:ring-2 focus:ring-blue-500 outline-none" value={formData.technicianName} onChange={e => setFormData({...formData, technicianName: e.target.value})} placeholder="Tên KTV..." /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Loại công việc</label><select className="w-full p-3 rounded-lg border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option>Bảo trì định kỳ</option><option>Sửa chữa sự cố</option><option>Thay thế linh kiện</option></select></div>
          <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Vật tư thay thế (lấy từ Kho)</label>
              <div className="flex flex-col gap-2 mb-2 bg-white p-3 rounded-lg border border-slate-200">
                  <select className="w-full p-2 border border-slate-300 rounded-lg text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={tempPart.name} onChange={(e) => { const selectedItem = inventory.find(i => i.name === e.target.value); setTempPart({ ...tempPart, name: e.target.value, unit: selectedItem ? selectedItem.unit : '' }); }}>
                      <option value="">-- Chọn vật tư trong kho --</option>
                      {inventory.map(item => (<option key={item.id} value={item.name}>{item.name} (Tồn: {item.quantity} {item.unit})</option>))}
                  </select>
                  <div className="flex gap-2"><input placeholder="Đơn vị" disabled className="w-1/2 p-2 border border-slate-300 rounded-lg text-base bg-slate-100 text-slate-500" value={tempPart.unit} /><input placeholder="Số lượng dùng" type="number" className="w-1/2 p-2 border border-slate-300 rounded-lg text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={tempPart.quantity} onChange={e => setTempPart({...tempPart, quantity: e.target.value})} /></div>
                  <button onClick={addPart} className="bg-blue-600 text-white p-2 rounded-lg flex items-center justify-center font-medium text-sm mt-1 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" /> Thêm vào báo cáo</button>
              </div>
              <div className="space-y-2">{formData.parts.map((p, i) => (<div key={i} className="bg-white border border-slate-200 p-2 rounded flex justify-between text-sm items-center shadow-sm"><span className="font-medium">{p.name}</span><span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-xs">Dùng: {p.quantity} {p.unit}</span></div>))}</div>
          </div>
          <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Hình ảnh hiện trường</label>
              <div className="flex flex-wrap gap-2">
                  {formData.images.map((img, idx) => (<div key={idx} className="relative w-20 h-20"><img src={img} className="w-full h-full object-cover rounded-lg border border-slate-200" alt="Preview" /><button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"><X className="w-3 h-3" /></button></div>))}
                  <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-slate-50 hover:border-blue-400 text-slate-400 hover:text-blue-500 transition-colors"><Camera className="w-6 h-6 mb-1" /><span className="text-[10px]">Chụp ảnh</span><input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" /></label>
              </div>
          </div>
          <div className="pb-4"><label className="block text-sm font-medium text-slate-700 mb-1">Mô tả chi tiết</label><textarea rows="5" className="w-full p-3 rounded-lg border border-slate-300 text-base focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[120px]" placeholder="Nhập chi tiết công việc, nguyên nhân, cách khắc phục..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})}></textarea></div>
          <div className="grid grid-cols-2 gap-3"><button onClick={() => setFormData({...formData, status: 'Hoàn thành'})} className={`p-3 rounded-lg border flex items-center justify-center space-x-2 bg-white transition-colors ${formData.status === 'Hoàn thành' ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}><CheckCircle className="w-5 h-5" /> <span className="font-medium">Xong</span></button><button onClick={() => setFormData({...formData, status: 'Cần theo dõi'})} className={`p-3 rounded-lg border flex items-center justify-center space-x-2 bg-white transition-colors ${formData.status === 'Cần theo dõi' ? 'bg-yellow-50 border-yellow-500 text-yellow-700 shadow-sm' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}><AlertCircle className="w-5 h-5" /> <span className="font-medium">Chưa xong</span></button></div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white/90 backdrop-blur-md shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]"><button onClick={() => {if(!formData.note) return showNotification('Nhập ghi chú!', 'error'); handleSaveLog(formData);}} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-transform active:scale-95"><Save className="w-5 h-5" /> Lưu Báo Cáo</button></div>
    </div>
  );
};

// ============================================================================
// COMPONENT: DailyTaskFormView (Báo cáo không có máy cụ thể)
// ============================================================================
const DailyTaskFormView = ({ user, inventory, setView, showNotification, handleSaveDailyTask }) => {
  const nowStr = new Date().toTimeString().slice(0, 5);
  const dateStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({ 
      technicianName: user?.name || '', username: user?.username || '', 
      date: dateStr, startTime: nowStr, endTime: nowStr,
      taskName: '', type: 'Sửa chữa chung', note: '', status: 'Hoàn thành', parts: [], images: [] 
  });
  const [tempPart, setTempPart] = useState({ name: '', unit: '', quantity: '' });

  const addPart = () => { 
      if(tempPart.name && tempPart.quantity) { 
          setFormData({...formData, parts: [...formData.parts, tempPart]}); setTempPart({ name: '', unit: '', quantity: '' }); 
      } else showNotification('Chọn vật tư và nhập số lượng!', 'error');
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
      handleSaveDailyTask(formData);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="p-4 border-b border-slate-100 bg-white shrink-0 flex items-center space-x-3 shadow-sm z-10">
          <button onClick={() => setView('home')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
          <div><h2 className="font-bold text-slate-800 flex items-center"><CalendarClock className="w-5 h-5 mr-1.5 text-purple-600"/> Báo cáo Hằng ngày</h2></div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
          {user.role === 'admin' && (
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Người thực hiện (Admin nhập hộ)</label><input type="text" className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={formData.technicianName} onChange={e => setFormData({...formData, technicianName: e.target.value})} /></div>
          )}

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tên Công việc / Thiết bị <span className="text-red-500">*</span></label>
                  <input type="text" autoFocus className="w-full p-3 rounded-lg border border-slate-300 bg-slate-50 text-base focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-medium" placeholder="VD: Thay bóng đèn xưởng A, Đi dây mạng..." value={formData.taskName} onChange={e => setFormData({...formData, taskName: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Ngày thực hiện</label><input type="date" className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Phân loại</label><select className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option>Sửa chữa chung</option><option>Bảo trì cơ sở vật chất</option><option>Hỗ trợ sản xuất</option><option>Khác</option></select></div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-purple-50/50 p-3 rounded-lg border border-purple-100">
                  <div>
                      <label className="text-xs font-medium text-purple-800 flex items-center mb-1"><Clock className="w-3 h-3 mr-1"/> Giờ Bắt đầu</label>
                      <input type="time" className="w-full p-2 rounded border border-purple-200 text-sm text-center font-bold font-mono outline-none focus:ring-2 focus:ring-purple-400" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                  </div>
                  <div>
                      <label className="text-xs font-medium text-purple-800 flex items-center mb-1"><Clock className="w-3 h-3 mr-1"/> Giờ Kết thúc</label>
                      <input type="time" className="w-full p-2 rounded border border-purple-200 text-sm text-center font-bold font-mono outline-none focus:ring-2 focus:ring-purple-400" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                  </div>
              </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Ghi chú / Nội dung chi tiết <span className="text-red-500">*</span></label>
                  <textarea rows="4" className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" placeholder="Chi tiết việc đã làm..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})}></textarea>
              </div>

              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Vật tư sử dụng</label>
                  <div className="flex flex-col gap-2 mb-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <select className="w-full p-2 border border-slate-300 rounded text-sm bg-white" value={tempPart.name} onChange={(e) => { const itm = inventory.find(i => i.name === e.target.value); setTempPart({ ...tempPart, name: e.target.value, unit: itm ? itm.unit : '' }); }}>
                          <option value="">-- Kho vật tư --</option>
                          {inventory.map(item => (<option key={item.id} value={item.name}>{item.name} (Tồn: {item.quantity})</option>))}
                      </select>
                      <div className="flex gap-2">
                          <input placeholder="Số lượng" type="number" className="flex-1 p-2 border border-slate-300 rounded text-sm bg-white" value={tempPart.quantity} onChange={e => setTempPart({...tempPart, quantity: e.target.value})} />
                          <button onClick={addPart} className="bg-slate-800 text-white px-3 rounded text-sm font-medium"><Plus className="w-4 h-4" /></button>
                      </div>
                  </div>
                  <div className="space-y-1">{formData.parts.map((p, i) => (<div key={i} className="bg-white border border-slate-200 p-2 rounded flex justify-between text-xs items-center shadow-sm"><span className="font-medium">{p.name}</span><span className="text-purple-700 bg-purple-100 px-2 py-0.5 rounded font-bold">Dùng: {p.quantity} {p.unit}</span></div>))}</div>
              </div>

              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Hình ảnh</label>
                  <div className="flex flex-wrap gap-2">
                      {formData.images.map((img, idx) => (<div key={idx} className="relative w-16 h-16"><img src={img} className="w-full h-full object-cover rounded-lg border border-slate-200" alt="Preview" /><button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"><X className="w-3 h-3" /></button></div>))}
                      <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-purple-300 rounded-lg cursor-pointer bg-purple-50 hover:bg-purple-100 text-purple-500 transition-colors"><Camera className="w-5 h-5 mb-1" /><span className="text-[9px] font-bold">Chụp ảnh</span><input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" /></label>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-3"><button onClick={() => setFormData({...formData, status: 'Hoàn thành'})} className={`p-3 rounded-xl border-2 flex items-center justify-center space-x-2 bg-white transition-all ${formData.status === 'Hoàn thành' ? 'border-green-500 text-green-700 bg-green-50 shadow-sm' : 'border-slate-200 text-slate-400'}`}><CheckCircle className="w-5 h-5" /> <span>Đã xong</span></button><button onClick={() => setFormData({...formData, status: 'Đang xử lý'})} className={`p-3 rounded-xl border-2 flex items-center justify-center space-x-2 bg-white transition-all ${formData.status === 'Đang xử lý' ? 'border-yellow-500 text-yellow-700 bg-yellow-50 shadow-sm' : 'border-slate-200 text-slate-400'}`}><AlertCircle className="w-5 h-5" /> <span>Đang dở</span></button></div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white/95 backdrop-blur-md shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-20"><button onClick={submitForm} className="w-full bg-purple-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 hover:bg-purple-700 transition-transform active:scale-95"><Save className="w-5 h-5" /> Lưu Báo Cáo Ngày</button></div>
    </div>
  );
};

// ============================================================================
// COMPONENT: DailyTaskHistoryView (Lịch sử báo cáo công việc hằng ngày)
// ============================================================================
const DailyTaskHistoryView = ({ dailyTasks, usersList, setView, user }) => {
  const [filterTech, setFilterTech] = useState(user.role === 'admin' ? 'all' : user.username);
  const [filterDateStr, setFilterDateStr] = useState(new Date().toISOString().split('T')[0]); // Default today
  
  const filteredTasks = dailyTasks.filter(t => {
      let matchTech = filterTech === 'all' ? true : (t.username === filterTech || t.technicianName === filterTech);
      let matchDate = filterDateStr === '' ? true : t.date === filterDateStr;
      return matchTech && matchDate;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
        <div className="p-4 border-b border-slate-100 bg-white shrink-0 shadow-sm z-10">
            <div className="flex items-center space-x-3 mb-4">
               <button onClick={() => setView(user.role === 'admin' ? 'dashboard' : 'home')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
               <h2 className="font-bold text-slate-800 flex items-center">Sổ Ghi Công Việc</h2>
            </div>
            
            <div className="flex gap-2">
               {user.role === 'admin' && (
                  <div className="flex-1 relative">
                      <Filter className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
                      <select value={filterTech} onChange={e => setFilterTech(e.target.value)} className="w-full pl-8 pr-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-purple-500 text-slate-700 font-medium">
                          <option value="all">Tất cả KTV</option>
                          {usersList.filter(u=>u.role !== 'admin').map(u => <option key={u.id} value={u.username}>{u.name}</option>)}
                      </select>
                  </div>
               )}
               <div className="flex-1 relative">
                  <input type="date" value={filterDateStr} onChange={e => setFilterDateStr(e.target.value)} className="w-full px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-purple-500 text-slate-700 font-medium" />
               </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-500 uppercase font-bold tracking-wider mb-2"><span>Danh sách ({filteredTasks.length})</span></div>
            {filteredTasks.length === 0 ? (
                 <p className="text-sm text-slate-400 text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">Không có báo cáo nào trong ngày này.</p>
            ) : (
                 filteredTasks.map((task) => (
                     <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-purple-300 transition-colors">
                         <div className="flex justify-between items-start mb-2 border-b border-slate-100 pb-2">
                             <div>
                                 <h4 className="font-bold text-slate-800 text-base leading-tight">{task.taskName}</h4>
                                 <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded mt-1 inline-block uppercase tracking-wider">{task.type}</span>
                             </div>
                             <div className="flex flex-col items-end gap-1">
                                 <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600 flex items-center"><User className="w-3 h-3 mr-1" /> {task.technicianName}</span>
                                 <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${task.status === 'Hoàn thành' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{task.status}</span>
                             </div>
                         </div>
                         
                         <div className="flex items-center text-xs font-mono text-slate-600 mb-3 bg-slate-50 inline-flex px-2 py-1 rounded border border-slate-100">
                             <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> {task.startTime} - {task.endTime}
                         </div>
                         
                         <p className="text-slate-700 text-sm whitespace-pre-wrap">{task.note}</p>

                         {task.parts && task.parts.length > 0 && (
                           <div className="border-t border-slate-50 pt-2 mt-3">
                             <div className="text-[10px] text-slate-400 mb-1 flex items-center uppercase font-bold"><Package className="w-3 h-3 mr-1"/> Vật tư:</div>
                             <div className="flex flex-wrap gap-1">
                               {task.parts.map((p, idx) => (
                                 <span key={idx} className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded text-[10px] font-medium">{p.name} ({p.quantity} {p.unit})</span>
                               ))}
                             </div>
                           </div>
                         )}
                         {task.images && task.images.length > 0 && (
                           <div className="flex gap-2 mt-3 overflow-x-auto pb-1 custom-scrollbar">
                             {task.images.map((img, idx) => (
                                <img key={idx} src={img} className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0" alt="BC" />
                             ))}
                           </div>
                         )}
                     </div>
                 ))
            )}
        </div>
    </div>
  );
};

// ============================================================================
// TÍNH NĂNG MỚI: FORM GHI ĐIỆN NƯỚC CHUYÊN SÂU & LỊCH SỬ
// ============================================================================
const UtilityFormView = ({ user, setView, showNotification, handleSaveUtilityLog, editData, setEditData, utilityLogs }) => {
  const isEditing = !!editData;
  const dateStr = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState(isEditing ? editData : { 
      id: Date.now(),
      technicianName: user?.name || '', username: user?.username || '', 
      date: dateStr, note: '', images: [],
      elec1: { bt: '', cd: '', td: '', vc: '' },
      elec2: { bt: '', cd: '', td: '', vc: '' },
      water: { tong: '', tuoiCay: '', vanPhong: '', nhaAnVpc: '', nhaAnXuong: '', congChinh: '', congPhu: '' }
  });

  const [activeTab, setActiveTab] = useState('elec1'); // elec1, elec2, water

  // TÌM BẢN GHI GẦN NHẤT TRƯỚC ĐÓ ĐỂ TÍNH TIÊU THỤ NƯỚC
  const prevLog = [...utilityLogs]
      .filter(log => log.id !== formData.id && new Date(log.date) <= new Date(formData.date))
      .sort((a,b) => b.id - a.id)[0];

  const handleElecChange = (tram, field, value) => {
      setFormData(prev => ({ ...prev, [tram]: { ...prev[tram], [field]: value } }));
  };

  const handleWaterChange = (field, value) => {
      setFormData(prev => ({ ...prev, water: { ...prev.water, [field]: value } }));
  };

  const calcCosPhi = (elec) => {
      const p = Number(elec.bt) + Number(elec.cd) + Number(elec.td);
      const q = Number(elec.vc);
      if (p === 0 && q === 0) return 0;
      const cos = p / Math.sqrt(p*p + q*q);
      return isNaN(cos) ? 0 : cos.toFixed(3);
  };

  const calcWaterConsumption = (field) => {
      if (!formData.water[field] || !prevLog || !prevLog.water || !prevLog.water[field]) return 0;
      const current = Number(formData.water[field]);
      const prev = Number(prevLog.water[field]);
      return current >= prev ? (current - prev).toFixed(1) : 0;
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
      handleSaveUtilityLog(formData);
      if (isEditing) setEditData(null);
  };

  const ElecInputGroup = ({ tramName, tramKey }) => {
      const cosPhi = calcCosPhi(formData[tramKey]);
      const isLowCosPhi = cosPhi > 0 && cosPhi < 0.9;

      return (
          <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Bình thường (Kw)</label>
                      <input type="number" step="any" className="w-full p-2 border-b-2 border-slate-200 focus:border-yellow-400 outline-none text-lg font-bold text-slate-800" value={formData[tramKey].bt} onChange={e => handleElecChange(tramKey, 'bt', e.target.value)} />
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Cao điểm (Kw)</label>
                      <input type="number" step="any" className="w-full p-2 border-b-2 border-slate-200 focus:border-red-400 outline-none text-lg font-bold text-slate-800" value={formData[tramKey].cd} onChange={e => handleElecChange(tramKey, 'cd', e.target.value)} />
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Thấp điểm (Kw)</label>
                      <input type="number" step="any" className="w-full p-2 border-b-2 border-slate-200 focus:border-green-400 outline-none text-lg font-bold text-slate-800" value={formData[tramKey].td} onChange={e => handleElecChange(tramKey, 'td', e.target.value)} />
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Vô công (Kvar)</label>
                      <input type="number" step="any" className="w-full p-2 border-b-2 border-slate-200 focus:border-purple-400 outline-none text-lg font-bold text-slate-800" value={formData[tramKey].vc} onChange={e => handleElecChange(tramKey, 'vc', e.target.value)} />
                  </div>
              </div>

              <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-colors ${isLowCosPhi ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center space-x-2">
                      <Calculator className={`w-5 h-5 ${isLowCosPhi ? 'text-red-500' : 'text-slate-500'}`} />
                      <span className={`font-bold ${isLowCosPhi ? 'text-red-700' : 'text-slate-700'}`}>Hệ số Cos ϕ:</span>
                  </div>
                  <div className="text-right">
                      <span className={`text-xl font-bold ${isLowCosPhi ? 'text-red-600' : 'text-blue-600'}`}>{cosPhi || '0.000'}</span>
                  </div>
              </div>
              {isLowCosPhi && (
                  <div className="flex items-start space-x-2 text-red-600 bg-red-100 p-3 rounded-lg text-sm font-medium">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <p>Cảnh báo: Hệ số Cos ϕ dưới 0.9. Kiểm tra lại tụ bù hoặc liên hệ kỹ thuật!</p>
                  </div>
              )}
          </div>
      );
  };

  const waterFields = [
      { id: 'tong', label: 'Chỉ số Tổng' }, { id: 'tuoiCay', label: 'Tưới cây' },
      { id: 'vanPhong', label: 'VP Chính' }, { id: 'nhaAnVpc', label: 'Nhà ăn VPC' },
      { id: 'nhaAnXuong', label: 'Nhà ăn Xưởng' }, { id: 'congChinh', label: 'Bảo vệ cổng chính' },
      { id: 'congPhu', label: 'Bảo vệ cổng phụ' }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-100 relative">
      <div className="p-4 border-b border-slate-200 bg-white shrink-0 shadow-sm z-10 flex justify-between items-center">
          <div className="flex items-center space-x-3">
              <button onClick={() => { setView(isEditing ? 'utility_history' : 'home'); setEditData(null); }} className="p-2 -ml-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
              <div><h2 className="font-bold text-slate-800 flex items-center">{isEditing ? 'Sửa Bản Ghi' : 'Ghi Điện Nước'}</h2></div>
          </div>
          <input type="date" className="p-1.5 rounded-lg border border-slate-300 text-sm focus:ring-2 outline-none font-medium bg-slate-50" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
      </div>

      <div className="flex bg-white border-b border-slate-200 shrink-0">
          <button onClick={() => setActiveTab('elec1')} className={`flex-1 py-3 text-sm font-bold border-b-2 flex justify-center items-center gap-1 transition-colors ${activeTab === 'elec1' ? 'border-yellow-500 text-yellow-600 bg-yellow-50/30' : 'border-transparent text-slate-500'}`}><Zap className="w-4 h-4"/> Trạm 1</button>
          <button onClick={() => setActiveTab('elec2')} className={`flex-1 py-3 text-sm font-bold border-b-2 flex justify-center items-center gap-1 transition-colors ${activeTab === 'elec2' ? 'border-yellow-500 text-yellow-600 bg-yellow-50/30' : 'border-transparent text-slate-500'}`}><Zap className="w-4 h-4"/> Trạm 2</button>
          <button onClick={() => setActiveTab('water')} className={`flex-1 py-3 text-sm font-bold border-b-2 flex justify-center items-center gap-1 transition-colors ${activeTab === 'water' ? 'border-blue-500 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-500'}`}><Droplets className="w-4 h-4"/> Nước</button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
          {activeTab === 'elec1' && <ElecInputGroup tramName="Trạm Điện 1" tramKey="elec1" />}
          {activeTab === 'elec2' && <ElecInputGroup tramName="Trạm Điện 2" tramKey="elec2" />}
          
          {activeTab === 'water' && (
              <div className="space-y-3 animate-fade-in">
                  <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-xs flex items-center shadow-sm">
                      <Droplets className="w-4 h-4 mr-2" /> Hệ thống tự động lấy chỉ số ngày gần nhất để tính Tiêu thụ.
                  </div>
                  {waterFields.map(field => (
                      <div key={field.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                          <div className="w-1/3 pr-2">
                              <label className="text-xs font-bold text-slate-700 leading-tight block">{field.label}</label>
                              {prevLog && prevLog.water && prevLog.water[field.id] && (
                                  <span className="text-[10px] text-slate-400">Số cũ: {prevLog.water[field.id]}</span>
                              )}
                          </div>
                          <div className="w-1/3 px-1">
                              <input type="number" step="any" placeholder="Số mới" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold text-center" value={formData.water[field.id]} onChange={e => handleWaterChange(field.id, e.target.value)} />
                          </div>
                          <div className="w-1/3 pl-2 text-right">
                              <div className="text-[10px] text-slate-500 uppercase font-bold">Tiêu thụ ($m^3$)</div>
                              <div className="text-lg font-bold text-blue-600">{calcWaterConsumption(field.id)}</div>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 mt-6">
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Ghi chú (Sự cố, hao hụt...)</label>
                  <textarea rows="2" className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-cyan-500 outline-none resize-none" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})}></textarea>
              </div>
              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Hình ảnh hóa đơn / đồng hồ</label>
                  <div className="flex flex-wrap gap-2">
                      {formData.images.map((img, idx) => (<div key={idx} className="relative w-16 h-16"><img src={img} className="w-full h-full object-cover rounded-lg border border-slate-200" alt="Preview" /><button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"><X className="w-3 h-3" /></button></div>))}
                      <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"><Camera className="w-5 h-5 mb-1" /><span className="text-[9px] font-bold">Chụp ảnh</span><input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" /></label>
                  </div>
              </div>
          </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-20"><button onClick={submitForm} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-transform active:scale-95"><Save className="w-5 h-5" /> {isEditing ? 'Cập Nhật Bản Ghi' : 'Lưu Chỉ Số Hôm Nay'}</button></div>
    </div>
  );
};

const UtilityHistoryView = ({ utilityLogs, usersList, setView, user, setEditData }) => {
  const [filterTech, setFilterTech] = useState(user.role === 'admin' ? 'all' : user.username);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  const filteredLogs = utilityLogs.filter(t => {
      let matchTech = filterTech === 'all' ? true : (t.username === filterTech || t.technicianName === filterTech);
      let matchDate = t.date.startsWith(filterMonth);
      return matchTech && matchDate;
  });

  const handleEdit = (log) => {
      setEditData(log);
      setView('utility_form');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
        <div className="p-4 border-b border-slate-100 bg-white shrink-0 shadow-sm z-10">
            <div className="flex items-center space-x-3 mb-4">
               <button onClick={() => setView(user.role === 'admin' ? 'dashboard' : 'home')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
               <h2 className="font-bold text-slate-800 flex items-center">Lịch Sử Điện Nước</h2>
            </div>
            <div className="flex gap-2">
               {user.role === 'admin' && (
                  <div className="flex-1 relative">
                      <Filter className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
                      <select value={filterTech} onChange={e => setFilterTech(e.target.value)} className="w-full pl-8 pr-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-cyan-500 text-slate-700 font-medium">
                          <option value="all">Tất cả KTV</option>
                          {usersList.filter(u=>u.role !== 'admin').map(u => <option key={u.id} value={u.username}>{u.name}</option>)}
                      </select>
                  </div>
               )}
               <div className="flex-1 relative">
                  <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-cyan-500 text-slate-700 font-medium" />
               </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-500 uppercase font-bold tracking-wider mb-2"><span>Tháng {filterMonth} ({filteredLogs.length} bản ghi)</span></div>
            {filteredLogs.length === 0 ? (
                 <p className="text-sm text-slate-400 text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">Không có bản ghi nào.</p>
            ) : (
                 filteredLogs.map((log) => {
                     const p1 = Number(log.elec1?.bt||0) + Number(log.elec1?.cd||0) + Number(log.elec1?.td||0);
                     const p2 = Number(log.elec2?.bt||0) + Number(log.elec2?.cd||0) + Number(log.elec2?.td||0);
                     const waterTotal = Object.values(log.water||{}).reduce((a,b)=>a+Number(b||0), 0);
                     
                     return (
                     <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-cyan-300 transition-colors">
                         <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                             <div>
                                 <h4 className="font-bold text-slate-800 text-base leading-tight flex items-center"><CalendarClock className="w-4 h-4 mr-1.5 text-slate-400"/>Ngày {log.date}</h4>
                             </div>
                             <div className="flex gap-2">
                                 <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600 flex items-center"><User className="w-3 h-3 mr-1" /> {log.technicianName}</span>
                                 <button onClick={() => handleEdit(log)} className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-bold hover:bg-blue-100 flex items-center"><Edit className="w-3 h-3 mr-1" /> Sửa</button>
                             </div>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-3 mb-3">
                             <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-100 flex flex-col justify-center">
                                 <p className="text-[10px] text-yellow-600 font-bold uppercase mb-1 flex items-center"><Zap className="w-3 h-3 mr-1"/> Điện T.Thụ</p>
                                 <p className="font-bold text-yellow-800 text-base">{(p1+p2).toFixed(1)} <span className="text-[10px] font-normal text-yellow-600">Kw (T1+T2)</span></p>
                             </div>
                             <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 flex flex-col justify-center">
                                 <p className="text-[10px] text-blue-600 font-bold uppercase mb-1 flex items-center"><Droplets className="w-3 h-3 mr-1"/> Nước T.Thụ (Thô)</p>
                                 <p className="font-bold text-blue-800 text-base">{waterTotal} <span className="text-[10px] font-normal text-blue-600">Tổng m3 (Ghi nhận)</span></p>
                             </div>
                         </div>
                         
                         {log.note && <p className="text-slate-700 text-sm whitespace-pre-wrap bg-slate-50 p-2 rounded text-xs border border-slate-100 mb-3">{log.note}</p>}

                         {log.images && log.images.length > 0 && (
                           <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                             {log.images.map((img, idx) => (
                                <img key={idx} src={img} className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0" alt="Log" />
                             ))}
                           </div>
                         )}
                     </div>
                 )})
            )}
        </div>
    </div>
  );
};


// ============================================================================
// CHƯƠNG TRÌNH CHÍNH (APP)
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null); 
  const [view, setViewInternal] = useState('login'); 
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [notification, setNotification] = useState(null);
  const [utilityEditItem, setUtilityEditItem] = useState(null);
  
  // XỬ LÝ DỮ LIỆU LAI (HYBRID: OFFLINE HOẶC CLOUD)
  const [usersList, setUsersList] = useState(() => {
    if (db) return []; 
    const saved = localStorage.getItem('techmaintain_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [dailyTasks, setDailyTasks] = useState(() => {
    if (db) return [];
    const saved = localStorage.getItem('techmaintain_daily');
    return saved ? JSON.parse(saved) : [];
  });

  const [machines, setMachines] = useState(() => {
    if (db) return []; 
    const saved = localStorage.getItem('techmaintain_machines');
    return saved ? JSON.parse(saved) : INITIAL_MACHINES;
  });
  
  const [logs, setLogs] = useState(() => {
    if (db) return [];
    const saved = localStorage.getItem('techmaintain_logs');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [inventory, setInventory] = useState(() => {
    if (db) return [];
    const saved = localStorage.getItem('techmaintain_inventory');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  });

  const [utilityLogs, setUtilityLogs] = useState(() => {
    if (db) return [];
    const saved = localStorage.getItem('techmaintain_utility');
    return saved ? JSON.parse(saved) : [];
  });

  const [googleSheetUrl, setGoogleSheetUrl] = useState(() => localStorage.getItem('gs_url') || '');
  const [fbUser, setFbUser] = useState(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(!!db);

  // === THÊM HISTORY API HỖ TRỢ PHÍM BACK ĐIỆN THOẠI ===
  const setView = (newView, replace = false) => {
    if (newView === view) return;
    if (replace) {
        window.history.replaceState({ view: newView }, '', '');
    } else {
        window.history.pushState({ view: newView }, '', '');
    }
    setViewInternal(newView);
  };

  useEffect(() => {
    window.history.replaceState({ view: 'login' }, '', '');
    
    const handlePopState = (event) => {
        if (event.state && event.state.view) {
            let nextView = event.state.view;
            // Nếu người dùng đang đăng nhập mà cố lùi về 'login', chặn lại và đưa về màn hình chính
            if (user && nextView === 'login') {
                nextView = user.role === 'admin' ? 'dashboard' : 'home';
                window.history.replaceState({ view: nextView }, '', '');
            }
            setViewInternal(nextView);
        }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);
  // ====================================================

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

    const handleSnapError = (error) => {
        console.error("Firebase Sync Error:", error);
        setIsCloudSyncing(false);
    };

    const unsubMachines = onSnapshot(collection(db, 'artifacts', safeAppId, 'public', 'data', 'machines'), (snap) => setMachines(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleSnapError);
    const unsubInventory = onSnapshot(collection(db, 'artifacts', safeAppId, 'public', 'data', 'inventory'), (snap) => setInventory(snap.docs.map(d => ({ ...d.data(), id: d.id }))), handleSnapError);
    const unsubLogs = onSnapshot(collection(db, 'artifacts', safeAppId, 'public', 'data', 'logs'), (snap) => setLogs(snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => b.id - a.id)), handleSnapError);
    
    const unsubUsers = onSnapshot(collection(db, 'artifacts', safeAppId, 'public', 'data', 'users'), (snap) => {
        if(snap.empty) { INITIAL_USERS.forEach(u => setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'users', u.id), u)); }
        else setUsersList(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }, handleSnapError);
    
    const unsubDaily = onSnapshot(collection(db, 'artifacts', safeAppId, 'public', 'data', 'daily_tasks'), (snap) => {
        setDailyTasks(snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => b.id - a.id));
    }, handleSnapError);

    const unsubUtility = onSnapshot(collection(db, 'artifacts', safeAppId, 'public', 'data', 'utility_logs'), (snap) => {
        setUtilityLogs(snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => b.id - a.id));
    }, handleSnapError);

    const unsubSettings = onSnapshot(collection(db, 'artifacts', safeAppId, 'public', 'data', 'settings'), (snap) => {
      const sData = snap.docs.find(d => d.id === 'general');
      if (sData && sData.data().gs_url) setGoogleSheetUrl(sData.data().gs_url);
      setIsCloudSyncing(false);
    }, handleSnapError);

    return () => { unsubMachines(); unsubInventory(); unsubLogs(); unsubUsers(); unsubDaily(); unsubUtility(); unsubSettings(); };
  }, [fbUser, db]);

  const saveUserData = async (uObj) => {
      if (db && fbUser) await setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'users', uObj.id), uObj);
      else { const nList = usersList.map(u => u.id === uObj.id ? uObj : u); if(!nList.find(u=>u.id===uObj.id)) nList.push(uObj); setUsersList(nList); localStorage.setItem('techmaintain_users', JSON.stringify(nList)); }
  };
  const handleDeleteUser = async (id) => {
      if (db && fbUser) await deleteDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'users', id));
      else { const nList = usersList.filter(u => u.id !== id); setUsersList(nList); localStorage.setItem('techmaintain_users', JSON.stringify(nList)); }
  };
  const saveMachineData = async (newMachineObj) => { 
      if (db && fbUser) await setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'machines', newMachineObj.id), newMachineObj);
      else { const nList = machines.map(m => m.id === newMachineObj.id ? newMachineObj : m); if(!nList.find(m=>m.id===newMachineObj.id)) nList.push(newMachineObj); setMachines(nList); localStorage.setItem('techmaintain_machines', JSON.stringify(nList)); }
  }; 
  const saveInventoryData = async (newInvObj) => {
      if (db && fbUser) await setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'inventory', newInvObj.id), newInvObj);
      else { const nList = inventory.map(i => i.id === newInvObj.id ? newInvObj : i); if(!nList.find(i=>i.id===newInvObj.id)) nList.push(newInvObj); setInventory(nList); localStorage.setItem('techmaintain_inventory', JSON.stringify(nList)); }
  };
  const saveLogData = async (logEntry) => {
      if (db && fbUser) await setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'logs', String(logEntry.id)), logEntry);
      else { const nList = [logEntry, ...logs]; setLogs(nList); localStorage.setItem('techmaintain_logs', JSON.stringify(nList)); }
  };
  const saveDailyTaskData = async (taskObj) => {
      if (db && fbUser) await setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'daily_tasks', String(taskObj.id)), taskObj);
      else { const nList = [taskObj, ...dailyTasks]; setDailyTasks(nList); localStorage.setItem('techmaintain_daily', JSON.stringify(nList)); }
  };
  const saveUtilityLogData = async (logObj) => {
      if (db && fbUser) await setDoc(doc(db, 'artifacts', safeAppId, 'public', 'data', 'utility_logs', String(logObj.id)), logObj);
      else { const nList = [logObj, ...utilityLogs]; setUtilityLogs(nList); localStorage.setItem('techmaintain_utility', JSON.stringify(nList)); }
  };

  const handleLogin = (username, password) => {
    const foundUser = usersList.find(u => u.username === username && u.password === password);
    if (foundUser) {
      setUser(foundUser);
      // Dùng param replace = true để xóa đè lịch sử login, không cho back về trang đăng nhập
      setView(foundUser.role === 'admin' ? 'dashboard' : 'home', true);
      showNotification(`Xin chào, ${foundUser.name}`);
    } else showNotification('Tài khoản hoặc mật khẩu không đúng!', 'error');
  };

  const handleLogout = () => { 
      setUser(null); 
      setView('login', true); 
      setSelectedMachine(null); 
  };

  const handleScanSuccess = (id) => {
    if (!id) return;
    const machine = machines.find(m => m.id === id);
    if (machine) { setSelectedMachine(machine); setView('details'); showNotification(`Quét thành công`); }
    else if (typeof id === 'string' && id.length > 2) if (!notification) showNotification(`Mã không hợp lệ`, 'error'); 
  };

  const pushToGoogleSheet = async (logData) => {
    if (!googleSheetUrl) return;
    try {
      let payload = {};
      
      if (logData.formType === 'utility_log') {
          payload = {
              id: logData.id,
              formType: 'utility_log',
              date: logData.date,
              technician: logData.technicianName,
              note: logData.note,
              elec1_json: JSON.stringify(logData.elec1),
              elec2_json: JSON.stringify(logData.elec2),
              water_json: JSON.stringify(logData.water),
              images: logData.images
          };
      } else if (logData.formType === 'daily_task') {
          payload = {
              formType: 'daily_task', id: logData.id, date: logData.date, technician: logData.technicianName,
              taskName: logData.taskName, startTime: logData.startTime, endTime: logData.endTime,
              type: logData.type, note: logData.note, status: logData.status, images: logData.images,
              parts: logData.parts ? logData.parts.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(', ') : ''
          };
      } else {
          payload = {
              id: logData.id,
              formType: 'maintenance',
              machineId: logData.machineId,
              machineName: selectedMachine?.name || '',
              date: logData.date,
              technician: logData.technician,
              type: logData.type,
              note: logData.note,
              status: logData.status,
              parts: logData.parts ? logData.parts.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(', ') : '',
              images: logData.images
          };
      }

      await fetch(googleSheetUrl, { 
        method: 'POST', 
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      console.log("Đã xuất báo cáo lên Google Sheet");
    } catch (error) {
      console.error("Lỗi gửi Google Sheet:", error);
    }
  };

  const handleSaveDailyTask = async (newLog) => {
      const entry = { id: Date.now(), formType: 'daily_task', ...newLog };
      await saveDailyTaskData(entry);
      
      for (const usedPart of newLog.parts) {
          const foundPart = inventory.find(i => i.name === usedPart.name);
          if (foundPart) await saveInventoryData({ ...foundPart, quantity: Math.max(0, foundPart.quantity - Number(usedPart.quantity)) });
      }
      
      if(googleSheetUrl) pushToGoogleSheet(entry);
      
      showNotification('Đã lưu báo cáo hằng ngày!');
      setView(user.role === 'admin' ? 'daily_task_history' : 'home');
  };

  const handleSaveUtilityLog = async (data) => {
      const entry = { formType: 'utility_log', ...data };
      await saveUtilityLogData(entry);
      
      if (googleSheetUrl) {
          pushToGoogleSheet(entry);
      }
      
      showNotification(db ? 'Đã lưu sổ điện nước!' : 'Đã lưu cục bộ (Offline)');
      setView(user.role === 'admin' ? 'utility_history' : 'home');
  };

  const handleSaveLog = async (newLog) => {
    const logEntry = { id: Date.now(), machineId: selectedMachine.id, date: new Date().toISOString().split('T')[0], technician: newLog.technicianName || user.name, ...newLog };
    await saveLogData(logEntry);
    const updatedMachine = { ...selectedMachine, status: newLog.status === 'Hoàn thành' ? 'operational' : 'maintenance' };
    setSelectedMachine(updatedMachine);

    for (const usedPart of newLog.parts) {
        const foundPart = inventory.find(i => i.name === usedPart.name);
        if (foundPart) await saveInventoryData({ ...foundPart, quantity: Math.max(0, foundPart.quantity - Number(usedPart.quantity)) });
    }

    if (googleSheetUrl) pushToGoogleSheet({ formType: 'maintenance', ...logEntry });
    
    showNotification('Đã lưu báo cáo máy!');
    setView('details');
  };

  const showNotification = (msg, type = 'success') => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3000); };

  if (!user) return (
      <div className="fixed inset-0 bg-slate-900 flex justify-center overflow-hidden">
         <div className="w-full max-w-md h-full relative overflow-hidden"><LoginView handleLogin={handleLogin} isCloudSyncing={isCloudSyncing} db={db} /></div>
         {notification && (<div className={`absolute top-4 left-4 right-4 max-w-md mx-auto p-4 rounded-lg shadow-xl flex items-center space-x-3 z-50 animate-bounce-in ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'}`}>{notification.type === 'error' ? <AlertCircle /> : <CheckCircle />}<span className="font-medium">{notification.msg}</span></div>)}
      </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900 flex justify-center overflow-hidden font-sans text-slate-800">
      <div className="w-full max-w-md h-full bg-slate-100 shadow-2xl flex flex-col relative overflow-hidden">
        <div className="h-1 bg-blue-600 w-full shrink-0"></div>
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {view === 'dashboard' && <DashboardView user={user} machines={machines} dailyTasks={dailyTasks} utilityLogs={utilityLogs} handleLogout={handleLogout} setView={setView} db={db} />}
          {view === 'user_management' && <UserManagementView usersList={usersList} setView={setView} showNotification={showNotification} saveUserData={saveUserData} handleDeleteUser={handleDeleteUser} />}
          {view === 'machines' && <MachineManagementView machines={machines} setView={setView} showNotification={showNotification} saveMachineData={saveMachineData} />}
          {view === 'settings' && <SettingsView setView={setView} showNotification={showNotification} googleSheetUrl={googleSheetUrl} setGoogleSheetUrl={setGoogleSheetUrl} />}
          {view === 'inventory' && <InventoryView inventory={inventory} setView={setView} showNotification={showNotification} saveInventoryData={saveInventoryData} user={user} db={db} />}
          {view === 'qr_print' && <QrPrintView machines={machines} setView={setView} />}
          {view === 'home' && <HomeView user={user} setView={setView} handleLogout={handleLogout} db={db} />}
          {view === 'daily_task_form' && <DailyTaskFormView user={user} inventory={inventory} setView={setView} showNotification={showNotification} handleSaveDailyTask={handleSaveDailyTask} />}
          {view === 'daily_task_history' && <DailyTaskHistoryView dailyTasks={dailyTasks} usersList={usersList} setView={setView} user={user} />}
          {view === 'utility_form' && <UtilityFormView user={user} setView={setView} showNotification={showNotification} handleSaveUtilityLog={handleSaveUtilityLog} editData={utilityEditItem} setEditData={setUtilityEditItem} utilityLogs={utilityLogs} />}
          {view === 'utility_history' && <UtilityHistoryView utilityLogs={utilityLogs} usersList={usersList} setView={setView} user={user} setEditData={setUtilityEditItem} />}
          {view === 'scanner' && <ScannerView user={user} setView={setView} handleScanSuccess={handleScanSuccess} machines={machines} />}
          {view === 'manual_select' && <ManualSelectView machines={machines} setView={setView} handleScanSuccess={handleScanSuccess} />}
          {view === 'details' && selectedMachine && <DetailsView user={user} logs={logs} selectedMachine={selectedMachine} setView={setView} showNotification={showNotification} saveMachineData={saveMachineData} handleDeleteMachine={(id) => { saveMachineData({...machines.find(m => m.id === id), _delete: true}) }} />}
          {view === 'form' && <LogFormView selectedMachine={selectedMachine} user={user} inventory={inventory} setView={setView} showNotification={showNotification} handleSaveLog={handleSaveLog} />}
        </div>
        {notification && (<div className={`absolute top-4 left-4 right-4 p-4 rounded-lg shadow-xl flex items-center space-x-3 z-50 animate-bounce-in ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'}`}>{notification.type === 'error' ? <AlertCircle /> : <CheckCircle />}<span className="font-medium">{notification.msg}</span></div>)}
      </div>
    </div>
  );
}