const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}

const PORT = process.env.PORT || 3000;
const COOKIE = "lumax_admin";
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is required. Defina JWT_SECRET com um valor aleatório longo antes de iniciar o servidor.");
const root = __dirname;
const uploads = path.join(root, "uploads");
fs.mkdirSync(uploads, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({ destination: uploads, filename: (_req, file, done) => done(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`) }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, done) => done(null, /^image\//.test(file.mimetype))
});
const seed = {
  settings: { phone: "244927729874", whatsapp: "244927729874", email: "mplumax1@gmail.com", address: "Bairro Valodia, Moçâmedes, Província do Namibe, Angola", facebook: "https://www.facebook.com/profile.php?id=61591040086745", trust_eyebrow: "A FORMA LUMAX", trust_title: "Confiança para decidir com tranquilidade.", trust_subtitle: "Uma abordagem próxima e profissional para que cada processo tenha um caminho mais claro.", services_eyebrow: "SOLUÇÕES IMOBILIÁRIAS", services_title: "Serviços pensados para si.", properties_eyebrow: "SELEÇÃO LUMAX", properties_title: "Imóveis em destaque.", properties_notice: "Exemplos de apresentação. Confirme connosco a disponibilidade e as condições atuais.", faq_eyebrow: "DÚVIDAS FREQUENTES", faq_title: "Como podemos ajudar?" },
  trust_steps: [
    { id: "trust-1", order: 1, title: "Escuta atenta", description: "Começamos por compreender as suas necessidades, prioridades e objetivos." },
    { id: "trust-2", order: 2, title: "Informação clara", description: "Orientação direta para apoiar escolhas mais informadas em cada etapa." },
    { id: "trust-3", order: 3, title: "Acompanhamento", description: "Presença próxima desde a procura até à concretização do seu próximo passo." },
    { id: "trust-4", order: 4, title: "Relação de confiança", description: "Uma experiência imobiliária feita com rigor, discrição e transparência." }
  ],
  services: [{ id:"service-1", title:"Compra", desc:"Apoio na procura e na tomada de decisão para encontrar o imóvel certo para si." }, { id:"service-2", title:"Venda", desc:"Acompanhamento na apresentação e divulgação do seu imóvel com uma comunicação cuidada." }, { id:"service-3", title:"Arrendamento", desc:"Orientação para encontrar opções de arrendamento adequadas às suas necessidades." }],
  properties: [], posts: [], gallery: [],
  faq: [{ id:"faq-1", order:1, question:"Que documentos preciso para vender um imóvel?", answer:"Os documentos podem variar conforme o imóvel e o processo. Fale com a Lumax para orientação sobre o seu caso." }, { id:"faq-2", order:2, question:"A Lumax cobra comissão?", answer:"As condições comerciais devem ser confirmadas diretamente com a Lumax antes de qualquer contratação." }],
  sessions: [],
  admins: [],
  passwordResetCodes: []
};
const db = new Low(new JSONFile(path.join(root, "data.json")), seed);
const collections = ["trust_steps", "services", "properties", "posts", "gallery", "faq"];
const ready = db.read().then(() => {
  db.data ||= structuredClone(seed);
  db.data.settings = { ...structuredClone(seed.settings), ...(db.data.settings || {}) };
  for (const key of collections) if (!Array.isArray(db.data[key])) db.data[key] = structuredClone(seed[key]);
  db.data.sessions = Array.isArray(db.data.sessions) ? db.data.sessions : [];
  db.data.admins = Array.isArray(db.data.admins) ? db.data.admins : [];
  db.data.passwordResetCodes = Array.isArray(db.data.passwordResetCodes) ? db.data.passwordResetCodes : [];
  return db.write();
});
const app = express();
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const jsonError = (res, status, error) => res.status(status).json({ error });
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(uploads));
app.use(express.static(path.join(root, "public")));
const write = async () => { await db.write(); };
const hasAdmins = () => db.data.admins.length > 0;
const publicCollection = name => asyncRoute(async (_req, res) => { await ready; res.json(db.data[name].sort((a,b) => (a.order ?? 0) - (b.order ?? 0))); });
app.get("/api/settings", asyncRoute(async (_req,res) => { await ready; res.json(db.data.settings); }));
collections.forEach(name => app.get(`/api/${name}`, publicCollection(name)));
async function auth(req,res,next) { try { await ready; const token=req.cookies[COOKIE]; const payload=jwt.verify(token, JWT_SECRET); if (!db.data.sessions.some(s => s.id === payload.jti && s.expires > Date.now())) throw new Error("Session expired"); req.sessionId=payload.jti; next(); } catch { jsonError(res, 401, "Não autorizado."); } }
app.get("/api/auth/setup-status", asyncRoute(async (_req, res) => { await ready; res.json({ setupRequired: !hasAdmins() }); }));
const authAttempts = new Map();
const authLimiter = (req, res, next) => {
  const now = Date.now(), key = req.ip, windowMs = 10 * 60 * 1000;
  const attempts = (authAttempts.get(key) || []).filter(time => now - time < windowMs);
  if (attempts.length >= 5) return jsonError(res, 429, "Demasiadas tentativas. Tente novamente dentro de 10 minutos.");
  attempts.push(now); authAttempts.set(key, attempts); next();
};
app.use(["/api/auth/login", "/api/auth/setup", "/api/auth/recovery/request", "/api/auth/recovery/reset"], authLimiter);
app.post("/api/auth/setup", asyncRoute(async (req,res) => {
  await ready;
  if (hasAdmins()) return jsonError(res, 409, "Já existe uma conta de administrador.");
  const { username, password } = req.body || {};
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username || "")) return jsonError(res, 400, "Indique um utilizador com 3 a 50 caracteres (letras, números, ponto, hífen ou _).");
  if (typeof password !== "string" || password.length < 12) return jsonError(res, 400, "A palavra-passe deve ter pelo menos 12 caracteres.");
  db.data.admins.push({ id: crypto.randomUUID(), username, passwordHash: await bcrypt.hash(password, 12), createdAt: Date.now() });
  await write(); console.info(`[AUDITORIA LUMAX] Administrador criado: ${username} em ${new Date().toISOString()}`); res.status(201).json({ ok:true, message:"Conta de administrador criada. Já pode iniciar sessão." });
}));
app.post("/api/auth/login", asyncRoute(async (req,res) => {
  await ready;
  if (!hasAdmins()) return jsonError(res, 409, "Crie primeiro a conta de administrador.");
  const {username,password}=req.body || {}, admin=db.data.admins.find(a => a.username === username);
  if (!admin || !(await bcrypt.compare(password || "", admin.passwordHash))) return jsonError(res, 401, "Credenciais inválidas.");
  const id=crypto.randomUUID(), expires=Date.now()+8*60*60*1000;
  db.data.sessions = db.data.sessions.filter(s=>s.expires>Date.now()); db.data.sessions.push({id,expires,adminId:admin.id}); await write();
  res.cookie(COOKIE,jwt.sign({jti:id},JWT_SECRET,{expiresIn:"8h"}),{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:8*60*60*1000,path:"/"}).json({ok:true});
}));
app.get("/api/auth/session", auth, (_req,res)=>res.json({authenticated:true}));
app.post("/api/auth/logout", auth, asyncRoute(async (req,res)=>{ db.data.sessions=db.data.sessions.filter(s=>s.id!==req.sessionId); await write(); res.clearCookie(COOKIE,{path:"/"}).json({ok:true}); }));
app.put("/api/auth/password", auth, asyncRoute(async (req,res) => {
  const { currentPassword, newPassword } = req.body || {}; const session = db.data.sessions.find(s => s.id === req.sessionId); const admin = db.data.admins.find(a => a.id === session?.adminId);
  if (!admin || !(await bcrypt.compare(currentPassword || "", admin.passwordHash))) return jsonError(res, 400, "A palavra-passe atual não está correta.");
  if (typeof newPassword !== "string" || newPassword.length < 12) return jsonError(res, 400, "A nova palavra-passe deve ter pelo menos 12 caracteres.");
  admin.passwordHash = await bcrypt.hash(newPassword, 12); db.data.sessions = db.data.sessions.filter(s => s.adminId !== admin.id || s.id === req.sessionId); await write(); res.json({ok:true, message:"Palavra-passe alterada com sucesso."});
}));
app.post("/api/auth/recovery/request", asyncRoute(async (req,res) => {
  await ready; const admin = db.data.admins.find(a => a.username === (req.body || {}).username); const expires = Date.now() + 15 * 60 * 1000;
  if (admin) { const code = crypto.randomBytes(4).toString("hex").toUpperCase(); db.data.passwordResetCodes = db.data.passwordResetCodes.filter(c => c.expires > Date.now() && c.adminId !== admin.id); db.data.passwordResetCodes.push({ adminId:admin.id, codeHash:await bcrypt.hash(code, 10), expires }); await write(); console.log(`[RECUPERAÇÃO LUMAX] Código temporário para ${admin.username}: ${code} (válido até ${new Date(expires).toISOString()})`); }
  res.json({ok:true, message:"Se o utilizador existir, foi gerado um código temporário nos registos do servidor."});
}));
app.post("/api/auth/recovery/reset", asyncRoute(async (req,res) => {
  await ready; const { username, code, password } = req.body || {}; const admin=db.data.admins.find(a=>a.username===username); const reset=db.data.passwordResetCodes.find(c=>c.adminId===admin?.id && c.expires>Date.now());
  if (!admin || !reset || !(await bcrypt.compare(code || "", reset.codeHash))) return jsonError(res, 400, "O código é inválido ou expirou.");
  if (typeof password !== "string" || password.length < 12) return jsonError(res, 400, "A palavra-passe deve ter pelo menos 12 caracteres.");
  admin.passwordHash=await bcrypt.hash(password,12); db.data.passwordResetCodes=db.data.passwordResetCodes.filter(c=>c.adminId!==admin.id); db.data.sessions=db.data.sessions.filter(s=>s.adminId!==admin.id); await write(); res.json({ok:true, message:"Palavra-passe reposta. Já pode iniciar sessão."});
}));
app.put("/api/settings", auth, asyncRoute(async (req,res)=>{ db.data.settings={...db.data.settings,...req.body}; await write(); res.json(db.data.settings); }));
function removeFile(item) { if (item?.image?.startsWith("/uploads/")) fs.unlink(path.join(root,item.image),()=>{}); }
collections.forEach(name => {
  app.post(`/api/${name}`, auth, upload.single("image"), asyncRoute(async (req,res)=>{ const item={...req.body,id:crypto.randomUUID()}; if(req.file)item.image=`/uploads/${req.file.filename}`; if ("order" in item) item.order=Number(item.order); db.data[name].push(item); await write(); res.status(201).json(item); }));
  app.put(`/api/${name}/reorder`, auth, asyncRoute(async (req,res)=>{ const ids=req.body.ids; if(!Array.isArray(ids))return jsonError(res,400,"Lista de IDs inválida."); ids.forEach((id,index)=>{const item=db.data[name].find(x=>x.id===id);if(item)item.order=index+1;}); await write(); res.json(db.data[name]); }));
  app.put(`/api/${name}/:id`, auth, upload.single("image"), asyncRoute(async (req,res)=>{ const index=db.data[name].findIndex(x=>x.id===req.params.id); if(index<0)return jsonError(res,404,"Registo não encontrado."); const old=db.data[name][index], item={...old,...req.body}; if(req.file){removeFile(old);item.image=`/uploads/${req.file.filename}`;} if("order" in item)item.order=Number(item.order); db.data[name][index]=item; await write(); res.json(item); }));
  app.delete(`/api/${name}/:id`, auth, asyncRoute(async (req,res)=>{ const index=db.data[name].findIndex(x=>x.id===req.params.id); if(index<0)return jsonError(res,404,"Registo não encontrado."); removeFile(db.data[name][index]); db.data[name].splice(index,1); await write(); res.status(204).end(); }));
});
app.use("/api", (_req,res) => jsonError(res,404,"Rota da API não encontrada."));
app.use((err,_req,res,_next)=>{ console.error(err); if (res.headersSent) return; if(err instanceof multer.MulterError || err.message==="Only images") return jsonError(res,400,"Envie uma imagem com no máximo 5 MB."); if(err instanceof SyntaxError && "body" in err) return jsonError(res,400,"O pedido contém JSON inválido."); return jsonError(res,500,"Ocorreu um erro no servidor. Tente novamente."); });
app.listen(PORT,()=>console.log(`Lumax at http://localhost:${PORT}`));
