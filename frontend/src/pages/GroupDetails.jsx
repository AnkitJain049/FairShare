import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ArrowLeft, Plus, DollarSign, Calendar, Info,
  Loader2, AlertCircle, Check, X, Trash2, Edit
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import RenameGroupModal from '../components/RenameGroupModal';
import ExpenseCard from '../components/ExpenseCard';
import BalanceSummary from '../components/BalanceSummary';
import SimplifySettlements from '../components/SimplifySettlements';
import SettlePaymentModal from '../components/SettlePaymentModal';

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

  // Payment / Settlement States
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settlePayerId, setSettlePayerId] = useState('');
  const [settleReceiverId, setSettleReceiverId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleExpenseId, setSettleExpenseId] = useState('');
  const [activeTab, setActiveTab] = useState('balances'); // 'balances', 'expenses', or 'settlements'
  const [toastMessage, setToastMessage] = useState('');

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
            api.users.getUserById(id).catch(() => ({ id, name: `User (${id.substring(0, 6)}...)` }))
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

  const fetchPayments = async () => {
    try {
      setPaymentsLoading(true);
      const data = await api.payments.getGroupPayments(groupId);
      setPayments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleApprovePayment = async (paymentId) => {
    try {
      await api.payments.approvePayment(paymentId);
      showToast('Payment confirmed successfully!');
      fetchBalancesAndSimplification();
      fetchPayments();
      fetchExpenses(currentPage);
    } catch (err) {
      showToast(err.message || 'Failed to approve payment.');
    }
  };

  const handleRejectPayment = async (paymentId) => {
    try {
      await api.payments.rejectPayment(paymentId);
      showToast('Payment rejected.');
      fetchBalancesAndSimplification();
      fetchPayments();
      fetchExpenses(currentPage);
    } catch (err) {
      showToast(err.message || 'Failed to reject payment.');
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const handleSettleClick = (payerId, receiverId, amount = null) => {
    setSettlePayerId(payerId);
    setSettleReceiverId(receiverId);
    setSettleAmount(amount ? amount : '');
    setSettleExpenseId('');
    setIsSettleModalOpen(true);
  };

  const handleSettleExpenseShare = (receiverId, amount, expenseId) => {
    setSettlePayerId(currentUser.id);
    setSettleReceiverId(receiverId);
    setSettleAmount(amount);
    setSettleExpenseId(expenseId);
    setIsSettleModalOpen(true);
  };

  const handleSettleSuccess = (message) => {
    setIsSettleModalOpen(false);
    showToast(message);
    fetchBalancesAndSimplification();
    fetchPayments();
    fetchExpenses(currentPage);
  };

  useEffect(() => {
    if (group) {
      fetchExpenses(0);
      fetchBalancesAndSimplification();
      fetchPayments();
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
            onClick={() => handleSettleClick('', '')}
            className="flex items-center justify-center space-x-1.5 bg-white border border-emerald-600 text-emerald-650 hover:bg-emerald-50 px-4.5 py-2.5 rounded-xl font-bold transition-all text-sm shadow-sm cursor-pointer"
          >
            <span>Settle Up</span>
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
            className="flex items-center justify-center space-x-1.5 bg-emerald-600 text-white px-4.5 py-2.5 rounded-xl font-bold hover:bg-emerald-500 shadow-md shadow-emerald-500/10 transition-all text-sm cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Pending Confirmations Section */}
      {payments.some(p => p.receiverId === currentUser?.id && p.status === 'AWAITING_APPROVAL') && (
        <div className="mb-8 bg-amber-50/50 border border-amber-250 rounded-2xl p-5 shadow-sm animate-fade-in">
          <h3 className="text-sm font-extrabold text-amber-800 flex items-center space-x-2 mb-3">
            <AlertCircle className="h-4.5 w-4.5" />
            <span>Payments Awaiting Your Confirmation</span>
          </h3>
          <div className="space-y-3">
            {payments.filter(p => p.receiverId === currentUser?.id && p.status === 'AWAITING_APPROVAL').map(p => (
              <div key={p.id} className="bg-white border border-amber-200/60 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm shadow-sm">
                <div>
                  <span className="font-bold text-slate-800">{membersMap[p.payerId]?.name || 'Someone'}</span>
                  <span className="text-slate-600"> claims they settled </span>
                  <span className="font-extrabold text-emerald-650">₹{p.amount.toFixed(2)}</span>
                  <span className="text-slate-600"> via </span>
                  <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-xs text-slate-700 rounded font-semibold uppercase">{p.paymentMethod}</span>
                  {p.relatedExpenseId && (
                    <span className="text-slate-400 text-xs block mt-1 font-semibold">
                      For expense: {expenses.find(e => e.id === p.relatedExpenseId)?.description || 'Linked Expense'}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2.5 self-end sm:self-center">
                  <button
                    onClick={() => handleRejectPayment(p.id)}
                    className="px-3.5 py-2 border border-red-200 text-red-650 hover:bg-red-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprovePayment(p.id)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
                  >
                    Confirm Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 mb-8 mt-2">
        <button
          onClick={() => setActiveTab('balances')}
          className={`pb-3 font-bold text-sm tracking-wide transition-all border-b-2 px-1 cursor-pointer ${activeTab === 'balances'
              ? 'border-emerald-600 text-emerald-650'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Balance Sheet
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`ml-8 pb-3 font-bold text-sm tracking-wide transition-all border-b-2 px-1 cursor-pointer ${activeTab === 'expenses'
              ? 'border-emerald-600 text-emerald-650'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('settlements')}
          className={`ml-8 pb-3 font-bold text-sm tracking-wide transition-all border-b-2 px-1 cursor-pointer ${activeTab === 'settlements'
              ? 'border-emerald-600 text-emerald-650'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          Settlements
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'expenses' && (
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
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  membersMap={membersMap}
                  onEdit={openEditExpenseModal}
                  onDelete={handleDeleteExpenseClick}
                  currentUser={currentUser}
                  payments={payments}
                  allExpenses={expenses}
                  onSettleExpenseShare={handleSettleExpenseShare}
                />
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center pt-4 border-t border-slate-150">
                  <button
                    disabled={currentPage === 0}
                    onClick={() => fetchExpenses(currentPage - 1)}
                    className="text-xs px-3.5 py-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-slate-700 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-500 font-semibold">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages - 1}
                    onClick={() => fetchExpenses(currentPage + 1)}
                    className="text-xs px-3.5 py-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-slate-700 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settlements' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-5 text-slate-850">Payment History</h2>
          {paymentsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-250 rounded-xl bg-slate-50/20">
              <Info className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No payment settlements logged yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...payments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((pay) => {
                const isPayer = pay.payerId === currentUser?.id;
                const isReceiver = pay.receiverId === currentUser?.id;
                const payerName = isPayer ? 'You' : (membersMap[pay.payerId]?.name || 'Unknown');
                const receiverName = isReceiver ? 'You' : (membersMap[pay.receiverId]?.name || 'Unknown');
                const dateStr = new Date(pay.createdAt).toLocaleDateString();

                return (
                  <div key={pay.id} className="bg-slate-50/70 border border-slate-200 p-4.5 rounded-xl flex items-center justify-between hover:border-slate-300 transition-colors shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800">{payerName}</span>
                        <span className="text-slate-500 text-xs font-semibold">settled with</span>
                        <span className="font-bold text-slate-800">{receiverName}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center space-x-4">
                        <span>Via <span className="font-semibold text-slate-700 uppercase">{pay.paymentMethod}</span></span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{dateStr}</span>
                        </span>
                        {pay.relatedExpenseId && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400 text-xs font-semibold">
                              For: {expenses.find(e => e.id === pay.relatedExpenseId)?.description || 'Linked Expense'}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-base font-extrabold text-emerald-605 font-mono">₹{pay.amount.toFixed(2)}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border mt-1 shadow-sm uppercase tracking-wide ${pay.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-755 border-emerald-100'
                          : pay.status === 'AWAITING_APPROVAL'
                            ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                            : pay.status === 'REJECTED'
                              ? 'bg-red-50 text-red-750 border-red-100'
                              : 'bg-slate-100 text-slate-650 border-slate-250'
                        }`}>
                        {pay.status === 'COMPLETED' ? 'Settled' : pay.status === 'AWAITING_APPROVAL' ? 'Pending' : pay.status === 'REJECTED' ? 'Rejected' : pay.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <BalanceSummary
              balances={balances}
              currentUser={currentUser}
              membersMap={membersMap}
            />
          </div>
          <div className="lg:col-span-2">
            <SimplifySettlements
              simplifiedDebts={simplifiedDebts}
              membersMap={membersMap}
              loading={simplifyLoading}
              currentUser={currentUser}
              onSettleClick={handleSettleClick}
              payments={payments}
            />
          </div>
        </div>
      )}

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

      <RenameGroupModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        onSubmit={handleRenameGroup}
        initialName={group.name}
      />

      <ConfirmModal
        isOpen={isDeleteGroupModalOpen}
        onClose={() => setIsDeleteGroupModalOpen(false)}
        onConfirm={handleDeleteGroup}
        title="Delete Group?"
        message={`Are you sure you want to delete "${group.name}"? This action is permanent and will delete all transaction records and balance sheets for this group.`}
      />

      <ConfirmModal
        isOpen={isDeleteExpenseModalOpen}
        onClose={() => {
          setIsDeleteExpenseModalOpen(false);
          setExpenseToDelete(null);
        }}
        onConfirm={confirmDeleteExpense}
        title="Delete Expense?"
        message={expenseToDelete ? `Are you sure you want to delete "${expenseToDelete.description}" of ₹${expenseToDelete.totalAmount.toFixed(2)}? This will automatically recalculate everyone's balances and simplify settlements.` : ''}
      />

      <SettlePaymentModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        group={group}
        currentUser={currentUser}
        membersMap={membersMap}
        prefilledReceiverId={settleReceiverId}
        prefilledAmount={settleAmount}
        prefilledExpenseId={settleExpenseId}
        expenses={expenses}
        onSuccess={handleSettleSuccess}
      />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-850 text-white px-5 py-3 rounded-xl shadow-xl flex items-center space-x-2.5 text-sm font-semibold border border-slate-700/80 animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
