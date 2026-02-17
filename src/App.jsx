import React, { useState, useEffect } from 'react';
import { QrCode, Wrench, History, ArrowLeft, Save, CheckCircle, AlertCircle, User, Package, LogOut, FileSpreadsheet, Lock, PieChart, BarChart3, Settings, Printer, Plus, X, Camera, Search, MapPin, ListFilter } from 'lucide-react';

// --- MOCK DATA ---
const USERS = [
  { username: 'admin', password: '123', name: 'Quản Lý Trưởng', role: 'admin' },
  { username: 'tech', password: '123', name: 'KTV Nguyễn Văn A', role: 'maintenance' },
  { username: 'tech2', password: '123', name: 'KTV Trần Thị B', role: 'maintenance' }
];

const INITIAL_MACHINES = [
  { id: 'M-101', name: 'Máy Phay CNC 3 Trục', model: 'Haas VF-2', location: 'Xưởng A - Khu vực 2', status: 'operational' },
  { id: 'M-102', name: 'Máy Ép Nhựa Thủy Lực', model: 'Haitian Mars II', location: 'Xưởng B - Cổng chính', status: 'maintenance' },
  { id: 'M-103', name: 'Hệ Thống Băng Tải Tự Động', model: 'Conveyor Pro X', location: 'Kho Thành Phẩm', status: 'broken' },
  { id: 'M-104', name: 'Cánh Tay Robot Hàn', model: 'Kuka KR-16', location: 'Xưởng C - Dây chuyền 1', status: 'operational' },
  { id: 'M-105', name: 'Máy Nén Khí Trục Vít', model: 'Atlas Copco', location: 'Phòng Kỹ Thuật', status: 'operational' },
  { id: 'M-106', name: 'Máy Cắt Laser Fiber', model: 'Bodor P3015', location: 'Xưởng C - Khu vực cắt', status: 'operational' }
];

const INITIAL_LOGS = [
  { 
    id: 1, machineId: 'M-101', date: '2023-10-15', technician: 'KTV Nguyễn Văn A', type: 'Bảo trì định kỳ', 
    note: 'Thay dầu, kiểm tra trục chính. Máy hoạt động tốt.', 
    parts: [{ name: 'Dầu máy CNC', unit: 'Lít', quantity: 5 }], 
    images: [] 
  }
];

