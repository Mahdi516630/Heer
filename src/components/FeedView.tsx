import React, { useState } from "react";
import { Post, Comment, User } from "../types";
import { Heart, MessageCircle, Send, MapPin, Share2, Plus, Image as ImageIcon, Smile, ShieldCheck, HelpCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FeedViewProps {
  posts: Post[];
  users: User[];
  currentUser: User;
  onLikePost: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onAddPost: (content: string, mediaUrl: string, location?: string) => void;
}

const PRESET_WALLPAPERS = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800", // abstract flowing pink
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800", // warm spectrum gradient
  "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800", // beautiful neon liquid
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800", // luxury dark neon lines
  "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=800", // colorful sky silhouette
];

export default function FeedView({
  posts,
  users,
  currentUser,
  onLikePost,
  onAddComment,
  onAddPost,
}: FeedViewProps) {
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostLocation, setNewPostLocation] = useState("");
  const [selectedWallpaper, setSelectedWallpaper] = useState(PRESET_WALLPAPERS[0]);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState("");
  
  // Track open comment trays
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<{ [postId: string]: string }>({});

  const handleSubmitPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const finalMedia = customPhotoUrl.trim() || selectedWallpaper;
    onAddPost(newPostContent, finalMedia, newPostLocation || undefined);
    
    // Reset
    setNewPostContent("");
    setNewPostLocation("");
    setCustomPhotoUrl("");
    setShowPhotoPicker(false);
  };

  const handleCommentSubmit = (postId: string) => {
    const text = commentInput[postId];
    if (!text || !text.trim()) return;

    onAddComment(postId, text);
    setCommentInput(prev => ({ ...prev, [postId]: "" }));
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-24 font-sans text-neutral-50 px-4 md:px-0">
      
      {/* 1. STORIES BOX - INSTAGRAM INPIRED */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 overflow-x-auto flex gap-4 scrollbar-none shadow-sm mt-2">
        {/* User Story */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer">
          <div className="relative">
            <img
              src={currentUser.avatarUrl}
              alt="Moi"
              className="w-14 h-14 rounded-full border border-neutral-800 object-cover"
            />
            <div className="absolute bottom-0 right-0 bg-pink-500 rounded-full p-1 border-2 border-neutral-950">
              <Plus className="w-3.5 h-3.5 text-white stroke-[3px]" />
            </div>
          </div>
          <span className="text-[11px] font-medium text-neutral-400">Moi</span>
        </div>

        {/* Other Users' Stories */}
        {users.filter(u => u.id !== currentUser.id).map(u => (
          <div key={u.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
            <div className="p-[2px] rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 group-hover:scale-105 transition-all duration-200">
              <img
                src={u.avatarUrl}
                alt={u.fullName}
                className="w-13 h-13 rounded-full border border-neutral-950 object-cover"
              />
            </div>
            <span className="text-[11px] font-medium text-neutral-400 group-hover:text-white transition-colors">
              {u.username}
            </span>
          </div>
        ))}
      </div>

      {/* 2. FACEBOOK-STYLE POST CREATOR */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 shadow-sm">
        <form onSubmit={handleSubmitPost} className="flex flex-col gap-4">
          <div className="flex items-start gap-3.5">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.fullName}
              className="w-10 h-10 rounded-full object-cover border border-neutral-800"
            />
            <div className="flex-1">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder={`Quoi de neuf, ${currentUser.fullName} ? Partagez chiffré !`}
                className="w-full bg-transparent border-0 placeholder-neutral-500 focus:ring-0 text-sm focus:outline-none resize-none pt-2 h-16 min-h-[4rem]"
              />
            </div>
          </div>

          {/* Expanded photo selection visualizer */}
          {(showPhotoPicker || customPhotoUrl) && (
            <div className="border border-neutral-800 rounded-xl p-3 bg-neutral-900 flex flex-col gap-3">
              <span className="text-xs font-mono text-neutral-400 uppercase">Image de la publication</span>
              
              <div className="flex flex-wrap gap-2">
                {PRESET_WALLPAPERS.map((wall, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSelectedWallpaper(wall);
                      setCustomPhotoUrl("");
                    }}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-transform hover:scale-105 ${
                      selectedWallpaper === wall && !customPhotoUrl ? "border-indigo-500 scale-105" : "border-transparent"
                    }`}
                  >
                    <img src={wall} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">Ou URL :</span>
                <input
                  type="text"
                  placeholder="https://..."
                  value={customPhotoUrl}
                  onChange={(e) => {
                    setCustomPhotoUrl(e.target.value);
                    setSelectedWallpaper("");
                  }}
                  className="flex-1 bg-neutral-950 border border-neutral-800 font-mono text-xs rounded px-2.5 py-1 text-neutral-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Live Preview */}
              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-neutral-800">
                <img
                  src={customPhotoUrl || selectedWallpaper}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <div className="border-t border-neutral-900 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {/* Toggle Photo Picker */}
              <button
                type="button"
                onClick={() => setShowPhotoPicker(!showPhotoPicker)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  showPhotoPicker || customPhotoUrl ? "bg-pink-500/10 text-pink-400" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Photo</span>
              </button>

              {/* Add Location Input */}
              <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs">
                <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Lieu (optionnel)"
                  value={newPostLocation}
                  onChange={(e) => setNewPostLocation(e.target.value)}
                  className="bg-transparent border-none text-neutral-300 placeholder-neutral-600 focus:outline-none text-[11px] w-24 focus:w-36 transition-all duration-300"
                />
              </div>
            </div>

            <button
              id="feed-publish-btn"
              type="submit"
              disabled={!newPostContent.trim()}
              className={`px-5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-md ${
                newPostContent.trim()
                  ? "bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white cursor-pointer hover:opacity-90"
                  : "bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-800"
              }`}
            >
              Publier
            </button>
          </div>
        </form>
      </div>

      {/* 3. OPTIMIZED PHOTO STREAM LIST */}
      <div className="flex flex-col gap-6">
        <AnimatePresence mode="popLayout">
          {[...posts].sort((a, b) => {
            const aUser = users.find(u => u.id === a.userId);
            const bUser = users.find(u => u.id === b.userId);
            const aPri = aUser?.email?.toLowerCase() === "mahdiyacoubali2004@gmail.com";
            const bPri = bUser?.email?.toLowerCase() === "mahdiyacoubali2004@gmail.com";
            if (aPri && !bPri) return -1;
            if (!aPri && bPri) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }).map((post) => {
            const hasLiked = post.likes.includes(currentUser.id);
            const isCommentsOpen = openCommentsPostId === post.id;
            const postUser = users.find(u => u.id === post.userId);
            const isPriorityPost = postUser?.email?.toLowerCase() === "mahdiyacoubali2004@gmail.com";
            
            return (
              <motion.article
                key={post.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-neutral-950 border rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${
                  isPriorityPost
                    ? "border-pink-500/50 shadow-md shadow-pink-500/5 ring-1 ring-pink-500/10"
                    : "border-neutral-800"
                }`}
              >
                {/* Post Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-900">
                  <div className="flex items-center gap-3">
                    <div className="relative cursor-pointer">
                      <img
                        src={post.userAvatar}
                        alt={post.username}
                        className="w-9 h-9 rounded-full object-cover border border-neutral-800"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold hover:text-pink-500 cursor-pointer transition-colors leading-tight">
                        {post.username}
                      </span>
                      {post.location && (
                        <span className="text-[10px] text-neutral-500 flex items-center gap-0.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-neutral-600" />
                          {post.location}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isPriorityPost && (
                      <span className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm select-none border border-pink-400/20 animate-pulse">
                        <Sparkles className="w-3 h-3" />
                        <span>MEMBRE PRIORITAIRE (HEER)</span>
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-neutral-600">
                      {new Date(post.createdAt).toLocaleDateString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                </div>

                {/* Post Content */}
                <div className="px-4 pt-3.5 pb-2">
                  <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Post Media - Photo optimized */}
                {post.mediaUrl && (
                  <div className="relative aspect-square w-full bg-neutral-900 overflow-hidden border-y border-neutral-900">
                    <img
                      src={post.mediaUrl}
                      alt="post media"
                      className="w-full h-full object-cover select-none"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Post Actions (Likes, comments counter, share) */}
                <div className="p-3.5 flex items-center justify-between border-t border-neutral-900 text-neutral-300">
                  <div className="flex items-center gap-5">
                    {/* Like button */}
                    <button
                      id={`post-like-btn-${post.id}`}
                      onClick={() => onLikePost(post.id)}
                      className={`flex items-center gap-1.5 transition-all text-xs hover:text-white ${
                        hasLiked ? "text-red-500 hover:text-red-400 scale-105" : ""
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${hasLiked ? "fill-red-500 text-red-500" : "text-neutral-400"}`} />
                      <span className="font-semibold">{post.likesCount || 0}</span>
                    </button>

                    {/* Comments toggle */}
                    <button
                      id={`post-comments-toggle-${post.id}`}
                      onClick={() => setOpenCommentsPostId(isCommentsOpen ? null : post.id)}
                      className={`flex items-center gap-1.5 transition-all text-xs hover:text-pink-500 ${
                        isCommentsOpen ? "text-pink-500" : "text-neutral-400"
                      }`}
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-semibold">{post.comments.length}</span>
                    </button>
                  </div>

                  {/* Share button (visual toggle or mock copy link) */}
                  <button
                    id={`post-share-btn-${post.id}`}
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                    }}
                    className="flex items-center gap-1 text-neutral-400 hover:text-pink-500 transition-colors text-xs active:scale-95"
                  >
                    <Share2 className="w-4.5 h-4.5" />
                    <span className="hidden sm:inline">Copier le lien</span>
                  </button>
                </div>

                {/* Comments Expandable Tray */}
                {isCommentsOpen && (
                  <div className="bg-neutral-950/40 border-t border-neutral-900/80 px-4 py-3.5 flex flex-col gap-3.5">
                    
                    {/* Add comment input */}
                    <div className="flex items-center gap-3">
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.username}
                        className="w-7 h-7 rounded-full object-cover border border-neutral-900"
                      />
                      <div className="flex-1 flex bg-neutral-900 border border-neutral-800 rounded-full px-3.5 py-1.5 items-center">
                        <input
                          type="text"
                          placeholder="Écrire un commentaire..."
                          value={commentInput[post.id] || ""}
                          onChange={(e) =>
                            setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))
                          }
                          onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit(post.id)}
                          className="bg-transparent border-none text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none flex-1"
                        />
                        <button
                          id={`post-comment-send-${post.id}`}
                          onClick={() => handleCommentSubmit(post.id)}
                          disabled={!(commentInput[post.id] || "").trim()}
                          className={`p-1 rounded-full transition-colors ${
                            (commentInput[post.id] || "").trim()
                              ? "text-pink-500 hover:text-pink-400 cursor-pointer"
                              : "text-neutral-700"
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Thread comments */}
                    <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-1">
                      {post.comments.length === 0 ? (
                        <p className="text-[11px] font-mono text-neutral-600 text-center py-2">Aucun commentaire pour le moment. Laissez le premier !</p>
                      ) : (
                        post.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-2.5 items-start text-xs">
                            <img
                              src={comment.userAvatar}
                              alt={comment.username}
                              className="w-6.5 h-6.5 rounded-full object-cover border border-neutral-900 mt-0.5"
                            />
                            <div className="flex-1 bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-800/55">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="font-semibold text-neutral-300">@{comment.username}</span>
                                <span className="text-[9px] font-mono text-neutral-600">
                                  {new Date(comment.createdAt).toLocaleTimeString(undefined, {
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </span>
                              </div>
                              <p className="text-neutral-400 font-sans">{comment.text}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>

    </div>
  );
}
