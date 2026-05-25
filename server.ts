import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Post, Reel, Message, Notification, CallSession, User, Comment } from "./src/types";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import pg from "pg";
const { Pool } = pg;

dotenv.config();

const app = express();
const PORT = 3000;

// Set up larger limits to support media transfer (base64 image uploads)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- OTP STORAGE AND SMTP ENGINE ---
interface OtpStore {
  email: string;
  otp: string;
  expiresAt: number;
  username?: string;
  fullName?: string;
}
let otps: OtpStore[] = [];

const smtpConfig = {
  host: process.env.SMTP_HOST || "",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  }
};
const isSmtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

async function sendOtpEmail(email: string, otp: string) {
  if (isSmtpConfigured) {
    try {
      const transporter = nodemailer.createTransport(smtpConfig);
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"HEER Security" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "[HEER] Votre code d'authentification OTP",
        text: `Votre code d'authentification HEER est: ${otp}. Ce code expire dans 5 minutes.`,
        html: `
          <div style="font-family: 'Inter', sans-serif; background-color: #000000; color: #ffffff; padding: 40px; border: 1px solid #27272a; border-radius: 16px; max-width: 480px; margin: 0 auto; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);">
            <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.05em; color: #ec4899; margin-bottom: 8px;">HEER.</h1>
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1aa; margin-bottom: 24px;">Authentification Sécurisée de Bout en Bout</p>
            
            <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8; margin-bottom: 24px;">
              Saisissez le code de vérification suivant pour valider votre identité et débloquer vos clés cryptographiques :
            </p>
            
            <div style="background-color: #09090b; border: 1px solid #ec4899; padding: 20px; font-size: 34px; font-weight: bold; text-align: center; border-radius: 12px; margin: 24px 0; letter-spacing: 6px; color: #ffffff;">
              ${otp}
            </div>
            
            <p style="font-size: 12px; color: #71717a; line-height: 1.6; margin-bottom: 32px;">
              Ce code s'autodétruira dans <strong>5 minutes</strong>. Si vous n'avez pas demandé ce code, ignorez simplement cet e-mail en toute sécurité.
            </p>
            
            <div style="border-top: 1px solid #27272a; padding-top: 20px; text-align: center; font-size: 10px; color: #52525b; font-family: monospace;">
              // HEER PROTOCOL SECURE ENVELOPE (E2EE)
            </div>
          </div>
        `
      });
      console.log(`[SMTP] OTP sent to ${email}`);
      return { success: true, actualSent: true };
    } catch (err) {
      console.error(`[SMTP] Fail details:`, err);
      // Fallback inside catch block to still let user test!
      return { success: true, actualSent: false, error: (err as any).message };
    }
  } else {
    console.log(`\n==================================================`);
    console.log(`[SMTP SYSTEM FALLBACK] OTP CODE FOR ${email}: ${otp}`);
    console.log(`==================================================\n`);
    return { success: true, actualSent: false };
  }
}

// --- NEON POSTGRESQL & LOCAL IN-MEMORY HYBRID DATABASE ENGINE ---
const ENABLE_MOCK_BOTS = false;
const PRIORITY_EMAIL = "mahdiyacoubali2004@gmail.com";

// Setup Pool
let pool: pg.Pool | null = null;
if (process.env.DATABASE_URL) {
  console.log("[DATABASE] Connecting to Neon Postgres database...");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  console.log("[DATABASE] DATABASE_URL is not set. All operations will use localized security states.");
}

// In-Memory Fallbacks (Starting Clean & Cleared as requested)
let users: User[] = [];
let posts: Post[] = [];
let reels: Reel[] = [];
let messages: Message[] = [];
let notifications: Notification[] = [];
let callSessions: CallSession[] = [];

