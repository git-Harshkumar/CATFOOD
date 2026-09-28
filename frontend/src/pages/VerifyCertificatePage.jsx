import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import NeoCard from '../components/neo/NeoCard';
import NeoButton from '../components/neo/NeoButton';
import { ShieldCheck, ShieldAlert, Award, Search, ArrowLeft, CheckCircle2, Key, Calendar, User, Building } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const VerifyCertificatePage = () => {
  const { id: paramId } = useParams();
  const navigate = useNavigate();

  const [certId, setCertId] = useState(paramId || '');
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (paramId) {
      setCertId(paramId);
      verify(paramId);
    }
  }, [paramId]);

  const verify = async (idToVerify) => {
    if (!idToVerify || !idToVerify.trim()) return;
    setLoading(true);
    setError(null);
    setVerification(null);
    try {
      const res = await api.verifyCertificate(idToVerify.trim());
      // Backend returns either { data: { isValid, ... } } or { isValid, ... }
      const data = res?.data || res;
      setVerification(data);
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to verify credential against central registry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (certId.trim()) {
      navigate(`/certificates/verify/${certId.trim()}`);
      verify(certId.trim());
    }
  };

  const isValid = verification?.isValid === true || verification?.status === 'OFFICIALLY_VERIFIED';

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-10 pb-20 pt-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 font-bold text-neo-ink hover:underline decoration-3 underline-offset-4"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Hackathons
        </button>
        <span className="text-xs font-black uppercase px-3 py-1 bg-white border-2 border-neo-ink rounded-full neo-shadow-sm">
          Cryptographic Verification Portal
        </span>
      </div>

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neo-pastel-purple border-3 border-neo-ink neo-shadow mb-2">
          <ShieldCheck className="w-8 h-8 text-neo-ink" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-neo-ink tracking-tight uppercase">
          Verify Credential
        </h1>
        <p className="text-lg font-bold text-neo-ink/70 max-w-xl mx-auto">
          Authenticate participation, judging, and award certificates cryptographically issued by hackathon organizers.
        </p>
      </div>

      {/* Lookup Bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-neo-ink absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Enter Certificate ID (e.g. CERT-1-DEMO...)"
            value={certId}
            onChange={(e) => setCertId(e.target.value)}
            className="w-full pl-12 pr-4 py-3 font-mono font-bold text-neo-ink bg-white border-3 border-neo-ink rounded-full neo-shadow focus:outline-none focus:neo-active"
            required
          />
        </div>
        <NeoButton type="submit" color="bg-neo-ink" textColor="text-white">
          Verify
        </NeoButton>
      </form>

      {/* Verification Results View */}
      {loading ? (
        <div className="py-20 text-center font-bold text-2xl text-neo-ink/50">
          Running cryptographic signature validation...
        </div>
      ) : error ? (
        <NeoCard color="bg-neo-pastel-pink" className="text-center py-12 space-y-4">
          <ShieldAlert className="w-16 h-16 text-neo-ink mx-auto" />
          <h3 className="text-2xl font-black text-neo-ink uppercase">Verification Failed</h3>
          <p className="font-bold text-neo-ink/80 max-w-md mx-auto">{error}</p>
        </NeoCard>
      ) : verification ? (
        <div className="space-y-6">
          {isValid ? (
            /* Official Credential Certificate Sheet */
            <div className="bg-white border-4 border-neo-ink rounded-3xl p-8 md:p-12 neo-shadow-lg relative overflow-hidden">
              {/* Background watermark icon */}
              <Award className="absolute -right-12 -bottom-12 w-64 h-64 text-neo-bg pointer-events-none" />

              <div className="relative z-10 space-y-8">
                {/* Official Status Stamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-3 border-neo-ink pb-6">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-neo-ink/60 block mb-1">
                      Verification Result
                    </span>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-neo-pastel-green border-3 border-neo-ink rounded-full font-black text-sm uppercase text-neo-ink neo-shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-neo-ink" />
                      OFFICIALLY VERIFIED
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black uppercase text-neo-ink/60 block">
                      Certificate ID
                    </span>
                    <span className="font-mono font-black text-sm text-neo-ink">
                      {verification.certificateId || paramId}
                    </span>
                  </div>
                </div>

                {/* Recipient & Event Details */}
                <div className="space-y-6">
                  <div>
                    <span className="text-xs font-black uppercase text-neo-ink/60 block mb-1">
                      Presented To
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black text-neo-ink tracking-tight">
                      {verification.recipientName}
                    </h2>
                    <p className="text-sm font-bold text-neo-ink/70 mt-1">
                      {verification.recipientEmail}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t-2 border-neo-ink/20">
                    <div>
                      <span className="text-xs font-black uppercase text-neo-ink/60 flex items-center gap-1.5 mb-1">
                        <Building className="w-4 h-4" /> Hackathon Event
                      </span>
                      <p className="text-xl font-black text-neo-ink">
                        {verification.eventName}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-black uppercase text-neo-ink/60 flex items-center gap-1.5 mb-1">
                        <User className="w-4 h-4" /> Recognized Role
                      </span>
                      <span className="inline-block px-3 py-1 bg-neo-pastel-yellow border-2 border-neo-ink rounded-full font-black text-xs uppercase text-neo-ink">
                        {verification.role}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs font-black uppercase text-neo-ink/60 flex items-center gap-1.5 mb-1">
                        <Calendar className="w-4 h-4" /> Issue Date
                      </span>
                      <p className="font-bold text-neo-ink">
                        {formatDate(verification.issuedAt)}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-black uppercase text-neo-ink/60 flex items-center gap-1.5 mb-1">
                        <Award className="w-4 h-4" /> Certified By
                      </span>
                      <p className="font-bold text-neo-ink">
                        {verification.issuer || 'Official Event Organizer'}
                      </p>
                    </div>
                  </div>

                  {/* Cryptographic Seal Details */}
                  <div className="p-4 bg-neo-bg rounded-2xl border-3 border-neo-ink space-y-2 mt-6">
                    <div className="flex items-center justify-between text-xs font-black uppercase text-neo-ink">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-4 h-4" /> Digital Cryptographic Signature
                      </span>
                      <span className="text-neo-ink/70">Algorithm: {verification.verificationAlgorithm || 'HMAC-SHA256'}</span>
                    </div>
                    <p className="font-mono text-xs font-bold text-neo-ink/70 break-all">
                      {verification.signature}
                    </p>
                  </div>
                </div>

                {/* Print button */}
                <div className="pt-4 border-t-3 border-neo-ink flex justify-end">
                  <button
                    onClick={() => window.print()}
                    className="px-6 py-2.5 rounded-full border-3 border-neo-ink bg-white font-black text-sm uppercase hover:neo-active neo-shadow"
                  >
                    Print Certificate
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <NeoCard color="bg-neo-pastel-pink" className="text-center py-12 space-y-4">
              <ShieldAlert className="w-16 h-16 text-neo-ink mx-auto" />
              <h3 className="text-3xl font-black text-neo-ink uppercase">Invalid Credential</h3>
              <p className="font-bold text-neo-ink/80 max-w-md mx-auto">
                {verification.reason || 'This certificate signature could not be verified against the system database.'}
              </p>
            </NeoCard>
          )}
        </div>
      ) : null}
    </div>
  );
};
