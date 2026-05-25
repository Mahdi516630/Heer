import { Home, Compass, Film, MessageCircle, Heart, User, Bell, Shield, LogOut, Sparkles, Mail, Video, MessageSquare } from "lucide-react";

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  currentUser: {
    username: string;
    avatarUrl: string;
    fullName: string;
  };
  onLogout: () => void;
}

export default function Navigation({
  activeTab,
  setActiveTab,
  unreadMessagesCount,
  unreadNotificationsCount,
  currentUser,
  onLogout
}: NavigationProps) {
  
  const navItems = [
    { id: "feed", label: "Actualités", icon: Home },
    { id: "reels", label: "Reels", icon: Film },
    { id: "messages", label: "Messages", icon: MessageCircle, badge: unreadMessagesCount },
    { id: "gmail", label: "Gmail", icon: Mail },
    { id: "meet", label: "Google Meet", icon: Video },
    { id: "chat", label: "Google Chat", icon: MessageSquare },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadNotificationsCount },
    { id: "profile", label: "Profil", icon: User }
  ];

  return (
    <>
      {/* SIDEBAR FOR DESKTOP (md and up) */}
      <aside className="hidden md:flex flex-col justify-between w-[240px] h-screen border-r border-neutral-800 bg-black p-5 fixed left-0 top-0 font-sans z-30">
        <div className="flex flex-col gap-8">
          {/* App title / Brand */}
          <div className="flex flex-col gap-1 px-2 py-4">
            <h1 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 bg-clip-text text-transparent uppercase">
              HEER.
            </h1>
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
              Hybrid // Secure
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map(item => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  id={`nav-desktop-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                    isActive
                      ? "bg-neutral-900 border-l-2 border-pink-500 text-white font-semibold"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <IconComp className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${isActive ? "text-pink-500" : "text-neutral-400 group-hover:text-white"}`} />
                    <span className="text-sm tracking-wide">{item.label}</span>
                  </div>
                  
                  {item.badge && item.badge > 0 ? (
                    <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card at bottom of sidebar */}
        <div className="border-t border-neutral-800 pt-5 flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[1px] blur-[1px] opacity-70" />
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.username}
                className="w-9 h-9 rounded-full border border-neutral-800 object-cover relative z-10"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate text-white">{currentUser.fullName}</span>
              <span className="text-xs text-neutral-500 truncate font-mono">@{currentUser.username}</span>
            </div>
          </div>
          
          <div className="bg-neutral-900 rounded-xl p-3.5 flex flex-col items-center border border-neutral-800">
            <Shield className="w-5 h-5 text-emerald-500 mb-2" />
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-3">E2EE Active</span>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-red-500/30 text-red-500 bg-red-500/5 hover:bg-red-500/10 transition-colors text-xs font-mono font-bold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>DÉCONNEXION</span>
            </button>
          </div>
        </div>
      </aside>

      {/* BOTTOM NAVIGATION FOR MOBILE (md and below) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-neutral-800 flex items-center justify-between overflow-x-auto gap-3.5 px-6 z-40 font-sans scrollbar-none">
        {navItems.map(item => {
          const IconComp = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-mobile-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center w-12 h-12 relative group shrink-0"
            >
              <IconComp className={`w-5.5 h-5.5 transition-colors ${isActive ? "text-pink-500" : "text-neutral-400"}`} />
              
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-pink-500" />
              )}

              {item.badge && item.badge > 0 ? (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-mono font-bold h-4 min-w-4 flex items-center justify-center px-1 rounded-full shadow-md">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* MOBILE BRAND HEADER */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-black border-b border-neutral-800 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 bg-clip-text text-transparent uppercase font-sans">
            HEER.
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button id="mobile-top-notif" onClick={() => setActiveTab("notifications")} className="p-1 relative">
            <Bell className="w-5 h-5 text-neutral-300" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black" />
            )}
          </button>
          <button onClick={onLogout} className="p-1 text-red-500 transition-colors cursor-pointer" title="Se déconnecter">
            <LogOut className="w-4.5 h-4.5" />
          </button>
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.username}
            onClick={() => setActiveTab("profile")}
            className="w-7 h-7 rounded-full border border-neutral-800 object-cover cursor-pointer"
          />
        </div>
      </header>
    </>
  );
}