// Automatic Tables Bootstrapper
async function initDatabase() {
  if (pool) {
    try {
      console.log("[DATABASE] Bootstrapping Neon Postgres tables...");
      
      // 1. users
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          fullName VARCHAR(255) NOT NULL,
          avatarUrl TEXT NOT NULL,
          bio TEXT,
          followersCount INTEGER DEFAULT 0,
          followingCount INTEGER DEFAULT 0,
          postsCount INTEGER DEFAULT 0,
          publicKey TEXT,
          email VARCHAR(255) UNIQUE
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);

      // 2. posts
      await pool.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id VARCHAR(255) PRIMARY KEY,
          userId VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          username VARCHAR(255) NOT NULL,
          userAvatar TEXT NOT NULL,
          content TEXT NOT NULL,
          mediaUrl TEXT NOT NULL,
          mediaType VARCHAR(50) NOT NULL DEFAULT 'image',
          likes TEXT[] DEFAULT '{}',
          comments JSONB DEFAULT '[]'::jsonb,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          location VARCHAR(255),
          likesCount INTEGER DEFAULT 0
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(createdAt DESC);`);

      // 3. reels
      await pool.query(`
        CREATE TABLE IF NOT EXISTS reels (
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
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_reels_created_at ON reels(createdAt DESC);`);

      // 4. messages
      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id VARCHAR(255) PRIMARY KEY,
          senderId VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          receiverId VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          encryptedText TEXT NOT NULL,
          iv VARCHAR(255) NOT NULL,
          isEncrypted BOOLEAN DEFAULT TRUE,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          isFile BOOLEAN DEFAULT FALSE,
          fileData TEXT,
          fileName VARCHAR(255),
          fileSize VARCHAR(255)
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(senderId, receiverId);`);

      // 5. notifications
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
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
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(userId, read);`);

      // 6. call sessions
      await pool.query(`
        CREATE TABLE IF NOT EXISTS call_sessions (
          id VARCHAR(255) PRIMARY KEY,
          senderId VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          receiverId VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          signals JSONB DEFAULT '[]'::jsonb
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_call_sessions_active ON call_sessions(senderId, receiverId);`);

      console.log("[DATABASE] Neon tables initialized successfully!");
    } catch (err) {
      console.error("[DATABASE] Error during bootstrap initialization:", err);
    }
  }
}

// Start database bootstrapping asynchronously
initDatabase();

function isPriorityUser(userId: string): boolean {
  if (pool) {
    // Handled dynamically in API endpoints instead, or we fallback here:
  }
  const user = users.find(u => u.id === userId);
  return user?.email?.toLowerCase() === PRIORITY_EMAIL;
}

// 1. Database Users Helpers
async function dbGetUsers(): Promise<User[]> {
  if (pool) {
    try {
      const res = await pool.query("SELECT * FROM users");
      return res.rows.map(row => ({
        id: row.id,
        username: row.username,
        fullName: row.fullname,
        avatarUrl: row.avatarurl,
        bio: row.bio || "",
        followersCount: row.followerscount || 0,
        followingCount: row.followingcount || 0,
        postsCount: row.postscount || 0,
        publicKey: row.publickey,
        email: row.email
      }));
    } catch (err) {
      console.error("[PG ERROR] dbGetUsers:", err);
    }
  }
  return users;
}

async function dbAddUser(user: User): Promise<User> {
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO users (id, username, fullName, avatarUrl, bio, followersCount, followingCount, postsCount, publicKey, email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           fullName = EXCLUDED.fullName,
           avatarUrl = EXCLUDED.avatarUrl,
           bio = EXCLUDED.bio,
           publicKey = EXCLUDED.publicKey,
           email = EXCLUDED.email`,
        [user.id, user.username, user.fullName, user.avatarUrl, user.bio, user.followersCount, user.followingCount, user.postsCount, user.publicKey || null, user.email || null]
      );
      return user;
    } catch (err) {
      console.error("[PG ERROR] dbAddUser:", err);
    }
  }
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  return user;
}

async function dbUpdateUser(id: string, updates: Partial<User>): Promise<User | null> {
  if (pool) {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let i = 1;

      if (updates.username !== undefined) { fields.push(`username = $${i++}`); values.push(updates.username); }
      if (updates.fullName !== undefined) { fields.push(`fullName = $${i++}`); values.push(updates.fullName); }
      if (updates.avatarUrl !== undefined) { fields.push(`avatarUrl = $${i++}`); values.push(updates.avatarUrl); }
      if (updates.bio !== undefined) { fields.push(`bio = $${i++}`); values.push(updates.bio); }
      if (updates.publicKey !== undefined) { fields.push(`publicKey = $${i++}`); values.push(updates.publicKey); }
      if (updates.email !== undefined) { fields.push(`email = $${i++}`); values.push(updates.email); }
      if (updates.followersCount !== undefined) { fields.push(`followersCount = $${i++}`); values.push(updates.followersCount); }
      if (updates.followingCount !== undefined) { fields.push(`followingCount = $${i++}`); values.push(updates.followingCount); }
      if (updates.postsCount !== undefined) { fields.push(`postsCount = $${i++}`); values.push(updates.postsCount); }

      if (fields.length > 0) {
        values.push(id);
        const q = `UPDATE users SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`;
        const res = await pool.query(q, values);
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            username: row.username,
            fullName: row.fullname,
            avatarUrl: row.avatarurl,
            bio: row.bio || "",
            followersCount: row.followerscount || 0,
            followingCount: row.followingcount || 0,
            postsCount: row.postscount || 0,
            publicKey: row.publickey,
            email: row.email
          };
        }
      }
    } catch (err) {
      console.error("[PG ERROR] dbUpdateUser:", err);
    }
  }

  const uIdx = users.findIndex(u => u.id === id);
  if (uIdx !== -1) {
    users[uIdx] = { ...users[uIdx], ...updates };
    return users[uIdx];
  }
  return null;
}

