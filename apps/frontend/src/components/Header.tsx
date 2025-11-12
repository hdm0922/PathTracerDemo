import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="header-container">
        {/* Logo Section */}
        <div className="header-logo">
          <div className="logo-icon">
            <div className="logo-shape"></div>
          </div>
          <span className="logo-text">인태리</span>
        </div>

        {/* Navigation */}
        <nav className="header-nav">
          <a href="#home" className="nav-link active">
            씬
          </a>
          <a href="#products" className="nav-link">
            편집
          </a>
        </nav>

        {/* Auth Buttons */}
        <div className="header-auth">
          <button className="auth-button auth-login">로그인</button>
          <button className="auth-button auth-signup">회원가입</button>
        </div>
      </div>
    </header>
  );
}
