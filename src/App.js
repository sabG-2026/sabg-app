import React, {
  useState, useEffect, useContext, createContext,
  useCallback, useMemo, useRef
} from "react";
import { supabase } from "./supabase";

const AppContext = createContext();
const RAZORPAY_KEY = "YOUR_RAZORPAY_KEY_ID";
const STATUS_STEPS = [
  { key: "pending",          icon: "🧾", label: "Placed" },
  { key: "confirmed",        icon: "✅", label: "Confirmed" },
  { key: "preparing",        icon: "👨‍🍳", label: "Preparing" },
  { key: "out_for_delivery", icon: "🛵", label: "On Way" },
  { key: "delivered",        icon: "📦", label: "Delivered" },
];
const DELIVERY_SLOTS = [
  "As soon as possible",
  "10:00 AM – 12:00 PM",
  "12:00 PM – 02:00 PM",
  "02:00 PM – 04:00 PM",
  "04:00 PM – 06:00 PM",
  "06:00 PM – 08:00 PM",
  "08:00 PM – 10:00 PM",
];

function Skeleton({ w="100%", h=20, r=8 }) {
  return <div style={{ width:w, height:h, borderRadius:r, background:"#e2e8f0", animation:"shimmer 1.4s infinite" }} />;
}
function ProductSkeleton() {
  return (
    <div style={{ background:"#fff", borderRadius:16, padding:12, display:"flex", flexDirection:"column", gap:8 }}>
      <Skeleton h={90} r={12} /><Skeleton h={14} w="70%" /><Skeleton h={11} w="40%" />
      <div style={{ display:"flex", justifyContent:"space-between" }}><Skeleton h={18} w="30%" /><Skeleton h={30} w="60px" r={10} /></div>
    </div>
  );
}
function Toast({ toasts }) {
  return (
    <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", zIndex:9999, display:"flex", flexDirection:"column", gap:8, width:"90%", maxWidth:360, pointerEvents:"none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background:"#1a1a2e", color:"#fff", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:10, fontSize:14, boxShadow:"0 8px 24px rgba(0,0,0,0.3)", animation:"slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1)", borderLeft:`4px solid ${t.color||"#16a34a"}` }}>
          <span style={{ fontSize:20 }}>{t.icon}</span><span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
function ImageZoom({ src, name, onClose }) {
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ position:"relative", maxWidth:400, width:"100%" }}>
        <button onClick={onClose} style={{ position:"absolute", top:-40, right:0, background:"none", border:"none", color:"#fff", fontSize:28, cursor:"pointer" }}>✕</button>
        {src?.startsWith("http") ? <img src={src} alt={name} style={{ width:"100%", borderRadius:16, objectFit:"contain", maxHeight:"70vh" }} /> : <div style={{ fontSize:140, textAlign:"center" }}>{src}</div>}
        <p style={{ color:"#fff", textAlign:"center", marginTop:12, fontWeight:600 }}>{name}</p>
      </div>
    </div>
  );
}
function AuthModal({ onClose, onSuccess }) {
  const { dark } = useContext(AppContext);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bg = dark?"#1e293b":"#fff", text=dark?"#f1f5f9":"#1a1a2e", border=dark?"#334155":"#e2e8f0", inputBg=dark?"#0f172a":"#f8fafc";
  const inpStyle = { background:inputBg, border:`2px solid ${border}`, borderRadius:12, padding:"12px 14px", fontSize:14, color:text, outline:"none", fontFamily:"inherit" };
  const submit = async () => {
    if (!email||!password){setError("Email and password required");return;}
    setLoading(true);setError("");
    if(mode==="login"){
      const{error:e}=await supabase.auth.signInWithPassword({email,password});
      if(e){setError(e.message);setLoading(false);return;}
    } else {
      if(!name){setError("Name required");setLoading(false);return;}
      const{data,error:e}=await supabase.auth.signUp({email,password});
      if(e){setError(e.message);setLoading(false);return;}
      if(data.user){const rc=Math.random().toString(36).substring(2,8).toUpperCase();await supabase.from("user_profiles").insert([{id:data.user.id,name,referral_code:rc}]);}
    }
    setLoading(false);onSuccess();onClose();
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:1000, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:bg, borderRadius:"24px 24px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"28px 24px 40px" }}>
        <div style={{ width:40, height:4, background:border, borderRadius:2, margin:"0 auto 24px" }} />
        <h2 style={{ color:text, margin:"0 0 20px", fontSize:22, fontWeight:900 }}>{mode==="login"?"Welcome back 👋":"Create Account 🛒"}</h2>
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {["login","signup"].map(m=><button key={m} onClick={()=>setMode(m)} style={{ flex:1, padding:"10px 0", borderRadius:10, border:`2px solid ${mode===m?"#16a34a":border}`, background:mode===m?"#16a34a":"transparent", color:mode===m?"#fff":"#64748b", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{m==="login"?"Login":"Sign Up"}</button>)}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {mode==="signup"&&<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your Name" style={inpStyle} />}
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" style={inpStyle} />
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" style={inpStyle} />
          {error&&<p style={{ color:"#ef4444", fontSize:13, margin:0 }}>{error}</p>}
          <button onClick={submit} disabled={loading} style={{ background:"linear-gradient(135deg,#16a34a,#15803d)", color:"#fff", border:"none", borderRadius:14, padding:"15px 0", fontWeight:800, fontSize:16, cursor:"pointer", fontFamily:"inherit", marginTop:4 }}>
            {loading?"Please wait...":mode==="login"?"Login":"Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppProvider({ children }) {
  const [products,setProducts]=useState([]);
  const [categories,setCategories]=useState([]);
  const [banners,setBanners]=useState([]);
  const [settings,setSettings]=useState({deliveryFee:30,platformFee:5,taxRate:5,deliveryTime:8});
  const [offers,setOffers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [user,setUser]=useState(null);
  const [profile,setProfile]=useState(null);
  const [wishlist,setWishlist]=useState([]);
  const [addresses,setAddresses]=useState([]);
  const [cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.getItem("sabg_cart")||"{}");}catch{return {};}});
  const [page,setPage]=useState("home");
  const [selectedCategory,setSelectedCategory]=useState("All");
  const [searchQuery,setSearchQuery]=useState("");
  const [recentSearches,setRecentSearches]=useState(()=>{try{return JSON.parse(localStorage.getItem("sabg_searches")||"[]");}catch{return [];}});
  const [appliedOffer,setAppliedOffer]=useState(null);
  const [toasts,setToasts]=useState([]);
  const [dark,setDark]=useState(()=>localStorage.getItem("sabg_dark")==="true");
  const [zoomImage,setZoomImage]=useState(null);
  const [showAuth,setShowAuth]=useState(false);
  const [selectedProduct,setSelectedProduct]=useState(null);
  const [deliverySlot,setDeliverySlot]=useState(DELIVERY_SLOTS[0]);
  const toastId=useRef(0);

  useEffect(()=>{localStorage.setItem("sabg_dark",dark);},[dark]);
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>setUser(session?.user||null));
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>setUser(session?.user||null));
    return()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    if(!user){setProfile(null);setWishlist([]);setAddresses([]);return;}
    supabase.from("user_profiles").select("*").eq("id",user.id).single().then(({data})=>{if(data)setProfile(data);});
    supabase.from("wishlists").select("product_id").eq("user_id",user.id).then(({data})=>setWishlist(data?.map(w=>w.product_id)||[]));
    supabase.from("addresses").select("*").eq("user_id",user.id).order("is_default",{ascending:false}).then(({data})=>setAddresses(data||[]));
  },[user]);

  const fetchSettings=useCallback(async()=>{
    const{data}=await supabase.from("config").select("*").eq("key","settings").single();
    if(data?.value){const v=data.value;setSettings({deliveryFee:v.deliveryFee??30,platformFee:v.platformFee??5,taxRate:v.taxRate??5,deliveryTime:v.deliveryTime??8});}
  },[]);

  useEffect(()=>{
    let subs=[];
    Promise.all([
      supabase.from("products").select("*").order("name").then(({data})=>{if(data?.length)setProducts(data);}),
      supabase.from("categories").select("*").order("name").then(({data})=>{if(data?.length)setCategories(data);}),
      supabase.from("banners").select("*").eq("active",true).order("display_order").then(({data})=>{if(data?.length)setBanners(data);}),
      supabase.from("offers").select("*").eq("active",true).then(({data})=>{if(data?.length)setOffers(data);}),
      fetchSettings(),
    ]).finally(()=>setLoading(false));
    const sub=(table,fn)=>supabase.channel(`sub-${table}-${Math.random().toString(36).slice(2)}`).on("postgres_changes",{event:"*",schema:"public",table},fn).subscribe();
    subs.push(sub("products",()=>supabase.from("products").select("*").order("name").then(({data})=>data&&setProducts(data))));
    subs.push(sub("categories",()=>supabase.from("categories").select("*").order("name").then(({data})=>data&&setCategories(data))));
    subs.push(sub("banners",()=>supabase.from("banners").select("*").eq("active",true).order("display_order").then(({data})=>data&&setBanners(data))));
    subs.push(sub("offers",()=>supabase.from("offers").select("*").eq("active",true).then(({data})=>data&&setOffers(data))));
    subs.push(sub("config",fetchSettings));
    subs.push(sub("settings",fetchSettings));
    return()=>subs.forEach(s=>supabase.removeChannel(s));
  },[fetchSettings]);

  useEffect(()=>{localStorage.setItem("sabg_cart",JSON.stringify(cart));},[cart]);

  const addToast=useCallback((message,icon="✅",color="#16a34a")=>{
    const id=++toastId.current;
    setToasts(p=>[...p,{id,message,icon,color}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),2800);
  },[]);
  const updateCart=useCallback((productId,delta)=>{
    setCart(prev=>{const qty=(prev[productId]||0)+delta;if(qty<=0){const{[productId]:_,...rest}=prev;return rest;}return{...prev,[productId]:qty};});
  },[]);
  const addItem=useCallback((product)=>{updateCart(product.id,1);addToast(`${product.name} added!`,"🛒");},[updateCart,addToast]);
  const toggleWishlist=useCallback(async(productId)=>{
    if(!user){setShowAuth(true);return;}
    if(wishlist.includes(productId)){
      await supabase.from("wishlists").delete().eq("user_id",user.id).eq("product_id",productId);
      setWishlist(p=>p.filter(id=>id!==productId));addToast("Removed from wishlist","💔","#ef4444");
    } else {
      await supabase.from("wishlists").insert([{user_id:user.id,product_id:productId}]);
      setWishlist(p=>[...p,productId]);addToast("Added to wishlist!","❤️","#ef4444");
    }
  },[user,wishlist,addToast]);
  const addRecentSearch=useCallback((q)=>{
    if(!q.trim())return;
    setRecentSearches(prev=>{const u=[q,...prev.filter(s=>s!==q)].slice(0,6);localStorage.setItem("sabg_searches",JSON.stringify(u));return u;});
  },[]);
  const applyOffer=useCallback((code,sub)=>{
    const offer=offers.find(o=>o.code?.toLowerCase()===code.toLowerCase());
    if(!offer){addToast("Invalid promo code","❌","#ef4444");return false;}
    if(sub<Number(offer.min_order||0)){addToast(`Min order ₹${offer.min_order}`,"⚠️","#f59f00");return false;}
    setAppliedOffer(offer);addToast(`${offer.code} applied! 🎉`,"🎉");return true;
  },[offers,addToast]);
  const sendNotification=useCallback((title,body)=>{
    if(Notification.permission==="granted")new Notification(title,{body,icon:"/icon-192.png"});
  },[]);
  const requestNotifPermission=useCallback(async()=>{
    if(!("Notification"in window))return;
    const p=await Notification.requestPermission();
    if(p==="granted")addToast("Notifications enabled! 🔔","🔔");
  },[addToast]);
  const placeOrder=useCallback(async(orderData)=>{
    const{data,error}=await supabase.from("orders").insert([{...orderData,status:"pending",user_id:user?.id||null}]).select().single();
    if(error){console.error(error);return null;}
    sendNotification("sabG — Order Placed! 🎉",`Your order of ₹${orderData.total} is confirmed.`);
    return data;
  },[user,sendNotification]);

  const cartItems=products.filter(p=>cart[p.id]>0).map(p=>({...p,qty:cart[p.id]}));
  const cartCount=Object.values(cart).reduce((a,b)=>a+b,0);
  const subtotal=cartItems.reduce((s,i)=>s+i.price*i.qty,0);
  const deliveryFee=Number(settings.deliveryFee||30);
  const platformFee=Number(settings.platformFee||5);
  const tax=Math.round(subtotal*(settings.taxRate||5)/100);
  let discount=0;
  if(appliedOffer){discount=appliedOffer.type==="percent"?Math.round(subtotal*appliedOffer.discount/100):Number(appliedOffer.discount);discount=Math.min(discount,subtotal);}
  const total=Math.max(0,subtotal+deliveryFee+platformFee+tax-discount);

  const ctx={products,categories,banners,settings,offers,loading,user,profile,wishlist,addresses,setAddresses,cart,setCart,page,setPage,selectedCategory,setSelectedCategory,searchQuery,setSearchQuery,recentSearches,addRecentSearch,appliedOffer,setAppliedOffer,toasts,addToast,dark,setDark,zoomImage,setZoomImage,showAuth,setShowAuth,selectedProduct,setSelectedProduct,deliverySlot,setDeliverySlot,updateCart,addItem,toggleWishlist,applyOffer,placeOrder,cartItems,cartCount,subtotal,deliveryFee,platformFee,tax,discount,total,requestNotifPermission,sendNotification};
  return (
    <AppContext.Provider value={ctx}>
      {children}
      <Toast toasts={toasts}/>
      {showAuth&&<AuthModal onClose={()=>setShowAuth(false)} onSuccess={()=>addToast("Welcome to sabG! 🎉","👋")}/>}
      {zoomImage&&<ImageZoom src={zoomImage.src} name={zoomImage.name} onClose={()=>setZoomImage(null)}/>}
    </AppContext.Provider>
  );
}

