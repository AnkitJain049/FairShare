import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { User, Mail, Phone, Calendar, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function Profile() {
  const { user, updateProfileInContext } = useAuth();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await api.users.getProfile();
        setProfile(data);
        setName(data.name || '');
        setPhoneNumber(data.phoneNumber || '');
        // Sync the context and localStorage with DB profile data
        updateProfileInContext(data.name, data.phoneNumber);
      } catch (err) {
        setError('Failed to load profile. Please try refreshing.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setUpdating(true);

    try {
      const updatedProfile = await api.users.updateProfile(name, phoneNumber);
      setProfile(updatedProfile);
      updateProfileInContext(updatedProfile.name, updatedProfile.phoneNumber); // update navbar name & context phone
      setMessage('Profile updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-white">
        <Loader2 className="h-10 w-10 text-emerald-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-slate-800">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Your Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account information and contact details</p>
      </div>

      {message && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center space-x-2 text-sm shadow-sm">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-650 p-4 rounded-xl flex items-center space-x-2 text-sm shadow-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {profile && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Email Info box (Read Only) */}
          <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <Mail className="h-5 w-5 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Email Address (Primary)</p>
              <p className="text-slate-750 font-medium truncate">{profile.email}</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-500 font-semibold select-none shadow-sm">
              Verified
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <User className="h-4 w-4 text-slate-400" />
                <span>Full Name</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-xl bg-white border border-slate-250 text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent px-4 py-2.5 text-sm transition-all shadow-sm"
                placeholder="John Doe"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>Phone Number</span>
              </label>
              <input
                id="phone"
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="block w-full rounded-xl bg-white border border-slate-250 text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent px-4 py-2.5 text-sm transition-all shadow-sm"
                placeholder="+1 234 567 890"
              />
            </div>

            {/* Meta Info */}
            {profile.createdAt && (
              <div className="flex items-center space-x-2 text-xs text-slate-500 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>Account created on {new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            )}

            {/* Save Button */}
            <div className="border-t border-slate-100 pt-6 mt-6">
              <button
                type="submit"
                disabled={updating}
                className="w-full sm:w-auto flex justify-center items-center space-x-2 py-2.5 px-6 border border-transparent rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/10"
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