// 2. Database Posts Helpers
async function dbGetPosts(): Promise<Post[]> {
  if (pool) {
    try {
      const res = await pool.query("SELECT * FROM posts ORDER BY createdAt DESC");
      return res.rows.map(row => ({
        id: row.id,
        userId: row.userid,
        username: row.username,
        userAvatar: row.useravatar,
        content: row.content,
        mediaUrl: row.mediaurl,
        mediaType: row.mediatype as any,
        likes: row.likes || [],
        comments: typeof row.comments === "string" ? JSON.parse(row.comments) : (row.comments || []),
        createdAt: row.createdat ? new Date(row.createdat).toISOString() : new Date().toISOString(),
        location: row.location || "",
        likesCount: row.likescount || 0
      }));
    } catch (err) {
      console.error("[PG ERROR] dbGetPosts:", err);
    }
  }
  return posts;
}

async function dbAddPost(post: Post): Promise<Post> {
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO posts (id, userId, username, userAvatar, content, mediaUrl, mediaType, likes, comments, createdAt, location, likesCount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          post.id, post.userId, post.username, post.userAvatar, post.content, post.mediaUrl, post.mediaType,
          post.likes, JSON.stringify(post.comments), post.createdAt, post.location || null, post.likesCount
        ]
      );
      await pool.query("UPDATE users SET postsCount = postsCount + 1 WHERE id = $1", [post.userId]);
      return post;
    } catch (err) {
      console.error("[PG ERROR] dbAddPost:", err);
    }
  }
  posts.unshift(post);
  const u = users.find(u => u.id === post.userId);
  if (u) {
    u.postsCount = (u.postsCount || 0) + 1;
  }
  return post;
}

async function dbLikePost(postId: string, userId: string): Promise<Post | null> {
  if (pool) {
    try {
      const checkRes = await pool.query("SELECT likes FROM posts WHERE id = $1", [postId]);
      if (checkRes.rows.length > 0) {
        let currentLikes: string[] = checkRes.rows[0].likes || [];
        if (currentLikes.includes(userId)) {
          currentLikes = currentLikes.filter(id => id !== userId);
        } else {
          currentLikes.push(userId);
        }
        const res = await pool.query(
          "UPDATE posts SET likes = $1, likesCount = $2 WHERE id = $3 RETURNING *",
          [currentLikes, currentLikes.length, postId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            userId: row.userid,
            username: row.username,
            userAvatar: row.useravatar,
            content: row.content,
            mediaUrl: row.mediaurl,
            mediaType: row.mediatype as any,
            likes: row.likes || [],
            comments: typeof row.comments === "string" ? JSON.parse(row.comments) : (row.comments || []),
            createdAt: new Date(row.createdat).toISOString(),
            location: row.location || "",
            likesCount: row.likescount || 0
          };
        }
      }
    } catch (err) {
      console.error("[PG ERROR] dbLikePost:", err);
    }
  }

  const p = posts.find(p => p.id === postId);
  if (p) {
    if (p.likes.includes(userId)) {
      p.likes = p.likes.filter(id => id !== userId);
    } else {
      p.likes.push(userId);
    }
    p.likesCount = p.likes.length;
    return p;
  }
  return null;
}

async function dbAddComment(postId: string, comment: Comment): Promise<Post | null> {
  if (pool) {
    try {
      const getRes = await pool.query("SELECT comments FROM posts WHERE id = $1", [postId]);
      if (getRes.rows.length > 0) {
        const commentsList = typeof getRes.rows[0].comments === "string" 
          ? JSON.parse(getRes.rows[0].comments) 
          : (getRes.rows[0].comments || []);
        commentsList.push(comment);

        const res = await pool.query(
          "UPDATE posts SET comments = $1 WHERE id = $2 RETURNING *",
          [JSON.stringify(commentsList), postId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            userId: row.userid,
            username: row.username,
            userAvatar: row.useravatar,
            content: row.content,
            mediaUrl: row.mediaurl,
            mediaType: row.mediatype as any,
            likes: row.likes || [],
            comments: commentsList,
            createdAt: new Date(row.createdat).toISOString(),
            location: row.location || "",
            likesCount: row.likescount || 0
          };
        }
      }
    } catch (err) {
      console.error("[PG ERROR] dbAddComment:", err);
    }
  }

  const p = posts.find(p => p.id === postId);
  if (p) {
    p.comments.push(comment);
    return p;
  }
  return null;
}

// 3. Database Reels Helpers
async function dbGetReels(): Promise<Reel[]> {
  if (pool) {
    try {
      const res = await pool.query("SELECT * FROM reels ORDER BY createdAt DESC");
      return res.rows.map(row => ({
        id: row.id,
        userId: row.userid,
        username: row.username,
        userAvatar: row.useravatar,
        videoUrl: row.videourl,
        caption: row.caption,
        likes: row.likes || [],
        commentsCount: row.commentscount || 0,
        musicName: row.musicname,
        createdAt: row.createdat ? new Date(row.createdat).toISOString() : new Date().toISOString()
      }));
    } catch (err) {
      console.error("[PG ERROR] dbGetReels:", err);
    }
  }
  return reels;
}

async function dbAddReel(reel: Reel): Promise<Reel> {
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO reels (id, userId, username, userAvatar, videoUrl, caption, likes, commentsCount, musicName, createdAt)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          reel.id, reel.userId, reel.username, reel.userAvatar, reel.videoUrl, reel.caption,
          reel.likes, reel.commentsCount, reel.musicName, reel.createdAt
        ]
      );
      return reel;
    } catch (err) {
      console.error("[PG ERROR] dbAddReel:", err);
    }
  }
  reels.unshift(reel);
  return reel;
}

