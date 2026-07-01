import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Plus, Users, Search, X, Loader2, AlertCircle } from 'lucide-react';
import GroupCard from '../components/GroupCard';

export default function Dashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [memberIds, setMemberIds] = useState([]); // List of added user objects
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await api.groups.getUserGroups(user.id);
      setGroups(data || []);
    } catch (err) {
      setError('Failed to load groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchGroups();
    }
  }, [user?.id]);

  // Handle member lookup and add
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchError('');
    setSearchLoading(true);

    try {
      const foundUser = await api.users.lookup(searchQuery);
      
      // Check if user is already added
      if (memberIds.some((member) => member.id === foundUser.id)) {
        setSearchError('User is already added to the group.');
        return;
      }
      
      // Check if user is self
      if (foundUser.id === user.id) {
        setSearchError('You are automatically included in the group.');
        return;
      }

      setMemberIds([...memberIds, foundUser]);
      setSearchQuery('');
    } catch (err) {
      setSearchError(err.message || 'User not found.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRemoveMember = (id) => {
    setMemberIds(memberIds.filter((member) => member.id !== id));
  };

  // Handle group creation
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setError('');
    setSearchError('');

    let finalMemberIds = [...memberIds];

    // If there is an unadded query in the search input, try to resolve it first
    if (searchQuery.trim()) {
      setSearchLoading(true);
      try {
        const foundUser = await api.users.lookup(searchQuery.trim());
        
        // Add if not already present
        if (!memberIds.some((m) => m.id === foundUser.id) && foundUser.id !== user.id) {
          finalMemberIds.push(foundUser);
        }
        setSearchQuery('');
      } catch (err) {
        setSearchError(err.message || 'User not found.');
        setSearchLoading(false);
        return; // Halt creation to let user fix/remove the email
      }
      setSearchLoading(false);
    }

    try {
      // Include current user in member IDs
      const allMemberIds = [user.id, ...finalMemberIds.map((m) => m.id)];
      await api.groups.createGroup(groupName, allMemberIds);
      
      // Reset & refresh
      setGroupName('');
      setMemberIds([]);
      setIsOpen(false);
      fetchGroups();
    } catch (err) {
      setError(err.message || 'Failed to create group.');
    }
  };



  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-slate-800">
      {/* Header bar */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">Your Expense Groups</h1>
          <p className="text-slate-500 text-sm mt-1">Manage, split, and simplify bills with friends</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-500 shadow-md shadow-emerald-500/10 transition-all text-sm"
        >
          <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
          <span>New Group</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-650 p-4 rounded-xl flex items-center space-x-2 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Groups List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
          <p className="text-slate-500 text-sm">Loading your groups...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-xl mx-auto mt-10 shadow-sm">
          <Users className="h-14 w-14 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-slate-800">No Groups Found</h3>
          <p className="text-slate-500 text-sm mb-6">
            You don't belong to any splitting groups yet. Create a group to start sharing expenses!
          </p>
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center space-x-1.5 bg-emerald-600 text-white px-4.5 py-2.5 rounded-xl font-bold hover:bg-emerald-500 transition-all text-sm"
          >
            <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
            <span>Create First Group</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsOpen(false);
                setMemberIds([]);
                setSearchQuery('');
                setSearchError('');
                setError('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-2xl font-bold mb-5 flex items-center space-x-2 text-slate-800">
              <Users className="h-6 w-6 text-emerald-600" />
              <span>Create New Group</span>
            </h2>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg flex items-center space-x-2 text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-5">
              {/* Group Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="block w-full rounded-xl bg-white border border-slate-250 text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent px-4 py-2.5 text-sm transition-all shadow-sm"
                  placeholder="e.g. Goa Trip, Flatmates"
                />
              </div>
            </form>

            {/* Member Search Lookup Section */}
            <div className="mt-5 border-t border-slate-100 pt-5">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Invite Members
              </label>
              <form onSubmit={handleAddMember} className="flex space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter email or phone number"
                    className="block w-full rounded-xl bg-white border border-slate-250 text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent pl-10 pr-4 py-2.5 text-sm transition-all shadow-sm"
                  />
                  <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                </div>
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all flex items-center justify-center"
                >
                  {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                </button>
              </form>

              {searchError && (
                <p className="text-red-650 text-xs mt-1.5 flex items-center space-x-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{searchError}</span>
                </p>
              )}

              {/* Members List Box */}
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Group Members</p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {/* Current User Default Display */}
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-150 px-3.5 py-2 rounded-xl text-sm text-slate-700">
                    <span className="font-semibold">{user.name} (You)</span>
                    <span className="text-xs text-slate-450 font-semibold uppercase">Creator</span>
                  </div>

                  {/* Other Added Members */}
                  {memberIds.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between bg-slate-50 border border-slate-150 px-3.5 py-2 rounded-xl text-sm text-slate-700 hover:border-slate-250 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-slate-400 hover:text-red-650 p-1 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="mt-6 flex justify-end space-x-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setMemberIds([]);
                  setGroupName('');
                  setSearchQuery('');
                  setSearchError('');
                  setError('');
                }}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
