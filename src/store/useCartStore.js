import { create } from 'zustand'

export const useCartStore = create((set, get) => ({
  cart: [],
  coupon: null,
  
  addToCart: (product, qty = 1, selectedSize = 'Única') => {
    set((state) => {
      const existingIndex = state.cart.findIndex(
        item => item.product.id === product.id && item.selectedSize === selectedSize
      )
      let newCart = [...state.cart]
      if (existingIndex > -1) {
        newCart[existingIndex].quantity += 1
      } else {
        newCart.push({ product, quantity: 1, selectedSize })
      }
      
      // Contar piezas de Conjuntos, Pijamas Y línea Valentina para el cupón
      const eligibleItems = newCart.reduce((sum, item) => {
        const cat = (item.product.category || '').toLowerCase()
        if (cat.includes('conjunto') || cat.includes('pijama') || cat.includes('valentina')) {
          return sum + item.quantity
        }
        return sum
      }, 0)

      let newCoupon = state.coupon
      if (eligibleItems < 3) {
        newCoupon = null
      }

      return { cart: newCart, coupon: newCoupon }
    })
  },

  removeFromCart: (index) => {
    set((state) => {
      const newCart = state.cart.filter((_, i) => i !== index)
      
      // Contar piezas elegibles tras eliminar
      const eligibleItems = newCart.reduce((sum, item) => {
        const cat = (item.product.category || '').toLowerCase()
        if (cat.includes('conjunto') || cat.includes('pijama') || cat.includes('valentina')) {
          return sum + item.quantity
        }
        return sum
      }, 0)

      let newCoupon = state.coupon
      if (eligibleItems < 3) {
        newCoupon = null
      }
      return { cart: newCart, coupon: newCoupon }
    })
  },

  applyCoupon: (couponData) => {
    const state = get()
    // Contar piezas elegibles antes de aplicar
    const eligibleItems = state.cart.reduce((sum, item) => {
      const cat = (item.product.category || '').toLowerCase()
      if (cat.includes('conjunto') || cat.includes('pijama') || cat.includes('valentina')) {
        return sum + item.quantity
      }
      return sum
    }, 0)

    if (eligibleItems >= 3) {
      set({ coupon: couponData })
      return { success: true }
    } else {
      return { success: false, message: 'El cupón aplica solo a partir de 3 piezas en las categorías Conjuntos, Pijamas o línea Valentina' }
    }
  },

  clearCart: () => set({ cart: [], coupon: null }),

  getTotal: () => {
    const state = get()
    const subtotal = state.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
    
    // Contar piezas elegibles para calcular descuento final
    const eligibleItems = state.cart.reduce((sum, item) => {
      const cat = (item.product.category || '').toLowerCase()
      if (cat.includes('conjunto') || cat.includes('pijama') || cat.includes('valentina')) {
        return sum + item.quantity
      }
      return sum
    }, 0)
    
    if (state.coupon && eligibleItems >= 3) {
      const discount = (subtotal * state.coupon.discount_percent) / 100
      return subtotal - discount
    }
    return subtotal
  }
}))
