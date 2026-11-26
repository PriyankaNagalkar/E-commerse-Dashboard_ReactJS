import { useMemo, useState } from "react"
import { Link, Navigate, useLocation } from "react-router-dom"
import { FloatingLabel, Form, Spinner } from "react-bootstrap"
import { CheckCircleFill, GeoAlt, Cash, CreditCard, ShieldCheck } from "react-bootstrap-icons"
import Header from "./Header"
import { useproducts } from "../Context/ProductContext"
import { calcTotals } from "../utils/pricing"

const EMPTY = { fullName: "", phone: "", line1: "", city: "", state: "", zip: "" }

function loadAddress() {
    try {
        const user = JSON.parse(localStorage.getItem("user-info") || "null")
        const saved = JSON.parse(localStorage.getItem("saved-address") || "{}")
        return { ...EMPTY, fullName: user?.firstName || "", ...saved }
    } catch {
        return EMPTY
    }
}

const arrivalDate = (from = new Date(), days = 5) => {
    const d = new Date(from)
    d.setDate(d.getDate() + days)
    return d.toLocaleDateString("en-EN", { weekday: "short", day: "numeric", month: "short" })
}

// outside Checkout, so the inputs keep focus while typing
function AddressField({ label, value, onChange, error, full, ...rest }) {
    return (
        <div className={full ? "full" : ""}>
            <FloatingLabel label={label} className={error ? "has-error" : ""}>
                <Form.Control placeholder={label} value={value} onChange={onChange} {...rest} />
            </FloatingLabel>
            {error && <div className="text-danger mt-1 error-msg">{error}</div>}
        </div>
    )
}

