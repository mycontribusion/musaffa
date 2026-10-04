import { Component } from 'react';

/**
 * Top-level crash screen.
 *
 * Without this, any render-time throw unmounts the whole React root and the
 * user stares at a completely blank page with no way back — which is exactly
 * what happened on deep-link refresh before this existed. The fallback keeps
 * the user inside the app: it explains the failure and offers a hard reset
 * back to the home route.
 *
 * The reset intentionally does a full `location.assign('/')` rather than
 * `location.reload()`. A crash reproduced from a deep URL (e.g.
 * `/surah/36/partner/mudarasa`) would just re-throw on reload, whereas going
 * to `/` always lands on a route whose state is constructible from scratch.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Kept as console.error rather than swallowed: the stack is the only way to
    // find which view threw once the fallback UI is on screen.
    console.error('App crashed:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
    if (window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="crash-screen">
        <div className="crash-card">
          <div className="crash-icon">!</div>
          <h1>Something went wrong</h1>
          <p>
            This part of the app ran into an unexpected error. Nothing you saved is
            lost — you can go back to the home screen and carry on.
          </p>
          <pre className="crash-detail">{String(this.state.error?.message || this.state.error)}</pre>
          <button type="button" className="crash-retry" onClick={this.handleReset}>
            Back to home
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
