import { useState } from "react"
import { Link } from "react-router-dom"
import { FloatingLabel, Form, Spinner } from "react-bootstrap"
import { Eye, EyeSlash, BoxSeam, Heart, Cart3, CheckCircleFill } from "react-bootstrap-icons"
import Header from "./Header"
import { useproducts } from "../Context/ProductContext"

const ADDRESS_EMPTY = { fullName: "", phone: "", line1: "", city: "", state: "", zip: "" }

function readJson(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback
    } catch {
        return fallback
    }
}

// outside Profile, so inputs keep focus while typing
function TextField({ label, value, onChange, error, readOnly, ...rest }) {
    return (
        <div className="pf-field">
            <FloatingLabel label={label} className={error ? "has-error" : ""}>
                <Form.Control placeholder={label} value={value} onChange={onChange} readOnly={readOnly} {...rest} />
            </FloatingLabel>
            {error && <div className="text-danger mt-1 error-msg">{error}</div>}
        </div>
    )
}

function PasswordInput({ label, value, onChange, error }) {
    const [show, setShow] = useState(false)
    return (
        <div className="pf-field">
            <div className={`pw-field ${error ? "has-error" : ""}`}>
                <FloatingLabel label={label}>
                    <Form.Control
                        type={show ? "text" : "password"}
                        placeholder={label}
                        autoComplete="new-password"
                        value={value}
                        onChange={onChange}
                    />
                </FloatingLabel>
                <button type="button" className="pw-eye" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
                    {show ? <EyeSlash /> : <Eye />}
                </button>
            </div>
            {error && <div className="text-danger mt-1 error-msg">{error}</div>}
        </div>
    )
}