export default function App() {
  // --- STATE ---
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('login'); 
  const [machines, setMachines] = useState(INITIAL_MACHINES);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showQrCode, setShowQrCode] = useState(false);
  
  // State cho Google Sheet
  const [googleSheetUrl, setGoogleSheetUrl] = useState(localStorage.getItem('gs_url') || '');

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

  // Hàm gửi dữ liệu lên Google Sheet
  const saveToGoogleSheet = async (logData) => {
    if (!googleSheetUrl) return;

    try {
      const formData = new FormData();
      formData.append('id', logData.id);
      formData.append('machineId', logData.machineId);
      formData.append('machineName', selectedMachine.name);
      formData.append('date', logData.date);
      formData.append('technician', logData.technician);
      formData.append('type', logData.type);
      formData.append('note', logData.note);
      formData.append('status', logData.status);
      
      const partsStr = logData.parts.map(p => `${p.name} (${p.quantity} ${p.unit})`).join(', ');
      formData.append('parts', partsStr);

      await fetch(googleSheetUrl, {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
      });
      console.log("Đã gửi dữ liệu lên Google Sheet");
    } catch (error) {
      console.error("Lỗi gửi Google Sheet:", error);
    }
  };

  const handleSaveLog = (newLog) => {
    const logEntry = {
      id: Date.now(),
      machineId: selectedMachine.id,
      date: new Date().toISOString().split('T')[0],
      technician: user.name, 
      ...newLog
    };
    
    setLogs([logEntry, ...logs]);
    
    const updatedMachines = machines.map(m => 
      m.id === selectedMachine.id ? { ...m, status: newLog.status === 'Hoàn thành' ? 'operational' : 'maintenance' } : m
    );
    setMachines(updatedMachines);
    setSelectedMachine(updatedMachines.find(m => m.id === selectedMachine.id));

    if (googleSheetUrl) {
        saveToGoogleSheet(logEntry);
        showNotification('Đã lưu & đồng bộ lên Google Sheet!', 'success');
    } else {
        showNotification('Đã lưu cục bộ (Chưa cấu hình Google Sheet)', 'success');
    }

    setView('details');
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- VIEWS ---

  const LoginView = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-900 text-white animate-fade-in">
        <div className="w-full max-w-xs space-y-8">
          <div className="text-center space-y-2">
            <div className="bg-blue-600 p-4 rounded-2xl inline-block shadow-lg shadow-blue-500/30">
              <Wrench className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold">TechMaintain</h1>
            <p className="text-slate-400">Hệ thống quản lý bảo trì</p>
          </div>
          <div className="space-y-4 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tài khoản</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white" placeholder="admin hoặc tech" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Mật khẩu</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white" placeholder="123" />
            </div>
            <button onClick={() => handleLogin(username, password)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg">Đăng Nhập</button>
          </div>
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

  // Home View - Cập nhật để tách 2 nút
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
      
      {/* Tách thành 2 nút riêng biệt */}
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
      </div>
      
      <p className="text-sm text-slate-400 text-center">
        Chọn phương thức để bắt đầu bảo trì
      </p>
    </div>
  );

  // Scanner View - Chỉ còn giao diện Camera
  const ScannerView = () => {
    return (
      <div className="flex flex-col h-full bg-black relative">
        {/* Header Back Button */}
        <div className="absolute top-0 left-0 right-0 p-4 z-20">
          <button onClick={() => setView(user.role === 'admin' ? 'dashboard' : 'home')} className="text-white flex items-center space-x-2 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại</span>
          </button>
        </div>

        {/* Camera Simulation (Visual only) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative">
               <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl -mt-1 -ml-1"></div>
               <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl -mt-1 -mr-1"></div>
               <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl -mb-1 -ml-1"></div>
               <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl -mb-1 -mr-1"></div>
               <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/50 animate-pulse"></div>
             </div>
             <p className="absolute mt-80 text-white/80 text-sm font-medium">Di chuyển camera đến mã QR</p>
        </div>

        {/* Mock Buttons for Demo purpose - Hidden in real app */}
        <div className="absolute bottom-8 left-0 right-0 px-6 z-20">
             <p className="text-white/50 text-xs text-center mb-2">Demo: Nhấn để giả lập quét thành công</p>
             <div className="flex gap-2 overflow-x-auto pb-2">
                 {machines.map(m => (
                     <button 
                        key={m.id} 
                        onClick={() => handleScanSuccess(m.id)}
                        className="whitespace-nowrap bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-xs backdrop-blur-md border border-white/10"
                     >
                        {m.name}
                     </button>
                 ))}
             </div>
        </div>
      </div>
    );
  };

  // Manual Select View - Giao diện tìm kiếm mới
  const ManualSelectView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    
    // Filter logic
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
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white shadow-sm p-4 sticky top-0 z-10">
            <div className="flex items-center justify-between mb-2"><button onClick={() => setView('home')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6" /></button><h2 className="font-bold text-slate-800">Chi tiết thiết bị</h2><div className="w-8"></div></div>
            <h1 className="text-xl font-bold text-slate-900">{selectedMachine.name}</h1>
            <p className="text-slate-500 text-sm flex items-center mt-1"><MapPin className="w-3 h-3 mr-1"/> {selectedMachine.location}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <button onClick={() => setView('form')} className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg"><Wrench className="w-5 h-5" /><span className="font-semibold">Cập nhật / Bảo trì</span></button>
            <div>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center space-x-2"><History className="w-5 h-5 text-slate-500" /><span>Lịch sử sửa chữa</span></h3>
                <div className="space-y-4">{machineLogs.map((log) => (<div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"><div className="flex justify-between items-start mb-2"><div><span className="text-xs font-bold text-blue-600 uppercase">{log.type}</span><div className="text-xs text-slate-400">{log.date}</div></div><div className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-600">{log.technician}</div></div><p className="text-slate-700 text-sm mb-2">{log.note}</p></div>))}</div>
            </div>
        </div>
      </div>
    );
  };

  const LogFormView = () => {
    const [formData, setFormData] = useState({ type: 'Bảo trì định kỳ', note: '', status: 'Hoàn thành', parts: [], images: [] });
    const [tempPart, setTempPart] = useState({ name: '', unit: '', quantity: '' });
    const addPart = () => { if(tempPart.name && tempPart.quantity) { setFormData({...formData, parts: [...formData.parts, tempPart]}); setTempPart({ name: '', unit: '', quantity: '' }); }};
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-4 border-b border-slate-100 flex items-center space-x-3"><button onClick={() => setView('details')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 text-slate-600" /></button><div><h2 className="font-bold text-slate-800">Báo cáo công việc</h2><p className="text-xs text-slate-500">{selectedMachine.name}</p></div></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-20">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Loại công việc</label><select className="w-full p-3 rounded-lg border border-slate-300" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option>Bảo trì định kỳ</option><option>Sửa chữa sự cố</option><option>Thay thế linh kiện</option></select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Vật tư thay thế</label><div className="flex space-x-2 mb-2"><input placeholder="Tên" className="flex-1 p-2 border rounded-lg text-sm" value={tempPart.name} onChange={e => setTempPart({...tempPart, name: e.target.value})} /><input placeholder="SL" type="number" className="w-16 p-2 border rounded-lg text-sm" value={tempPart.quantity} onChange={e => setTempPart({...tempPart, quantity: e.target.value})} /><button onClick={addPart} className="bg-slate-100 p-2 rounded-lg"><Plus className="w-5 h-5" /></button></div><div className="space-y-2">{formData.parts.map((p, i) => (<div key={i} className="bg-slate-50 p-2 rounded flex justify-between text-sm"><span>{p.name}</span><span className="font-bold text-slate-500">{p.quantity} {p.unit}</span></div>))}</div></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Mô tả chi tiết</label><textarea rows="4" className="w-full p-3 rounded-lg border border-slate-300" placeholder="Mô tả công việc..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})}></textarea></div>
            <div className="grid grid-cols-2 gap-3"><button onClick={() => setFormData({...formData, status: 'Hoàn thành'})} className={`p-3 rounded-lg border flex items-center justify-center space-x-2 ${formData.status === 'Hoàn thành' ? 'bg-green-50 border-green-500 text-green-700' : ''}`}><CheckCircle className="w-5 h-5" /> <span>Xong</span></button><button onClick={() => setFormData({...formData, status: 'Cần theo dõi'})} className={`p-3 rounded-lg border flex items-center justify-center space-x-2 ${formData.status === 'Cần theo dõi' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' : ''}`}><AlertCircle className="w-5 h-5" /> <span>Chưa xong</span></button></div>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50"><button onClick={() => {if(!formData.note) return showNotification('Nhập ghi chú!', 'error'); handleSaveLog(formData);}} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold shadow-lg">Lưu Báo Cáo</button></div>
      </div>
    );
  };

  if (!user) return <div className="max-w-md mx-auto h-screen bg-slate-900 overflow-hidden font-sans relative"><LoginView /></div>;
  return (
    <div className="max-w-md mx-auto h-screen bg-slate-100 shadow-2xl overflow-hidden font-sans text-slate-800 flex flex-col relative">
      <div className="h-1 bg-blue-600 w-full shrink-0"></div>
      <div className="flex-1 overflow-hidden relative">
        {view === 'dashboard' && <DashboardView />}
        {view === 'settings' && <SettingsView />}
        {view === 'qr_print' && <QrPrintView />}
        {view === 'home' && <HomeView />}
        {view === 'scanner' && <ScannerView />}
        {view === 'manual_select' && <ManualSelectView />}
        {view === 'details' && <DetailsView />}
        {view === 'form' && <LogFormView />}
      </div>
      {notification && (<div className={`absolute top-4 left-4 right-4 p-4 rounded-lg shadow-xl flex items-center space-x-3 z-50 animate-bounce-in ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'}`}>{notification.type === 'error' ? <AlertCircle /> : <CheckCircle />}<span className="font-medium">{notification.msg}</span></div>)}
    </div>
  );
}
// CSS animations...