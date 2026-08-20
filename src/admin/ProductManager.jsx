import { useState } from "react";
import { useProducts } from "../hooks/useProducts";

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

      {/* POSITION / DRAG HANDLE */}

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

  const [products, setProducts] =
    useProducts();

  const [editingProduct, setEditingProduct] =
    useState(null);

  const [isAdding, setIsAdding] =
    useState(false);

  const [search, setSearch] =
    useState("");


  /* DRAG SENSOR */

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );


  /* =======================================================
     ADD PRODUCT
  ======================================================= */

  function startAdd() {

    setEditingProduct({
      id: `product-${Date.now()}`,
      name: "",
      brand: "",
      category: "",
      price: 0,
      stock: 0,
      status: "active",
      description: "",
      image: "",
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

    setEditingProduct((current) => ({
      ...current,

      [name]:
        name === "price" ||
        name === "stock"
          ? Number(value)
          : value,
    }));
  }


  /* =======================================================
     SAVE PRODUCT
  ======================================================= */

  function saveProduct(e) {

    e.preventDefault();

    const name =
      editingProduct.name.trim();

    const brand =
      editingProduct.brand.trim();


    if (!name) {

      alert(
        "Please enter a product name."
      );

      return;
    }


    /* DUPLICATE CHECK */

    const duplicate =
      products.find((product) => {

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
      });


    if (duplicate) {

      alert(
        `This product already exists:\n\n${duplicate.name}`
      );

      return;
    }


    /* ADD */

    if (isAdding) {

      setProducts((current) => [
        ...current,

        {
          ...editingProduct,
          name,
          brand,
        },
      ]);
    }


    /* EDIT */

    else {

      setProducts((current) =>
        current.map(
          (product) =>
            product.id ===
            editingProduct.id
              ? {
                  ...editingProduct,
                  name,
                  brand,
                }
              : product
        )
      );
    }


    setEditingProduct(null);

    setIsAdding(false);
  }


  /* =======================================================
     DELETE
  ======================================================= */

  function deleteProduct(id) {

    const product =
      products.find(
        (item) =>
          item.id === id
      );

    if (!product) return;


    const confirmed =
      window.confirm(
        `Delete "${product.name}"?`
      );


    if (!confirmed) return;


    setProducts((current) =>
      current.filter(
        (item) =>
          item.id !== id
      )
    );
  }


  /* =======================================================
     DRAG END
  ======================================================= */

  function handleDragEnd(event) {

    const {
      active,
      over,
    } = event;


    if (!over) return;


    if (
      active.id ===
      over.id
    ) {
      return;
    }


    setProducts((current) => {

      const oldIndex =
        current.findIndex(
          (product) =>
            product.id ===
            active.id
        );


      const newIndex =
        current.findIndex(
          (product) =>
            product.id ===
            over.id
        );


      if (
        oldIndex === -1 ||
        newIndex === -1
      ) {
        return current;
      }


      return arrayMove(
        current,
        oldIndex,
        newIndex
      );
    });
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


        <button
          type="button"
          className="add-product-button"
          onClick={startAdd}
        >
          + Add Product
        </button>

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
                      key={product.id}
                      product={product}
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


              {/* PRICE / STOCK */}

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

              </div>


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


             {/* PRODUCT IMAGE */}

<div className="product-image-editor">

  <p className="image-editor-title">
    Product Image
  </p>

  {/* IMAGE PREVIEW */}

  {editingProduct.image ? (
    <div className="image-preview">

      <img
        src={editingProduct.image}
        alt="Product preview"
      />

    </div>
  ) : (
    <div className="image-preview image-preview-empty">

      <span>✦</span>

      <p>
        No image selected
      </p>

    </div>
  )}


  {/* UPLOAD FROM PC */}

  <label className="image-upload-button">

    📁 Upload from PC

    <input
      type="file"
      accept="image/png,image/jpeg,image/webp"
      hidden
      onChange={(e) => {

        const file =
          e.target.files?.[0];

        if (!file) return;

        const reader =
          new FileReader();

        reader.onload = () => {

          setEditingProduct(
            (current) => ({
              ...current,
              image: reader.result,
            })
          );

        };

        reader.readAsDataURL(file);

      }}
    />

  </label>


  {/* IMAGE URL */}

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
          : editingProduct.image || ""
      }
      onChange={handleChange}
      placeholder="https://example.com/image.jpg"
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
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="save-product-button"
                >

                  {isAdding
                    ? "Create Product"
                    : "Save Changes"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}