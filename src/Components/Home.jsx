
import { Link } from "react-router-dom";
import { ArrowRight, Stars } from "react-bootstrap-icons";
import { useLocation } from "react-router-dom"
import { Toast, ToastContainer } from "react-bootstrap"
import { useState } from "react";

function Home() {
    const { state } = useLocation()
    const [showBye, setShowBye] = useState(!!state?.loggedOut)
    return (
        <div className="home-page">
            <section className="hero-section">
                <div className="hero-content">
                    <span className="hero-label">
                        <Stars size={16} /> BEAUTY STARTS HERE
                    </span>

                    <h1>
                        Welcome to <span>GlowStore</span>
                    </h1>

                    <h2>Discover Your Natural Glow</h2>

                    <p>
                        Explore beauty essentials, discover your favorites
                        and make every day a little more beautiful.
                    </p>

                    <div className="hero-buttons">
                        <Link to="/register" className="hero-btn secondary-btn">
                            Join GlowStore <ArrowRight size={18} />
                        </Link>
                    </div>

                    <div className="hero-stats">
                        <div>
                            <strong>50+</strong>
                            <span>Beauty Products</span>
                        </div>
                        <div>
                            <strong>Everyday</strong>
                            <span>New Discoveries</span>
                        </div>
                    </div>
                </div>

                <div className="hero-decoration">
                    <div className="floating-circle circle-one">✦</div>
                    <div className="floating-circle circle-two">♡</div>
                    <div className="floating-circle circle-three">✧</div>
                </div>
            </section>
            <ToastContainer className="toast-pos">
                <Toast show={showBye} onClose={() => setShowBye(false)} delay={3000} autohide bg="dark">
                    <Toast.Body className="text-white">You've been logged out. See you soon! 👋</Toast.Body>
                </Toast>
            </ToastContainer>
        </div>
    );
}

export default Home;
