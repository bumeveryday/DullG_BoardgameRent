import { useState, useEffect } from 'react';
import { TEXTS } from '../constants';
import { signupUser, loginUser } from '../api'; // [New] 회원가입/로그인 API 임포트

function LoginModal({ isOpen, onClose, onConfirm, gameName, currentUser, sessionUser, setSessionUser, setUser }) {
  // 입력값 상태
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(""); // [New] 회원가입용 비밀번호
  const [isLoading, setIsLoading] = useState(false); // [New] 로딩 상태
  // [New] UI 뷰 모드 관리 ('form' | 'info')
  // 로딩 중에 currentUser가 업데이트되어도 화면이 깜빡이지 않도록 제어
  // 초기값은 mount 시점의 currentUser 여부에 따라 결정됨 (re-render 시 변하지 않음)
  const [viewMode] = useState(currentUser ? 'info' : 'form');

  // 모달이 열릴 때 초기화 (Mount 시 1회 실행)
  useEffect(() => {
    if (isOpen) {
      // 입력값 초기화
      if (currentUser) {
        // ✅ Case 1: 이미 로그인된 상태 (부모에게서 정보 받음)
        setName(currentUser.name);
        setStudentId(currentUser.studentId || currentUser.student_id || "");
        setPhone(currentUser.phone || "");
      } else {
        // ✅ Case 2: 비로그인 상태
        const saved = localStorage.getItem('user');
        if (saved) {
          const user = JSON.parse(saved);
          setName(user.name);
          setStudentId(user.studentId);
        } else {
          setName("");
          setStudentId("");
          setPhone("");
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ 의존성 배열 비움: Mount 시점에만 실행 (중간에 currentUser 바뀌어도 폼 유지)

  // 대여 버튼 클릭 핸들러
  const handleSubmit = async () => {
    // 1. 필수 정보 입력 확인 (이름/연락처가 없더라도 학번/비번이 있으면 로그인 시도로 간주하고 통과)
    // [Fix] 이 검증 로직은 "비로그인 유저"에게만 적용되어야 함 (로그인된 유저는 password가 빈 값이어도 됨)
    if (!currentUser) {
      const isLoginTry = studentId && password;
      const isFullSignup = name && studentId && phone && password;

      if (!isLoginTry && !isFullSignup) {
        // 학번/비번도 없고, 전체 정보도 없으면 에러
        if (!studentId || !password) return alert(TEXTS.ALERT_PASSWORD_REQUIRED);
      }
    }

    // [Fix] 항상 비밀번호 확인 (회원가입 강제) - 로그인 안 된 경우에만
    if (!currentUser && !password) return alert(TEXTS.ALERT_PASSWORD_REQUIRED);

    if (isLoading) return; // 중복 클릭 방지
    setIsLoading(true);

    try {
      // 2. 임시 유저(Guest)라면 세션에 저장 (LoginModal은 이제 항상 Login/Signup을 시도함)
      if (!currentUser) {
        if (setSessionUser) setSessionUser({ name, studentId, phone });

        // 3. 비로그인 상태일 때 회원가입 또는 로그인 시도
        let res;

        // 이름이나 전화번호가 비어있으면 -> "로그인" 시도로 간주
        if (!name || !phone) {
          res = await loginUser(studentId, password);
        } else {
          // 모든 정보가 있으면 -> "회원가입(또는 자동로그인)" 시도
          res = await signupUser({ name, studentId, password, phone });
        }

        if (!res.success) {
          throw new Error(TEXTS.ALERT_AUTH_FAIL + res.message);
        }

        // ✅ [New] 가입/로그인 성공 시 앱 전체 상태 업데이트 (로그인 유지)
        let userToSave = res.user;

        if (!userToSave) {
          // 2. 서버가 안 줬으면(신규 가입) 입력값으로 구성
          userToSave = { name, studentId, phone };
        }

        // 3. 비밀번호 포함 (로컬스토리지 저장용)
        userToSave.password = password;

        // ⭐ [Critical] App.js의 메인 user 상태(setUser)를 업데이트해야 로그인 된 것으로 처리됨
        if (setUser) setUser(userToSave);
        else if (setSessionUser) setSessionUser(userToSave);

        localStorage.setItem("user", JSON.stringify(userToSave));
      }

      // ✅ 비밀번호 결정 (입력한 비번 or 기존 비번)
      const passwordToSend = currentUser ? currentUser.password : password;

      // 4. 대여 확정 (Backend에서는 이제 무조건 인증을 거침)
      // [Fix] 비동기 처리 및 에러 시 모달 유지
      // 성공 시에만 부모 컴포넌트(GameDetail)가 setIsLoginModalOpen(false)를 하도록 위임
      await onConfirm({
        name,
        studentId,
        phone,
        password: passwordToSend
      });

    } catch (e) {
      alert(e.message || TEXTS.ALERT_AUTH_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>{TEXTS.USER_MODAL_TITLE}</h3>
        <p style={{ color: "#666", fontSize: "0.9em", marginBottom: "20px" }}
          dangerouslySetInnerHTML={{ __html: TEXTS.USER_MODAL_DESC.replace("{gameName}", gameName) }}
        />

        {viewMode === 'info' ? (
          <div style={{ background: "#f0f9ff", padding: "20px", borderRadius: "10px", marginBottom: "20px" }}>
            <div style={{ fontSize: "1.2em", fontWeight: "bold", color: "#2c3e50" }}>{currentUser.name} 님</div>
            <div style={{ color: "#7f8c8d", fontSize: "0.9em", marginTop: "5px" }}>{currentUser.studentId}</div>
            <div style={{ color: "#7f8c8d", fontSize: "0.9em" }}>{currentUser.phone}</div>

            <p style={{ color: "#3498db", fontSize: "0.85em", marginTop: "15px" }}
              dangerouslySetInnerHTML={{ __html: TEXTS.USER_MODAL_LOGGED_IN_DESC }}
            />
          </div>
        ) : (
          <form style={{ display: "flex", flexDirection: "column", gap: "10px" }} onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <input
              placeholder="이름 (예: 홍길동)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              autoComplete="name"
            />
            <input
              placeholder="학번 (예: 22400001)"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              style={styles.input}
              type="number"
              maxLength={8}
              autoComplete="username"
              onInput={(e) => {
                if (e.target.value.length > 8) e.target.value = e.target.value.slice(0, 8);
              }}
            />
            <input
              placeholder="연락처 (010-0000-0000)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={styles.input}
              autoComplete="tel"
            />

            {/* [New] 항상 비밀번호 입력 (회원가입/로그인 필수) */}
            <input
              type="password"
              placeholder="비밀번호 입력 (필수)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              autoComplete="current-password"
            />

            <div style={{ fontSize: "0.85em", color: "#888", marginTop: "5px", lineHeight: "1.4", background: "#f9f9f9", padding: "10px", borderRadius: "8px" }}>
              <span dangerouslySetInnerHTML={{ __html: TEXTS.MODAL_SIGNUP_PROMO }} />
            </div>
          </form>
        )}

        <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
          <button onClick={onClose} style={styles.cancelBtn} disabled={isLoading}>{TEXTS.BTN_CANCEL}</button>
          <button onClick={handleSubmit} style={{ ...styles.confirmBtn, opacity: isLoading ? 0.7 : 1 }} disabled={isLoading}>
            {isLoading ? TEXTS.BTN_RENT_LOADING : (viewMode === 'info' ? TEXTS.BTN_RENT_NOW : TEXTS.BTN_RENT_LOGIN_REQUIRED)}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modal: { background: "white", padding: "25px", borderRadius: "15px", width: "90%", maxWidth: "350px", textAlign: "center", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" },
  input: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box", fontSize: "1rem" },
  label: { display: "block", textAlign: "left", fontSize: "0.85em", color: "#666", marginBottom: "5px" },
  checkboxContainer: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "5px 0" },
  resetBtn: { background: "none", border: "none", color: "#999", textDecoration: "underline", fontSize: "0.8em", marginTop: "10px", cursor: "pointer" },
  cancelBtn: { flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #ddd", background: "white", cursor: "pointer" },
  confirmBtn: { flex: 2, padding: "12px", borderRadius: "8px", border: "none", background: "#333", color: "white", fontWeight: "bold", cursor: "pointer" }
};

export default LoginModal;