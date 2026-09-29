const fs = require('fs');
const path = '/home/gauransh-arora/Projects/CATFOOD/frontend/src/pages/OrganizerEventDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const importReplacement = `import { Calendar, Trash2, Edit } from 'lucide-react';`;
content = content.replace(`import { Calendar } from 'lucide-react';`, importReplacement);

const deleteHandlers = `
  const handleDeleteCriterion = async (criterionId) => {
    try {
      await api.deleteCriterion(id, criterionId);
      showNotification('success', 'Criterion deleted!');
      await fetchEventDetails();
    } catch (err) {
      showNotification('error', err.message || 'Failed to delete criterion.');
    }
  };

  const handleDeletePrize = async (prizeId) => {
    try {
      await api.deletePrize(id, prizeId);
      showNotification('success', 'Prize deleted!');
      await fetchEventDetails();
    } catch (err) {
      showNotification('error', err.message || 'Failed to delete prize.');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    try {
      await api.deleteEventQuestion(id, questionId);
      showNotification('success', 'Question deleted!');
      await fetchEventDetails();
    } catch (err) {
      showNotification('error', err.message || 'Failed to delete question.');
    }
  };
`;

content = content.replace(
  `  const handleAddCriterion = async (e) => {`,
  deleteHandlers + `\n  const handleAddCriterion = async (e) => {`
);

const critUIRegex = /\{event\.criteria\?\.map\(\(c\) => \([\s\S]*?\}\)\}/m;
const newCritUI = `{event.criteria?.map((c) => (
                <div key={c.id} className="p-4 bg-white rounded-xl border-3 border-neo-ink flex items-center justify-between neo-shadow-sm">
                  <div>
                    <h4 className="font-black text-lg text-neo-ink">{c.name}</h4>
                    {c.description && <p className="text-xs font-bold text-neo-ink/70">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-xs px-2.5 py-1 bg-neo-pastel-yellow border border-neo-ink rounded-lg">
                      Max: {c.maxScore} pts
                    </span>
                    <span className="font-black text-xs px-2.5 py-1 bg-neo-pastel-green border border-neo-ink rounded-lg">
                      Weight: {c.weight}x
                    </span>
                    <button onClick={() => handleDeleteCriterion(c.id)} className="p-1.5 bg-neo-pastel-pink border-2 border-neo-ink rounded-lg hover:neo-active text-neo-ink">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}`;
content = content.replace(critUIRegex, newCritUI);

const prizeUIRegex = /\{event\.prizes\?\.map\(\(p\) => \([\s\S]*?\}\)\}/m;
const newPrizeUI = `{event.prizes?.map((p) => (
                <div key={p.id} className="p-4 bg-white rounded-xl border-3 border-neo-ink flex items-center justify-between neo-shadow-sm">
                  <div>
                    <h4 className="font-black text-lg text-neo-ink">{p.name}</h4>
                    {p.description && <p className="text-xs font-bold text-neo-ink/70">{p.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {p.amount && (
                      <span className="font-black text-sm px-3 py-1 bg-neo-pastel-green border-2 border-neo-ink rounded-full">
                        ${p.amount}
                      </span>
                    )}
                    <button onClick={() => handleDeletePrize(p.id)} className="p-1.5 bg-neo-pastel-pink border-2 border-neo-ink rounded-lg hover:neo-active text-neo-ink">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}`;
content = content.replace(prizeUIRegex, newPrizeUI);

const qUIRegex = /\{event\.questions\?\.map\(\(q\) => \([\s\S]*?\}\)\}/m;
const newQUI = `{event.questions?.map((q) => (
                <div key={q.id} className="p-4 bg-white rounded-xl border-3 border-neo-ink flex items-center justify-between neo-shadow-sm">
                  <div>
                    <h4 className="font-black text-lg text-neo-ink">{q.question}</h4>
                    {q.isRequired && <span className="text-[10px] font-black bg-neo-pastel-pink px-2 py-0.5 rounded-full border border-neo-ink uppercase ml-2">Required</span>}
                  </div>
                  <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 bg-neo-pastel-pink border-2 border-neo-ink rounded-lg hover:neo-active text-neo-ink">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}`;
content = content.replace(qUIRegex, newQUI);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched');
