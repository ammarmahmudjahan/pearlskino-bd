import React, { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function OrderStatus() {
  const [params] = useSearchParams();
  const status = params.get("payment") || "success";
  const { clearCart } = useCart();

  useEffect(() => {
    if (status === "success") clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const copy = {
    success: {
      icon: <CheckCircle2 size={40} />,
      title: "Order confirmed.",
      body: "Thank you — your payment went through and your order is now being prepared. A confirmation will be sent to the contact details you provided.",
    },
    failed: {
      icon: <XCircle size={40} />,
      title: "Payment failed.",
      body: "Your payment didn't go through and you haven't been charged. Please try again, or reach out if the issue continues.",
    },
    cancelled: {
      icon: <AlertTriangle size={40} />,
      title: "Payment cancelled.",
      body: "You cancelled the payment before it completed. Your bag is still saved if you'd like to try again.",
    },
  }[status] || {};

  return (
    <section className="section order-status">
      <div className="order-status-icon">{copy.icon}</div>
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>
      <div className="ctas">
        <Link className="btn dark" to="/shop">
          Continue shopping <ArrowRight size={15} />
        </Link>
        {status !== "success" && (
          <Link className="btn glass" to="/checkout">
            Try again
          </Link>
        )}
      </div>
    </section>
  );
}
