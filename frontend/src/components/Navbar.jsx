import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-500 transition-colors">
              <img src="/favicon.svg" alt="FairShare Logo" className="h-8 w-8" />
              <span className="text-xl font-bold tracking-tight text-slate-800">
                Fair<span className="text-emerald-600">Share</span>
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            <Link
              to="/"
              className="flex items-center space-x-1.5 text-sm text-slate-650 hover:text-slate-900 transition-colors font-medium"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>

            {/* User Session Info / Logout */}
            {user && (
              <div className="flex items-center space-x-4 border-l border-slate-200 pl-6">
                <Link
                  to="/profile"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
                >
                  Hi, <span className="text-slate-850 font-semibold group-hover:text-emerald-600 transition-colors">{user.name}</span>
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
