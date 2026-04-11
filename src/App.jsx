import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Wrench, History, ArrowLeft, Save, CheckCircle, AlertCircle, User, Package, LogOut, FileSpreadsheet, Lock, PieChart, BarChart3, Settings, Printer, Plus, X, Camera, Search, MapPin, ListFilter, Eye, Trash2, Edit, Boxes, Download, Upload, Database, Cloud, CloudOff, Users, Zap, Droplets, Gauge, Calendar } from 'lucide-react';

// --- FIREBASE CLOUD DATABASE SETUP ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

const myFirebaseConfig = {
  apiKey: "AIzaSyDedcI5SKRTek49VEkH6s71ogC8-orTjkg", 
  authDomain: "techmaintain-app.firebaseapp.com",
  projectId: "techmaintain-app",
  storageBucket: "techmaintain-app.firebasestorage.app",
  messagingSenderId: "202386593017",
  appId: "1:202386593017:web:3e47d12a813446e770be28"
};

const app = initializeApp(myFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// -------------------------------------

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

// --- Hàm tải thư viện quét mã QR Camera ---
const loadHtml5QrCode = async () => {
  if (window.Html5Qrcode) return window.Html5Qrcode;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.onload = () => resolve(window.Html5Qrcode);
    script.onerror = () => reject(new Error("Lỗi tải thư viện quét QR"));
    document.body.appendChild(script);
  });
};

// --- MOCK DATA MẶC ĐỊNH ---
const USERS = [
  { username: 'admin', password: '123', name: 'Quản Lý Trưởng', role: 'admin' },
  { username: 'tech', password: '123', name: 'KTV Nguyễn Văn A', role: 'maintenance' },
  { username: 'tech2', password: '123', name: 'KTV Trần Thị B', role: 'maintenance' }
];

const INITIAL_MACHINES = [
  { id: 'M-101', name: 'Máy Phay CNC 3 Trục', model: 'Haas VF-2', location: 'Xưởng A - Khu vực 2', status: 'operational' },
  { id: 'M-102', name: 'Máy Ép Nhựa Thủy Lực', model: 'Haitian Mars II', location: 'Xưởng B - Cổng chính', status: 'maintenance' },
  { id: 'M-103', name: 'Hệ Thống Băng Tải Tự Động', model: 'Conveyor Pro X', location: 'Kho Thành Phẩm', status: 'broken' },
  { id: 'M-104', name: 'Cánh Tay Robot Hàn', model: 'Kuka KR-16', location: 'Xưởng C - Dây chuyền 1', status: 'operational' }
];

const INITIAL_LOGS = [
  { 
    id: 1, machineId: 'M-101', date: '2023-10-15', technician: 'KTV Nguyễn Văn A', type: 'Bảo trì định kỳ', 
    note: 'Thay dầu, kiểm tra trục chính. Máy hoạt động tốt.', 
    parts: [{ name: 'Dầu máy CNC', unit: 'Lít', quantity: 5 }], 
    images: [] 
  }
];

const INITIAL_INVENTORY = [
  { id: 'P-101', name: 'Dầu máy CNC', unit: 'Lít', quantity: 45 },
  { id: 'P-102', name: 'Mỡ bò bôi trơn', unit: 'Hộp', quantity: 20 },
  { id: 'P-103', name: 'Ốc vít M8', unit: 'Cái', quantity: 500 },
  { id: 'P-104', name: 'Cảm biến quang Omron', unit: 'Cái', quantity: 8 }
];

const INITIAL_TECHNICIANS = [
  { id: 'T-1', name: 'Quản Lý Trưởng' },
  { id: 'T-2', name: 'KTV Nguyễn Văn A' },
  { id: 'T-3', name: 'KTV Trần Thị B' }
];

// Hàm tính toán Cos Phi
const calcCosPhi = (normal, peak, offPeak, reactive) => {
    const P = (parseFloat(normal) || 0) + (parseFloat(peak) || 0) + (parseFloat(offPeak) || 0);
    const Q = parseFloat(reactive) || 0;
    if (P === 0 && Q === 0) return 0;
    const S = Math.sqrt(Math.pow(P, 2) + Math.pow(Q, 2));
    if (S === 0) return 0;
    return (P / S).toFixed(2);
};

