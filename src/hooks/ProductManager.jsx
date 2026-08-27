import { useState } from "react";
import {
  useProducts,
  publishProducts,
  uploadProductImage,
} from "../hooks/useProducts";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";


/* =========================================================
   SORTABLE PRODUCT ROW
========================================================= */

function SortableProductRow({
  product,
  index,
  startEdit,
  deleteProduct,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: product.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`admin-product-row ${
        isDragging ? "is-dragging" : ""
      }`}
    >

      {/* POSITION */}

      <div className="product-position">

        <button
          type="button"
          className="drag-handle"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          ⋮⋮
        </button>

        <strong>
          {index + 1}
        </strong>

      </div>


      {/* PRODUCT */}

      <div className="admin-product-name">

        {product.image && (
          <img
            src={product.image}
            alt={product.name}
          />
        )}

        <div>

          <strong>
            {product.name}
          </strong>

          {product.brand && (
            <small>
              {product.brand}
            </small>
          )}

        </div>

      </div>


      {/* CATEGORY */}

      <span>
        {product.category || "Beauty"}
      </span>


      {/* PRICE */}

      <span>
        ৳
        {Number(
          product.price || 0
        ).toLocaleString()}
      </span>


      {/* STOCK */}

      <span>
        {product.stock ?? 0}
      </span>


      {/* ACTIONS */}

      <div className="admin-product-actions">

        <button
          type="button"
          onClick={() =>
            startEdit(product)
          }
        >
          Edit
        </button>

        <button
          type="button"
          className="delete-button"
          onClick={() =>
            deleteProduct(product.id)
          }
        >
          Delete
        </button>

      </div>

    </div>
  );
}


/* =========================================================
   PRODUCT MANAGER
========================================================= */

