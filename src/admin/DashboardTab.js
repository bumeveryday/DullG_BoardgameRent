// src/admin/DashboardTab.js
import { useState, useEffect, useMemo} from 'react';
import { adminUpdateGame, deleteGame, approveDibsByRenter, returnGamesByRenter, editGame, fetchGameLogs } from '../api';
import GameFormModal from './GameFormModal'; // 공통 모달 임포트
import FilterBar from '../FilterBar';

function DashboardTab({ games, loading, onReload }) {
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [targetGame, setTargetGame] = useState(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [gameLogs, setGameLogs] = useState([]);
  const [logGameName, setLogGameName] = useState("");

// 필터 관련 변수
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [renterFilter, setRenterFilter] = useState(""); // 👤 대여자 검색용
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [difficultyFilter, setDifficultyFilter] = useState("전체");
  const [playerFilter, setPlayerFilter] = useState("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

// 검색어 디바운싱 (0.3초 딜레이)
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // --- 필터링 로직 (App.js에서 가져옴 + 대여자 필터 추가) ---
  // (인원수 체크 헬퍼 함수)
  const checkPlayerCount = (rangeStr, targetFilter) => {
    if (!rangeStr) return false;
    try {
      const parts = rangeStr.split('~');
      const min = parseInt(parts[0]);
      const max = parts.length > 1 ? parseInt(parts[1]) : min;
      if (targetFilter === "6+") return max >= 6;
      else {
        const target = parseInt(targetFilter);
        return target >= min && target <= max;
      }
    } catch (e) { return false; }
  };

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      // 1. 검색어 필터 (#태그 or 이름)
      if (searchTerm.startsWith("#")) {
        if (!game.tags || !game.tags.includes(searchTerm)) return false;
      } else {
        if (searchTerm && !game.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      }
      
      // 2. [관리자 전용] 대여자 검색
      if (renterFilter) {
        // 대여자가 없거나, 이름이 포함되지 않으면 제외
        if (!game.renter || !game.renter.includes(renterFilter)) return false;
      }

      // 3. 카테고리, 상태, 난이도, 인원 필터 (App.js와 동일)
      if (selectedCategory !== "전체" && game.category !== selectedCategory) return false;
      if (onlyAvailable && game.status !== "대여가능") return false;
      
      if (difficultyFilter !== "전체" && game.difficulty) {
        const score = parseFloat(game.difficulty);
        if (difficultyFilter === "입문" && score >= 2.0) return false;
        if (difficultyFilter === "초중급" && (score < 2.0 || score >= 3.0)) return false;
        if (difficultyFilter === "전략" && score < 3.0) return false;
      }
      
      if (playerFilter !== "all" && game.players) {
        if (!checkPlayerCount(game.players, playerFilter)) return false;
      }

      return true;
    });
  }, [games, searchTerm, renterFilter, selectedCategory, onlyAvailable, difficultyFilter, playerFilter]);

  // 필터 초기화 함수
  const resetFilters = () => {
    setInputValue(""); setSearchTerm(""); setRenterFilter("");
    setSelectedCategory("전체"); setDifficultyFilter("전체");
    setPlayerFilter("all"); setOnlyAvailable(false);
  };

