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

const PORT = process.env.PORT || 3000;
const COOKIE = "lumax_admin";
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
if (!JWT_SECRET) throw new Error("JWT_SECRET is required.");
const root = __dirname;
const uploads = path.join(root, "uploads");
fs.mkdirSync(uploads, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({ destination: uploads, filename: (_req, file, done) => done(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`) }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, done) => done(null, /^image\//.test(file.mimetype))
});
const seed = {
  settings: { phone: "927729874", whatsapp: "927729874", email: "mplumax1@gmail.com", address: "Bairro Valodia, Moçâmedes, Província do Namibe, Angola", facebook: "https://www.facebook.com/profile.php?id=61591040086745", trust_eyebrow: "A FORMA LUMAX", trust_title: "Confiança para decidir com tranquilidade.", trust_subtitle: "Uma abordagem próxima e profissional para que cada processo tenha um caminho mais claro.", services_eyebrow: "SOLUÇÕES IMOBILIÁRIAS", services_title: "Serviços pensados para si.", properties_eyebrow: "SELEÇÃO LUMAX", properties_title: "Imóveis em destaque.", properties_notice: "Exemplos de apresentação. Confirme connosco a disponibilidade e as condições atuais.", faq_eyebrow: "DÚVIDAS FREQUENTES", faq_title: "Como podemos ajudar?" },
  trust_steps: [
    { id: "trust-1", order: 1, title: "Escuta atenta", description: "Começamos por compreender as suas necessidades, prioridades e objetivos." },
    { id: "trust-2", order: 2, title: "Informação clara", description: "Orientação direta para apoiar escolhas mais informadas em cada etapa." },
    { id: "trust-3", order: 3, title: "Acompanhamento", description: "Presença próxima desde a procura até à concretização do seu próximo passo." },
    { id: "trust-4", order: 4, title: "Relação de confiança", description: "Uma experiência imobiliária feita com rigor, discrição e transparência." }
  ],
  services: [{ id:"service-1", title:"Compra", desc:"Apoio na procura e na tomada de decisão para encontrar o imóvel certo para si." }, { id:"service-2", title:"Venda", desc:"Acompanhamento na apresentação e divulgação do seu imóvel com uma comunicação cuidada." }, { id:"service-3", title:"Arrendamento", desc:"Orientação para encontrar opções de arrendamento adequadas às suas necessidades." }],
  properties: [], posts: [], gallery: [],
  faq: [{ id:"faq-1", order:1, question:"Que documentos preciso para vender um imóvel?", answer:"Os documentos podem variar conforme o imóvel e o processo. Fale com a Lumax para orientação sobre o seu caso." }, { id:"faq-2", order:2, question:"A Lumax cobra comissão?", answer:"As condições comerciais devem ser confirmadas diretamente com a Lumax antes de qualquer contratação." }],
  sessions: []
};
const db = new Low(new JSONFile(path.join(root, "data.json")), seed);
const ready = db.read().then(() => { db.data ||= structuredClone(seed); for (const key of Object.keys(seed)) db.data[key] ||= structuredClone(seed[key]); return db.write(); });
const collections = ["trust_steps", "services", "properties", "posts", "gallery", "faq"];
const app = express();
app.use(express.json()); app.use(cookieParser()); app.use("/uploads", express.static(uploads)); app.use(express.static(root));
const write = async () => { await db.write(); };
const publicCollection = (name) => async (_req,res) => { await ready; res.json(db.data[name].sort((a,b) => (a.order ?? 0) - (b.order ?? 0))); };
app.get("/api/settings", async (_req,res) => { await ready; res.json(db.data.settings); });
collections.forEach(name => app.get(`/api/${name}`, publicCollection(name)));
async function auth(req,res,next) { await ready; try { const token=req.cookies[COOKIE]; const payload=jwt.verify(token, JWT_SECRET); if (!db.data.sessions.some(s => s.id === payload.jti && s.expires > Date.now())) throw new Error("Session expired"); req.sessionId=payload.jti; next(); } catch { res.status(401).json({ error:"Não autorizado." }); } }
app.post("/api/auth/login", async (req,res) => { await ready; if (!ADMIN_USER || !ADMIN_PASSWORD_HASH) return res.status(503).json({error:"Administrador não configurado no servidor."}); const {username,password}=req.body || {}; if (username !== ADMIN_USER || !(await bcrypt.compare(password || "", ADMIN_PASSWORD_HASH))) return res.status(401).json({error:"Credenciais inválidas."}); const id=crypto.randomUUID(), expires=Date.now()+8*60*60*1000; db.data.sessions = db.data.sessions.filter(s=>s.expires>Date.now()); db.data.sessions.push({id,expires}); await write(); res.cookie(COOKIE,jwt.sign({jti:id},JWT_SECRET,{expiresIn:"8h"}),{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:8*60*60*1000,path:"/"}).json({ok:true}); });
app.get("/api/auth/session", auth, (_req,res)=>res.json({authenticated:true}));
app.post("/api/auth/logout", auth, async (req,res)=>{ db.data.sessions=db.data.sessions.filter(s=>s.id!==req.sessionId); await write(); res.clearCookie(COOKIE,{path:"/"}).json({ok:true}); });
app.put("/api/settings", auth, async (req,res)=>{ db.data.settings={...db.data.settings,...req.body}; await write(); res.json(db.data.settings); });
function removeFile(item) { if (item?.image?.startsWith("/uploads/")) fs.unlink(path.join(root,item.image),()=>{}); }
collections.forEach(name => {
  app.post(`/api/${name}`, auth, upload.single("image"), async (req,res)=>{ const item={...req.body,id:crypto.randomUUID()}; if(req.file)item.image=`/uploads/${req.file.filename}`; if ("order" in item) item.order=Number(item.order); db.data[name].push(item); await write(); res.status(201).json(item); });
  app.put(`/api/${name}/reorder`, auth, async (req,res)=>{ const ids=req.body.ids; if(!Array.isArray(ids))return res.status(400).json({error:"Lista de IDs inválida."}); ids.forEach((id,index)=>{const item=db.data[name].find(x=>x.id===id);if(item)item.order=index+1;}); await write(); res.json(db.data[name]); });
  app.put(`/api/${name}/:id`, auth, upload.single("image"), async (req,res)=>{ const index=db.data[name].findIndex(x=>x.id===req.params.id); if(index<0)return res.status(404).json({error:"Registo não encontrado."}); const old=db.data[name][index], item={...old,...req.body}; if(req.file){removeFile(old);item.image=`/uploads/${req.file.filename}`;} if("order" in item)item.order=Number(item.order); db.data[name][index]=item; await write(); res.json(item); });
  app.delete(`/api/${name}/:id`, auth, async (req,res)=>{ const index=db.data[name].findIndex(x=>x.id===req.params.id); if(index<0)return res.status(404).json({error:"Registo não encontrado."}); removeFile(db.data[name][index]); db.data[name].splice(index,1); await write(); res.status(204).end(); });
});
app.use((err,_req,res,_next)=>{ if(err instanceof multer.MulterError || err.message==="Only images") return res.status(400).json({error:"Envie uma imagem com no máximo 5 MB."}); console.error(err); res.status(500).json({error:"Erro interno do servidor."}); });
app.listen(PORT,()=>console.log(`Lumax at http://localhost:${PORT}`));