function Checkout() {
    const { state } = useLocation()
    const { cart, setOrders, removeFromCart } = useproducts()

    const [form, setForm] = useState(loadAddress)
    const [errors, setErrors] = useState({})
    const [payment, setPayment] = useState("cod")
    const [saveAddr, setSaveAddr] = useState(true)
    const [placing, setPlacing] = useState(false)
    const [done, setDone] = useState(null)

    const ids = state?.ids
    const coupon = state?.coupon
    const items = useMemo(() => (ids ? cart.filter((i) => ids.includes(i.id)) : []), [cart, ids])
    const t = calcTotals(items, coupon?.percent || 0)

    const set = (field) => (e) => {
        setForm((p) => ({ ...p, [field]: e.target.value }))
        setErrors((p) => ({ ...p, [field]: "" }))
    }

    function validate() {
        const e = {}
        if (form.fullName.trim().length < 3) e.fullName = "Enter your full name"
        if (!/^\+?[0-9\s-]{7,15}$/.test(form.phone.trim())) e.phone = "Enter a valid phone number"
        if (form.line1.trim().length < 8) e.line1 = "Enter your full street address"
        if (!form.city.trim()) e.city = "City is required"
        if (!form.state.trim()) e.state = "State or region is required"
        if (!/^[A-Za-z0-9\s-]{3,10}$/.test(form.zip.trim())) e.zip = "Enter a valid postal code"
        setErrors(e)
        return Object.keys(e).length === 0
    }

    function placeOrder(e) {
        e.preventDefault()
        if (!validate()) return

        setPlacing(true)
        setTimeout(() => {
            const address = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]))
            if (saveAddr) localStorage.setItem("saved-address", JSON.stringify(address))

            const order = {
                id: `GS${Date.now().toString().slice(-8)}`,
                date: new Date().toISOString(),
                items: items.map((i) => ({ ...i })),
                total: t.total,
                saved: t.saved,
                delivery: t.delivery,
                couponCode: coupon?.code || null,
                status: "Placed",
                address,
                payment,
            }

            setOrders((prev) => [order, ...prev])
            items.forEach((i) => removeFromCart(i.id))
            setDone(order)
            setPlacing(false)
        }, 1200)
    }

    // nothing to check out (opened directly, or cart is empty)
    if (!done && items.length === 0) return <Navigate to="/cart" replace />

    // success view
    if (done) {
        return (
            <>
                <Header />
                <div className="container py-4">
                    <div className="ck-card ck-success text-center">
                        <CheckCircleFill className="ct-success-icon" />
                        <h3>Order placed!</h3>
                        <p>Thank you for shopping with GlowStore.</p>
                        <div className="ct-order-info">
                            <p>Order ID <strong>{done.id}</strong></p>
                            <p>Total <strong>₹{done.total.toFixed(2)}</strong></p>
                            <p>Arriving by <strong>{arrivalDate(done.date)}</strong></p>
                            <p>
                                Delivering to <strong>{done.address.fullName}</strong>, {done.address.line1}, {done.address.city}
                            </p>
                        </div>
                        <Link to="/orders" className="wl-btn wl-btn-inline">View my orders</Link>
                        <Link to="/" className="wl-link d-block mt-3">Continue shopping</Link>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <Header />
            <div className="container py-4">
                <div className="text-center mt-3 mb-4">
                    <h1 className="login-title">Checkout</h1>
                    <p className="login-subtitle mb-0">Where should we send your order?</p>
                </div>

                <div className="row g-4">
                    {/* LEFT: address and payment */}
                    <div className="col-lg-7">
                        <form id="checkout-form" onSubmit={placeOrder} noValidate>
                            <div className="ck-card mb-4">
                                <h5><GeoAlt /> Delivery address</h5>
                                <div className="ck-grid">
                                    <AddressField full label="Full name" autoComplete="name" value={form.fullName} onChange={set("fullName")} error={errors.fullName} />
                                    <AddressField full label="Phone number" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} error={errors.phone} />
                                    <AddressField full label="Street address" autoComplete="street-address" value={form.line1} onChange={set("line1")} error={errors.line1} />
                                    <AddressField label="City" autoComplete="address-level2" value={form.city} onChange={set("city")} error={errors.city} />
                                    <AddressField label="State / region" autoComplete="address-level1" value={form.state} onChange={set("state")} error={errors.state} />
                                    <AddressField label="Postal code" autoComplete="postal-code" value={form.zip} onChange={set("zip")} error={errors.zip} />
                                </div>

                                <label className="ck-save">
                                    <input type="checkbox" className="ct-check" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} />
                                    <span>Save this address for next time</span>
                                </label>
                            </div>

                            <div className="ck-card">
                                <h5><CreditCard /> Payment method</h5>
                                <div className="ck-pay">
                                    {[
                                        ["cod", <Cash />, "Cash on delivery", "Pay when it arrives"],
                                        ["online", <CreditCard />, "Pay online", "Demo only, no real payment"],
                                    ].map(([value, icon, name, hint]) => (
                                        <label key={value} className={`ck-opt ${payment === value ? "active" : ""}`}>
                                            <input type="radio" name="payment" value={value} checked={payment === value} onChange={() => setPayment(value)} />
                                            <span className="ico">{icon}</span>
                                            <span><strong>{name}</strong><small>{hint}</small></span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* RIGHT: summary */}
                    <div className="col-lg-5">
                        <aside className="ct-summary">
                            <h5 className="ct-summary-title">Order summary</h5>

                            <div className="ck-items">
                                {items.map((i) => (
                                    <div className="ck-item" key={i.id}>
                                        <img src={i.images?.[0] || i.thumbnail} alt="" />
                                        <div>
                                            <span className="t">{i.title}</span>
                                            <small>Qty {i.quantity}</small>
                                        </div>
                                        <strong>₹{(i.price * i.quantity).toFixed(2)}</strong>
                                    </div>
                                ))}
                            </div>

                            <div className="ct-row"><span>Price</span><span>₹{t.mrp.toFixed(2)}</span></div>
                            {t.productDiscount > 0.005 && (
                                <div className="ct-row green"><span>Discount</span><span>- ₹{t.productDiscount.toFixed(2)}</span></div>
                            )}
                            {t.couponOff > 0 && (
                                <div className="ct-row green"><span>Coupon ({coupon.code})</span><span>- ₹{t.couponOff.toFixed(2)}</span></div>
                            )}
                            <div className="ct-row">
                                <span>Delivery</span>
                                {t.delivery === 0 ? <span className="free">FREE</span> : <span>₹{t.delivery.toFixed(2)}</span>}
                            </div>
                            <div className="ct-row ct-total"><span>Total</span><span>₹{t.total.toFixed(2)}</span></div>

                            {t.saved > 0.005 && <div className="ct-save">You'll save ₹{t.saved.toFixed(2)} on this order 🎉</div>}

                            <button type="submit" form="checkout-form" className="ct-order-btn" disabled={placing}>
                                {placing ? <><Spinner animation="border" size="sm" /> Placing order...</> : `Place Order · ₹${t.total.toFixed(2)}`}
                            </button>
                            <p className="ct-secure"><ShieldCheck /> Safe and secure payments</p>
                            <Link to="/cart" className="wl-link d-block text-center mt-2">Back to cart</Link>
                        </aside>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Checkout