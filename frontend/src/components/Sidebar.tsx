import { NavLink } from 'react-router-dom'
import appLogo from '../assets/icon.png'

export default function Sidebar() {
  return (
    <aside className="app-sidebar">
      <div className="app-brand">
        <div className="app-logo">
          <img className="app-logo__image" src={appLogo} alt="DocFlow" />
        </div>
        <div>
          <div className="app-name">DocFlow</div>
        </div>
      </div>
      <nav className="app-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? 'nav-link is-active' : 'nav-link'
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/archive"
          className={({ isActive }) =>
            isActive ? 'nav-link is-active' : 'nav-link'
          }
        >
          Archivio documenti
        </NavLink>
      </nav>
      <div className="app-sidebar__footer">
        <span className="muted">V1.1.0</span>
      </div>
    </aside>
  )
}
