// ═══════════════════════════════════════════════════════════════
// 认证核心库 — JWT + bcrypt + 用户 JSON 存储
// Auth Core — JWT + bcrypt + User JSON storage
// ═══════════════════════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { JWT_SECRET, TOKEN_NAME } from "@/lib/jwt-secret";

const USERS_FILE = path.join(process.cwd(), "data", "users.json");
const SALT_ROUNDS = 12;

// 如果未设置 JWT_SECRET 环境变量，使用默认值（仅开发环境安全）
// 生产环境必须设置 JWT_SECRET，否则所有 JWT 可被伪造
if (!process.env.JWT_SECRET) {
  console.warn("[auth] ⚠ JWT_SECRET 未设置！使用默认密钥，仅适合开发环境。生产环境必须设置 JWT_SECRET 环境变量。");
}

// ── 用户数据接口 / User data interface ──
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: number;
  avatar?: string;
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  createdAt: number;
  avatar?: string;
}

interface UserStore {
  users: User[];
}

// ── 加载用户存储 / Load user store ──
function loadUsers(): UserStore {
  ensureDataDir();
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return { users: [] };
}

// ── 保存用户存储 / Save user store ──
function saveUsers(store: UserStore): void {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(store, null, 2));
}

function ensureDataDir(): void {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── 查找用户 / Find user ──
function findUserByEmail(email: string): User | undefined {
  return loadUsers().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

function findUserByUsername(username: string): User | undefined {
  return loadUsers().users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

function findUserById(id: string): User | undefined {
  return loadUsers().users.find((u) => u.id === id);
}

// ── 注册用户 / Register ──
export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<{ success: true; user: UserPublic; token: string } | { success: false; error: string }> {
  // 验证 / Validate
  if (!username || username.length < 2 || username.length > 30) {
    return { success: false, error: "用户名需 2-30 个字符" };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "邮箱格式不正确" };
  }
  if (!password || password.length < 6) {
    return { success: false, error: "密码至少 6 个字符" };
  }

  const store = loadUsers();

  // 检查重复 / Check duplicates
  if (findUserByEmail(email)) {
    return { success: false, error: "该邮箱已注册" };
  }
  if (findUserByUsername(username)) {
    return { success: false, error: "该用户名已被使用" };
  }

  const id = `usr_${crypto.randomUUID()}`;
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user: User = {
    id,
    username,
    email: email.toLowerCase(),
    passwordHash,
    createdAt: Date.now(),
  };

  store.users.push(user);
  saveUsers(store);

  const token = generateToken(user);
  const userPublic = toPublic(user);

  return { success: true, user: userPublic, token };
}

// ── 登录 / Login ──
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: true; user: UserPublic; token: string } | { success: false; error: string }> {
  if (!email || !password) {
    return { success: false, error: "请输入邮箱和密码" };
  }

  const user = findUserByEmail(email);
  if (!user) {
    return { success: false, error: "邮箱或密码错误" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { success: false, error: "邮箱或密码错误" };
  }

  const token = generateToken(user);
  const userPublic = toPublic(user);

  return { success: true, user: userPublic, token };
}

// ── 生成 JWT / Generate JWT ──
function generateToken(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ── 验证 JWT / Verify JWT ──
export function verifyToken(token: string): { userId: string; email: string; username: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; username: string };
  } catch {
    return null;
  }
}

// ── 从 Cookie 获取当前用户 / Get current user from cookie ──
export async function getCurrentUser(): Promise<UserPublic | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    const user = findUserById(payload.userId);
    if (!user) return null;

    return toPublic(user);
  } catch {
    return null;
  }
}

// ── 从请求头获取当前用户 / Get current user from request headers ──
export function getUserFromRequest(req: Request): UserPublic | null {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const tokenMatch = cookieHeader.match(new RegExp(`${TOKEN_NAME}=([^;]+)`));
    if (!tokenMatch) return null;

    const payload = verifyToken(tokenMatch[1]);
    if (!payload) return null;

    const user = findUserById(payload.userId);
    if (!user) return null;

    return toPublic(user);
  } catch {
    return null;
  }
}

// ── 转换为公开用户 / Convert to public user ──
function toPublic(user: User): UserPublic {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    avatar: user.avatar,
  };
}

// ── Token 常量 / Token constants ──
export { TOKEN_NAME };