export default function App() {
  // --- STATE ---
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('login'); 
  const [machines, setMachines] = useState(INITIAL_MACHINES);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [technicians, setTechnicians] = useState(INITIAL_TECHNICIANS);
  const [meterLogs, setMeterLogs] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  
  // State Đám mây
  const [fbUser, setFbUser] = useState(null);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState(localStorage.getItem('gs_url') || '');

  // --- KẾT NỐI FIREBASE ĐÁM MÂY ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Firebase auth error:", e);
        setFbUser({ uid: 'guest' }); // Fallback an toàn
      }
    };
    initAuth();
    
    const unsub = onAuthStateChanged(auth, u => {
      if (u) setFbUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!fbUser) return;
    setIsCloudSynced(true);

    const unsubMachines = onSnapshot(collection(db, 'machines'), (snapshot) => {
      if (snapshot.empty) {
        INITIAL_MACHINES.forEach(m => setDoc(doc(db, 'machines', m.id), m));
      } else {
        setMachines(snapshot.docs.map(d => d.data()));
      }
    });

    const unsubLogs = onSnapshot(collection(db, 'logs'), (snapshot) => {
      if (snapshot.empty) {
        INITIAL_LOGS.forEach(l => setDoc(doc(db, 'logs', String(l.id)), l));
      } else {
        setLogs(snapshot.docs.map(d => d.data()).sort((a,b) => b.id - a.id));
      }
    });

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      if (snapshot.empty) {
        INITIAL_INVENTORY.forEach(i => setDoc(doc(db, 'inventory', i.id), i));
      } else {
        setInventory(snapshot.docs.map(d => d.data()));
      }
    });

    const unsubTechnicians = onSnapshot(collection(db, 'technicians'), (snapshot) => {
      if (snapshot.empty) {
        INITIAL_TECHNICIANS.forEach(t => setDoc(doc(db, 'technicians', t.id), t));
      } else {
        setTechnicians(snapshot.docs.map(d => d.data()));
      }
    });

    const unsubMeterLogs = onSnapshot(collection(db, 'meter_logs'), (snapshot) => {
      if (!snapshot.empty) {
        setMeterLogs(snapshot.docs.map(d => d.data()).sort((a,b) => b.id - a.id));
      } else {
        setMeterLogs([]);
      }
    });

    return () => { unsubMachines(); unsubLogs(); unsubInventory(); unsubTechnicians(); unsubMeterLogs(); };
  }, [fbUser]);

  // --- ACTIONS ---

  const handleLogin = (username, password) => {
    const foundUser = USERS.find(u => u.username === username && u.password === password);
    if (foundUser) {
      setUser(foundUser);
      setView(foundUser.role === 'admin' ? 'dashboard' : 'home');
      showNotification(`Xin chào, ${foundUser.name}`);
    } else {
      showNotification('Sai tên đăng nhập hoặc mật khẩu!', 'error');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
    setSelectedMachine(null);
  };

  const handleScanSuccess = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    if (machine) {
      setSelectedMachine(machine);
      setShowQrCode(false);
      setView('details');
    } else {
      showNotification('Không tìm thấy mã máy này!', 'error');
    }
  };

  const handleUpdateMachine = async (updatedMachine) => {
    const newList = machines.map(m => m.id === updatedMachine.id ? updatedMachine : m);
    setMachines(newList);
    if (selectedMachine && selectedMachine.id === updatedMachine.id) {
        setSelectedMachine(updatedMachine);
    }
    showNotification('Đã cập nhật thông tin thiết bị', 'success');
    if (isCloudSynced) await setDoc(doc(db, 'machines', updatedMachine.id), updatedMachine);
  };

  const handleDeleteMachine = async (id) => {
    setMachines(machines.filter(m => m.id !== id));
    if (selectedMachine && selectedMachine.id === id) {
        setSelectedMachine(null);
        setView(user.role === 'admin' ? 'dashboard' : 'home');
    }
    showNotification('Đã xóa thiết bị', 'success');
    if (isCloudSynced) await deleteDoc(doc(db, 'machines', id));
  };

  const handleDeleteLog = async (id) => {
    setLogs(logs.filter(l => l.id !== id));
    showNotification('Đã xóa báo cáo', 'success');
    if (isCloudSynced) await deleteDoc(doc(db, 'logs', String(id)));
  };

  const handleDeleteMeterLog = async (id) => {
    setMeterLogs(meterLogs.filter(l => l.id !== id));
    showNotification('Đã xóa ghi nhận điện/nước', 'success');
    if (isCloudSynced) await deleteDoc(doc(db, 'meter_logs', String(id)));
  };

  const handleUpdateInventory = async (updatedItem) => {
    const existingIndex = inventory.findIndex(i => i.id === updatedItem.id);
    if (existingIndex > -1) {
      const newList = [...inventory];
      newList[existingIndex] = updatedItem;
      setInventory(newList);
    } else {
      setInventory([updatedItem, ...inventory]);
    }
    if (isCloudSynced) await setDoc(doc(db, 'inventory', updatedItem.id), updatedItem);
  };

  const handleUpdateTechnician = async (tech) => {
    const existingIndex = technicians.findIndex(t => t.id === tech.id);
    if (existingIndex > -1) {
      const newList = [...technicians];
      newList[existingIndex] = tech;
      setTechnicians(newList);
    } else {
      setTechnicians([tech, ...technicians]);
    }
    if (isCloudSynced) await setDoc(doc(db, 'technicians', tech.id), tech);
  };

  const handleDeleteTechnician = async (id) => {
    setTechnicians(technicians.filter(t => t.id !== id));
    showNotification('Đã xóa nhân sự', 'success');
    if (isCloudSynced) await deleteDoc(doc(db, 'technicians', id));
  };

  const saveToGoogleSheet = async (logData) => {
    if (!googleSheetUrl) return;
    try {
      const payload = {
        formType: 'maintenance',
        id: logData.id,
        machineId: logData.machineId,
        machineName: selectedMachine.name,
        date: logData.date,
        technician: logData.technician,
        type: logData.type,
        note: logData.note,
        status: logData.status,
        parts: logData.parts.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(', '),
        images: logData.images || []
      };

      await fetch(googleSheetUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
    } catch (error) { console.error("Lỗi gửi Google Sheet:", error); }
  };

  const saveMeterToGoogleSheet = async (data) => {
    if (!googleSheetUrl) return;
    try {
      let payload = {
        id: data.id,
        date: data.date,
        technician: data.technicianName,
      };

      if (data.recordType === 'water') {
        payload.formType = 'water_log';
        payload.water = data.water;
      } else if (data.recordType === 'electricity') {
        payload.formType = 'electricity_log';
        payload.s1_normal = data.s1_normal;
        payload.s1_peak = data.s1_peak;
        payload.s1_offpeak = data.s1_offpeak;
        payload.s1_reactive = data.s1_reactive;
        payload.s1_cosPhi = calcCosPhi(data.s1_normal, data.s1_peak, data.s1_offpeak, data.s1_reactive);
        payload.s2_normal = data.s2_normal;
        payload.s2_peak = data.s2_peak;
        payload.s2_offpeak = data.s2_offpeak;
        payload.s2_reactive = data.s2_reactive;
        payload.s2_cosPhi = calcCosPhi(data.s2_normal, data.s2_peak, data.s2_offpeak, data.s2_reactive);
      } else {
        payload.formType = 'meter_log';
        payload.water = data.water;
        payload.s1_normal = data.s1_normal;
        payload.s1_peak = data.s1_peak;
        payload.s1_offpeak = data.s1_offpeak;
        payload.s1_reactive = data.s1_reactive;
        payload.s1_cosPhi = calcCosPhi(data.s1_normal, data.s1_peak, data.s1_offpeak, data.s1_reactive);
        payload.s2_normal = data.s2_normal;
        payload.s2_peak = data.s2_peak;
        payload.s2_offpeak = data.s2_offpeak;
        payload.s2_reactive = data.s2_reactive;
        payload.s2_cosPhi = calcCosPhi(data.s2_normal, data.s2_peak, data.s2_offpeak, data.s2_reactive);
      }

      await fetch(googleSheetUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
    } catch (error) { console.error("Lỗi gửi Google Sheet điện nước:", error); }
  };

  const handleSaveLog = async (logData) => {
    let finalLogEntry = null;
    let machineToUpdate = null;
    let inventoryToUpdate = [];

    if (editingLog) {
      finalLogEntry = { ...editingLog, ...logData };
      setLogs(logs.map(l => l.id === editingLog.id ? finalLogEntry : l));
    } else {
      finalLogEntry = {
        id: Date.now(),
        machineId: selectedMachine.id,
        date: new Date().toISOString().split('T')[0],
        ...logData
      };
      setLogs([finalLogEntry, ...logs]);
    }

    const statusStr = logData.status === 'Hoàn thành' ? 'operational' : 'maintenance';
    machineToUpdate = { ...selectedMachine, status: statusStr };
    const updatedMachines = machines.map(m => m.id === selectedMachine.id ? machineToUpdate : m);
    setMachines(updatedMachines);
    setSelectedMachine(machineToUpdate);

    if (!editingLog && logData.parts && logData.parts.length > 0) {
      let newInventory = [...inventory];
      logData.parts.forEach(part => {
        const itemIndex = newInventory.findIndex(i => i.name === part.name);
        if (itemIndex > -1) {
          newInventory[itemIndex] = {
            ...newInventory[itemIndex],
            quantity: Math.max(0, newInventory[itemIndex].quantity - Number(part.quantity))
          };
          inventoryToUpdate.push(newInventory[itemIndex]);
        }
      });
      setInventory(newInventory);
    }

    showNotification(editingLog ? 'Đã cập nhật báo cáo!' : 'Đã lưu báo cáo!', 'success');
    setEditingLog(null);
    setView('details');

    if (isCloudSynced) {
        await setDoc(doc(db, 'logs', String(finalLogEntry.id)), finalLogEntry);
        await setDoc(doc(db, 'machines', machineToUpdate.id), machineToUpdate);
        for (let item of inventoryToUpdate) {
            await setDoc(doc(db, 'inventory', item.id), item);
        }
    }
    if (!editingLog && googleSheetUrl) { saveToGoogleSheet(finalLogEntry); }
  };

  const handleSaveMeterLog = async (logData) => {
      if (!logData.technicianName) return showNotification("Vui lòng nhập tên người thực hiện!", "error");
      
      const finalData = { id: Date.now(), ...logData };
      setMeterLogs([finalData, ...meterLogs]);
      showNotification('Đã lưu thông số điện nước!', 'success');
      setView('meter_menu');

      if (isCloudSynced) await setDoc(doc(db, 'meter_logs', String(finalData.id)), finalData);
      if (googleSheetUrl) saveMeterToGoogleSheet(finalData);
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- VIEWS ---

  const LoginView = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isAdminView, setIsAdminView] = useState(false);
    const techUser = USERS.find(u => u.role === 'maintenance');

    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-900 text-white animate-fade-in relative">
        <div className="w-full max-w-xs space-y-8 z-10">
          <div className="text-center space-y-2">
            <div className="bg-blue-600 p-4 rounded-2xl inline-block shadow-lg shadow-blue-500/30">
              <Wrench className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold">TechMaintain</h1>
            <p className="text-slate-400">Hệ thống quản lý bảo trì</p>
          </div>

          {!isAdminView ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider text-center mb-4">
                Dành cho Kỹ thuật viên
              </h3>
              
              <button onClick={() => {
                setUser(techUser);
                setView('home');
                showNotification(`Xin chào, ${techUser.name}`);
              }} className="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl transition-all active:scale-95 shadow-lg flex items-center justify-between border border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="bg-slate-700 p-2 rounded-full"><User className="w-5 h-5 text-blue-400" /></div>
                  <span className="font-medium text-lg">Đăng nhập KTV</span>
                </div>
                <ArrowLeft className="w-5 h-5 rotate-180 text-slate-500" />
              </button>

              <div className="pt-6 border-t border-slate-800">
                <button onClick={() => setIsAdminView(true)} className="w-full bg-transparent border border-slate-700 text-slate-300 hover:text-white font-medium py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center">
                  <Lock className="w-4 h-4 mr-2" /> Đăng nhập Quản trị (Admin)
                </button>
              </div>
              
              <div className="pt-4 text-center">
                {isCloudSynced ? (
                  <span className="inline-flex items-center justify-center text-xs font-medium text-green-400">
                    <Cloud className="w-4 h-4 mr-2" /> Đã kết nối dữ liệu Đám mây
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center text-xs font-medium text-slate-500">
                    <CloudOff className="w-4 h-4 mr-2" /> Đang kết nối Đám mây...
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative">
              <button onClick={() => setIsAdminView(false)} className="absolute -top-4 -left-4 bg-slate-700 p-2 rounded-full hover:bg-slate-600 transition-colors shadow-lg">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h3 className="text-lg font-bold text-center mb-4">Đăng nhập Admin</h3>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tài khoản</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none text-white" placeholder="admin" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Mật khẩu</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none text-white" placeholder="***" />
              </div>
              <button onClick={() => handleLogin(username, password)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg">Đăng Nhập</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const DashboardView = () => (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
        <div><h1 className="font-bold text-xl text-slate-800">Dashboard</h1><p className="text-xs text-slate-500">Xin chào, {user.name}</p></div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-2"><LogOut className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm col-span-2">
              <p className="text-blue-600 text-xs uppercase font-bold">Tổng thiết bị</p>
              <p className="text-2xl font-bold text-blue-800">{machines.length}</p>
           </div>
           <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm"><p className="text-green-600 text-xs font-bold uppercase">Tốt</p><p className="text-2xl font-bold text-green-800 mt-1">{machines.filter(m => m.status === 'operational').length}</p></div>
           <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm"><p className="text-red-600 text-xs font-bold uppercase">Lỗi</p><p className="text-2xl font-bold text-red-800 mt-1">{machines.filter(m => m.status === 'broken').length}</p></div>
        </div>
        
        <div>
          <h3 className="font-bold text-slate-800 mb-3 flex items-center"><Settings className="w-4 h-4 mr-2" /> Quản trị</h3>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
             <button onClick={() => setView('machines')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Database className="w-5 h-5" /></div>
                  <div className="text-left"><p className="font-medium text-slate-800">Quản lý Thiết Bị</p><p className="text-xs text-slate-500">Thêm/Sửa/Xóa, Nhập xuất Excel</p></div>
                </div>
                <ArrowLeft className="w-5 h-5 rotate-180 text-slate-300" />
             </button>
             <button onClick={() => setView('technicians')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><Users className="w-5 h-5" /></div>
                  <div className="text-left"><p className="font-medium text-slate-800">Quản lý Nhân sự</p><p className="text-xs text-slate-500">Thêm/Sửa/Xóa người thực hiện</p></div>
                </div>
                <ArrowLeft className="w-5 h-5 rotate-180 text-slate-300" />
             </button>
             <button onClick={() => setView('inventory')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><Boxes className="w-5 h-5" /></div>
                  <div className="text-left"><p className="font-medium text-slate-800">Kho Vật Tư</p><p className="text-xs text-slate-500">Quản lý tồn kho, Nhập xuất Excel</p></div>
                </div>
                <ArrowLeft className="w-5 h-5 rotate-180 text-slate-300" />
             </button>
             <button onClick={() => setView('meter_menu')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-yellow-100 p-2 rounded-lg text-yellow-600"><Zap className="w-5 h-5" /></div>
                  <div className="text-left"><p className="font-medium text-slate-800">Quản lý Điện Nước</p><p className="text-xs text-slate-500">Ghi nhận và xem lịch sử điện, nước</p></div>
                </div>
                <ArrowLeft className="w-5 h-5 rotate-180 text-slate-300" />
             </button>
             <button onClick={() => setView('qr_print')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Printer className="w-5 h-5" /></div>
                  <div className="text-left"><p className="font-medium text-slate-800">In mã QR Hàng loạt</p><p className="text-xs text-slate-500">Tạo trang in cho tất cả thiết bị</p></div>
                </div>
                <ArrowLeft className="w-5 h-5 rotate-180 text-slate-300" />
             </button>
             <button onClick={() => setView('settings')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-lg text-green-600"><FileSpreadsheet className="w-5 h-5" /></div>
                  <div className="text-left"><p className="font-medium text-slate-800">Cấu hình Google Sheet</p><p className="text-xs text-slate-500">Kết nối cơ sở dữ liệu</p></div>
                </div>
                <ArrowLeft className="w-5 h-5 rotate-180 text-slate-300" />
             </button>
             <button onClick={() => setView('home')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><QrCode className="w-5 h-5" /></div>
                  <div className="text-left"><p className="font-medium text-slate-800">Chế độ Kỹ thuật viên</p><p className="text-xs text-slate-500">Vào giao diện quét & chọn máy</p></div>
                </div>
                <ArrowLeft className="w-5 h-5 rotate-180 text-slate-300" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );

  const MachineManagementView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ id: '', name: '', model: '', location: '', status: 'operational' });
    const [newItem, setNewItem] = useState({ id: '', name: '', model: '', location: '', status: 'operational' });

    const filteredMachines = machines.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAdd = () => {
      if (!newItem.id || !newItem.name) return showNotification('Vui lòng nhập Mã và Tên máy!', 'error');
      if (machines.find(m => m.id === newItem.id)) return showNotification('Mã máy đã tồn tại!', 'error');
      
      setMachines([newItem, ...machines]);
      showNotification('Thêm máy thành công!');
      if (isCloudSynced) setDoc(doc(db, 'machines', newItem.id), newItem);
      
      setNewItem({ id: '', name: '', model: '', location: '', status: 'operational' });
    };

    const startEdit = (machine) => {
      setEditingId(machine.id);
      setEditForm(machine);
    };

    const saveEdit = () => {
      if (!editForm.name) return showNotification('Tên máy không được để trống!', 'error');
      handleUpdateMachine(editForm);
      setEditingId(null);
    };

    const handleExportExcel = async () => {
      try {
        setIsLoading(true);
        const XLSX = await loadXLSX();
        const headers = ['Mã Thiết Bị', 'Tên Thiết Bị', 'Model', 'Vị Trí', 'Trạng Thái'];
        const rows = machines.map(m => [m.id, m.name, m.model, m.location, m.status]);
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachMay");
        XLSX.writeFile(workbook, `DanhSachMay_${new Date().toISOString().split('T')[0]}.xlsx`);
        showNotification('Đã xuất file Excel!');
      } catch (err) {
        showNotification('Lỗi xuất file Excel', 'error');
      } finally { setIsLoading(false); }
    };

    const handleImportExcel = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        setIsLoading(true);
        const XLSX = await loadXLSX();
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
            
            const newMachineList = [...machines];
            let added = 0; let updated = 0;
            
            for (let i = 1; i < rows.length; i++) {
              const cols = rows[i];
              if (!cols || cols.length === 0) continue;
              const id = cols[0] ? String(cols[0]).trim() : '';
              const name = cols[1] ? String(cols[1]).trim() : '';
              if (id && name) {
                 const existingIdx = newMachineList.findIndex(m => m.id === id);
                 const mData = { id, name, model: cols[2]||'', location: cols[3]||'', status: cols[4]||'operational' };
                 if (existingIdx > -1) {
                    newMachineList[existingIdx] = mData; updated++;
                 } else {
                    newMachineList.push(mData); added++;
                 }
                 if (isCloudSynced) setDoc(doc(db, 'machines', id), mData);
              }
            }
            setMachines(newMachineList);
            showNotification(`Cập nhật ${updated}, Thêm mới ${added} thiết bị`, 'success');
          } catch (err) { showNotification('Lỗi đọc file Excel', 'error'); }
          finally { setIsLoading(false); }
        };
        reader.readAsArrayBuffer(file);
      } catch (err) { showNotification('Lỗi thư viện', 'error'); setIsLoading(false); }
      e.target.value = null;
    };

    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white p-4 border-b border-slate-200 shrink-0 shadow-sm space-y-4">
           <div className="flex items-center space-x-3">
               <button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6" /></button>
               <h2 className="font-bold text-slate-800 text-lg">Quản lý Thiết Bị</h2>
           </div>
           <div className="flex gap-2">
               <button disabled={isLoading} onClick={handleExportExcel} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 shadow-sm"><Download className="w-4 h-4 text-blue-600" /> Tải File</button>
               <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImportExcel} />
               <button disabled={isLoading} onClick={() => fileInputRef.current.click()} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 shadow-sm"><Upload className="w-4 h-4 text-green-600" /> Nhập File</button>
           </div>
           <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input type="text" placeholder="Tìm mã hoặc tên máy..." className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
           <div className="bg-slate-100/50 p-3 rounded-xl border border-dashed border-slate-300 mb-2">
              <h3 className="text-[11px] uppercase font-bold text-slate-500 mb-2">Thêm thiết bị mới</h3>
              <div className="flex flex-col gap-2">
                 <div className="flex gap-2">
                    <input placeholder="Mã máy (VD: M-107)" className="w-1/3 p-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={newItem.id} onChange={e => setNewItem({...newItem, id: e.target.value})} />
                    <input placeholder="Tên thiết bị" className="w-2/3 p-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                 </div>
                 <div className="flex gap-2">
                    <input placeholder="Vị trí (VD: Xưởng A)" className="w-1/2 p-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} />
                    <button onClick={handleAdd} className="w-1/2 bg-slate-800 text-white p-2 rounded-lg font-medium text-sm flex justify-center items-center"><Plus className="w-4 h-4 mr-1"/> Thêm Máy</button>
                 </div>
              </div>
           </div>

           <div className="flex justify-between items-center text-xs text-slate-500 uppercase font-bold tracking-wider mb-2"><span>Danh sách thiết bị ({filteredMachines.length})</span></div>
           
           <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              {filteredMachines.length > 0 ? filteredMachines.map((m, idx) => (
                <div key={m.id} className={`p-4 flex flex-col ${idx !== filteredMachines.length -1 ? 'border-b border-slate-100' : ''}`}>
                  {editingId === m.id ? (
                     <div className="flex flex-col gap-2 bg-blue-50/50 p-3 rounded-lg border border-blue-200 shadow-inner">
                        <input className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white outline-none" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Tên máy" />
                        <div className="flex gap-2">
                           <input className="w-1/2 p-2 border border-slate-300 rounded-lg text-sm bg-white outline-none" value={editForm.model} onChange={e => setEditForm({...editForm, model: e.target.value})} placeholder="Model" />
                           <input className="w-1/2 p-2 border border-slate-300 rounded-lg text-sm bg-white outline-none" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} placeholder="Vị trí" />
                        </div>
                        <select className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white outline-none" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                            <option value="operational">Hoạt động tốt</option>
                            <option value="maintenance">Đang bảo trì</option>
                            <option value="broken">Bị hỏng</option>
                        </select>
                        <div className="flex justify-end gap-2 mt-2">
                           <button onClick={() => handleDeleteMachine(m.id)} className="mr-auto p-1.5 bg-red-50 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                           <button onClick={() => setEditingId(null)} className="px-4 py-1.5 text-sm bg-slate-200 text-slate-700 font-medium rounded-lg">Hủy</button>
                           <button onClick={saveEdit} className="px-4 py-1.5 text-sm bg-blue-600 text-white font-medium rounded-lg">Lưu</button>
                        </div>
                     </div>
                  ) : (
                    <div className="flex justify-between items-center">
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <div className={`w-2 h-2 rounded-full ${m.status === 'operational' ? 'bg-green-500' : m.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                             <h4 className="font-bold text-slate-800">{m.name}</h4>
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5"><span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 mr-2">{m.id}</span> {m.location}</div>
                       </div>
                       <button onClick={() => startEdit(m)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-100 rounded-lg border border-slate-100"><Edit className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              )) : (<div className="p-8 text-center text-slate-400 text-sm">Không tìm thấy thiết bị.</div>)}
           </div>
        </div>
      </div>
    );
  };

  const InventoryView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);
    const [newItem, setNewItem] = useState({ name: '', unit: '', quantity: '' });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', unit: '', quantity: '' });

    const filteredInventory = inventory.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleAddOrUpdate = () => {
      if (!newItem.name || !newItem.unit || !newItem.quantity) { showNotification('Vui lòng nhập đủ thông tin!', 'error'); return; }
      
      const existingItem = inventory.find(i => i.name.toLowerCase() === newItem.name.toLowerCase());
      if (existingItem) {
        const newQty = existingItem.quantity + Number(newItem.quantity);
        handleUpdateInventory({ ...existingItem, quantity: newQty, unit: newItem.unit });
        showNotification(`Đã cộng thêm ${newItem.quantity} vào ${newItem.name}`);
      } else {
        const newId = 'P-' + Date.now();
        handleUpdateInventory({ id: newId, name: newItem.name, unit: newItem.unit, quantity: Number(newItem.quantity) });
        showNotification('Đã lưu vật tư mới!');
      }
      setNewItem({ name: '', unit: '', quantity: '' }); 
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditForm({ name: item.name, unit: item.unit, quantity: item.quantity });
    };

    const saveEdit = () => {
        if (!editForm.name || !editForm.unit || editForm.quantity === '') { showNotification('Vui lòng nhập đủ thông tin!', 'error'); return; }
        const existingItem = inventory.find(i => i.id === editingId);
        if (existingItem) {
            handleUpdateInventory({ ...existingItem, name: editForm.name, unit: editForm.unit, quantity: Number(editForm.quantity) });
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
        showNotification('Đã xuất file Excel!');
      } catch (err) {
        showNotification('Lỗi xuất file Excel', 'error');
      } finally { setIsLoading(false); }
    };

    const handleImportExcel = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        setIsLoading(true);
        const XLSX = await loadXLSX();
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
            
            const newInvList = [...inventory];
            let added = 0; let updated = 0;
            
            for (let i = 1; i < rows.length; i++) {
              const cols = rows[i];
              if (!cols || cols.length === 0) continue;
              const id = cols[0] ? String(cols[0]).trim() : '';
              const name = cols[1] ? String(cols[1]).trim() : '';
              const unit = cols[2] ? String(cols[2]).trim() : '';
              const qty = cols[3] !== undefined ? Number(cols[3]) : 0;

              if (name || id) {
                 const existingIdx = newInvList.findIndex(item => (id && item.id === id) || item.name.toLowerCase() === name.toLowerCase());
                 let itemData;
                 if (existingIdx > -1) {
                    itemData = { ...newInvList[existingIdx], quantity: isNaN(qty) ? 0 : qty, unit: unit || newInvList[existingIdx].unit };
                    newInvList[existingIdx] = itemData;
                    updated++;
                 } else {
                    itemData = { id: id || `P-${Date.now()}-${i}`, name, unit, quantity: isNaN(qty) ? 0 : qty };
                    newInvList.push(itemData);
                    added++;
                 }
                 if (isCloudSynced) setDoc(doc(db, 'inventory', itemData.id), itemData);
              }
            }
            setInventory(newInvList);
            showNotification(`Cập nhật ${updated}, Thêm mới ${added} vật tư`, 'success');
          } catch (err) { showNotification('Lỗi đọc file Excel', 'error'); }
          finally { setIsLoading(false); }
        };
        reader.readAsArrayBuffer(file);
      } catch (err) { showNotification('Lỗi thư viện', 'error'); setIsLoading(false); }
      e.target.value = null;
    };

    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white p-4 border-b border-slate-200 shrink-0 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3"><button onClick={() => setView(user.role === 'admin' ? 'dashboard' : 'home')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6" /></button><h2 className="font-bold text-slate-800 text-lg">Kho Vật Tư</h2></div>
          </div>
          {user.role === 'admin' && (
             <div className="flex gap-2">
                 <button disabled={isLoading} onClick={handleExportExcel} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"><Download className="w-4 h-4 text-blue-600" /> Tải File</button>
                 <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImportExcel} />
                 <button disabled={isLoading} onClick={() => fileInputRef.current.click()} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"><Upload className="w-4 h-4 text-green-600" /> Nhập Kho</button>
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

  const SettingsView = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-slate-100 flex items-center space-x-3">
        <button onClick={() => setView('dashboard')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
        <h2 className="font-bold text-slate-800">Cấu hình Google Sheet</h2>
      </div>
      <div className="p-6 space-y-4">
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-sm text-yellow-800">
          <strong>Hướng dẫn:</strong>
          <ul className="list-disc ml-4 mt-2 space-y-1">
             <li>Tạo Google Sheet mới & Apps Script.</li>
             <li>Triển khai dưới dạng Web App (Access: Anyone).</li>
             <li>Dán URL vào ô bên dưới.</li>
          </ul>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Google Apps Script URL</label>
          <input 
            type="text" 
            value={googleSheetUrl}
            onChange={(e) => setGoogleSheetUrl(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="https://script.google.com/macros/s/..."
          />
        </div>
        <button 
          onClick={() => {
            localStorage.setItem('gs_url', googleSheetUrl);
            showNotification('Đã lưu cấu hình!');
            setView('dashboard');
          }}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg"
        >
          Lưu Cấu Hình
        </button>
      </div>
    </div>
  );

  const QrPrintView = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between no-print">
        <div className="flex items-center space-x-3">
            <button onClick={() => setView('dashboard')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
            <h2 className="font-bold text-slate-800">In mã QR</h2>
        </div>
        <button onClick={() => window.print()} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm">
            <Printer className="w-4 h-4" /> <span>In Ngay</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-8 bg-slate-100 print:bg-white print:p-0">
        <div className="grid grid-cols-2 gap-8 print:grid-cols-3 print:gap-4">
            {machines.map(m => (
                <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center print:shadow-none print:border-2 print:border-black">
                    <h3 className="font-bold text-lg mb-2">{m.name}</h3>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${m.id}`} 
                      alt={m.name} 
                      className="w-32 h-32 object-contain"
                    />
                    <p className="font-mono text-sm mt-2 font-bold">{m.id}</p>
                    <p className="text-xs text-slate-500">{m.model}</p>
                </div>
            ))}
        </div>
      </div>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );

  const HomeView = () => (
    <div className="flex flex-col items-center justify-center h-full space-y-8 p-6 relative">
      <div className="absolute top-4 right-4 flex items-center space-x-3">
        {user.role === 'admin' && <button onClick={() => setView('dashboard')} className="text-blue-600 font-medium text-sm bg-blue-50 px-3 py-1.5 rounded-lg">Dashboard</button>}
        <button onClick={handleLogout} className="text-slate-400 hover:text-red-500"><LogOut className="w-5 h-5" /></button>
      </div>
      <div className="text-center space-y-2">
        <div className="bg-blue-600 p-4 rounded-2xl inline-block shadow-lg"><Wrench className="w-12 h-12 text-white" /></div>
        <h1 className="text-2xl font-bold text-slate-800">Xin chào, {user.name}</h1>
      </div>
      
      <div className="w-full max-w-xs space-y-4">
          <button 
            onClick={() => setView('scanner')} 
            className="w-full bg-slate-900 text-white py-4 px-6 rounded-xl flex items-center justify-center space-x-3 shadow-xl active:scale-95 transition-transform"
          >
            <QrCode className="w-6 h-6" />
            <span className="font-semibold text-lg">Quét Mã QR</span>
          </button>

          <button 
            onClick={() => setView('manual_select')} 
            className="w-full bg-white text-slate-700 border border-slate-200 py-4 px-6 rounded-xl flex items-center justify-center space-x-3 shadow-sm hover:bg-slate-50 active:scale-95 transition-transform"
          >
            <ListFilter className="w-6 h-6 text-slate-500" />
            <span className="font-semibold text-lg">Chọn Thủ Công</span>
          </button>

          <button 
            onClick={() => setView('inventory')} 
            className="w-full bg-white text-slate-700 border border-slate-200 py-4 px-6 rounded-xl flex items-center justify-center space-x-3 shadow-sm hover:bg-slate-50 active:scale-95 transition-transform"
          >
            <Boxes className="w-6 h-6 text-orange-500" />
            <span className="font-semibold text-lg">Kho Vật Tư</span>
          </button>

          <button 
            onClick={() => setView('meter_menu')} 
            className="w-full bg-blue-50 text-blue-700 border border-blue-200 py-4 px-6 rounded-xl flex items-center justify-center space-x-3 shadow-sm hover:bg-blue-100 active:scale-95 transition-transform mt-4"
          >
            <Zap className="w-6 h-6" />
            <span className="font-semibold text-lg">Ghi Điện / Nước</span>
          </button>
      </div>
      
      <p className="text-sm text-slate-400 text-center">
        Chọn phương thức để bắt đầu công việc
      </p>
    </div>
  );

  const ScannerView = () => {
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const lastScannedRef = useRef(null);
    const html5QrCodeRef = useRef(null);

    useEffect(() => {
      const initScanner = async () => {
        try {
          const Html5Qrcode = await loadHtml5QrCode();
          const html5QrCode = new Html5Qrcode("qr-reader");
          html5QrCodeRef.current = html5QrCode;
          
          await html5QrCode.start(
            { facingMode: "environment" }, 
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              if (decodedText !== lastScannedRef.current) {
                lastScannedRef.current = decodedText;
                const machine = machines.find(m => m.id === decodedText);
                
                if (machine) {
                  html5QrCode.stop().then(() => {
                    handleScanSuccess(decodedText);
                  }).catch(console.error);
                } else {
                  showNotification(`Mã không hợp lệ: ${decodedText}`, 'error');
                  setTimeout(() => { lastScannedRef.current = null; }, 3000);
                }
              }
            },
            (errorMessage) => { }
          );
          setIsCameraReady(true);
        } catch (err) {
          console.error("Camera error:", err);
          setErrorMsg('Không thể mở Camera. Vui lòng kiểm tra và cấp quyền!');
        }
      };

      initScanner();

      return () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(console.error);
        }
      };
    }, []);

    return (
      <div className="flex flex-col h-full bg-black relative">
        <div className="absolute top-0 left-0 right-0 p-4 z-30">
          <button onClick={() => setView(user.role === 'admin' ? 'dashboard' : 'home')} className="text-white flex items-center space-x-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-md hover:bg-black/70 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Quay lại</span>
          </button>
        </div>

        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center overflow-hidden">
           <div id="qr-reader" className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full"></div>
           
           {!isCameraReady && !errorMsg && (
             <div className="absolute text-white flex flex-col items-center">
               <Camera className="w-8 h-8 mb-2 animate-pulse text-blue-400" />
               <p>Đang yêu cầu quyền Camera...</p>
             </div>
           )}
           {errorMsg && (
             <p className="absolute text-red-400 text-center px-6 font-medium bg-black/80 p-4 rounded-xl border border-red-500/30 backdrop-blur-md">
               {errorMsg}
             </p>
           )}
        </div>

        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center justify-center shadow-[inset_0_0_0_2000px_rgba(0,0,0,0.5)]">
           <div className="w-64 h-64 relative">
             <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl"></div>
             <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl"></div>
             <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl"></div>
             <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-blue-500 rounded-br-2xl"></div>
             {isCameraReady && <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_10px_2px_rgba(239,68,68,0.5)] animate-[scan_2s_ease-in-out_infinite]"></div>}
           </div>
           <p className="text-white/90 text-sm font-medium mt-8 bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-md">Di chuyển camera đến mã QR</p>
        </div>

        <div className="absolute bottom-8 left-0 right-0 px-6 z-30">
           <p className="text-white/70 text-xs text-center mb-3 font-medium">Hoặc chọn máy (Demo thủ công):</p>
           <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
               {machines.map(m => (
                   <button 
                      key={m.id} 
                      onClick={() => {
                         if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                             html5QrCodeRef.current.stop().catch(console.error);
                         }
                         handleScanSuccess(m.id);
                      }}
                      className="whitespace-nowrap bg-slate-800/80 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm backdrop-blur-md border border-slate-700 transition-colors shadow-lg"
                   >
                      {m.name}
                   </button>
               ))}
           </div>
        </div>
        
        <style>{`
          @keyframes scan {
            0% { top: 0; }
            50% { top: 100%; }
            100% { top: 0; }
          }
        `}</style>
      </div>
    );
  };

  const ManualSelectView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredMachines = machines.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="flex flex-col h-full bg-slate-50">
         <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
                <button onClick={() => setView('home')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6" /></button>
                <h2 className="font-bold text-slate-800 text-lg">Tìm kiếm thiết bị</h2>
            </div>
            
            <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                type="text" 
                placeholder="Nhập tên hoặc mã máy..." 
                className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                />
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-3">
             <div className="flex justify-between items-center text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">
                 <span>Danh sách ({filteredMachines.length})</span>
             </div>
             
            {filteredMachines.length > 0 ? (
                filteredMachines.map(m => (
                <button 
                  key={m.id}
                  onClick={() => handleScanSuccess(m.id)}
                  className="w-full p-4 bg-white border border-slate-200 hover:border-blue-500 rounded-xl flex items-center justify-between group transition-all shadow-sm active:scale-[0.98]"
                >
                  <div className="flex items-center space-x-4 text-left">
                    <div className={`w-2 h-12 rounded-full ${m.status === 'operational' ? 'bg-green-500' : m.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                    <div>
                      <div className="font-bold text-slate-800 text-lg">{m.name}</div>
                      <div className="text-sm text-slate-500 font-mono flex items-center mt-1">
                         <span className="bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-600 mr-2">{m.id}</span>
                         <MapPin className="w-3 h-3 mr-1" />
                         <span className="truncate max-w-[150px]">{m.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-300 group-hover:text-blue-600 transition-colors">
                      <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center bg-slate-50 group-hover:bg-blue-50 group-hover:border-blue-200">
                          &rarr;
                      </div>
                  </div>
                </button>
              ))
            ) : (
                <div className="text-center py-12 text-slate-400">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Không tìm thấy thiết bị phù hợp.</p>
                </div>
            )}
         </div>
      </div>
    );
  };

  const DetailsView = () => {
    const machineLogs = logs.filter(l => l.machineId === selectedMachine.id);
    const [isEditingMachine, setIsEditingMachine] = useState(false);
    const [editMachineData, setEditMachineData] = useState(selectedMachine);
    const [viewingLog, setViewingLog] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, type: '', id: null });

    const handleConfirmDelete = () => {
      if (confirmDelete.type === 'machine') {
        handleDeleteMachine(confirmDelete.id);
      } else if (confirmDelete.type === 'log') {
        handleDeleteLog(confirmDelete.id);
        if (viewingLog && viewingLog.id === confirmDelete.id) setViewingLog(null);
      }
      setConfirmDelete({ isOpen: false, type: '', id: null });
    };

    return (
      <div className="flex flex-col h-full bg-slate-50 relative">
        <div className="bg-white shadow-sm p-4 sticky top-0 z-10">
            <div className="flex items-center justify-between mb-2">
                <button onClick={() => setView('home')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="font-bold text-slate-800">Chi tiết thiết bị</h2>
                <div>
                   {user.role === 'admin' && !isEditingMachine && (
                     <button onClick={() => setIsEditingMachine(true)} className="p-2 -mr-2 text-blue-600 hover:bg-blue-50 rounded-full">
                         <Edit className="w-5 h-5" />
                     </button>
                   )}
                </div>
            </div>

            {isEditingMachine ? (
               <div className="space-y-3 mt-4 animate-fade-in">
                  <div>
                      <label className="text-xs text-slate-500 font-medium">Tên thiết bị</label>
                      <input value={editMachineData.name} onChange={e => setEditMachineData({...editMachineData, name: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm" placeholder="Tên máy..." />
                  </div>
                  <div>
                      <label className="text-xs text-slate-500 font-medium">Model</label>
                      <input value={editMachineData.model} onChange={e => setEditMachineData({...editMachineData, model: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm" placeholder="Model máy..." />
                  </div>
                  <div>
                      <label className="text-xs text-slate-500 font-medium">Vị trí</label>
                      <input value={editMachineData.location} onChange={e => setEditMachineData({...editMachineData, location: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm" placeholder="Vị trí đặt máy..." />
                  </div>
                  <div>
                      <label className="text-xs text-slate-500 font-medium">Trạng thái</label>
                      <select value={editMachineData.status} onChange={e => setEditMachineData({...editMachineData, status: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm bg-white">
                        <option value="operational">Đang hoạt động tốt</option>
                        <option value="maintenance">Đang bảo trì</option>
                        <option value="broken">Bị hỏng</option>
                      </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-3">
                     <button onClick={() => setConfirmDelete({ isOpen: true, type: 'machine', id: selectedMachine.id })} className="mr-auto p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100">
                         <Trash2 className="w-5 h-5" />
                     </button>
                     <button onClick={() => { setIsEditingMachine(false); setEditMachineData(selectedMachine); }} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">Hủy</button>
                     <button onClick={() => { handleUpdateMachine(editMachineData); setIsEditingMachine(false); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center hover:bg-blue-700"><Save className="w-4 h-4 mr-2" /> Lưu</button>
                  </div>
               </div>
            ) : (
               <div className="animate-fade-in">
                  <h1 className="text-xl font-bold text-slate-900">{selectedMachine.name}</h1>
                  <div className="flex items-center space-x-2 mt-1">
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs font-mono">{selectedMachine.id}</span>
                      <p className="text-slate-500 text-sm flex items-center"><MapPin className="w-3 h-3 mr-1"/> {selectedMachine.location}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${selectedMachine.status === 'operational' ? 'bg-green-50 text-green-700 border-green-200' : selectedMachine.status === 'maintenance' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {selectedMachine.status === 'operational' ? 'Đang hoạt động' : selectedMachine.status === 'maintenance' ? 'Đang bảo trì' : 'Đang hỏng'}
                      </div>
                      <span className="text-xs text-slate-400">Model: {selectedMachine.model}</span>
                  </div>
               </div>
            )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
            <button onClick={() => { setEditingLog(null); setView('form'); }} className="w-full bg-blue-600 hover:bg-blue-700 transition-colors text-white py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg">
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
                       <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                           <div className="flex justify-between items-start mb-2">
                               <div>
                                   <span className="text-xs font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">{log.type}</span>
                                   <div className="text-xs text-slate-400 mt-1">{log.date}</div>
                               </div>
                               <div className="flex flex-col items-end gap-1">
                                   <span className="bg-slate-100 px-2 py-1 rounded text-[11px] font-medium text-slate-600 flex items-center"><User className="w-3 h-3 mr-1" /> {log.technician}</span>
                                   <span className={`text-[10px] px-1.5 py-0.5 rounded ${log.status === 'Hoàn thành' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{log.status}</span>
                               </div>
                           </div>
                           <p className="text-slate-700 text-sm my-3 line-clamp-2">{log.note}</p>
                           
                           {/* Các nút Xem / Sửa / Xóa */}
                           <div className="flex gap-2 justify-end border-t border-slate-50 pt-3">
                               <button onClick={() => setViewingLog(log)} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                                  <Eye className="w-3.5 h-3.5" /> Xem
                               </button>
                               <button onClick={() => { setEditingLog(log); setView('form'); }} className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">
                                  <Edit className="w-3.5 h-3.5" /> Sửa
                               </button>
                               <button onClick={() => setConfirmDelete({ isOpen: true, type: 'log', id: log.id })} className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" /> Xóa
                               </button>
                           </div>
                       </div>
                     ))}
                   </div>
                )}
            </div>
        </div>

        {/* MODAL XEM CHI TIẾT BÁO CÁO */}
        {viewingLog && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-40 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-lg text-slate-800">Chi tiết báo cáo</h3>
                <button onClick={() => setViewingLog(null)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"><X className="w-5 h-5"/></button>
              </div>
              <div className="overflow-y-auto space-y-4 flex-1 pr-1 custom-scrollbar">
                 <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-[11px] text-slate-400 uppercase font-bold mb-1">Ngày bảo trì</p><p className="font-medium text-sm text-slate-800">{viewingLog.date}</p></div>
                    <div><p className="text-[11px] text-slate-400 uppercase font-bold mb-1">Người thực hiện</p><p className="font-medium text-sm text-slate-800">{viewingLog.technician}</p></div>
                    <div><p className="text-[11px] text-slate-400 uppercase font-bold mb-1">Phân loại</p><p className="font-medium text-sm text-slate-800">{viewingLog.type}</p></div>
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase font-bold mb-1">Trạng thái</p>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${viewingLog.status === 'Hoàn thành' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{viewingLog.status}</span>
                    </div>
                 </div>
                 <div>
                    <p className="text-[11px] text-slate-400 uppercase font-bold mb-1 mt-2">Ghi chú công việc</p>
                    <div className="text-sm bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-slate-700 leading-relaxed whitespace-pre-wrap">{viewingLog.note}</div>
                 </div>
                 {viewingLog.parts && viewingLog.parts.length > 0 && (
                   <div>
                     <p className="text-[11px] text-slate-400 uppercase font-bold mb-2 flex items-center"><Package className="w-3.5 h-3.5 mr-1" /> Vật tư thay thế</p>
                     <div className="space-y-2">
                       {viewingLog.parts.map((p, i) => (
                         <div key={i} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                            <span className="font-medium text-slate-700">{p.name}</span>
                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{p.quantity} {p.unit}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
                 {viewingLog.images && viewingLog.images.length > 0 && (
                   <div>
                     <p className="text-[11px] text-slate-400 uppercase font-bold mb-2 flex items-center"><Camera className="w-3.5 h-3.5 mr-1" /> Hình ảnh đính kèm</p>
                     <div className="flex flex-wrap gap-2">
                       {viewingLog.images.map((img, idx) => (
                          <img key={idx} src={img} className="w-20 h-20 object-cover rounded-lg border border-slate-200" alt="Báo cáo" />
                       ))}
                     </div>
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL XÁC NHẬN XÓA */}
        {confirmDelete.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
              <div className="flex items-center space-x-3 mb-3 text-red-600">
                 <div className="bg-red-100 p-2 rounded-full"><AlertCircle className="w-6 h-6" /></div>
                 <h3 className="font-bold text-lg text-slate-800">Xác nhận xóa</h3>
              </div>
              <p className="text-slate-600 text-sm mb-6 pl-1">
                Bạn có chắc chắn muốn xóa vĩnh viễn {confirmDelete.type === 'machine' ? <strong className="text-slate-800">thiết bị này</strong> : <strong className="text-slate-800">báo cáo bảo trì này</strong>}? Hành động này sẽ không thể hoàn tác.
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

  // MÀN HÌNH MENU GHI ĐIỆN NƯỚC (TÍNH NĂNG MỚI)
  const MeterMenuView = () => (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="p-4 border-b border-slate-100 bg-white shrink-0 flex items-center space-x-3 z-10 shadow-sm">
          <button onClick={() => setView(user.role === 'admin' ? 'dashboard' : 'home')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h2 className="font-bold text-slate-800 text-lg">Quản lý Điện / Nước</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <button
              onClick={() => setView('electric_form')}
              className="w-full bg-yellow-50 text-yellow-700 border border-yellow-200 py-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-sm hover:bg-yellow-100 active:scale-95 transition-transform"
          >
              <Zap className="w-10 h-10" />
              <span className="font-bold text-xl">Ghi Số Điện</span>
          </button>

          <button
              onClick={() => setView('water_form')}
              className="w-full bg-blue-50 text-blue-700 border border-blue-200 py-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-sm hover:bg-blue-100 active:scale-95 transition-transform"
          >
              <Droplets className="w-10 h-10" />
              <span className="font-bold text-xl">Ghi Số Nước</span>
          </button>

          <button
              onClick={() => setView('meter_history')}
              className="w-full bg-white text-slate-700 border border-slate-200 py-6 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-sm hover:bg-slate-50 active:scale-95 transition-transform"
          >
              <History className="w-10 h-10 text-slate-500" />
              <span className="font-bold text-xl">Lịch sử Điện / Nước</span>
          </button>
      </div>
    </div>
  );

  // MÀN HÌNH NHẬP FORM GHI ĐIỆN 
  const ElectricFormView = () => {
    const [formData, setFormData] = useState({
      date: new Date().toISOString().split('T')[0],
      technicianName: user?.name || '',
      recordType: 'electricity',
      s1_normal: '', s1_peak: '', s1_offpeak: '', s1_reactive: '',
      s2_normal: '', s2_peak: '', s2_offpeak: '', s2_reactive: ''
    });
    const [showTechDropdown, setShowTechDropdown] = useState(false);

    const s1_cos = calcCosPhi(formData.s1_normal, formData.s1_peak, formData.s1_offpeak, formData.s1_reactive);
    const s2_cos = calcCosPhi(formData.s2_normal, formData.s2_peak, formData.s2_offpeak, formData.s2_reactive);

    return (
      <div className="flex flex-col h-full bg-slate-50 relative">
        <div className="p-4 border-b border-slate-100 bg-white shrink-0 flex items-center space-x-3 z-10 shadow-sm">
            <button onClick={() => setView('meter_menu')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <h2 className="font-bold text-slate-800 flex items-center text-lg">
                <Zap className="w-5 h-5 mr-1.5 text-yellow-500" /> Ghi Số Điện
            </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-32">
            <div className="grid grid-cols-2 gap-3">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày ghi</label>
                  <input type="date" className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
               </div>
               <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Người ghi</label>
                  <input 
                      type="text" 
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                      value={formData.technicianName} 
                      onChange={e => {
                          setFormData({...formData, technicianName: e.target.value});
                          setShowTechDropdown(true);
                      }} 
                      onFocus={() => setShowTechDropdown(true)}
                      onBlur={() => setTimeout(() => setShowTechDropdown(false), 200)}
                      placeholder="Nhập tên..." 
                  />
                  {showTechDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                          {technicians.filter(t => t.name.toLowerCase().includes(formData.technicianName.toLowerCase())).map(t => (
                              <div key={t.id} onClick={() => setFormData({...formData, technicianName: t.name})} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 text-slate-700 text-sm">
                                  {t.name}
                              </div>
                          ))}
                      </div>
                  )}
               </div>
            </div>

            {/* Trạm Điện 1 */}
            <div className="bg-white p-4 rounded-xl border border-yellow-200 shadow-sm">
               <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center uppercase"><Gauge className="w-4 h-4 mr-1 text-yellow-500"/> Đồng Hồ - Trạm 1</h3>
               <div className="grid grid-cols-2 gap-3 mb-3">
                   <div>
                       <label className="text-xs text-slate-500 mb-1 block">Bình thường (Kw)</label>
                       <input type="number" className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 outline-none" value={formData.s1_normal} onChange={e => setFormData({...formData, s1_normal: e.target.value})} />
                   </div>
                   <div>
                       <label className="text-xs text-slate-500 mb-1 block">Cao điểm (Kw)</label>
                       <input type="number" className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 outline-none" value={formData.s1_peak} onChange={e => setFormData({...formData, s1_peak: e.target.value})} />
                   </div>
                   <div>
                       <label className="text-xs text-slate-500 mb-1 block">Thấp điểm (Kw)</label>
                       <input type="number" className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 outline-none" value={formData.s1_offpeak} onChange={e => setFormData({...formData, s1_offpeak: e.target.value})} />
                   </div>
                   <div>
                       <label className="text-xs text-slate-500 mb-1 block">Vô công (Kvar)</label>
                       <input type="number" className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 outline-none" value={formData.s1_reactive} onChange={e => setFormData({...formData, s1_reactive: e.target.value})} />
                   </div>
               </div>
               <div className={`p-3 rounded-lg border flex items-center justify-between ${s1_cos > 0 && s1_cos < 0.9 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                   <span className="font-semibold text-slate-700">Cos φ</span>
                   <div className="flex items-center">
                       {s1_cos > 0 && s1_cos < 0.9 && <AlertCircle className="w-4 h-4 text-red-500 mr-2" />}
                       <span className={`font-bold text-lg ${s1_cos > 0 && s1_cos < 0.9 ? 'text-red-600' : 'text-green-600'}`}>{s1_cos}</span>
                   </div>
               </div>
               {s1_cos > 0 && s1_cos < 0.9 && <p className="text-xs text-red-500 mt-1 italic">Cảnh báo: Cos phi đang dưới 0.9!</p>}
            </div>

            {/* Trạm Điện 2 */}
            <div className="bg-white p-4 rounded-xl border border-yellow-200 shadow-sm">
               <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center uppercase"><Gauge className="w-4 h-4 mr-1 text-yellow-500"/> Đồng Hồ - Trạm 2</h3>
               <div className="grid grid-cols-2 gap-3 mb-3">
                   <div>
                       <label className="text-xs text-slate-500 mb-1 block">Bình thường (Kw)</label>
                       <input type="number" className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 outline-none" value={formData.s2_normal} onChange={e => setFormData({...formData, s2_normal: e.target.value})} />
                   </div>
                   <div>
                       <label className="text-xs text-slate-500 mb-1 block">Cao điểm (Kw)</label>
                       <input type="number" className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 outline-none" value={formData.s2_peak} onChange={e => setFormData({...formData, s2_peak: e.target.value})} />
                   </div>
                   <div>
                       <label className="text-xs text-slate-500 mb-1 block">Thấp điểm (Kw)</label>
                       <input type="number" className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 outline-none" value={formData.s2_offpeak} onChange={e => setFormData({...formData, s2_offpeak: e.target.value})} />
                   </div>
                   <div>
                       <label className="text-xs text-slate-500 mb-1 block">Vô công (Kvar)</label>
                       <input type="number" className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 outline-none" value={formData.s2_reactive} onChange={e => setFormData({...formData, s2_reactive: e.target.value})} />
                   </div>
               </div>
               <div className={`p-3 rounded-lg border flex items-center justify-between ${s2_cos > 0 && s2_cos < 0.9 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                   <span className="font-semibold text-slate-700">Cos φ</span>
                   <div className="flex items-center">
                       {s2_cos > 0 && s2_cos < 0.9 && <AlertCircle className="w-4 h-4 text-red-500 mr-2" />}
                       <span className={`font-bold text-lg ${s2_cos > 0 && s2_cos < 0.9 ? 'text-red-600' : 'text-green-600'}`}>{s2_cos}</span>
                   </div>
               </div>
               {s2_cos > 0 && s2_cos < 0.9 && <p className="text-xs text-red-500 mt-1 italic">Cảnh báo: Cos phi đang dưới 0.9!</p>}
            </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white/95 backdrop-blur-md shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-20">
            <button onClick={() => handleSaveMeterLog(formData)} className="w-full bg-yellow-600 text-white py-3.5 rounded-xl font-bold shadow-xl flex justify-center items-center gap-2 hover:bg-yellow-700 transition-transform active:scale-95">
                <Save className="w-5 h-5" /> Ghi Nhận Điện
            </button>
        </div>
      </div>
    );
  };

  // MÀN HÌNH NHẬP FORM GHI NƯỚC
  const WaterFormView = () => {
    const [formData, setFormData] = useState({
      date: new Date().toISOString().split('T')[0],
      technicianName: user?.name || '',
      recordType: 'water',
      water: ''
    });
    const [showTechDropdown, setShowTechDropdown] = useState(false);

    return (
      <div className="flex flex-col h-full bg-slate-50 relative">
        <div className="p-4 border-b border-slate-100 bg-white shrink-0 flex items-center space-x-3 z-10 shadow-sm">
            <button onClick={() => setView('meter_menu')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <h2 className="font-bold text-slate-800 flex items-center text-lg">
                <Droplets className="w-5 h-5 mr-1.5 text-blue-500" /> Ghi Số Nước
            </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-32">
            <div className="grid grid-cols-2 gap-3">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày ghi</label>
                  <input type="date" className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
               </div>
               <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Người ghi</label>
                  <input 
                      type="text" 
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                      value={formData.technicianName} 
                      onChange={e => {
                          setFormData({...formData, technicianName: e.target.value});
                          setShowTechDropdown(true);
                      }} 
                      onFocus={() => setShowTechDropdown(true)}
                      onBlur={() => setTimeout(() => setShowTechDropdown(false), 200)}
                      placeholder="Nhập tên..." 
                  />
                  {showTechDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                          {technicians.filter(t => t.name.toLowerCase().includes(formData.technicianName.toLowerCase())).map(t => (
                              <div key={t.id} onClick={() => setFormData({...formData, technicianName: t.name})} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 text-slate-700 text-sm">
                                  {t.name}
                              </div>
                          ))}
                      </div>
                  )}
               </div>
            </div>

            {/* Mục Nước */}
            <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm">
               <h3 className="text-sm font-bold text-blue-600 mb-3 flex items-center uppercase"><Droplets className="w-5 h-5 mr-1"/> Chỉ số nước tổng</h3>
               <div>
                   <input type="number" placeholder="Khối (m³)..." className="w-full p-4 text-xl font-bold rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.water} onChange={e => setFormData({...formData, water: e.target.value})} />
               </div>
            </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white/95 backdrop-blur-md shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-20">
            <button onClick={() => handleSaveMeterLog(formData)} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-xl flex justify-center items-center gap-2 hover:bg-blue-700 transition-transform active:scale-95">
                <Save className="w-5 h-5" /> Ghi Nhận Nước
            </button>
        </div>
      </div>
    );
  };

  // MÀN HÌNH LỊCH SỬ GHI ĐIỆN NƯỚC
  const MeterHistoryView = () => {
    const [filterTab, setFilterTab] = useState('all');

    const filteredLogs = meterLogs.filter(log => {
        if (filterTab === 'all') return true;
        return log.recordType === filterTab || (!log.recordType); // Bao gồm cả log cũ nếu có
    });

    return (
      <div className="flex flex-col h-full bg-slate-50 relative">
        <div className="bg-white shadow-sm p-4 sticky top-0 z-10 flex flex-col space-y-3">
            <div className="flex items-center space-x-3">
                <button onClick={() => setView('meter_menu')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="font-bold text-slate-800">Sổ Ghi Điện / Nước</h2>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setFilterTab('all')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${filterTab === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Tất cả</button>
                <button onClick={() => setFilterTab('electricity')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${filterTab === 'electricity' ? 'bg-white shadow-sm text-yellow-600' : 'text-slate-500'}`}>Điện</button>
                <button onClick={() => setFilterTab('water')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${filterTab === 'water' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Nước</button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {filteredLogs.length === 0 ? (
               <p className="text-sm text-slate-400 text-center py-6">Chưa có dữ liệu ghi nhận.</p>
            ) : (
               filteredLogs.map((log) => (
                 <div key={log.id} className={`bg-white p-4 rounded-xl shadow-sm border relative ${log.recordType === 'electricity' ? 'border-yellow-100' : log.recordType === 'water' ? 'border-blue-100' : 'border-slate-100'}`}>
                     <div className="flex justify-between items-center mb-3 border-b border-slate-50 pb-2">
                         <div className="font-bold text-slate-800 flex items-center">
                             <Calendar className="w-4 h-4 mr-1 text-slate-400"/> {log.date}
                             {log.recordType === 'electricity' && <span className="ml-2 bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Điện</span>}
                             {log.recordType === 'water' && <span className="ml-2 bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Nước</span>}
                         </div>
                         <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md flex items-center"><User className="w-3 h-3 mr-1"/> {log.technicianName}</div>
                     </div>
                     
                     <div className="space-y-3 text-sm text-slate-600">
                         {(log.recordType === 'water' || !log.recordType) && log.water && (
                           <div className="flex items-center text-blue-600 font-medium bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                               <Droplets className="w-5 h-5 mr-2" /> Chỉ số Nước: <span className="ml-2 text-slate-800 text-lg">{log.water}</span> <span className="ml-1 text-xs">m³</span>
                           </div>
                         )}
                         
                         {(log.recordType === 'electricity' || !log.recordType) && log.s1_normal !== undefined && log.s1_normal !== '' && (
                             <>
                                 <div className="bg-yellow-50/50 p-2.5 rounded-lg border border-yellow-100">
                                     <p className="font-bold text-slate-700 flex items-center mb-1"><Gauge className="w-3 h-3 mr-1 text-yellow-600"/> Trạm 1</p>
                                     <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                                        <span>B.thường: <strong className="text-slate-800">{log.s1_normal}</strong></span>
                                        <span>Cao điểm: <strong className="text-slate-800">{log.s1_peak}</strong></span>
                                        <span>Thấp điểm: <strong className="text-slate-800">{log.s1_offpeak}</strong></span>
                                        <span>Vô công: <strong className="text-slate-800">{log.s1_reactive}</strong></span>
                                     </div>
                                     <div className="mt-2 border-t border-yellow-200/50 pt-1 flex justify-between items-center">
                                         <span className="text-xs font-semibold">Cos φ</span>
                                         <span className={`font-bold ${calcCosPhi(log.s1_normal, log.s1_peak, log.s1_offpeak, log.s1_reactive) < 0.9 ? 'text-red-500' : 'text-green-600'}`}>
                                             {calcCosPhi(log.s1_normal, log.s1_peak, log.s1_offpeak, log.s1_reactive)}
                                         </span>
                                     </div>
                                 </div>
                                 
                                 <div className="bg-yellow-50/50 p-2.5 rounded-lg border border-yellow-100">
                                     <p className="font-bold text-slate-700 flex items-center mb-1"><Gauge className="w-3 h-3 mr-1 text-yellow-600"/> Trạm 2</p>
                                     <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                                        <span>B.thường: <strong className="text-slate-800">{log.s2_normal}</strong></span>
                                        <span>Cao điểm: <strong className="text-slate-800">{log.s2_peak}</strong></span>
                                        <span>Thấp điểm: <strong className="text-slate-800">{log.s2_offpeak}</strong></span>
                                        <span>Vô công: <strong className="text-slate-800">{log.s2_reactive}</strong></span>
                                     </div>
                                     <div className="mt-2 border-t border-yellow-200/50 pt-1 flex justify-between items-center">
                                         <span className="text-xs font-semibold">Cos φ</span>
                                         <span className={`font-bold ${calcCosPhi(log.s2_normal, log.s2_peak, log.s2_offpeak, log.s2_reactive) < 0.9 ? 'text-red-500' : 'text-green-600'}`}>
                                             {calcCosPhi(log.s2_normal, log.s2_peak, log.s2_offpeak, log.s2_reactive)}
                                         </span>
                                     </div>
                                 </div>
                             </>
                         )}
                     </div>

                     {user.role === 'admin' && (
                        <div className="absolute top-2 right-2">
                           <button onClick={() => handleDeleteMeterLog(log.id)} className="text-slate-400 p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                     )}
                 </div>
               ))
            )}
        </div>
      </div>
    );
  };

  const LogFormView = () => {
    const initialForm = editingLog || { technicianName: user?.name || '', type: 'Bảo trì định kỳ', note: '', status: 'Hoàn thành', parts: [], images: [] };
    const [formData, setFormData] = useState(initialForm);
    const [tempPart, setTempPart] = useState({ name: '', unit: '', quantity: '' });
    const [showTechDropdown, setShowTechDropdown] = useState(false);

    const addPart = () => { 
        if(tempPart.name && tempPart.quantity) { 
            setFormData({...formData, parts: [...formData.parts, tempPart]}); 
            setTempPart({ name: '', unit: '', quantity: '' }); 
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
        <div className="p-4 border-b border-slate-100 bg-white shrink-0 flex items-center space-x-3 z-10 shadow-sm">
            <button onClick={() => { setEditingLog(null); setView('details'); }} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div>
                <h2 className="font-bold text-slate-800 flex items-center">
                    {editingLog ? <><Edit className="w-4 h-4 mr-1.5 text-orange-500" /> Cập nhật báo cáo</> : <><Plus className="w-4 h-4 mr-1.5 text-blue-500" /> Báo cáo công việc</>}
                </h2>
                <p className="text-xs text-slate-500">{selectedMachine.name}</p>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-32">
            <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">Người thực hiện</label>
                <input 
                    type="text" 
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    value={formData.technicianName} 
                    onChange={e => {
                        setFormData({...formData, technicianName: e.target.value});
                        setShowTechDropdown(true);
                    }} 
                    onFocus={() => setShowTechDropdown(true)}
                    onBlur={() => setTimeout(() => setShowTechDropdown(false), 200)}
                    placeholder="Gõ để tìm hoặc nhập tên mới..." 
                />
                
                {showTechDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                        {technicians.filter(t => t.name.toLowerCase().includes(formData.technicianName.toLowerCase())).length > 0 ? (
                            technicians.filter(t => t.name.toLowerCase().includes(formData.technicianName.toLowerCase())).map(t => (
                                <div 
                                    key={t.id} 
                                    onClick={() => setFormData({...formData, technicianName: t.name})} 
                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 text-slate-700 flex items-center"
                                >
                                    <User className="w-4 h-4 mr-2 text-slate-400" /> {t.name}
                                </div>
                            ))
                        ) : (
                            <div className="p-3 text-slate-500 text-sm italic">Sẽ lưu dạng tên nhân sự mới</div>
                        )}
                    </div>
                )}
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Loại công việc</label>
                <select className="w-full p-3 rounded-xl border border-slate-300 text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option>Bảo trì định kỳ</option>
                    <option>Sửa chữa sự cố</option>
                    <option>Thay thế linh kiện</option>
                </select>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Vật tư thay thế (lấy từ Kho)</label>
                <div className="flex flex-col gap-2 mb-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <select className="w-full p-2 border border-slate-300 rounded-lg text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={tempPart.name} onChange={(e) => { const selectedItem = inventory.find(i => i.name === e.target.value); setTempPart({ ...tempPart, name: e.target.value, unit: selectedItem ? selectedItem.unit : '' }); }}>
                        <option value="">-- Chọn vật tư trong kho --</option>
                        {inventory.map(item => (<option key={item.id} value={item.name}>{item.name} (Tồn: {item.quantity} {item.unit})</option>))}
                    </select>
                    
                    <div className="flex gap-2">
                        <input placeholder="Đơn vị" disabled className="w-1/2 p-2 border border-slate-300 rounded-lg text-base bg-slate-100 text-slate-500" value={tempPart.unit} />
                        <input placeholder="Số lượng dùng" type="number" className="w-1/2 p-2 border border-slate-300 rounded-lg text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={tempPart.quantity} onChange={e => setTempPart({...tempPart, quantity: e.target.value})} />
                    </div>
                    
                    <button onClick={addPart} className="bg-blue-600 text-white p-2 rounded-lg flex items-center justify-center font-medium text-sm mt-1 hover:bg-blue-700 transition-colors">
                        <Plus className="w-4 h-4 mr-1" /> Thêm vào báo cáo
                    </button>
                </div>
                
                <div className="space-y-2">
                    {formData.parts.map((p, i) => (
                      <div key={i} className="bg-white border border-slate-200 p-3 rounded-lg flex justify-between items-center text-sm shadow-sm">
                          <span className="font-medium text-slate-700">{p.name}</span>
                          <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs font-bold">Dùng: {p.quantity} {p.unit}</span>
                      </div>
                    ))}
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Hình ảnh hiện trường</label>
                <div className="flex flex-wrap gap-2">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="relative w-20 h-20">
                         <img src={img} className="w-full h-full object-cover rounded-lg border border-slate-200 shadow-sm" alt="Preview" />
                         <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-transform active:scale-90"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                    <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-slate-50 hover:border-blue-400 text-slate-400 hover:text-blue-500 transition-colors">
                        <Camera className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-medium">Chụp ảnh</span>
                        <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
                    </label>
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả chi tiết</label>
                <textarea rows="4" className="w-full p-3 rounded-xl border border-slate-300 text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[120px]" placeholder="Nhập chi tiết công việc, nguyên nhân, cách khắc phục..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})}></textarea>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setFormData({...formData, status: 'Hoàn thành'})} className={`p-3 rounded-xl border-2 flex items-center justify-center space-x-2 transition-all ${formData.status === 'Hoàn thành' ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'border-slate-200 text-slate-500 bg-white hover:border-green-200 hover:bg-green-50'}`}>
                    <CheckCircle className="w-5 h-5" /> <span className="font-medium">Xong</span>
                </button>
                <button onClick={() => setFormData({...formData, status: 'Cần theo dõi'})} className={`p-3 rounded-xl border-2 flex items-center justify-center space-x-2 transition-all ${formData.status === 'Cần theo dõi' ? 'bg-white border-slate-300 text-slate-700 shadow-sm' : 'border-slate-200 text-slate-400 bg-white hover:border-slate-300 hover:text-slate-600 hover:bg-slate-50'}`}>
                    <AlertCircle className="w-5 h-5" /> <span className="font-medium">Chưa xong</span>
                </button>
            </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white/95 backdrop-blur-md shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-20">
            <button onClick={() => {if(!formData.note) return showNotification('Bạn cần nhập mô tả công việc!', 'error'); handleSaveLog(formData);}} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold shadow-xl flex justify-center items-center gap-2 hover:bg-slate-800 transition-transform active:scale-95">
                <Save className="w-5 h-5" /> {editingLog ? 'Lưu Thay Đổi' : 'Lưu Báo Cáo'}
            </button>
        </div>
      </div>
    );
  };

  const TechnicianManagementView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '' });

    const filteredTechs = technicians.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleAdd = () => {
      if (!newName) return showNotification('Vui lòng nhập tên!', 'error');
      const newId = 'T-' + Date.now();
      handleUpdateTechnician({ id: newId, name: newName });
      showNotification('Đã thêm nhân sự!');
      setNewName('');
    };

    const saveEdit = () => {
      if (!editForm.name) return showNotification('Tên không được để trống!', 'error');
      const existingTech = technicians.find(t => t.id === editingId);
      if (existingTech) {
        handleUpdateTechnician({ ...existingTech, name: editForm.name });
        showNotification('Đã cập nhật tên!');
      }
      setEditingId(null);
    };

    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white p-4 border-b border-slate-200 shrink-0 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
             <button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6" /></button>
             <h2 className="font-bold text-slate-800 text-lg">Quản lý Nhân sự (KTV)</h2>
          </div>
          <div className="relative">
             <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
             <input type="text" placeholder="Tìm kiếm tên..." className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="bg-slate-100/50 p-3 rounded-xl border border-dashed border-slate-300 mb-2">
            <h3 className="text-[11px] uppercase font-bold text-slate-500 mb-2">Thêm KTV / Người thực hiện</h3>
            <div className="flex gap-2">
              <input placeholder="Nhập họ tên đầy đủ..." className="flex-1 p-2 border border-slate-300 rounded-lg text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={newName} onChange={e => setNewName(e.target.value)} />
              <button onClick={handleAdd} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-slate-700 flex justify-center items-center shadow-sm"><Plus className="w-4 h-4 mr-1" /> Thêm</button>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500 uppercase font-bold tracking-wider mb-2"><span>Danh sách ({filteredTechs.length})</span></div>
          
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {filteredTechs.length > 0 ? (
              filteredTechs.map((t, index) => (
                <div key={t.id} className={`p-4 flex flex-col ${index !== filteredTechs.length -1 ? 'border-b border-slate-100' : ''}`}>
                  {editingId === t.id ? (
                    <div className="flex flex-col gap-2 bg-blue-50/50 p-3 rounded-lg border border-blue-200 shadow-inner">
                      <input className="w-full p-2 border border-slate-300 rounded-lg text-base bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.name} onChange={e => setEditForm({name: e.target.value})} placeholder="Tên KTV" />
                      <div className="flex justify-end gap-2 mt-2">
                          <button onClick={() => handleDeleteTechnician(t.id)} className="mr-auto p-1.5 bg-red-50 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="px-4 py-1.5 text-sm bg-slate-200 text-slate-700 font-medium rounded-lg">Hủy</button>
                          <button onClick={saveEdit} className="px-4 py-1.5 text-sm bg-blue-600 text-white font-medium rounded-lg shadow-sm">Lưu</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                         <div className="bg-slate-100 p-2 rounded-full"><User className="w-4 h-4 text-slate-500" /></div>
                         <h4 className="font-semibold text-slate-800 text-base">{t.name}</h4>
                      </div>
                      <button onClick={() => {setEditingId(t.id); setEditForm({name: t.name});}} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-100 rounded-lg transition-colors border border-slate-100 hover:border-blue-200"><Edit className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              ))
            ) : (<div className="p-8 text-center text-slate-400 text-sm">Chưa có dữ liệu.</div>)}
          </div>
        </div>
      </div>
    );
  };

  if (!user) return <div className="max-w-md mx-auto h-[100dvh] w-full bg-slate-900 overflow-hidden font-sans relative"><LoginView /></div>;
  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-slate-100 shadow-2xl overflow-hidden font-sans text-slate-800 flex flex-col relative">
      <div className="h-1 bg-blue-600 w-full shrink-0"></div>
      <div className="flex-1 overflow-hidden relative">
        {view === 'dashboard' && <DashboardView />}
        {view === 'machines' && <MachineManagementView />}
        {view === 'settings' && <SettingsView />}
        {view === 'qr_print' && <QrPrintView />}
        {view === 'home' && <HomeView />}
        {view === 'scanner' && <ScannerView />}
        {view === 'manual_select' && <ManualSelectView />}
        {view === 'details' && <DetailsView />}
        {view === 'form' && <LogFormView />}
        {view === 'inventory' && <InventoryView />}
        {view === 'technicians' && <TechnicianManagementView />}
        {view === 'meter_menu' && <MeterMenuView />}
        {view === 'electric_form' && <ElectricFormView />}
        {view === 'water_form' && <WaterFormView />}
        {view === 'meter_history' && <MeterHistoryView />}
      </div>
      {notification && (<div className={`absolute top-4 left-4 right-4 p-4 rounded-xl shadow-2xl flex items-center space-x-3 z-50 animate-fade-in ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'}`}>{notification.type === 'error' ? <AlertCircle /> : <CheckCircle />}<span className="font-medium">{notification.msg}</span></div>)}
    </div>
  );
}