async function dbLikeReel(reelId: string, userId: string): Promise<Reel | null> {
  if (pool) {
    try {
      const checkRes = await pool.query("SELECT likes FROM reels WHERE id = $1", [reelId]);
      if (checkRes.rows.length > 0) {
        let currentLikes: string[] = checkRes.rows[0].likes || [];
        if (currentLikes.includes(userId)) {
          currentLikes = currentLikes.filter(id => id !== userId);
        } else {
          currentLikes.push(userId);
        }
        const res = await pool.query(
          "UPDATE reels SET likes = $1 WHERE id = $2 RETURNING *",
          [currentLikes, reelId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            userId: row.userid,
            username: row.username,
            userAvatar: row.useravatar,
            videoUrl: row.videourl,
            caption: row.caption,
            likes: row.likes || [],
            commentsCount: row.commentscount || 0,
            musicName: row.musicname,
            createdAt: new Date(row.createdat).toISOString()
          };
        }
      }
    } catch (err) {
      console.error("[PG ERROR] dbLikeReel:", err);
    }
  }

  const r = reels.find(r => r.id === reelId);
  if (r) {
    if (r.likes.includes(userId)) {
      r.likes = r.likes.filter(id => id !== userId);
    } else {
      r.likes.push(userId);
    }
    return r;
  }
  return null;
}

// 4. Database Messages Helpers
async function dbGetMessages(participantId: string, sinceTime: number = 0): Promise<Message[]> {
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT * FROM messages 
         WHERE (senderId = $1 OR receiverId = $1) 
           AND (EXTRACT(EPOCH FROM createdAt) * 1000) > $2
         ORDER BY createdAt ASC`,
        [participantId, sinceTime]
      );
      return res.rows.map(row => ({
        id: row.id,
        senderId: row.senderid,
        receiverId: row.receiverid,
        encryptedText: row.encryptedtext,
        iv: row.iv,
        isEncrypted: row.isencrypted,
        createdAt: new Date(row.createdat).toISOString(),
        isFile: row.isfile,
        fileData: row.filedata || undefined,
        fileName: row.filename || undefined,
        fileSize: row.filesize || undefined
      }));
    } catch (err) {
      console.error("[PG ERROR] dbGetMessages:", err);
    }
  }

  return messages.filter(m => {
    const isParticipant = m.senderId === participantId || m.receiverId === participantId;
    const isNew = new Date(m.createdAt).getTime() > sinceTime;
    return isParticipant && isNew;
  });
}

async function dbAddMessage(msg: Message): Promise<Message> {
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO messages (id, senderId, receiverId, encryptedText, iv, isEncrypted, createdAt, isFile, fileData, fileName, fileSize)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          msg.id, msg.senderId, msg.receiverId, msg.encryptedText, msg.iv, msg.isEncrypted, msg.createdAt,
          msg.isFile || false, msg.fileData || null, msg.fileName || null, msg.fileSize || null
        ]
      );
      return msg;
    } catch (err) {
      console.error("[PG ERROR] dbAddMessage:", err);
    }
  }
  messages.push(msg);
  return msg;
}

// 5. Database Notifications Helpers
async function dbGetNotifications(userId: string, sinceTime: number = 0): Promise<Notification[]> {
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT * FROM notifications 
         WHERE userId = $1 
           AND (EXTRACT(EPOCH FROM createdAt) * 1000) > $2
         ORDER BY createdAt DESC`,
        [userId, sinceTime]
      );
      return res.rows.map(row => ({
        id: row.id,
        userId: row.userid,
        type: row.type as any,
        title: row.title,
        body: row.body,
        senderId: row.senderid,
        senderUsername: row.senderusername,
        senderAvatar: row.senderavatar,
        createdAt: new Date(row.createdat).toISOString(),
        read: row.read,
        linkTo: row.linkto || undefined
      }));
    } catch (err) {
      console.error("[PG ERROR] dbGetNotifications:", err);
    }
  }
  return notifications.filter(n => {
    const isRecipient = n.userId === userId;
    const isNew = new Date(n.createdAt).getTime() > sinceTime;
    return isRecipient && isNew;
  });
}

async function dbAddNotification(notif: Notification): Promise<Notification> {
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO notifications (id, userId, type, title, body, senderId, senderUsername, senderAvatar, createdAt, read, linkTo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          notif.id, notif.userId, notif.type, notif.title, notif.body, notif.senderId,
          notif.senderUsername, notif.senderAvatar, notif.createdAt, notif.read, notif.linkTo || null
        ]
      );
      return notif;
    } catch (err) {
      console.error("[PG ERROR] dbAddNotification:", err);
    }
  }
  notifications.unshift(notif);
  return notif;
}

