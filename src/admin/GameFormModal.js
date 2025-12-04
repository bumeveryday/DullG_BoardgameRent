// src/admin/GameFormModal.js
// 설명: 게임 정보 입력/수정용 공통 모달

import { useState, useEffect } from 'react';

function GameFormModal({ isOpen, onClose, initialData, onSubmit, title }) {
  const [formData, setFormData] = useState({
    name: "", 
    category: "보드게임", 
    difficulty: "", 
    genre: "",
    players: "", 
    tags: "", 
    image: "", 
    ...initialData
  });

  // 모달이 열릴 때마다 초기 데이터(initialData)로 폼을 리셋
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "", category: "보드게임", difficulty: "", players: "", tags: "", image: "",
        ...initialData // 부모가 준 데이터가 있으면 덮어씌움
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!formData.name) return alert("이름은 필수입니다.");
    onSubmit(formData); // 부모 컴포넌트에게 입력된 데이터 전달
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <h3 style={{ marginTop: 0, marginBottom: "20px" }}>{title}</h3>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>이름</label>
          <input 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            style={styles.input} 
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>카테고리</label>
            <select 
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})} 
              style={styles.input}
            >
              <option>보드게임</option>
              <option>머더미스터리</option>
              <option>TRPG</option>
              <option>TCG</option>
            </select>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>난이도 (0.0~5.0)</label>
            <input 
              type="number" step="0.1" min="0" max="5"
              value={formData.difficulty} 
              onChange={e => setFormData({...formData, difficulty: e.target.value})} 
              placeholder="예: 2.5"
              style={styles.input} 
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>장르</label>
          <input 
            value={formData.genre} 
            onChange={e => setFormData({...formData, genre: e.target.value})} 
            placeholder="예: 전략, 추리, 파티"
            style={styles.input} 
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>인원</label>
          <input 
            value={formData.players} 
            onChange={e => setFormData({...formData, players: e.target.value})} 
            placeholder="예: 2~4인"
            style={styles.input} 
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>태그 (#으로 구분)</label>
          <input 
            value={formData.tags} 
            onChange={e => setFormData({...formData, tags: e.target.value})} 
            placeholder="#전략 #파티"
            style={styles.input} 
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>이미지 URL</label>
          <input 
            value={formData.image} 
            onChange={e => setFormData({...formData, image: e.target.value})} 
            style={styles.input} 
          />
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onClose} style={styles.cancelBtn}>취소</button>
          <button onClick={handleSubmit} style={styles.saveBtn}>저장</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalContent: { background: "white", padding: "25px", borderRadius: "15px", width: "90%", maxWidth: "450px", boxShadow: "0 5px 20px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" },
  formGroup: { marginBottom: "15px" },
  label: { fontWeight: "bold", display: "block", marginBottom: "5px", fontSize: "0.9em", color: "#555" },
  input: { width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "1em", boxSizing: "border-box" },
  cancelBtn: { flex: 1, padding: "12px", background: "#ddd", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", color: "#555" },
  saveBtn: { flex: 1, padding: "12px", background: "#3498db", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }
};

export default GameFormModal;