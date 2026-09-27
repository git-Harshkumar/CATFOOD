export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getTimeRemaining = (deadline) => {
  const total = Date.parse(deadline) - Date.now();
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return {
    total,
    days,
    hours,
    minutes,
    seconds,
    isExpired: total <= 0,
  };
};

export const getRoleBadge = (role) => {
  switch (role) {
    case 'ORGANIZER':
      return { label: 'Organizer', bg: 'bg-purple-950/70', text: 'text-purple-400', border: 'border-purple-800' };
    case 'JUDGE':
      return { label: 'Judge', bg: 'bg-emerald-950/70', text: 'text-emerald-400', border: 'border-emerald-800' };
    case 'PARTICIPANT':
    default:
      return { label: 'Participant', bg: 'bg-indigo-950/70', text: 'text-indigo-400', border: 'border-indigo-800' };
  }
};

export const getStatusBadge = (status) => {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'JUDGING':
      return { label: 'Judging in Progress', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 'COMPLETED':
      return { label: 'Concluded', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' };
    case 'DRAFT':
    default:
      return { label: 'Draft', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' };
  }
};
