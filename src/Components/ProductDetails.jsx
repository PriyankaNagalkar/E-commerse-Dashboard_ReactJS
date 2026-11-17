import { useState } from "react"
import { Link } from "react-router-dom"
import { Modal } from "react-bootstrap"
import {
    StarFill, Star, Heart, HeartFill, Handbag, Dash, Plus,
    Truck, ShieldCheck, ArrowCounterclockwise, Pencil,
} from "react-bootstrap-icons"
import { useproducts } from "../Context/ProductContext"

function Stars({ value }) {
    return (
        <span className="pd-stars" aria-label={`${value} out of 5`}>
            {[1, 2, 3, 4, 5].map((n) => (n <= Math.round(value) ? <StarFill key={n} /> : <Star key={n} />))}
        </span>
    )
}

function ProductDetails({ product, onHide }) {
    const { cart, isWished, toggleWishlist, addToCart, updateCartQuantity } = useproducts()
    const [active, setActive] = useState(0)
    const colors = product.colors || []
    const [shade, setShade] = useState(0)                 // index of the selected color
    const chosen = colors[shade]

    const images = product.images?.length ? product.images : [product.thumbnail].filter(Boolean)
    const qty = cart.find((c) => c.id === product.id)?.quantity
    const price = Number(product.price || 0)
    const discount = Math.round(product.discountPercentage || 0)
    const original = discount > 0 && discount < 100 ? price / (1 - discount / 100) : null

    const hasStock = typeof product.stock === "number"
    const soldOut = hasStock && product.stock <= 0
    const maxed = hasStock && qty >= product.stock

    const apiTrust = [
        product.shippingInformation && { icon: <Truck />, text: product.shippingInformation },
        product.warrantyInformation && { icon: <ShieldCheck />, text: product.warrantyInformation },
        product.returnPolicy && { icon: <ArrowCounterclockwise />, text: product.returnPolicy },
    ].filter(Boolean)

    // products without their own policy info show the store's
    const storePromises = [
        { icon: <Truck />, text: "Free delivery on orders over $50" },
        { icon: <ArrowCounterclockwise />, text: "Easy 7-day returns" },
        { icon: <ShieldCheck />, text: "Safe and secure payments" },
    ]
    const trust = apiTrust.length ? apiTrust : storePromises

    const details = [
        product.category && ["Category", product.category],
        product.brand && ["Brand", product.brand],
        product.sku && ["SKU", product.sku],
        ["Product ID", `#${product.id}`],
        hasStock && ["Availability", soldOut ? "Out of stock" : `${product.stock} in stock`],
        product.isLocal && ["Listed by", "You"],
    ].filter(Boolean)

    return (
        <Modal show onHide={onHide} size="lg" centered scrollable dialogClassName="pd-dialog">
            <Modal.Body className="pd-body">
                <button type="button" className="pd-close" aria-label="Close" onClick={onHide}>×</button>

                <div className="pd-grid">
                    {/* gallery */}
                    <div className="pd-gallery">
                        <div className="pd-main" style={{ "--shade": chosen?.hex || "transparent" }}>
                            {discount > 0 && <span className="pd-discount">-{discount}%</span>}
                            {product.isLocal && <span className="pd-new">New</span>}

                            <img key={active} src={images[active]} alt={product.title} />

                            {chosen && (
                                <span className="pd-shade-chip" key={chosen.hex}>
                                    <i style={{ background: chosen.hex }} />
                                    {chosen.name || chosen.hex}
                                </span>
                            )}
                        </div>

                        {images.length > 1 && (
                            <div className="pd-thumbs">
                                {images.map((src, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className={i === active ? "active" : ""}
                                        aria-label={`Show image ${i + 1}`}
                                        onClick={() => setActive(i)}
                                    >
                                        <img src={src} alt="" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* info */}
                    <div className="pd-info">
                        {product.category && <span className="wl-category">{product.category}</span>}
                        <h2 className="pd-title">{product.title}</h2>
                        {product.brand && <p className="pd-brand">by {product.brand}</p>}

                        {product.rating > 0 && (
                            <div className="pd-rating">
                                <Stars value={product.rating} />
                                <strong>{Number(product.rating).toFixed(1)}</strong>
                                {product.reviews?.length > 0 && <small>({product.reviews.length} reviews)</small>}
                            </div>
                        )}

                        <div className="pd-price">
                            <span className="now">${price.toFixed(2)}</span>
                            {original && <span className="was">${original.toFixed(2)}</span>}
                            {discount > 0 && <span className="off">{discount}% off</span>}
                        </div>

                        {hasStock && (
                            <span className={`pd-stock ${soldOut ? "out" : product.stock < 10 ? "low" : ""}`}>
                                {soldOut ? "Out of stock" : product.stock < 10 ? `Only ${product.stock} left` : "In stock"}
                            </span>
                        )}
                        {colors.length > 0 && (
                            <div className="pd-shades">
                                <h6 className="pd-label">
                                    Shade{chosen?.name && <>: <span className="pd-shade-name">{chosen.name}</span></>}
                                </h6>

                                <div className="pd-swatches" role="radiogroup" aria-label="Choose a shade">
                                    {colors.map((c, i) => (
                                        <button
                                            key={`${c.hex}-${i}`}
                                            type="button"
                                            role="radio"
                                            aria-checked={i === shade}
                                            aria-label={c.name || c.hex}
                                            title={c.name || c.hex}
                                            className={`pd-swatch ${i === shade ? "active" : ""}`}
                                            style={{ "--swatch": c.hex }}
                                            onClick={() => setShade(i)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <h6 className="pd-label">About this product</h6>
                        <p className="pd-desc">{product.description || "No description provided."}</p>

                        {product.tags?.length > 0 && (
                            <div className="pd-tags">
                                {product.tags.map((t) => <span key={t}>#{t}</span>)}
                            </div>
                        )}

                        {trust.length > 0 && (
                            <ul className="pd-trust">
                                {trust.map((t, i) => <li key={i}>{t.icon}<span>{t.text}</span></li>)}
                            </ul>
                        )}

                        <h6 className="pd-label">Product details</h6>
                        <dl className="pd-details">
                            {details.map(([k, v]) => (
                                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                            ))}
                        </dl>

                        {/* actions */}
                        <div className="pd-actions">
                            {qty ? (
                                <div className="ct-stepper pd-stepper">
                                    <button type="button" aria-label="Decrease quantity" onClick={() => updateCartQuantity(product.id, -1)}>
                                        <Dash />
                                    </button>
                                    <span key={qty} className="qty">{qty} in cart</span>
                                    <button type="button" aria-label="Increase quantity" disabled={maxed} onClick={() => updateCartQuantity(product.id, 1)}>
                                        <Plus />
                                    </button>
                                </div>
                            ) : (
                                <button type="button" className="pd-add" disabled={soldOut} onClick={() => addToCart({ ...product, selectedColor: chosen || null })}>
                                    <Handbag /> {soldOut ? "Sold out" : "Add to Cart"}
                                </button>
                            )}

                            <button
                                type="button"
                                className={`pd-wish ${isWished(product.id) ? "active" : ""}`}
                                aria-label={isWished(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                                aria-pressed={isWished(product.id)}
                                onClick={() => toggleWishlist(product)}
                            >
                                {isWished(product.id) ? <HeartFill /> : <Heart />}
                            </button>

                            <Link to={`/update/${product.id}`} className="pd-edit" aria-label="Edit product" title="Edit product">
                                <Pencil />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* reviews */}
                {product.reviews?.length > 0 && (
                    <div className="pd-reviews">
                        <h5>Customer reviews</h5>
                        {product.reviews.slice(0, 3).map((r, i) => (
                            <div className="pd-review" key={i}>
                                <div className="avatar">{r.reviewerName?.charAt(0).toUpperCase()}</div>
                                <div>
                                    <div className="who">
                                        <strong>{r.reviewerName}</strong>
                                        <Stars value={r.rating} />
                                        <small>{new Date(r.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</small>
                                    </div>
                                    <p>{r.comment}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal.Body>
        </Modal>
    )
}

export default ProductDetails