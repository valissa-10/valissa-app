import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useCartStore } from './store/useCartStore'
import { ShoppingBag, Tag, Send, Sparkles, PlusCircle, LayoutGrid, CheckCircle, Lock, Upload, Package, User, MapPin, CreditCard, KeyRound, MessageCircle, Heart, Star, Filter, Baby } from 'lucide-react'

// Imagen por defecto si no carga alguna categoría
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=200&auto=format&fit=crop&q=80'

// Color base exacto
const BRAND_COLOR = '#49c5d1'
// Clave secreta de administración
const ADMIN_PIN = 'valissa2026'

// Categorías oficiales con sus imágenes de la carpeta public/
const CATEGORIES = [
  { id: 'Todas', name: 'Todas', img: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=200&auto=format&fit=crop&q=80', description: 'Todo el catálogo' },
  { id: 'Conjunto (Niño)', name: 'Conjunto (Niño)', img: '/conjunto-nino.jpg', description: 'Conjuntos para niños' },
  { id: 'Conjunto (Niña)', name: 'Conjunto (Niña)', img: '/conjunto-nina.jpg', description: 'Conjuntos para niñas' },
  { id: 'Valentina (Niña)', name: 'Valentina (Niña)', img: '/valentina.jpg', description: 'Línea Exclusiva Valentina' },
  { id: 'Pijama (Niño)', name: 'Pijama (Niño)', img: '/pijama-nino.jpg', description: 'Pijamas para niños' },
  { id: 'Pijama (Niña)', name: 'Pijama (Niña)', img: '/pijama-nina.jpg', description: 'Pijamas para niñas' },
  { id: 'Vestido (Niña)', name: 'Vestido (Niña)', img: '/vestido-nina.jpg', description: 'Vestidos para niñas' },
  { id: 'Bajo pedido', name: 'Bajo pedido', img: '/bajo-pedido.jpg', description: 'Encargos especiales' },
  { id: 'Personalizados en sublimación', name: 'Sublimación', img: '/sublimacion.jpg', description: 'Prendas personalizadas' }
]

export default function App() {
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [adminAuthenticated, setAdminAuthenticated] = useState(() => {
    return localStorage.getItem('valissa_admin_auth') === 'true'
  })
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Todas')
  
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState('')

  // Datos del Cliente para Checkout
  const [customerName, setCustomerName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Efectivo (Pesos COP)')
  const [showCheckoutForm, setShowCheckoutForm] = useState(false)

  // Estados del Admin Form
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formStock, setFormStock] = useState('10')
  const [formSizes, setFormSizes] = useState('2, 4, 6, 8')
  const [formCategory, setFormCategory] = useState('Conjunto (Niña)')
  const [imageFile, setImageFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const { cart, addToCart, removeFromCart, applyCoupon, coupon, getTotal } = useCartStore()

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Cantidad de conjuntos, pijamas o Valentina para validar el cupón
  const eligibleItemsCount = cart.reduce((sum, item) => {
    const cat = (item.product.category || '').toLowerCase()
    if (cat.includes('conjunto') || cat.includes('pijama') || cat.includes('valentina')) {
      return sum + item.quantity
    }
    return sum
  }, 0)

  useEffect(() => {
    fetchProducts()
    const params = new URLSearchParams(window.location.search)
    if (params.get('admin') === '1') {
      setIsAdminMode(true)
    }
  }, [])

  async function fetchProducts() {
    setLoading(true)
    const { data, error } = await supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false })
    if (!error && data) {
      setProducts(data)
    }
    setLoading(false)
  }

  function handleAdminLogin(e) {
    e.preventDefault()
    if (pinInput === ADMIN_PIN) {
      setAdminAuthenticated(true)
      localStorage.setItem('valissa_admin_auth', 'true')
      setPinError('')
      setPinInput('')
    } else {
      setPinError('Contraseña / PIN incorrecto')
    }
  }

  function handleAdminLogout() {
    setAdminAuthenticated(false)
    setIsAdminMode(false)
    localStorage.removeItem('valissa_admin_auth')
    window.history.replaceState({}, '', window.location.pathname)
  }

  function handleApplyCoupon() {
    setCouponError('')
    const codeClean = couponInput.trim().toUpperCase()
    
    if (!codeClean) {
      setCouponError('Escribe un código de cupón')
      return
    }

    if (eligibleItemsCount < 3) {
      setCouponError('El cupón aplica a partir de 3 piezas exclusivamente en Conjuntos, Pijamas o línea Valentina')
      return
    }

    if (codeClean === 'VALISSA20' || codeClean === 'VALISSA10' || codeClean === 'APP20' || codeClean === 'VALISSA') {
      const res = applyCoupon({ code: codeClean, discount_percent: 16.67 })
      if (res.success) {
        setCouponInput('')
      } else {
        setCouponError(res.message)
      }
    } else {
      setCouponError('Cupón inválido o expirado')
    }
  }

  async function handleCreateProduct(e) {
    e.preventDefault()
    setSubmitting(true)
    setSuccessMsg('')

    let imageUrl = PLACEHOLDER_IMG

    try {
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, imageFile)

        if (uploadError) throw uploadError

        const { data: publicURLData } = supabase.storage
          .from('products')
          .getPublicUrl(filePath)

        imageUrl = publicURLData.publicUrl
      }

      const { error: insertError } = await supabase.from('products').insert([
        {
          name: formName,
          description: formDesc,
          price: parseFloat(formPrice),
          stock: parseInt(formStock) || 0,
          sizes: formSizes,
          category: formCategory,
          image_url: imageUrl,
          is_active: true
        }
      ])

      if (insertError) throw insertError

      setSuccessMsg('¡Prenda publicada con éxito en el catálogo!')
      setFormName('')
      setFormDesc('')
      setFormPrice('')
      setFormStock('10')
      setFormSizes('2, 4, 6, 8')
      setImageFile(null)
      fetchProducts()
    } catch (err) {
      alert('Error al publicar: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteProduct(id) {
    if (!window.confirm('¿Seguro que deseas eliminar esta prenda?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) {
      fetchProducts()
    } else {
      alert('Error al eliminar: ' + error.message)
    }
  }

  function handleSendWhatsApp(e) {
    e.preventDefault()
    if (cart.length === 0) return

    let message = `*¡Hola Valissa! Quiero encargar el siguiente pedido:*\n\n`
    message += `👤 *Cliente:* ${customerName}\n`
    message += `📍 *Dirección/Entrega:* ${customerAddress}\n`
    message += `💳 *Método de Pago:* ${paymentMethod}\n\n`
    message += `*Detalle de prendas:*\n`

    cart.forEach((item, index) => {
      message += `${index + 1}. *${item.product.name}* (${item.product.category || 'General'} — Talla: ${item.selectedSize || 'Única'})\n`
      message += `   Precio: $${Number(item.product.price).toLocaleString()} COP x ${item.quantity}\n`
    })

    if (coupon && eligibleItemsCount >= 3) {
      message += `\n*Cupón aplicado (16.67% desc. en Conjuntos/Pijamas/Valentina):* ${coupon.code}\n`
    }

    message += `\n*Total a pagar: $${getTotal().toLocaleString()} COP*`

    const whatsappUrl = `https://wa.me/584242111582?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  function handleCustomRequestWhatsApp() {
    const customMsg = `*¡Hola Valissa!* 👋 No encuentro exactamente lo que busco en el catálogo y quiero consultar por un diseño o pieza 100% personalizada / bajo pedido. ¿Me ayudan?`
    const whatsappUrl = `https://wa.me/584242111582?text=${encodeURIComponent(customMsg)}`
    window.open(whatsappUrl, '_blank')
  }

  const filteredProducts = selectedCategoryFilter === 'Todas' 
    ? products 
    : products.filter(p => p.category === selectedCategoryFilter)

  return (
    <div className="min-h-screen text-slate-800 font-sans selection:bg-[#49c5d1]/30 selection:text-slate-900 flex flex-col justify-between bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] bg-sky-50/30">
      <div>
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-md sticky top-0 z-20 border-b border-sky-100 px-6 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider" style={{ color: '#2da8b4' }}>VALISSA</h1>
              <p className="text-[10px] tracking-widest font-extrabold uppercase" style={{ color: BRAND_COLOR }}>Diseño y Costura Infantil</p>
            </div>
          </div>

          <button 
            onClick={() => {
              const newMode = !isAdminMode
              setIsAdminMode(newMode)
              window.history.replaceState({}, '', newMode ? '?admin=1' : window.location.pathname)
            }}
            className="text-slate-500 hover:text-slate-800 p-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100 transition flex items-center gap-1.5 text-xs font-bold border border-sky-200"
            title="Acceso Administración"
          >
            <Lock className="w-4 h-4" style={{ color: BRAND_COLOR }} />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </header>

        {/* Hero Banner */}
        <div 
          className="text-white py-14 px-6 text-center shadow-lg relative overflow-hidden"
          style={{ backgroundColor: BRAND_COLOR }}
        >
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_2px,transparent_2px)] [background-size:20px_20px]"></div>
          <div className="relative z-10 max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white border border-white/30 text-xs px-4 py-1.5 rounded-full font-black uppercase tracking-wider shadow-xs">
              <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" /> Moda Infantil & Estampados Únicos
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-wide drop-shadow-sm">¡Hecho con Amor & Color!</h2>
            <p className="text-xs md:text-sm text-white/90 font-medium max-w-lg mx-auto leading-relaxed">
              Lleva <span className="font-black underline">3 piezas o más</span> en Conjuntos, Pijamas o línea Valentina y obtén descuento con el cupón <span className="font-black bg-white text-slate-900 px-2 py-0.5 rounded-lg shadow">VALISSA20</span>.
            </p>
          </div>
        </div>

        <main className="max-w-6xl mx-auto p-4 sm:p-8 space-y-12">
          {!isAdminMode ? (
            <>
              {/* FILTROS VISUALES CON IMÁGENES CIRCULARES */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-600 px-1 border-b border-sky-100 pb-2">
                  <Filter className="w-4 h-4" style={{ color: BRAND_COLOR }} /> Explora nuestras colecciones:
                </div>
                
                <div className="flex items-start gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-sky-200 scrollbar-track-sky-50">
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategoryFilter === cat.id
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryFilter(cat.id)}
                        className={`flex flex-col items-center gap-3 p-3 rounded-3xl transition flex-shrink-0 w-28 group text-center ${
                          isSelected 
                            ? 'bg-white shadow-lg border-2 border-[#49c5d1]' 
                            : 'bg-white/70 hover:bg-white border border-sky-100 hover:border-sky-200'
                        }`}
                      >
                        {/* Círculo de Imagen */}
                        <div className={`w-20 h-20 rounded-full overflow-hidden shadow-xs relative bg-sky-50 border-4 transition ${isSelected ? 'border-[#49c5d1]' : 'border-white'}`}>
                          <img 
                            src={cat.img} 
                            alt={cat.description} 
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
                            onError={(e) => { e.target.src = PLACEHOLDER_IMG }}
                          />
                        </div>
                        {/* Texto de Categoría */}
                        <div className="space-y-1">
                          <span className={`text-[10px] font-black leading-tight block ${isSelected ? 'text-[#2da8b4]' : 'text-slate-800'}`}>
                            {cat.name}
                          </span>
                          <span className="text-[8px] text-slate-400 font-medium block leading-tight line-clamp-1">
                            {cat.description}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* TIENDA CLIENTES */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
                <section className="lg:col-span-2">
                  <div className="flex justify-between items-center mb-6 border-b-2 border-sky-100 pb-3">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <Heart className="w-5 h-5 fill-current" style={{ color: BRAND_COLOR }} /> {selectedCategoryFilter === 'Todas' ? 'Catálogo de Creaciones' : CATEGORIES.find(c => c.id === selectedCategoryFilter)?.name}
                    </h3>
                    <span 
                      className="text-xs font-extrabold px-3.5 py-1.5 rounded-full shadow-xs text-slate-800"
                      style={{ backgroundColor: '#d0f2f5' }}
                    >
                      {filteredProducts.length} disponibles
                    </span>
                  </div>
                  
                  {loading ? (
                    <div className="text-center py-20 text-sm animate-pulse font-bold" style={{ color: BRAND_COLOR }}>Cargando colección mágica...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="bg-white/90 backdrop-blur-xs p-12 rounded-3xl text-center border-2 border-dashed border-sky-200 shadow-sm">
                      <p className="text-slate-700 font-bold text-sm leading-relaxed">No hay prendas publicadas en esta categoría actualmente.<br />¡Pronto tendremos más diseños coloridos!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {filteredProducts.map((p) => {
                        const sizesList = p.sizes ? p.sizes.split(',').map(s => s.trim()) : ['Única']
                        return (
                          <ProductCard key={p.id} product={p} sizes={sizesList} onAddToCart={addToCart} />
                        )
                      })}
                    </div>
                  )}
                </section>

                {/* CARRITO Y CHECKOUT */}
                <section className="bg-white/95 backdrop-blur-xs p-6 rounded-3xl border-2 border-sky-100 shadow-lg h-fit sticky top-24">
                  <h3 className="text-base font-black mb-4 border-b border-slate-100 pb-3 flex items-center justify-between text-slate-800">
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" style={{ color: BRAND_COLOR }} /> Tu Pedido
                    </span>
                    <div 
                      className="text-white px-3 py-1 rounded-full text-xs font-black shadow-sm"
                      style={{ backgroundColor: BRAND_COLOR }}
                    >
                      <span>{totalItemsCount}</span>
                    </div>
                  </h3>

                  {cart.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-12 font-medium">Tu carrito está esperando por prendas hermosas</p>
                  ) : !showCheckoutForm ? (
                    <div className="space-y-4">
                      <div className="max-h-56 overflow-y-auto pr-1 space-y-3">
                        {cart.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-xs border-b border-slate-100 pb-3 gap-2">
                            <div>
                              <p className="font-black text-slate-800">{item.product.name}</p>
                              <p className="text-[10px] font-extrabold text-slate-500 uppercase">{item.product.category || 'General'}</p>
                              <p className="font-bold" style={{ color: '#2da8b4' }}>Talla: {item.selectedSize || 'Única'}</p>
                              <p className="text-slate-500 mt-0.5">${Number(item.product.price).toLocaleString()} COP × {item.quantity}</p>
                            </div>
                            <button onClick={() => removeFromCart(index)} className="text-rose-400 hover:text-rose-600 font-black p-2 transition text-sm">✕</button>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                          <Tag className="w-3.5 h-3.5" style={{ color: BRAND_COLOR }} /> ¿Tienes un cupón?
                        </label>
                        <p className="text-[10px] text-slate-400 font-medium mb-2">* Aplica con 3+ piezas en Conjuntos, Pijamas o Valentina.</p>

                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Ej: VALISSA20"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value)}
                            className="w-full text-xs p-3 bg-sky-50/50 border border-sky-200 rounded-xl uppercase font-black text-slate-700 focus:outline-none focus:border-[#49c5d1] transition"
                          />
                          <button onClick={handleApplyCoupon} className="bg-slate-900 text-white text-xs px-4 rounded-xl font-black hover:bg-slate-800 transition">Aplicar</button>
                        </div>
                        {couponError && <p className="text-[11px] text-rose-500 font-bold mt-1.5 leading-snug">{couponError}</p>}
                        {coupon && eligibleItemsCount >= 3 && (
                          <p className="text-[11px] text-emerald-600 font-black mt-1.5">¡Cupón {coupon.code} aplicado!</p>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center text-base font-black mb-4 text-slate-800">
                          <span>Total a pagar:</span>
                          <span className="text-lg" style={{ color: '#2da8b4' }}>${getTotal().toLocaleString()} COP</span>
                        </div>

                        <button 
                          onClick={() => setShowCheckoutForm(true)}
                          className="w-full text-white py-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:opacity-95 shadow-md active:scale-95 transition"
                          style={{ backgroundColor: BRAND_COLOR }}
                        >
                          Continuar con los Datos de Envío
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* FORMULARIO DE CHECKOUT */
                    <form onSubmit={handleSendWhatsApp} className="space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="text-xs font-black" style={{ color: '#2da8b4' }}>Datos para la Entrega</span>
                        <button 
                          type="button" 
                          onClick={() => setShowCheckoutForm(false)} 
                          className="text-[11px] text-slate-400 hover:text-slate-600 font-bold"
                        >
                          ← Volver
                        </button>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                          <User className="w-3.5 h-3.5" style={{ color: BRAND_COLOR }} /> Nombre Completo
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder="Ej: María Pérez"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full text-xs p-3 bg-sky-50/40 border border-sky-200 rounded-xl focus:outline-none focus:border-[#49c5d1] font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                          <MapPin className="w-3.5 h-3.5" style={{ color: BRAND_COLOR }} /> Dirección / Punto de Referencia
                        </label>
                        <input 
                          type="text" 
                          required
                          placeholder="Ej: Barrio obrero / plaza los mangos"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          className="w-full text-xs p-3 bg-sky-50/40 border border-sky-200 rounded-xl focus:outline-none focus:border-[#49c5d1] font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                          <CreditCard className="w-3.5 h-3.5" style={{ color: BRAND_COLOR }} /> Método de Pago (Pesos COP)
                        </label>
                        <select 
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full text-xs p-3 bg-sky-50/40 border border-sky-200 rounded-xl focus:outline-none focus:border-[#49c5d1] font-bold text-slate-800"
                        >
                          <option value="Efectivo (Pesos COP)">Efectivo (Pesos COP)</option>
                          <option value="Transferencia Bancolombia">Transferencia Bancaria (Bancolombia)</option>
                          <option value="Nequi / Daviplata">Nequi / Daviplata</option>
                        </select>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center text-sm font-black mb-4 text-slate-800">
                          <span>Total:</span>
                          <span className="text-lg" style={{ color: '#2da8b4' }}>${getTotal().toLocaleString()} COP</span>
                        </div>

                        <button 
                          type="submit"
                          className="w-full bg-emerald-500 text-white py-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:bg-emerald-600 shadow-md shadow-emerald-500/20 active:scale-95 transition"
                        >
                          <Send className="w-4 h-4" /> Enviar Pedido a WhatsApp
                        </button>
                      </div>
                    </form>
                  )}
                </section>
              </div>

              {/* BANNER CONSULTA PERSONALIZADA */}
              <div 
                className="text-white p-8 sm:p-12 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left relative overflow-hidden"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_2px,transparent_2px)] [background-size:16px_16px]"></div>
                <div className="relative z-10 space-y-2 max-w-xl">
                  <span className="bg-white/20 backdrop-blur-md text-white border border-white/30 text-[10px] px-3.5 py-1 rounded-full font-black uppercase tracking-wider">
                    ✨ Bajo Pedido & Sublimación
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black">¿Buscas un diseño especial, personalizado o bajo medida?</h3>
                  <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed">
                    Creamos la pieza exacta que imaginas mediante sublimación y costura personalizada. ¡Escríbenos directamente!
                  </p>
                </div>
                <button 
                  onClick={handleCustomRequestWhatsApp}
                  className="relative z-10 bg-white text-slate-900 font-black text-xs sm:text-sm px-6 py-4 rounded-2xl shadow-lg hover:bg-yellow-300 flex items-center gap-2.5 flex-shrink-0 active:scale-95 transition"
                >
                  <MessageCircle className="w-5 h-5 text-emerald-600" /> Contactar por WhatsApp
                </button>
              </div>
            </>
          ) : !adminAuthenticated ? (
            /* LOGIN ADMIN */
            <div className="max-w-md mx-auto bg-white/95 backdrop-blur-xs p-8 rounded-3xl border-2 border-sky-200 shadow-xl text-center">
              <div 
                className="w-14 h-14 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                <KeyRound className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Acceso Privado</h3>
              <p className="text-xs text-slate-500 mt-1 mb-6 font-medium">Ingresa la clave de administración de Valissa.</p>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input 
                  type="password" 
                  required
                  placeholder="Introduce el PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full text-center text-sm tracking-widest p-3.5 bg-sky-50/50 border border-sky-200 rounded-2xl focus:outline-none focus:border-[#49c5d1] font-black"
                />

                {pinError && <p className="text-xs text-rose-500 font-bold">{pinError}</p>}

                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsAdminMode(false)
                      window.history.replaceState({}, '', window.location.pathname)
                    }}
                    className="w-1/2 bg-slate-100 text-slate-600 py-3 rounded-xl text-xs font-bold hover:bg-slate-200"
                  >
                    Volver
                  </button>
                  <button 
                    type="submit" 
                    className="w-1/2 text-white py-3 rounded-xl text-xs font-black hover:opacity-90 shadow-md"
                    style={{ backgroundColor: BRAND_COLOR }}
                  >
                    Ingresar
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* PANEL ADMIN CON CATEGORÍAS */
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="bg-white/95 backdrop-blur-xs p-8 rounded-3xl border-2 border-sky-200 shadow-xl">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Panel de Administración</h3>
                    <p className="text-xs text-slate-500 font-medium">Publica nuevas prendas seleccionando su categoría oficial.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setIsAdminMode(false)
                        window.history.replaceState({}, '', window.location.pathname)
                      }}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl transition"
                    >
                      Ver Tienda
                    </button>
                    <button 
                      onClick={handleAdminLogout}
                      className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-3 py-2 rounded-xl transition"
                    >
                      Salir
                    </button>
                  </div>
                </div>

                {successMsg && (
                  <div className="mb-6 bg-sky-50 border border-sky-200 text-sky-900 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" style={{ color: BRAND_COLOR }} />
                    <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleCreateProduct} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la Prenda o Estampado</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej: Conjunto Infantil Colorido"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full text-xs p-3.5 bg-sky-50/50 border border-sky-200 rounded-xl focus:outline-none focus:border-[#49c5d1] font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Categoría Oficial</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full text-xs p-3.5 bg-sky-50/50 border border-sky-200 rounded-xl focus:outline-none focus:border-[#49c5d1] font-bold text-slate-800"
                    >
                      {CATEGORIES.filter(c => c.id !== 'Todas').map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Descripción</label>
                    <textarea 
                      rows="2"
                      placeholder="Ej: Algodón suave con estampados vibrantes."
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full text-xs p-3.5 bg-sky-50/50 border border-sky-200 rounded-xl focus:outline-none focus:border-[#49c5d1] font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Precio Referencial (COP)</label>
                      <input 
                        type="number" 
                        required
                        placeholder="60000"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className="w-full text-xs p-3.5 bg-sky-50/50 border border-sky-200 rounded-xl focus:outline-none focus:border-[#49c5d1] font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Stock Interno</label>
                      <input 
                        type="number" 
                        required
                        placeholder="10"
                        value={formStock}
                        onChange={(e) => setFormStock(e.target.value)}
                        className="w-full text-xs p-3.5 bg-sky-50/50 border border-sky-200 rounded-xl focus:outline-none focus:border-[#49c5d1] font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tallas</label>
                      <input 
                        type="text" 
                        required
                        placeholder="2, 4, 6, 8"
                        value={formSizes}
                        onChange={(e) => setFormSizes(e.target.value)}
                        className="w-full text-xs p-3.5 bg-sky-50/50 border border-sky-200 rounded-xl focus:outline-none focus:border-[#49c5d1] font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Foto de la Prenda (Cámara o Galería)</label>
                    <div className="flex items-center gap-2">
                      <label 
                        className="w-full cursor-pointer border border-dashed border-sky-300 p-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition shadow-xs"
                        style={{ backgroundColor: '#f0fbfc', color: '#1a7e87' }}
                      >
                        <Upload className="w-4 h-4" style={{ color: BRAND_COLOR }} />
                        <span>{imageFile ? imageFile.name : 'Seleccionar imagen o tomar foto'}</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => setImageFile(e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                      {imageFile && (
                        <button 
                          type="button" 
                          onClick={() => setImageFile(null)} 
                          className="text-xs text-rose-500 font-bold p-2 hover:bg-rose-50 rounded-xl"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-3 text-white py-4 rounded-xl text-xs font-black hover:opacity-90 transition shadow-md"
                    style={{ backgroundColor: BRAND_COLOR }}
                  >
                    {submitting ? 'Subiendo foto y guardando...' : 'Publicar Prenda'}
                  </button>
                </form>
              </div>

              {/* LISTADO INVENTARIO */}
              <div className="bg-white/95 backdrop-blur-xs p-8 rounded-3xl border-2 border-sky-200 shadow-xl">
                <h4 className="text-base font-black text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Package className="w-4 h-4" style={{ color: BRAND_COLOR }} /> Inventario Actual en Tienda
                </h4>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {products.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3.5 bg-sky-50/40 border border-sky-100 rounded-2xl text-xs gap-2">
                      <div className="flex items-center gap-3">
                        <img src={p.image_url || PLACEHOLDER_IMG} alt={p.name} className="w-12 h-12 object-cover rounded-full border border-sky-200 shadow-xs flex-shrink-0" />
                        <div>
                          <p className="font-black text-slate-900 line-clamp-1">{p.name}</p>
                          <p className="text-[10px] font-extrabold uppercase" style={{ color: '#2da8b4' }}>{CATEGORIES.find(c => c.id === p.category)?.name || p.category}</p>
                          <p className="font-bold text-slate-600">${Number(p.price).toLocaleString()} COP — <span className="text-slate-500 font-extrabold">Stock: {p.stock}</span></p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteProduct(p.id)}
                        className="bg-rose-100 text-rose-700 hover:bg-rose-200 px-3 py-1.5 rounded-xl font-bold transition shadow-xs flex-shrink-0"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="text-center py-6 text-xs font-bold text-slate-400 border-t border-sky-100 mt-12 bg-white/50">
        Valissa - Diseño y Costura Infantil © 2026 💖 Hecho con amor
      </footer>
    </div>
  )
}

function ProductCard({ product, sizes, onAddToCart }) {
  const [selectedSize, setSelectedSize] = useState(sizes[0])

  const categoryName = CATEGORIES.find(c => c.id === product.category)?.name || product.category

  // Determinar si es un producto personalizado / bajo pedido
  const isCustomProduct = product.category === 'Bajo pedido' || product.category === 'Personalizados en sublimación'

  function handleConsultProductWhatsApp() {
    const message = `*¡Hola Valissa!* 👋 Me interesa consultar por este diseño personalizado / bajo pedido:\n\n📌 *Prenda:* ${product.name}\n📂 *Categoría:* ${categoryName}\n💰 *Precio ref:* $${Number(product.price).toLocaleString()} COP\n📏 *Talla sugerida:* ${selectedSize || 'A coordinar'}\n\n¿Me podrías dar más detalles sobre los estampados, telas o el proceso de encargos?`
    const whatsappUrl = `https://wa.me/584242111582?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div className="bg-white/95 backdrop-blur-xs rounded-3xl border-2 border-sky-100 overflow-hidden flex flex-col justify-between group hover:shadow-2xl hover:border-[#49c5d1] transition-all duration-300">
      {/* Contenedor de la imagen optimizado */}
      <div className="relative overflow-hidden bg-sky-50/50 aspect-[4/5] flex items-center justify-center p-2">
        <img 
          src={product.image_url || PLACEHOLDER_IMG} 
          alt={product.name} 
          className="w-full h-full object-contain group-hover:scale-105 transition duration-500 drop-shadow-sm" 
        />
        {/* Etiqueta de Categoría Visual */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-full text-[9px] font-black uppercase text-teal-800 shadow-sm flex items-center gap-1">
          <Baby className="w-3 h-3" />
          {categoryName}
        </div>
        {/* Precio */}
        <div 
          className="absolute top-3 right-3 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-md"
          style={{ backgroundColor: BRAND_COLOR }}
        >
          ${Number(product.price).toLocaleString()} COP
        </div>
      </div>

      <div className="p-5 flex flex-col justify-between flex-grow gap-4">
        <div>
          <h4 className="font-black text-slate-900 text-base">{product.name}</h4>
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed font-medium">{product.description}</p>

          <div className="mt-4 pt-4 border-t border-sky-100">
            <span className="text-[11px] font-extrabold text-slate-700 block mb-1.5">
              {isCustomProduct ? 'Talla referencial:' : 'Selecciona la talla:'}
            </span>
            <div className="flex flex-wrap gap-2">
              {sizes.map((sz) => (
                <button
                  key={sz}
                  onClick={() => setSelectedSize(sz)}
                  className={`text-[11px] px-3 py-1 rounded-full font-black border transition ${selectedSize === sz ? 'text-white border-[#49c5d1] shadow-sm' : 'bg-sky-50/50 text-slate-700 border-sky-200 hover:border-[#49c5d1]'}`}
                  style={selectedSize === sz ? { backgroundColor: BRAND_COLOR } : {}}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          {isCustomProduct ? (
            <button 
              onClick={handleConsultProductWhatsApp}
              className="w-full bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-black hover:bg-emerald-600 active:scale-95 transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Consultar por WhatsApp
            </button>
          ) : (
            <button 
              onClick={() => onAddToCart(product, null, selectedSize)}
              className="w-full text-white px-5 py-2.5 rounded-xl text-xs font-black hover:opacity-90 active:scale-95 transition shadow-md flex items-center justify-center gap-1.5"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              <ShoppingBag className="w-4 h-4" />
              + Agregar al Pedido
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
