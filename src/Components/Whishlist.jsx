import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Modal, Spinner, Toast, ToastContainer } from "react-bootstrap";
import {
  X, Handbag, HeartFill, Heart, StarFill, Cart3, BagCheck,
  CheckCircleFill, HeartbreakFill, Trash,                                   // NEW
} from "react-bootstrap-icons";
import { useproducts } from "../Context/ProductContext";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import Header from "./Header";
import ProductDetails from "./ProductDetails";
import RecommendedProducts from "./RecommendedProducts";

const PAGE_SIZE = 8;

// NEW: a copy of the product image flies to the cart icon in the header
function flyToCart(imgEl) {
  const target = document.querySelector('.icon-link[href="/cart"]');
  if (!imgEl || !target) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const from = imgEl.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const size = 72;

  const startX = from.left + from.width / 2 - size / 2;
  const startY = from.top + from.height / 2 - size / 2;
  const dx = to.left + to.width / 2 - size / 2 - startX;
  const dy = to.top + to.height / 2 - size / 2 - startY;

  const fly = document.createElement("img");
  fly.src = imgEl.currentSrc || imgEl.src;
  Object.assign(fly.style, {
    position: "fixed",
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "contain",
    padding: "4px",
    borderRadius: "14px",
    background: "#fff",
    boxShadow: "0 10px 24px rgba(120, 20, 60, 0.35)",
    zIndex: 3000,
    pointerEvents: "none",
  });
  document.body.appendChild(fly);

  const flight = fly.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 70}px) scale(0.7)`, opacity: 1, offset: 0.55 },  // arcs upward first
      { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0.5 },
    ],
    { duration: 750, easing: "ease-in-out" }
  );

  flight.onfinish = () => {
    fly.remove();
    target.animate(                                   // the cart icon bumps when the image lands
      [{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }],
      { duration: 350, easing: "ease-out" }
    );
  };
}

function Wishlist() {
  const { cart, wishlist, products, setWishlist, toggleWishlist, addToCart, isInCart } = useproducts();
  const [category, setCategory] = useState("all");
  const [removingId, setRemovingId] = useState(null);
  const [breakingId, setBreakingId] = useState(null);   // NEW: X turns into a broken heart
  const [addedId, setAddedId] = useState(null);         // NEW: button shows the green "Added" state
  const [toast, setToast] = useState(null);
  const [showClear, setShowClear] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const clearSnap = useRef([]);
  if (showClear) clearSnap.current = wishlist;
  const snap = clearSnap.current;

  // prefer the live product, so edits show up; fall back to the saved copy
  const selected = products.find((p) => p.id === selectedId) || wishlist.find((p) => p.id === selectedId);

  const totalValue = wishlist.reduce((sum, p) => sum + Number(p.price || 0), 0);

  // category chips are built from what is actually in the wishlist
  const categories = useMemo(
    () => ["all", ...new Set(wishlist.map((p) => p.category).filter(Boolean))],
    [wishlist]
  );
  const activeCategory = categories.includes(category) ? category : "all";

  const filtered = useMemo(
    () => (activeCategory === "all" ? wishlist : wishlist.filter((p) => p.category === activeCategory)),
    [wishlist, activeCategory]
  );

  const { visibleItems, hasMore, loadingMore, sentinelRef } =
    useInfiniteScroll(filtered, PAGE_SIZE, activeCategory, 0);

  // play the exit animation first, then remove
  function removeWithAnimation(item, toastData = { msg: "Removed from wishlist", undo: item }) {
    setRemovingId(item.id);
    setTimeout(() => {
      toggleWishlist(item);
      setRemovingId(null);
      setBreakingId(null);
      setAddedId(null);
      setToast(toastData);
    }, 300);
  }

  // NEW: X button: broken heart plays for a moment, then the card leaves
  function handleRemove(item) {
    if (breakingId === item.id) return;
    setBreakingId(item.id);
    setTimeout(() => removeWithAnimation(item), 450);
  }

  // NEW: image flies to the cart, button turns green, then the card leaves
  function moveToBag(item, e) {
    if (addedId === item.id) return;
    const img = e.currentTarget.closest(".wl-card")?.querySelector(".wl-img img");

    flyToCart(img);
    addToCart(item);
    setAddedId(item.id);

    setTimeout(() => {
      removeWithAnimation(item, { msg: `"${item.title}" moved to bag`, link: true });
    }, 600);
  }

  function moveAllToBag() {
    wishlist.filter((p) => !isInCart(p.id)).forEach(addToCart);
    setWishlist([]);
    setToast({ msg: "All items moved to bag", link: true });
  }

  function clearAll() {
    setWishlist([]);
    setShowClear(false);
  }

  return (
    <>
      <Header />

      <div className="container py-4">
        <div className="text-center mt-3">
          <h1 className="login-title">
            <HeartFill className="wl-title-heart" /> My Wishlist
          </h1>
          <p className="login-subtitle mb-0">
            {wishlist.length > 0
              ? `${wishlist.length} saved item${wishlist.length > 1 ? "s" : ""} · worth ₹${totalValue.toFixed(2)}`
              : "Save the things you love"}
          </p>
        </div>

        {wishlist.length === 0 ? (
          <div className="wl-empty text-center">
            <div className="wl-empty-icon"><Heart /></div>
            <h4 className="mt-3">Your wishlist is empty</h4>
            <p>Add products by clicking the heart icon.</p>
            <Link to="/" className="wl-btn wl-btn-inline">Continue shopping</Link>
          </div>
        ) : (
          <>
            {/* toolbar: category chips + bulk actions */}
            <div className="wl-toolbar">
              <div className="wl-chips">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`wl-chip ${activeCategory === c ? "active" : ""}`}
                    onClick={() => setCategory(c)}
                  >
                    {c === "all" ? "All" : c}
                  </button>
                ))}
              </div>

              <div className="wl-actions">
                <button type="button" className="wl-link" onClick={() => setShowClear(true)}>
                  Clear all
                </button>
                <Button className="wl-move-all" onClick={moveAllToBag}>
                  <BagCheck /> Move all to bag
                </Button>
              </div>
            </div>

            {/* cards */}
            <div className="row g-3 g-md-4">
              {visibleItems.map((item, index) => {
                const discount = Math.round(item.discountPercentage || 0);
                const original = discount > 0 ? item.price / (1 - discount / 100) : null;

                return (
                  <div className="col-6 col-md-4 col-lg-3 col-xl-custom" key={item.id}>
                    <div
                      className={`wl-card ${removingId === item.id ? "leaving" : ""}`}
                      style={{ "--i": Math.min(index, 12) }}
                      onClick={(e) => { if (!e.target.closest("button, a")) setSelectedId(item.id); }}
                    >
                      <div className="wl-img">
                        <button
                          type="button"
                          className={`wl-remove ${breakingId === item.id ? "breaking" : ""}`}
                          aria-label={`Remove ${item.title} from wishlist`}
                          onClick={() => handleRemove(item)}
                        >
                          {breakingId === item.id ? <HeartbreakFill /> : <X />}
                        </button>

                        {discount > 0 && <span className="wl-discount">-{discount}%</span>}

                        <img src={item.images?.[0] || item.thumbnail} alt={item.title} loading="lazy" />

                        {item.rating > 0 && (
                          <span className="wl-rating">
                            <StarFill size={11} /> {Number(item.rating).toFixed(1)}
                          </span>
                        )}
                      </div>

                      <div className="wl-body">
                        {item.category && <span className="wl-category">{item.category}</span>}
                        <h3 className="wl-title">{item.title}</h3>

                        <div className="wl-price">
                          <span className="now">₹{Number(item.price).toFixed(2)}</span>
                          {original && <span className="was">${original.toFixed(2)}</span>}
                        </div>

                        {item.stock > 0 && item.stock < 10 && <span className="wl-low">Only {item.stock} left</span>}

                        {item.colors?.length > 0 && (
                          <div className="card-dots">
                            {item.colors.slice(0, 5).map((c, i) => <span key={i} style={{ background: c.hex }} />)}
                            {item.colors.length > 5 && <small>+{item.colors.length - 5}</small>}
                          </div>
                        )}
                      </div>

                      {/* NEW: three states: added (green) / go to cart / move to bag */}
                      {addedId === item.id ? (
                        <button type="button" className="wl-btn added" tabIndex={-1}>
                          <CheckCircleFill /> Added to bag
                        </button>
                      ) : isInCart(item.id) ? (
                        <Link to="/cart" className="wl-btn outline">
                          <Cart3 /> Go to Cart
                        </Link>
                      ) : (
                        <button type="button" className="wl-btn" onClick={(e) => moveToBag(item, e)}>
                          <Handbag /> Move to Bag
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {loadingMore && (
              <div className="row g-3 g-md-4 mt-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div className="col-6 col-md-4 col-lg-3" key={i}>
                    <div className="skeleton-card" />
                  </div>
                ))}
              </div>
            )}

            {hasMore && (
              <div ref={sentinelRef} className="scroll-sentinel">
                <Spinner animation="border" size="sm" /> Loading more...
              </div>
            )}
          </>
        )}
        <RecommendedProducts
          basedOn={wishlist}
          exclude={[...wishlist, ...cart].map((i) => i.id)}
          onOpen={setSelectedId}
        />
      </div>

      {/* clear all confirmation */}
      {/* clear all confirmation */}
      <Modal
        show={showClear}
        onHide={() => setShowClear(false)}
        centered
        dialogClassName="del-dialog"
        contentClassName="del-content"
      >
        <Modal.Body className="del-body">
          <button type="button" className="del-close" aria-label="Close" onClick={() => setShowClear(false)}>
            ×
          </button>

          <div className="del-head">
            <div className="del-icon"><Trash /></div>
            <h4>Clear your wishlist?</h4>
          </div>

          <div className="del-thumbs">
            {snap.slice(0, 5).map((p) => (
              <img key={p.id} src={p.images?.[0] || p.thumbnail} alt="" title={p.title} />
            ))}
            {snap.length > 5 && <span className="more">+{snap.length - 5}</span>}
          </div>

          <p>
            All {snap.length} saved item{snap.length !== 1 ? "s" : ""} will be removed from your wishlist.
          </p>

          <div className="del-actions">
            <button type="button" className="del-cancel" onClick={() => setShowClear(false)}>Cancel</button>
            <button type="button" className="del-confirm" onClick={clearAll}>
              <Trash /> Clear all
            </button>
          </div>
        </Modal.Body>
      </Modal>

      {selected && <ProductDetails key={selected.id} product={selected} onHide={() => setSelectedId(null)} />}

      {/* toast (wrapped in ToastContainer so it uses the .toast-pos position) */}
      <ToastContainer className="toast-pos">
        <Toast show={!!toast} onClose={() => setToast(null)} delay={4000} autohide bg="dark">
          <Toast.Body className="text-white d-flex justify-content-between align-items-center gap-3">
            <span>{toast?.msg}</span>
            {toast?.undo && (
              <button
                type="button"
                className="wl-toast-link"
                onClick={() => { toggleWishlist(toast.undo); setToast(null); }}
              >
                Undo
              </button>
            )}
            {toast?.link && <Link to="/cart" className="wl-toast-link">View cart</Link>}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
}

export default Wishlist;