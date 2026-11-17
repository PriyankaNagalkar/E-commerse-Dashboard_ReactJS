import { useEffect, useState, useRef } from "react"
import Header from "./Header"
import { useNavigate, useParams, Link } from "react-router-dom"
import { useproducts } from "../Context/ProductContext"
import { XCircleFill, CloudArrowUp, CheckCircle } from 'react-bootstrap-icons'
import { Spinner } from 'react-bootstrap'

const MAX_SIZE = 1024 * 1024      // 1 MB
const MAX_DESC = 200

// a data URL stays valid after you leave the page (a blob URL would not)
function toDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

// 1) wrapper: finds the product from the URL
function UpdateProduct() {
    const { id } = useParams()
    const { products } = useproducts()

    const product = products.find((p) => String(p.id) === id)

    // opened from the header link (/update) with no id
    if (!id) {
        return (
            <div>
                <Header />
                <div className="col-sm-8 col-lg-5 offset-sm-2 offset-lg-3 login-card text-center">
                    <h1 className="login-title">Edit Product</h1>
                    <p className="login-subtitle">Pick a product from the list and click its pencil icon.</p>
                    <Link to="/" className="btn login-btn">Go to products</Link>
                </div>
            </div>
        )
    }

    if (!product) {
        return (
            <div>
                <Header />
                <div className="col-sm-8 col-lg-5 offset-sm-2 offset-lg-3 login-card text-center">
                    <h1 className="login-title">Product not found</h1>
                    <p className="login-subtitle">It may have been deleted.</p>
                    <Link to="/" className="btn login-btn">Back to products</Link>
                </div>
            </div>
        )
    }

    // key resets the form if you switch to a different product
    return <EditForm key={product.id} product={product} />
}

// 2) the form: your existing code, now always receives a real product
function EditForm({ product }) {
    const { setProducts } = useproducts()
    const navigate = useNavigate()
    const fileInput = useRef(null)

    const [name, setName] = useState(product.title ?? "")
    const [file, setFile] = useState(null)
    const [price, setPrice] = useState(String(product.price ?? ""))
    const [description, setDescription] = useState(product.description ?? "")
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState("")
    const [dragging, setDragging] = useState(false)
    const [errors, setErrors] = useState({})

    const currentImage = product.images?.[0] || product.thumbnail || ""
    const shownImage = preview || currentImage

    // enable Save only when something actually changed
    const changed =
        name.trim() !== (product.title ?? "") ||
        Number(price) !== Number(product.price) ||
        description.trim() !== (product.description ?? "").trim() ||
        file !== null

    // preview of a newly chosen image, freed when it changes or the page closes
    useEffect(() => {
        if (!(file instanceof Blob)) {
            setPreview("")
            return
        }
        const url = URL.createObjectURL(file)
        setPreview(url)
        return () => URL.revokeObjectURL(url)
    }, [file])

    function chooseFile(selected) {
        if (!selected) return
        if (!selected.type.startsWith("image/")) {
            setErrors((prev) => ({ ...prev, file: "Please choose an image file" }))
            return
        }
        if (selected.size > MAX_SIZE) {
            setErrors((prev) => ({ ...prev, file: "Image must be under 1 MB" }))
            return
        }
        setErrors((prev) => ({ ...prev, file: undefined }))
        setFile(selected)
    }

    function undoNewImage() {
        setFile(null)
        if (fileInput.current) fileInput.current.value = ""
    }

    function validateForm() {
        const newErrors = {}
        if (!name.trim()) newErrors.name = "Product name is required"
        else if (name.trim().length < 3) newErrors.name = "Name must be at least 3 characters"

        if (!price) newErrors.price = "Price is required"
        else if (isNaN(Number(price)) || Number(price) <= 0) newErrors.price = "Enter a valid price greater than 0"

        // an image is only required if the product has none at all
        if (!file && !currentImage) newErrors.file = "Please upload a product image"

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!validateForm()) return

        setLoading(true)
        try {
            const images = file ? [await toDataUrl(file)] : product.images

            setProducts((prev) =>
                prev.map((p) =>
                    p.id === product.id
                        ? { ...p, title: name.trim(), price: Number(price), description: description.trim(), images }
                        : p
                )
            )
            navigate("/")
        } catch (err) {
            alert("Failed to update product")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <Header />
            <div className="col-sm-8 col-lg-5 offset-sm-2 offset-lg-3 login-card">
                <h1 className="login-title">Edit Product</h1>
                <p className="login-subtitle">Change the details below and save</p>
                <form onSubmit={handleSubmit} noValidate className="text-start">
                    <div className="field">
                        <input type="text" className="form-control" placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} />
                        {errors.name && <div className="text-danger mt-1 error-msg">{errors.name}</div>}
                    </div>

                    <div className="field">
                        <input type="number" min="0" className="form-control" placeholder="Price ($)" value={price} onChange={(e) => setPrice(e.target.value)} />
                        {errors.price && <div className="text-danger mt-1 error-msg">{errors.price}</div>}
                    </div>

                    <div className="field">
                        <textarea className="form-control" rows={2} maxLength={MAX_DESC} value={description} placeholder="Description" onChange={(e) => setDescription(e.target.value)} />
                        <small className="text-muted d-block text-end">
                            {description.length}/{MAX_DESC}
                        </small>
                    </div>
                    <div className="field" style={{ "--i": 4 }}>
                        <div
                            className={`drop-zone ${dragging ? "dragging" : ""} ${errors.file ? "has-error" : ""}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => fileInput.current.click()}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault()
                                    fileInput.current.click()
                                }
                            }}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault()
                                setDragging(false)
                                chooseFile(e.dataTransfer.files[0])
                            }}
                        >
                            {shownImage ? (
                                <div className="preview-wrap">
                                    <img src={shownImage} alt="Product" className="preview-img" />
                                    {preview && (
                                        <button
                                            type="button"
                                            className="remove-img"
                                            aria-label="Use the original image"
                                            onClick={(e) => { e.stopPropagation(); undoNewImage() }}
                                        >
                                            <XCircleFill size={22} />
                                        </button>
                                    )}
                                    <small className="d-block mt-2">
                                        {preview ? "New image selected. Click to change" : "Click to change image"}
                                    </small>
                                </div>
                            ) : (
                                <>
                                    <CloudArrowUp size={36} />
                                    <p className="mb-0">Drag and drop an image or <span>browse</span></p>
                                    <small>PNG or JPG, up to 1 MB</small>
                                </>
                            )}
                        </div>
                        <input ref={fileInput} type="file" hidden className="form-control" accept="image/*" placeholder="File" onChange={(e) => {
                            const selected = e.target.files[0]
                            e.target.value = ""            // lets the same file be chosen again
                            chooseFile(selected)           // same validation as drag and drop
                        }} />
                        {errors.file && <div className="text-danger mt-1 error-msg">{errors.file}</div>}
                    </div>

                    <button type="submit" className="btn login-btn mt-2" disabled={loading || !changed}>
                        {loading ? (<>
                            <Spinner as="span" animation="border" size="sm" className="me-2" />
                            Saving...
                        </>) :
                            (<>
                                <CheckCircle size={20} className="me-2" />
                                Save Changes
                            </>
                            )}
                    </button>
                    <div className="text-center mt-2">
                        <Link to="/">Cancel</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default UpdateProduct