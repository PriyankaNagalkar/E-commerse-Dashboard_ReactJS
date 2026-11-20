import { StarFill, Heart, HeartFill, Handbag } from "react-bootstrap-icons"
import { useproducts } from "../Context/ProductContext"

function RecommendedProducts({ basedOn = [], exclude = [], onOpen, title = "You may also like", limit = 20 }) {
    const { products, addToCart, toggleWishlist, isWished } = useproducts()

    const skip = new Set(exclude)
    const categories = new Set(basedOn.map((p) => p.category).filter(Boolean))
    const score = (p) => (categories.has(p.category) ? 10 : 0) + Number(p.rating || 0)

    const picks = products
        .filter((p) => !skip.has(p.id) && (p.images?.[0] || p.thumbnail))
        .sort((a, b) => score(b) - score(a))
        .slice(0, limit)

    if (picks.length === 0) return null

    return (
        <section className="rec">
            <h4 className="rec-title">{title}</h4>

            <div className="rec-row">
                {picks.map((p) => (
                    <div
                        className="rec-card"
                        key={p.id}
                        onClick={(e) => { if (!e.target.closest("button")) onOpen?.(p.id) }}
                    >
                        <div className="rec-img">
                            <img src={p.images?.[0] || p.thumbnail} alt={p.title} loading="lazy" />
                            <button
                                type="button"
                                className={`rec-heart ${isWished(p.id) ? "active" : ""}`}
                                aria-label={isWished(p.id) ? "Remove from wishlist" : "Add to wishlist"}
                                onClick={() => toggleWishlist(p)}
                            >
                                {isWished(p.id) ? <HeartFill /> : <Heart />}
                            </button>
                        </div>

                        <div className="rec-body">
                            <h5>{p.title}</h5>
                            <div className="rec-meta">
                                <strong>${Number(p.price).toFixed(2)}</strong>
                                {p.rating > 0 && <span><StarFill size={11} /> {Number(p.rating).toFixed(1)}</span>}
                            </div>
                            <button type="button" className="rec-add" onClick={() => addToCart(p)}>
                                <Handbag /> Add
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

export default RecommendedProducts