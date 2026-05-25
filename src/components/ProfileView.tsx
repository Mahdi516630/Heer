import { useState } from "react";
import { User, Post } from "../types";
import { Settings2, ShieldCheck, Grid, List, Save, Sparkles, Key, Check } from "lucide-react";

interface ProfileViewProps {
  currentUser: User;
  onUpdateProfile: (fullName: string, username: string, bio: string) => void;
  posts: Post[];
}

export default function ProfileView({
  currentUser,
  onUpdateProfile,
  posts,
}: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState(currentUser.fullName);
  const [editUsername, setEditUsername] = useState(currentUser.username);
  const [editBio, setEditBio] = useState(currentUser.bio);
  
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');
  const [copiedKey, setCopiedKey] = useState(false);

  // Filter posts created by the current user
  const userPosts = posts.filter(p => p.userId === currentUser.id || p.username === currentUser.username);

  const handleSave = () => {
    onUpdateProfile(editFullName, editUsername, editBio);
    setIsEditing(false);
  };

  const mockClientPrivateKey = `HELLO_HERE_ECDH_PRIV_KEY_${currentUser.id.toUpperCase()}_PEM_MOCK_2026_BLOCK_CIPHER_GCM_SECRET`;

  const copyPublicKey = () => {
    navigator.clipboard.writeText(mockClientPrivateKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 font-sans text-neutral-50 px-4 md:px-0 mt-2">
      
      {/* 1. HERO HEADER AREA */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10 pb-8 border-b border-neutral-900">
        
        {/* Glowing Aura Avatar */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 blur-[3px] opacity-80" />
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.fullName}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-neutral-950 object-cover relative z-10"
          />
        </div>

        {/* User Stats and Bio */}
        <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
          
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
            <h1 className="text-xl font-bold tracking-tight">@{currentUser.username}</h1>
            
            <div className="flex items-center gap-2">
              <button
                id="profile-edit-toggle"
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                {isEditing ? "Annuler" : "Modifier le profil"}
              </button>
              <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-2 rounded-lg" title="Clé cryptographique validée">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Followers counts grid */}
          <div className="flex gap-8 mb-5 text-sm">
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-extrabold text-neutral-200">{currentUser.postsCount || userPosts.length}</span>
              <span className="text-[10px] text-neutral-500 uppercase font-mono mt-0.5">Publications</span>
            </div>
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-extrabold text-neutral-200">{currentUser.followersCount}</span>
              <span className="text-[10px] text-neutral-500 uppercase font-mono mt-0.5">Abonnés</span>
            </div>
            <div className="flex flex-col items-center sm:items-start">
              <span className="font-extrabold text-neutral-200">{currentUser.followingCount}</span>
              <span className="text-[10px] text-neutral-500 uppercase font-mono mt-0.5">Abonnements</span>
            </div>
          </div>

          {/* BIO DETAILS (Normal vs Editing Mode) */}
          {!isEditing ? (
            <div className="flex flex-col">
              <span className="font-bold text-neutral-200 text-sm mb-1">{currentUser.fullName}</span>
              <p className="text-neutral-400 text-xs leading-relaxed whitespace-pre-line font-sans max-w-sm">
                {currentUser.bio}
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-3 bg-neutral-900/60 p-4 border border-neutral-805 rounded-xl text-left">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 font-mono uppercase">Nom complet</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 font-mono uppercase">Nom d'utilisateur</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-500 font-mono uppercase">Biographie</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-pink-500 h-16 resize-none"
                />
              </div>
              
              <button
                id="profile-save-btn"
                onClick={handleSave}
                className="w-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 hover:opacity-90 transition-all mt-2"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Enregistrer</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. CRYPTO LOCK EMBED */}
      <div className="mt-6 mb-8 p-4 bg-neutral-950 border border-neutral-900 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 border border-pink-500/20 bg-pink-500/10 text-pink-500 rounded-xl mt-1 sm:mt-0">
            <Key className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-neutral-300">Clé privée de déchiffrement Hello Here</h3>
            <p className="text-[10px] text-neutral-500 font-mono truncate max-w-[280px] sm:max-w-md mt-0.5">
              {mockClientPrivateKey}
            </p>
          </div>
        </div>
        <button
          onClick={copyPublicKey}
          className="text-[10px] text-pink-500 border border-pink-500/20 bg-pink-500/5 px-3 py-1.5 rounded-lg hover:bg-pink-500/10 transition-colors flex items-center gap-1.5 font-semibold shrink-0 cursor-pointer"
        >
          {copiedKey ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copié !</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Copier la clé PEM</span>
            </>
          )}
        </button>
      </div>

      {/* 3. GRID VS LIST TOGGLERS */}
      <div className="flex items-center justify-center border-b border-neutral-900 mb-6 gap-8">
        <button
          onClick={() => setViewMode('grid')}
          className={`pb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
            viewMode === 'grid' ? "border-b-2 border-white text-white" : "text-neutral-500 hover:text-white"
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Grille photos</span>
        </button>
        <button
          onClick={() => setViewMode('feed')}
          className={`pb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
            viewMode === 'feed' ? "border-b-2 border-white text-white" : "text-neutral-500 hover:text-white"
          }`}
        >
          <List className="w-4 h-4" />
          <span>Flux publications</span>
        </button>
      </div>

      {/* 4. USER POSTS VIEWER */}
      {userPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-neutral-900 bg-neutral-950/40 rounded-2xl font-mono">
          <Grid className="w-8 h-8 text-neutral-800 mb-2" />
          <p className="text-xs text-neutral-500">Aucune publication pour le moment.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* INSTAGRAM-STYLE PHOTO GRID */
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {userPosts.map((post) => (
            <div key={post.id} className="relative aspect-square bg-neutral-900 overflow-hidden group cursor-pointer border border-neutral-800/20 hover:brightness-110 rounded-lg">
              <img
                src={post.mediaUrl}
                alt="uploaded"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1 text-white">❤️ {post.likesCount}</span>
                <span className="flex items-center gap-1 text-white">💬 {post.comments.length}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* FACEBOOK-STYLE INDIVIDUAL ROW */
        <div className="flex flex-col gap-6">
          {userPosts.map((post) => (
            <div key={post.id} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-neutral-300">@{post.username}</span>
                <span className="text-neutral-500 font-mono">{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-neutral-200">{post.content}</p>
              {post.mediaUrl && (
                <img src={post.mediaUrl} alt="uploaded row" className="rounded-xl w-full h-48 object-cover object-center border border-neutral-900" />
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
