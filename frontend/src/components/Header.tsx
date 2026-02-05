import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          書籍管理システム
        </Link>
        <nav className="nav">
          <Link to="/">書籍一覧</Link>
          <Link to="/register">書籍登録</Link>
          <Link to="/loans">貸出状況</Link>
          <Link to="/reviews">レビュー</Link>
        </nav>
        {user && (
          <div className="user-info">
            {user.picture && (
              <img src={user.picture} alt={user.name} className="user-avatar" />
            )}
            <span className="user-name">{user.name}</span>
            <button onClick={logout} className="logout-button">
              ログアウト
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
