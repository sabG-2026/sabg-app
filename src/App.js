import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const DEFAULT_SETTINGS = { deliveryFee: 30, platformFee: 5, taxRate: 5, deliveryTime: 8 };

export default function App() {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [offers, setOffers]         = useState([]);
  const [banners, setBanners]       = useState([]);
  const [settings, setSettings]     = useState(DEFAULT_SETTINGS);
  const [loading, setLoading]       = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [search, setSearch]         = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [promoCode, setPromoCode]   = useState("");
  const [appliedOffer, setAppliedOffer] = useState(null);
  const [address, setAddress]       = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [cart, setCart]             = useState([]);
  const [lastOrder, setLastOrder]   = useState(null);
  const [bannerIdx, setBannerIdx]   = useState(0);

  const setSafeStatus = (msg) => {
    setStatusMessage(msg);
    window.clearTimeout(window.__sabGTimer);
    window.__sabGTimer = window.setTimeout(() => setStatusMessage(""), 2500);
  };

  const subscribeTable = useCallback((table, handler) => {
    return supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, handler)
      .subscribe();
  }, []);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from("products").select("*").eq("available", true).order("name");
    if (data) setProducts(data);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from("categories").select("*").order("name");
    if (data) setCategories(data);
  }, []);

  const fetchOffers = useCallback(async () => {
    const { data } = await supabase.from("offers").select("*").eq("active", true);
    if (data) setOffers(data);
  }, []);

  const fetchBanners = useCallback(async () => {
    const { data } = await supabase.from("banners").select("*").eq("active", true).order("display_order");
    if (data) setBanners(data);
  }, []);

  const fetchSettings = useCallback(async () => {
    // Try config table first (written by admin)
    const { data: configData } = await supabase
      .from("config").select("*").eq("key", "settings").single();
    if (configData?.value) {
      const v = configData.value;
      setSettings({
        deliveryFee:  v.deliveryFee  ?? v.delivery_fee  ?? 30,
        platformFee:  v.platformFee  ?? v.platform_fee  ?? 5,
        taxRate:      v.taxRate      ?? v.tax_rate      ?? 5,
        deliveryTime: v.deliveryTime ?? v.delivery_time ?? 8,
      });
      return;
    }
    // Fallback to settings table
    const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
    if (data) {
      setSettings({
        deliveryFee:  data.delivery_fee  ?? 30,
        platformFee:  data.platform_fee  ?? 5,
        taxRate:      data.tax_rate      ?? 5,
        deliveryTime: data.delivery_time ?? 8,
      });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchCategories(), fetchOffers(), fetchBanners(), fetchSettings()]);
      if (mounted) setLoading(false);
    })();
    const channels = [
      subscribeTable("products",   fetchProducts),
      subscribeTable("categories", fetchCategories),
      subscribeTable("offers",     fetchOffers),
      subscribeTable("banners",    fetchBanners),
      subscribeTable("settings",   fetchSettings),
      subscribeTable("config",      fetchSettings),
    ];
    return () => { mounted = false; channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [fetchProducts, fetchCategories, fetchOffers, fetchBanners, fetchSettings, subscribeTable]);

  // Banner auto-slide
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 3500);
    return () => clearInterval(t);
  }, [banners.length]);

  const filteredProducts = useMemo(() =>
    products.filter(p => {
      const catOk = selectedCategory === "All" || p.category === selectedCategory;
      const srch  = `${p.name} ${p.category} ${p.description || ""} ${p.badge || ""}`.toLowerCase();
      return catOk && srch.includes(search.toLowerCase());
    }), [products, selectedCategory, search]);

  // ── CART helpers ──────────────────────────────────────────────────────────
  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      if (ex) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: product.id, name: product.name, price: Number(product.price || 0), image: product.image_url || product.image || "", unit: product.unit || "piece", category: product.category || "", quantity: 1 }];
    });
    setSafeStatus(`${product.name} added to cart.`);
  };
  const incrementQty = id => setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i));
  const decrementQty = id => setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
  const removeFromCart = id => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => { setCart([]); setAppliedOffer(null); setPromoCode(""); };

  // ── CALCULATIONS ──────────────────────────────────────────────────────────
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const discountAmount = useMemo(() => {
    if (!appliedOffer) return 0;
    if (appliedOffer.type === "percent") return Number(((subtotal * Number(appliedOffer.discount || 0)) / 100).toFixed(2));
    if (appliedOffer.type === "flat" || appliedOffer.type === "fixed") return Number(appliedOffer.discount || 0);
    return 0;
  }, [appliedOffer, subtotal]);
  const taxAmount = useMemo(() => {
    const taxable = Math.max(subtotal - discountAmount, 0);
    return Number(((taxable * Number(settings.taxRate || 0)) / 100).toFixed(2));
  }, [subtotal, discountAmount, settings.taxRate]);
  const deliveryFee = Number(settings.deliveryFee || 0);
  const platformFee = Number(settings.platformFee || 0);
  const total = useMemo(() => Number(Math.max(subtotal - discountAmount, 0) + taxAmount + deliveryFee + platformFee).toFixed(2), [subtotal, discountAmount, taxAmount, deliveryFee, platformFee]);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // ── PROMO ─────────────────────────────────────────────────────────────────
  const applyPromoCode = () => {
    if (!promoCode.trim()) { alert("Enter a promo code."); return; }
    const match = offers.find(o => o.code?.toLowerCase() === promoCode.trim().toLowerCase());
    if (!match) { alert("Invalid promo code."); setAppliedOffer(null); return; }
    const minOrd = Number(match.minOrder || match.min_order || 0);
    if (subtotal < minOrd) { alert(`Minimum order is ₹${minOrd}`); setAppliedOffer(null); return; }
    setAppliedOffer(match);
    setSafeStatus(`Offer ${match.code} applied! 🎉`);
  };

  // ── PLACE ORDER ───────────────────────────────────────────────────────────
  const placeOrder = async () => {
    if (!cart.length)     { alert("Your cart is empty."); return; }
    if (!address.trim())  { alert("Please enter delivery address."); return; }
    setPlacingOrder(true);
    const payload = {
      items:          cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, total: i.price * i.quantity, unit: i.unit, image: i.image, category: i.category })),
      subtotal:       Number(subtotal.toFixed(2)),
      delivery_fee:   Number(deliveryFee.toFixed(2)),
      platform_fee:   Number(platformFee.toFixed(2)),
      tax:            Number(taxAmount.toFixed(2)),
      discount:       Number(discountAmount.toFixed(2)),
      total:          Number(total),
      address:        address.trim(),
      payment_method: paymentMethod,
      promo_code:     appliedOffer?.code || null,
      status:         "pending",
    };
    const { data, error } = await supabase.from("orders").insert([payload]).select().single();
    setPlacingOrder(false);
    if (error) { console.error(error); alert(error.message); return; }
    setLastOrder(data);
    clearCart();
    setAddress("");
    setPaymentMethod("Cash on Delivery");
    setSafeStatus("Order placed successfully! 🎉");
  };

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={s.page}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
          <div style={s.logo}>sabG</div>
          <p style={{ color: "#64748b", marginTop: 12 }}>Loading groceries...</p>
        </div>
      </div>
    );
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* HEADER */}
      <div style={s.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={s.logo}>sabG</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={s.deliveryBadge}>⚡ {settings.deliveryTime} mins</span>
            {cartCount > 0 && (
              <div style={s.cartBubble}>🛒 <span style={s.cartDot}>{cartCount}</span></div>
            )}
          </div>
        </div>
        <input style={s.searchInput} placeholder="🔍 Search groceries..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {statusMessage ? <div style={s.statusBox}>{statusMessage}</div> : null}

      {/* BANNERS */}
      {banners.length > 0 && (
        <div style={{ padding: "14px 16px 0" }}>
          <div style={{ ...s.banner, background: banners[bannerIdx]?.bg || "linear-gradient(135deg,#16a34a,#15803d)" }}>
            {banners[bannerIdx]?.image_url && <img src={banners[bannerIdx].image_url} alt="" style={s.bannerImg} />}
            <p style={s.bannerSub}>{banners[bannerIdx]?.subtitle}</p>
            <h3 style={s.bannerTitle}>{banners[bannerIdx]?.title || "sabG Offers"}</h3>
            {banners.length > 1 && (
              <div style={{ display: "flex", gap: 5, marginTop: 12 }}>
                {banners.map((_, i) => (
                  <div key={i} onClick={() => setBannerIdx(i)} style={{ width: i === bannerIdx ? 20 : 6, height: 6, borderRadius: 3, background: i === bannerIdx ? "#fff" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.3s" }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CATEGORIES */}
      {!search && (
        <div style={{ padding: "18px 16px 0" }}>
          <h2 style={s.sectionTitle}>Categories</h2>
          <div style={s.chipRow}>
            <button style={{ ...s.chip, ...(selectedCategory === "All" ? s.chipActive : {}) }} onClick={() => setSelectedCategory("All")}>✨ All</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.name)}
                style={{ ...s.chip, ...(selectedCategory === cat.name ? { ...s.chipActive, background: cat.color || "#16a34a", borderColor: cat.color || "#16a34a" } : {}) }}>
                {cat.emoji ? `${cat.emoji} ` : ""}{cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PRODUCTS */}
      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={s.sectionTitle}>{search ? `"${search}"` : selectedCategory !== "All" ? selectedCategory : "All Products"}</h2>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>{filteredProducts.length} items</span>
        </div>
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "#94a3b8" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p>No products found.</p>
          </div>
        ) : (
          <div style={s.grid}>
            {filteredProducts.map(product => {
              const imgSrc = product.image_url || product.image;
              const isUrl  = imgSrc && imgSrc.startsWith("http");
              const inCart = cart.find(c => c.id === product.id);
              return (
                <div key={product.id} style={s.card}>
                  {product.badge && <div style={s.badge}>{product.badge}</div>}
                  {Number(product.discount || 0) > 0 && <div style={s.discBadge}>-{product.discount}%</div>}
                  <div style={s.cardImgWrap}>
                    {isUrl ? <img src={imgSrc} alt={product.name} style={s.cardImg} />
                      : imgSrc ? <span style={{ fontSize: 50, lineHeight: 1 }}>{imgSrc}</span>
                      : <span style={{ fontSize: 36, color: "#cbd5e1" }}>🛒</span>}
                  </div>
                  <p style={s.cardName}>{product.name}</p>
                  <p style={s.cardUnit}>per {product.unit || "piece"}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <div>
                      {Number(product.original_price || 0) > Number(product.price || 0) && (
                        <span style={s.strikePrice}>₹{Number(product.original_price).toFixed(0)}</span>
                      )}
                      <strong style={s.price}>₹{Number(product.price || 0).toFixed(0)}</strong>
                    </div>
                    {inCart ? (
                      <div style={s.qtyBox}>
                        <button style={s.qtyBtn} onClick={() => decrementQty(product.id)}>−</button>
                        <span style={s.qtyNum}>{inCart.quantity}</span>
                        <button style={s.qtyBtn} onClick={() => incrementQty(product.id)}>+</button>
                      </div>
                    ) : (
                      <button style={s.addBtn} onClick={() => addToCart(product)}>+ ADD</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* OFFERS */}
      {offers.length > 0 && (
        <div style={{ padding: "18px 16px 0" }}>
          <h2 style={s.sectionTitle}>🏷️ Offers</h2>
          <div style={s.offerRow}>
            {offers.map(offer => (
              <div key={offer.id} style={s.offerCard}>
                <p style={s.offerCode}>{offer.code}</p>
                <p style={{ margin: "0 0 2px", fontSize: 12, color: "#334155", fontWeight: 600 }}>
                  {offer.type === "percent" ? `${offer.discount}% off` : `₹${offer.discount} off`}
                </p>
                {Number(offer.minOrder || offer.min_order || 0) > 0 && (
                  <p style={{ margin: "0 0 8px", fontSize: 11, color: "#94a3b8" }}>Min ₹{offer.minOrder || offer.min_order}</p>
                )}
                <button style={s.offerUseBtn} onClick={() => { setPromoCode(offer.code || ""); setAppliedOffer(offer); setSafeStatus(`Offer ${offer.code} applied!`); }}>Use</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CART */}
      <div style={{ padding: "18px 16px 0" }}>
        <h2 style={s.sectionTitle}>🛒 Cart{cartCount > 0 ? ` (${cartCount})` : ""}</h2>
        {cart.length === 0 ? (
          <p style={{ color: "#94a3b8", padding: "12px 0" }}>Your cart is empty.</p>
        ) : (
          <div>
            {cart.map(item => (
              <div key={item.id} style={s.cartItem}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, margin: "0 0 3px", fontSize: 14 }}>{item.name}</p>
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 3px" }}>₹{item.price.toFixed(0)} × {item.quantity}</p>
                  <p style={{ fontWeight: 700, color: "#16a34a", fontSize: 14, margin: 0 }}>₹{(item.price * item.quantity).toFixed(0)}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <div style={s.qtyBox}>
                    <button style={s.qtyBtn} onClick={() => decrementQty(item.id)}>−</button>
                    <span style={s.qtyNum}>{item.quantity}</span>
                    <button style={s.qtyBtn} onClick={() => incrementQty(item.id)}>+</button>
                  </div>
                  <button style={s.removeBtn} onClick={() => removeFromCart(item.id)}>✕ Remove</button>
                </div>
              </div>
            ))}

            <div style={s.checkoutBox}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800 }}>Order Summary</h3>

              {appliedOffer ? (
                <div style={s.appliedOffer}>
                  🎉 <strong>{appliedOffer.code}</strong> — saving ₹{discountAmount.toFixed(0)}
                  <button style={s.removeOffer} onClick={() => { setAppliedOffer(null); setPromoCode(""); }}>Remove</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input style={s.promoInput} placeholder="Promo code" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} />
                  <button style={s.promoBtn} onClick={applyPromoCode}>Apply</button>
                </div>
              )}

              <textarea style={s.addressInput} placeholder="📍 Delivery address..." value={address} onChange={e => setAddress(e.target.value)} rows={2} />

              <select style={s.select} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option>Cash on Delivery</option>
                <option>UPI</option>
                <option>Card on Delivery</option>
              </select>

              <div style={s.bill}>
                {[["Subtotal", `₹${subtotal.toFixed(2)}`], ["Discount", `- ₹${discountAmount.toFixed(2)}`], ["Delivery Fee", `₹${deliveryFee.toFixed(2)}`], ["Platform Fee", `₹${platformFee.toFixed(2)}`], [`Tax (${settings.taxRate}%)`, `₹${taxAmount.toFixed(2)}`]].map(([l, v]) => (
                  <div key={l} style={s.billRow}><span style={{ color: "#64748b" }}>{l}</span><span>{v}</span></div>
                ))}
                <div style={s.billTotal}><span>Grand Total</span><span style={{ color: "#16a34a" }}>₹{total}</span></div>
              </div>

              <p style={{ color: "#64748b", fontSize: 12, margin: "8px 0 14px" }}>⚡ Est. delivery: {settings.deliveryTime} mins</p>

              <div style={{ display: "flex", gap: 10 }}>
                <button style={s.placeBtn} onClick={placeOrder} disabled={placingOrder}>
                  {placingOrder ? "Placing..." : `Place Order · ₹${total}`}
                </button>
                <button style={s.clearBtn} onClick={clearCart}>Clear</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LAST ORDER */}
      {lastOrder && (
        <div style={{ padding: "18px 16px 40px" }}>
          <h2 style={s.sectionTitle}>✅ Order Confirmed!</h2>
          <div style={s.orderSuccess}>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b", letterSpacing: 1 }}>ORDER #{String(lastOrder.id).slice(-8).toUpperCase()}</p>
            <p style={{ margin: "0 0 4px" }}><strong>Status:</strong> {lastOrder.status}</p>
            <p style={{ margin: "0 0 4px" }}><strong>Total:</strong> ₹{Number(lastOrder.total || 0).toFixed(2)}</p>
            <p style={{ margin: "0 0 4px" }}><strong>Address:</strong> {lastOrder.address}</p>
            <p style={{ margin: "0 0 12px" }}><strong>Payment:</strong> {lastOrder.payment_method}</p>
            <div style={{ background: "#dcfce7", borderRadius: 10, padding: "10px 14px", color: "#166534", fontWeight: 700, fontSize: 14 }}>
              ⚡ Arriving in ~{settings.deliveryTime} minutes
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = {
  page:         { maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter',sans-serif", paddingBottom: 40 },
  header:       { background: "linear-gradient(160deg,#0f172a,#1e293b)", padding: "16px 16px 18px", position: "sticky", top: 0, zIndex: 100 },
  logo:         { color: "#fff", fontSize: 26, fontWeight: 900, letterSpacing: -1 },
  deliveryBadge:{ background: "#16a34a", color: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 },
  cartBubble:   { background: "#1e3a5f", color: "#fff", borderRadius: 10, padding: "5px 10px", fontSize: 13, display: "flex", alignItems: "center", gap: 4 },
  cartDot:      { background: "#ef4444", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  searchInput:  { width: "100%", background: "#fff", border: "none", borderRadius: 14, padding: "12px 16px", fontSize: 14, fontFamily: "'Inter',sans-serif", boxSizing: "border-box", outline: "none", color: "#1e293b", fontWeight: 500 },
  statusBox:    { margin: "10px 16px", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 10, fontSize: 14, fontWeight: 600 },
  banner:       { borderRadius: 18, padding: 20, position: "relative", overflow: "hidden", minHeight: 95 },
  bannerImg:    { position: "absolute", right: 0, top: 0, height: "100%", objectFit: "cover", opacity: 0.25 },
  bannerSub:    { margin: "0 0 4px", color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 600 },
  bannerTitle:  { margin: 0, color: "#fff", fontSize: 20, fontWeight: 900 },
  sectionTitle: { margin: "0 0 12px", fontSize: 17, fontWeight: 800, color: "#1a1a2e" },
  chipRow:      { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" },
  chip:         { padding: "7px 14px", borderRadius: 50, border: "2px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", whiteSpace: "nowrap", fontSize: 12, fontWeight: 600, fontFamily: "'Inter',sans-serif", flexShrink: 0 },
  chipActive:   { background: "#16a34a", color: "#fff", borderColor: "#16a34a" },
  grid:         { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 },
  card:         { background: "#fff", borderRadius: 16, padding: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 6, position: "relative" },
  badge:        { position: "absolute", top: 8, left: 8, background: "#16a34a", color: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700, zIndex: 2 },
  discBadge:    { position: "absolute", top: 8, right: 8, background: "#ef4444", color: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700, zIndex: 2 },
  cardImgWrap:  { background: "#f8fafc", borderRadius: 12, padding: "12px 0", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 80 },
  cardImg:      { width: 70, height: 70, objectFit: "contain", borderRadius: 8 },
  cardName:     { margin: 0, fontWeight: 700, fontSize: 13, color: "#1a1a2e", lineHeight: 1.3 },
  cardUnit:     { margin: 0, fontSize: 11, color: "#94a3b8" },
  strikePrice:  { textDecoration: "line-through", color: "#94a3b8", fontSize: 11, display: "block" },
  price:        { fontSize: 15, color: "#1a1a2e", fontWeight: 800 },
  addBtn:       { background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", border: "none", borderRadius: 10, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: "0 2px 8px rgba(22,163,74,0.3)", whiteSpace: "nowrap" },
  qtyBox:       { display: "flex", alignItems: "center", background: "linear-gradient(135deg,#16a34a,#15803d)", borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 8px rgba(22,163,74,0.3)" },
  qtyBtn:       { background: "none", border: "none", color: "#fff", width: 28, height: 30, fontSize: 16, cursor: "pointer", fontWeight: 700, fontFamily: "'Inter',sans-serif" },
  qtyNum:       { color: "#fff", fontWeight: 700, fontSize: 13, minWidth: 16, textAlign: "center" },
  offerRow:     { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" },
  offerCard:    { background: "#fff", borderRadius: 14, padding: "12px 14px", border: "1px solid #bbf7d0", minWidth: 140, flexShrink: 0 },
  offerCode:    { margin: "0 0 2px", fontWeight: 900, fontSize: 14, color: "#16a34a", letterSpacing: 1, fontFamily: "monospace" },
  offerUseBtn:  { background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" },
  cartItem:     { background: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  removeBtn:    { background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "'Inter',sans-serif" },
  checkoutBox:  { background: "#fff", borderRadius: 18, padding: 18, marginTop: 4, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0" },
  appliedOffer: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 13, color: "#166534", display: "flex", alignItems: "center", gap: 8 },
  removeOffer:  { marginLeft: "auto", background: "none", border: "none", color: "#dc2626", fontSize: 12, cursor: "pointer", fontFamily: "'Inter',sans-serif" },
  promoInput:   { flex: 1, border: "2px solid #e2e8f0", borderRadius: 10, padding: "9px 12px", fontSize: 13, fontFamily: "'Inter',sans-serif", outline: "none", letterSpacing: 1, fontWeight: 600, boxSizing: "border-box" },
  promoBtn:     { background: "#e2e8f0", border: "none", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Inter',sans-serif" },
  addressInput: { width: "100%", border: "2px solid #e2e8f0", borderRadius: 12, padding: "10px 12px", fontSize: 14, fontFamily: "'Inter',sans-serif", resize: "none", outline: "none", boxSizing: "border-box", marginBottom: 10 },
  select:       { width: "100%", border: "2px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box", marginBottom: 12, background: "#fff", color: "#1e293b" },
  bill:         { borderTop: "1px solid #f0f0f0", paddingTop: 12, marginTop: 4 },
  billRow:      { display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 },
  billTotal:    { display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 18, marginTop: 10, paddingTop: 10, borderTop: "2px dashed #e2e8f0" },
  placeBtn:     { flex: 1, background: "linear-gradient(135deg,#16a34a,#15803d)", color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: "0 4px 16px rgba(22,163,74,0.4)" },
  clearBtn:     { background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 14, padding: "14px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Inter',sans-serif" },
  orderSuccess: { background: "#fff", borderRadius: 16, padding: 18, border: "1px solid #bbf7d0", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" },
};