function AddButton({product}){
  const{cart,addItem,updateCart}=useContext(AppContext);
  const qty=cart[product.id]||0;
  const btnStyle={background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",border:"none",borderRadius:10,padding:"7px 14px",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",boxShadow:"0 2px 8px rgba(22,163,74,0.3)"};
  if(qty===0)return<button onClick={e=>{e.stopPropagation();addItem(product);}} style={btnStyle}>+ ADD</button>;
  return(
    <div style={{display:"flex",alignItems:"center",background:"linear-gradient(135deg,#16a34a,#15803d)",borderRadius:10,overflow:"hidden",boxShadow:"0 2px 8px rgba(22,163,74,0.3)"}}>
      <button onClick={e=>{e.stopPropagation();updateCart(product.id,-1);}} style={{background:"none",border:"none",color:"#fff",width:28,height:30,fontSize:16,cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>−</button>
      <span style={{color:"#fff",fontWeight:700,fontSize:13,minWidth:16,textAlign:"center"}}>{qty}</span>
      <button onClick={e=>{e.stopPropagation();updateCart(product.id,1);}} style={{background:"none",border:"none",color:"#fff",width:28,height:30,fontSize:16,cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>+</button>
    </div>
  );
}

function ProductCard({product}){
  const{categories,wishlist,toggleWishlist,setZoomImage,setSelectedProduct,setPage,dark}=useContext(AppContext);
  const cat=categories.find(c=>c.id===product.category_id||c.name===product.category)||{};
  const imgSrc=product.image_url||product.image;
  const isUrl=imgSrc?.startsWith("http");
  const isWished=wishlist.includes(product.id);
  return(
    <div onClick={()=>{setSelectedProduct(product);setPage("product");}} style={{background:dark?"#1e293b":"#fff",borderRadius:16,padding:12,boxShadow:dark?"none":"0 2px 10px rgba(0,0,0,0.06)",border:`1px solid ${dark?"#334155":"#f0f0f0"}`,display:"flex",flexDirection:"column",gap:6,position:"relative",cursor:"pointer"}}>
      <button onClick={e=>{e.stopPropagation();toggleWishlist(product.id);}} style={{position:"absolute",top:8,right:8,background:"rgba(255,255,255,0.9)",border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",zIndex:3,fontSize:13}}>{isWished?"❤️":"🤍"}</button>
      {product.badge&&<div style={{position:"absolute",top:8,left:8,background:cat.color||"#16a34a",color:"#fff",borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:700,zIndex:2}}>{product.badge}</div>}
      {Number(product.discount||0)>0&&<div style={{position:"absolute",top:product.badge?30:8,left:8,background:"#ef4444",color:"#fff",borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:700,zIndex:2}}>-{product.discount}%</div>}
      <div onClick={e=>{e.stopPropagation();setZoomImage({src:imgSrc||product.image,name:product.name});}} style={{background:cat.bg||(dark?"#0f172a":"#f8fafc"),borderRadius:12,padding:"12px 0",display:"flex",alignItems:"center",justifyContent:"center",minHeight:80}}>
        {isUrl?<img src={imgSrc} alt={product.name} style={{width:70,height:70,objectFit:"contain",borderRadius:8}}/>:<span style={{fontSize:50,lineHeight:1}}>{imgSrc||"🛒"}</span>}
      </div>
      <p style={{margin:0,fontWeight:700,fontSize:13,color:dark?"#f1f5f9":"#1a1a2e",lineHeight:1.3}}>{product.name}</p>
      <p style={{margin:0,fontSize:11,color:"#94a3b8"}}>per {product.unit||"piece"}</p>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"auto"}}>
        <div>
          {Number(product.original_price||0)>Number(product.price)&&<span style={{textDecoration:"line-through",color:"#94a3b8",fontSize:11,display:"block"}}>₹{product.original_price}</span>}
          <strong style={{fontSize:15,color:dark?"#f1f5f9":"#1a1a2e",fontWeight:800}}>₹{product.price}</strong>
        </div>
        <AddButton product={product}/>
      </div>
    </div>
  );
}

function ProductDetailPage(){
  const{selectedProduct:p,setPage,dark,wishlist,toggleWishlist,user,setShowAuth,addToast,updateCart}=useContext(AppContext);
  const[reviews,setReviews]=useState([]);
  const[myReview,setMyReview]=useState({rating:5,comment:""});
  const[submitting,setSubmitting]=useState(false);
  const[zoomOpen,setZoomOpen]=useState(false);
  const bg=dark?"#0f172a":"#f8fafc",card=dark?"#1e293b":"#fff",text=dark?"#f1f5f9":"#1a1a2e";
  useEffect(()=>{if(!p)return;supabase.from("reviews").select("*,user_profiles(name)").eq("product_id",p.id).order("created_at",{ascending:false}).then(({data})=>setReviews(data||[]));},[p]);
  const submitReview=async()=>{
    if(!user){setShowAuth(true);return;}
    setSubmitting(true);
    await supabase.from("reviews").upsert([{user_id:user.id,product_id:p.id,rating:myReview.rating,comment:myReview.comment}]);
    const{data}=await supabase.from("reviews").select("*,user_profiles(name)").eq("product_id",p.id).order("created_at",{ascending:false});
    setReviews(data||[]);setSubmitting(false);addToast("Review submitted!","⭐");
  };
  if(!p)return null;
  const imgSrc=p.image_url||p.image;
  const isUrl=imgSrc?.startsWith("http");
  const avgRating=reviews.length?(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1):null;
  return(
    <div style={{background:bg,minHeight:"100vh",paddingBottom:100}}>
      {zoomOpen&&<ImageZoom src={imgSrc} name={p.name} onClose={()=>setZoomOpen(false)}/>}
      <div style={{background:card,padding:"16px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:50,borderBottom:`1px solid ${dark?"#334155":"#f0f0f0"}`}}>
        <button onClick={()=>setPage("home")} style={{background:dark?"#334155":"#f1f5f9",border:"none",borderRadius:10,padding:"8px 12px",cursor:"pointer",fontSize:16,color:text,fontFamily:"inherit"}}>←</button>
        <h2 style={{margin:0,fontSize:16,fontWeight:800,color:text,flex:1}}>{p.name}</h2>
        <button onClick={()=>toggleWishlist(p.id)} style={{background:"none",border:"none",fontSize:22,cursor:"pointer"}}>{wishlist.includes(p.id)?"❤️":"🤍"}</button>
      </div>
      <div onClick={()=>setZoomOpen(true)} style={{background:dark?"#1e293b":"#f0fdf4",padding:"32px 0",display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-in",position:"relative"}}>
        {isUrl?<img src={imgSrc} alt={p.name} style={{width:180,height:180,objectFit:"contain",borderRadius:16}}/>:<span style={{fontSize:120,lineHeight:1}}>{imgSrc||"🛒"}</span>}
        <span style={{position:"absolute",bottom:8,right:16,color:"#94a3b8",fontSize:10}}>Tap to zoom 🔍</span>
      </div>
      <div style={{padding:"20px 16px"}}>
        <div style={{background:card,borderRadius:16,padding:16,marginBottom:14,boxShadow:dark?"none":"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <h1 style={{margin:0,fontSize:20,fontWeight:900,color:text,flex:1}}>{p.name}</h1>
            {avgRating&&<span style={{background:"#16a34a",color:"#fff",borderRadius:8,padding:"3px 10px",fontSize:13,fontWeight:700,flexShrink:0,marginLeft:8}}>⭐ {avgRating}</span>}
          </div>
          <p style={{margin:"0 0 12px",color:"#94a3b8",fontSize:13}}>per {p.unit||"piece"}{p.badge&&` · ${p.badge}`}</p>
          {p.description&&<p style={{margin:"0 0 12px",color:dark?"#94a3b8":"#64748b",fontSize:14,lineHeight:1.6}}>{p.description}</p>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              {Number(p.original_price||0)>Number(p.price)&&<span style={{textDecoration:"line-through",color:"#94a3b8",fontSize:13}}>₹{p.original_price}</span>}
              <p style={{margin:0,fontSize:28,fontWeight:900,color:text}}>₹{p.price}</p>
            </div>
            <AddButton product={p}/>
          </div>
        </div>
        <div style={{background:card,borderRadius:16,padding:16,boxShadow:dark?"none":"0 2px 8px rgba(0,0,0,0.06)"}}>
          <h3 style={{margin:"0 0 14px",fontSize:16,fontWeight:800,color:text}}>⭐ Reviews ({reviews.length})</h3>
          <div style={{marginBottom:16}}>
            <p style={{margin:"0 0 8px",fontSize:13,color:"#94a3b8"}}>Rate this product:</p>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setMyReview(p=>({...p,rating:n}))} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",opacity:myReview.rating>=n?1:0.3}}>⭐</button>)}
            </div>
            <textarea value={myReview.comment} onChange={e=>setMyReview(p=>({...p,comment:e.target.value}))} placeholder="Write your review..." rows={2} style={{width:"100%",border:`2px solid ${dark?"#334155":"#e2e8f0"}`,borderRadius:10,padding:"10px 12px",fontSize:13,background:dark?"#0f172a":"#f8fafc",color:text,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:8}}/>
            <button onClick={submitReview} disabled={submitting} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{submitting?"Submitting...":"Submit Review"}</button>
          </div>
          {reviews.map(r=>(
            <div key={r.id} style={{borderTop:`1px solid ${dark?"#334155":"#f0f0f0"}`,paddingTop:12,marginTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontWeight:700,fontSize:13,color:text}}>{r.user_profiles?.name||"User"}</span>
                <span>{"⭐".repeat(r.rating)}</span>
              </div>
              {r.comment&&<p style={{margin:0,fontSize:13,color:"#64748b"}}>{r.comment}</p>}
            </div>
          ))}
          {reviews.length===0&&<p style={{color:"#94a3b8",fontSize:13}}>No reviews yet. Be the first!</p>}
        </div>
      </div>
    </div>
  );
}

function HomePage(){
  const{products,categories,banners,settings,loading,selectedCategory,setSelectedCategory,searchQuery,setSearchQuery,recentSearches,addRecentSearch,dark,setPage,user,setShowAuth,cartCount,total,requestNotifPermission,setDark}=useContext(AppContext);
  const[bannerIdx,setBannerIdx]=useState(0);
  const[showSugg,setShowSugg]=useState(false);
  const searchRef=useRef(null);
  const bg=dark?"#0f172a":"#f8fafc",card=dark?"#1e293b":"#fff",text=dark?"#f1f5f9":"#1a1a2e";
  useEffect(()=>{if(banners.length<=1)return;const t=setInterval(()=>setBannerIdx(i=>(i+1)%banners.length),3500);return()=>clearInterval(t);},[banners.length]);
  const suggestions=useMemo(()=>{if(!searchQuery||searchQuery.length<2)return[];return products.filter(p=>p.name.toLowerCase().includes(searchQuery.toLowerCase())&&p.available!==false).slice(0,5);},[searchQuery,products]);
  const popularProducts=useMemo(()=>products.filter(p=>p.available!==false).slice(0,5),[products]);
  const filtered=useMemo(()=>products.filter(p=>{const catOk=selectedCategory==="All"||p.category===selectedCategory||p.category_id===selectedCategory;const srchOk=!searchQuery||p.name.toLowerCase().includes(searchQuery.toLowerCase());return catOk&&srchOk&&p.available!==false;}),[products,selectedCategory,searchQuery]);
  const banner=banners[bannerIdx%Math.max(banners.length,1)];
  const confirmSearch=(q)=>{setSearchQuery(q);addRecentSearch(q);setShowSugg(false);searchRef.current?.blur();};
  return(
    <div style={{background:bg,minHeight:"100vh",paddingBottom:100}}>
      <div style={{background:"linear-gradient(160deg,#0f172a,#1e293b)",padding:"16px 16px 18px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
              <span style={{fontSize:11,color:"#94a3b8",fontWeight:600,letterSpacing:1}}>DELIVERY IN</span>
              <span style={{background:"#16a34a",color:"#fff",borderRadius:6,padding:"1px 8px",fontSize:10,fontWeight:800}}>⚡ {settings.deliveryTime} MINS</span>
            </div>
            <h1 style={{margin:0,color:"#fff",fontSize:22,fontWeight:900,letterSpacing:-0.5}}>sabG</h1>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>setDark(d=>!d)} style={{background:"#1e3a5f",border:"none",borderRadius:10,padding:"7px 10px",cursor:"pointer",fontSize:16}}>{dark?"☀️":"🌙"}</button>
            <button onClick={()=>requestNotifPermission()} style={{background:"#1e3a5f",border:"none",borderRadius:10,padding:"7px 10px",cursor:"pointer",fontSize:16}}>🔔</button>
            <button onClick={()=>user?setPage("profile"):setShowAuth(true)} style={{background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:10,padding:"7px 12px",cursor:"pointer",fontSize:13,color:"#fff",fontWeight:700,fontFamily:"inherit"}}>{user?"👤":"Login"}</button>
          </div>
        </div>
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"#94a3b8",fontSize:15}}>🔍</span>
          <input ref={searchRef} value={searchQuery} onChange={e=>{setSearchQuery(e.target.value);setShowSugg(e.target.value.length>1);}} onFocus={()=>setShowSugg(true)} onKeyDown={e=>e.key==="Enter"&&confirmSearch(searchQuery)} placeholder="Search groceries..." style={{width:"100%",background:"#fff",border:"none",borderRadius:14,padding:"12px 40px 12px 40px",fontSize:14,fontFamily:"inherit",boxSizing:"border-box",outline:"none",color:"#1e293b",fontWeight:500}}/>
          {searchQuery&&<button onClick={()=>{setSearchQuery("");setShowSugg(false);}} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"#94a3b8",border:"none",borderRadius:"50%",width:20,height:20,cursor:"pointer",color:"#fff",fontSize:11,fontFamily:"inherit"}}>✕</button>}
          {showSugg&&(searchQuery.length>1||recentSearches.length>0)&&(
            <div style={{position:"absolute",left:0,right:0,top:"100%",background:"#fff",borderRadius:"0 0 14px 14px",boxShadow:"0 8px 24px rgba(0,0,0,0.15)",zIndex:200,overflow:"hidden",maxHeight:300,overflowY:"auto"}} onMouseDown={e=>e.preventDefault()}>
              {searchQuery.length>1&&suggestions.map(p=>(
                <div key={p.id} onClick={()=>confirmSearch(p.name)} style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",borderBottom:"1px solid #f8fafc"}}>
                  <span style={{fontSize:20}}>{p.image?.startsWith("http")?"🛒":p.image}</span>
                  <div><p style={{margin:0,fontSize:13,fontWeight:600,color:"#1a1a2e"}}>{p.name}</p><p style={{margin:0,fontSize:11,color:"#94a3b8"}}>₹{p.price}/{p.unit}</p></div>
                </div>
              ))}
              {!searchQuery&&recentSearches.length>0&&(
                <div style={{padding:"8px 14px"}}>
                  <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,color:"#94a3b8"}}>RECENT SEARCHES</p>
                  {recentSearches.map(s=><div key={s} onClick={()=>confirmSearch(s)} style={{padding:"8px 0",display:"flex",alignItems:"center",gap:8,cursor:"pointer",color:"#334155",fontSize:13,borderBottom:"1px solid #f8fafc"}}>🕐 {s}</div>)}
                </div>
              )}
              {searchQuery.length>1&&suggestions.length===0&&<div style={{padding:14,color:"#94a3b8",fontSize:13,textAlign:"center"}}>No results for "{searchQuery}"</div>}
            </div>
          )}
        </div>
      </div>

      {!searchQuery&&banner&&(
        <div style={{padding:"14px 16px 0"}}>
          <div style={{background:banner.bg||"linear-gradient(135deg,#16a34a,#15803d)",borderRadius:18,padding:20,position:"relative",overflow:"hidden",minHeight:95}}>
            {banner.image_url&&<img src={banner.image_url} alt="" style={{position:"absolute",right:0,top:0,height:"100%",objectFit:"cover",opacity:0.2}}/>}
            <p style={{margin:"0 0 4px",color:"rgba(255,255,255,0.85)",fontSize:12,fontWeight:600}}>{banner.subtitle}</p>
            <h3 style={{margin:0,color:"#fff",fontSize:20,fontWeight:900}}>{banner.title||"sabG Offers"}</h3>
            {banners.length>1&&<div style={{display:"flex",gap:5,marginTop:10}}>{banners.map((_,i)=><div key={i} onClick={()=>setBannerIdx(i)} style={{width:i===bannerIdx?20:6,height:6,borderRadius:3,background:i===bannerIdx?"#fff":"rgba(255,255,255,0.4)",cursor:"pointer",transition:"all 0.3s"}}/>)}</div>}
          </div>
        </div>
      )}

      {!searchQuery&&popularProducts.length>0&&(
        <div style={{padding:"18px 0 0"}}>
          <div style={{padding:"0 16px",marginBottom:10}}><h2 style={{margin:0,fontSize:16,fontWeight:800,color:text}}>🔥 Popular Items</h2></div>
          <div style={{overflowX:"auto",padding:"0 16px",scrollbarWidth:"none"}}>
            <div style={{display:"flex",gap:10,width:"max-content"}}>
              {popularProducts.map(p=>{
                const imgSrc=p.image_url||p.image;const isUrl=imgSrc?.startsWith("http");
                return(
                  <div key={p.id} style={{background:card,borderRadius:14,padding:10,width:120,flexShrink:0,border:`1px solid ${dark?"#334155":"#f0f0f0"}`}}>
                    <div style={{fontSize:36,textAlign:"center",marginBottom:6}}>{isUrl?<img src={imgSrc} alt={p.name} style={{width:40,height:40,objectFit:"contain"}}/>:(imgSrc||"🛒")}</div>
                    <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:text,textAlign:"center",lineHeight:1.2}}>{p.name}</p>
                    <p style={{margin:"0 0 6px",fontSize:11,color:"#16a34a",textAlign:"center",fontWeight:700}}>₹{p.price}</p>
                    <div style={{display:"flex",justifyContent:"center"}}><AddButton product={p}/></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!searchQuery&&(
        <div style={{padding:"16px 0 0"}}>
          <div style={{padding:"0 16px",marginBottom:10}}><h2 style={{margin:0,fontSize:16,fontWeight:800,color:text}}>Categories</h2></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,padding:"0 16px"}}>
            {categories.map(cat=>(
              <button key={cat.id} onClick={()=>setSelectedCategory(selectedCategory===cat.name?"All":cat.name)} style={{background:selectedCategory===cat.name?cat.color:cat.bg||(dark?"#1e293b":"#f8fafc"),border:`2px solid ${selectedCategory===cat.name?cat.color:"transparent"}`,borderRadius:14,padding:"10px 4px 8px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,fontFamily:"inherit"}}>
                <span style={{fontSize:24}}>{cat.emoji}</span>
                <span style={{fontSize:10,fontWeight:700,color:selectedCategory===cat.name?"#fff":cat.color||"#64748b",textAlign:"center"}}>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{overflowX:"auto",padding:"12px 16px 0",scrollbarWidth:"none"}}>
        <div style={{display:"flex",gap:8,width:"max-content"}}>
          {[{id:"all",name:"All Items",emoji:"✨",color:"#16a34a"},...categories].map(cat=>(
            <button key={cat.id} onClick={()=>setSelectedCategory(cat.name==="All Items"?"All":cat.name)} style={{background:(selectedCategory===cat.name||(cat.name==="All Items"&&selectedCategory==="All"))?cat.color||"#16a34a":card,color:(selectedCategory===cat.name||(cat.name==="All Items"&&selectedCategory==="All"))?"#fff":"#64748b",border:`2px solid ${(selectedCategory===cat.name||(cat.name==="All Items"&&selectedCategory==="All"))?cat.color||"#16a34a":dark?"#334155":"#e2e8f0"}`,borderRadius:50,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>{cat.emoji} {cat.name}</button>
          ))}
        </div>
      </div>

      <div style={{padding:"14px 16px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <h2 style={{margin:0,fontSize:16,fontWeight:800,color:text}}>{searchQuery?`"${searchQuery}"`:selectedCategory!=="All"?selectedCategory:"All Products"}</h2>
          <span style={{color:"#94a3b8",fontSize:12}}>{filtered.length} items</span>
        </div>
        {loading?(
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>{[1,2,3,4,5,6].map(i=><ProductSkeleton key={i}/>)}</div>
        ):filtered.length===0?(
          <div style={{textAlign:"center",padding:"48px 20px"}}>
            <div style={{fontSize:48,marginBottom:12}}>🔍</div>
            <h3 style={{color:text,margin:"0 0 8px"}}>Nothing found</h3>
            <p style={{color:"#94a3b8"}}>Try a different search</p>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>{filtered.map(p=><ProductCard key={p.id} product={p}/>)}</div>
        )}
      </div>

      {cartCount>0&&(
        <div style={{position:"fixed",bottom:72,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 32px)",maxWidth:448,zIndex:200}}>
          <button onClick={()=>setPage("cart")} style={{width:"100%",background:"linear-gradient(135deg,#0f172a,#1e3a5f)",color:"#fff",border:"none",borderRadius:18,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{background:"#ef4444",color:"#fff",borderRadius:"50%",width:22,height:22,fontSize:11,fontWeight:900,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{cartCount}</span>
              <span style={{fontWeight:700,fontSize:14}}>{cartCount} item{cartCount!==1?"s":""} in cart</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontWeight:800,fontSize:15}}>₹{total}</span>
              <span style={{background:"#16a34a",borderRadius:8,padding:"2px 10px",fontSize:12,fontWeight:700}}>View →</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

function CartPage(){
  const{cartItems,updateCart,subtotal,deliveryFee,platformFee,tax,discount,total,setPage,applyOffer,appliedOffer,setAppliedOffer,dark,settings,deliverySlot,setDeliverySlot}=useContext(AppContext);
  const[promoInput,setPromoInput]=useState("");
  const bg=dark?"#0f172a":"#f8fafc",card=dark?"#1e293b":"#fff",text=dark?"#f1f5f9":"#1a1a2e";
  if(cartItems.length===0)return(
    <div style={{background:bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
      <div style={{fontSize:80,marginBottom:16}}>🛒</div>
      <h2 style={{color:text,margin:"0 0 8px"}}>Your cart is empty</h2>
      <p style={{color:"#94a3b8",margin:"0 0 28px"}}>Add some fresh groceries!</p>
      <button onClick={()=>setPage("home")} style={{background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",border:"none",borderRadius:14,padding:"14px 32px",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Shop Now</button>
    </div>
  );
  return(
    <div style={{background:bg,minHeight:"100vh",paddingBottom:120}}>
      <div style={{background:card,borderBottom:`1px solid ${dark?"#334155":"#f0f0f0"}`,padding:"16px",position:"sticky",top:0,zIndex:50}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:800,color:text}}>🛒 Cart ({cartItems.length})</h2>
      </div>
      <div style={{margin:"12px 16px",background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:20}}>⚡</span><p style={{margin:0,fontWeight:700,fontSize:13,color:"#166534"}}>Delivery in {settings.deliveryTime} minutes</p>
      </div>
      <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:10}}>
        {cartItems.map(item=>{
          const imgSrc=item.image_url||item.image;
          return(
            <div key={item.id} style={{background:card,borderRadius:16,padding:14,boxShadow:dark?"none":"0 2px 8px rgba(0,0,0,0.06)",display:"flex",gap:12,alignItems:"center",border:`1px solid ${dark?"#334155":"transparent"}`}}>
              <div style={{background:dark?"#0f172a":"#f8fafc",borderRadius:10,width:52,height:52,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {imgSrc?.startsWith("http")?<img src={imgSrc} alt={item.name} style={{width:40,height:40,objectFit:"contain"}}/>:<span style={{fontSize:30}}>{imgSrc||"🛒"}</span>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:"0 0 2px",fontWeight:700,fontSize:13,color:text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</p>
                <p style={{margin:0,fontSize:11,color:"#94a3b8"}}>₹{item.price}/{item.unit}</p>
                <p style={{margin:"3px 0 0",fontWeight:800,fontSize:14,color:"#16a34a"}}>₹{item.price*item.qty}</p>
              </div>
              <div style={{display:"flex",alignItems:"center",background:"linear-gradient(135deg,#16a34a,#15803d)",borderRadius:10,overflow:"hidden"}}>
                <button onClick={()=>updateCart(item.id,-1)} style={{background:"none",border:"none",color:"#fff",width:32,height:32,fontSize:18,cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>−</button>
                <span style={{color:"#fff",fontWeight:800,fontSize:14,minWidth:18,textAlign:"center"}}>{item.qty}</span>
                <button onClick={()=>updateCart(item.id,1)} style={{background:"none",border:"none",color:"#fff",width:32,height:32,fontSize:18,cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>+</button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{margin:"14px 16px 0",background:card,borderRadius:16,padding:"14px 16px",border:`1px solid ${dark?"#334155":"transparent"}`}}>
        <p style={{margin:"0 0 8px",fontWeight:700,fontSize:13,color:text}}>🕐 Delivery Slot</p>
        <select value={deliverySlot} onChange={e=>setDeliverySlot(e.target.value)} style={{width:"100%",background:dark?"#0f172a":"#f8fafc",border:`2px solid ${dark?"#334155":"#e2e8f0"}`,borderRadius:10,padding:"10px 12px",fontSize:13,color:text,outline:"none",fontFamily:"inherit"}}>
          {DELIVERY_SLOTS.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{margin:"14px 16px 0",background:card,borderRadius:16,padding:"14px 16px",border:`1px solid ${dark?"#334155":"transparent"}`}}>
        {appliedOffer?(
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span>🎉</span><span style={{flex:1,color:"#166534",fontWeight:700,fontSize:13}}>{appliedOffer.code} — saving ₹{discount}</span>
            <button onClick={()=>setAppliedOffer(null)} style={{color:"#ef4444",fontWeight:700,fontSize:12,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Remove</button>
          </div>
        ):(
          <div style={{display:"flex",gap:8}}>
            <input value={promoInput} onChange={e=>setPromoInput(e.target.value.toUpperCase())} placeholder="🏷️ Promo code" style={{flex:1,border:`2px solid ${dark?"#334155":"#e2e8f0"}`,borderRadius:10,padding:"9px 12px",fontSize:13,fontFamily:"inherit",outline:"none",background:dark?"#0f172a":"#f8fafc",color:text,letterSpacing:1,fontWeight:600}}/>
            <button onClick={()=>applyOffer(promoInput,subtotal)} disabled={!promoInput} style={{background:promoInput?"#16a34a":"#94a3b8",color:"#fff",border:"none",borderRadius:10,padding:"9px 16px",fontWeight:700,cursor:promoInput?"pointer":"default",fontFamily:"inherit"}}>Apply</button>
          </div>
        )}
      </div>
      <div style={{margin:"14px 16px 0",background:card,borderRadius:16,padding:16,border:`1px solid ${dark?"#334155":"transparent"}`}}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:text}}>Bill Summary</h3>
        {[["Item Total",`₹${subtotal}`],["Delivery Fee",`₹${deliveryFee}`],["Platform Fee",`₹${platformFee}`],["GST & Taxes",`₹${tax}`]].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{color:"#64748b",fontSize:14}}>{l}</span><span style={{color:dark?"#cbd5e1":"#334155",fontWeight:600,fontSize:14}}>{v}</span>
          </div>
        ))}
        {discount>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{color:"#22c55e",fontSize:14}}>Discount</span><span style={{color:"#22c55e",fontWeight:700,fontSize:14}}>−₹{discount}</span></div>}
        <div style={{borderTop:`2px dashed ${dark?"#334155":"#e2e8f0"}`,margin:"10px 0",paddingTop:12,display:"flex",justifyContent:"space-between"}}>
          <span style={{fontWeight:800,fontSize:16,color:text}}>Grand Total</span><span style={{fontWeight:900,fontSize:18,color:"#16a34a"}}>₹{total}</span>
        </div>
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,padding:16,background:card,borderTop:`1px solid ${dark?"#334155":"#f0f0f0"}`,boxSizing:"border-box"}}>
        <button onClick={()=>setPage("checkout")} style={{width:"100%",background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",border:"none",borderRadius:16,padding:"16px 24px",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:"inherit",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 6px 20px rgba(22,163,74,0.4)"}}>
          <span>Proceed to Checkout</span><span style={{background:"rgba(255,255,255,0.2)",borderRadius:8,padding:"3px 12px"}}>₹{total}</span>
        </button>
      </div>
    </div>
  );
}

function CheckoutPage(){
  const{cartItems,subtotal,deliveryFee,platformFee,tax,discount,total,setPage,addToast,placeOrder,setCart,appliedOffer,user,setShowAuth,addresses,setAddresses,dark,deliverySlot,settings}=useContext(AppContext);
  const[address,setAddress]=useState("");
  const[payMethod,setPayMethod]=useState("cod");
  const[placed,setPlaced]=useState(false);
  const[orderId,setOrderId]=useState(null);
  const[loading,setLoading]=useState(false);
  const[saveAddr,setSaveAddr]=useState(false);
  const[addrLabel,setAddrLabel]=useState("Home");
  const bg=dark?"#0f172a":"#f8fafc",card=dark?"#1e293b":"#fff",text=dark?"#f1f5f9":"#1a1a2e";
  useEffect(()=>{if(addresses.length>0)setAddress(addresses[0].address);},[addresses]);

  const loadRazorpay=()=>new Promise(resolve=>{
    if(window.Razorpay){resolve(true);return;}
    const s=document.createElement("script");s.src="https://checkout.razorpay.com/v1/checkout.js";s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.body.appendChild(s);
  });

  const handlePlaceOrder=async(method=payMethod,paymentId=null)=>{
    if(!address.trim()){addToast("Please enter delivery address","📍","#f59f00");return;}
    setLoading(true);
    if(saveAddr&&user){await supabase.from("addresses").insert([{user_id:user.id,label:addrLabel,address:address.trim(),is_default:addresses.length===0}]);}
    const data=await placeOrder({items:cartItems.map(i=>({id:i.id,name:i.name,price:i.price,quantity:i.qty,total:i.price*i.qty,unit:i.unit})),subtotal,delivery_fee:deliveryFee,platform_fee:platformFee,tax,discount,total,address:address.trim(),payment_method:method,promo_code:appliedOffer?.code||null,payment_id:paymentId,delivery_slot:deliverySlot});
    setLoading(false);
    if(!data){addToast("Order failed. Try again.","❌","#ef4444");return;}
    setOrderId(data.id);setCart({});localStorage.removeItem("sabg_cart");setPlaced(true);
  };

  const handleOrder=async()=>{
    if(!user){setShowAuth(true);return;}
    if(payMethod==="razorpay"){
      const loaded=await loadRazorpay();
      if(!loaded){alert("Razorpay failed to load.");return;}
      const opts={key:RAZORPAY_KEY,amount:total*100,currency:"INR",name:"sabG",description:"Grocery Order",image:"/icon-192.png",handler:async(res)=>{await handlePlaceOrder("razorpay",res.razorpay_payment_id);},prefill:{email:user?.email||""},theme:{color:"#16a34a"},modal:{ondismiss:()=>setLoading(false)}};
      new window.Razorpay(opts).open();return;
    }
    await handlePlaceOrder();
  };

  if(placed)return(
    <div style={{background:bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
      <div style={{fontSize:80,marginBottom:16}}>🎉</div>
      <h2 style={{color:text,margin:"0 0 8px",fontSize:24,fontWeight:900}}>Order Confirmed!</h2>
      <p style={{color:"#64748b",margin:"0 0 4px"}}>Your groceries are being packed</p>
      <p style={{color:"#94a3b8",fontSize:12,margin:"0 0 20px",fontFamily:"monospace"}}>#{String(orderId).slice(-8).toUpperCase()}</p>
      <div style={{background:card,borderRadius:16,padding:"14px 24px",marginBottom:24,border:"1px solid #bbf7d0"}}>
        <p style={{color:"#166534",fontWeight:800,margin:"0 0 4px"}}>⚡ {deliverySlot===DELIVERY_SLOTS[0]?`Arriving in ~${settings?.deliveryTime||8} minutes`:`Scheduled: ${deliverySlot}`}</p>
        <p style={{color:"#4ade80",margin:0,fontSize:12}}>You will receive live updates</p>
      </div>
      <div style={{background:card,borderRadius:16,padding:20,marginBottom:24,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
        <p style={{color:"#94a3b8",fontSize:11,margin:"0 0 4px"}}>AMOUNT PAID</p>
        <p style={{color:"#16a34a",fontSize:32,fontWeight:900,margin:0}}>₹{total}</p>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setPage("orders")} style={{background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",border:"none",borderRadius:14,padding:"14px 24px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Track Order</button>
        <button onClick={()=>setPage("home")} style={{background:card,color:text,border:`2px solid ${dark?"#334155":"#e2e8f0"}`,borderRadius:14,padding:"14px 24px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Shop More</button>
      </div>
    </div>
  );

  return(
    <div style={{background:bg,minHeight:"100vh",paddingBottom:120}}>
      <div style={{background:card,borderBottom:`1px solid ${dark?"#334155":"#f0f0f0"}`,padding:16,position:"sticky",top:0,zIndex:50}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:800,color:text}}>Checkout</h2>
      </div>
      {addresses.length>0&&(
        <div style={{margin:"16px 16px 0"}}>
          <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#64748b",letterSpacing:1}}>SAVED ADDRESSES</p>
          <div style={{display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none"}}>
            {addresses.map(a=>(
              <div key={a.id} onClick={()=>setAddress(a.address)} style={{background:address===a.address?"#f0fdf4":card,border:`2px solid ${address===a.address?"#16a34a":dark?"#334155":"#e2e8f0"}`,borderRadius:12,padding:"10px 14px",cursor:"pointer",minWidth:140,flexShrink:0}}>
                <p style={{margin:"0 0 2px",fontWeight:700,fontSize:12,color:address===a.address?"#16a34a":text}}>{a.label||"Address"}</p>
                <p style={{margin:0,fontSize:11,color:"#64748b",lineHeight:1.3}}>{a.address.slice(0,30)}...</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{margin:"16px 16px 0"}}>
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#64748b",letterSpacing:1}}>DELIVERY ADDRESS</p>
        <textarea value={address} onChange={e=>setAddress(e.target.value)} placeholder="📍 House no., Street, Area, City..." rows={2} style={{width:"100%",border:`2px solid ${dark?"#334155":"#e2e8f0"}`,borderRadius:12,padding:"12px 14px",fontSize:14,fontFamily:"inherit",resize:"none",outline:"none",background:card,color:text,boxSizing:"border-box"}}/>
        {user&&(
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8,flexWrap:"wrap"}}>
            <input type="checkbox" checked={saveAddr} onChange={e=>setSaveAddr(e.target.checked)}/>
            <span style={{fontSize:13,color:text}}>Save as</span>
            <select value={addrLabel} onChange={e=>setAddrLabel(e.target.value)} style={{background:card,border:`1px solid ${dark?"#334155":"#e2e8f0"}`,borderRadius:8,padding:"4px 8px",fontSize:12,color:text,fontFamily:"inherit",outline:"none"}}>
              {["Home","Work","Other"].map(l=><option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        )}
      </div>
      <div style={{margin:"16px 16px 0",background:card,borderRadius:14,padding:"14px 16px",border:`1px solid ${dark?"#334155":"transparent"}`}}>
        <p style={{margin:"0 0 4px",fontSize:12,fontWeight:700,color:"#64748b"}}>DELIVERY SLOT</p>
        <p style={{margin:0,fontWeight:600,fontSize:14,color:"#16a34a"}}>🕐 {deliverySlot}</p>
      </div>
      <div style={{margin:"16px 16px 0"}}>
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#64748b",letterSpacing:1}}>ORDER ITEMS ({cartItems.length})</p>
        <div style={{background:card,borderRadius:16,overflow:"hidden",border:`1px solid ${dark?"#334155":"transparent"}`}}>
          {cartItems.map((item,idx)=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:idx<cartItems.length-1?`1px solid ${dark?"#334155":"#f8fafc"}`:"none"}}>
              <span style={{fontSize:22}}>{item.image?.startsWith("http")?"":item.image||"🛒"}</span>
              {item.image?.startsWith("http")&&<img src={item.image} alt="" style={{width:28,height:28,objectFit:"contain"}}/>}
              <div style={{flex:1}}><p style={{margin:0,fontWeight:600,fontSize:13,color:text}}>{item.name}</p><p style={{margin:0,fontSize:11,color:"#94a3b8"}}>× {item.qty}</p></div>
              <span style={{fontWeight:700,fontSize:14,color:text}}>₹{item.price*item.qty}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{margin:"16px 16px 0",background:card,borderRadius:16,padding:16,border:`1px solid ${dark?"#334155":"transparent"}`}}>
        <p style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:"#64748b",letterSpacing:1}}>PAYMENT METHOD</p>
        {[["cod","💵","Cash on Delivery"],["razorpay","📱","UPI / Card (Razorpay)"]].map(([val,icon,label])=>(
          <div key={val} onClick={()=>setPayMethod(val)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",cursor:"pointer",borderBottom:val==="cod"?`1px solid ${dark?"#334155":"#f1f5f9"}`:"none"}}>
            <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${payMethod===val?"#16a34a":"#cbd5e1"}`,background:payMethod===val?"#16a34a":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {payMethod===val&&<div style={{width:6,height:6,borderRadius:"50%",background:"#fff"}}/>}
            </div>
            <span style={{fontSize:18}}>{icon}</span><span style={{fontSize:14,fontWeight:500,color:text}}>{label}</span>
          </div>
        ))}
      </div>
      <div style={{margin:"16px 16px 0",background:card,borderRadius:16,padding:16,border:`1px solid ${dark?"#334155":"transparent"}`}}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:800,color:text}}>Payment Summary</h3>
        {[["Subtotal",subtotal],["Delivery Fee",deliveryFee],["Platform Fee",platformFee],["Taxes",tax]].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{color:"#64748b",fontSize:14}}>{l}</span><span style={{color:text,fontWeight:600,fontSize:14}}>₹{v}</span></div>
        ))}
        {discount>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{color:"#22c55e",fontSize:14}}>Discount</span><span style={{color:"#22c55e",fontWeight:700}}>−₹{discount}</span></div>}
        <div style={{borderTop:`2px solid ${dark?"#334155":"#f1f5f9"}`,marginTop:10,paddingTop:12,display:"flex",justifyContent:"space-between"}}>
          <span style={{fontWeight:800,fontSize:16,color:text}}>Total</span><span style={{fontWeight:900,fontSize:20,color:"#16a34a"}}>₹{total}</span>
        </div>
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,padding:16,background:card,borderTop:`1px solid ${dark?"#334155":"#f0f0f0"}`,boxSizing:"border-box"}}>
        <button onClick={handleOrder} disabled={loading} style={{width:"100%",background:loading?"#94a3b8":"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",border:"none",borderRadius:16,padding:"16px 0",fontWeight:800,fontSize:16,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",transition:"all 0.3s"}}>
          {loading?"Placing Order...":`Place Order · ₹${total}`}
        </button>
      </div>
    </div>
  );
}

function OrdersPage(){
  const{user,setShowAuth,dark,addToast,products,updateCart}=useContext(AppContext);
  const[orders,setOrders]=useState([]);
  const[loading,setLoading]=useState(true);
  const[expanded,setExpanded]=useState(null);
  const bg=dark?"#0f172a":"#f8fafc",card=dark?"#1e293b":"#fff",text=dark?"#f1f5f9":"#1a1a2e";
  const STATUS_COLORS={pending:"#f59f00",confirmed:"#0ea5e9",preparing:"#8b5cf6",out_for_delivery:"#f97316",delivered:"#22c55e",cancelled:"#ef4444"};

  useEffect(()=>{
    if(!user){setLoading(false);return;}
    supabase.from("orders").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).then(({data})=>{setOrders(data||[]);setLoading(false);});
    const sub=supabase.channel("orders-live").on("postgres_changes",{event:"*",schema:"public",table:"orders"},()=>{supabase.from("orders").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).then(({data})=>setOrders(data||[]));}).subscribe();
    return()=>supabase.removeChannel(sub);
  },[user]);

  const reorder=(order)=>{
    (order.items||[]).forEach(item=>{const product=products.find(p=>p.id===item.id);if(product)updateCart(product.id,item.quantity);});
    addToast("Items added to cart!","🛒");
  };

  if(!user)return(
    <div style={{background:bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
      <div style={{fontSize:64,marginBottom:16}}>📦</div>
      <h2 style={{color:text,margin:"0 0 8px"}}>Track Your Orders</h2>
      <p style={{color:"#94a3b8",margin:"0 0 24px"}}>Login to see your order history</p>
      <button onClick={()=>setShowAuth(true)} style={{background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",border:"none",borderRadius:14,padding:"14px 32px",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Login</button>
    </div>
  );
  return(
    <div style={{background:bg,minHeight:"100vh",paddingBottom:80}}>
      <div style={{background:card,borderBottom:`1px solid ${dark?"#334155":"#f0f0f0"}`,padding:"16px",position:"sticky",top:0,zIndex:50}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:800,color:text}}>📦 My Orders</h2>
      </div>
      {loading?<p style={{textAlign:"center",padding:40,color:"#94a3b8"}}>Loading...</p>:orders.length===0?(
        <div style={{textAlign:"center",padding:"60px 32px"}}>
          <div style={{fontSize:64,marginBottom:16}}>📭</div>
          <h3 style={{color:text,margin:"0 0 8px"}}>No orders yet</h3>
          <p style={{color:"#94a3b8"}}>Your orders will appear here</p>
        </div>
      ):(
        <div style={{padding:"16px 16px 0",display:"flex",flexDirection:"column",gap:12}}>
          {orders.map(order=>{
            const isExpanded=expanded===order.id;
            const stepIdx=STATUS_STEPS.findIndex(s=>s.key===order.status);
            return(
              <div key={order.id} style={{background:card,borderRadius:16,overflow:"hidden",boxShadow:dark?"none":"0 2px 8px rgba(0,0,0,0.06)",border:`1px solid ${dark?"#334155":"transparent"}`}}>
                <div onClick={()=>setExpanded(isExpanded?null:order.id)} style={{padding:16,cursor:"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <div>
                      <p style={{margin:0,fontWeight:800,fontSize:14,color:text,fontFamily:"monospace"}}>#{String(order.id).slice(-8).toUpperCase()}</p>
                      <p style={{margin:"2px 0 0",fontSize:11,color:"#94a3b8"}}>{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{background:`${STATUS_COLORS[order.status]||"#94a3b8"}20`,color:STATUS_COLORS[order.status]||"#94a3b8",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700}}>
                        {STATUS_STEPS.find(s=>s.key===order.status)?.icon} {STATUS_STEPS.find(s=>s.key===order.status)?.label||order.status}
                      </span>
                      <span style={{color:"#16a34a",fontWeight:900,fontSize:16}}>₹{order.total}</span>
                    </div>
                  </div>
                  {order.status!=="cancelled"&&(
                    <div style={{display:"flex",alignItems:"center",overflowX:"auto",scrollbarWidth:"none"}}>
                      {STATUS_STEPS.map((step,i)=>(
                        <React.Fragment key={step.key}>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                            <div style={{width:30,height:30,borderRadius:"50%",background:i<=stepIdx?"#16a34a":dark?"#334155":"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,transition:"all 0.3s"}}>
                              <span style={{opacity:i<=stepIdx?1:0.3}}>{step.icon}</span>
                            </div>
                            <span style={{fontSize:8,color:i<=stepIdx?"#16a34a":"#94a3b8",marginTop:3,fontWeight:i<=stepIdx?700:400,textAlign:"center",maxWidth:44}}>{step.label}</span>
                          </div>
                          {i<STATUS_STEPS.length-1&&<div style={{flex:1,height:2,background:i<stepIdx?"#16a34a":dark?"#334155":"#e2e8f0",minWidth:12,transition:"all 0.3s",margin:"0 2px",marginBottom:14}}/>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
                {isExpanded&&(
                  <div style={{padding:"0 16px 16px",borderTop:`1px solid ${dark?"#334155":"#f0f0f0"}`}}>
                    <p style={{margin:"12px 0 8px",fontSize:12,fontWeight:700,color:"#64748b"}}>ITEMS</p>
                    {(order.items||[]).map((item,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                        <span style={{fontSize:13,color:text}}>{item.name} × {item.quantity}</span>
                        <span style={{fontSize:13,fontWeight:600,color:text}}>₹{item.total}</span>
                      </div>
                    ))}
                    <p style={{margin:"10px 0 4px",fontSize:12,color:"#64748b"}}>📍 {order.address}</p>
                    {order.delivery_slot&&<p style={{margin:"4px 0 8px",fontSize:12,color:"#64748b"}}>🕐 {order.delivery_slot}</p>}
                    <button onClick={()=>reorder(order)} style={{background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13,marginTop:4}}>🔄 Reorder</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfilePage(){
  const{user,profile,dark,setPage,setShowAuth,addToast,addresses,setAddresses}=useContext(AppContext);
  const bg=dark?"#0f172a":"#f8fafc",card=dark?"#1e293b":"#fff",text=dark?"#f1f5f9":"#1a1a2e";
  if(!user)return(
    <div style={{background:bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
      <div style={{fontSize:64,marginBottom:16}}>👤</div>
      <h2 style={{color:text,margin:"0 0 8px"}}>My Account</h2>
      <p style={{color:"#94a3b8",margin:"0 0 24px"}}>Login to manage your account</p>
      <button onClick={()=>setShowAuth(true)} style={{background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",border:"none",borderRadius:14,padding:"14px 32px",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Login / Sign Up</button>
    </div>
  );
  const handleDeleteAddress=async(id)=>{await supabase.from("addresses").delete().eq("id",id);setAddresses(prev=>prev.filter(a=>a.id!==id));addToast("Address deleted","🗑️");};
  return(
    <div style={{background:bg,minHeight:"100vh",paddingBottom:80}}>
      <div style={{background:card,borderBottom:`1px solid ${dark?"#334155":"#f0f0f0"}`,padding:16,position:"sticky",top:0,zIndex:50}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:800,color:text}}>👤 My Account</h2>
      </div>
      <div style={{padding:"16px 16px 0"}}>
        <div style={{background:"linear-gradient(135deg,#16a34a,#15803d)",borderRadius:16,padding:20,marginBottom:14,color:"#fff"}}>
          <div style={{fontSize:48,marginBottom:8}}>👤</div>
          <h3 style={{margin:"0 0 4px",fontSize:18,fontWeight:900}}>{profile?.name||"User"}</h3>
          <p style={{margin:0,opacity:0.85,fontSize:13}}>{user.email}</p>
        </div>
        {profile?.referral_code&&(
          <div style={{background:card,borderRadius:16,padding:16,marginBottom:14,border:`1px solid ${dark?"#334155":"#bbf7d0"}`}}>
            <h3 style={{margin:"0 0 8px",fontSize:15,fontWeight:800,color:text}}>🎁 Your Referral Code</h3>
            <p style={{margin:"0 0 10px",fontSize:13,color:"#64748b"}}>Share with friends — both of you get discount!</p>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{flex:1,background:dark?"#0f172a":"#f0fdf4",borderRadius:10,padding:"12px 14px",fontFamily:"monospace",fontSize:18,fontWeight:900,color:"#16a34a",letterSpacing:2}}>{profile.referral_code}</div>
              <button onClick={()=>{navigator.clipboard.writeText(profile.referral_code);addToast("Copied!","📋");}} style={{background:"#16a34a",color:"#fff",border:"none",borderRadius:10,padding:"12px 14px",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Copy</button>
              <button onClick={()=>navigator.share?.({title:"sabG",text:`Use my code ${profile.referral_code} on sabG for a discount!`,url:"https://sabg-app.vercel.app"})} style={{background:dark?"#334155":"#f1f5f9",color:text,border:"none",borderRadius:10,padding:"12px 14px",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Share</button>
            </div>
          </div>
        )}
        <div style={{background:card,borderRadius:16,padding:16,marginBottom:14,border:`1px solid ${dark?"#334155":"transparent"}`}}>
          <h3 style={{margin:"0 0 12px",fontSize:15,fontWeight:800,color:text}}>📍 Saved Addresses</h3>
          {addresses.length===0?<p style={{color:"#94a3b8",fontSize:13}}>No saved addresses yet</p>:addresses.map(a=>(
            <div key={a.id} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 0",borderBottom:`1px solid ${dark?"#334155":"#f0f0f0"}`}}>
              <span style={{fontSize:16}}>📍</span>
              <div style={{flex:1}}>
                <p style={{margin:"0 0 2px",fontWeight:700,fontSize:13,color:text}}>{a.label} {a.is_default&&<span style={{background:"#16a34a",color:"#fff",fontSize:9,borderRadius:4,padding:"1px 5px",marginLeft:4}}>DEFAULT</span>}</p>
                <p style={{margin:0,fontSize:12,color:"#64748b",lineHeight:1.4}}>{a.address}</p>
              </div>
              <button onClick={()=>handleDeleteAddress(a.id)} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:16}}>🗑️</button>
            </div>
          ))}
        </div>
        {[["📦","My Orders",()=>setPage("orders")],["❤️","Wishlist",()=>setPage("wishlist")]].map(([icon,label,action])=>(
          <button key={label} onClick={action} style={{width:"100%",background:card,border:`1px solid ${dark?"#334155":"#f0f0f0"}`,borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",marginBottom:10,fontFamily:"inherit"}}>
            <span style={{fontSize:22}}>{icon}</span><span style={{fontWeight:700,fontSize:14,color:text,flex:1,textAlign:"left"}}>{label}</span><span style={{color:"#94a3b8"}}>›</span>
          </button>
        ))}
        <button onClick={async()=>{await supabase.auth.signOut();addToast("Signed out","👋");setPage("home");}} style={{width:"100%",background:"#fee2e2",border:"none",borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",fontFamily:"inherit",color:"#991b1b",fontWeight:700,fontSize:14}}>
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}

function WishlistPage(){
  const{products,wishlist,user,setShowAuth,dark,setPage}=useContext(AppContext);
  const bg=dark?"#0f172a":"#f8fafc",text=dark?"#f1f5f9":"#1a1a2e",card=dark?"#1e293b":"#fff";
  const wishlistProducts=products.filter(p=>wishlist.includes(p.id));
  if(!user)return(
    <div style={{background:bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
      <div style={{fontSize:64,marginBottom:16}}>❤️</div>
      <h2 style={{color:text,margin:"0 0 8px"}}>Your Wishlist</h2>
      <p style={{color:"#94a3b8",margin:"0 0 24px"}}>Login to save your favourite items</p>
      <button onClick={()=>setShowAuth(true)} style={{background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",border:"none",borderRadius:14,padding:"14px 32px",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Login</button>
    </div>
  );
  return(
    <div style={{background:bg,minHeight:"100vh",paddingBottom:80}}>
      <div style={{background:card,borderBottom:`1px solid ${dark?"#334155":"#f0f0f0"}`,padding:16,position:"sticky",top:0,zIndex:50}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:800,color:text}}>❤️ Wishlist ({wishlistProducts.length})</h2>
      </div>
      {wishlistProducts.length===0?(
        <div style={{textAlign:"center",padding:"60px 32px"}}>
          <div style={{fontSize:64,marginBottom:16}}>🤍</div>
          <h3 style={{color:text,margin:"0 0 8px"}}>Nothing saved yet</h3>
          <p style={{color:"#94a3b8",margin:"0 0 24px"}}>Tap ❤️ on any product to save it</p>
          <button onClick={()=>setPage("home")} style={{background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",border:"none",borderRadius:14,padding:"14px 32px",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Browse Products</button>
        </div>
      ):(
        <div style={{padding:"16px 16px 0",display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
          {wishlistProducts.map(p=><ProductCard key={p.id} product={p}/>)}
        </div>
      )}
    </div>
  );
}

function BottomNav(){
  const{page,setPage,cartCount,dark}=useContext(AppContext);
  const bg=dark?"#1e293b":"#fff";
  const tabs=[{id:"home",icon:"🏠",label:"Home"},{id:"wishlist",icon:"❤️",label:"Saved"},{id:"cart",icon:"🛒",label:"Cart",badge:cartCount},{id:"orders",icon:"📦",label:"Orders"},{id:"profile",icon:"👤",label:"Me"}];
  return(
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:bg,borderTop:`1px solid ${dark?"#334155":"#f0f0f0"}`,display:"flex",zIndex:150,boxShadow:"0 -4px 20px rgba(0,0,0,0.08)"}}>
      {tabs.map(tab=>(
        <button key={tab.id} onClick={()=>setPage(tab.id)} style={{flex:1,background:"none",border:"none",padding:"10px 0 12px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,fontFamily:"inherit",position:"relative"}}>
          <span style={{fontSize:20,position:"relative"}}>
            {tab.icon}
            {tab.badge>0&&<span style={{position:"absolute",top:-4,right:-8,background:"#ef4444",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{tab.badge}</span>}
          </span>
          <span style={{fontSize:9,fontWeight:page===tab.id?800:500,color:page===tab.id?"#16a34a":"#94a3b8"}}>{tab.label}</span>
          {page===tab.id&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:28,height:3,background:"#16a34a",borderRadius:"0 0 4px 4px"}}/>}
        </button>
      ))}
    </div>
  );
}

export default function App(){
  return(
    <AppProvider>
      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        body{margin:0;font-family:'Inter',sans-serif;}
        ::-webkit-scrollbar{display:none;}
        @keyframes slideDown{from{opacity:0;transform:translateY(-16px) scale(0.95);}to{opacity:1;transform:translateY(0) scale(1);}}
        @keyframes shimmer{0%,100%{opacity:1;}50%{opacity:0.4;}}
        input,button,textarea,select{-webkit-appearance:none;}
      `}</style>
      <Inner/>
    </AppProvider>
  );
}
function Inner(){
  const{page,dark}=useContext(AppContext);
  return(
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:dark?"#0f172a":"#f8fafc",position:"relative"}}>
      {page==="home"&&<HomePage/>}
      {page==="product"&&<ProductDetailPage/>}
      {page==="cart"&&<CartPage/>}
      {page==="checkout"&&<CheckoutPage/>}
      {page==="orders"&&<OrdersPage/>}
      {page==="profile"&&<ProfilePage/>}
      {page==="wishlist"&&<WishlistPage/>}
      {page!=="product"&&<BottomNav/>}
    </div>
  );
}
