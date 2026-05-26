import { useState, useEffect } from "react";
import { Post, Reel, Message, Notification, CallSession, User } from "./types";
import Navigation from "./components/Navigation";
import FeedView from "./components/FeedView";
import ReelsView from "./components/ReelsView";
import MessagesView from "./components/MessagesView";
import NotificationsView from "./components/NotificationsView";
import ProfileView from "./components/ProfileView";
import CallInterface from "./components/CallInterface";
import AuthScreen from "./components/AuthScreen";
import { ShieldCheck, LogIn, Users, Monitor, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("feed");
  
  // Master Synced variables
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Authenticated User State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = localStorage.getItem("heer_user");
    return cached ? JSON.parse(cached) : null;
  });

  const currentUserId = currentUser?.id || "";
  
  // Call management
  const [currentCall, setCurrentCall] = useState<CallSession | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  // Retrieve current active user profile object and sync statistics
  const activeUser = users.find(u => u.id === currentUserId) || currentUser || {
    id: currentUserId,
    username: "anonymous",
    fullName: "Anonymous",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    bio: "Digital Member de HEER",
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
  };

  // Helper to trigger initial loads and registration on backend
  useEffect(() => {
    if (!currentUserId) return;
    async function initUserSession() {
      try {
        // Initial posts and reels fetch
        const pRes = await fetch("/api/posts");
        const rRes = await fetch("/api/reels");
        if (pRes.ok) setPosts(await pRes.json());
        if (rRes.ok) setReels(await rRes.json());
      } catch (err) {
        console.error("Failed to register session with backend server:", err);
      }
    }
    initUserSession();
  }, [currentUserId]);

  // CORE CRYPTOSYSTEM SYNC ENGINE (Incremental Polling every 2.2 seconds)
  useEffect(() => {
    if (!currentUserId) return;
    let active = true;

    async function doSync() {
      try {
        const queryParams = new URLSearchParams({
          userId: currentUserId,
          ...(lastSyncTime ? { since: lastSyncTime } : {})
        });

        const res = await fetch(`/api/sync?${queryParams.toString()}`);
        if (res.ok && active) {
          const data = await res.json();
          
          setUsers(data.users || []);
          
          // Incremental update for messages
          if (data.messages && data.messages.length > 0) {
            setMessages(prev => {
              const prevMap = new Map<string, Message>(prev.map(m => [m.id, m]));
              data.messages.forEach((m: Message) => prevMap.set(m.id, m));
              return Array.from(prevMap.values()).sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
            });
          }

          // Incremental update for notifications
          if (data.notifications && data.notifications.length > 0) {
            setNotifications(prev => {
              const prevMap = new Map<string, Notification>(prev.map(n => [n.id, n]));
              data.notifications.forEach((n: Notification) => prevMap.set(n.id, n));
              return Array.from(prevMap.values()).sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
            });
          }

          // Active WebRTC / audio-video calls check
          if (data.callSessions && data.callSessions.length > 0) {
            // Find currently active calling state (connected or ringing for this user)
            const activeCallSession = data.callSessions.find(
              (c: CallSession) => ['calling', 'connected', 'ringing'].includes(c.status)
            );
            
            if (activeCallSession) {
              setCurrentCall(activeCallSession);
            } else {
              setCurrentCall(null);
            }
          } else {
            setCurrentCall(null);
          }

          // Update sync ticker timestamp
          setLastSyncTime(data.timestamp);
        }
      } catch (err) {
        console.warn("Real-time sync error (backend initializing or polling):", err);
      }
    }

    // Immediate initial run
    doSync();

    const interval = setInterval(() => {
      doSync();
    }, 2200);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentUserId, lastSyncTime]);

  // --- CONTROLLER ACTION CALLBACKS ---

  // 1. Post Liked
  const handleLikePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId })
      });
      if (res.ok) {
        const updatedPost = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Add Comment inside post
  const handleAddComment = async (postId: string, text: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, text })
      });
      if (res.ok) {
        const updatedPost = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Create interactive Post
  const handleAddPost = async (content: string, mediaUrl: string, location?: string) => {
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, content, mediaUrl, mediaType: "image", location })
      });
      if (res.ok) {
        const newPost = await res.json();
        setPosts(prev => [newPost, ...prev]);
        setActiveTab("feed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Like Reel
  const handleLikeReel = async (reelId: string) => {
    try {
      const res = await fetch(`/api/reels/${reelId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId })
      });
      if (res.ok) {
        const updatedReel = await res.json();
        setReels(prev => prev.map(r => r.id === reelId ? updatedReel : r));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Encrypted message sent
  const handleSendMessage = async (
    receiverId: string,
    encryptedText: string,
    iv: string,
    isEncrypted: boolean,
    isFile?: boolean,
    fileName?: string,
    fileData?: string,
    fileSize?: string
  ) => {
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId,
          encryptedText,
          iv,
          isEncrypted,
          isFile,
          fileName,
          fileData,
          fileSize
        })
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 6. Initiate E2EE Audio/Video WebRTC connection
  const handleInitiateCall = async (receiverId: string, type: 'audio' | 'video') => {
    try {
      const res = await fetch("/api/calls/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: currentUserId, receiverId, type })
      });
      if (res.ok) {
        const callSession = await res.json();
        setCurrentCall(callSession);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 7. Accept incoming WebRTC Call
  const handleAcceptCall = async () => {
    if (!currentCall) return;
    try {
      const res = await fetch("/api/calls/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: currentCall.id, status: "connected" })
      });
      if (res.ok) {
        const updatedCall = await res.json();
        setCurrentCall(updatedCall);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 8. Decline / Hang up Call
  const handleDeclineCall = async () => {
    if (!currentCall) return;
    try {
      await fetch("/api/calls/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: currentCall.id, status: "declined" })
      });
      setCurrentCall(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndCall = async () => {
    if (!currentCall) return;
    try {
      await fetch("/api/calls/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: currentCall.id, status: "ended" })
      });
      setCurrentCall(null);
    } catch (err) {
      console.error(err);
    }
  };

  // 9. Notifications Cleared
  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleReadNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // 10. Profile details saved
  const handleUpdateProfile = async (fullName: string, username: string, bio: string) => {
    try {
      const res = await fetch("/api/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentUserId, fullName, username, bio })
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(prev => prev.map(u => u.id === currentUserId ? updated : u));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuthSuccess = (user: User) => {
    localStorage.setItem("heer_user", JSON.stringify(user));
    setCurrentUser(user);
    setLastSyncTime("");
  };

  const handleLogout = () => {
    localStorage.removeItem("heer_user");
    setCurrentUser(null);
    setUsers([]);
    setPosts([]);
    setMessages([]);
    setNotifications([]);
  };

  const [isWiping, setIsWiping] = useState(false);
  const handleWipeDatabase = async () => {
    setIsWiping(true);
    try {
      const res = await fetch("/api/admin/clear-data", { method: "POST" });
      if (res.ok) {
        handleLogout();
        setActiveTab("feed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsWiping(false);
    }
  };

  // Calculation parameters for navigation badges
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  // Unique unread dialogues count
  const unreadMessagesCount = notifications.filter(n => n.type === "message" && !n.read).length;

  if (!currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col md:flex-row antialiased select-none">
      
      {/* BACKGROUND MATRICES */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.04)_0,transparent_55%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-80 h-80 bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* FIXED NAVIGATION (Sidebar / Bottom Mobile Row) */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadMessagesCount={unreadMessagesCount}
        unreadNotificationsCount={unreadNotificationsCount}
        currentUser={activeUser}
        onLogout={handleLogout}
      />

      {/* CORE DISPLAY STAGE (With responsive margins to prevent sidebar overlay) */}
      <main className="flex-1 min-h-screen pt-14 md:pt-0 md:pl-64 flex flex-col relative z-20">
        
        {/* TOP COMPONENT: DECRYPTED KEY SYSTEM HEADER */}
        <header className="bg-black/40 border-b border-neutral-800 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md sticky top-0 md:top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>HEER PROTOCOLE CLÉ SECURISEE (E2EE)</span>
            </div>
            <span className="text-[11px] font-mono text-neutral-500 hidden sm:inline">// Réseau social sécurisé de bout en bout</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-neutral-400">
              Actif: @{activeUser.username}
            </span>
          </div>
        </header>

        {/* ACTIVE MODULE VIEW SWITCH */}
        <div className="flex-1 p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === "feed" && (
              <motion.div
                key="feed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <FeedView
                  posts={posts}
                  users={users}
                  currentUser={activeUser}
                  onLikePost={handleLikePost}
                  onAddComment={handleAddComment}
                  onAddPost={handleAddPost}
                />
              </motion.div>
            )}

            {activeTab === "reels" && (
              <motion.div
                key="reels"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <ReelsView
                  reels={[...reels].sort((a, b) => {
                    const aUser = users.find(u => u.id === a.userId);
                    const bUser = users.find(u => u.id === b.userId);
                    const aPri = aUser?.email?.toLowerCase() === "mahdiyacoubali2004@gmail.com";
                    const bPri = bUser?.email?.toLowerCase() === "mahdiyacoubali2004@gmail.com";
                    if (aPri && !bPri) return -1;
                    if (!aPri && bPri) return 1;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                  })}
                  users={users}
                  currentUser={activeUser}
                  onLikeReel={handleLikeReel}
                />
              </motion.div>
            )}

            {activeTab === "messages" && (
              <motion.div
                key="messages"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <MessagesView
                  messages={messages}
                  users={users}
                  currentUser={activeUser}
                  onSendMessage={handleSendMessage}
                  onInitiateCall={handleInitiateCall}
                />
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <NotificationsView
                  notifications={notifications}
                  onClearAll={handleClearNotifications}
                  onReadNotification={handleReadNotification}
                />
              </motion.div>
            )}

            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <ProfileView
                  currentUser={activeUser}
                  onUpdateProfile={handleUpdateProfile}
                  posts={posts}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* FULLSCREEN AUDIO/VIDEO WEBRTC CALLING PORTAL */}
      <AnimatePresence>
        {currentCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <CallInterface
              currentCall={currentCall}
              currentUser={activeUser}
              contact={users.find(u => u.id === (currentCall.senderId === activeUser.id ? currentCall.receiverId : currentCall.senderId)) || {
                id: "unknown",
                username: "unknown",
                fullName: "Utilisateur inconnu",
                avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
                bio: "",
                followersCount: 0,
                followingCount: 0,
                postsCount: 0
              }}
              onEndCall={handleEndCall}
              onAcceptCall={handleAcceptCall}
              onDeclineCall={handleDeclineCall}
              onCallSessionUpdate={setCurrentCall}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
