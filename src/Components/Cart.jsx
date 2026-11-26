import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Modal, Spinner, Toast, ToastContainer } from "react-bootstrap";
import {
  Dash, Plus, Trash, Heart, Truck, TagFill, X, ShieldCheck, Cart3,
} from "react-bootstrap-icons";
import { useproducts } from "../Context/ProductContext";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { useCountUp } from "../hooks/useCountUp";
import Header from "./Header";
import ProductDetails from "./ProductDetails";
import RecommendedProducts from "./RecommendedProducts";
import { calcTotals } from "../utils/pricing";

const COUPONS = { GLOW10: 10 };      // code -> percent off
const PAGE_SIZE = 10;

function Cart() {
  const {
    cart, wishlist, cartCount, updateCartQuantity, removeFromCart,
    toggleWishlist, isWished, addToCart, products,
  } = useproducts();

  const [removingId, setRemovingId] = useState(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null);          // { code, percent }
  const [couponError, setCouponError] = useState("");
  const [showClear, setShowClear] = useState(false);
  const [unselected, setUnselected] = useState(() => new Set());
  const [toast, setToast] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const selected = products.find((p) => p.id === selectedId) || cart.find((p) => p.id === selectedId);

  const { visibleItems, hasMore, loadingMore, sentinelRef } =
    useInfiniteScroll(cart, PAGE_SIZE, "", 0);

  const navigate = useNavigate();

  // every total is calculated from the FULL cart, not from visibleItems
  const selectedItems = useMemo(
    () => cart.filter((i) => !unselected.has(i.id)),
    [cart, unselected]
  );
  const selectedQty = selectedItems.reduce((sum, i) => sum + i.quantity, 0);
  const allSelected = cart.length > 0 && selectedItems.length === cart.length;
  const noneSelected = selectedItems.length === 0;

  // every total is calculated from the SELECTED items only
  const t = useMemo(() => calcTotals(selectedItems, coupon?.percent || 0), [selectedItems, coupon]);

  const animatedTotal = useCountUp(t.total);

  function toggleItem(id) {
    setUnselected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // select all / unselect all (uses the FULL cart, not just the scrolled-in items)
  function toggleAll() {
    setUnselected(allSelected ? new Set(cart.map((i) => i.id)) : new Set());
  }

  function removeSelected() {
    selectedItems.forEach((i) => removeFromCart(i.id));
    setShowClear(false);
  }

  // takes the item (not the id), so Undo can restore it
  function removeWithAnimation(item, toastData = { msg: `"${item.title}" removed`, undo: item }) {
    setRemovingId(item.id);
    setTimeout(() => {
      removeFromCart(item.id);
      setRemovingId(null);
      setToast(toastData);
    }, 300);
  }

  function undoRemove(item) {
    addToCart(item);                                          // comes back with quantity 1...
    if (item.quantity > 1) updateCartQuantity(item.id, item.quantity - 1);   // ...then restores the old amount
    setToast(null);
  }

  function saveForLater(item) {
    if (!isWished(item.id)) toggleWishlist(item);
    removeWithAnimation(item, { msg: "Saved to your wishlist" });
  }
  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (COUPONS[code]) {
      setCoupon({ code, percent: COUPONS[code] });
      setCouponError("");
      setCouponInput("");
    } else {
      setCouponError("Invalid coupon code");
    }
  }

  // function closeOrder() {
  //   setOrdered(false);
  // }


  function goToCheckout() {
    navigate("/checkout", { state: { ids: selectedItems.map((i) => i.id), coupon } });
  }
  const arrivalDate = (from = new Date(), days = 5) => {
    const d = new Date(from);
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  };

  return (
    <>
      <Header />

      <div className="container py-4">
        <div className="text-center mt-3 mb-4">
          <h1 className="login-title">My Cart</h1>
          <p className="login-subtitle mb-0">
            {cart.length > 0
              ? `${cartCount} item${cartCount > 1 ? "s" : ""} in your cart`
              : "Your bag is waiting to be filled"}
          </p>
        </div>

        {cart.length === 0 ? (
          <div className="wl-empty text-center">
            <div className="wl-empty-icon"><Cart3 /></div>
            <h4 className="mt-3">Your cart is empty</h4>
            <p>Looks like you haven't added anything yet.</p>
            <Link to="/" className="wl-btn wl-btn-inline">Start shopping</Link>
          </div>
        ) : (
          <div className="row g-4">
            {/* LEFT: items */}
            <div className="col-lg-8">
              <div className={`ct-banner ${t.remaining === 0 && !noneSelected ? "unlocked" : ""}`}>
                <div className="ct-banner-text">
                  <Truck />
                  {t.remaining > 0 ? (
                    <span>Add <strong>₹{t.remaining.toFixed(2)}</strong> more for <strong>free delivery</strong></span>
                  ) : (
                    <span>🎉 You've unlocked <strong>free delivery</strong></span>
                  )}
                </div>
                <div className="ct-track"><div className="ct-fill" style={{ width: `${t.progress}%` }} /></div>
              </div>

              <div className="ct-head">
                <label className="ct-check-all">
                  <input
                    type="checkbox"
                    className="ct-check"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = !allSelected && !noneSelected; }}
                    onChange={toggleAll}
                  />
                  <span>Select all ({selectedItems.length}/{cart.length})</span>
                </label>

                {!noneSelected && (
                  <button type="button" className="wl-link" onClick={() => setShowClear(true)}>
                    Remove selected
                  </button>
                )}
              </div>

              {visibleItems.map((item, index) => {
                const price = Number(item.price || 0);
                const discount = Math.round(item.discountPercentage || 0);
                const original = discount > 0 && discount < 100 ? price / (1 - discount / 100) : null;
                const maxed = item.stock && item.quantity >= item.stock;
                const checked = !unselected.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`ct-item ${checked ? "" : "unchecked"} ${removingId === item.id ? "leaving" : ""}`}
                    style={{ "--i": Math.min(index, 10) }}
                    onClick={(e) => { if (!e.target.closest("button, a, input, label")) setSelectedId(item.id); }}
                  >
                    <input
                      type="checkbox"
                      className="ct-check"
                      checked={checked}
                      onChange={() => toggleItem(item.id)}
                      aria-label={`Select ${item.title}`}
                    />
                    <div className="ct-img">
                      <img src={item.images?.[0] || item.thumbnail} alt={item.title} loading="lazy" />
                    </div>

                    <div className="ct-info">
                      {item.category && <span className="wl-category">{item.category}</span>}
                      <h3 className="ct-title">{item.title}</h3>
                      {item.selectedColor && (
                        <small className="ct-shade">
                          <span className="dot" style={{ background: item.selectedColor.hex }} />
                          {item.selectedColor.name}
                        </small>
                      )}

                      <div className="ct-price">
                        <span className="now">₹{price.toFixed(2)}</span>
                        {original && <span className="was">₹{original.toFixed(2)}</span>}
                        {discount > 0 && <span className="off">{discount}% off</span>}
                      </div>

                      <div className="ct-stepper">
                        <button
                          type="button"
                          aria-label={item.quantity === 1 ? "Remove item" : "Decrease quantity"}
                          onClick={() =>
                            item.quantity === 1 ? removeWithAnimation(item) : updateCartQuantity(item.id, -1)
                          }
                        >
                          {item.quantity === 1 ? <Trash /> : <Dash />}
                        </button>
                        <span key={item.quantity} className="qty">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={!!maxed}
                          onClick={() => updateCartQuantity(item.id, 1)}
                        >
                          <Plus />
                        </button>
                      </div>
                      {maxed && <small className="ct-warn">Only {item.stock} in stock</small>}
                    </div>

                    <div className="ct-side">
                      <div className="ct-line">₹{(price * item.quantity).toFixed(2)}</div>
                      <div className="ct-links">
                        <button type="button" onClick={() => saveForLater(item)}>
                          <Heart /> Save for later
                        </button>
                        <button type="button" className="danger" onClick={() => removeWithAnimation(item)}>
                          <X /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {loadingMore && <div className="skeleton-card" style={{ height: 140 }} />}
              {hasMore && (
                <div ref={sentinelRef} className="scroll-sentinel">
                  <Spinner animation="border" size="sm" /> Loading more...
                </div>
              )}
            </div>

            {/* RIGHT: price details */}
            <div className="col-lg-4">
              <aside className="ct-summary">
                <h5 className="ct-summary-title">Price Details</h5>

                <div className="ct-coupon">
                  {coupon ? (
                    <div className="ct-coupon-applied">
                      <span><TagFill /> <strong>{coupon.code}</strong> applied</span>
                      <button type="button" onClick={() => setCoupon(null)}>Remove</button>
                    </div>
                  ) : (
                    <>
                      <div className="ct-coupon-input">
                        <input
                          value={couponInput}
                          placeholder="Coupon code"
                          aria-label="Coupon code"
                          onChange={(e) => { setCouponInput(e.target.value); setCouponError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                        />
                        <button type="button" onClick={applyCoupon} disabled={!couponInput.trim()}>Apply</button>
                      </div>   {/* the input row ends HERE */}

                      {couponError && <small className="ct-warn">{couponError}</small>}

                      {/* ⬇️ the hint goes AFTER the row, not inside it */}
                      <button
                        type="button"
                        className="ct-coupon-hint"
                        onClick={() => setCoupon({ code: "GLOW10", percent: COUPONS.GLOW10 })}
                      >
                        🏷️ Use <strong>GLOW10</strong> for 10% off
                      </button>
                    </>
                  )}
                </div>
                <div className="ct-row"><span>Price ({selectedQty} item{selectedQty !== 1 ? "s" : ""})</span><span>₹{t.mrp.toFixed(2)}</span></div>
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

                <div className="ct-row ct-total"><span>Total</span><span>₹{animatedTotal.toFixed(2)}</span></div>

                {t.saved > 0.005 && (
                  <div className="ct-save">You'll save ₹{t.saved.toFixed(2)} on this order 🎉</div>
                )}

                <button type="button" className="ct-order-btn" disabled={noneSelected} onClick={goToCheckout}>
                  {noneSelected ? "Select items to order" : `Proceed to Checkout (${selectedQty})`}
                </button>
                <p className="ct-eta"><Truck /> Delivery by <strong>{arrivalDate()}</strong></p>
                <p className="ct-secure"><ShieldCheck /> Safe and secure payments</p>
              </aside>
            </div>
          </div>
        )}
        <RecommendedProducts
          basedOn={cart}
          exclude={[...wishlist, ...cart].map((i) => i.id)}
          onOpen={setSelectedId}
        />
      </div>

      {/* clear cart */}
      <Modal show={showClear && !noneSelected} onHide={() => setShowClear(false)} centered>
        <Modal.Header closeButton><Modal.Title>Remove selected items?</Modal.Title></Modal.Header>
        <Modal.Body>
          {selectedItems.length} selected product{selectedItems.length > 1 ? "s" : ""} will be removed from your cart.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowClear(false)}>Cancel</Button>
          <Button variant="danger" onClick={removeSelected}>Remove</Button>
        </Modal.Footer>
      </Modal>

      {/* order success */}
      {/* <Modal show={ordered} onHide={closeOrder} centered>
        <Modal.Body className="ct-success text-center">
          <CheckCircleFill className="ct-success-icon" />
          <h4>Order placed!</h4>

          {lastOrder && (
            <div className="ct-order-info">
              <p>Order ID <strong>{lastOrder.id}</strong></p>
              <p>Total <strong>${lastOrder.total.toFixed(2)}</strong></p>
              <p>Arriving by <strong>{arrivalDate(lastOrder.date)}</strong></p>
            </div>
          )}

          <Link to="/" className="wl-btn wl-btn-inline" onClick={closeOrder}>Continue shopping</Link>
          <Link to="/orders" className="wl-link d-block mt-3" onClick={closeOrder}>View my orders</Link>
        </Modal.Body>
      </Modal> */}

      {selected && <ProductDetails key={selected.id} product={selected} onHide={() => setSelectedId(null)} />}
      <ToastContainer className="toast-pos">
        <Toast show={!!toast} onClose={() => setToast(null)} delay={4000} autohide bg="dark">
          <Toast.Body className="text-white d-flex justify-content-between align-items-center gap-3">
            <span>{toast?.msg}</span>
            {toast?.undo && (
              <button type="button" className="wl-toast-link" onClick={() => undoRemove(toast.undo)}>Undo</button>
            )}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
}

export default Cart;