export default function ProductManager() {

  const [
    products,
    setProducts,
  ] = useProducts();


  const [
    editingProduct,
    setEditingProduct,
  ] = useState(null);


  const [
    isAdding,
    setIsAdding,
  ] = useState(false);


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    publishing,
    setPublishing,
  ] = useState(false);


  const [
    uploadingImage,
    setUploadingImage,
  ] = useState(false);


  /* =======================================================
     DRAG SENSOR
  ======================================================= */

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );


  /* =======================================================
     PUBLISH HELPER
  ======================================================= */

  async function publishUpdatedProducts(
    updatedProducts
  ) {

    try {

      setPublishing(true);

      const result =
        await publishProducts(
          updatedProducts
        );

      if (!result?.success) {

        throw new Error(
          result?.error ||
          "Publishing failed."
        );

      }

      return true;

    } catch (error) {

      console.error(
        "Publish failed:",
        error
      );

      alert(
        "Changes were saved locally, but publishing failed.\n\n" +
        (error?.message ||
          "Unknown error.") +
        "\n\nMake sure the local admin server is running on port 3001."
      );

      return false;

    } finally {

      setPublishing(false);

    }
  }


  /* =======================================================
     ADD PRODUCT
  ======================================================= */

  function startAdd() {

    setEditingProduct({

      id: `product-${Date.now()}`,

      name: "",

      brand: "",

      category: "fragrance",

      subtitle: "",

      tags: [],

      price: 0,

      costPrice: 0,

      oldPrice: null,

      rating: 5,

      reviews: 0,

      stock: 0,

      status: "active",

      description: "",

      image: "",

      alt: "",

      notes: null,

    });

    setIsAdding(true);
  }


  /* =======================================================
     EDIT PRODUCT
  ======================================================= */

  function startEdit(product) {

    setEditingProduct({
      ...product,
    });

    setIsAdding(false);
  }


  /* =======================================================
     INPUT CHANGE
  ======================================================= */

  function handleChange(e) {

    const {
      name,
      value,
    } = e.target;


    setEditingProduct(
      (current) => ({

        ...current,

        [name]:
          name === "price" ||
          name === "stock" ||
          name === "oldPrice" ||
          name === "rating" ||
          name === "reviews"
            ? value === ""
              ? 0
              : Number(value)
            : value,

      })
    );
  }


  /* =======================================================
     SAVE PRODUCT
  ======================================================= */

  async function saveProduct(e) {

    e.preventDefault();


    const name =
      editingProduct.name?.trim() || "";


    const brand =
      editingProduct.brand?.trim() || "";


    if (!name) {

      alert(
        "Please enter a product name."
      );

      return;
    }


    /* DUPLICATE CHECK */

    const duplicate =
      products.find(
        (product) => {

          if (
            product.id ===
            editingProduct.id
          ) {
            return false;
          }


          const sameName =
            product.name
              ?.trim()
              .toLowerCase() ===
            name.toLowerCase();


          const sameBrand =
            (product.brand || "")
              .trim()
              .toLowerCase() ===
            brand.toLowerCase();


          return (
            sameName &&
            sameBrand
          );
        }
      );


    if (duplicate) {

      alert(
        `This product already exists:\n\n${duplicate.name}`
      );

      return;
    }


    /* =====================================================
       PREPARE UPDATED PRODUCT
    ===================================================== */

    const updatedProduct = {

      ...editingProduct,

      name,

      brand,

      image:
        editingProduct.image || "",

      alt:
        editingProduct.alt ||
        editingProduct.image ||
        "",

      status:
        editingProduct.status ||
        "active",

    };


    let updatedProducts;


    /* =====================================================
       ADD
    ===================================================== */

    if (isAdding) {

      updatedProducts = [

        ...products,

        updatedProduct,

      ];

    }


    /* =====================================================
       EDIT
    ===================================================== */

    else {

      updatedProducts =
        products.map(
          (product) =>
            product.id ===
            editingProduct.id
              ? updatedProduct
              : product
        );

    }


    /* =====================================================
       SAVE LOCALLY
    ===================================================== */

    setProducts(
      updatedProducts
    );


    /* =====================================================
       PUBLISH TO SERVER
    ===================================================== */

    const success =
      await publishUpdatedProducts(
        updatedProducts
      );


    if (success) {

      alert(
        isAdding
          ? "Product added and published successfully."
          : "Product updated and published successfully."
      );

    }


    setEditingProduct(null);

    setIsAdding(false);
  }


  /* =======================================================
     DELETE PRODUCT
  ======================================================= */

  async function deleteProduct(id) {

    const product =
      products.find(
        (item) =>
          item.id === id
      );


    if (!product) {
      return;
    }


    const confirmed =
      window.confirm(
        `Delete "${product.name}"?\n\nThis will remove it from the published product catalog.`
      );


    if (!confirmed) {
      return;
    }


    const updatedProducts =
      products.filter(
        (item) =>
          item.id !== id
      );


    /* SAVE LOCALLY */

    setProducts(
      updatedProducts
    );


    /* PUBLISH */

    const success =
      await publishUpdatedProducts(
        updatedProducts
      );


    if (success) {

      alert(
        `"${product.name}" was deleted and published successfully.`
      );

    }

  }


  /* =======================================================
     DRAG END
  ======================================================= */

  async function handleDragEnd(event) {

    const {
      active,
      over,
    } = event;


    if (!over) {
      return;
    }


    if (
      active.id ===
      over.id
    ) {
      return;
    }


    const oldIndex =
      products.findIndex(
        (product) =>
          product.id ===
          active.id
      );


    const newIndex =
      products.findIndex(
        (product) =>
          product.id ===
          over.id
      );


    if (
      oldIndex === -1 ||
      newIndex === -1
    ) {
      return;
    }


    const updatedProducts =
      arrayMove(
        products,
        oldIndex,
        newIndex
      );


    /* SAVE LOCALLY */

    setProducts(
      updatedProducts
    );


    /* PUBLISH */

    await publishUpdatedProducts(
      updatedProducts
    );

  }


  /* =======================================================
     CANCEL
  ======================================================= */

  function cancelEdit() {

    setEditingProduct(null);

    setIsAdding(false);
  }


  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredProducts =
    products.filter(
      (product) => {

        const text = `

          ${product.name || ""}

          ${product.category || ""}

          ${product.brand || ""}

          ${product.id || ""}

        `.toLowerCase();


        return text.includes(
          search.toLowerCase()
        );

      }
    );


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <div className="product-manager">


      {/* =================================================
          TOOLBAR
      ================================================= */}

      <div className="product-manager-toolbar">

        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />


        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >

          {publishing && (
            <span
              style={{
                fontSize: "13px",
                opacity: 0.7,
              }}
            >
              Publishing...
            </span>
          )}


          <button
            type="button"
            className="add-product-button"
            onClick={startAdd}
            disabled={publishing}
          >
            + Add Product
          </button>

        </div>

      </div>


      {/* =================================================
          PRODUCT TABLE
      ================================================= */}

      <DndContext
        sensors={sensors}
        collisionDetection={
          closestCenter
        }
        onDragEnd={
          handleDragEnd
        }
      >

        <div className="admin-product-table">


          {/* HEADER */}

          <div className="admin-table-header">

            <span>
              Position
            </span>

            <span>
              Product
            </span>

            <span>
              Category
            </span>

            <span>
              Price
            </span>

            <span>
              Stock
            </span>

            <span>
              Action
            </span>

          </div>


          {/* EMPTY */}

          {filteredProducts.length ===
          0 ? (

            <div className="admin-empty">

              <div className="admin-empty-icon">
                ✦
              </div>

              <h3>
                No products found
              </h3>

              <p>
                Try another search or
                add a new product.
              </p>

            </div>

          ) : (

            <SortableContext
              items={
                filteredProducts.map(
                  (product) =>
                    product.id
                )
              }
              strategy={
                verticalListSortingStrategy
              }
            >

              {filteredProducts.map(
                (product) => {

                  const originalIndex =
                    products.findIndex(
                      (item) =>
                        item.id ===
                        product.id
                    );


                  return (

                    <SortableProductRow
                      key={
                        product.id
                      }

                      product={
                        product
                      }

                      index={
                        originalIndex
                      }

                      startEdit={
                        startEdit
                      }

                      deleteProduct={
                        deleteProduct
                      }

                    />

                  );

                }
              )}

            </SortableContext>

          )}

        </div>

      </DndContext>


      {/* =================================================
          EDITOR
      ================================================= */}

      {editingProduct && (

        <div className="product-editor-overlay">

          <div className="product-editor">


            {/* HEADER */}

            <div className="product-editor-header">

              <div>

                <p className="admin-eyebrow">

                  {isAdding
                    ? "NEW PRODUCT"
                    : "PRODUCT EDITOR"}

                </p>


                <h2>

                  {isAdding
                    ? "Add Product"
                    : "Edit Product"}

                </h2>

              </div>


              <button
                type="button"
                onClick={
                  cancelEdit
                }
              >
                ×
              </button>

            </div>


            {/* FORM */}

            <form
              onSubmit={
                saveProduct
              }
            >


              {/* NAME */}

              <label>

                Product Name

                <input
                  name="name"
                  value={
                    editingProduct.name ||
                    ""
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Product name"
                />

              </label>


              {/* BRAND / CATEGORY */}

              <div className="editor-grid">

                <label>

                  Brand

                  <input
                    name="brand"
                    value={
                      editingProduct.brand ||
                      ""
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Brand"
                  />

                </label>


                <label>

                  Category

                  <input
                    name="category"
                    value={
                      editingProduct.category ||
                      ""
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Category"
                  />

                </label>

              </div>


              {/* SUBTITLE */}

              <label>

                Subtitle

                <input
                  name="subtitle"
                  value={
                    editingProduct.subtitle ||
                    ""
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Eau de Parfum · 5 ml Decant"
                />

              </label>


              {/* PRICE / OLD PRICE */}

              <div className="editor-grid">

                <label>

                  Price

                  <input
                    type="number"
                    name="price"
                    min="0"
                    value={
                      editingProduct.price ??
                      0
                    }
                    onChange={
                      handleChange
                    }
                  />

                </label>


                <label>

                  Old Price

                  <input
                    type="number"
                    name="oldPrice"
                    min="0"
                    value={
                      editingProduct.oldPrice ??
                      ""
                    }
                    onChange={
                      handleChange
                    }
                  />

                </label>

              </div>


              {/* STOCK / RATING */}

              <div className="editor-grid">

                <label>

                  Stock

                  <input
                    type="number"
                    name="stock"
                    min="0"
                    value={
                      editingProduct.stock ??
                      0
                    }
                    onChange={
                      handleChange
                    }
                  />

                </label>


                <label>

                  Rating

                  <input
                    type="number"
                    name="rating"
                    min="0"
                    max="5"
                    step="0.1"
                    value={
                      editingProduct.rating ??
                      5
                    }
                    onChange={
                      handleChange
                    }
                  />

                </label>

              </div>


              {/* REVIEWS */}

              <label>

                Review Count

                <input
                  type="number"
                  name="reviews"
                  min="0"
                  value={
                    editingProduct.reviews ??
                    0
                  }
                  onChange={
                    handleChange
                  }
                />

              </label>


              {/* STATUS */}

              <label>

                Status

                <select
                  name="status"
                  value={
                    editingProduct.status ||
                    "active"
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>

                </select>

              </label>


              {/* TAGS */}

              <label>

                Tags

                <input
                  name="tags"
                  value={
                    Array.isArray(
                      editingProduct.tags
                    )
                      ? editingProduct.tags.join(
                          ", "
                        )
                      : editingProduct.tags ||
                        ""
                  }
                  onChange={(e) => {

                    const tags =
                      e.target.value
                        .split(",")
                        .map(
                          (tag) =>
                            tag.trim()
                        )
                        .filter(
                          Boolean
                        );


                    setEditingProduct(
                      (current) => ({
                        ...current,
                        tags,
                      })
                    );

                  }}
                  placeholder="Bestseller, Fresh, Limited Stock"
                />

              </label>


              {/* =================================================
                  PRODUCT IMAGE
              ================================================= */}

              <div className="product-image-editor">

                <p className="image-editor-title">
                  Product Image
                </p>


                {/* IMAGE PREVIEW */}

                {editingProduct.image ? (

                  <div className="image-preview">

                    <img
                      src={
                        editingProduct.image
                      }
                      alt={
                        editingProduct.name ||
                        "Product preview"
                      }
                    />

                  </div>

                ) : (

                  <div
                    className="
                      image-preview
                      image-preview-empty
                    "
                  >

                    <span>
                      ✦
                    </span>

                    <p>
                      No image selected
                    </p>

                  </div>

                )}


                {/* UPLOAD */}

                <label
                  className={`image-upload-button ${
                    uploadingImage
                      ? "is-uploading"
                      : ""
                  }`}
                >

                  {uploadingImage
                    ? "⏳ Uploading…"
                    : "📄 Upload from PC / Phone"}

                  <input
                    type="file"
                    accept="
                      image/png,
                      image/jpeg,
                      image/webp
                    "
                    hidden
                    disabled={uploadingImage}
                    onChange={async (e) => {

                      const file =
                        e.target.files?.[0];


                      if (!file) {
                        return;
                      }


                      /*
                       * Reset the input so selecting
                       * the same file again still fires
                       * onChange.
                       */

                      e.target.value = "";


                      const reader =
                        new FileReader();


                      reader.onload = async () => {

                        const dataUrl =
                          reader.result;


                        setUploadingImage(true);


                        try {

                          const result =
                            await uploadProductImage(
                              dataUrl,
                              file.name,
                              file.type
                            );


                          if (!result?.success) {

                            throw new Error(
                              result?.error ||
                              "Image upload failed."
                            );

                          }


                          setEditingProduct(
                            (current) => ({
                              ...current,

                              image:
                                result.url,

                              alt:
                                current.alt ||
                                current.name ||
                                "Product image",

                            })
                          );

                        } catch (error) {

                          console.error(
                            "Image upload failed:",
                            error
                          );

                          alert(
                            "Image upload failed.\n\n" +
                            (error?.message ||
                              "Unknown error.") +
                            "\n\nYou can still paste an image URL below instead."
                          );

                        } finally {

                          setUploadingImage(false);

                        }

                      };


                      reader.readAsDataURL(
                        file
                      );

                    }}
                  />

                </label>


                {/* URL */}

                <label className="image-url-field">

                  <span>
                    Or use an image URL
                  </span>

                  <input
                    name="image"
                    value={
                      editingProduct.image?.startsWith(
                        "data:"
                      )
                        ? ""
                        : editingProduct.image ||
                          ""
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="https://example.com/image.jpg"
                  />

                </label>


                {/* ALT TEXT */}

                <label className="image-url-field">

                  <span>
                    Image Alt Text
                  </span>

                  <input
                    name="alt"
                    value={
                      editingProduct.alt ||
                      ""
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Product image description"
                  />

                </label>


                {/* REMOVE */}

                {editingProduct.image && (

                  <button
                    type="button"
                    className="remove-image-button"
                    onClick={() =>
                      setEditingProduct(
                        (current) => ({
                          ...current,
                          image: "",
                          alt: "",
                        })
                      )
                    }
                  >
                    ✕ Remove Image
                  </button>

                )}

              </div>


              {/* DESCRIPTION */}

              <label>

                Description

                <textarea
                  name="description"
                  value={
                    editingProduct.description ||
                    ""
                  }
                  onChange={
                    handleChange
                  }
                  rows="5"
                  placeholder="Product description"
                />

              </label>


              {/* BUTTONS */}

              <div className="product-editor-actions">

                <button
                  type="button"
                  onClick={
                    cancelEdit
                  }
                  disabled={
                    publishing
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="save-product-button"
                  disabled={
                    publishing
                  }
                >

                  {publishing
                    ? "Publishing..."
                    : isAdding
                      ? "Create & Publish"
                      : "Save & Publish"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  );
}
