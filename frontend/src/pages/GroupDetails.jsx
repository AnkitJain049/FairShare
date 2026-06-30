import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  ArrowLeft, Plus, DollarSign, Calendar, Info, 
  TrendingDown, TrendingUp, Sparkles, Loader2, AlertCircle, Check, X,
  Trash2, Edit
} from 'lucide-react';

export default function GroupDetails() {
  const { groupId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Group editing / deletion states
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false);
  
  // Expense editing/deleting states
  const [isEditingExpense, setIsEditingExpense] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState(null);
  const [isDeleteExpenseModalOpen, setIsDeleteExpenseModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  
  // Group, Members and loading states
  const [group, setGroup] = useState(null);
  const [membersMap, setMembersMap] = useState({}); // id -> user object
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Expenses states
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Balances & Debt simplification states
  const [balances, setBalances] = useState(null);
  const [simplifiedDebts, setSimplifiedDebts] = useState([]);
  const [algo, setAlgo] = useState('GREEDY'); // GREEDY or DFS
  const [simplifyLoading, setSimplifyLoading] = useState(false);

  // Add Expense Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUser.id);
  const [splitType, setSplitType] = useState('EQUAL');
  const [splitDetails, setSplitDetails] = useState([]); // Array of { userId, owedAmount, percentage }
  const [modalError, setModalError] = useState('');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Fetch initial group and load members details
  useEffect(() => {
    const loadGroupAndMembers = async () => {
      try {
        setLoading(true);
        const groupData = await api.groups.getGroupById(groupId);
        setGroup(groupData);

        // Fetch user profiles for all members in parallel
        const memberProfiles = await Promise.all(
          groupData.memberIds.map(id => 
            api.users.getUserById(id).catch(() => ({ id, name: `User (${id.substring(0,6)}...)` }))
          )
        );

        const tempMap = {};
        memberProfiles.forEach(p => {
          tempMap[p.id] = p;
        });
        setMembersMap(tempMap);

        // Prepopulate splitDetails with all members
        setSplitDetails(groupData.memberIds.map(id => ({
          userId: id,
          owedAmount: '',
          percentage: ''
        })));
        
        setPaidBy(currentUser.id);
      } catch (err) {
        setError('Failed to fetch group details.');
      } finally {
        setLoading(false);
      }
    };

    if (groupId) {
      loadGroupAndMembers();
    }
  }, [groupId]);

  // Fetch expenses, balances, and simplified debts
  const fetchExpenses = async (page = 0) => {
    try {
      setExpensesLoading(true);
      const data = await api.expenses.getGroupExpenses(groupId, page, 10);
      setExpenses(data.content || []);
      setTotalPages(data.totalPages || 0);
      setCurrentPage(page);
    } catch (err) {
      console.error(err);
    } finally {
      setExpensesLoading(false);
    }
  };

  const fetchBalancesAndSimplification = async () => {
    try {
      setSimplifyLoading(true);
      const balanceSheet = await api.balances.getGroupBalances(groupId, currentUser.id);
      setBalances(balanceSheet);

      const debts = await api.balances.simplifyGroupDebts(groupId, algo);
      setSimplifiedDebts(debts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSimplifyLoading(false);
    }
  };

  useEffect(() => {
    if (group) {
      fetchExpenses(0);
      fetchBalancesAndSimplification();
    }
  }, [group, algo]);

  // Split details value handlers
  const handleSplitValueChange = (userId, field, val) => {
    setSplitDetails(prev => 
      prev.map(item => 
        item.userId === userId 
          ? { ...item, [field]: val } 
          : item
      )
    );
  };

  const handleDeleteGroup = async () => {
    try {
      await api.groups.deleteGroup(groupId);
      navigate('/');
    } catch (err) {
      alert(err.message || 'Failed to delete group.');
    }
  };

  const handleRenameGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const updated = await api.groups.updateGroupName(groupId, newGroupName.trim());
      setGroup(prev => ({ ...prev, name: updated.name }));
      setIsRenameModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to update group name.');
    }
  };

  const handleDeleteExpenseClick = (expense) => {
    setExpenseToDelete(expense);
    setIsDeleteExpenseModalOpen(true);
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await api.expenses.deleteExpense(expenseToDelete.id);
      fetchExpenses(currentPage);
      fetchBalancesAndSimplification();
      setIsDeleteExpenseModalOpen(false);
      setExpenseToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to delete expense.');
    }
  };

  const openEditExpenseModal = (expense) => {
    setIsEditingExpense(true);
    setEditExpenseId(expense.id);
    setDescription(expense.description);
    setTotalAmount(expense.totalAmount.toString());
    setPaidBy(expense.paidById);
    setSplitType(expense.splitType);
    
    // Load split details
    const loadedDetails = group.memberIds.map(id => {
      const expSplit = expense.splitDetails.find(s => s.userId === id);
      return {
        userId: id,
        owedAmount: expSplit && expSplit.owedAmount ? expSplit.owedAmount.toString() : '',
        percentage: expSplit && expSplit.percentage ? expSplit.percentage.toString() : ''
      };
    });
    setSplitDetails(loadedDetails);
    
    setIsModalOpen(true);
  };

  // Submit expense entry
  const handleAddExpense = async (e) => {
    e.preventDefault();
    setModalError('');
    
    if (!description.trim()) {
      setModalError('Description is required.');
      return;
    }
    const amountVal = parseFloat(totalAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setModalError('Please enter a valid positive amount.');
      return;
    }

    // Split details formatting and validations
    let formattedSplitDetails = [];

    if (splitType === 'EQUAL') {
      // Equal split: only need member IDs in details
      formattedSplitDetails = splitDetails.map(item => ({
        userId: item.userId
      }));
    } else if (splitType === 'EXACT') {
      let sum = 0;
      for (const item of splitDetails) {
        const itemAmount = parseFloat(item.owedAmount);
        if (isNaN(itemAmount) || itemAmount < 0) {
          setModalError(`Please enter a valid amount for all members.`);
          return;
        }
        sum += itemAmount;
        formattedSplitDetails.push({
          userId: item.userId,
          owedAmount: itemAmount
        });
      }
      
      // Check if exact split equals total amount (rounding to 2 decimals)
      if (Math.abs(sum - amountVal) > 0.01) {
        setModalError(`Total splits (₹${sum.toFixed(2)}) must equal total amount (₹${amountVal.toFixed(2)}).`);
        return;
      }
    } else if (splitType === 'PERCENTAGE') {
      let sumPct = 0;
      for (const item of splitDetails) {
        const itemPct = parseFloat(item.percentage);
        if (isNaN(itemPct) || itemPct < 0) {
          setModalError(`Please enter a valid percentage for all members.`);
          return;
        }
        sumPct += itemPct;
        formattedSplitDetails.push({
          userId: item.userId,
          percentage: itemPct
        });
      }

      if (Math.abs(sumPct - 100) > 0.01) {
        setModalError(`Percentages must add up to exactly 100% (currently ${sumPct}%).`);
        return;
      }
    }

    try {
      setSubmittingExpense(true);
      if (isEditingExpense) {
        await api.expenses.updateExpense(
          editExpenseId,
          description,
          amountVal,
          paidBy,
          splitType,
          formattedSplitDetails
        );
      } else {
        await api.expenses.createExpense(
          groupId,
          description,
          amountVal,
          paidBy,
          splitType,
          formattedSplitDetails
        );
      }

      // Reset Modal & Refresh Data
      setDescription('');
      setTotalAmount('');
      setSplitDetails(group.memberIds.map(id => ({
        userId: id,
        owedAmount: '',
        percentage: ''
      })));
      setPaidBy(currentUser.id);
      setSplitType('EQUAL');
      setIsEditingExpense(false);
      setEditExpenseId(null);
      setIsModalOpen(false);
      
      fetchExpenses(0);
      fetchBalancesAndSimplification();
    } catch (err) {
      setModalError(err.message || 'Failed to add expense.');
    } finally {
      setSubmittingExpense(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-800">
        <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-slate-500 text-sm font-medium">Loading group data...</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center text-slate-800">
        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold">Error Loading Group</h3>
        <p className="text-slate-500 text-sm mt-2">{error || 'Group not found.'}</p>
        <Link to="/" className="inline-flex items-center space-x-1 text-emerald-600 hover:underline mt-6 font-semibold">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-850">
      {/* Back Button */}
      <Link to="/" className="inline-flex items-center space-x-1.5 text-slate-500 hover:text-slate-800 transition-colors mb-6 text-sm font-semibold">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Dashboard</span>
      </Link>

      {/* Group Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 flex-wrap">
            <h1 className="text-3xl font-extrabold tracking-tight mt-2 truncate text-slate-800">{group.name}</h1>
            <button
              onClick={() => {
                setNewGroupName(group.name);
                setIsRenameModalOpen(true);
              }}
              className="mt-2.5 p-1.5 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-lg text-slate-500 hover:text-slate-800 transition-all shadow-sm"
              title="Edit Group Name"
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-semibold">
            Group ID: {group.id} • Created {new Date(group.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start md:self-center">
          <button
            onClick={() => setIsDeleteGroupModalOpen(true)}
            className="flex items-center justify-center p-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 rounded-xl transition-all shadow-sm"
            title="Delete Group"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>

          <button
            onClick={() => {
              setIsEditingExpense(false);
              setEditExpenseId(null);
              setDescription('');
              setTotalAmount('');
              setSplitType('EQUAL');
              setPaidBy(currentUser.id);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center space-x-1.5 bg-emerald-600 text-white px-4.5 py-2.5 rounded-xl font-bold hover:bg-emerald-500 shadow-md shadow-emerald-500/10 transition-all text-sm"
          >
            <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Expense List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-5 text-slate-850">Expense History</h2>
            
            {expensesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-250 rounded-xl bg-slate-50/20">
                <Info className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No expenses logged yet in this group.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <div 
                    key={expense.id} 
                    className="bg-slate-50/70 border border-slate-200 p-4.5 rounded-xl flex items-center justify-between hover:border-slate-350 transition-colors group/item shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-bold text-slate-800">{expense.description}</h4>
                        <div className="flex items-center space-x-2 text-slate-400">
                          <button
                            onClick={() => openEditExpenseModal(expense)}
                            className="p-1 hover:text-emerald-600 rounded transition-colors"
                            title="Edit Expense"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpenseClick(expense)}
                            className="p-1 hover:text-red-600 rounded transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center space-x-4">
                        <span>Paid by <span className="text-slate-700 font-semibold">{membersMap[expense.paidById]?.name || 'Unknown'}</span></span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{new Date(expense.createdAt).toLocaleDateString()}</span>
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600">₹{expense.totalAmount.toFixed(2)}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-500 uppercase tracking-wide shadow-sm">
                        {expense.splitType}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center pt-4 border-t border-slate-150">
                    <button
                      disabled={currentPage === 0}
                      onClick={() => fetchExpenses(currentPage - 1)}
                      className="text-xs px-3.5 py-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-slate-700"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-500 font-semibold">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages - 1}
                      onClick={() => fetchExpenses(currentPage + 1)}
                      className="text-xs px-3.5 py-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-slate-700"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Balances & Debt Simplification */}
        <div className="space-y-8">
          {/* 1. Balance Summary Card */}
          {balances && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-5 text-slate-850">Your Balance Summary</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-center shadow-sm">
                  <div className="flex items-center space-x-1 text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>You are owed</span>
                  </div>
                  <p className="text-2xl font-black text-emerald-600">₹{balances.totalYouAreOwed.toFixed(2)}</p>
                </div>
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-center shadow-sm">
                  <div className="flex items-center space-x-1 text-xs text-rose-600 font-semibold uppercase tracking-wider mb-1">
                    <TrendingDown className="h-4 w-4" />
                    <span>You owe</span>
                  </div>
                  <p className="text-2xl font-black text-rose-600">₹{balances.totalYouOwe.toFixed(2)}</p>
                </div>
              </div>

              {/* Individual member breakdown */}
              <div>
                <h4 className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-3">Group Balances Breakdown</h4>
                <div className="space-y-3">
                  {Object.entries(balances.userVsBalance).map(([memberId, amt]) => {
                    if (memberId === currentUser.id) return null;
                    const value = parseFloat(amt);
                    const name = membersMap[memberId]?.name || 'Unknown';
                    
                    return (
                      <div key={memberId} className="flex justify-between items-center text-sm bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                        <span className="font-semibold text-slate-750">{name}</span>
                        {value > 0 ? (
                          <span className="text-emerald-600 font-bold text-xs">owes you ₹{value.toFixed(2)}</span>
                        ) : value < 0 ? (
                          <span className="text-rose-600 font-bold text-xs">you owe ₹{Math.abs(value).toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-500 font-bold text-xs">settled</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. Debt Simplification Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold flex items-center space-x-1.5 text-slate-850">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                <span>Simplify Settlements</span>
              </h2>
            </div>

            {simplifyLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
              </div>
            ) : simplifiedDebts.length === 0 ? (
              <p className="text-center py-6 text-slate-500 text-sm font-semibold">All balances are completely settled!</p>
            ) : (
              <div className="space-y-3">
                {simplifiedDebts.map((debt, index) => (
                  <div 
                    key={index}
                    className="bg-slate-50/70 border border-slate-200 p-3.5 rounded-xl text-sm flex flex-col justify-center space-y-1.5 shadow-sm"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-800">
                        {membersMap[debt.fromUserId]?.name || 'Unknown'}
                      </span>
                      <span className="text-slate-500 text-xs px-2 py-0.5 bg-white border border-slate-200 rounded shadow-sm">
                        owes
                      </span>
                      <span className="font-semibold text-slate-800">
                        {membersMap[debt.toUserId]?.name || 'Unknown'}
                      </span>
                    </div>
                    <div className="border-t border-slate-100 pt-1.5 flex justify-end">
                      <span className="text-emerald-600 font-extrabold text-base">₹{debt.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADD EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setDescription('');
                setTotalAmount('');
                setSplitType('EQUAL');
                setModalError('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-2xl font-bold mb-5 flex items-center space-x-2 text-slate-850">
              <DollarSign className="h-6 w-6 text-emerald-600" />
              <span>Log Group Expense</span>
            </h2>

            {modalError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg flex items-center space-x-2 text-sm shadow-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-4">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full rounded-xl bg-white border border-slate-250 text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent px-4 py-2 text-sm transition-all shadow-sm"
                  placeholder="e.g. Dinner, Taxi, Groceries"
                />
              </div>

              {/* Total Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="block w-full rounded-xl bg-white border border-slate-250 text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent px-4 py-2 text-sm transition-all shadow-sm"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Paid By */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Paid By</label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="block w-full rounded-xl bg-white border border-slate-250 text-slate-850 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent px-4 py-2.5 text-sm transition-all shadow-sm"
                  >
                    {group.memberIds.map(id => (
                      <option key={id} value={id}>
                        {membersMap[id]?.name || 'Unknown'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Split Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Split Strategy</label>
                  <select
                    value={splitType}
                    onChange={(e) => setSplitType(e.target.value)}
                    className="block w-full rounded-xl bg-white border border-slate-250 text-slate-850 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent px-4 py-2.5 text-sm transition-all shadow-sm"
                  >
                    <option value="EQUAL">⚖️ Split Equally</option>
                    <option value="EXACT">💵 Split Exactly</option>
                    <option value="PERCENTAGE">📊 Split %</option>
                  </select>
                </div>
              </div>

              {/* SPLIT BREAKDOWN INPUTS PANEL */}
              {splitType !== 'EQUAL' && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    {splitType === 'EXACT' ? 'Enter Exact Share Amounts' : 'Enter Share Percentages'}
                  </p>
                  
                  <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
                    {splitDetails.map((item) => (
                      <div key={item.userId} className="flex justify-between items-center bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm text-slate-750">
                        <span className="font-semibold text-slate-850">
                          {membersMap[item.userId]?.name || 'Unknown'}
                        </span>
                        
                        <div className="flex items-center space-x-1.5 w-1/3">
                          {splitType === 'EXACT' ? (
                            <>
                              <span className="text-slate-500 text-xs">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={item.owedAmount}
                                onChange={(e) => handleSplitValueChange(item.userId, 'owedAmount', e.target.value)}
                                className="block w-full rounded-lg bg-white border border-slate-200 text-slate-800 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent px-2.5 py-1 text-xs shadow-sm"
                                placeholder="0.00"
                              />
                            </>
                          ) : (
                            <>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                required
                                value={item.percentage}
                                onChange={(e) => handleSplitValueChange(item.userId, 'percentage', e.target.value)}
                                className="block w-full rounded-lg bg-white border border-slate-200 text-slate-800 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent px-2.5 py-1 text-xs shadow-sm"
                                placeholder="0"
                              />
                              <span className="text-slate-500 text-xs">%</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="mt-6 flex justify-end space-x-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setDescription('');
                    setTotalAmount('');
                    setSplitType('EQUAL');
                    setModalError('');
                  }}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all flex items-center justify-center space-x-1"
                >
                  {submittingExpense ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Logging...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 stroke-[2.5]" />
                      <span>Log Expense</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT GROUP NAME MODAL */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsRenameModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-2xl font-bold mb-5 flex items-center space-x-2 text-slate-800">
              <Edit className="h-6 w-6 text-emerald-600" />
              <span>Rename Group</span>
            </h2>

            <form onSubmit={handleRenameGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-750 mb-1.5">New Group Name</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="block w-full rounded-xl bg-white border border-slate-250 text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent px-4 py-2.5 text-sm transition-all shadow-sm"
                  placeholder="e.g. Goa Trip 2026"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsRenameModalOpen(false)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE GROUP CONFIRMATION MODAL */}
      {isDeleteGroupModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsDeleteGroupModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold mb-3 text-red-600 flex items-center space-x-2">
              <AlertCircle className="h-6 w-6" />
              <span>Delete Group?</span>
            </h2>

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-800">"{group.name}"</span>? 
              This action is permanent and will delete all transaction records and balance sheets for this group.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsDeleteGroupModalOpen(false)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
                className="bg-red-700 hover:bg-red-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-red-200"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE EXPENSE CONFIRMATION MODAL */}
      {isDeleteExpenseModalOpen && expenseToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => {
                setIsDeleteExpenseModalOpen(false);
                setExpenseToDelete(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold mb-3 text-red-600 flex items-center space-x-2">
              <AlertCircle className="h-6 w-6" />
              <span>Delete Expense?</span>
            </h2>

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-800">"{expenseToDelete.description}"</span> of <span className="font-bold text-slate-800">₹{expenseToDelete.totalAmount.toFixed(2)}</span>? 
              This will automatically recalculate everyone's balances and simplify settlements.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteExpenseModalOpen(false);
                  setExpenseToDelete(null);
                }}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExpense}
                className="bg-red-700 hover:bg-red-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-red-200"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