// 여기까지 필터바 
// ===================================


  // 카테고리 목록 추출
  const categories = ["전체", ...new Set(games.map(g => g.category).filter(Boolean))];


  // 수정 모달 열기
  const openEditModal = (game) => {
    setTargetGame(game); // 기존 게임 데이터를 그대로 넘김
    setIsEditModalOpen(true);
  };

  // 모달에서 '저장' 버튼 클릭 시
  const handleEditSubmit = async (formData) => {
    if (window.confirm(`[${formData.name}] 정보를 수정하시겠습니까?`)) {
      try {
        // 기존 ID는 유지하고 폼 데이터로 덮어쓰기
        await editGame({ game_id: targetGame.id, ...formData });
        alert("✅ 수정되었습니다.");
        setIsEditModalOpen(false);
        onReload();
      } catch (e) {
        alert("수정 실패: " + e);
      }
    }
  };

  // 현장 대여 핸들러 추가
  const handleDirectRent = async (game) => {
    // 1. 대여자 이름 입력받기
    const renterName = prompt(`[${game.name}] 현장 대여자 이름(전화번호)을 입력하세요.\n예: 김철수(010-1234-5678)`);
    
    // 취소하거나 빈 값을 입력하면 중단
    if (!renterName || renterName.trim() === "") return;

    if (window.confirm(`[${game.name}] \n대여자: ${renterName}\n\n현장 대여 처리하시겠습니까?`)) {
      try {
        // 2. API 호출 (상태: "대여중", 대여자명 함께 전송)
        await adminUpdateGame(game.id, "대여중", renterName);
        alert("✅ 대여 처리되었습니다.");
        onReload();
      } catch (e) {
        alert("처리 실패: " + e);
      }
    }
  };


  
 // 3. 단순 상태 변경 (분실, 대여취소 등)
  const handleStatusChange = async (gameId, newStatus, gameName) => {
    let msg = `[${gameName}] 상태를 '${newStatus}'(으)로 변경하시겠습니까?`;
    if (newStatus === "대여중") msg = "현장 수령 확인하시겠습니까?";
    if (newStatus === "대여가능") msg = "반납 처리하시겠습니까?";

    if (!window.confirm(msg)) return;

    try {
      await adminUpdateGame(gameId, newStatus);
      alert("처리되었습니다.");
      onReload();
    } catch (e) {
      alert("오류 발생: " + e);
    }
  };

  // 4. 스마트 반납 (일괄 처리 로직)
  const handleReturn = async (game) => {
    const renterName = game.renter;
    const sameUserRentals = games.filter(g => g.status === "대여중" && g.renter === renterName);
    const count = sameUserRentals.length;

    if (count <= 1) {
      if (window.confirm(`[${game.name}] 반납 처리하시겠습니까?`)) {
        await adminUpdateGame(game.id, "대여가능");
        alert("반납되었습니다.");
        onReload();
      }
      return;
    }

    if (window.confirm(`💡 [${renterName}] 님이 현재 빌려간 게임이 총 ${count}개입니다.\n\n모두 한꺼번에 '반납' 처리하시겠습니까?\n(취소 누르면 이 게임 하나만 반납합니다)`)) {
      await returnGamesByRenter(renterName);
      alert(`${count}건이 일괄 반납되었습니다.`);
      onReload();
    } else {
      await adminUpdateGame(game.id, "대여가능");
      alert("반납되었습니다.");
      onReload();
    }
  };

  // 5. 스마트 수령 (일괄 찜 처리 로직)
  const handleReceive = async (game) => {
    const renterName = game.renter;
    const sameUserDibs = games.filter(g => g.status === "찜" && g.renter === renterName);
    const count = sameUserDibs.length;

    if (count <= 1) {
      if (window.confirm(`[${game.name}] 현장 수령 확인하시겠습니까?`)) {
        await adminUpdateGame(game.id, "대여중");
        alert("처리되었습니다.");
        onReload();
      }
      return;
    }

    if (window.confirm(`💡 [${renterName}] 님이 예약한 게임이 총 ${count}개입니다.\n\n모두 한꺼번에 '대여중'으로 처리하시겠습니까?\n(취소 누르면 이 게임 하나만 처리합니다)`)) {
      await approveDibsByRenter(renterName);
      alert(`${count}건이 일괄 수령 처리되었습니다.`);
      onReload();
    } else {
      await adminUpdateGame(game.id, "대여중");
      alert("처리되었습니다.");
      onReload();
    }
  };

  // 6. 게임 삭제
  const handleDelete = async (game) => {
    if (!window.confirm(`[${game.name}] 정말 삭제합니까?\n되돌릴 수 없습니다.`)) return;
    try {
      await deleteGame(game.id);
      alert("삭제되었습니다.");
      onReload();
    } catch (e) {
      alert("삭제 실패");
    }
  };

  // ⭐ [추가] 로그 보기 핸들러
  const handleShowLogs = async (game) => {
    setLogGameName(game.name);
    setGameLogs([]); // 초기화
    setIsLogModalOpen(true);
    
    try {
      const res = await fetchGameLogs(game.id);
      if (res.status === "success") {
        setGameLogs(res.logs);
      } else {
        alert("로그를 불러오지 못했습니다.");
      }
    } catch (e) {
      alert("로그 로딩 에러");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h3>🚨 게임 관리 (총 {games.length}개)</h3>
        <button onClick={onReload} style={{ padding: "5px 10px", cursor: "pointer", background:"#f8f9fa", border:"1px solid #ddd", borderRadius:"5px" }}>🔄 새로고침</button>
      </div>

      <FilterBar 
        inputValue={inputValue} setInputValue={setInputValue}
        selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
        difficultyFilter={difficultyFilter} setDifficultyFilter={setDifficultyFilter}
        playerFilter={playerFilter} setPlayerFilter={setPlayerFilter}
        onlyAvailable={onlyAvailable} setOnlyAvailable={setOnlyAvailable}
        categories={categories}
        onReset={resetFilters}
        isAdmin={true}                   // 관리자 모드 켜기
        renterFilter={renterFilter}      // 대여자 검색 state
        setRenterFilter={setRenterFilter}
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>데이터를 불러오는 중... ⏳</div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {filteredGames.map(game => (
            <div key={game.id} style={styles.card}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <div style={{ fontWeight: "bold", fontSize: "1.05em" }}>
                  {game.name} 
                  <span style={{ ...styles.statusBadge, background: getStatusColor(game.status) }}>
                    {game.status}
                  </span>
                </div>
                <div style={{ fontSize: "0.85em", color: "#666", marginTop: "5px", lineHeight: "1.4" }}>
                  <span style={{ marginRight: "10px" }}>{game.renter ? `👤 ${game.renter}` : "대여자 없음"}</span>
                  <span style={{ color: "#e67e22", marginRight: "10px" }}>난이도: {game.difficulty || "-"}</span>
                  <br/>
                  태그: <span style={{color:"#3498db"}}>{game.tags || "(없음)"}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "5px" }}>
                <button onClick={() => handleShowLogs(game)} style={{...actionBtnStyle("#ecf0f1"), color:"#555", border:"1px solid #ddd"}} title="이력 조회">📜</button>
                <button onClick={() => openEditModal(game)} style={actionBtnStyle("#9b59b6")}>✏️ 수정</button>
                <button onClick={() => handleDelete(game)} style={{...actionBtnStyle("#fff"), color:"#e74c3c", border:"1px solid #e74c3c", width:"30px", padding:0}}>🗑️</button>
                
                {/* 상태별 버튼 로직 유지 */}
                 {game.status === "찜" ? (
                  <>
                    <button onClick={() => handleReceive(game)} style={actionBtnStyle("#3498db")}>🤝 수령</button>
                    <button onClick={() => handleStatusChange(game.id, "대여가능", game.name)} style={actionBtnStyle("#e74c3c")}>🚫 취소</button>
                  </>
                ) : game.status !== "대여가능" ? (
                  <>
                    <button onClick={() => handleReturn(game)} style={actionBtnStyle("#2ecc71")}>↩️ 반납</button>
                    <button onClick={() => handleStatusChange(game.id, "분실", game.name)} style={actionBtnStyle("#95a5a6")}>⚠️ 분실</button>
                  </>
                ) : 
                <button onClick={() => handleDirectRent(game)} style={actionBtnStyle("#2c3e50")}>✋ 현장대여</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 공통 모달 사용 (수정용) */}
      <GameFormModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={targetGame}
        onSubmit={handleEditSubmit}
        title="✏️ 게임 정보 수정"
      />

      {isLogModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0, marginBottom: "15px", borderBottom:"1px solid #eee", paddingBottom:"10px" }}>
              📜 [{logGameName}] 대여 이력
            </h3>
            
            <div style={{ maxHeight: "300px", overflowY: "auto", fontSize: "0.9em" }}>
              {gameLogs.length === 0 ? (
                <p style={{ textAlign: "center", color: "#999" }}>기록을 불러오는 중이거나 기록이 없습니다.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fa", textAlign: "left" }}>
                      <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>날짜</th>
                      <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>행동</th>
                      <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameLogs.map((log, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "8px", color: "#666" }}>{String(log.date)}</td>
                        <td style={{ padding: "8px", fontWeight: "bold", color: log.type==="RENT"?"#e74c3c":log.type==="RETURN"?"#2ecc71":"#333" }}>
                          {log.type === "RENT" ? "대여" : log.type === "RETURN" ? "반납" : log.type}
                        </td>
                        <td style={{ padding: "8px" }}>{log.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button onClick={() => setIsLogModalOpen(false)} style={styles.cancelBtn}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const getStatusColor = (s) => (s==="대여가능"?"#2ecc71":s==="찜"?"#f1c40f":s==="대여중"?"#3498db":"#95a5a6");
const actionBtnStyle = (bgColor) => ({ padding: "6px 12px", border: "none", background: bgColor, color: "white", borderRadius: "6px", cursor: "pointer", fontSize: "0.85em", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" });
const styles = {
  card: { border: "1px solid #ddd", padding: "15px", borderRadius: "10px", background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.03)" },
  statusBadge: { marginLeft: "8px", fontSize: "0.8em", padding: "2px 8px", borderRadius: "12px", color: "white" },
  
  modalOverlay: { 
    position: "fixed",   // 모달 위치 강제 고정
    top: 0, 
    left: 0, 
    right: 0,   // 추가
    bottom: 0,  // 추가
    width: "100%", 
    height: "100%", 
    background: "rgba(0,0,0,0.5)", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    zIndex: 9999 // 매우 높은 값으로 설정
  },
  modalContent: { background: "white", padding: "25px", borderRadius: "15px", width: "90%", maxWidth: "450px", boxShadow: "0 5px 20px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" },
  cancelBtn: { padding: "10px 20px", background: "#ddd", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", color: "#555" }
};

export default DashboardTab;