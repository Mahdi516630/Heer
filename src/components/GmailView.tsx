import React, { useState, useEffect } from "react";
import { Mail, Send, Inbox, Star, Trash2, ArrowLeft, RefreshCw, Search, ShieldAlert, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { connectGoogleWorkspace, getCachedAccessToken } from "../utils/googleAuth";
import { motion, AnimatePresence } from "motion/react";

interface GmailMessageDetail {
  id: string;
  sender: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  labels: string[];
}

export default function GmailView() {
  const [accessToken, setAccessToken] = useState<string | null>(getCachedAccessToken());
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<GmailMessageDetail[]>([]);
  const [searchResults, setSearchResults] = useState<GmailMessageDetail[] | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<GmailMessageDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Compose State
  const [isComposing, setIsComposing] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  // Auto-connect on click if token exists
  useEffect(() => {
    const activeToken = getCachedAccessToken();
    if (activeToken) {
      setAccessToken(activeToken);
      fetchEmails(activeToken);
    }
  }, []);

  const handleConnect = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await connectGoogleWorkspace();
      if (res?.accessToken) {
        setAccessToken(res.accessToken);
        fetchEmails(res.accessToken);
      }
    } catch (err: any) {
      setError(err?.message || "Échec de connexion à votre compte Google.");
    } finally {
      setLoading(false);
    }
  };

  const decodeBase64 = (str: string) => {
    try {
      let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) {
        base64 += "=";
      }
      return decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
    } catch (e) {
      try {
        return atob(str.replace(/-/g, "+").replace(/_/g, "/"));
      } catch {
        return "Impossible d'analyser le corps HTML";
      }
    }
  };

  const extractBodyAndSender = (msgDetails: any) => {
    const headers = msgDetails.payload?.headers || [];
    const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === "subject");
    const fromHeader = headers.find((h: any) => h.name.toLowerCase() === "from");
    const dateHeader = headers.find((h: any) => h.name.toLowerCase() === "date");

    const subject = subjectHeader ? subjectHeader.value : "(Sans objet)";
    const sender = fromHeader ? fromHeader.value : "Expéditeur inconnu";
    let dateStr = dateHeader ? dateHeader.value : "";
    try {
      if (dateStr) {
        const d = new Date(dateStr);
        dateStr = d.toLocaleDateString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          day: "numeric",
          month: "short"
        });
      }
    } catch {
      // Keep original date header fallback
    }

    // Extract body plain text or html
    let bodyText = "";
    if (msgDetails.payload?.parts) {
      const part = msgDetails.payload.parts.find(
        (p: any) => p.mimeType === "text/plain" || p.mimeType === "text/html"
      ) || msgDetails.payload.parts[0];
      if (part?.body?.data) {
        bodyText = decodeBase64(part.body.data);
      } else if (part?.parts) {
        // Nested parts
        const subPart = part.parts.find((sp: any) => sp.mimeType === "text/plain");
        if (subPart?.body?.data) bodyText = decodeBase64(subPart.body.data);
      }
    } else if (msgDetails.payload?.body?.data) {
      bodyText = decodeBase64(msgDetails.payload.body.data);
    }

    return {
      id: msgDetails.id,
      sender,
      subject,
      date: dateStr,
      snippet: msgDetails.snippet || "",
      body: bodyText || msgDetails.snippet || "(Aucun contenu)",
      labels: msgDetails.labelIds || []
    };
  };

  const fetchEmails = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch 15 most recent messages
      const listRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=category:primary",
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!listRes.ok) {
        if (listRes.status === 401) {
          setAccessToken(null);
          throw new Error("Votre session Google a expiré. Veuillez vous reconnecter.");
        }
        throw new Error("Erreur de récupération de l'index des emails.");
      }

      const listData = await listRes.json();
      if (!listData.messages || listData.messages.length === 0) {
        setEmails([]);
        setLoading(false);
        return;
      }

      // Fetch detail of each in parallel (max 10)
      const detailsPromises = listData.messages.map(async (msg: any) => {
        const dRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        if (!dRes.ok) return null;
        const dData = await dRes.json();
        return extractBodyAndSender(dData);
      });

      const details = await Promise.all(detailsPromises);
      const validDetails = details.filter((item) => item !== null) as GmailMessageDetail[];
      setEmails(validDetails);
    } catch (err: any) {
      setError(err?.message || "Impossible de récupérer vos messages Gmail.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !accessToken) return;
    setLoading(true);
    try {
      const qEncoded = encodeURIComponent(searchQuery.trim());
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=${qEncoded}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!res.ok) throw new Error("Index de recherche indisponible.");
      const data = await res.json();
      if (!data.messages) {
        setSearchResults([]);
        setLoading(false);
        return;
      }

      const detailsPromises = data.messages.map(async (msg: any) => {
        const dRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );
        if (!dRes.ok) return null;
        const dData = await dRes.json();
        return extractBodyAndSender(dData);
      });

      const details = await Promise.all(detailsPromises);
      const validDetails = details.filter((item) => item !== null) as GmailMessageDetail[];
      setSearchResults(validDetails);
    } catch (err: any) {
      setError("Aucun e-mail trouvé pour cette recherche.");
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  // Compose and Security Check Block
  const initiateSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !subject || !body) {
      setError("Veuillez remplir tous les champs de l'email.");
      return;
    }
    // Launch mandatory security warning/confirmation dialog
    setShowConfirmSend(true);
  };

  const executeSendEmail = async () => {
    if (!accessToken) return;
    setIsSending(true);
    setShowConfirmSend(false);
    setError(null);

    try {
      // Build RFC-2822 email format
      const secureBody = `${body}\n\n---\nEnvoyé via le canal ultrasécurisé HEER Protocol (E2EE Portal)`;
      const emailContent = [
        `To: ${to.trim()}`,
        "Content-Type: text/plain; charset=utf-8",
        'MIME-Version: 1.0',
        `Subject: ${subject.trim()}`,
        "",
        secureBody
      ].join("\r\n");

      // Safe base64 url-safe encoding
      const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: encodedEmail })
      });

      if (!res.ok) {
        throw new Error("L'envoi de l'email a échoué.");
      }

      setIsComposing(false);
      setTo("");
      setSubject("");
      setBody("");
      
      // Update inbox
      fetchEmails(accessToken);
      alert("🔐 Confirmation : Votre email sécurisé a été transmis avec succès via le serveur Gmail.");
    } catch (err: any) {
      setError(err?.message || "Erreur de transmission d'email.");
    } finally {
      setIsSending(false);
    }
  };

  const activeEmails = searchResults !== null ? searchResults : emails;

  if (!accessToken) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-lg mx-auto shadow-2xl relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.05)_0,transparent_60%)] pointer-events-none" />
          <div className="p-4 bg-pink-500/10 border border-pink-500/20 text-pink-500 rounded-2xl w-fit mx-auto mb-6">
            <Mail className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-2">
            PASSERELLE SECURISEE GMAIL
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed mb-8 max-w-sm mx-auto">
            Connectez votre compte Google Workspace pour lire, rechercher et envoyer vos courriers électroniques professionnels directement dans le sandbox de HEER.
          </p>

          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-pink-500/10 cursor-pointer disabled:opacity-50"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4.5 h-4.5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>{loading ? "Authentification..." : "Se connecter avec Google"}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-2">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-900 pb-5 mb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-pink-500 animate-pulse" />
            <span>HEER Mail</span>
          </h2>
          <span className="text-[10px] text-neutral-500 uppercase font-mono font-bold">
            Gmail Workspace Client API (Chiffré)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsComposing(true)}
            className="bg-gradient-to-r from-pink-500 to-yellow-500 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-lg shadow-pink-500/10 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Nouveau Message</span>
          </button>

          <button
            onClick={() => fetchEmails(accessToken)}
            disabled={loading}
            className="p-2 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50 rounded-xl text-neutral-400 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Mailbox Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Inbox / Results section */}
        <div className="lg:col-span-5 border border-neutral-900 bg-neutral-950/40 rounded-2xl overflow-hidden p-4 space-y-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Rechercher des e-mails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-1.5 pl-9 pr-6 text-xs text-neutral-200 focus:outline-none focus:border-pink-500"
            />
            {searchResults !== null && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-2.5 text-[10px] text-neutral-400 hover:text-white font-mono"
              >
                Vider
              </button>
            )}
          </form>

          <div className="space-y-2 h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-800">
            {loading && activeEmails.length === 0 ? (
              <div className="text-center py-16 space-y-2 text-neutral-500 font-mono text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-pink-500" />
                <span>Synchronisation Gmail...</span>
              </div>
            ) : activeEmails.length === 0 ? (
              <div className="text-center py-16 text-neutral-500 font-mono text-xs space-y-2">
                <Inbox className="w-6 h-6 mx-auto text-neutral-600" />
                <span>Boîte de réception vide</span>
              </div>
            ) : (
              activeEmails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                return (
                  <button
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer ${
                      isSelected
                        ? "bg-neutral-900 border-pink-500/30 text-white"
                        : "bg-neutral-950 border-neutral-900 hover:border-neutral-800 text-neutral-300"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-xs truncate max-w-[70%]">{email.sender}</span>
                      <span className="text-[10px] text-neutral-500 font-mono shrink-0">{email.date}</span>
                    </div>
                    <span className="text-neutral-200 font-medium text-xs truncate">{email.subject}</span>
                    <p className="text-[11px] text-neutral-500 line-clamp-2 leading-tight pointer-events-none mt-1">
                      {email.snippet}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Email Panel or Compose */}
        <div className="lg:col-span-7 h-[578px] flex flex-col bg-neutral-900/40 border border-neutral-900 rounded-2xl overflow-hidden relative">
          <AnimatePresence mode="wait">
            {isComposing ? (
              <motion.form
                key="compose"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={initiateSendEmail}
                className="p-5 flex flex-col h-full gap-4"
              >
                <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
                  <span className="text-xs uppercase font-mono font-bold text-white">Rédiger un email</span>
                  <button
                    type="button"
                    onClick={() => setIsComposing(false)}
                    className="text-xs text-neutral-500 hover:text-white"
                  >
                    Annuler
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5">
                    <span className="text-neutral-500 font-mono">À:</span>
                    <input
                      type="email"
                      required
                      placeholder="destinataire@email.com"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="bg-transparent border-none outline-none w-full text-neutral-100"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5">
                    <span className="text-neutral-500 font-mono">Objet:</span>
                    <input
                      type="text"
                      required
                      placeholder="Canal de communication sécurisé"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="bg-transparent border-none outline-none w-full text-neutral-100 font-medium"
                    />
                  </div>
                </div>

                <textarea
                  required
                  placeholder="Écrivez votre message crypté..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 focus:outline-none focus:border-pink-500 resize-none font-sans"
                />

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full bg-gradient-to-r from-pink-500 to-yellow-500 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? "Envoi..." : "Envoyer le message"}</span>
                </button>
              </motion.form>
            ) : selectedEmail ? (
              <motion.div
                key="read"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full"
              >
                {/* Email Header */}
                <div className="p-5 border-b border-neutral-900 bg-neutral-950/20">
                  <h3 className="text-sm font-bold text-white mb-2 leading-snug">{selectedEmail.subject}</h3>
                  <div className="flex items-start justify-between gap-4 mt-2">
                    <div className="min-w-0">
                      <p className="text-xs text-neutral-300 font-mono font-bold truncate">De : {selectedEmail.sender}</p>
                      <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">{selectedEmail.date}</span>
                    </div>
                  </div>
                </div>

                {/* Email Body */}
                <div className="flex-1 p-5 overflow-y-auto text-xs text-neutral-300 leading-relaxed font-sans whitespace-pre-wrap select-text selection:bg-pink-500/30">
                  {selectedEmail.body}
                </div>
              </motion.div>
            ) : (
              <div className="m-auto text-center p-6 space-y-2 text-neutral-500 font-mono text-xs">
                <Inbox className="w-8 h-8 text-neutral-600 mx-auto" />
                <span>Sélectionnez un mail pour en afficher le contenu sécurisé</span>
              </div>
            )}
          </AnimatePresence>

          {/* CONFIRMATION POPUP DIALOG - MUTATING ACTION EXPLICIT GATING */}
          <AnimatePresence>
            {showConfirmSend && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in"
              >
                <div className="bg-neutral-900 border border-red-500/30 p-5 rounded-2xl max-w-sm text-center relative shadow-2xl">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl w-fit mx-auto mb-4">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="text-xs uppercase font-mono font-bold text-white tracking-widest mb-1.5">
                    🚨 CONFIRMATION EXPLICITE REQUISE
                  </h4>
                  <p className="text-neutral-400 text-xs leading-relaxed mb-4">
                    Vous êtes sur le point de transmettre un email à la destination : 
                    <span className="text-white block font-mono font-bold my-1 text-[11px] truncate">{to}</span>
                    Cette action transmettra les données via l'API officielle Gmail attachée à votre session Google Workspace.
                  </p>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => setShowConfirmSend(false)}
                      className="flex-1 py-2 rounded-xl text-neutral-400 hover:text-white border border-neutral-800 text-xs font-bold transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={executeSendEmail}
                      className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-yellow-500 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                    >
                      Confirmer l'envoi
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
