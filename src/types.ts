export interface User {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  publicKey?: string; // Hex coordinates or JWK for client-side E2EE
  email?: string;
  password?: string;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likes: string[]; // List of userIds who liked it
  comments: Comment[];
  createdAt: string;
  location?: string;
  likesCount: number;
}

export interface Reel {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  videoUrl: string;
  caption: string;
  likes: string[];
  commentsCount: number;
  musicName: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  encryptedText: string; // E2EE data
  iv: string; // AES-GCM IV in hexadecimal
  isEncrypted: boolean;
  createdAt: string;
  isFile?: boolean;
  fileData?: string; // base64 or placeholderURL
  fileName?: string;
  fileSize?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'call' | 'key_exchange' | 'system';
  title: string;
  body: string;
  senderId: string;
  senderUsername: string;
  senderAvatar: string;
  createdAt: string;
  read: boolean;
  linkTo?: string;
}

export interface CallSignal {
  type: 'offer' | 'answer' | 'candidate' | 'hangup';
  sdp?: string;
  candidate?: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
  senderId: string;
}

export interface CallSession {
  id: string;
  senderId: string;
  receiverId: string;
  type: 'audio' | 'video';
  status: 'idle' | 'calling' | 'ringing' | 'connected' | 'declined' | 'ended';
  createdAt: string;
  signals: CallSignal[];
}
