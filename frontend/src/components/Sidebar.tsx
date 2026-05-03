import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  return (
    <aside className="app-sidebar">
      <div className="app-brand">
        <div className="app-logo">DF</div>
        <div>
          <div className="app-name">DocFlow</div>
          <div className="app-tagline">Bolle doganali</div>
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
        <span className="muted">v0.1</span>
      </div>
    </aside>
  )
}
