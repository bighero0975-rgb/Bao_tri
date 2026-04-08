import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Wrench, History, ArrowLeft, Save, CheckCircle, AlertCircle, User, Package, LogOut, FileSpreadsheet, Lock, PieChart, BarChart3, Settings, Printer, Plus, X, Camera, Search, MapPin, ListFilter, Image as ImageIcon, Trash2, Boxes, Edit, Download, Upload, Database } from 'lucide-react';
// KHÔNG import jsQR ở đây để tránh lỗi biên dịch (Build Error) trên Vercel/Stackblitz

// --- MOCK DATA ---
const USERS = [
  { username: 'admin', password: '123', name: 'Quản Lý Trưởng', role: 'admin' },
  { username: 'tech', password: '123', name: 'KTV Nguyễn Văn A', role: 'maintenance' },
  { username: 'tech2', password: '123', name: 'KTV Trần Thị B', role: 'maintenance' }
];

// Thay thế danh sách thiết bị của bạn vào đây
const INITIAL_MACHINES = [
  { id: 'M-101', name: 'Máy Phay CNC 3 Trục', model: 'Haas VF-2', location: 'Xưởng A - Khu vực 2', department: 'Xưởng Cơ Khí', status: 'operational' },
  { id: 'M-102', name: 'Máy Ép Nhựa Thủy Lực', model: 'Haitian Mars II', location: 'Xưởng B - Cổng chính', department: 'Xưởng Ép Nhựa', status: 'maintenance' },
  { id: 'M-103', name: 'Hệ Thống Băng Tải Tự Động', model: 'Conveyor Pro X', location: 'Kho Thành Phẩm', department: 'Phòng Kho vận', status: 'broken' },
  { id: 'M-104', name: 'Cánh Tay Robot Hàn', model: 'Kuka KR-16', location: 'Xưởng C - Dây chuyền 1', department: 'Xưởng Cơ Khí', status: 'operational' },
  
  // Bạn có thể copy/paste theo cấu trúc này để thêm hàng trăm máy khác:
  // { id: 'MÃ THIẾT BỊ', name: 'TÊN', model: 'MODEL', location: 'VỊ TRÍ', department: 'ĐƠN VỊ SỬ DỤNG', status: 'operational' },
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
  { id: 'P-104', name: 'Cảm biến quang Omron', unit: 'Cái', quantity: 8 },
  { id: 'P-105', name: 'Dây Curoa B-45', unit: 'Sợi', quantity: 15 },
  { id: 'P-106', name: 'Giẻ lau công nghiệp', unit: 'Kg', quantity: 30 }
];

// --- COMPONENT CAMERA THẬT (Sử dụng jsQR qua CDN) ---
const NativeCameraScanner = ({ onScan }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [isJsQRLoaded, setIsJsQRLoaded] = useState(false);

  // Tải thư viện jsQR từ CDN một cách an toàn
  useEffect(() => {
    if (window.jsQR) {
        setIsJsQRLoaded(true);
        return;
    }
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    script.async = true;
    script.onload = () => setIsJsQRLoaded(true);
    script.onerror = () => setError("Không tải được bộ giải mã QR. Vui lòng kiểm tra mạng.");
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isJsQRLoaded) return;

    let stream = null;
    let animationFrameId;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } // Bắt buộc dùng camera sau
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", true);
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Lỗi camera:", err);
        setError("Không thể truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.");
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
                // Đổ hình ảnh từ video sang canvas để phân tích
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Gọi bộ giải mã jsQR
                const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: "dontInvert",
                });
    
                if (code && code.data) {
                  // Đã quét thành công
                  onScan(code.data);
                  return; // Dừng vòng lặp quét
                }
            }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isJsQRLoaded, onScan]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      {error ? (
        <div className="text-white text-center p-4 z-20">
          <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
          <p>{error}</p>
        </div>
      ) : (
        <>
            <video 
              ref={videoRef} 
              playsInline 
              muted
              className="absolute w-full h-full object-cover"
            />
            {/* Canvas ẩn bắt buộc phải có để phân tích hình ảnh */}
            <canvas ref={canvasRef} className="hidden" />
        </>
      )}
      
      {/* Khung quét */}
      <div className="absolute inset-0 border-[50px] border-black/50 flex items-center justify-center pointer-events-none z-10">
        <div className="w-64 h-64 border-4 border-blue-500/80 rounded-3xl relative shadow-[0_0_100px_rgba(59,130,246,0.5)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-[scan_2s_infinite]"></div>
        </div>
      </div>
      
      <p className="absolute bottom-20 text-white text-sm bg-black/50 px-4 py-2 rounded-full z-20 backdrop-blur-sm">
        {isJsQRLoaded ? "Đang quét mã QR..." : "Đang tải bộ giải mã..."}
      </p>
    </div>
  );
};