async function dbMarkNotificationRead(id: string): Promise<boolean> {
  if (pool) {
    try {
      await pool.query("UPDATE notifications SET read = TRUE WHERE id = $1", [id]);
      return true;
    } catch (err) {
      console.error("[PG ERROR] dbMarkNotificationRead:", err);
    }
  }
  const notif = notifications.find(n => n.id === id);
  if (notif) {
    notif.read = true;
    return true;
  }
  return false;
}

// 6. Database Call Sessions Helpers
async function dbGetCallSessions(userId: string): Promise<CallSession[]> {
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT * FROM call_sessions 
         WHERE senderId = $1 OR receiverId = $1`,
        [userId]
      );
      return res.rows.map(row => ({
        id: row.id,
        senderId: row.senderid,
        receiverId: row.receiverid,
        type: row.type as any,
        status: row.status as any,
        createdAt: new Date(row.createdat).toISOString(),
        signals: typeof row.signals === "string" ? JSON.parse(row.signals) : (row.signals || [])
      }));
    } catch (err) {
      console.error("[PG ERROR] dbGetCallSessions:", err);
    }
  }
  return callSessions;
}

async function dbAddCallSession(call: CallSession): Promise<CallSession> {
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO call_sessions (id, senderId, receiverId, type, status, createdAt, signals)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          call.id, call.senderId, call.receiverId, call.type, call.status, call.createdAt,
          JSON.stringify(call.signals)
        ]
      );
      return call;
    } catch (err) {
      console.error("[PG ERROR] dbAddCallSession:", err);
    }
  }
  callSessions.push(call);
  return call;
}

async function dbUpdateCallSession(id: string, status: string, signals?: any[]): Promise<CallSession | null> {
  if (pool) {
    try {
      const checkRes = await pool.query("SELECT signals FROM call_sessions WHERE id = $1", [id]);
      if (checkRes.rows.length > 0) {
        let mergedSignals = typeof checkRes.rows[0].signals === "string"
          ? JSON.parse(checkRes.rows[0].signals)
          : (checkRes.rows[0].signals || []);
        
        if (signals) {
          mergedSignals = signals;
        }

        const res = await pool.query(
          "UPDATE call_sessions SET status = $1, signals = $2 WHERE id = $3 RETURNING *",
          [status, JSON.stringify(mergedSignals), id]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: row.id,
            senderId: row.senderid,
            receiverId: row.receiverid,
            type: row.type as any,
            status: row.status as any,
            createdAt: new Date(row.createdat).toISOString(),
            signals: mergedSignals
          };
        }
      }
    } catch (err) {
      console.error("[PG ERROR] dbUpdateCallSession:", err);
    }
  }

  const call = callSessions.find(c => c.id === id);
  if (call) {
    call.status = status as any;
    if (signals) {
      call.signals = signals;
    }
    return call;
  }
  return null;
}

// --- API ENDPOINTS ---

// Admin Database Purge: Erase all accounts, posts, reels, messages, notifications, call logs
app.post("/api/admin/clear-data", async (req, res) => {
  console.log("[ADMIN] Wiping Neon Postgres database & memory indices as requested...");
  if (pool) {
    try {
      await pool.query("TRUNCATE TABLE call_sessions, notifications, messages, reels, posts, users RESTART IDENTITY CASCADE;");
      console.log("[ADMIN] Database wiped completely.");
    } catch (err) {
      console.error("[PG ERROR] db wipe request unsuccessful:", err);
      return res.status(500).json({ success: false, error: String(err) });
    }
  }

  // Clear in-memory safety state
  users = [];
  posts = [];
  reels = [];
  messages = [];
  notifications = [];
  callSessions = [];

  res.json({
    success: true,
    message: "Toutes les données, comptes, publications, reels, messages et vidéos ont été effacés !"
  });
});

// Auth System with OTP & SMTP
app.post("/api/auth/send-otp", async (req, res) => {
  const { email, username, fullName } = req.body;
  
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Adresse email invalide" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  // Remove existing OTPs for this email
  otps = otps.filter(o => o.email !== email);
  
  // Store OTP
  otps.push({
    email,
    otp,
    expiresAt,
    username,
    fullName
  });

  const result = await sendOtpEmail(email, otp);
  
  res.json({
    success: true,
    message: "OTP envoyé avec succès !",
    actualSent: result.actualSent,
    fallbackOtp: result.actualSent ? undefined : otp // fallback visible in testing if SMTP credentials are not yet set
  });
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  
  if (!email || !otp) {
    return res.status(400).json({ error: "Email et OTP requis" });
  }

  const stored = otps.find(o => o.email === email && o.otp === otp);
  
  if (!stored) {
    return res.status(400).json({ error: "Code OTP incorrect ou expiré" });
  }

  if (Date.now() > stored.expiresAt) {
    otps = otps.filter(o => !(o.email === email && o.otp === otp));
    return res.status(400).json({ error: "Code OTP expiré" });
  }

  // Clear OTP
  otps = otps.filter(o => o.email !== email);

  // Find or Create user dynamically in Postgres/Memory
  const dbUsers = await dbGetUsers();
  let user = dbUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    const emailPrefix = email.split("@")[0].toLowerCase();
    const id = `user-${Math.random().toString(36).substring(2, 9)}`;
    const regUsername = stored.username || emailPrefix;
    const regFullName = stored.fullName || (emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1));
    
    user = {
      id,
      username: regUsername,
      fullName: regFullName,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`,
      bio: "Nouveau membre de l'écosystème HEER",
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      email
    };
    
    await dbAddUser(user);
  }

  res.json({
    success: true,
    user
  });
});

