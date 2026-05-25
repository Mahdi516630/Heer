-- HEER PROTOCOL - NEON POSTGRESQL SCHEMA INITIALIZATION SECURE TEMPLATE
-- COPY AND PASTE THESE QUERIES INTO THE SQL EDITOR OF YOUR NEON CONSOLE (https://console.neon.tech/)

-- Clean up existing tables if editing layout (Caution: deletes all existing data)
DROP TABLE IF EXISTS call_sessions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS reels CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Creation of USERS Table
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  fullName VARCHAR(255) NOT NULL,
  avatarUrl TEXT NOT NULL,
  bio TEXT,
  followersCount INTEGER DEFAULT 0,
  followingCount INTEGER DEFAULT 0,
  postsCount INTEGER DEFAULT 0,
  publicKey TEXT, -- Hex string representation of cryptographic coordinates / Key exchange
  email VARCHAR(255) UNIQUE
);

-- Create index on user email to facilitate ultra-rapid OTP authentication
CREATE INDEX idx_users_email ON users(email);

-- 2. Creation of POSTS Table
CREATE TABLE posts (
  id VARCHAR(255) PRIMARY KEY,
  userId VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  userAvatar TEXT NOT NULL,
  content TEXT NOT NULL,
  mediaUrl TEXT NOT NULL,
  mediaType VARCHAR(50) NOT NULL DEFAULT 'image',
  likes TEXT[] DEFAULT '{}', -- PostgreSQL arrays to hold list of user IDs who liked
  comments JSONB DEFAULT '[]'::jsonb, -- JSONB for rapid structural access 
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  location VARCHAR(255),
  likesCount INTEGER DEFAULT 0
);

-- Index for timeline posts retrieval
CREATE INDEX idx_posts_created_at ON posts(createdAt DESC);

-- 3. Creation of REELS Table (Vertical immersive content)
CREATE TABLE reels (
  id VARCHAR(255) PRIMARY KEY,
  userId VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  userAvatar TEXT NOT NULL,
  videoUrl TEXT NOT NULL,
  caption TEXT NOT NULL,
  likes TEXT[] DEFAULT '{}',
  commentsCount INTEGER DEFAULT 0,
  musicName VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for reel timeline
CREATE INDEX idx_reels_created_at ON reels(createdAt DESC);

-- 4. Creation of MESSAGES Table (End-to-End Encrypted)
CREATE TABLE messages (
  id VARCHAR(255) PRIMARY KEY,
  senderId VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  receiverId VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  encryptedText TEXT NOT NULL,
  iv VARCHAR(255) NOT NULL, -- AES-GCM IV 
  isEncrypted BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  isFile BOOLEAN DEFAULT FALSE,
  fileData TEXT, -- Holds Base64 secure buffers for file sharing
  fileName VARCHAR(255),
  fileSize VARCHAR(255)
);

-- Indexes for bidirectional cryptographic threads lookup
CREATE INDEX idx_messages_thread ON messages(senderId, receiverId);
CREATE INDEX idx_messages_created_at ON messages(createdAt ASC);

-- 5. Creation of NOTIFICATIONS Table
CREATE TABLE notifications (
  id VARCHAR(255) PRIMARY KEY,
  userId VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  senderId VARCHAR(255) NOT NULL,
  senderUsername VARCHAR(255) NOT NULL,
  senderAvatar TEXT NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read BOOLEAN DEFAULT FALSE,
  linkTo TEXT
);

CREATE INDEX idx_notifications_user_read ON notifications(userId, read);

-- 6. Creation of CALL SESSIONS Table (Real-time Video & Audio SIP/SDP signals)
CREATE TABLE call_sessions (
  id VARCHAR(255) PRIMARY KEY,
  senderId VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  receiverId VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  signals JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX idx_call_sessions_active ON call_sessions(senderId, receiverId);