export default function App() {
  // --- STATE ---
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('login'); 
  const [machines, setMachines] = useState(INITIAL_MACHINES);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [notification, setNotification] = useState(null);
  
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

  const handleTechLogin = (techUser) => {
    setUser(techUser);
    setView('home');
    showNotification(`Xin chào, ${techUser.name}`);
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
    setSelectedMachine(null);
  };

  const handleScanSuccess = (id) => {
    if (!id) return;
    if (selectedMachine && selectedMachine.id === id) return;

    const machine = machines.find(m => m.id === id);
    if (machine) {
      setSelectedMachine(machine);
      setView('details');
      showNotification(`Quét thành công: ${machine.name}`);
    } else {
      if (typeof id === 'string' && id.length > 2) {
          if (!notification) {
            showNotification(`Mã không hợp lệ: ${id}`, 'error');
          }
      }
    }
  };

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
      formData.append('images_count', logData.images.length); 

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

    const updatedInventory = [...inventory];
    newLog.parts.forEach(usedPart => {
        const itemIndex = updatedInventory.findIndex(i => i.name === usedPart.name);
        if (itemIndex > -1) {
            updatedInventory[itemIndex].quantity = Math.max(0, updatedInventory[itemIndex].quantity - Number(usedPart.quantity));
        }
    });
    setInventory(updatedInventory);

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
    const [isAdminView, setIsAdminView] = useState(false);

    // Lọc ra danh sách những người là Kỹ thuật viên (không cần pass)
    const techUsers = USERS.filter(u => u.role === 'maintenance');

    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-900 text-white animate-fade-in overflow-y-auto">
        <div className="w-full max-w-xs space-y-8 my-auto">
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
              
              {/* Danh sách KTV bấm vào là đăng nhập luôn */}
              {techUsers.map((tech) => (
                <button 
                  key={tech.username}
                  onClick={() => handleTechLogin(tech)} 
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl transition-all active:scale-95 shadow-lg flex items-center justify-between border border-slate-700"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-slate-700 p-2 rounded-full">
                      <User className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="font-medium text-lg">{tech.name}</span>
                  </div>
                  <ArrowLeft className="w-5 h-5 rotate-180 text-slate-500" />
                </button>
              ))}

              <div className="pt-6 border-t border-slate-800">
                <button 
                  onClick={() => setIsAdminView(true)} 
                  className="w-full bg-transparent border border-slate-700 text-slate-300 hover:text-white font-medium py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center"
                >
                  <Lock className="w-4 h-4 mr-2" /> Đăng nhập Quản trị (Admin)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative">
              <button 
                onClick={() => setIsAdminView(false)} 
                className="absolute -top-4 -left-4 bg-slate-700 p-2 rounded-full hover:bg-slate-600 transition-colors shadow-lg"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <h3 className="text-lg font-bold text-center mb-4">Đăng nhập Admin</h3>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tài khoản</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white" placeholder="admin" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Mật khẩu</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white" placeholder="***" />
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
                  <div className="text-left"><p className="font-medium text-slate-800">Quản lý Thiết Bị</p><p className="text-xs text-slate-500">Xem danh sách, nhập/xuất CSV</p></div>
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
                  <div className="text-left"><p className="font-medium text-slate-800">Cấu hình Google Sheet</p><p className="text-xs text-slate-500">Kết nối cơ sở dữ liệu báo cáo</p></div>
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
    const fileInputRef = useRef(null);

    const filteredMachines = machines.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExportCSV = () => {
      const headers = ['Mã Thiết Bị', 'Tên Thiết Bị', 'Model', 'Vị Trí', 'Đơn Vị', 'Trạng Thái'];
      const rows = machines.map(m => [m.id, m.name, m.model || '', m.location || '', m.department || '', m.status || 'operational']);
      
      const csvContent = "\ufeff" + [
        headers.join(','), 
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Danh_Sach_Thiet_Bi_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification('Đã tải xuống file Danh_Sach_Thiet_Bi.csv');
    };

    const handleImportCSV = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const lines = text.split('\n');
          if (lines.length < 2) throw new Error("File trống hoặc sai định dạng");
          
          const newMachinesList = [];
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
            if (cols.length >= 2) {
               newMachinesList.push({
                   id: cols[0],
                   name: cols[1],
                   model: cols[2] || '',
                   location: cols[3] || '',
                   department: cols[4] || '',
                   status: cols[5] || 'operational'
               });
            }
          }

          let updatedMachines = [...machines];
          let addedCount = 0;
          let updatedCount = 0;

          newMachinesList.forEach(newM => {
              const existingIndex = updatedMachines.findIndex(item => item.id === newM.id);
              if (existingIndex > -1) {
                  // Ghi đè thông tin thiết bị đã có
                  updatedMachines[existingIndex] = { ...updatedMachines[existingIndex], ...newM };
                  updatedCount++;
              } else {
                  // Thêm thiết bị mới
                  updatedMachines.push(newM);
                  addedCount++;
              }
          });

          setMachines(updatedMachines);
          showNotification(`Đã cập nhật: ${updatedCount} máy, Thêm mới: ${addedCount} máy`, 'success');
        } catch (err) {
          console.error(err);
          showNotification('Lỗi đọc file. Đảm bảo file đúng định dạng CSV.', 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = null; 
    };

    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
              <button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6" /></button>
              <h2 className="font-bold text-slate-800 text-lg">Quản lý Thiết Bị</h2>
          </div>

          <div className="flex gap-2">
              <button onClick={handleExportCSV} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                  <Download className="w-4 h-4 text-blue-600" /> Tải Xuống (.csv)
              </button>
              
              <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />
              <button onClick={() => fileInputRef.current.click()} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                  <Upload className="w-4 h-4 text-green-600" /> Nhập File (.csv)
              </button>
          </div>
          
          <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Tìm kiếm mã hoặc tên máy..." className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
              <div className="p-8 text-center text-slate-400 text-sm">Không tìm thấy thiết bị.</div>
            )}
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
          <input type="text" value={googleSheetUrl} onChange={(e) => setGoogleSheetUrl(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://script.google.com/macros/s/..." />
        </div>
        <button onClick={() => { localStorage.setItem('gs_url', googleSheetUrl); showNotification('Đã lưu cấu hình!'); setView('dashboard'); }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg">Lưu Cấu Hình</button>
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
        <button onClick={() => window.print()} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm"><Printer className="w-4 h-4" /> <span>In Ngay</span></button>
      </div>
      <div className="flex-1 overflow-y-auto p-8 bg-slate-100 print:bg-white print:p-0">
        <div className="grid grid-cols-2 gap-8 print:grid-cols-3 print:gap-4">
            {machines.map(m => (
                <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center print:shadow-none print:border-2 print:border-black">
                    <h3 className="font-bold text-lg mb-2">{m.name}</h3>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${m.id}`} alt={m.name} className="w-32 h-32 object-contain" />
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
          <button onClick={() => setView('scanner')} className="w-full bg-slate-900 text-white py-4 px-6 rounded-xl flex items-center justify-center space-x-3 shadow-xl active:scale-95 transition-transform">
            <QrCode className="w-6 h-6" /> <span className="font-semibold text-lg">Quét Mã QR</span>
          </button>
          <button onClick={() => setView('manual_select')} className="w-full bg-white text-slate-700 border border-slate-200 py-4 px-6 rounded-xl flex items-center justify-center space-x-3 shadow-sm hover:bg-slate-50 active:scale-95 transition-transform">
            <ListFilter className="w-6 h-6 text-slate-500" /> <span className="font-semibold text-lg">Chọn Thủ Công</span>
          </button>
          <button onClick={() => setView('inventory')} className="w-full bg-white text-slate-700 border border-slate-200 py-4 px-6 rounded-xl flex items-center justify-center space-x-3 shadow-sm hover:bg-slate-50 active:scale-95 transition-transform">
            <Boxes className="w-6 h-6 text-orange-500" /> <span className="font-semibold text-lg">Kho Vật Tư</span>
          </button>
      </div>
      <p className="text-sm text-slate-400 text-center">Chọn phương thức để bắt đầu bảo trì</p>
    </div>
  );

  const ScannerView = () => {
    return (
      <div className="flex flex-col h-full bg-black relative">
        <div className="absolute top-0 left-0 right-0 p-4 z-20">
          <button onClick={() => setView(user.role === 'admin' ? 'dashboard' : 'home')} className="text-white flex items-center space-x-2 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm"><ArrowLeft className="w-5 h-5" /><span>Quay lại</span></button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
            <NativeCameraScanner onScan={handleScanSuccess} />
            <div className="absolute bottom-8 left-0 right-0 px-6 z-20">
                 <p className="text-white/50 text-xs text-center mb-2">Nếu không quét được, hãy chọn máy bên dưới:</p>
                 <div className="flex gap-2 overflow-x-auto pb-2">
                     {machines.map(m => (
                         <button key={m.id} onClick={() => handleScanSuccess(m.id)} className="whitespace-nowrap bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-xs backdrop-blur-md border border-white/10">{m.name}</button>
                     ))}
                 </div>
            </div>
        </div>
      </div>
    );
  };

  const ManualSelectView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredMachines = machines.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.id.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
      <div className="flex flex-col h-full bg-slate-50">
         <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
                <button onClick={() => setView('home')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6" /></button>
                <h2 className="font-bold text-slate-800 text-lg">Tìm kiếm thiết bị</h2>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input type="text" placeholder="Nhập tên hoặc mã máy..." className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
            </div>
         </div>
         <div className="flex-1 overflow-y-auto p-4 space-y-3">
             <div className="flex justify-between items-center text-xs text-slate-500 uppercase font-bold tracking-wider mb-2"><span>Danh sách ({filteredMachines.length})</span></div>
            {filteredMachines.length > 0 ? (
                filteredMachines.map(m => (
                <button key={m.id} onClick={() => handleScanSuccess(m.id)} className="w-full p-4 bg-white border border-slate-200 hover:border-blue-500 rounded-xl flex items-center justify-between group transition-all shadow-sm active:scale-[0.98]">
                  <div className="flex items-center space-x-4 text-left">
                    <div className={`w-2 h-12 rounded-full ${m.status === 'operational' ? 'bg-green-500' : m.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                    <div>
                      <div className="font-bold text-slate-800 text-lg">{m.name}</div>
                      <div className="text-sm text-slate-500 font-mono flex items-center mt-1"><span className="bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-600 mr-2">{m.id}</span><MapPin className="w-3 h-3 mr-1" /><span className="truncate max-w-[150px]">{m.location}</span></div>
                    </div>
                  </div>
                  <div className="text-slate-300 group-hover:text-blue-600 transition-colors"><div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center bg-slate-50 group-hover:bg-blue-50 group-hover:border-blue-200">&rarr;</div></div>
                </button>
              ))
            ) : (<div className="text-center py-12 text-slate-400"><Search className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>Không tìm thấy thiết bị phù hợp.</p></div>)}
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
            
            {/* Hiển thị thêm Đơn vị sử dụng nếu có */}
            {selectedMachine.department && (
              <div className="mt-2 inline-flex items-center bg-blue-50 border border-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
                <User className="w-3 h-3 mr-1.5" />
                Đơn vị: {selectedMachine.department}
              </div>
            )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <button onClick={() => setView('form')} className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg"><Wrench className="w-5 h-5" /><span className="font-semibold">Cập nhật / Bảo trì</span></button>
            <div>
                <h3 className="font-bold text-slate-800 mb-4 flex items-center space-x-2"><History className="w-5 h-5 text-slate-500" /><span>Lịch sử sửa chữa</span></h3>
                <div className="space-y-4">{machineLogs.map((log) => (<div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"><div className="flex justify-between items-start mb-2"><div><span className="text-xs font-bold text-blue-600 uppercase">{log.type}</span><div className="text-xs text-slate-400">{log.date}</div></div><div className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-600">{log.technician}</div></div><p className="text-slate-700 text-sm mb-2">{log.note}</p>{log.parts && log.parts.length > 0 && (<div className="border-t border-slate-50 pt-2 mt-2"><div className="text-xs text-slate-400 mb-1 flex items-center"><Package className="w-3 h-3 mr-1"/> Vật tư:</div><div className="flex flex-wrap gap-1">{log.parts.map((p, idx) => (<span key={idx} className="bg-slate-50 text-slate-600 border border-slate-100 px-2 py-0.5 rounded text-[10px]">{p.name} ({p.quantity} {p.unit})</span>))}</div></div>)}
                {log.images && log.images.length > 0 && (<div className="flex gap-2 mt-2 overflow-x-auto pb-1">{log.images.map((img, idx) => (<img key={idx} src={img} className="w-16 h-16 object-cover rounded-lg border border-slate-200" alt="Báo cáo" />))}</div>)}
                </div>))}</div>
            </div>
        </div>
      </div>
    );
  };

  const LogFormView = () => {
    const [formData, setFormData] = useState({ technicianName: user?.name || '', type: 'Bảo trì định kỳ', note: '', status: 'Hoàn thành', parts: [], images: [] });
    const [tempPart, setTempPart] = useState({ name: '', unit: '', quantity: '' });

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
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => { setFormData(prev => ({...prev, images: [...prev.images, reader.result]})); };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = (index) => {
        const newImages = [...formData.images];
        newImages.splice(index, 1);
        setFormData({...formData, images: newImages});
    };

    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-4 border-b border-slate-100 flex items-center space-x-3"><button onClick={() => setView('details')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 text-slate-600" /></button><div><h2 className="font-bold text-slate-800">Báo cáo công việc</h2><p className="text-xs text-slate-500">{selectedMachine.name}</p></div></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-20">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Người thực hiện</label><input type="text" className="w-full p-3 rounded-lg border border-slate-300 bg-slate-50" value={formData.technicianName} onChange={e => setFormData({...formData, technicianName: e.target.value})} placeholder="Tên KTV..." /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Loại công việc</label><select className="w-full p-3 rounded-lg border border-slate-300" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option>Bảo trì định kỳ</option><option>Sửa chữa sự cố</option><option>Thay thế linh kiện</option></select></div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Vật tư thay thế (lấy từ kho)</label>
                <div className="flex flex-col gap-2 mb-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <select className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" value={tempPart.name} onChange={(e) => { const selectedItem = inventory.find(i => i.name === e.target.value); setTempPart({ ...tempPart, name: e.target.value, unit: selectedItem ? selectedItem.unit : '' }); }}>
                        <option value="">-- Chọn vật tư trong kho --</option>
                        {inventory.map(item => (<option key={item.id} value={item.name}>{item.name} (Tồn: {item.quantity} {item.unit})</option>))}
                    </select>
                    <div className="flex gap-2">
                        <input placeholder="Đơn vị" disabled className="w-1/2 p-2 border border-slate-300 rounded-lg text-sm bg-slate-100 text-slate-500" value={tempPart.unit} />
                        <input placeholder="Số lượng dùng" type="number" className="w-1/2 p-2 border border-slate-300 rounded-lg text-sm bg-white" value={tempPart.quantity} onChange={e => setTempPart({...tempPart, quantity: e.target.value})} />
                    </div>
                    <button onClick={addPart} className="bg-blue-600 text-white p-2 rounded-lg flex items-center justify-center font-medium text-sm mt-1 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" /> Thêm vào báo cáo</button>
                </div>
                <div className="space-y-2">{formData.parts.map((p, i) => (<div key={i} className="bg-white border border-slate-200 p-2 rounded flex justify-between text-sm items-center shadow-sm"><span className="font-medium">{p.name}</span><span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-xs">Dùng: {p.quantity} {p.unit}</span></div>))}</div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Hình ảnh hiện trường</label>
                <div className="flex flex-wrap gap-2">
                    {formData.images.map((img, idx) => (<div key={idx} className="relative w-20 h-20"><img src={img} className="w-full h-full object-cover rounded-lg border border-slate-200" alt="Preview" /><button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"><X className="w-3 h-3" /></button></div>))}
                    <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-blue-400 text-slate-400 hover:text-blue-500 transition-colors"><Camera className="w-6 h-6 mb-1" /><span className="text-[10px]">Chụp ảnh</span><input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" /></label>
                </div>
            </div>
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
        {view === 'machines' && <MachineManagementView />}
        {view === 'settings' && <SettingsView />}
        {view === 'inventory' && <InventoryView />}
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