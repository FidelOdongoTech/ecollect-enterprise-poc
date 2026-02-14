import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { addNote } from '../services/dataService';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded: () => void;
}

export function AddAccountModal({ isOpen, onClose, onAccountAdded }: AddAccountModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    custnumber: '',
    accnumber: '',
    notemade: '',
    owner: '',
    reason: '',
    reasondetails: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await addNote({
        custnumber: formData.custnumber,
        accnumber: formData.accnumber,
        notemade: formData.notemade,
        owner: formData.owner,
        notedate: new Date().toISOString(),
        notesrc: 'Dashboard',
        noteimp: 'N',
        reason: formData.reason,
        reasondetails: formData.reasondetails
      });

      setFormData({
        custnumber: '',
        accnumber: '',
        notemade: '',
        owner: '',
        reason: '',
        reasondetails: ''
      });

      onAccountAdded();
    } catch (err) {
      setError('Failed to add account. Please try again.');
      console.error('Error adding account:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">Add New Account</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">Create a new account with initial note</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[12px] text-red-600 font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                  Customer # <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="custnumber"
                  value={formData.custnumber}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 123456"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                  Account # <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="accnumber"
                  value={formData.accnumber}
                  onChange={handleChange}
                  required
                  placeholder="e.g., ACC001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                Agent / Owner <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="owner"
                value={formData.owner}
                onChange={handleChange}
                required
                placeholder="e.g., jsmith"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                  Reason
                </label>
                <select
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Select...</option>
                  <option value="New Account">New Account</option>
                  <option value="Payment Arrangement">Payment Arrangement</option>
                  <option value="Follow Up">Follow Up</option>
                  <option value="Dispute">Dispute</option>
                  <option value="Promise to Pay">Promise to Pay</option>
                  <option value="Hardship">Hardship</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                  Details
                </label>
                <input
                  type="text"
                  name="reasondetails"
                  value={formData.reasondetails}
                  onChange={handleChange}
                  placeholder="Additional info..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                Initial Note <span className="text-red-500">*</span>
              </label>
              <textarea
                name="notemade"
                value={formData.notemade}
                onChange={handleChange}
                required
                rows={3}
                placeholder="Enter initial note for this account..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-[13px] font-semibold rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Account
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
