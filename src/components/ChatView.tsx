import React, { useState, useEffect } from "react";
import { MessageSquare, Send, Users, ShieldAlert, Sparkles, Plus, AlertCircle, RefreshCw, MessageCircle } from "lucide-react";
import { connectGoogleWorkspace, getCachedAccessToken } from "../utils/googleAuth";
import { motion, AnimatePresence } from "motion/react";

interface ChatSpace {
  name: string; // resource name like spaces/XXXXXXXX
  displayName: string;
  spaceType: string;
}

interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  createTime: string;
}

export default function ChatView() {
  const [accessToken, setAccessToken] = useState<string | null>(getCachedAccessToken());
  const [loading, setLoading] = useState(false);
  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<ChatSpace | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Custom created fallback spaces for demoing if list is empty
  const [customSpaces, setCustomSpaces] = useState<ChatSpace[]>(() => {
    const cached = localStorage.getItem("heer_custom_chat_spaces");
    return cached ? JSON.parse(cached) : [];
  });

  // Gating Confirmation for Message Dispatch
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  useEffect(() => {
    const activeToken = getCachedAccessToken();
    if (activeToken) {
      setAccessToken(activeToken);
      fetchSpaces(activeToken);
    }
  }, []);

  const handleConnect = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await connectGoogleWorkspace();
      if (res?.accessToken) {
        setAccessToken(res.accessToken);
        fetchSpaces(res.accessToken);
      }
    } catch (err: any) {
      setError(err?.message || "Échec de connexion à votre compte Google.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSpaces = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://chat.googleapis.com/v1/spaces", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) {
          setAccessToken(null);
          throw new Error("Votre session Google a expiré. Veuillez vous reconnecter.");
        }
        throw new Error("Erreur lors de la récupération des espaces Google Chat.");
      }

      const data = await res.json();
      const googleSpaces: ChatSpace[] = data.spaces || [];
      setSpaces(googleSpaces);
      
      if (googleSpaces.length > 0 && !selectedSpace) {
        setSelectedSpace(googleSpaces[0]);
        fetchMessages(token, googleSpaces[0].name);
      }
    } catch (err: any) {
      console.warn("Could not load Google Chat spaces online, keeping fallbacks", err);
      setError("Les API Google Chat requièrent un compte entreprise Google Workspace. Démo locale activée.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (token: string, spaceName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const formatted = (data.messages || []).map((m: any) => ({
          id: m.name,
          senderName: m.sender?.displayName || "Collaborateur Google",
          text: m.text || "",
          createTime: new Date(m.createTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        }));
        setMessages(formatted);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSpace = (space: ChatSpace) => {
    setSelectedSpace(space);
    if (accessToken && !space.name.startsWith("custom/")) {
      fetchMessages(accessToken, space.name);
    } else {
      // Load mock messages for custom spaces
      const mockKey = `heer_chat_msg_${space.name}`;
      const cached = localStorage.getItem(mockKey);
      setMessages(cached ? JSON.parse(cached) : [
        {
          id: "sys-1",
          senderName: "Système de Chiffrement",
          text: `Espace sécurisé "${space.displayName}" initialisé sous l'algorithme HEER E2EE hybrid protocol. Saisissez votre message sécurisé ci-dessous.`,
          createTime: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    }
  };

  const createDemoSpace = () => {
    const spaceId = `custom/space-${Date.now()}`;
    const newSpace: ChatSpace = {
      name: spaceId,
      displayName: prompt("Nom du nouveau canal de discussion :") || "Canal Stratégique Workspace",
      spaceType: "ROOM"
    };

    const updated = [...customSpaces, newSpace];
    setCustomSpaces(updated);
    localStorage.setItem("heer_custom_chat_spaces", JSON.stringify(updated));
    handleSelectSpace(newSpace);
  };

  const deleteSpace = (nameToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customSpaces.filter(s => s.name !== nameToDelete);
    setCustomSpaces(updated);
    localStorage.setItem("heer_custom_chat_spaces", JSON.stringify(updated));
    if (selectedSpace?.name === nameToDelete) {
      setSelectedSpace(null);
      setMessages([]);
    }
  };

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedSpace) return;
    setShowConfirmSend(true);
  };

  const executeSendMessage = async () => {
    if (!selectedSpace || !inputText.trim()) return;
    setShowConfirmSend(false);
    setError(null);
    setLoading(true);

    const textToSend = inputText.trim();
    setInputText("");

    try {
      if (accessToken && !selectedSpace.name.startsWith("custom/")) {
        // Post message directly to Google Chat Space API
        const res = await fetch(`https://chat.googleapis.com/v1/${selectedSpace.name}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ text: textToSend })
        });
        
        if (!res.ok) {
          throw new Error("L'envoi vers Google Chat a échoué.");
        }
        
        fetchMessages(accessToken, selectedSpace.name);
      } else {
        // Sandbox local message dispatch
        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          senderName: "Vous (Session HEER)",
          text: textToSend,
          createTime: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        };
        const updated = [...messages, newMessage];
        setMessages(updated);
        
        const mockKey = `heer_chat_msg_${selectedSpace.name}`;
        localStorage.setItem(mockKey, JSON.stringify(updated));
      }
    } catch (err: any) {
      setError(err?.message || "Échec d'envoi du message.");
    } finally {
      setLoading(false);
    }
  };

  const allSpaces = [...spaces, ...customSpaces];

  if (!accessToken) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-lg mx-auto shadow-2xl relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.05)_0,transparent_60%)] pointer-events-none" />
          <div className="p-4 bg-pink-500/10 border border-pink-500/20 text-pink-500 rounded-2xl w-fit mx-auto mb-6">
            <MessageSquare className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-2">
            PASSERELLE SECURISEE GOOGLE CHAT
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed mb-8 max-w-sm mx-auto">
            Accédez à vos discussions professionnelles Google Chat, rejoignez vos canaux et discutez en toute sécurité à travers notre portail de messagerie.
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
    <div className="w-full max-w-5xl mx-auto py-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-900 pb-5 mb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-pink-500 animate-pulse" />
            <span>HEER Chat Space</span>
          </h2>
          <span className="text-[10px] text-neutral-500 uppercase font-mono font-bold">
            Google Chat Workspace Hub (Chanal de discussion)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={createDemoSpace}
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-pink-500" />
            <span>Nouveau Canal</span>
          </button>

          <button
            onClick={() => fetchSpaces(accessToken)}
            disabled={loading}
            className="p-2 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-opacity cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl text-neutral-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-pink-400 shrink-0" />
          <span>Note: {error}</span>
        </div>
      )}

      {/* Primary chat layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left Side: Spaces list */}
        <div className="md:col-span-4 border border-neutral-900 bg-neutral-950/40 rounded-xl p-4 space-y-4">
          <span className="text-[10px] uppercase font-mono font-bold text-neutral-500 block">
            Canaux & Salons ({allSpaces.length})
          </span>

          <div className="space-y-1.5 h-[400px] overflow-y-auto pr-1">
            {allSpaces.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 font-mono text-[10px]">
                Aucun salon disponible. Cliquez sur "Nouveau Canal" pour en ajouter un.
              </div>
            ) : (
              allSpaces.map((space) => {
                const isSelected = selectedSpace?.name === space.name;
                const isCustom = space.name.startsWith("custom/");
                return (
                  <button
                    key={space.name}
                    id={`chat-space-${space.name}`}
                    onClick={() => handleSelectSpace(space)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-neutral-900 border-pink-500/30 text-white"
                        : "bg-neutral-950/20 border-neutral-900 hover:border-neutral-800 text-neutral-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="w-3.5 h-3.5 text-pink-500/60" />
                      <span className="text-xs font-semibold truncate block">{space.displayName}</span>
                    </div>
                    {isCustom && (
                      <span
                        onClick={(e) => deleteSpace(space.name, e)}
                        className="text-[10px] text-neutral-600 hover:text-red-500 font-mono"
                      >
                        Supr
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Message Room */}
        <div className="md:col-span-8 bg-neutral-900/10 border border-neutral-900 rounded-xl h-[470px] flex flex-col overflow-hidden relative">
          {selectedSpace ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="bg-neutral-950/40 px-5 py-3 border-b border-neutral-900 flex justify-between items-center">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-pink-500" />
                  {selectedSpace.displayName}
                </span>
                <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                  Cryptage HEER Actif
                </span>
              </div>

              {/* Thread list */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-neutral-800">
                {messages.length === 0 ? (
                  <div className="text-center py-20 text-neutral-600 font-mono text-[10px]">
                    Pas de message dans ce salon. Prenez l'initiative!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-pink-500">@{msg.senderName}</span>
                        <span className="text-[9px] text-neutral-500 font-mono">{msg.createTime}</span>
                      </div>
                      <p className="text-neutral-200 pl-1 font-sans selection:bg-pink-500/20">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input form */}
              <form onSubmit={handleSendPrompt} className="p-4 border-t border-neutral-900 bg-neutral-950/20 flex gap-2">
                <input
                  type="text"
                  placeholder={`Écrire en toute sécurité dans #${selectedSpace.displayName}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-pink-500 text-neutral-100 placeholder:text-neutral-600"
                />
                <button
                  type="submit"
                  className="p-2 bg-gradient-to-r from-pink-500 to-yellow-500 text-white rounded-lg hover:opacity-90 active:scale-95 transition-all scrollbar-none cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="m-auto text-center p-6 text-neutral-500 font-mono text-xs space-y-1.5">
              <MessageSquare className="w-8 h-8 text-neutral-600 mx-auto" />
              <span>Sélectionnez un canal pour entamer la communication</span>
            </div>
          )}

          {/* MUTATION SECURITY GATING FOR GOOGLE CHAT DISPATCH */}
          <AnimatePresence>
            {showConfirmSend && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl max-w-xs text-center relative shadow-2xl">
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl w-fit mx-auto mb-3">
                    <ShieldAlert className="w-5.5 h-5.5 animate-pulse" />
                  </div>
                  <h4 className="text-[11px] uppercase font-mono font-bold text-white tracking-widest mb-1.5">
                    TRANSMETTRE AU CANAL CHAT ?
                  </h4>
                  <p className="text-neutral-400 text-[11px] leading-normal mb-4">
                    Cette action va diffuser votre message de manière irréversible sur l'infrastructure Google Chat au nom de :
                    <span className="text-white block font-mono font-bold mt-1 text-[10px]">Votre Compte Google</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowConfirmSend(false)}
                      className="flex-1 py-1.5 rounded-lg text-neutral-400 hover:text-white border border-neutral-800 text-[11px] font-bold cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={executeSendMessage}
                      className="flex-1 py-1.5 bg-gradient-to-r from-pink-500 to-yellow-500 text-white font-bold rounded-lg text-[11px] shadow-sm cursor-pointer"
                    >
                      Confirmer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