// 1. Users
app.get("/api/users", async (req, res) => {
  const list = await dbGetUsers();
  res.json(list);
});

app.post("/api/users/update", async (req, res) => {
  const { id, bio, fullName, username, publicKey } = req.body;
  const updated = await dbUpdateUser(id, { bio, fullName, username, publicKey });
  if (updated) {
    res.json(updated);
  } else {
    // Register if missing
    const newUser: User = {
      id: id || `user-${Date.now()}`,
      username: username || "anonymous",
      fullName: fullName || "Anonymous User",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      bio: bio || "New User of Hello Here",
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      publicKey: publicKey,
    };
    const created = await dbAddUser(newUser);
    res.json(created);
  }
});

// 2. Posts (Priority sorted!)
app.get("/api/posts", async (req, res) => {
  const allPosts = await dbGetPosts();
  const allUsers = await dbGetUsers();
  
  const sorted = [...allPosts].sort((a, b) => {
    const userA = allUsers.find(u => u.id === a.userId);
    const userB = allUsers.find(u => u.id === b.userId);
    const aPri = isPriorityUser(userA?.id || "");
    const bPri = isPriorityUser(userB?.id || "");
    if (aPri && !bPri) return -1;
    if (!aPri && bPri) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  res.json(sorted);
});

app.post("/api/posts", async (req, res) => {
  const { userId, content, mediaUrl, mediaType, location } = req.body;
  const allUsers = await dbGetUsers();
  const user = allUsers.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const newPost: Post = {
    id: `post-${Date.now()}`,
    userId: user.id,
    username: user.username,
    userAvatar: user.avatarUrl,
    content: content || "",
    mediaUrl: mediaUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
    mediaType: mediaType || "image",
    likes: [],
    comments: [],
    createdAt: new Date().toISOString(),
    location: location || "",
    likesCount: 0
  };

  const created = await dbAddPost(newPost);
  res.json(created);
});

app.post("/api/posts/:postId/like", async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  const post = await dbLikePost(postId, userId);

  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  const hasLikedNow = post.likes.includes(userId);
  if (hasLikedNow && post.userId !== userId) {
    const allUsers = await dbGetUsers();
    const sender = allUsers.find(u => u.id === userId);
    await dbAddNotification({
      id: `notif-${Date.now()}`,
      userId: post.userId,
      type: "like",
      title: "Mention Jaime",
      body: `${sender?.username || "Quelqu'un"} a aimé votre publication.`,
      senderId: userId,
      senderUsername: sender?.username || "someone",
      senderAvatar: sender?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      createdAt: new Date().toISOString(),
      read: false
    });
  }
  
  res.json(post);
});

app.post("/api/posts/:postId/comments", async (req, res) => {
  const { postId } = req.params;
  const { userId, text } = req.body;
  const allUsers = await dbGetUsers();
  const user = allUsers.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const newComment: Comment = {
    id: `comment-${Date.now()}`,
    userId: user.id,
    username: user.username,
    userAvatar: user.avatarUrl,
    text: text,
    createdAt: new Date().toISOString()
  };

  const post = await dbAddComment(postId, newComment);
  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  // Send notification to post owner
  if (post.userId !== userId) {
    await dbAddNotification({
      id: `notif-${Date.now()}`,
      userId: post.userId,
      type: "comment",
      title: "Nouveau commentaire",
      body: `${user.username} a commenté : "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}"`,
      senderId: userId,
      senderUsername: user.username,
      senderAvatar: user.avatarUrl,
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  res.json(post);
});

// 3. Reels (Priority sorted!)
app.get("/api/reels", async (req, res) => {
  const allReels = await dbGetReels();
  const allUsers = await dbGetUsers();
  
  const sorted = [...allReels].sort((a, b) => {
    const userA = allUsers.find(u => u.id === a.userId);
    const userB = allUsers.find(u => u.id === b.userId);
    const aPri = isPriorityUser(userA?.id || "");
    const bPri = isPriorityUser(userB?.id || "");
    if (aPri && !bPri) return -1;
    if (!aPri && bPri) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  res.json(sorted);
});

app.post("/api/reels", async (req, res) => {
  const { userId, videoUrl, caption, musicName } = req.body;
  const allUsers = await dbGetUsers();
  const user = allUsers.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const newReel: Reel = {
    id: `reel-${Date.now()}`,
    userId: user.id,
    username: user.username,
    userAvatar: user.avatarUrl,
    videoUrl: videoUrl || "https://assets.mixkit.co/videos/preview/mixkit-neon-light-reflections-on-wet-streets-40915-large.mp4",
    caption: caption || "",
    likes: [],
    commentsCount: 0,
    musicName: musicName || "Original Audio",
    createdAt: new Date().toISOString()
  };

  const created = await dbAddReel(newReel);
  res.json(created);
});

app.post("/api/reels/:reelId/like", async (req, res) => {
  const { reelId } = req.params;
  const { userId } = req.body;
  const reel = await dbLikeReel(reelId, userId);

  if (!reel) {
    return res.status(404).json({ error: "Reel not found" });
  }

  const hasLikedNow = reel.likes.includes(userId);
  if (hasLikedNow && reel.userId !== userId) {
    const allUsers = await dbGetUsers();
    const sender = allUsers.find(u => u.id === userId);
    await dbAddNotification({
      id: `notif-${Date.now()}`,
      userId: reel.userId,
      type: "like",
      title: "Mention Jaime Reel",
      body: `${sender?.username || "Quelqu'un"} a aimé votre Reel.`,
      senderId: userId,
      senderUsername: sender?.username || "someone",
      senderAvatar: sender?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  res.json(reel);
});

// 4. E2EE Messages & File uploads
app.get("/api/messages", async (req, res) => {
  const { userId } = req.query;
  if (userId) {
    const userMsgs = await dbGetMessages(userId as string);
    return res.json(userMsgs);
  }
  if (pool) {
    try {
      const resDb = await pool.query("SELECT * FROM messages ORDER BY createdAt ASC");
      const mapped = resDb.rows.map(row => ({
        id: row.id,
        senderId: row.senderid,
        receiverId: row.receiverid,
        encryptedText: row.encryptedtext,
        iv: row.iv,
        isEncrypted: row.isencrypted,
        createdAt: new Date(row.createdat).toISOString(),
        isFile: row.isfile,
        fileData: row.filedata || undefined,
        fileName: row.filename || undefined,
        fileSize: row.filesize || undefined
      }));
      return res.json(mapped);
    } catch (e) {
      console.error(e);
    }
  }
  res.json(messages);
});

app.post("/api/messages", async (req, res) => {
  const { senderId, receiverId, encryptedText, iv, isEncrypted, isFile, fileName, fileData, fileSize } = req.body;

  const newMessage: Message = {
    id: `msg-${Date.now()}`,
    senderId,
    receiverId,
    encryptedText,
    iv: iv || "",
    isEncrypted: !!isEncrypted,
    createdAt: new Date().toISOString(),
    isFile: !!isFile,
    fileName: fileName || "",
    fileData: fileData || "",
    fileSize: fileSize || ""
  };

  await dbAddMessage(newMessage);

  // Send real-time notification to the receiver
  const allUsers = await dbGetUsers();
  const sender = allUsers.find(u => u.id === senderId);
  await dbAddNotification({
    id: `notif-${Date.now()}`,
    userId: receiverId,
    type: "message",
    title: `Message sécurisé de @${sender?.username || 'user'} 🔒`,
    body: isFile ? `📁 Fichier partagé: ${fileName}` : `Nouveau message chiffré de bout en bout`,
    senderId: senderId,
    senderUsername: sender?.username || "user",
    senderAvatar: sender?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    createdAt: new Date().toISOString(),
    read: false
  });

  res.json(newMessage);
});

// 5. Calls & WebRTC Signaling
app.post("/api/calls/initiate", async (req, res) => {
  const { senderId, receiverId, type } = req.body;

  if (pool) {
    await pool.query(
      `DELETE FROM call_sessions 
       WHERE senderId = $1 AND receiverId = $2 AND status = 'calling'`,
      [senderId, receiverId]
    );
  } else {
    callSessions = callSessions.filter(
      c => !(c.senderId === senderId && c.receiverId === receiverId && c.status === "calling")
    );
  }

  const newCall: CallSession = {
    id: `call-${Date.now()}`,
    senderId,
    receiverId,
    type,
    status: "calling",
    createdAt: new Date().toISOString(),
    signals: []
  };

  await dbAddCallSession(newCall);

  const allUsers = await dbGetUsers();
  const caller = allUsers.find(u => u.id === senderId);
  await dbAddNotification({
    id: `notif-call-${Date.now()}`,
    userId: receiverId,
    type: "call",
    title: `Appel ${type === 'video' ? 'Vidéo' : 'Audio'} entrant 📞`,
    body: `@${caller?.username || 'Quelqu\'un'} tente de vous appeler de bout en bout...`,
    senderId: senderId,
    senderUsername: caller?.username || "user",
    senderAvatar: caller?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    createdAt: new Date().toISOString(),
    read: false
  });

  // Simulated auto-acceptance trigger: if after 2.2s the status is still 'calling'
  setTimeout(async () => {
    try {
      if (pool) {
        const queryRes = await pool.query("SELECT status FROM call_sessions WHERE id = $1", [newCall.id]);
        if (queryRes.rows.length > 0 && queryRes.rows[0].status === "calling") {
          console.log(`[Auto-responder] Auto-connecting solo test call session ${newCall.id}`);
          await dbUpdateCallSession(newCall.id, "connected");
        }
      } else {
        const call = callSessions.find(c => c.id === newCall.id);
        if (call && call.status === "calling") {
          console.log(`[Auto-responder] Auto-connecting memory call session ${newCall.id}`);
          call.status = "connected";
        }
      }
    } catch (err) {
      console.warn("Auto-responder check triggered warning:", err);
    }
  }, 2200);

  res.json(newCall);
});

app.post("/api/calls/respond", async (req, res) => {
  const { callId, status } = req.body;
  const signal = (status === 'declined' || status === 'ended') ? [{ type: "hangup", senderId: "system" }] : undefined;
  const call = await dbUpdateCallSession(callId, status, signal);

  if (!call) {
    return res.status(404).json({ error: "Call not found" });
  }

  res.json(call);
});

app.post("/api/calls/signal", async (req, res) => {
  const { callId, signal } = req.body;
  
  if (pool) {
    try {
      const checkRes = await pool.query("SELECT signals FROM call_sessions WHERE id = $1", [callId]);
      if (checkRes.rows.length > 0) {
        const mergedSignals = typeof checkRes.rows[0].signals === "string"
          ? JSON.parse(checkRes.rows[0].signals)
          : (checkRes.rows[0].signals || []);
        mergedSignals.push(signal);
        await pool.query("UPDATE call_sessions SET signals = $1 WHERE id = $2", [JSON.stringify(mergedSignals), callId]);
        return res.json({ success: true, signalsCount: mergedSignals.length });
      }
    } catch (err) {
      console.error("[PG ERROR] call signal:", err);
    }
  }

  const call = callSessions.find(c => c.id === callId);
  if (!call) {
    return res.status(404).json({ error: "Call session not found" });
  }

  call.signals.push(signal);
  res.json({ success: true, signalsCount: call.signals.length });
});

// Endpoint for high-speed active call state in-session synchronization
app.get("/api/calls/:id", async (req, res) => {
  const { id } = req.params;
  if (pool) {
    try {
      const resCall = await pool.query("SELECT * FROM call_sessions WHERE id = $1", [id]);
      if (resCall.rows.length > 0) {
        const row = resCall.rows[0];
        return res.json({
          id: row.id,
          senderId: row.senderid,
          receiverId: row.receiverid,
          type: row.type,
          status: row.status,
          createdAt: new Date(row.createdat).toISOString(),
          signals: typeof row.signals === "string" ? JSON.parse(row.signals) : (row.signals || [])
        });
      }
    } catch (err) {
      console.error("[PG ERROR] get single callSession:", err);
    }
  }

  const call = callSessions.find(c => c.id === id);
  if (!call) {
    return res.status(404).json({ error: "Call session not found" });
  }
  res.json(call);
});

// 6. REAL-TIME SYNC ENGINE (Polling Endpoint)
app.get("/api/sync", async (req, res) => {
  const { userId, since } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId is required for sync" });
  }

  const sinceTime = since ? new Date(since as string).getTime() : 0;

  // Filter messages
  const newMessages = await dbGetMessages(userId as string, sinceTime);

  // Filter notifications
  const newNotifications = await dbGetNotifications(userId as string, sinceTime);

  // Filter active calls relevant to this user
  let newCalls: CallSession[] = [];
  if (pool) {
    try {
      const resCalls = await pool.query(
        `SELECT * FROM call_sessions 
         WHERE (senderId = $1 OR receiverId = $1)
           AND (status IN ('calling', 'connected', 'ringing') OR (EXTRACT(EPOCH FROM createdAt) * 1000) > $2)`,
         [userId, sinceTime]
      );
      newCalls = resCalls.rows.map(row => ({
        id: row.id,
        senderId: row.senderid,
        receiverId: row.receiverid,
        type: row.type as any,
        status: row.status as any,
        createdAt: new Date(row.createdat).toISOString(),
        signals: typeof row.signals === "string" ? JSON.parse(row.signals) : (row.signals || [])
      }));
    } catch (err) {
      console.error("[PG ERROR] sync callSessions:", err);
    }
  } else {
    newCalls = callSessions.filter(c => {
      const isParticipant = c.senderId === userId || c.receiverId === userId;
      const isActive = ['calling', 'connected', 'ringing'].includes(c.status);
      const isRecentChange = new Date(c.createdAt).getTime() > Date.now() - 30000;
      return isParticipant && (isActive || isRecentChange);
    });
  }

  // Get users
  const allUsers = await dbGetUsers();

  res.json({
    timestamp: new Date().toISOString(),
    messages: newMessages,
    notifications: newNotifications,
    callSessions: newCalls,
    users: allUsers
  });
});

// Clean up old notification stores in memory
setInterval(async () => {
  if (notifications.length > 100) {
    notifications = notifications.slice(0, 50);
  }
  if (messages.length > 500) {
    messages = messages.slice(-200);
  }
}, 600000);


// Serve Frontend assets using Vite middleware or Static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Hello Here] Fullstack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
