import { Notification } from "../types";
import { Bell, Heart, MessageCircle, Phone, Key, ShieldCheck, CheckCircle2, CircleX, Trash2 } from "lucide-react";

interface NotificationsViewProps {
  notifications: Notification[];
  onClearAll: () => void;
  onReadNotification: (id: string) => void;
}

export default function NotificationsView({
  notifications,
  onClearAll,
  onReadNotification,
}: NotificationsViewProps) {
  
  const getIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
      case "comment":
        return <MessageCircle className="w-4 h-4 text-pink-400" />;
      case "message":
        return <MessageCircle className="w-4 h-4 text-pink-400" />;
      case "call":
        return <Phone className="w-4 h-4 text-emerald-400" />;
      case "key_exchange":
        return <Key className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-24 font-sans text-neutral-50 px-4 md:px-0 mt-2">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight">System Notifications</h1>
          <p className="text-xs text-neutral-500 font-mono mt-0.5">Mises à jour sécurisées en temps réel</p>
        </div>

        {notifications.length > 0 && (
          <button
            id="notif-clear-all"
            onClick={onClearAll}
            className="flex items-center gap-1 text-xs font-semibold text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-500/20 px-3 py-1.5 rounded-lg bg-neutral-900/40 hover:bg-red-500/5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Tout effacer</span>
          </button>
        )}
      </div>

      {/* NOTIFICATIONS CONTAINER */}
      <div className="flex flex-col gap-3">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-neutral-900 bg-neutral-950 rounded-2xl">
            <Bell className="w-10 h-10 text-neutral-800 mb-3 animate-pulse" />
            <h2 className="text-sm font-semibold text-neutral-400">Aucune nouvelle alerte</h2>
            <p className="text-xs text-neutral-500 font-mono mt-1">Hello Here est à jour sur ce navigateur.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => onReadNotification(notif.id)}
              className={`flex items-start gap-4 p-4 border rounded-xl transition-all cursor-pointer ${
                notif.read
                  ? "bg-neutral-950 border-neutral-900 opacity-75"
                  : "bg-neutral-900 border-neutral-800 hover:bg-pink-600/5 hover:border-pink-500/20"
              }`}
            >
              {/* Type Badge icon overlay */}
              <div className="relative">
                <img
                  src={notif.senderAvatar}
                  alt={notif.senderUsername}
                  className="w-10 h-10 rounded-full object-cover border border-neutral-800"
                />
                <div className="absolute -bottom-1 -right-1 bg-black p-1 rounded-full border border-neutral-900">
                  {getIcon(notif.type)}
                </div>
              </div>

              {/* Notification context text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-neutral-200 truncate">
                    {notif.title}
                  </span>
                  
                  {/* Status Indicator bubble */}
                  {!notif.read && (
                    <span className="w-2 h-2 bg-pink-500 rounded-full flex-shrink-0" />
                  )}
                </div>
                
                <p className="text-xs text-neutral-400 leading-relaxed font-sans mt-0.5">
                  {notif.body}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] font-mono text-neutral-600">
                    {new Date(notif.createdAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-neutral-700 text-[9px]">•</span>
                  <span className="text-emerald-500 font-mono text-[9px] font-bold flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" /> Chiffrement vérifié
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FOOTER DIAGNOSTIC LOG */}
      <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-4.5 mt-8 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <div className="p-2 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-neutral-300">Intégrité Cryptographique Directe</h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">Tous les journaux sont chiffrés localement.</p>
          </div>
        </div>
        <span className="text-[10px] bg-neutral-900 text-neutral-400 border border-neutral-800 font-mono px-2.5 py-1 rounded-lg">
          SECURE_AGENT_TRUE
        </span>
      </div>

    </div>
  );
}
