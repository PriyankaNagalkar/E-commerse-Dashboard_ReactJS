import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Alert, Button, Col, Modal, Row, Spinner, Toast, ToastContainer } from "react-bootstrap"
import { Pencil, Trash, StarFill, Search, BoxSeam, Heart, HeartFill, Handbag, Dash, Plus } from "react-bootstrap-icons"
import Header from "./Header"
import { useproducts } from "../Context/ProductContext"
import { useInfiniteScroll } from "../hooks/useInfiniteScroll"

import ProductDetails from "./ProductDetails"

function ProductList() {
    const PAGE_SIZE = 8;
    const { products, setProducts, loaded, setLoaded, wishlist,
        toggleWishlist, addToCart, isWished, isInCart, cart, updateCartQuantity } = useproducts()

    const [toast, setToast] = useState("")
    const [query, setQuery] = useState("")
    const [sort, setSort] = useState("default")
    const [toDelete, setToDelete] = useState(null)       // product waiting for confirmation
    const [removingId, setRemovingId] = useState(null)   // product playing its exit animation
    const [error, setError] = useState("")
    const [attempt, setAttempt] = useState(0)            // bumped by the Retry button
    const [popId, setPopId] = useState(null)
    const [selectedId, setSelectedId] = useState(null)

    // keeps the product's details on screen while the modal fades out
    const lastDeleted = useRef(null)
    if (toDelete) lastDeleted.current = toDelete
    const shown = toDelete || lastDeleted.current

    const BEAUTY_CATEGORIES = ["beauty", "fragrances", "skin-care"]
    const selected = products.find((p) => p.id === selectedId)

    // load once; the guard stops refetching (and deleted items coming back)
    // useEffect(() => {
    //     // if (loaded) return
    //     const controller = new AbortController()

    //     async function fetchProducts() {
    //         try {
    //             const responses = await Promise.all(
    //                 BEAUTY_CATEGORIES.map((c) =>
    //                     fetch(`https://dummyjson.com/products/category/${c}?limit=0`, { signal: controller.signal })
    //                 )
    //             )
    //             if (responses.some((r) => !r.ok)) throw new Error("Request failed")

    //             const results = await Promise.all(responses.map((r) => r.json()))
    //             const fetched = results.flatMap((data) => data.products)

    //             setProducts((prev) => [...prev, ...fetched])
    //             setLoaded(true)
    //         } catch (err) {
    //             if (err.name !== "AbortError") {
    //                 setError("Failed to load products. Please try again.")
    //             }
    //         }
    //     }
    //     fetchProducts()

    //     return () => controller.abort()
    // }, [loaded, attempt, setProducts, setLoaded])

    const MAKEUP_URL = "https://makeup-api.herokuapp.com/api/v1/products.json?product_type=lipstick"

    // converts a Makeup API product to the shape the app already uses
    function mapMakeup(p) {
        let image = p.image_link || p.api_featured_image || ""
        if (image.startsWith("//")) image = "https:" + image      // some links have no protocol

        return {
            id: `mk-${p.id}`,                                      // prefix avoids clashing with DummyJSON ids
            title: (p.name || "").trim(),
            description: (p.description || "").replace(/\s+/g, " ").trim(),
            price: Number(p.price),
            category: p.product_type,                              // "lipstick"
            brand: p.brand,
            rating: Number(p.rating) || 0,
            discountPercentage: 0,
            stock: 20,                                             // the API has no stock, so set your own
            tags: p.tag_list || [],
            thumbnail: image,
            images: image ? [image] : [],
            colors: (p.product_colors || [])
                .filter((c) => /^#[0-9a-f]{3,8}$/i.test((c.hex_value || "").trim()))   // skip missing or invalid hex values
                .map((c) => ({
                    hex: c.hex_value.trim(),
                    name: decodeHtml(c.colour_name || "").trim(),
                })),
        }
    }

    function decodeHtml(str = "") {
        const el = document.createElement("textarea")
        el.innerHTML = str
        return el.value
    }
    function imageWorks(url, ms = 3000) {
        return new Promise((resolve) => {
            const img = new Image()
            const timer = setTimeout(() => resolve(false), ms)
            img.onload = () => { clearTimeout(timer); resolve(true) }
            img.onerror = () => { clearTimeout(timer); resolve(false) }
            img.src = url
        })
    }
    useEffect(() => {
        if (loaded) return                          // fetch once; also stops duplicates
        const controller = new AbortController()
        const opts = { signal: controller.signal }

        // API 1: DummyJSON (several categories)
        async function fromDummyJson() {
            const responses = await Promise.all(
                BEAUTY_CATEGORIES.map((c) => fetch(`https://dummyjson.com/products/category/${c}?limit=0`, opts))
            )
            if (responses.some((r) => !r.ok)) throw new Error("DummyJSON failed")
            const results = await Promise.all(responses.map((r) => r.json()))
            return results.flatMap((d) => d.products)
        }

        // API 2: Makeup API
        async function fromMakeupApi() {
            const res = await fetch(MAKEUP_URL, opts)
            if (!res.ok) throw new Error("Makeup API failed")
            const data = await res.json()
            const mapped = data
                .filter((p) => Number(p.price) > 0 && (p.image_link || p.api_featured_image))
                .map(mapMakeup)

            // test all images at the same time, keep only the ones that load
            const ok = await Promise.all(mapped.map((p) => imageWorks(p.thumbnail)))
            return mapped.filter((_, i) => ok[i])
        }

        // takes one item from each list in turn: A, B, A, B...
        function interleave(a, b) {
            const out = []
            for (let i = 0; i < Math.max(a.length, b.length); i++) {
                if (a[i]) out.push(a[i])
                if (b[i]) out.push(b[i])
            }
            return out
        }

        async function fetchProducts() {
            try {
                // allSettled: if one API is down, the other still loads
                const [dummy, makeup] = await Promise.allSettled([fromDummyJson(), fromMakeupApi()])

                // the effect was cleaned up while the requests were running (StrictMode): stop quietly
                if (controller.signal.aborted) return

                const list1 = dummy.status === "fulfilled" ? dummy.value : []
                const list2 = makeup.status === "fulfilled" ? makeup.value : []

                if (list1.length + list2.length === 0) throw new Error("No products")

                const merged = interleave(list1, list2)

                setProducts((prev) => {
                    const have = new Set(prev.map((p) => p.id))
                    return [...prev, ...merged.filter((p) => !have.has(p.id))]   // never add the same id twice
                })
                setError("")
                setLoaded(true)
            } catch (err) {
                if (err.name !== "AbortError" && !controller.signal.aborted) {
                    setError("Failed to load products. Please try again.")
                }
            }
        }
        fetchProducts()

        return () => controller.abort()
    }, [loaded, attempt, setProducts, setLoaded])

    function openDetails(e, item) {
        if (e.target.closest("button, a, input")) return
        setSelectedId(item.id)
    }

    function handleWishlist(item) {
        setToast(isWished(item.id) ? "Removed from wishlist" : "Added to wishlist")
        toggleWishlist(item)
        setPopId(item.id)                       // triggers the pop animation once
        setTimeout(() => setPopId(null), 450)
    }

    function handleAddToCart(item) {
        addToCart(item)
        setToast(`"${item.title}" added to cart`)
    }
    // search + sort (recalculated only when something it uses changes)
    const visible = useMemo(() => {
        const q = query.trim().toLowerCase()
        const list = products.filter((p) => p.title?.toLowerCase().includes(q))

        if (sort === "low") list.sort((a, b) => a.price - b.price)
        else if (sort === "high") list.sort((a, b) => b.price - a.price)
        else if (sort === "az") list.sort((a, b) => a.title.localeCompare(b.title))

        return list
    }, [products, query, sort])

    const { visibleItems, hasMore, sentinelRef, loadingMore } = useInfiniteScroll(visible, PAGE_SIZE, `${query}|${sort}`, 800)

    async function confirmDelete() {
        const item = toDelete
        setToDelete(null)

        try {
            if (!item.isLocal && typeof item.id === "number") {                          // products you added don't exist on DummyJSON
                const res = await fetch(`https://dummyjson.com/products/${item.id}`, { method: "DELETE" })
                if (!res.ok) throw new Error("Delete failed")
            }

            setRemovingId(item.id)                        // plays the fade-out
            setTimeout(() => {
                setProducts((prev) => prev.filter((p) => p.id !== item.id))
                setRemovingId(null)
            }, 300)
        } catch (err) {
            setError("Failed to delete product. Please try again.")
        }
    }

    return (
        <div>
            <Header />

            <div className="container pb-5">
                <div className="text-center mt-3">
                    <h1 className="login-title">Our Products</h1>
                    <p className="login-subtitle mb-0">Browse, edit or remove items from your store</p>
                </div>

                {error && (
                    <Alert variant="danger" dismissible onClose={() => setError("")}>
                        {error}{" "}
                        {!loaded && (
                            <Button size="sm" variant="outline-danger" onClick={() => { setError(""); setAttempt((a) => a + 1) }}>
                                Retry
                            </Button>
                        )}
                    </Alert>
                )}

                {loaded && (
                    <>
                        <div className="toolbar">
                            <div className="search-box">
                                <input
                                    type="search"
                                    className="form-control"
                                    placeholder="Search products..."
                                    aria-label="Search products"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                                <Search className="search-icon" />
                            </div>

                            <select
                                className="form-select sort-select"
                                aria-label="Sort products"
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                            >
                                <option value="default">Sort: Default</option>
                                <option value="low">Price: Low to High</option>
                                <option value="high">Price: High to Low</option>
                                <option value="az">Name: A to Z</option>
                            </select>
                        </div>

                        <p className="result-count text-center">
                            Showing {visible.length} of {products.length} products
                        </p>
                    </>
                )}

                {/* loading skeletons */}
                {!loaded && !error && (
                    <Row xs={1} sm={2} lg={3} xl={4} className="g-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Col key={i}><div className="skeleton-card" /></Col>
                        ))}
                    </Row>
                )}

                {/* product cards */}
                {loaded && visible.length > 0 && (
                    <>
                        <Row xs={1} sm={2} lg={3} xl={4} className="g-4">
                            {visibleItems.map((item, index) => {
                                const qty = cart.find((c) => c.id === item.id)?.qty

                                return (
                                    <Col key={item.id}>
                                        <div
                                            className={`product-card clickable ${removingId === item.id ? "removing" : ""}`}
                                            style={{ "--i": Math.min(index, 12) }}
                                            onClick={(e) => openDetails(e, item)}
                                        >
                                            <div className="product-img-wrap">
                                                {item.isLocal && <span className="new-badge">New</span>}

                                                <img src={item.images?.[0] || item.thumbnail} alt={item.title} loading="lazy" />

                                                <div className="card-actions">
                                                    <Link to={`/update/${item.id}`} className="icon-btn" aria-label={`Edit ${item.title}`}>
                                                        <Pencil />
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        className="icon-btn danger"
                                                        aria-label={`Delete ${item.title}`}
                                                        onClick={() => setToDelete(item)}
                                                    >
                                                        <Trash />
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    className={`wish-btn ${isWished(item.id) ? "active" : ""} ${popId === item.id ? "pop" : ""}`}
                                                    aria-label={isWished(item.id) ? "Remove from wishlist" : "Add to wishlist"}
                                                    aria-pressed={isWished(item.id)}
                                                    onClick={() => handleWishlist(item)}
                                                >
                                                    {isWished(item.id) ? <HeartFill /> : <Heart />}
                                                </button>
                                            </div>

                                            <div className="product-body">
                                                {item.category && <span className="category">{item.category}</span>}
                                                <h3 className="product-title"> <button type="button" className="title-link" onClick={() => setSelectedId(item.id)}>
                                                    {item.title}
                                                </button></h3>
                                                <p className="product-desc">{item.description}</p>

                                                <div className="product-footer">
                                                    <div className="price-row">
                                                        <span className="price">${Number(item.price).toFixed(2)}</span>
                                                        {item.rating > 0 && (
                                                            <span className="rating-pill" title={`${item.rating} out of 5`}>
                                                                <StarFill size={12} />
                                                                {Number(item.rating).toFixed(1)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {qty ? (
                                                        <div className="qty-stepper">
                                                            <button type="button" aria-label="Decrease quantity" onClick={() => updateCartQuantity(item.id, -1)}>
                                                                <Dash />
                                                            </button>
                                                            <span>{qty} in cart</span>
                                                            <button type="button" aria-label="Increase quantity" onClick={() => updateCartQuantity(item.id, 1)}>
                                                                <Plus />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button type="button" className="cart-btn" onClick={() => handleAddToCart(item)}>
                                                            <Handbag /> Add to Cart
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Col>
                                )
                            }
                            )}
                        </Row><br />
                        {loadingMore && (
                            <Row xs={1} sm={2} lg={3} xl={4} className="g-4 mt-1">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Col key={i}><div className="skeleton-card" /></Col>
                                ))}
                            </Row>
                        )}
                        {hasMore ? (
                            <div ref={sentinelRef} className="scroll-sentinel">
                                <Spinner animation="border" size="sm" /> Loading more products...
                            </div>
                        ) : (
                            visible.length > PAGE_SIZE && <p className="scroll-end">You've seen it all ✨</p>
                        )}
                    </>
                )}

                {/* empty state */}
                {loaded && visible.length === 0 && (
                    <div className="empty-state text-center">
                        <BoxSeam size={48} />
                        <h4 className="mt-3">No products found</h4>
                        <p>Try a different search or add a new product.</p>
                        {query && <Button variant="outline-danger" onClick={() => setQuery("")}>Clear search</Button>}
                    </div>
                )}
            </div>

            {/* delete confirmation */}
            <Modal
                show={!!toDelete}
                onHide={() => setToDelete(null)}
                centered
                dialogClassName="del-dialog"
                contentClassName="del-content"
            >
                <Modal.Body className="del-body">
                    <button
                        type="button"
                        className="del-close"
                        aria-label="Close"
                        onClick={() => setToDelete(null)}
                    >
                        ×
                    </button>
                    <div className="del-head">
                        <div className="del-icon"><Trash /></div>
                        <h4>Delete this product?</h4>
                    </div>

                    {shown && (
                        <div className="del-product">
                            <img src={shown.images?.[0] || shown.thumbnail} alt="" />
                            <span>{shown.title}</span>
                        </div>
                    )}

                    <p>It will be removed from your store. This can't be undone.</p>

                    <div className="del-actions">
                        <button type="button" className="del-cancel" onClick={() => setToDelete(null)}>Cancel</button>
                        <button type="button" className="del-confirm" onClick={confirmDelete}>
                            <Trash /> Delete
                        </button>
                    </div>
                </Modal.Body>
            </Modal>

            {selected && <ProductDetails key={selected.id} product={selected} onHide={() => setSelectedId(null)} />}

            <ToastContainer position="bottom-end" className="p-3" style={{ position: "fixed" }}>
                <Toast show={!!toast} onClose={() => setToast("")} delay={1800} autohide bg="dark">
                    <Toast.Body className="text-white">{toast}</Toast.Body>
                </Toast>
            </ToastContainer>
        </div>
    )
}

export default ProductList