function Profile() {
    const { orders, wishlist, cart } = useproducts()
    const [user, setUser] = useState(() => readJson("user-info", {}))
    const [tab, setTab] = useState("details")
    const [msg, setMsg] = useState("")
    const [saving, setSaving] = useState(false)

    const displayName = user.firstName || user.fullName || user.email || ""
    const initial = displayName.charAt(0).toUpperCase()

    const [name, setName] = useState(user.firstName || user.fullName || "")
    const [address, setAddress] = useState(() => ({ ...ADDRESS_EMPTY, ...readJson("saved-address", {}) }))
    const [pw, setPw] = useState({ old: "", next: "", confirm: "" })
    const [errors, setErrors] = useState({})

    function finish(text) {
        setSaving(true)
        setTimeout(() => {
            setSaving(false)
            setMsg(text)
            setTimeout(() => setMsg(""), 3000)
        }, 700)
    }

    function switchTab(next) {
        setTab(next)
        setErrors({})
        setMsg("")
    }

    function saveDetails(e) {
        e.preventDefault()
        if (name.trim().length < 3) return setErrors({ name: "Name must be at least 3 characters" })
        setErrors({})

        const updated = { ...user, firstName: name.trim() }
        localStorage.setItem("user-info", JSON.stringify(updated))
        setUser(updated)
        window.dispatchEvent(new Event("user-updated"))     // lets the Header refresh its greeting
        finish("Details saved")
    }

    function saveAddress(e) {
        e.preventDefault()
        const err = {}
        if (address.fullName.trim().length < 3) err.fullName = "Enter your full name"
        if (!/^\+?[0-9\s-]{7,15}$/.test(address.phone.trim())) err.phone = "Enter a valid phone number"
        if (address.line1.trim().length < 8) err.line1 = "Enter your full street address"
        if (!address.city.trim()) err.city = "City is required"
        if (!address.state.trim()) err.state = "State or region is required"
        if (!/^[A-Za-z0-9\s-]{3,10}$/.test(address.zip.trim())) err.zip = "Enter a valid postal code"
        setErrors(err)
        if (Object.keys(err).length) return

        localStorage.setItem("saved-address", JSON.stringify(address))
        finish("Address saved")
    }

    function savePassword(e) {
        e.preventDefault()
        const p = pw.next
        const err = {}
        if (!pw.old) err.old = "Enter your current password"
        if (!p) err.next = "Enter a new password"
        else if (p.length < 8) err.next = "Password must be at least 8 characters"
        else if (!/[A-Z]/.test(p)) err.next = "Add at least one uppercase letter"
        else if (!/\d/.test(p)) err.next = "Add at least one number"
        else if (!/[^A-Za-z0-9]/.test(p)) err.next = "Add at least one special character (!@#$%)"
        else if (p === pw.old) err.next = "New password must be different"
        if (!pw.confirm) err.confirm = "Please confirm your password"
        else if (p !== pw.confirm) err.confirm = "Passwords do not match"
        setErrors(err)
        if (Object.keys(err).length) return

        // demo only: there is no server, so nothing is stored
        setPw({ old: "", next: "", confirm: "" })
        finish("Password updated")
    }

    const setAddr = (field) => (e) => {
        setAddress((a) => ({ ...a, [field]: e.target.value }))
        setErrors((x) => ({ ...x, [field]: "" }))
    }
    const setPass = (field) => (e) => {
        setPw((a) => ({ ...a, [field]: e.target.value }))
        setErrors((x) => ({ ...x, [field]: "" }))
    }

    const saveBtn = (label = "Save changes") => (
        <button className="btn login-btn mt-2" disabled={saving}>
            {saving ? <><Spinner as="span" animation="border" size="sm" className="me-2" />Saving...</> : label}
        </button>
    )

    return (
        <>
            <Header />
            <div className="container py-4">
                <div className="pf-card">
                    {/* identity */}
                    <div className="pf-head">
                        <div className="pf-avatar">{initial}</div>
                        <div>
                            <h2>{displayName}</h2>
                            <p>{user.email}</p>
                        </div>
                    </div>

                    <div className="pf-stats">
                        <Link to="/orders"><BoxSeam /><strong>{orders.length}</strong><small>Orders</small></Link>
                        <Link to="/wishlist"><Heart /><strong>{wishlist.length}</strong><small>Wishlist</small></Link>
                        <Link to="/cart"><Cart3 /><strong>{cart.length}</strong><small>In cart</small></Link>
                    </div>

                    {/* tabs */}
                    <div className="pf-tabs" role="tablist">
                        {[["details", "Details"], ["address", "Address"], ["password", "Password"]].map(([key, label]) => (
                            <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "active" : ""} onClick={() => switchTab(key)}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {msg && <div className="pf-msg"><CheckCircleFill /> {msg}</div>}

                    {tab === "details" && (
                        <form onSubmit={saveDetails} noValidate className="text-start">
                            <TextField label="Full name" autoComplete="name" value={name} error={errors.name}
                                onChange={(e) => { setName(e.target.value); setErrors({}) }} />
                            <TextField label="Email address" value={user.email || ""} readOnly onChange={() => {}} />
                            <small className="pf-hint">Your email is your login and can't be changed.</small>
                            {saveBtn()}
                        </form>
                    )}

                    {tab === "address" && (
                        <form onSubmit={saveAddress} noValidate className="text-start">
                            <div className="pf-grid">
                                <div className="full"><TextField label="Full name" value={address.fullName} onChange={setAddr("fullName")} error={errors.fullName} /></div>
                                <div className="full"><TextField label="Phone number" type="tel" value={address.phone} onChange={setAddr("phone")} error={errors.phone} /></div>
                                <div className="full"><TextField label="Street address" value={address.line1} onChange={setAddr("line1")} error={errors.line1} /></div>
                                <TextField label="City" value={address.city} onChange={setAddr("city")} error={errors.city} />
                                <TextField label="State / region" value={address.state} onChange={setAddr("state")} error={errors.state} />
                                <TextField label="Postal code" value={address.zip} onChange={setAddr("zip")} error={errors.zip} />
                            </div>
                            <small className="pf-hint">Used to pre-fill checkout.</small>
                            {saveBtn("Save address")}
                        </form>
                    )}

                    {tab === "password" && (
                        <form onSubmit={savePassword} noValidate className="text-start">
                            <PasswordInput label="Current password" value={pw.old} onChange={setPass("old")} error={errors.old} />
                            <PasswordInput label="New password" value={pw.next} onChange={setPass("next")} error={errors.next} />
                            <PasswordInput label="Confirm new password" value={pw.confirm} onChange={setPass("confirm")} error={errors.confirm} />
                            {saveBtn("Update password")}
                        </form>
                    )}
                </div>
            </div>
        </>
    )
}

export default Profile