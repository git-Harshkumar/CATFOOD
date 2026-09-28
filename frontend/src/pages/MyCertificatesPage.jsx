import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import { Award, ShieldCheck, Copy, Check, ExternalLink, Calendar, Key } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const MyCertificatesPage = () => {
  const navigate = useNavigate();
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await api.getMyCertificates();
      const list = Array.isArray(res) ? res : res?.data || [];
      setCerts(list);
    } catch (err) {
      console.error('Failed to load certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-10 pb-20 pt-6">
      {/* Header */}
      <div className="border-b-3 border-neo-ink pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl md:text-6xl font-black text-neo-ink tracking-tight mb-2">
            My Verifiable Credentials
          </h1>
          <p className="text-xl font-bold text-neo-ink/70">
            Cryptographically signed proof of judging, participation, and hackathon awards.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center font-bold text-2xl text-neo-ink/50">
          Loading credentials...
        </div>
      ) : certs.length === 0 ? (
        <NeoCard color="bg-white" className="text-center py-20 flex flex-col items-center justify-center">
          <Award className="w-16 h-16 text-neo-ink mb-6" />
          <h3 className="text-3xl font-black text-neo-ink mb-2">No Certificates Issued Yet</h3>
          <p className="font-bold text-neo-ink/60 max-w-md mb-6">
            When you complete a hackathon or finish evaluation rounds as an appointed judge, the event organizer will issue your official cryptographic certificate here.
          </p>
          <NeoButton onClick={() => navigate('/events')} color="bg-neo-pastel-green" textColor="text-neo-ink">
            Browse Active Hackathons
          </NeoButton>
        </NeoCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {certs.map((c) => {
            const roleBg =
              c.role === 'WINNER'
                ? 'bg-neo-pastel-yellow'
                : c.role === 'JUDGE'
                ? 'bg-neo-pastel-purple'
                : 'bg-neo-pastel-green';

            return (
              <NeoCard
                key={c.id}
                color="bg-white"
                className="flex flex-col justify-between p-6 space-y-6 hover:-translate-y-1 transition-transform border-4"
              >
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 border-b-2 border-neo-ink pb-3">
                    <span
                      className={`text-xs font-black uppercase px-3 py-1 rounded-full border-2 border-neo-ink neo-shadow-sm ${roleBg}`}
                    >
                      {c.role} Credential
                    </span>
                    <span className="flex items-center gap-1 text-xs font-black text-green-700 bg-green-50 border border-green-700 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5" /> Cryptographically Signed
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-neo-ink leading-tight">
                      {c.event?.title || 'Hackathon Event'}
                    </h3>
                    <p className="font-bold text-sm text-neo-ink/70 mt-1">
                      Recipient: <strong className="text-neo-ink">{c.recipientName}</strong>
                    </p>
                  </div>

                  {/* Certificate ID Pill */}
                  <div className="p-3 bg-neo-bg rounded-xl border-2 border-neo-ink flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-neo-ink/60 block">
                        Certificate ID
                      </span>
                      <span className="font-mono font-bold text-xs text-neo-ink break-all">
                        {c.id}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(c.id, c.id)}
                      className="p-2 rounded-lg bg-white border border-neo-ink hover:neo-active shrink-0 ml-2"
                      title="Copy ID"
                    >
                      {copiedId === c.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-neo-ink" />
                      )}
                    </button>
                  </div>

                  {/* Signature preview */}
                  <div className="text-[11px] font-mono text-neo-ink/60 truncate flex items-center gap-1">
                    <Key className="w-3 h-3 shrink-0" />
                    <span>Sig: {c.signature}</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-neo-ink/60">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Issued on {formatDate(c.issuedAt)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t-3 border-neo-ink flex items-center justify-between">
                  <NeoButton
                    onClick={() => navigate(`/certificates/verify/${c.id}`)}
                    color="bg-neo-ink"
                    textColor="text-white"
                    className="w-full justify-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Verify Publicly
                  </NeoButton>
                </div>
              </NeoCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
