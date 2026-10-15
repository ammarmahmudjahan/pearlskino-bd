import { Component } from "react";

/*
 * If something unexpected breaks inside a page, the visitor sees a calm
 * message with a reload button instead of a blank white screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Page error:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="notfound-page page">
        <section className="notfound-card">
          <span className="notfound-orb" aria-hidden="true"></span>
          <p className="eyebrow">SOMETHING WENT WRONG</p>
          <h1>Let's try that again.</h1>
          <p>This page could not be shown. Please reload it. If it keeps happening, tell us and we will fix it.</p>
          <button type="button" className="hero-button" onClick={() => window.location.reload()}>
            Reload the page <span>&#8594;</span>
          </button>
        </section>
      </main>
    );
  }
}
