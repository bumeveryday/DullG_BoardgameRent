// src/Admin.js
// 최종 수정일: 2025.12.05
// 설명: 관리자 페이지 메인 (인증 및 탭 컨테이너)

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { verifyAdminPassword, fetchGames, fetchConfig } from './api';

// 분리된 컴포넌트 임포트 (admin 폴더 생성 필요)
import DashboardTab from './admin/DashboardTab';
import AddGameTab from './admin/AddGameTab';
import ConfigTab from './admin/ConfigTab';

function Admin() {
  // --- 1. 인증 상태 관리 ---
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem("admin_auth") === "true"
  );
  const [inputPassword, setInputPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!inputPassword) return alert("암호를 입력하세요.");
    try {
      const res = await verifyAdminPassword(inputPassword);
      if (res.status === "success") {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_auth", "true");
      } else {
        alert("암호가 틀렸습니다.");
        setInputPassword("");
      }
    } catch (error) {
      alert("로그인 서버 오류: " + error);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_auth");
    alert("로그아웃 되었습니다.");
  };

  // --- 2. 데이터 상태 관리 (하위 탭들과 공유) ---
  const [activeTab, setActiveTab] = useState("dashboard");
  const [games, setGames] = useState([]);
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(false);

  // 데이터 로딩 함수 (대시보드와 설정 탭에서 새로고침 시 사용)
  const loadData = async () => {
    setLoading(true);
    try {
      const [gamesData, configData] = await Promise.all([fetchGames(), fetchConfig()]);
      
      // 정렬 로직 (찜 > 대여중 > 분실 > 대여가능)
      const priority = { "찜": 1, "대여중": 2, "분실": 3, "대여가능": 4 };
      const sortedGames = gamesData.sort((a, b) => (priority[a.status] || 4) - (priority[b.status] || 4));
      
      setGames(sortedGames);
      if (configData?.length) setConfig(configData);
    } catch (e) { 
      alert("데이터 로딩 실패"); 
    } finally { 
      setLoading(false); 
    }
  };

  // 인증 성공 시 데이터 최초 로드
  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated]);


  // --- 3. 렌더링: 잠금 화면 ---
  if (!isAuthenticated) {
    return (
      <div style={styles.authContainer}>
        <h2 style={{ fontSize: "2em", marginBottom: "20px" }}>🔒 관리자 접근 제한</h2>
        <p style={{ color: "#666", marginBottom: "30px" }}>관리자 암호를 입력해주세요.</p>
        <form onSubmit={handleLogin} style={{ display: "flex", gap: "10px" }}>
          <input 
            type="password" 
            value={inputPassword} 
            onChange={(e) => setInputPassword(e.target.value)} 
            placeholder="암호 입력" 
            style={styles.input}
            autoFocus
          />
          <button type="submit" style={styles.loginBtn}>확인</button>
        </form>
        <Link to="/" style={styles.backLink}>← 메인으로 돌아가기</Link>
      </div>
    );
  }

  // --- 4. 렌더링: 관리자 메인 화면 ---
  return (
    <div style={styles.container}>
      {/* 상단 헤더 */}
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>🔓 관리자 페이지</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handleLogout} style={styles.logoutBtn}>로그아웃</button>
          <Link to="/" style={styles.homeBtn}>🏠 메인으로</Link>
        </div>
      </div>

      {/* 탭 버튼 영역 */}
      <div style={styles.tabContainer}>
        <TabButton label="📋 대여 현황 / 태그" id="dashboard" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="➕ 게임 추가" id="add" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="🎨 홈페이지 설정" id="config" activeTab={activeTab} onClick={setActiveTab} />
      </div>

      {/* 탭 컨텐츠 영역 */}
      <div style={styles.content}>
        {activeTab === "dashboard" && (
          <DashboardTab 
            games={games} 
            loading={loading} 
            onReload={loadData} 
          />
        )}

        {activeTab === "add" && (
          <AddGameTab 
            onGameAdded={loadData} // 게임 추가 후 목록 갱신을 위해 전달
          />
        )}

        {activeTab === "config" && (
          <ConfigTab 
            config={config} 
            onReload={loadData} // 설정 저장 후 갱신을 위해 전달
          />
        )}
      </div>
    </div>
  );
}

// --- 스타일 및 서브 컴포넌트 ---

// 탭 버튼 컴포넌트 (중복 제거)
const TabButton = ({ label, id, activeTab, onClick }) => (
  <button 
    onClick={() => onClick(id)} 
    style={{
      padding: "10px 20px", 
      border: "none", 
      background: activeTab === id ? "#333" : "white", 
      color: activeTab === id ? "white" : "#555", 
      borderRadius: "25px", 
      cursor: "pointer", 
      fontWeight: "bold", 
      fontSize: "0.95rem", 
      whiteSpace: "nowrap", 
      boxShadow: activeTab === id ? "0 2px 5px rgba(0,0,0,0.2)" : "none", 
      transition: "all 0.2s"
    }}
  >
    {label}
  </button>
);

const styles = {
  container: { padding: "20px", maxWidth: "1000px", margin: "0 auto", paddingBottom: "100px" },
  authContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", textAlign: "center" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "2px solid #333", paddingBottom: "15px" },
  tabContainer: { display: "flex", gap: "10px", marginBottom: "30px", borderBottom: "1px solid #ddd", paddingBottom: "10px", overflowX: "auto" },
  content: { minHeight: "300px" },
  input: { padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "1em" },
  loginBtn: { padding: "12px 20px", background: "#333", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  logoutBtn: { padding: "8px 15px", background: "#eee", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.9em" },
  homeBtn: { textDecoration: "none", color: "#333", border: "1px solid #ccc", padding: "8px 15px", borderRadius: "8px", background: "white", fontSize: "0.9em" },
  backLink: { marginTop: "30px", color: "#999", textDecoration: "underline", fontSize: "0.9em" }
};

export default Admin;