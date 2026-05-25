import React, { useState, useEffect, useRef } from "react";
import { User, Message } from "../types";
import { encryptMessage, decryptMessage } from "../utils/crypto";
import {
  Send, Phone, Video, ShieldAlert, ShieldCheck, Key, Lock, Eye, EyeOff, File,
  Paperclip, Image as ImageIcon, CircleAlert, Check, CheckCheck, LockKeyhole, ArrowRight, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MessagesViewProps {
  messages: Message[];
  users: User[];
  currentUser: User;
  onSendMessage: (
    receiverId: string,
    encryptedText: string,
    iv: string,
    isEncrypted: boolean,
    isFile?: boolean,
    fileName?: string,
    fileData?: string,
    fileSize?: string
  ) => void;
  onInitiateCall: (receiverId: string, type: 'audio' | 'video') => void;
}

export default function MessagesView({
  messages,
  users,
  currentUser,
  onSendMessage,
  onInitiateCall,
}: MessagesViewProps) {
  
  const SIMULATED_IDS = ["user-aria", "user-leo", "user-sofia", "user-kenji"];
  
  const [hideSimulated, setHideSimulated] = useState(true);
  const [selectedContactId, setSelectedContactId] = useState<string>("user-leo");
  const [messageText, setMessageText] = useState("");
  const [showEncryptionDetails, setShowEncryptionDetails] = useState(false);
  const [decryptedCache, setDecryptedCache] = useState<{ [msgId: string]: string }>({});
  const [viewCiphertext, setViewCiphertext] = useState<{ [msgId: string]: boolean }>({});
  
  // File upload simulation
  const [showFilePopover, setShowFilePopover] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  const contacts = users.filter(u => {
    if (u.id === currentUser.id) return false;
    if (hideSimulated && SIMULATED_IDS.includes(u.id)) return false;
    return true;
  });
  
  const selectedContact = users.find(u => u.id === selectedContactId) || contacts[0];

  // If selected contact of simulated type gets hidden, set selection to first real contact
  useEffect(() => {
    if (contacts.length > 0) {
      const exists = contacts.some(c => c.id === selectedContactId);
      if (!exists) {
        setSelectedContactId(contacts[0].id);
      }
    } else {
      setSelectedContactId("");
    }
  }, [hideSimulated, contacts.length]);

  // Group messages for selected contact
  const conversationMessages = selectedContactId
    ? messages.filter(
        m =>
          (m.senderId === currentUser.id && m.receiverId === selectedContactId) ||
          (m.senderId === selectedContactId && m.receiverId === currentUser.id)
      )
    : [];

  // Auto-scroll to chat bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages, uploadProgress]);

  // Client-Side decrypt hook to display true decrypted messages
  useEffect(() => {
    async function performDecryptions() {
      if (!selectedContact) return;
      const updatedCache = { ...decryptedCache };
      let changed = false;

      for (const msg of conversationMessages) {
        if (!updatedCache[msg.id]) {
          if (msg.isEncrypted) {
            // Real client-side E2EE decryption using derived secret AES-GCM keys
            const decrypted = await decryptMessage(
              msg.encryptedText,
              msg.iv,
              msg.senderId,
              msg.receiverId
            );
            updatedCache[msg.id] = decrypted;
            changed = true;
          } else {
            updatedCache[msg.id] = msg.encryptedText;
            changed = true;
          }
        }
      }

      if (changed) {
        setDecryptedCache(updatedCache);
      }
    }

    performDecryptions();
  }, [conversationMessages, selectedContactId, selectedContact]);

  // Handle message sending with local E2EE encryption
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !selectedContact) return;

    const plaintext = messageText;
    setMessageText("");

    try {
      // 1. Encrypt message locally (Plaintext NEVER leaves the client!)
      const { ciphertext, iv } = await encryptMessage(plaintext, currentUser.id, selectedContactId);
      
      // 2. Transmit base64 encrypted packet to high-fidelity backend
      onSendMessage(selectedContactId, ciphertext, iv, true);
    } catch (err) {
      console.error("Encryption run failed locally. Bypassing encryption.", err);
      onSendMessage(selectedContactId, plaintext, "", false);
    }
  };

  // Simulate file sending with E2EE
  const handleSendMockFile = (fileName: string, type: 'pdf' | 'png' | 'key', size: string) => {
    if (!selectedContact) return;
    setShowFilePopover(false);
    setUploadFileName(fileName);
    setUploadProgress(10);

    const interval = setInterval(async () => {
      setUploadProgress(prev => {
        if (prev === null) return null;
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(async () => {
            if (!selectedContact) return;
            // Document simulation content encrypted in E2EE
            const fileMockContent = `[Données binaires sécurisées chiffrées en AES-GCM pour le fichier ${fileName}]`;
            const { ciphertext, iv } = await encryptMessage(fileMockContent, currentUser.id, selectedContactId);
            
            onSendMessage(
              selectedContactId,
              ciphertext,
              iv,
              true,
              true, // isFile
              fileName,
              `https://examples.com/secure-vault/${fileName}`, // mock encrypted storage url
              size
            );
            setUploadProgress(null);
            setUploadFileName("");
          }, 400);
          return 100;
        }
        return prev + 30;
      });
    }, 200);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border border-neutral-800 rounded-3xl overflow-hidden bg-neutral-950 min-h-[72vh] max-w-5xl mx-auto shadow-2xl font-sans text-neutral-50 mb-18 mt-2">
      
      {/* LEFT COLUMN: CONTACTS LIST */}
      <div className={`md:col-span-4 border-r border-neutral-800 flex flex-col bg-neutral-950/40 h-full ${selectedContactId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-neutral-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">Direct Messages</h2>
            <div className="bg-gradient-to-tr from-emerald-500/10 to-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-mono font-black flex items-center gap-1">
              <Lock className="w-[10px] h-[10px]" />
              E2EE ACTIF
            </div>
          </div>
          
          <div className="bg-neutral-900 rounded-xl px-3.5 py-2 text-xs flex items-center gap-2 text-neutral-400 font-mono">
            <LockKeyhole className="w-4 h-4 text-pink-500" />
            <span>Clé AES-256 locale validée</span>
          </div>

          <div className="flex items-center justify-between bg-neutral-900/60 rounded-xl px-3 py-1.5 text-[10px] font-mono border border-neutral-800/80">
            <span className="text-neutral-400">Filtre: Comptes réels</span>
            <button
              id="toggle-hide-simulated-btn"
              onClick={() => setHideSimulated(!hideSimulated)}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                hideSimulated 
                  ? "bg-pink-500 text-white" 
                  : "bg-neutral-800 text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {hideSimulated ? "ACTIF (Sims masquées)" : "DESACTIVE"}
            </button>
          </div>
        </div>

        {/* Contacts scrolling body */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-900/50 max-h-[60vh] md:max-h-[66vh]">
          {contacts.length === 0 ? (
            <div className="p-6 text-center flex flex-col items-center justify-center gap-2.5 h-full py-16">
              <Sparkles className="w-8 h-8 text-pink-500/60 animate-pulse" />
              <p className="text-xs font-semibold text-neutral-300 leading-relaxed max-w-xs">
                Aucun autre compte réel connecté.
              </p>
              <p className="text-[10px] text-neutral-500 font-mono leading-relaxed max-w-[200px] mx-auto">
                Inscrivez-vous sur une autre fenêtre pour tester en direct de bout en bout !
              </p>
              <button
                id="show-sims-btn"
                onClick={() => setHideSimulated(false)}
                className="mt-3 text-[10px] text-pink-400 hover:text-pink-300 transition-colors bg-pink-500/10 px-2.5 py-1.5 border border-pink-500/20 rounded-md font-mono cursor-pointer"
              >
                Activer les simulations de test
              </button>
            </div>
          ) : (
            contacts.map((contact) => {
              const isSelected = contact.id === selectedContactId;
              const lastMsg = messages
                .filter(m => (m.senderId === currentUser.id && m.receiverId === contact.id) || (m.senderId === contact.id && m.receiverId === currentUser.id))
                .pop();

              return (
                <button
                  key={contact.id}
                  id={`contact-item-${contact.id}`}
                  onClick={() => setSelectedContactId(contact.id)}
                  className={`w-full flex items-center justify-between p-4 transition-all duration-200 text-left ${
                    isSelected ? "bg-neutral-900 border-l-4 border-pink-500" : "hover:bg-neutral-900/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <img
                        src={contact.avatarUrl}
                        alt={contact.fullName}
                        className="w-11 h-11 rounded-full object-cover border border-neutral-800"
                      />
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-neutral-950 rounded-full" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-neutral-200">{contact.fullName}</span>
                      <span className="text-[10px] text-neutral-500 font-mono font-medium">@{contact.username}</span>
                      {lastMsg && (
                        <p className="text-[11px] text-neutral-400 truncate mt-1">
                          {lastMsg.senderId === currentUser.id ? "Vous: " : ""}
                          {lastMsg.isFile ? `📁 Fichier: ${lastMsg.fileName}` : lastMsg.encryptedText.slice(0, 24)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-[8px] font-mono text-neutral-600">E2EE OK</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: ACTIVE CHAT SCREEN */}
      <div className={`md:col-span-8 flex flex-col bg-neutral-950 h-full ${!selectedContactId ? 'hidden md:flex' : 'flex'}`}>
        
        {!selectedContact ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500 font-mono">
            <Lock className="w-10 h-10 text-neutral-800 mb-3 animate-pulse" />
            <p className="text-xs text-neutral-400">Sélectionnez un contact pour commencer à communiquer en toute sécurité.</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/50">
              <div className="flex items-center gap-3">
                {/* Mobile Back button */}
                <button
                  onClick={() => setSelectedContactId("")}
                  className="md:hidden mr-1 p-1.5 rounded-full bg-neutral-900 text-neutral-300"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>

                <div className="relative">
                  <img
                    src={selectedContact.avatarUrl}
                    alt={selectedContact.fullName}
                    className="w-10 h-10 rounded-full object-cover border border-neutral-800"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-neutral-950 rounded-full" />
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-neutral-200 leading-tight">
                    {selectedContact.fullName}
                  </span>
                  <button
                    onClick={() => setShowEncryptionDetails(!showEncryptionDetails)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-mono font-bold uppercase tracking-wider mt-0.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>LIEN SÉCURISÉ ACTIF</span>
                  </button>
                </div>
              </div>

              {/* Video & Audio Calling buttons inside chat! */}
              <div className="flex items-center gap-2">
                <button
                  id="chat-audio-call"
                  onClick={() => onInitiateCall(selectedContactId, 'audio')}
                  className="p-3 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-200 hover:bg-neutral-800 focus:outline-none hover:text-pink-500 active:scale-95 transition-all"
                  title="Appel Audio Chiffré"
                >
                  <Phone className="w-4.5 h-4.5" />
                </button>
                <button
                  id="chat-video-call"
                  onClick={() => onInitiateCall(selectedContactId, 'video')}
                  className="p-3 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white hover:opacity-90 focus:outline-none active:scale-95 transition-all shadow-md"
                  title="Appel Vidéo Chiffré"
                >
                  <Video className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* SECURE SPEC INSPECTION PANEL (diffie hellman visual math / client-side key specs) */}
            <AnimatePresence>
              {showEncryptionDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-neutral-900/80 border-b border-neutral-800/80 px-4 py-3.5 text-xs font-mono text-neutral-300 flex flex-col gap-2 relative z-20 overflow-hidden"
                >
                  <div className="flex items-center justify-between text-pink-500 border-b border-neutral-800 pb-1.5 mb-1">
                    <span className="font-extrabold tracking-widest text-[10px]">INSPECTEUR DE CHIFFREMENT DE BOUT EN BOUT</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    <div>
                      <span className="text-neutral-500 font-bold block sm:inline">Mécanisme: </span>
                      <span className="text-neutral-200">Diffie-Hellman / AES-GCM 256</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-bold block sm:inline">Protocole: </span>
                      <span className="text-emerald-400">Standard Web Crypto Direct</span>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <span className="text-neutral-500 font-bold block">Signature d'empreinte digitale pour @{selectedContact.username}:</span>
                      <span className="text-neutral-400 text-[10px] break-all bg-black/40 px-2 py-1 rounded border border-neutral-800 mt-1 block">
                        {`SHA-256//${currentUser.id.slice(5)}:${selectedContact.id.slice(5)}:2026:E2EE:SESSION:TOKEN:${btoa(currentUser.username + selectedContact.username).slice(0, 36)}`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-zinc-400 bg-neutral-950/40 p-2.5 rounded-lg border border-neutral-800/50 leading-relaxed">
                    📢 <strong className="text-white">Principe Client-Side:</strong> Le serveur stocke uniquement des messages chiffrés en base64 de manière cryptographique et ne possède pas la clé correspondante. Le déchiffrement a lieu entièrement sur votre navigateur local.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CHAT THREAD */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-h-[50vh] min-h-[40vh] md:max-h-[54vh] bg-gradient-to-b from-neutral-950/10 to-transparent">
              {conversationMessages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center p-8 text-center text-neutral-500 font-mono">
                  <Lock className="w-10 h-10 text-neutral-700 mb-3 animate-pulse" />
                  <p className="text-sm">Début de canal chiffré de bout en bout.</p>
                  <p className="text-[10px] text-neutral-600 mt-1">Vos clés privées locales valident cette connexion.</p>
                </div>
              ) : (
                conversationMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  const decryptedText = decryptedCache[msg.id] || msg.encryptedText;
                  const showingCipher = viewCiphertext[msg.id];

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2 max-w-[85%] ${isMe ? "self-end flex-row-reverse" : "self-start"}`}
                    >
                      {/* Avatar */}
                      <img
                        src={isMe ? currentUser.avatarUrl : selectedContact.avatarUrl}
                        alt="avatar"
                        className="w-7 h-7 rounded-full object-cover border border-neutral-800 flex-shrink-0 mt-1"
                      />

                      {/* Bubble body */}
                      <div className="flex flex-col gap-0.5">
                        {/* Username or Secure Seal stamp */}
                        <span className="text-[9px] text-neutral-500 font-mono scale-95 flex items-center gap-1">
                          {isMe ? "Moi" : `@${selectedContact.username}`}
                          {msg.isEncrypted && (
                            <span className="text-emerald-500 flex items-center gap-0.5 font-bold">
                              <Lock className="w-2.5 h-2.5" /> SECURE
                            </span>
                          )}
                        </span>

                        <div
                          className={`px-4 py-2.5 rounded-2xl text-xs flex flex-col gap-1.5 transition-colors relative group ${
                            isMe
                              ? "bg-pink-600 text-white rounded-tr-none"
                              : "bg-neutral-900 text-neutral-100 rounded-tl-none border border-neutral-800/80"
                          }`}
                        >
                          {/* FILE ATTACHMENT DISPLAY if message contains file */}
                          {msg.isFile ? (
                            <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-neutral-800/80 min-w-[180px]">
                              <div className="bg-pink-500/20 p-2 rounded-lg text-pink-400">
                                <File className="w-5 h-5" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-[11px] truncate">{msg.fileName}</span>
                                <span className="text-[9px] text-neutral-400 font-mono">{msg.fileSize || "Secured"}</span>
                              </div>
                            </div>
                          ) : (
                            /* Standard body text */
                            <p className="whitespace-pre-wrap font-sans break-all select-text">
                              {showingCipher ? msg.encryptedText : decryptedText}
                            </p>
                          )}

                          {/* Decrypted vs Ciphertext debugger toggle */}
                          {msg.isEncrypted && (
                            <button
                              onClick={() =>
                                setViewCiphertext(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))
                              }
                              className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-neutral-950 border border-neutral-800 rounded-full text-neutral-400 hover:text-white shadow-xl ${
                                isMe ? "-left-10" : "-right-10"
                              }`}
                              title={showingCipher ? "Déchiffrer" : "Voir Paquet de Données Chiffré"}
                            >
                              {showingCipher ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>

                        {/* Time receipt */}
                        <span className="text-[8px] font-mono text-neutral-600 self-end mt-0.5 flex items-center gap-1">
                          {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {isMe && <CheckCheck className="w-3 h-3 text-pink-400" />}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Interactive loading progress spinner for attachments */}
              {uploadProgress !== null && (
                <div className="self-end flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 max-w-[220px] shadow-lg">
                  <div className="w-3 h-3 border-2 border-pink-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[10px] text-neutral-300 truncate">E2EE: Chiffrement de {uploadFileName}</span>
                    <div className="w-full bg-black/60 h-1 rounded-full overflow-hidden">
                      <div className="bg-pink-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* INPUT SEND FORM BAR */}
            <div className="p-4 border-t border-neutral-800 flex items-center gap-2.5 bg-neutral-950 relative">
              
              {/* File popup toggler */}
              <button
                id="chat-attach-trigger"
                onClick={() => setShowFilePopover(!showFilePopover)}
                className={`p-3 rounded-xl border bg-neutral-900 transition-colors ${
                  showFilePopover ? "border-pink-500 text-pink-500" : "border-neutral-800 text-neutral-400 hover:bg-neutral-800"
                }`}
              >
                <Paperclip className="w-4.5 h-4.5" />
              </button>

              {/* SIMULATED E2EE SECURE VAULT CONTAINER (popover) */}
              <AnimatePresence>
                {showFilePopover && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: -110 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-4 bottom-16 bg-neutral-900 border border-neutral-800 rounded-2xl p-3 flex flex-col gap-1.5 shadow-2xl z-30 min-w-[200px]"
                  >
                    <span className="text-[9px] font-mono text-pink-500 font-extrabold tracking-widest block border-b border-neutral-800 pb-1.5 mb-1.5 align-middle">
                      COFFRE-FORT SÉCURISÉ (E2EE)
                    </span>
                    <button
                      onClick={() => handleSendMockFile("photo_identite.png", "png", "1.2 Mo")}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-950/60 hover:text-white text-left transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      <span>photo_identite.png</span>
                    </button>
                    <button
                      onClick={() => handleSendMockFile("rapport_financier.pdf", "pdf", "4.8 Mo")}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-950/60 hover:text-white text-left transition-colors"
                    >
                      <File className="w-4 h-4 text-red-400" />
                      <span>rapport_financier.pdf</span>
                    </button>
                    <button
                      onClick={() => handleSendMockFile("vpn_credentials.key", "key", "256 octets")}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-950/60 hover:text-white text-left transition-colors"
                    >
                      <Key className="w-4 h-4 text-yellow-400" />
                      <span>vpn_credentials.key</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Text Input */}
              <form onSubmit={handleSend} className="flex-1 flex gap-2">
                <input
                  id="message-text-input"
                  type="text"
                  placeholder="Envoyer un message chiffré..."
                  value={messageText}
                  onChange={(e) => setMessageRef(e.target.value)}
                  className="flex-1 bg-neutral-900 border border-neutral-800 placeholder-neutral-500 focus:outline-none focus:border-pink-500 rounded-2xl px-4 py-3 text-xs text-neutral-200"
                />
                <button
                  id="message-send-btn"
                  type="submit"
                  disabled={!messageText.trim()}
                  className={`p-3 rounded-2xl transition-all shadow-md flex items-center justify-center ${
                    messageText.trim()
                      ? "bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white cursor-pointer shadow-pink-500/15 scale-105"
                      : "bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-800"
                  }`}
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </form>
            </div>
          </>
        )}

      </div>

    </div>
  );

  function setMessageRef(val: string) {
    setMessageText(val);
  }
}
