export const FREE_DELIVERY_AT = 50
export const DELIVERY_FEE = 4.99

export function calcTotals(items, couponPercent = 0) {
    let mrp = 0
    let subtotal = 0

    items.forEach((i) => {
        const price = Number(i.price || 0)
        const d = Number(i.discountPercentage || 0)
        const original = d > 0 && d < 100 ? price / (1 - d / 100) : price
        mrp += original * i.quantity
        subtotal += price * i.quantity
    })

    const couponOff = (subtotal * couponPercent) / 100
    const afterCoupon = subtotal - couponOff
    const delivery = items.length === 0 || afterCoupon >= FREE_DELIVERY_AT ? 0 : DELIVERY_FEE

    return {
        mrp, subtotal, couponOff, delivery,
        productDiscount: mrp - subtotal,
        total: afterCoupon + delivery,
        saved: mrp - subtotal + couponOff,
        remaining: Math.max(0, FREE_DELIVERY_AT - afterCoupon),
        progress: Math.min(100, (afterCoupon / FREE_DELIVERY_AT) * 100),
    }
}